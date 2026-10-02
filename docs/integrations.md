# External Integrations Architecture

เอกสารอ้างอิงรายละเอียดการเชื่อมต่อระบบภายนอก (External Integrations) ของ AIVA PO-INV Matching System:
1. **Oracle EBS ERP (ORDS MCP Service)**
2. **LiteLLM Vision Proxy (`deepseek-v4-flash`)**
3. **Paperless-ngx (Document Management System)**
4. **AIVA Accounting Web Portal**

---

## 1. Oracle EBS ERP (ORDS MCP Service)

- **ไฟล์โค้ด:** [`OCR service/n8n/app/services/oracle_mcp.py`](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/OCR%20service/n8n/app/services/oracle_mcp.py)
- **Protocol:** HTTP JSON-RPC 2.0 (Model Context Protocol / ORDS Tools API)
- **Endpoint คอนฟิก:** `ORACLE_MCP_URL` (เช่น `http://ahebs.aapico.com:8080/mcp`)
- **Authentication:** Bearer JWT Token (`ORACLE_MCP_TOKEN`)

### 1.1 วิวฐานข้อมูลที่เรียกใช้งาน
ระบบ Query วิวฐานข้อมูล Oracle ERP โดยตรง:
```sql
apps.AH_DEV_RCV_PO_AP_MATCHING_V
```

### 1.2 โหมดการค้นหา (Unified Query Strategy)
1. **Primary Search (ค้นหาหลักด้วย Tax ID + เลข Invoice):**  
   ใช้สำหรับรองรับบิลประเภท Multi-PO (1 Invoice ใบเดียว อ้างอิงหลาย PO Number)
   ```sql
   SELECT * FROM apps.AH_DEV_RCV_PO_AP_MATCHING_V 
   WHERE SUPPLIER_TAX_ID = :tax_id AND (RCV_INV_NUM = :inv_no OR AP_INV_NUM = :inv_no)
   ```
2. **Fallback Search (ค้นหาสำรองด้วย PO Number):**  
   ใช้เมื่อค้นหาด้วยเลขที่ Invoice ไม่พบข้อมูล
   ```sql
   SELECT * FROM apps.AH_DEV_RCV_PO_AP_MATCHING_V 
   WHERE PO_NUM = :po_number
   ```

### 1.3 การประมวลผลข้อมูลผลลัพธ์ (CSV Stream Parsing)
MCP Tool จะส่งผลลัพธ์กลับมาในรูปแบบ CSV Text คลาส `OracleMCPClient` จะแปลงข้อมูลเป็น `List[OracleReceipt]` โดยดึงฟิลด์สำคัญ:
- `PO_NUM`, `RCV_NUM`, `ITM_CODE`, `ITM_DESC`
- `RCV_QTY` (จำนวนรับจริง), `PO_UPRICE` (ราคาต่อหน่วยใน PO)
- `INV_ORG_ID`, `OU_ORG_ID`, `OU_NAME`
- `CUSTOMER_POSTAL`, `CUSTOMER_LOC_CODE`
- `SUPPLIER_NAME`, `SUPPLIER_TAX_ID`

---

## 2. LiteLLM Vision Proxy (`deepseek-v4-flash`)

- **ไฟล์โค้ด:** [`OCR service/n8n/app/services/vision_extractor.py`](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/OCR%20service/n8n/app/services/vision_extractor.py)
- **Endpoint คอนฟิก:** `LITELLM_URL` (เช่น `http://10.10.3.112:4000/v1`)
- **Model:** `deepseek-v4-flash`
- **Output Constraint:** บังคับ `response_format: {"type": "json_object"}`

### 2.1 หน้าที่ของ Vision AI
- รับไฟล์ภาพหรือหน้าแรกของ PDF (แปลงเป็น Base64 Image)
- สกัดข้อมูล Text, ตัวเลข, วันที่, และตรวจจับการมีอยู่ของลายเซ็น (Checkboxes / Signatures)
- **ข้อพึงระวังตามหลัก D1:** AI มีหน้าที่สกัดข้อมูล (Extraction Only) **ห้ามคำนวณคณิตศาสตร์หรือประเมินผลการอนุมัติเอง**

### 2.2 โครงสร้าง Schema ตารางที่ 3 ที่ AI ส่งออก
```json
{
  "header": {
    "invoice_number": "string",
    "po_number": "string",
    "delivery_note_number": "string",
    "invoice_date": "YYYY-MM-DD",
    "supplier_name": "string",
    "supplier_tax_id": "13 digits",
    "customer_name": "string",
    "customer_tax_id": "13 digits",
    "customer_branch": "string"
  },
  "line_items": [
    {
      "line_no": 1,
      "item_code": "string",
      "description": "string",
      "quantity": 0.0,
      "uom": "string",
      "unit_price": 0.0,
      "line_total": 0.0
    }
  ],
  "totals": {
    "subtotal": 0.0,
    "vat_rate": 7.0,
    "vat_amount": 0.0,
    "grand_total": 0.0
  },
  "signatures": {
    "sender_signature": true,
    "receiver_signature": true
  }
}
```

---

## 3. Paperless-ngx (Document Management System)

- **ไฟล์โค้ด:** [`OCR service/n8n/app/services/paperless.py`](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/OCR%20service/n8n/app/services/paperless.py)
- **Base URL:** `PAPERLESS_BASE_URL` (เช่น `http://localhost:8000`)
- **Authentication:** `Authorization: Token <PAPERLESS_API_TOKEN>`

### 3.1 การจัดการคิวและป้องกันการทำซ้ำ (Deduplication)
- **Tag ID 5 (`invoice`):** เอกสารใบแจ้งหนี้ที่เข้ามาใหม่และรอรับการตรวจสอบ
- **Tag ID 12 (`check n8n`):** แท็กที่ระบบจะเพิ่มเข้าไปทันทีหลังเอกสารได้รับการประมวลผล เพื่อไม่ให้ถูกดึงมาทำซ้ำ
- **Status Tags:** แท็กแสดงผลลัพธ์ เช่น `aiva-autopass`, `aiva-hold`, `aiva-review`, `aiva-manual`

---

## 4. AIVA Accounting Web Portal

- **ไฟล์โค้ด:** [`OCR service/n8n/app/services/portal.py`](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/OCR%20service/n8n/app/services/portal.py)
- **Webhook URL:** `PORTAL_API_URL`
- **Method:** `POST` (JSON Payload Table 9)
- **หน้าที่:** ส่งผลการประเมิน 3-Way Matching ไปยังหน้า Portal ของฝ่ายบัญชี เพื่อให้เจ้าหน้าที่ตรวจสอบ (กรณี Review/Hold) หรือตัดจ่ายอัตโนมัติ (กรณี Auto-pass)
