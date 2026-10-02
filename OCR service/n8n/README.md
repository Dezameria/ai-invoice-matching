# AIVA PO-INV Matching Verification System (Standard v6.2)

> **มาตรฐานอ้างอิง:** `AH-IT-DOC-PO-INV-Matching-Standard-v6.2-DRAFT-260930-WT`  
> **Original n8n Workflow:** `AIVA PO-INV Matching Verification v6.2` (ID: `aLUCmn3l0bZDjbVV`)  
> **Architecture:** Dual-Circuit 3-Way Matching Engine with FastAPI, LiteLLM Vision (`deepseek-v4-flash`), and Oracle EBS ORDS MCP.

---

## 1. ภาพรวมระบบ (System Overview)

โปรเจกต์นี้เป็นการแปลงระบบ **AIVA PO-INV Matching Verification System** จาก n8n Workflow เดิมมาเป็น **Python Service ระดับ Production** ที่ทำงานแบบ REST API เต็มรูปแบบ พร้อมสถาปัตยกรรมแบบ Modular Clean Architecture และชุดทดสอบระบบจริง (Live Test Suite)

### หลักการออกแบบสำคัญ (D1–D6):
1. **D1 (Extraction Only):** AI (Vision LLM) ทำหน้าที่เพียงสกัดข้อมูลและตรวจพบลายเซ็นจากรูปภาพ ห้ามคำนวณคณิตศาสตร์หรือตัดสินใจเอง
2. **D2 (Read-Only Named Query):** เชื่อมต่อ Oracle EBS ผ่าน ORDS MCP Tool `sql_run` (Query วิว `apps.AH_DEV_RCV_PO_AP_MATCHING_V`) ด้วย Bind Variable ตายตัว
3. **D3 (At Most Once Oracle Query):** เรียก Oracle ERP สูงสุด 1 ครั้งต่อเอกสาร และข้ามการเรียกทันทีหากพบข้อผิดพลาดคณิตศาสตร์บรรทัด (E28)
4. **D4 (Master Data Lookup):** ข้อมูลนิติบุคคล 27 บริษัท (ORG_ID, Tax ID, สาขา) จัดเก็บใน Master Table สำหรับ Exact Matching
5. **D5 (Table 9 Standard Output):** ผลลัพธ์ส่งออกตามมาตรฐาน Table 9 JSON ครบถ้วนทั้ง 9 กฎ (V-01 ถึง V-09)
6. **D6 (Auditability & Safety):** หากระบบขัดข้องจะไม่ปล่อย Auto-pass เด็ดขาด

---

## 2. โครงสร้างโปรเจกต์ (Project Structure)

```
n8n/
├── app/
│   ├── __init__.py
│   ├── config.py                 # Configuration ผ่าน pydantic-settings โหลดจาก .env
│   ├── main.py                   # FastAPI Application Entrypoint
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py             # REST API Endpoints (/verify/file, /verify/paperless-next, ฯลฯ)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── master_data.py        # Master Data 27 บริษัท & รหัสข้อยกเว้น E05-E35
│   │   ├── models.py             # Pydantic Schemas (Table 3 Extraction & Table 9 Output)
│   │   └── rules.py              # กฎการคำนวณบริสุทธิ์ STEP 1, STEP 2, STEP 3, STEP 4
│   └── services/
│       ├── __init__.py
│       ├── oracle_mcp.py         # Client เชื่อมต่อ Oracle EBS ORDS MCP (Stream-safe)
│       ├── vision_extractor.py   # Multi-modal Vision Extractor (PDF/Image -> deepseek-v4-flash)
│       ├── paperless.py          # Paperless-ngx REST Client (ดึงคิว & ติด Tag 12 ป้องกันทำซ้ำ)
│       ├── portal.py             # Dispatcher ส่ง Table 9 JSON ไปยัง AIVA Portal
│       └── pipeline.py           # Verification Pipeline Orchestrator (ควบคุมการไหล 4 ขั้นตอน)
├── tests/
│   └── test_suite.py             # Live Test Suite ทดสอบทั้งระบบพร้อมรายงานผลสรุป
├── .env.example                  # Template สำหรับตั้งค่า Environment
├── .env                          # Local Environment Configuration
├── requirements.txt              # รายการ Dependencies
└── README.md                     # เอกสารคู่มือการใช้งาน
```

---

## 3. การติดตั้งและเริ่มต้นใช้งาน (Installation & Setup)

### 3.1 การสร้าง Virtual Environment และติดตั้ง Dependencies
```powershell
# สร้าง venv
python -m venv .venv

# เปิดใช้งาน venv บน Windows
.\.venv\Scripts\Activate.ps1

# ติดตั้ง Dependencies
pip install -r requirements.txt
```

### 3.2 ตั้งค่า Environment (.env)
คัดลอกไฟล์ `.env.example` เป็น `.env` และแก้ไขค่าตามต้องการ:
```env
APP_NAME="AIVA PO-INV Matching Service"
APP_ENV=development
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# LiteLLM Vision Proxy (deepseek-v4-flash)
LITELLM_URL=http://10.10.3.112:4000/v1
LITELLM_API_KEY=sk-1234
LITELLM_MODEL=deepseek-v4-flash

# Oracle EBS ORDS MCP Service
ORACLE_MCP_URL=http://ahebs.aapico.com:8080/mcp
ORACLE_MCP_TOKEN=<JWT_BEARER_TOKEN>
ORACLE_MCP_TIMEOUT_SECONDS=60.0

# Paperless-ngx
PAPERLESS_BASE_URL=http://localhost:8000
PAPERLESS_API_TOKEN=your_paperless_token_here
PAPERLESS_TAG_INVOICE_ID=5
PAPERLESS_TAG_CHECKED_ID=12

# AIVA Portal Webhook
PORTAL_API_URL=https://httpbin.org/post
```

---

## 4. การรันเซิร์ฟเวอร์ API (Running the API Server)

รันเซิร์ฟเวอร์ด้วย Uvicorn:
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
เมื่อรันสำเร็จ สามารถเข้าชมเอกสาร Interactive API (Swagger UI) ได้ที่:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 5. รายละเอียด API Endpoints (API Reference)

| Method | Path | หน้าที่การทำงาน | ตัวอย่าง Payload / Parameters |
|---|---|---|---|
| `GET` | `/health` | ตรวจสอบสถานะการเชื่อมต่อ Service ภายนอก (Oracle MCP, LiteLLM, Paperless) | - |
| `POST` | `/api/v1/verify/file` | รับไฟล์ PDF หรือ รูปภาพ (PNG, JPG, WEBP) สกัดด้วย Vision LLM และรัน 3-Way Matching | Multipart Form: `file`, `doc_id`, `po_number` |
| `POST` | `/api/v1/verify/extracted-json` | ตรวจสอบข้อมูลใบแจ้งหนี้จาก JSON โดยตรง (Bypass Vision LLM เพื่อความรวดเร็ว) | Body JSON ตาม Table 3 Schema |
| `POST` | `/api/v1/verify/paperless-next` | ดึงเอกสารคิวถัดไปจาก Paperless (Tag 5 ข้าม 12) ประมวลผล และติด Tag 12 อัตโนมัติ | Query params: `tag_id`, `excluded_tag_id` |
| `GET` | `/api/v1/master-entities` | ดูรายชื่อ Master Data นิติบุคคลทั้ง 27 บริษัท (Table 4) | - |
| `GET` | `/api/v1/oracle-receipts/{po_number}` | ทดสอบ Query ข้อมูลใบรับสินค้าสดจาก Oracle EBS ตามเลข PO | Path param: `po_number` (เช่น `42052835`) |

---

## 6. การรันสคริปต์ทดสอบระบบ (Running the Test Suite)

ระบบมาพร้อมกับ Live Test Suite ครอบคลุม 16 การทดสอบ ยิงทดสอบระบบจริงทั้ง Oracle EBS MCP, LiteLLM `deepseek-v4-flash`, Rules Engine, และ REST API:

```powershell
.\.venv\Scripts\python.exe tests/test_suite.py
```

### ผลการทดสอบ (Test Report):
- **TEST SUITE 1 (Configuration):** ตรวจสอบการโหลดค่าคอนฟิก (.env, URLs, Models)
- **TEST SUITE 2 (Live Oracle MCP):** ทดสอบ Query PO `42052835` สดจาก EBS view `apps.AH_DEV_RCV_PO_AP_MATCHING_V`, ตรวจสอบโครงสร้างใบรับ 4 รายการ, และทดสอบ Handle PO ที่ไม่มีในระบบ (0 rows)
- **TEST SUITE 3 (Live LiteLLM):** ทดสอบเรียก Vision LLM `deepseek-v4-flash` สกัดข้อมูลเอกสารภาษาไทยและคำนวณฟิลด์
- **TEST SUITE 4 (Rules Engine):** 
  - Case 4.1: ข้อมูลจริงจาก Execution #292 (พบ Tax ID ไม่ตรง -> ตัดสิน **Hold** ส่งต่อ `user`)
  - Case 4.2: ข้อมูลที่ตรงกัน 100% (ตัดสิน **Auto-pass**)
  - Case 4.3: ข้อผิดพลาดคณิตศาสตร์บรรทัด E28 (Bypass Oracle EBS สำเร็จ)
  - Case 4.4: ขาดลายเซ็นผู้รับ/ผู้ส่งของ E26 (ส่งต่อ `user`)
  - Case 4.5: ไม่พบใบรับสินค้าใน ERP E17 (Bypass STEP 3 สำเร็จ)
- **TEST SUITE 5 (FastAPI Endpoints):** ทดสอบ Endpoints `/health`, `/master-entities`, `/oracle-receipts`, และ `/verify/extracted-json`

**ผลลัพธ์การรันล่าสุด:** `16 / 16 Tests Passed (Success Rate: 100.0%)`

### Offline Regression Suite (pytest — ไม่ต้องต่อ Oracle/LiteLLM/Paperless)

```powershell
.\.venv\Scripts\python.exe -m pip install -r tests/test_invoices/requirements-test.txt
.\.venv\Scripts\python.exe -m pytest
```

- `tests/test_invoice_corpus.py` — replay ใบกำกับภาษีสังเคราะห์ 155 ฉบับใน `tests/test_invoices/` ผ่าน Rules Engine จริง (`app/core.rules` Step 1–4) และตรวจว่า PDF ที่ render ตรงกับ answer key (ฟิลด์ที่มี/ที่หาย, จำนวนหน้า) ใช้เวลา ~2 วินาที
- Expectation ทั้งหมดผลิตจาก engine จึงเป็น regression gate เมื่อแก้ไข threshold, decision matrix หรือ PDF corpus แล้วรัน `tests/test_invoices/verify_dataset.py` เพื่อดูรายการที่ drift
- `pytest.ini` deselect test ที่ติด marker `live` (ต้องยิง LiteLLM/Paperless จริง) — เรียกใช้ด้วย `python -m pytest -m live`
- `tests/test_suite.py` เป็นสคริปต์รายงานผลสด จึงถูกยกเว้นจาก pytest (`tests/conftest.py`) ให้รันตรงตามที่อธิบายข้างบน

**ผลลัพธ์การรันล่าสุด:** `9 passed, 2 deselected in ~1.7s`
