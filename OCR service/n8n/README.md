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
├── .agent/                             # [Dev Agent Memory] บันทึก Task plan, current state, changelogs
├── .pi/                                # [Pi QA Agent Workspace]
│   ├── AGENT_INSTRUCTIONS.md           # คู่มือและบทบาท QA Specialist ของ Pi Agent
│   └── mcp-adapter.json                # MCP Configuration สำหรับ Pi Agent
├── app/                                # [Core Production Code] (Dev Agent ดูแล)
│   ├── api/                            # REST & SSE Endpoints (/verify/file, /oracle-receipts, /fe/*)
│   ├── core/                           # Data Models & Rules Engine (STEP 1 - STEP 4)
│   ├── services/                       # Integrations (Oracle MCP, Vision Extractor, Paperless, Portal)
│   ├── config.py                       # Configuration ผ่าน pydantic-settings โหลดจาก .env
│   ├── main.py                         # FastAPI Application Entrypoint
│   └── AIVA-Document-Card-Verification-v3.html
├── docs/                               # [Documentation & Workflow Parity]
│   └── workflows/
│       ├── n8n_flow_v6_5.md            # เอกสารโครงสร้าง 23 Nodes ของ n8n Flow (v6.5)
│       └── parity_spec_matrix.md       # ตารางเทียบ Python Method <-> n8n Node แบบ 1:1
├── scripts/                            # [Operational & Batch Scripts]
│   └── batch_verify_paperless.py       # สคริปต์รันตรวจ Batch จาก Paperless-ngx
├── tests/                              # [Test Suite & Pi Agent Domain] (Pi Agent ถือครอง)
│   ├── fixtures/                       # Test Scenarios Matrix & Sample Data
│   │   └── oracle_test_scenarios.json  # รวมเคส PO จริง, เลขที่บิลจริง, Intercompany, E17, E28
│   ├── live/                           # Live Integration Tests (ต่อ Oracle EBS จริง)
│   │   └── test_live_oracle.py         # Live Oracle MCP Integration Tests
│   ├── test_invoices/                  # Synthetic Invoice Corpus & Tools
│   ├── reports/                        # ที่เก็บ Test Run Reports & JSON Failure Artifacts
│   │   └── test_run_latest.md          # รายงานผลการรันเทสต์ฉบับทางการล่าสุด
│   ├── conftest.py
│   ├── pytest.ini                      # Markers: [offline, live, oracle, corpus]
│   └── run_tests.py                    # Unified CLI Test Runner สำหรับ Pi Agent
├── .env.example                        # Template สำหรับตั้งค่า Environment
├── .env                                # Local Environment Configuration
├── requirements.txt                    # รายการ Dependencies
└── README.md                           # เอกสารคู่มือการใช้งาน
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

## 6. การรันสคริปต์ทดสอบระบบและการใช้งาน Pi Agent (Testing & Pi Agent)

โฟลเดอร์ `tests/` ถูกออกแบบให้เป็นอิสระสำหรับ **Pi Agent (QA Auditor)** เพื่อทดสอบระบบอย่างสมบูรณ์ทั้งแบบ Offline และ Live กับ Oracle EBS:

### 6.1 รันผ่าน Unified CLI Runner (`tests/run_tests.py`)
```powershell
# 1. รันเฉพาะ Live Oracle EBS Tests (ดึงข้อมูลจริงจาก Oracle EBS ผ่าน MCP rcv_v01)
.\.venv\Scripts\python.exe tests/run_tests.py --mode live-oracle

# 2. รัน Offline Unit & Rules Suite (เร็วมาก ไม่ต้องต่อ Network)
.\.venv\Scripts\python.exe tests/run_tests.py --mode offline

# 3. รันครบทุกชุด (Live Oracle + Rules + Corpus) พร้อมสร้าง Report อัตโนมัติใน tests/reports/
.\.venv\Scripts\python.exe tests/run_tests.py --all --report
```

### 6.2 การรันแยกตามโมดูล
```powershell
# รัน Live Suite ดั้งเดิม (16 การทดสอบพร้อม Badge สี)
.\.venv\Scripts\python.exe tests/test_suite.py

# รัน Pytest Offline Regression (155 Synthetic Invoices)
.\.venv\Scripts\python.exe -m pytest tests/test_invoice_corpus.py -q

# รัน Live Oracle Integration Test ด้วย Pytest
.\.venv\Scripts\python.exe -m pytest tests/live/test_live_oracle.py -m oracle -o addopts="" -v -s
```

### 6.3 Test Reports & Artifacts
ผลการทดสอบทั้งหมดจะถูกจัดเก็บไว้ใน `tests/reports/`:
- `tests/reports/test_run_latest.md`: รายงานสรุปผลรอบล่าสุด พร้อม Duration และ Logs
- `tests/reports/batch_verifications_report.md` & `batch_failed_verifications.json`: ผลการรัน Batch จาก Paperless-ngx
