"""Verification Pipeline Orchestrator.

Implements the Dual-Circuit Architecture on Python matching the n8n flow:
1. Ingestion / Paperless / File Upload
2. STEP 1: Pure Document Rules (V-01, V-02, V-03, V-06)
3. IF: Has E28? -> Skip Oracle MCP if True
4. Oracle MCP: rcv_v01 query
5. STEP 2: Receipts & ORG_ID (V-04, V-05)
6. IF: Critical Receipt Issue? -> Skip STEP 3 if True
7. STEP 3: Matching Ladder (V-07, V-08, V-09)
8. STEP 4: Decision Matrix & Assembly (Table 9)
9. POST Portal & Paperless Tag Deduplication
"""

import time
import logging
from typing import Optional, Dict, Any

from app.core.models import (
    ExtractedDocument,
    Table9Output,
    VerificationResponse,
    OracleReceipt
)
from app.core.rules import (
    evaluate_step1,
    evaluate_step2,
    evaluate_step3,
    evaluate_step4_decision,
)
from app.services.master_data_service import get_master_data_service
from app.services.oracle_mcp import OracleMCPClient
from app.services.vision_extractor import VisionExtractor
from app.services.paperless import PaperlessClient
from app.services.portal import PortalClient

logger = logging.getLogger(__name__)


class VerificationPipeline:
    """End-to-End Matching Pipeline."""

    def __init__(
        self,
        oracle_client: Optional[OracleMCPClient] = None,
        vision_extractor: Optional[VisionExtractor] = None,
        paperless_client: Optional[PaperlessClient] = None,
        portal_client: Optional[PortalClient] = None,
    ):
        self.oracle_client = oracle_client or OracleMCPClient()
        self.vision_extractor = vision_extractor or VisionExtractor()
        self.paperless_client = paperless_client or PaperlessClient()
        self.portal_client = portal_client or PortalClient()
        self.master_data_service = get_master_data_service()

    async def execute_matching_engine(
        self,
        doc: ExtractedDocument
    ) -> Table9Output:
        """Execute the deterministic matching engine across Steps 1-4."""
        # ---------------------------------------------------------------------
        # STEP 1: Pure Document Rules (V-01, V-02, V-03, V-06)
        # ---------------------------------------------------------------------
        rules, exceptions, has_e28, halted_by = evaluate_step1(doc)

        # Principle D3: Skip Oracle EBS if E28 line math error is detected
        if has_e28:
            logger.info(f"Doc {doc.doc_id}: E28 Line Math error detected. Bypassing Oracle EBS.")
            oracle_data = {
                "queried": False,
                "reason": "Bypassed due to E28 Line Math Error",
                "po_number": doc.invoice.po_number,
                "count": 0,
                "receipts": []
            }
            return evaluate_step4_decision(
                doc=doc,
                rules=rules,
                exceptions=exceptions,
                manual_review=False,
                halted_by=halted_by,
                oracle_data=oracle_data
            )

        # ---------------------------------------------------------------------
        # Oracle MCP Named Query: rcv_v01 (Unified All-in-One Matching)
        # ---------------------------------------------------------------------
        po_number = doc.invoice.po_number
        invoice_num = doc.invoice.invoice_num
        supplier_tax_id = doc.invoice.supplier_tax_id
        oracle_receipts: list[OracleReceipt] = []

        try:
            oracle_receipts = await self.oracle_client.get_receipts(
                invoice_num=invoice_num,
                supplier_tax_id=supplier_tax_id,
                po_number=po_number
            )
        except Exception as e:
            logger.error(f"Doc {doc.doc_id}: Oracle MCP query failed (Inv: {invoice_num}, Tax: {supplier_tax_id}, PO: {po_number}): {e}")

        oracle_data = {
            "queried": True,
            "po_number": po_number,
            "count": len(oracle_receipts),
            "receipts": [r.model_dump() for r in oracle_receipts]
        }

        # ---------------------------------------------------------------------
        # STEP 2: Receipts & ORG_ID (V-04, V-05) - 100% Dynamic Oracle
        # ---------------------------------------------------------------------
        internal_tax_ids = None
        try:
            internal_tax_ids = await self.master_data_service.get_internal_tax_ids()
        except Exception as e:
            logger.warning(f"Could not load internal tax IDs from Oracle EBS: {e}")

        (
            rules,
            exceptions,
            active_receipts,
            address_matched,
            intercompany,
            manual_review,
            has_critical_issue
        ) = evaluate_step2(
            doc=doc,
            receipts=oracle_receipts,
            existing_rules=rules,
            existing_exceptions=exceptions,
            internal_tax_ids=internal_tax_ids
        )

        # If Critical Receipt Issue (E17, E35, or manual_review) -> Skip STEP 3
        if has_critical_issue:
            logger.info(f"Doc {doc.doc_id}: Critical receipt issue detected. Bypassing STEP 3.")
            return evaluate_step4_decision(
                doc=doc,
                rules=rules,
                exceptions=exceptions,
                manual_review=manual_review,
                halted_by=halted_by,
                address_matched=address_matched,
                intercompany=intercompany,
                oracle_data=oracle_data
            )

        # ---------------------------------------------------------------------
        # STEP 3: Matching Ladder, Quantities, Subtotal (V-07, V-08, V-09)
        # ---------------------------------------------------------------------
        rules, exceptions = evaluate_step3(
            doc=doc,
            active_rows=active_receipts,
            existing_rules=rules,
            existing_exceptions=exceptions
        )

        # ---------------------------------------------------------------------
        # STEP 4: Decision Matrix & JSON Table 9 Assembly
        # ---------------------------------------------------------------------
        table9_result = evaluate_step4_decision(
            doc=doc,
            rules=rules,
            exceptions=exceptions,
            manual_review=manual_review,
            halted_by=halted_by,
            address_matched=address_matched,
            intercompany=intercompany,
            oracle_data=oracle_data
        )

        return table9_result

    async def verify_file(
        self,
        file_bytes: bytes,
        filename: str,
        doc_id: Optional[int] = 1001,
        po_number_override: Optional[str] = None,
        validation_round: int = 1,
        ocr_text: Optional[str] = None,
        post_to_portal: bool = True
    ) -> VerificationResponse:
        """Verify uploaded invoice PDF or image."""
        start_time = time.time()
        fn = filename.lower()

        # Step 1: Vision Extraction
        if fn.endswith(".pdf"):
            extracted = await self.vision_extractor.extract_from_pdf(
                file_bytes,
                ocr_text=ocr_text,
                doc_id=doc_id,
                validation_round=validation_round
            )
        elif fn.endswith((".png", ".jpg", ".jpeg", ".webp")):
            mime = "image/png" if fn.endswith(".png") else "image/jpeg"
            extracted = await self.vision_extractor.extract_from_image(
                file_bytes,
                mime_type=mime,
                ocr_text=ocr_text,
                doc_id=doc_id,
                validation_round=validation_round
            )
        else:
            raise ValueError(f"Unsupported file format: {filename}. Supported: PDF, PNG, JPG, WEBP")

        # Apply PO override if provided
        if po_number_override:
            extracted.invoice.po_number = po_number_override

        # Step 2: Verification Engine
        table9 = await self.execute_matching_engine(extracted)

        # Step 3: Optional Portal Post
        if post_to_portal:
            await self.portal_client.post_verification_result(table9)

        elapsed = round(time.time() - start_time, 2)
        return VerificationResponse(
            success=True,
            status=table9.decision.status,
            message=f"Verification completed in {elapsed}s with decision: {table9.decision.status}",
            data=table9,
            execution_time_seconds=elapsed
        )

    async def verify_paperless_document(
        self,
        doc_meta: Dict[str, Any],
        post_to_portal: bool = False,
        tag_paperless: bool = False
    ) -> VerificationResponse:
        """Verify a single Paperless document dictionary."""
        start_time = time.time()
        doc_id = doc_meta["id"]
        title = doc_meta.get("title", f"DOC_{doc_id}")
        ocr_content = doc_meta.get("content", "")

        # 1. Download Document PDF
        pdf_bytes = await self.paperless_client.download_document_pdf(doc_id)

        # 2. Vision Extraction
        extracted = await self.vision_extractor.extract_from_pdf(
            pdf_bytes=pdf_bytes,
            ocr_text=ocr_content,
            doc_id=doc_id,
            validation_round=1
        )

        # 3. Execute Matching Engine
        table9 = await self.execute_matching_engine(extracted)

        # 4. Optional Post to Portal
        if post_to_portal:
            await self.portal_client.post_verification_result(table9)

        # 5. Optional Update Paperless
        paperless_update = None
        if tag_paperless:
            exceptions_str = ",".join(e.code for e in table9.exceptions)
            paperless_update = await self.paperless_client.update_verification_status(
                doc_id=doc_id,
                status=table9.decision.status,
                validation_round=1,
                exceptions_str=exceptions_str,
                append_checked_tag=True
            )

        elapsed = round(time.time() - start_time, 2)
        tag_msg = f" Tag ID {self.paperless_client.checked_tag_id} appended." if tag_paperless else ""
        return VerificationResponse(
            success=True,
            status=table9.decision.status,
            message=f"Document {doc_id} ('{title}') verified: {table9.decision.status}.{tag_msg}",
            data=table9,
            paperless_update=paperless_update,
            execution_time_seconds=elapsed
        )

    async def verify_paperless_next(
        self,
        tag_id: Optional[int] = None,
        excluded_tag_id: Optional[int] = None,
        post_to_portal: bool = True
    ) -> VerificationResponse:
        """Pull next unprocessed document from Paperless, verify, and tag with check tag."""
        start_time = time.time()

        # 1. Get next document
        doc_meta = await self.paperless_client.get_next_unprocessed_document(
            tag_id=tag_id,
            excluded_tag_id=excluded_tag_id
        )

        if not doc_meta:
            return VerificationResponse(
                success=True,
                status="ALL_PROCESSED",
                message="ไม่พบเอกสารใหม่ที่รอการตรวจสอบ (เอกสารทั้งหมดที่มี tag 'invoice' ได้รับการประมวลผลหรือมี tag 'check n8n' แล้ว)",
                data=None,
                execution_time_seconds=round(time.time() - start_time, 2)
            )

        return await self.verify_paperless_document(
            doc_meta=doc_meta,
            post_to_portal=post_to_portal,
            tag_paperless=True
        )
