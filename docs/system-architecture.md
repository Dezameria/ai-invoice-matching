# System Architecture: AIVA PO-Invoice Matching Verification

> **มาตรฐานอ้างอิง:** `AH-IT-DOC-PO-INV-Matching-Standard-v6.2-DRAFT-260930-WT`  
> **Backend Architecture:** Dual-Circuit 3-Way Matching Engine with FastAPI, LiteLLM Vision (`deepseek-v4-flash`), and Oracle EBS ORDS MCP.

---

## 1. ภาพรวมระบบ (System Overview)

ระบบ **AIVA PO-INV Matching Verification System** ทำหน้าที่เป็นตัวกลางตรวจสอบความถูกต้องของเอกสารใบแจ้งหนี้/ใบกำกับภาษี (Invoice / Tax Invoice) และทำการตรวจสอบเทียบแบบ **3-Way Matching** ระหว่าง:
1. **Invoice (ใบแจ้งหนี้/ใบกำกับภาษี)** ที่ผู้ขายส่งมา
2. **Purchase Order (PO - ใบสั่งซื้อ)** ในระบบจัดซื้อ
3. **Goods Receipt (RCV - ใบรับสินค้า)** ในระบบ Oracle EBS ERP

ระบบทำงานแบบ Dual-Circuit เพื่อประสิทธิภาพและความปลอดภัยสูงสุด โดยหากพบความผิดพลาดทางเลขคณิตในระดับบรรทัดของเอกสาร (E28) ระบบจะตัดวงจรไม่เรียก Oracle ERP ทันที เพื่อป้องกันโหลดเกินความจำเป็น

---

## 2. แผนภาพสถาปัตยกรรมระดับสูง (High-Level Architecture)

```mermaid
flowchart LR
    subgraph Sources["แหล่งข้อมูลต้นทาง"]
        Paperless["Paperless-ngx<br/>(DMS Storage)"]
        Upload["Direct File Upload<br/>(PDF / Images)"]
    end

    subgraph CoreEngine["AIVA Core Engine (FastAPI)"]
        Pipeline["Verification Pipeline Orchestrator"]
        Extractor["Vision AI Extractor"]
        Rules["Rules Engine<br/>(STEP 1 - STEP 4)"]
        MasterDB["AAPICO Master Entities<br/>(27 Companies)"]
    end

    subgraph External["ระบบภายนอก"]
        LiteLLM["LiteLLM Vision Proxy<br/>(deepseek-v4-flash)"]
        OracleEBS["Oracle EBS ERP<br/>(ORDS MCP Service)"]
        Portal["AIVA Web Portal<br/>(Accounting Review)"]
    end

    Sources --> Pipeline
    Pipeline --> Extractor
    Extractor <--> LiteLLM
    Extractor --> Rules
    Rules <--> MasterDB
    Rules <--> OracleEBS
    Rules --> Pipeline
    Pipeline --> Portal
    Pipeline --> Paperless
```

---

## 3. ส่วนประกอบหลักของระบบ (System Components)

### 3.1 Backend Application (`OCR service/n8n/app/`)
- **FastAPI Core (`main.py`)**: ให้บริการ REST API แบบ Asynchronous ประสิทธิภาพสูง พร้อมทั้ง Serve หน้า Web UI สำหรับ Review เอกสารที่ `/app`
- **Config Management (`config.py`)**: จัดการตัวแปรสภาพแวดล้อมผ่าน Pydantic BaseSettings และ `.env`
- **Domain Models (`core/models.py`)**: กำหนด Data Schema ตามมาตรฐาน:
  - Table 3 Schema: ข้อมูลที่สกัดได้จาก Vision AI
  - Oracle Receipt Schema: โครงสร้างข้อมูลใบรับสินค้าจาก ERP
  - Table 9 Schema: ผลลัพธ์การตรวจสอบสุดท้าย 9 กฎ (V-01 ถึง V-09)
- **Master Data (`core/master_data.py`)**: ข้อมูล 27 บริษัทในเครือ AAPICO (Tax ID 13 หลัก, Inventory Org ID, Operating Unit ID, ที่อยู่ และรหัสไปรษณีย์) สำหรับการตรวจสอบแบบ Exact Match
- **Rules Engine (`core/rules.py`)**: โมดูลตรรกะและคณิตศาสตร์บริสุทธิ์ (Pure Logic) ปราศจาก Side-effect แยกเป็น STEP 1, STEP 2, STEP 3 และ STEP 4

### 3.2 Services & Integrations (`app/services/`)
- **Pipeline Orchestrator (`pipeline.py`)**: ตัวควบคุมวงจรชีวิตการตรวจสอบเอกสารตั้งแต่ Ingestion จนถึง Final Dispatch
- **Vision Extractor (`vision_extractor.py`)**: แปลงหน้าเอกสาร PDF/Image เป็น Base64 แล้วส่งให้ LiteLLM Proxy เพื่อดึงข้อมูล Table 3 JSON
- **Oracle MCP Client (`oracle_mcp.py`)**: เชื่อมต่อไปยัง Oracle EBS ORDS MCP Server ผ่าน JSON-RPC รัน Query วิว `apps.AH_DEV_RCV_PO_AP_MATCHING_V`
- **Paperless Client (`paperless.py`)**: ดึงเอกสารคิวที่ต้องตรวจสอบ (Tag ID 5) และติด Tag หลังตรวจสอบเสร็จ (เช่น Tag ID 12 และ Tag สถานะผลลัพธ์)
- **Portal Dispatcher (`portal.py`)**: ส่งผลลัพธ์ Table 9 JSON ไปยัง AIVA Web Portal Webhook

---

## 4. โฟลว์การประมวลผลเอกสาร 4 ขั้นตอน (The 4-Step Pipeline Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User/System
    participant Pipeline as Pipeline Orchestrator
    participant Vision as Vision Extractor (LiteLLM)
    participant Rules as Rules Engine
    participant Oracle as Oracle EBS MCP
    participant Paperless as Paperless-ngx
    participant Portal as AIVA Portal

    User/System->>Pipeline: ส่งเอกสาร (PDF/Image หรือ Paperless Queue)
    Pipeline->>Vision: แปลงไฟล์เป็นภาพ & เรียก Vision LLM
    Vision-->>Pipeline: Table 3 Extracted JSON (Header, Lines, Totals)
    
    Pipeline->>Rules: STEP 1: ตรวจสอบเอกสารในตัวเอง (V-01, V-02, V-03, V-06)
    Rules-->>Pipeline: ผล STEP 1 (ผ่าน หรือ พบ E28 Math Error)

    alt พบ Line Math Error (E28)
        Pipeline->>Rules: Bypass Oracle ERP -> เข้า STEP 4 ทันที
    else เอกสารผ่าน STEP 1 ถูกต้อง
        Pipeline->>Oracle: Query ใบรับสินค้า (Supplier Tax ID + Invoice No. / PO)
        Oracle-->>Pipeline: รายการ Goods Receipt (CSV / Array)
        Pipeline->>Rules: STEP 2: ตรวจใบรับสินค้า & Master Entity (V-04, V-05)
        Pipeline->>Rules: STEP 3: Ladder Line Matching (V-07, V-08, V-09)
    end

    Pipeline->>Rules: STEP 4: Decision Matrix รวมผลลัพธ์
    Rules-->>Pipeline: Table 9 Final Result (Auto-pass / Review / Hold / Manual Review)

    Pipeline->>Paperless: อัปเดตแท็กสถานะ (e.g., aiva-autopass, check n8n)
    Pipeline->>Portal: ส่งผลลัพธ์ JSON เข้า Webhook
    Pipeline-->>User/System: Response ผลการประมวลผล
```

---

## 5. แหล่งอ้างอิงโค้ด (Source Code References)

- [app/main.py](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/OCR%20service/n8n/app/main.py)
- [app/services/pipeline.py](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/OCR%20service/n8n/app/services/pipeline.py)
- [app/core/rules.py](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/OCR%20service/n8n/app/core/rules.py)
- [app/services/oracle_mcp.py](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/OCR%20service/n8n/app/services/oracle_mcp.py)
