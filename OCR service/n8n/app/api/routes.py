"""FastAPI Router for AIVA PO-INV Matching Verification System."""

import time
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
import httpx

from app.config import get_settings, Settings
from app.core.models import (
    VerificationResponse,
    Table9Output,
    ExtractedDocument,
    OracleReceipt
)
from app.core.master_data import MASTER_ENTITIES, CorporateEntity
from app.core.rules import normalize_extracted_document
from app.services.pipeline import VerificationPipeline
from app.services.oracle_mcp import OracleMCPClient

router = APIRouter()
pipeline = VerificationPipeline()
oracle_client = OracleMCPClient()


@router.get("/health", summary="Health Check & External Services Status")
async def health_check(settings: Settings = Depends(get_settings)):
    """Check connectivity to LiteLLM, Oracle MCP, and Paperless."""
    status_report: Dict[str, Any] = {
        "status": "HEALTHY",
        "app_name": settings.APP_NAME,
        "standard_version": "6.2",
        "timestamp": time.time(),
        "services": {}
    }

    # 1. Check LiteLLM
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"{settings.LITELLM_URL.rstrip('/')}/models",
                headers={"Authorization": f"Bearer {settings.LITELLM_API_KEY}"}
            )
            status_report["services"]["litellm"] = {
                "status": "UP" if resp.status_code == 200 else "DEGRADED",
                "code": resp.status_code
            }
    except Exception as e:
        status_report["services"]["litellm"] = {"status": "DOWN", "error": str(e)}

    # 2. Check Oracle MCP
    try:
        receipts = await oracle_client.get_po_receipts("42052835")
        status_report["services"]["oracle_mcp"] = {
            "status": "UP",
            "test_query_rows": len(receipts)
        }
    except Exception as e:
        status_report["services"]["oracle_mcp"] = {"status": "DOWN", "error": str(e)}

    # 3. Check Paperless
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"{settings.PAPERLESS_BASE_URL.rstrip('/')}/api/",
                headers={"Authorization": f"Token {settings.PAPERLESS_API_TOKEN}"}
            )
            status_report["services"]["paperless"] = {
                "status": "UP" if resp.status_code in [200, 401, 403] else "DOWN",
                "code": resp.status_code
            }
    except Exception as e:
        status_report["services"]["paperless"] = {
            "status": "UNREACHABLE",
            "message": "Paperless-ngx URL unreachable (check .env config)"
        }

    return status_report


@router.post(
    "/verify/file",
    response_model=VerificationResponse,
    summary="Verify Invoice from Uploaded PDF or Image"
)
async def verify_file(
    file: UploadFile = File(..., description="PDF หรือ รูปภาพใบส่งสินค้า/ใบกำกับภาษี"),
    doc_id: Optional[int] = Form(default=1001, description="รหัสเอกสาร (Document ID)"),
    po_number: Optional[str] = Form(default=None, description="เลขที่ PO เพื่อ Override หากต้องการระบุเจาะจง"),
    validation_round: int = Form(default=1, description="รอบการตรวจ"),
    ocr_text: Optional[str] = Form(default=None, description="ข้อความ OCR สำรองกรณีไม่มีภาพหรือภาพไม่ชัด"),
    post_to_portal: bool = Form(default=True, description="ส่งผลลัพธ์ไปยัง AIVA Portal Webhook หรือไม่")
):
    """Upload invoice document (PDF, PNG, JPG), extract via Vision LLM, and verify with 3-Way Matching."""
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        response = await pipeline.verify_file(
            file_bytes=contents,
            filename=file.filename or "invoice.pdf",
            doc_id=doc_id,
            po_number_override=po_number,
            validation_round=validation_round,
            ocr_text=ocr_text,
            post_to_portal=post_to_portal
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.post(
    "/verify/extracted-json",
    response_model=Table9Output,
    summary="Verify Pre-extracted Invoice Data (Bypass Vision LLM)"
)
async def verify_extracted_json(payload: Dict[str, Any]):
    """Verify invoice directly using extracted JSON data according to Standard Table 3."""
    try:
        doc_id = payload.get("doc_id") or 1001
        validation_round = payload.get("validation_round") or 1
        normalized_doc = normalize_extracted_document(payload, doc_id=doc_id, validation_round=validation_round)
        table9 = await pipeline.execute_matching_engine(normalized_doc)
        return table9
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload or engine execution error: {str(e)}")


@router.post(
    "/verify/paperless-next",
    response_model=VerificationResponse,
    summary="Process Next Invoice in Paperless Queue"
)
async def verify_paperless_next(
    tag_id: Optional[int] = None,
    excluded_tag_id: Optional[int] = None,
    post_to_portal: bool = True
):
    """Fetch next unprocessed invoice from Paperless-ngx, verify, and attach tag 12 (check n8n)."""
    try:
        response = await pipeline.verify_paperless_next(
            tag_id=tag_id,
            excluded_tag_id=excluded_tag_id,
            post_to_portal=post_to_portal
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Paperless queue processing error: {str(e)}")


@router.get(
    "/master-entities",
    response_model=List[CorporateEntity],
    summary="List 27 Corporate Master Entities"
)
async def list_master_entities():
    """Retrieve list of 27 corporate entities (Master Table 4)."""
    return MASTER_ENTITIES


@router.get(
    "/oracle-receipts/{po_number}",
    response_model=List[OracleReceipt],
    summary="Query Oracle EBS Receipts by PO Number"
)
async def get_oracle_receipts(po_number: str):
    """Inspect receipts returned from Oracle EBS ORDS MCP view for a specific PO."""
    try:
        return await oracle_client.get_po_receipts(po_number)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Oracle query failed: {str(e)}")
