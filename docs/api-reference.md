# API Reference Specification

เอกสารอ้างอิง REST API และ Server-Sent Events (SSE) ของระบบ **AIVA PO-INV Matching Verification System**  
FastAPI Entrypoint อยู่ที่ [`OCR service/n8n/app/main.py`](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/OCR%20service/n8n/app/main.py)

---

## 1. ข้อมูลการเชื่อมต่อพื้นฐาน (Base URLs)

- **Local Base URL:** `http://localhost:8000`
- **Swagger Interactive Docs:** `http://localhost:8000/docs`
- **ReDoc Technical Docs:** `http://localhost:8000/redoc`
- **Web Verification UI:** `http://localhost:8000/app`

---

## 2. หมวด Core Verification Endpoints (`/api/v1`)

### 2.1 Health Check (`GET /health` หรือ `GET /api/v1/health`)
ตรวจสอบความพร้อมในการเชื่อมต่อของระบบและ External Services (LiteLLM, Oracle MCP, Paperless)

**Response (200 OK):**
```json
{
  "status": "HEALTHY",
  "app_name": "AIVA PO-INV Matching Service",
  "standard_version": "6.2",
  "timestamp": 1727772000.123,
  "services": {
    "litellm": {"status": "UP", "code": 200},
    "oracle_mcp": {"status": "UP", "test_query_rows": 4},
    "paperless": {"status": "UP", "code": 200}
  }
}
```

---

### 2.2 Verify File (`POST /api/v1/verify/file`)
รับไฟล์ใบแจ้งหนี้ (PDF, PNG, JPG, WEBP) แปลงเป็นภาพ ส่งเข้า Vision LLM (`deepseek-v4-flash`) สกัดข้อมูล และรันการตรวจสอบ 3-Way Matching

**Request Format:** `multipart/form-data`
- `file` (Binary, Required): ไฟล์เอกสาร
- `doc_id` (Integer, Optional, default=1001): รหัสเอกสารอ้างอิง
- `po_number` (String, Optional): เลขที่ PO เพื่อ Override หากต้องการระบุเจาะจง
- `validation_round` (Integer, Optional, default=1): รอบการตรวจ
- `ocr_text` (String, Optional): ข้อความ OCR Text สำรอง
- `post_to_portal` (Boolean, Optional, default=true): ส่งผลลัพธ์ไปยัง AIVA Portal Webhook หรือไม่

**Response (200 OK):**
```json
{
  "success": true,
  "document_id": "1001",
  "table9": {
    "document_id": "1001",
    "invoice_number": "INV-2026-088",
    "po_number": "42052835",
    "status": "auto_pass",
    "routed_to": "system",
    "rules": { ... },
    "exceptions": []
  },
  "extraction": { ... },
  "receipts": [ ... ]
}
```

---

### 2.3 Verify Extracted JSON (`POST /api/v1/verify/extracted-json`)
ตรวจสอบข้อมูลบิลจาก JSON Data โดยตรง (Bypass Vision LLM เพื่อความรวดเร็วและใช้ในการทดสอบระบบ)

**Request Body (JSON - Table 3 Schema):**
```json
{
  "doc_id": 1001,
  "header": {
    "invoice_number": "INV-2026-088",
    "po_number": "42052835",
    "invoice_date": "2026-09-15",
    "supplier_tax_id": "0105538104847",
    "customer_tax_id": "0107539000180"
  },
  "line_items": [
    {
      "item_code": "PART-001",
      "description": "BRACKET ASSY",
      "quantity": 100.0,
      "unit_price": 50.0,
      "line_total": 5000.0
    }
  ],
  "totals": {
    "subtotal": 5000.0,
    "vat_amount": 350.0,
    "grand_total": 5350.0
  },
  "signatures": {
    "sender_signature": true,
    "receiver_signature": true
  }
}
```

**Response (200 OK):** ผลลัพธ์ `Table9Output`

---

### 2.4 Verify Next from Paperless (`POST /api/v1/verify/paperless-next`)
ดึงเอกสารคิวถัดไปจาก Paperless-ngx (Tag ID 5 ข้าม Tag ID 12) ประมวลผล 3-Way Matching และติด Tag ID 12 (`check n8n`) อัตโนมัติ

**Query Parameters:**
- `tag_id` (Integer, Optional): รหัส Tag เอกสารเข้า (Default อ่านจาก `.env`)
- `excluded_tag_id` (Integer, Optional): รหัส Tag ข้ามการตรวจ (Default อ่านจาก `.env`)
- `post_to_portal` (Boolean, Optional, default=true): ส่ง Webhook ไป Portal หรือไม่

---

### 2.5 Query Oracle Receipts (`GET /api/v1/oracle-receipts/{po_number}`)
ดึงรายการใบรับสินค้า (Goods Receipt) ล่าสุดจาก Oracle EBS ตามเลข PO

**Path Parameters:**
- `po_number` (String): เลขที่ใบสั่งซื้อ เช่น `42052835`

**Response (200 OK):** Array ของ `OracleReceipt`

---

### 2.6 Master Entities List (`GET /api/v1/master-entities`)
แสดงรายชื่อนิติบุคคลเครือ AAPICO ทั้ง 27 บริษัท (Master Table 4) พร้อม Tax ID 13 หลัก และ ORG_ID

---

## 3. หมวด Frontend & SSE Streaming Endpoints (`/fe`)

ออกแบบมาสำหรับ Web UI และการแสดงผล Step-by-Step Progress แบบ Real-time:

| Method | Path | หน้าที่ |
|---|---|---|
| `GET` | `/fe/documents` | ดึงรายการเอกสารจาก Paperless-ngx สำหรับแสดงในหน้า Gallery พร้อม Pagination |
| `GET` | `/fe/documents/{id}/pdf` | Proxy สตรีมไฟล์ PDF จาก Paperless สำหรับ Preview บนเบราว์เซอร์ |
| `POST` | `/fe/verify/{id}` | เริ่มรัน Verification ผ่าน **Server-Sent Events (SSE)** สำหรับเอกสารใน Paperless |
| `POST` | `/fe/verify/upload` | อัปโหลดไฟล์ตรงและสตรีมความคืบหน้าการทำงาน (SSE) ทีละขั้นตอน |

### ตัวอย่าง SSE Events:
```
event: step_start
data: {"step": "vision_extraction", "message": "Reading document with Vision LLM..."}

event: step_complete
data: {"step": "vision_extraction", "extracted_data": { ... }}

event: step_start
data: {"step": "step1_rules", "message": "Verifying document mathematics..."}

event: done
data: {"final_result": { ... }}
```
