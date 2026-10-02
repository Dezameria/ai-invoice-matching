"""Vision Extractor Service using LiteLLM (deepseek-v4-flash) and pypdfium2.

Corresponds to n8n nodes:
- PDF Convert
- N2.4: Prepare Image & Agent Payload
- HTTP Request (Vision LLM)
- N4: Code: Normalize
"""

import base64
import io
import json
import logging
import re
from typing import List, Optional, Tuple, Dict, Any

import httpx
import pypdfium2 as pdfium
from PIL import Image

from app.config import get_settings
from app.core.models import ExtractedDocument
from app.core.rules import normalize_extracted_document

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "คุณคือ AI Extractor สำหรับระบบ AIVA PO-INV Matching (Standard v6.2) "
    "โปรดสกัดข้อมูลและตอบกลับในรูปแบบ JSON object ตาม Schema เท่านั้น ห้ามใส่ markdown block\n\n"
    "ข้อกำหนดพิเศษสำหรับการคำนวณ:\n"
    "- สำหรับรายการสินค้าประเภทเหล็กหรือวัตถุดิบที่มีทั้งจำนวนม้วนและน้ำหนักรวม ให้ใช้ตัวเลขน้ำหนัก (Weight/KG) เป็น qty และราคาต่อหน่วยเป็น unit_price เพื่อให้ผลคูณ qty * unit_price เท่ากับ amount เสมอ"
)

EXTRACTION_GUIDE = """
โปรดตรวจสอบและสกัดข้อมูลจากรูปภาพเอกสารใบกำกับภาษี/ใบส่งสินค้านี้อย่างเคร่งครัดตาม Schema:
{
  "invoice": {
    "supplier_name": "ชื่อบริษัทผู้ขาย",
    "supplier_tax_id": "เลขประจำตัวผู้เสียภาษี 13 หลักของผู้ขาย",
    "customer_name": "ชื่อลูกค้านิติบุคคล (เช่น อาปิโก...)",
    "customer_address": "ที่อยู่ลูกค้า",
    "customer_tax_id": "เลขประจำตัวผู้เสียภาษี 13 หลักของลูกค้า",
    "invoice_num": "เลขที่ใบกำกับภาษี/ใบส่งสินค้า/ใบแจ้งหนี้",
    "invoice_date": "วันที่ในเอกสาร DD/MM/YYYY หรือ ค.ศ./พ.ศ.",
    "po_number": "เลขที่ใบสั่งซื้อ (PO Number)",
    "currency": "THB",
    "sub_total": 0.0,
    "vat": 0.0,
    "grand_total": 0.0
  },
  "lines": [
    {
      "line_no": 1,
      "description": "ชื่อรายการสินค้าหรือบริการ",
      "qty": 0.0,
      "uom": "หน่วยนับ เช่น PCS, KG, TRIP, JOB",
      "unit_price": 0.0,
      "amount": 0.0
    }
  ],
  "signatures": {
    "supplier_or_deliverer": {"present": true, "page": 1},
    "receiver": {"present": true, "page": 1}
  },
  "pages_complete": true,
  "po_type": "Purchase Order"
}

ข้อกำหนดการสกัดข้อมูลในบรรทัดสินค้า (lines):
- สำหรับรายการสินค้าประเภทเหล็กหรือวัตถุดิบที่มีทั้งจำนวนม้วนและน้ำหนักรวม ให้ใช้ตัวเลขน้ำหนัก (Weight/KG) เป็น qty และราคาต่อหน่วยเป็น unit_price เพื่อให้ผลคูณ qty * unit_price เท่ากับ amount เสมอ
"""



class VisionExtractor:
    """Service to convert PDF/Images and call LiteLLM Vision for invoice extraction."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None
    ):
        settings = get_settings()
        self.base_url = (base_url or settings.LITELLM_URL).rstrip("/")
        self.api_key = api_key or settings.LITELLM_API_KEY
        self.model = model or settings.LITELLM_MODEL
        self.timeout = timeout or settings.LITELLM_TIMEOUT_SECONDS

    def convert_pdf_to_images(
        self, pdf_bytes: bytes, max_pages: int = 4, scale: float = 2.0
    ) -> List[Tuple[str, bytes]]:
        """Convert PDF pages into JPEG byte streams (up to max_pages).

        Returns list of (mime_type, image_bytes).
        """
        results: List[Tuple[str, bytes]] = []
        try:
            pdf = pdfium.PdfDocument(pdf_bytes)
            num_pages = min(len(pdf), max_pages)

            for i in range(num_pages):
                page = pdf[i]
                image = page.render(scale=scale).to_pil()
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format="JPEG", quality=85)
                results.append(("image/jpeg", img_byte_arr.getvalue()))
        except Exception as e:
            logger.error(f"Error converting PDF with pypdfium2: {e}")
            raise
        return results

    def build_user_content(
        self,
        images: List[Tuple[str, bytes]],
        ocr_text: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Construct multi-modal content blocks matching OpenAI chat completion spec."""
        content_blocks: List[Dict[str, Any]] = []

        # 1. Text Prompt
        instruction = EXTRACTION_GUIDE
        if ocr_text and ocr_text.strip():
            instruction = (
                f"โปรดตรวจสอบและสกัดข้อมูลจากรูปภาพเอกสารใบกำกับภาษี/ใบส่งสินค้านี้อย่างเคร่งครัดตาม Schema\n"
                f"(หากภาพไม่ชัดหรือไม่พบภาพ ให้ใช้ข้อความ OCR นี้ประกอบ):\n\n{ocr_text.strip()}\n\n"
                f"{EXTRACTION_GUIDE}"
            )
        content_blocks.append({"type": "text", "text": instruction})

        # 2. Images as Base64 Data URLs
        for mime_type, img_bytes in images:
            b64_str = base64.b64encode(img_bytes).decode("utf-8")
            data_url = f"data:{mime_type};base64,{b64_str}"
            content_blocks.append({
                "type": "image_url",
                "image_url": {"url": data_url}
            })

        return content_blocks

    async def extract_from_content(
        self,
        user_content: List[Dict[str, Any]],
        doc_id: Optional[int] = 1001,
        validation_round: int = 1
    ) -> ExtractedDocument:
        """Call LiteLLM API and normalize into ExtractedDocument."""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "model": self.model,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ]
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        # Extract message content
        raw_text = ""
        choices = data.get("choices") or []
        if choices:
            raw_text = choices[0].get("message", {}).get("content", "")

        # Clean markdown wrappers if any
        cleaned_text = re.sub(r"^```json\s*", "", raw_text.strip(), flags=re.IGNORECASE)
        cleaned_text = re.sub(r"```$", "", cleaned_text.strip())

        try:
            parsed_json = json.loads(cleaned_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response JSON: {cleaned_text}")
            parsed_json = {}

        return normalize_extracted_document(parsed_json, doc_id=doc_id, validation_round=validation_round)

    async def extract_from_pdf(
        self,
        pdf_bytes: bytes,
        ocr_text: Optional[str] = None,
        doc_id: Optional[int] = 1001,
        validation_round: int = 1
    ) -> ExtractedDocument:
        """Convenience method to extract directly from PDF bytes."""
        images = self.convert_pdf_to_images(pdf_bytes, max_pages=4)
        user_content = self.build_user_content(images, ocr_text=ocr_text)
        return await self.extract_from_content(user_content, doc_id=doc_id, validation_round=validation_round)

    async def extract_from_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        ocr_text: Optional[str] = None,
        doc_id: Optional[int] = 1001,
        validation_round: int = 1
    ) -> ExtractedDocument:
        """Convenience method to extract directly from an image."""
        images = [(mime_type, image_bytes)]
        user_content = self.build_user_content(images, ocr_text=ocr_text)
        return await self.extract_from_content(user_content, doc_id=doc_id, validation_round=validation_round)
