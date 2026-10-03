"""Frontend-facing API Routes with SSE (Server-Sent Events) streaming.

These endpoints are designed specifically for the AIVA Document Verification
HTML frontend (AIVA-Document-Card-Verification-v3.html).

Endpoints:
- GET  /fe/documents          - List documents from Paperless-ngx
- GET  /fe/documents/{id}/pdf - Proxy PDF download from Paperless
- POST /fe/verify/{id}        - SSE-streamed verification with step-by-step progress
- POST /fe/verify/upload      - SSE-streamed verification for direct file upload
"""

import asyncio
import json
import logging
import time
from typing import Optional, AsyncGenerator, List, Dict, Any

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import StreamingResponse, Response
from sse_starlette.sse import EventSourceResponse

from app.config import get_settings
from app.services.paperless import PaperlessClient
from app.services.pipeline import VerificationPipeline
from app.services.vision_extractor import VisionExtractor
from app.services.oracle_mcp import OracleMCPClient
from app.services.master_data_service import get_master_data_service
from app.core.models import Table9Output, VerificationResponse, ExtractedDocument, OracleReceipt

logger = logging.getLogger(__name__)

fe_router = APIRouter(prefix="/fe", tags=["Frontend SSE"])

# Shared service instances
_paperless = PaperlessClient()
_pipeline = VerificationPipeline()


# =============================================================================
# Helper: SSE Event Formatter
# =============================================================================

def sse_event(event_type: str, data: dict) -> dict:
    """Format an SSE event payload."""
    return {
        "event": event_type,
        "data": json.dumps(data, ensure_ascii=False, default=str),
    }


# =============================================================================
# GET /fe/documents — List documents from Paperless-ngx
# =============================================================================

@fe_router.get("/documents", summary="List Paperless Documents for Frontend Gallery")
async def list_paperless_documents(
    page: int = 1,
    page_size: Optional[int] = None,
    fetch_all: bool = True,
    tags__id__in: Optional[str] = None,
    ordering: str = "-created",
):
    """Proxy Paperless-ngx document listing for the frontend gallery view.
    When fetch_all=True, iterates all pages and returns all documents.
    """
    import httpx

    settings = get_settings()
    base_url = settings.PAPERLESS_BASE_URL.rstrip("/")
    headers = {"Accept": "application/json"}
    token = settings.PAPERLESS_API_TOKEN
    if token and token != "your_paperless_token_here":
        headers["Authorization"] = f"Token {token}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Fetch tags list for mapping tag IDs -> names
            tag_map = {}
            try:
                tags_resp = await client.get(f"{base_url}/api/tags/?page_size=200", headers=headers)
                if tags_resp.status_code == 200:
                    for t in tags_resp.json().get("results", []):
                        tag_map[t["id"]] = t["name"]
            except Exception as te:
                logger.warning(f"Could not load tags from Paperless: {te}")

            # 2. Fetch documents
            raw_docs = []
            total_count = 0

            if fetch_all:
                current_url = f"{base_url}/api/documents/"
                init_params = {
                    "page_size": 100,
                    "ordering": ordering,
                }
                if tags__id__in:
                    init_params["tags__id__in"] = tags__id__in

                is_first = True
                while current_url:
                    resp = await client.get(
                        current_url,
                        params=init_params if is_first else None,
                        headers=headers
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    total_count = data.get("count", total_count)
                    batch = data.get("results", [])
                    raw_docs.extend(batch)
                    current_url = data.get("next")
                    is_first = False
            else:
                params = {
                    "page": page,
                    "page_size": page_size or 25,
                    "ordering": ordering,
                }
                if tags__id__in:
                    params["tags__id__in"] = tags__id__in

                resp = await client.get(
                    f"{base_url}/api/documents/", params=params, headers=headers
                )
                resp.raise_for_status()
                data = resp.json()
                total_count = data.get("count", len(raw_docs))
                raw_docs = data.get("results", [])

            # Enrich documents with tag names
            results = []
            for doc in raw_docs:
                tag_names = [tag_map.get(tid, f"tag-{tid}") for tid in doc.get("tags", [])]
                results.append({
                    "id": doc["id"],
                    "original_file_name": doc.get("original_file_name", f"doc_{doc['id']}"),
                    "title": doc.get("title", ""),
                    "added": doc.get("added") or doc.get("created", ""),
                    "tags": tag_names,
                    "tag_ids": doc.get("tags", []),
                    "pages": doc.get("page_count") or doc.get("pages", 1),
                    "content": (doc.get("content") or "")[:200],  # Preview only
                    "status": "waiting",
                    "message": "Ready for selection",
                })

            return {
                "count": len(results),
                "total_count": total_count,
                "next": None,
                "previous": None,
                "results": results,
                "tag_map": tag_map,
            }
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Paperless-ngx is unreachable. Check PAPERLESS_BASE_URL in .env",
        )
    except Exception as e:
        logger.error(f"Paperless document listing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# GET /fe/documents/{doc_id}/pdf — Proxy PDF from Paperless
# =============================================================================

@fe_router.get(
    "/documents/{doc_id}/pdf",
    summary="Proxy Document PDF from Paperless",
)
async def proxy_document_pdf(doc_id: int):
    """Download and proxy the original PDF from Paperless-ngx."""
    try:
        pdf_bytes = await _paperless.download_document_pdf(doc_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="doc_{doc_id}.pdf"',
                "Cache-Control": "public, max-age=300",
            },
        )
    except Exception as e:
        logger.error(f"PDF proxy failed for doc {doc_id}: {e}")
        raise HTTPException(status_code=404, detail=f"PDF not found for document {doc_id}")


# =============================================================================
# GET /fe/documents/{doc_id}/thumb — Proxy thumbnail from Paperless
# =============================================================================

@fe_router.get(
    "/documents/{doc_id}/thumb",
    summary="Proxy Document Thumbnail from Paperless",
)
async def proxy_document_thumb(doc_id: int):
    """Download and proxy the thumbnail from Paperless-ngx."""
    try:
        result = await _paperless.get_document_thumbnail(doc_id)
        if result:
            mime, img_bytes = result
            return Response(
                content=img_bytes,
                media_type=mime,
                headers={"Cache-Control": "public, max-age=600"},
            )
        raise HTTPException(status_code=404, detail="Thumbnail not available")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# POST /fe/verify/upload — SSE-streamed verification from uploaded file
# Note: MUST be defined BEFORE /verify/{doc_id} so FastAPI does not match "upload" as doc_id
# =============================================================================

@fe_router.post(
    "/verify/upload",
    summary="SSE-Streamed Verification from Uploaded File",
)
async def verify_upload_sse(
    request: Request,
    file: UploadFile = File(...),
    doc_id: Optional[int] = Form(default=9999),
    po_number: Optional[str] = Form(default=None),
):
    """Upload a PDF/image and receive SSE-streamed verification progress."""

    file_bytes = await file.read()
    filename = file.filename or "upload.pdf"

    async def event_generator() -> AsyncGenerator:
        start_time = time.time()
        total_steps = 5

        try:
            # ── Step 1: Validate file ──
            yield sse_event("step", {
                "step_index": 1, "total_steps": total_steps,
                "step_name": "validate",
                "message": f"ตรวจสอบไฟล์ {filename} ({len(file_bytes):,} bytes)...",
                "completed": True,
            })

            # ── Step 2: Vision Extraction ──
            yield sse_event("step", {
                "step_index": 2, "total_steps": total_steps,
                "step_name": "vision_extraction",
                "message": "กำลังสกัดข้อมูลด้วย Vision LLM...",
            })

            fn = filename.lower()
            extractor = _pipeline.vision_extractor
            if fn.endswith(".pdf"):
                extracted = await extractor.extract_from_pdf(file_bytes, doc_id=doc_id)
            elif fn.endswith((".png", ".jpg", ".jpeg", ".webp")):
                mime = "image/png" if fn.endswith(".png") else "image/jpeg"
                extracted = await extractor.extract_from_image(file_bytes, mime_type=mime, doc_id=doc_id)
            else:
                yield sse_event("error", {"message": f"ไม่รองรับไฟล์ประเภท: {filename}"})
                yield sse_event("done", {"message": "จบด้วยข้อผิดพลาด"})
                return

            if po_number:
                extracted.invoice.po_number = po_number

            yield sse_event("extraction", {
                "step_index": 2, "total_steps": total_steps,
                "completed": True,
                "message": f"สกัดข้อมูลสำเร็จ: PO {extracted.invoice.po_number or 'N/A'}",
                "invoice": {
                    "invoice_num": extracted.invoice.invoice_num,
                    "po_number": extracted.invoice.po_number,
                    "supplier_name": extracted.invoice.supplier_name,
                    "sub_total": extracted.invoice.sub_total,
                    "vat": extracted.invoice.vat,
                    "grand_total": extracted.invoice.grand_total,
                },
                "lines_count": len(extracted.lines),
            })

            # ── Step 3-5: Matching Engine ──
            yield sse_event("step", {
                "step_index": 3, "total_steps": total_steps,
                "step_name": "matching_engine",
                "message": "กำลังรัน Matching Engine (Steps 1-4)...",
            })

            table9 = await _pipeline.execute_matching_engine(extracted)

            yield sse_event("result", _build_result_payload(table9, start_time, doc=extracted))
            yield sse_event("done", {
                "message": f"เสร็จสิ้น: {table9.decision.status}",
                "elapsed_seconds": round(time.time() - start_time, 2),
            })

        except asyncio.CancelledError:
            return
        except Exception as e:
            logger.error(f"Upload verification SSE error: {e}", exc_info=True)
            yield sse_event("error", {"message": str(e)})
            yield sse_event("done", {"message": "จบด้วยข้อผิดพลาด"})

    return EventSourceResponse(event_generator())


# =============================================================================
# POST /fe/verify/{doc_id} — SSE-streamed verification from Paperless doc
# =============================================================================

@fe_router.post(
    "/verify/{doc_id}",
    summary="SSE-Streamed Verification of Paperless Document",
)
async def verify_document_sse(doc_id: int, request: Request):
    """
    Perform full verification pipeline on a Paperless document,
    streaming step-by-step progress via Server-Sent Events (SSE).

    Event types sent to client:
    - `step`     : Progress update (step_name, step_index, total_steps, message)
    - `extraction`: Vision LLM extraction result
    - `oracle`   : Oracle MCP query result
    - `rules`    : Rules engine evaluation result per step
    - `result`   : Final Table 9 verification result
    - `error`    : Error occurred during processing
    - `done`     : Processing complete signal
    """

    async def event_generator() -> AsyncGenerator:
        start_time = time.time()
        total_steps = 7

        try:
            # ── Step 1: Fetch document metadata from Paperless ──
            yield sse_event("step", {
                "step_index": 1, "total_steps": total_steps,
                "step_name": "fetch_metadata",
                "message": f"กำลังดึงข้อมูลเอกสาร DOC {doc_id} จาก Paperless-ngx...",
            })

            doc_meta = await _paperless.get_document_details(doc_id)
            title = doc_meta.get("title", f"DOC_{doc_id}")
            ocr_content = doc_meta.get("content", "")
            tag_ids = doc_meta.get("tags", [])

            yield sse_event("step", {
                "step_index": 1, "total_steps": total_steps,
                "step_name": "fetch_metadata",
                "message": f"ดึงข้อมูลสำเร็จ: {title}",
                "completed": True,
                "doc_title": title,
                "tag_ids": tag_ids,
            })

            # ── Step 2: Download PDF ──
            yield sse_event("step", {
                "step_index": 2, "total_steps": total_steps,
                "step_name": "download_pdf",
                "message": "กำลังดาวน์โหลด PDF จาก Paperless-ngx...",
            })

            pdf_bytes = await _paperless.download_document_pdf(doc_id)

            yield sse_event("step", {
                "step_index": 2, "total_steps": total_steps,
                "step_name": "download_pdf",
                "message": f"ดาวน์โหลด PDF สำเร็จ ({len(pdf_bytes):,} bytes)",
                "completed": True,
                "pdf_size": len(pdf_bytes),
            })

            # ── Step 3: Convert PDF → Images + Vision LLM Extraction ──
            yield sse_event("step", {
                "step_index": 3, "total_steps": total_steps,
                "step_name": "vision_extraction",
                "message": "กำลังแปลง PDF เป็นรูปภาพและส่งให้ Vision LLM สกัดข้อมูล...",
            })

            extractor = _pipeline.vision_extractor
            images = extractor.convert_pdf_to_images(pdf_bytes, max_pages=4)

            yield sse_event("step", {
                "step_index": 3, "total_steps": total_steps,
                "step_name": "vision_extraction",
                "message": f"แปลง PDF เป็น {len(images)} หน้า สำเร็จ กำลังส่งให้ LLM...",
            })

            user_content = extractor.build_user_content(images, ocr_text=ocr_content)
            extracted = await extractor.extract_from_content(
                user_content=user_content,
                doc_id=doc_id,
                validation_round=1,
            )

            yield sse_event("extraction", {
                "step_index": 3, "total_steps": total_steps,
                "completed": True,
                "message": f"สกัดข้อมูลสำเร็จ: PO {extracted.invoice.po_number or 'N/A'}, "
                           f"Vendor: {extracted.invoice.supplier_name[:30]}",
                "invoice": {
                    "invoice_num": extracted.invoice.invoice_num,
                    "po_number": extracted.invoice.po_number,
                    "supplier_name": extracted.invoice.supplier_name,
                    "supplier_tax_id": extracted.invoice.supplier_tax_id,
                    "customer_name": extracted.invoice.customer_name,
                    "customer_tax_id": extracted.invoice.customer_tax_id,
                    "sub_total": extracted.invoice.sub_total,
                    "vat": extracted.invoice.vat,
                    "grand_total": extracted.invoice.grand_total,
                },
                "lines_count": len(extracted.lines),
            })

            # ── Step 4: Rules Engine STEP 1 (Pure Document Rules) ──
            yield sse_event("step", {
                "step_index": 4, "total_steps": total_steps,
                "step_name": "rules_step1",
                "message": "กำลังตรวจสอบ STEP 1: กฎเอกสาร (V-01, V-02, V-03, V-06)...",
            })

            from app.core.rules import evaluate_step1, evaluate_step2, evaluate_step3, evaluate_step4_decision

            rules, exceptions, has_e28, halted_by = evaluate_step1(extracted)
            step1_pass = not has_e28 and not any(e.severity == "High" for e in exceptions)

            yield sse_event("rules", {
                "step_index": 4, "total_steps": total_steps,
                "step_name": "rules_step1",
                "completed": True,
                "message": f"STEP 1 {'ผ่าน ✓' if step1_pass else 'พบปัญหา ✗'}",
                "rules_evaluated": [r.model_dump() for r in rules],
                "exceptions": [e.model_dump() for e in exceptions],
                "has_e28": has_e28,
                "halted_by": halted_by,
            })

            # Early exit if E28
            if has_e28:
                yield sse_event("step", {
                    "step_index": 5, "total_steps": total_steps,
                    "step_name": "oracle_query",
                    "message": "ข้าม Oracle EBS เนื่องจาก E28 Line Math Error",
                    "completed": True, "skipped": True,
                })
                oracle_data = {
                    "queried": False,
                    "reason": "Bypassed due to E28 Line Math Error",
                    "po_number": extracted.invoice.po_number,
                    "count": 0,
                    "receipts": []
                }
                table9 = evaluate_step4_decision(
                    doc=extracted, rules=rules, exceptions=exceptions,
                    manual_review=False, halted_by=halted_by,
                    oracle_data=oracle_data
                )
                yield sse_event("result", _build_result_payload(table9, start_time, doc=extracted, oracle_data=oracle_data))
                yield sse_event("done", {"message": "เสร็จสิ้น"})
                return

            # ── Step 5: Oracle MCP Query ──
            yield sse_event("step", {
                "step_index": 5, "total_steps": total_steps,
                "step_name": "oracle_query",
                "message": f"กำลังค้นหาใบรับสินค้าจาก Oracle EBS สำหรับ PO {extracted.invoice.po_number}...",
            })

            oracle_receipts = []
            try:
                oracle_receipts = await _pipeline.oracle_client.get_receipts(
                    invoice_num=extracted.invoice.invoice_num,
                    supplier_tax_id=extracted.invoice.supplier_tax_id,
                    po_number=extracted.invoice.po_number
                )
            except Exception as e:
                logger.error(f"Oracle MCP failed: {e}")


            yield sse_event("oracle", {
                "step_index": 5, "total_steps": total_steps,
                "completed": True,
                "message": f"Oracle EBS: พบ {len(oracle_receipts)} แถว "
                           f"{'(Active)' if oracle_receipts else '(ไม่พบข้อมูล)'}",
                "receipt_count": len(oracle_receipts),
                "receipts": [r.model_dump() for r in oracle_receipts[:5]],  # Limit preview
            })

            # ── Step 6: Rules Engine STEP 2 & 3 ──
            yield sse_event("step", {
                "step_index": 6, "total_steps": total_steps,
                "step_name": "rules_step2_3",
                "message": "กำลังตรวจสอบ STEP 2 & 3: ใบรับสินค้า, นิติบุคคล, Line Matching...",
            })

            internal_tax_ids = None
            try:
                internal_tax_ids = await get_master_data_service().get_internal_tax_ids()
            except Exception as e:
                logger.warning(f"Could not load internal tax IDs from Oracle EBS: {e}")

            (
                rules, exceptions, active_receipts,
                address_matched, intercompany, manual_review, has_critical
            ) = evaluate_step2(
                doc=extracted, receipts=oracle_receipts,
                existing_rules=rules, existing_exceptions=exceptions,
                internal_tax_ids=internal_tax_ids,
            )

            if not has_critical:
                rules, exceptions = evaluate_step3(
                    doc=extracted, active_rows=active_receipts,
                    existing_rules=rules, existing_exceptions=exceptions,
                )

            yield sse_event("rules", {
                "step_index": 6, "total_steps": total_steps,
                "step_name": "rules_step2_3",
                "completed": True,
                "message": f"STEP 2&3: ตรวจสอบเสร็จ (Exceptions: {len(exceptions)})",
                "rules_evaluated": [r.model_dump() for r in rules],
                "exceptions": [e.model_dump() for e in exceptions],
                "address_matched": address_matched,
                "intercompany": intercompany,
                "has_critical": has_critical,
                "step3_skipped": has_critical,
            })

            # ── Step 7: Decision Matrix & Table 9 Assembly ──
            yield sse_event("step", {
                "step_index": 7, "total_steps": total_steps,
                "step_name": "decision",
                "message": "กำลังสร้าง Decision Matrix และ Table 9 Output...",
            })

            oracle_data = {
                "queried": True,
                "po_number": extracted.invoice.po_number,
                "count": len(oracle_receipts),
                "receipts": [r.model_dump() for r in oracle_receipts]
            }

            table9 = evaluate_step4_decision(
                doc=extracted, rules=rules, exceptions=exceptions,
                manual_review=manual_review, halted_by=halted_by,
                address_matched=address_matched, intercompany=intercompany,
                oracle_data=oracle_data
            )

            yield sse_event("result", _build_result_payload(
                table9, start_time, doc=extracted, active_receipts=active_receipts, oracle_data=oracle_data
            ))

            # ── Optional: Update Paperless tags ──
            try:
                settings = get_settings()
                exceptions_str = ",".join(e.code for e in table9.exceptions)
                await _paperless.update_verification_status(
                    doc_id=doc_id,
                    status=table9.decision.status,
                    validation_round=1,
                    exceptions_str=exceptions_str,
                    append_checked_tag=True,
                )
            except Exception as e:
                logger.warning(f"Paperless tag update failed: {e}")

            yield sse_event("done", {
                "message": f"เสร็จสิ้น: {table9.decision.status}",
                "elapsed_seconds": round(time.time() - start_time, 2),
            })

        except asyncio.CancelledError:
            logger.info(f"SSE stream cancelled for doc {doc_id}")
            return
        except Exception as e:
            logger.error(f"Verification SSE error for doc {doc_id}: {e}", exc_info=True)
            yield sse_event("error", {
                "message": f"เกิดข้อผิดพลาด: {str(e)}",
                "elapsed_seconds": round(time.time() - start_time, 2),
            })
            yield sse_event("done", {"message": "จบด้วยข้อผิดพลาด"})

    return EventSourceResponse(event_generator())





# =============================================================================
# Helper: Build result payload from Table9Output
# =============================================================================

def _build_result_payload(
    table9: Table9Output,
    start_time: float,
    doc: Optional[ExtractedDocument] = None,
    active_receipts: Optional[List[OracleReceipt]] = None,
    oracle_data: Optional[Dict[str, Any]] = None,
) -> dict:
    """Convert Table9Output into the result payload for SSE and frontend rendering."""
    elapsed = round(time.time() - start_time, 2)

    # Map rules to frontend-compatible format
    rule_names = {
        "V-01": "Required fields",
        "V-02": "Line arithmetic",
        "V-03": "Invoice total",
        "V-04": "Receipt found",
        "V-05": "Customer match",
        "V-06": "Signatures",
        "V-07": "Line and price match",
        "V-08": "Quantity match",
        "V-09": "Receipt total match",
    }

    rules_out = []
    for r in table9.rules:
        rules_out.append({
            "rule_id": r.rule_id,
            "rule_name": rule_names.get(r.rule_id, r.rule_id),
            "result": r.result.lower() if r.result else "not_evaluated",
            "exception_code": r.code,
            "severity": r.severity,
            "evidence": r.details,
        })

    exceptions_out = []
    for e in table9.exceptions:
        exceptions_out.append({
            "code": e.code,
            "severity": e.severity,
            "rule_id": e.rule_id,
            "message": e.message,
        })

    lines_out = []
    if doc and doc.lines:
        for li in doc.lines:
            matched = None
            if active_receipts:
                matched = next((r for r in active_receipts if r.LINE_NUM == li.line_no), None)
                if not matched and len(active_receipts) > 0:
                    matched = active_receipts[0]

            rcv_qty = matched.QUANTITY_RECEIVED if matched else li.qty
            rcv_price = matched.UNIT_PRICE if matched else li.unit_price

            lines_out.append({
                "description": li.description or "Item",
                "invoice_qty": li.qty,
                "uom": li.uom or "PCS",
                "invoice_price": li.unit_price,
                "invoice_amount": li.amount,
                "receipt_qty": rcv_qty,
                "receipt_price": rcv_price,
                "match_level": "M1" if (matched and matched.LINE_NUM == li.line_no) else ("M4" if matched else "None"),
            })

    po_num = table9.invoice_summary.po_number

    # Resolve oracle_data payload
    if oracle_data is not None:
        final_oracle_data = oracle_data
    elif hasattr(table9, "oracle_data") and table9.oracle_data is not None:
        final_oracle_data = table9.oracle_data
    else:
        final_oracle_data = {
            "queried": po_num is not None,
            "po_number": po_num,
            "count": len(active_receipts) if active_receipts else 0,
            "receipts": [r.model_dump() for r in active_receipts] if active_receipts else [],
        }

    return {
        "schema_version": "1.1",
        "doc_id": table9.doc_id,
        "validation_round": table9.validation_round,
        "standard_version": table9.standard_version,
        "timestamp": table9.timestamp,
        "invoice": {
            "invoice_num": table9.invoice_summary.invoice_num,
            "po_number": po_num,
            "supplier_name": table9.invoice_summary.supplier_name,
            "supplier_tax_id": table9.invoice_summary.supplier_tax_id,
            "customer_name": table9.invoice_summary.customer_name,
            "customer_tax_id": table9.invoice_summary.customer_tax_id,
            "sub_total": table9.invoice_summary.sub_total,
            "vat": table9.invoice_summary.vat,
            "grand_total": table9.invoice_summary.grand_total,
        },
        "receipt": {
            "found": po_num is not None,
            "receipt_num": f"RCV-{po_num}" if po_num else "—",
            "org_id": str(active_receipts[0].ORG_ID) if active_receipts else ("103" if not table9.invoice_summary.intercompany else "Intercompany"),
            "address_matched": table9.invoice_summary.address_matched,
            "intercompany": table9.invoice_summary.intercompany,
            "receipt_total": table9.invoice_summary.sub_total,
        },
        "oracle_data": final_oracle_data,
        "lines": lines_out,
        "rules": rules_out,
        "exceptions": exceptions_out,
        "decision": {
            "status": table9.decision.status,
            "assigned_to": table9.decision.assigned_to,
            "halted_by": table9.decision.halted_by,
            "manual_review": table9.decision.manual_review,
            "exception_codes": [e.code for e in table9.exceptions],
            "oracle_called": table9.decision.halted_by != "V-02",
            "processing_ms": int(elapsed * 1000),
        },
        "elapsed_seconds": elapsed,
    }

