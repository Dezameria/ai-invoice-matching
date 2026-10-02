# AIVA PO-Invoice Matching System Documentation

ศูนย์รวมเอกสารสถาปัตยกรรม โครงสร้างระบบ กฎเกณฑ์การตรวจสอบ และข้อมูลอ้างอิงทางเทคนิคสำหรับระบบ **AIVA PO-INV Matching Verification System (Standard v6.2 / v6.3)** จัดทำขึ้นเพื่อให้ผู้พัฒนาและ AI Agent สามารถอ่าน ทำความเข้าใจ และอ้างอิงโครงสร้างของระบบได้อย่างรวดเร็ว

---

## สารบัญเอกสาร (Documentation Index)

| เอกสาร | รายละเอียด | ลิงก์อ้างอิง |
|---|---|---|
| **System Architecture** | ภาพรวมสถาปัตยกรรมทั้งระบบ, ส่วนประกอบ (Components), End-to-End Data Pipeline, และเทคโนโลยีที่ใช้ | [system-architecture.md](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/docs/system-architecture.md) |
| **Matching Rules & Standard** | กฎการคำนวณและตรวจสอบ 9 ข้อ (V-01 ถึง V-09), กฎการออกแบบ D1–D6, ข้อยกเว้น E05–E35, และ Decision Matrix | [matching-rules-standard-v6.2.md](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/docs/matching-rules-standard-v6.2.md) |
| **API Reference** | รายละเอียด REST API Endpoints, Server-Sent Events (SSE), Request/Response Schemas, และ Web UI Route | [api-reference.md](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/docs/api-reference.md) |
| **External Integrations** | การเชื่อมต่อกับระบบภายนอก: Oracle EBS ORDS MCP Server, LiteLLM Vision (`deepseek-v4-flash`), Paperless-ngx, และ AIVA Portal | [integrations.md](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/docs/integrations.md) |

---

## ผังไดเรกทอรีของโปรเจกต์ (Project Directory Map)

```
ai-invoice-matching/
├── AGENTS.md                  # ข้อตกลงและ protocol การทำงานของ AI Agent
├── agent/                     # บันทึกสถานะและการทำงานของ Agent (Current State, Work Log, Sessions)
├── docs/                      # เอกสารสถาปัตยกรรมและโครงสร้างระบบ (Directory นี้)
├── OCR service/               # Backend Service หลักของระบบ
│   └── n8n/
│       ├── app/
│       │   ├── main.py        # FastAPI Entrypoint & Web UI Server
│       │   ├── config.py      # App Configuration (โหลดจาก .env)
│       │   ├── api/           # API Routers (/verify/file, /master-entities, /fe/*)
│       │   ├── core/          # Business Logic (Rules Engine, Master Data, Models)
│       │   └── services/      # Service Clients (Oracle MCP, Vision LLM, Paperless, Portal)
│       ├── tests/             # Live Integration Test Suite
│       ├── requirements.txt   # รายการ Python dependencies
│       └── .env.example       # Template ตัวแปรสภาพแวดล้อม
└── Web portal/                # Frontend Portal Mockups & UI Templates
    └── AIVA-Web-Portal-Mockup-v4.4-Release.html
```

---

## แนวทางสำหรับ AI Agent ในการใช้งานเอกสารชุดนี้

1. **เมื่อต้องการทำความเข้าใจ Data Flow และ Pipeline**: อ่าน [system-architecture.md](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/docs/system-architecture.md)
2. **เมื่อต้องแก้ไขหรือเพิ่ม Business Logic / กฎการตรวจ 3-Way**: ตรวจสอบ [matching-rules-standard-v6.2.md](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/docs/matching-rules-standard-v6.2.md) เพื่อคงความสอดคล้องกับ Standard v6.2
3. **เมื่อต้องเพิ่ม Endpoint หรือต่อ API เข้ากับ Web Frontend**: อ่าน [api-reference.md](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/docs/api-reference.md)
4. **เมื่อมีปัญหาการเชื่อมต่อกับ Oracle ERP, Vision LLM หรือ Paperless**: อ่าน [integrations.md](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/docs/integrations.md)
