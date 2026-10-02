# n8n Flow Structure & System Architecture: AIVA PO-INV Matching Verification (v6.4)

> **มาตรฐานอ้างอิง:** `AH-IT-DOC-PO-INV-Matching-Standard-v6.2-DRAFT-260930-WT`  
> **Workflow Name:** `AIVA PO-INV Matching Verification v6.2`  
> **Workflow ID:** `aLUCmn3l0bZDjbVV`  
> **Canvas URL:** [http://localhost:5678/workflow/aLUCmn3l0bZDjbVV](http://localhost:5678/workflow/aLUCmn3l0bZDjbVV)  
> **Version:** 6.4.0 (ล่าสุด: สถาปัตยกรรม Oracle EBS Dynamic 100% เชื่อมต่อตรงกับ EBS ผ่าน `apps.financials_system_params_all` ปลดระวาง Static Master Data และรองรับบิล Multi-PO ด้วย Item Ladder Matching)  
> **API Parity:** ทำงานสอดคล้อง 100% กับ Python FastAPI Engine (`app/main.py`, `app/services/pipeline.py`, และ `app/services/master_data_service.py`)

---

## 1. หลักการออกแบบระบบ (Core Design Principles D1–D6)

| # | หลักการ | เหตุผลและข้อกำหนดตามมาตรฐาน |
|---|---|---|
| **D1** | **AI ทำหน้าที่เพียงสกัดข้อมูล (Extraction Only)** | ให้ Vision LLM อ่านข้อความ ตัวเลข และลายเซ็นจากภาพบิล ห้าม AI คำนวณเลขคณิตหรือตัดสินผลเองเด็ดขาด เพื่อป้องกัน Hallucination และคงไว้ซึ่ง Auditability |
| **D2** | **Oracle MCP แบบ Unified All-in-One Indexed Query** | ค้นหารายการรับสินค้าแบบรวมศูนย์ด้วย `Supplier Tax ID + Invoice No.` (Primary) รองรับกรณี 1 Invoice มีหลาย PO (Multi-PO) พร้อมดึงข้อมูลผู้ขาย ผู้ซื้อ (`CUSTOMER_TAX_ID`) และที่อยู่จัดส่งในคำสั่งเดียว (< 1 วินาที) โดยมี `PO_NUM` เป็น Fallback |
| **D3** | **เรียก Oracle ERP สูงสุด 1 ครั้งต่อเอกสาร** | เรียกเฉพาะเมื่อผ่าน STEP 1 และไม่พบ Exception E28 (Line Math Error) เท่านั้น |
| **D4** | **Oracle Dynamic 100% (No Static Master Data)** | ดึงข้อมูลนิติบุคคลผู้ซื้อ (`CUSTOMER_TAX_ID`) และที่อยู่จัดส่ง (`CUSTOMER_POSTAL`) พ่วงตรงมาจาก Oracle EBS ผ่าน `apps.financials_system_params_all` ร่วมกับ Receipt ทันที ไม่ใช้ไฟล์ static hardcoded เพื่อความแม่นยำและรองรับการเปลี่ยนแปลงขององค์กรแบบ Real-time |
| **D5** | **Output สอดคล้องตาม Table 9 เสมอ** | ส่งผลครบ 9 กฎ (V-01 ถึง V-09) หากกฎใดถูก Bypass เนื่องจาก Critical Error ให้ระบุผลเป็น `not_evaluated` |
| **D6** | **AIVA ไม่ตัดสินอนุมัติการจ่ายเงิน** | การอนุมัติตัดจ่ายเป็นหน้าที่ของฝ่ายบัญชีและ AIVA Portal; หากระบบขัดข้องต้องติดแท็ก `aiva-error` ห้ามปล่อย Auto-pass เด็ดขาด |

---

## 2. แผนภาพสถาปัตยกรรมภาพรวม (End-to-End Pipeline)

```mermaid
flowchart TD
  subgraph Ingestion["1. Ingestion & Document Selection"]
    Manual["Manual Trigger"] --> N2["N2: Get Document from Paperless<br/>(tags: 5 'invoice', excluded: 12 'check n8n')"]
    N2 --> N2_1["N2.1: Prepare Document Payload<br/>(Extract doc_id, title, OCR text)"]
    N2_1 --> N2_2{"N2.2: IF: Has Unprocessed Doc?<br/>(results.length > 0)"}
    N2_2 -- "ไม่มีเอกสารค้าง" --> MainDone["Main: Result - All Already Processed<br/>(Deduplicated 100%)"]
  end

  subgraph VisionExtraction["2. Multi-Page Vision Extraction (Standard Table 3)"]
    N2_2 -- "พบเอกสารใหม่" --> N2_3["Get a document -> PDF Convert<br/>(Render Multi-page JPEG สูงสุด 4 หน้า)"]
    N2_3 --> N2_4["N2.4: Prepare Image & Agent Payload<br/>(Embed Table 3 JSON Schema Guide & OCR Fallback)"]
    N2_4 --> N3["HTTP Request (Vision LLM)<br/>(LiteLLM Proxy: deepseek-v4-flash, json_object)"]
    N3 --> N4["N4: Code: Normalize<br/>(Table 3 Normalization, Tax ID 13 digits, UOM, Clean Date)"]
  end

  subgraph Step1Circuit["3. STEP 1: Pure Document Rules (V-01, V-02, V-03, V-06)"]
    N4 --> N5["N5: Code: STEP 1 Rules<br/>(V-01 Completeness, V-02 Line Math, V-03 Doc Math, V-06 Signatures)"]
    N5 --> N6{"N6: IF: Has E28?<br/>(|qty * unit_price - amount| > 0.50)"}
  end

  subgraph Step2_3Circuit["4. Unified Oracle ERP Integration & STEP 2-3 Rules"]
    N6 -- "ไม่พบ E28 (ปกติ)" --> N7["N7: Oracle MCP rcv_v01<br/>(Unified Query: Supplier Tax ID + Invoice No. / PO Fallback)"]
    N7 --> N7_1["N7.1: Parse Oracle Receipts<br/>(Parse MCP CSV to Structured Array with Multi-PO fields)"]
    N7_1 --> N8["N8: Code: STEP 2 (Receipts & ORG_ID)<br/>(V-04 Receipt Status, V-05 Master Entity Oracle 100%)"]
    
    N8 --> IF_Critical{"IF: Critical Receipt Issue?<br/>(E17 No Receipt / E35 Multiple / Manual)"}
    IF_Critical -- "ปกติ" --> N9["N9: Code: STEP 3 (Line Matching Ladder)<br/>(V-07 Ladder M1 Item Code -> M2 Line No -> M3 Desc, V-08 Qty, V-09 Subtotal)"]
  end

  subgraph DecisionAndOutput["5. Decision Matrix & Paperless Tagging"]
    N6 -- "พบ E28 (Bypass Oracle)" --> N10["N10: Code: STEP 4 Decision Matrix<br/>(Auto-pass / Review / Hold / Manual Review)"]
    IF_Critical -- "พบ Critical (Bypass Line Match)" --> N10
    N9 --> N10
    
    N10 --> N11["N11: Code: Schema Validate<br/>(Assert Table 9 Compliance)"]
    N11 --> N12["N12: HTTP: POST Portal<br/>(Send verification result to backend)"]
    N12 --> N13["N13: Paperless: Update Status<br/>(Prepare Status Tags: aiva-autopass, aiva-hold, etc.)"]
    N13 --> N13_1["N13.1: Paperless: Add Tag to Prevent Duplicate<br/>(Append Tag ID 12 'check n8n')"]
    N13_1 --> N14["N14: Verification & Tagging Summary<br/>(Final Audit Report & Deduplication Confirmed)"]
  end
```

---

## 3. รายละเอียด Node ทั้งหมดใน Pipeline (23 Nodes)

| ลำดับ | ชื่อ Node | ชนิดของ Node (Type) | หน้าที่และความรับผิดชอบหลัก |
|:---:|---|---|---|
| **1** | `Manual Trigger` | `n8n-nodes-base.manualTrigger` | ปุ่มเริ่มต้นสำหรับการทดสอบรันด้วยมือบน Canvas |
| **2** | `N2: Get Document from Paperless` | `@mephistojb/n8n-nodes-paperless.paperless` | ดึงเอกสารจาก Paperless (กรองเฉพาะ tag ID 5 `invoice` และ **ไม่รวม** tag ID 12 `check n8n`) |
| **3** | `N2.1: Prepare Document Payload` | `n8n-nodes-base.code` | แกะออบเจกต์เอกสาร ดึง `doc_id`, `title`, `content` (OCR text) |
| **4** | `N2.2: IF: Has Unprocessed Document?` | `n8n-nodes-base.if` | ตรวจสอบว่ามีเอกสารใหม่หรือไม่ ถ้าไม่มีจะแยกไปจบงานทันที |
| **5** | `Main: Result - All Already Processed` | `n8n-nodes-base.code` | รายงานผลเมื่อไม่มีเอกสารใหม่ค้าง (ยืนยัน Deduplication 100%) |
| **6** | `Get a document` | `@mephistojb/n8n-nodes-paperless.paperless` | ดึง Binary Data ของไฟล์เอกสาร PDF จาก Paperless |
| **7** | `PDF Convert` | `n8n-nodes-pdfconvert.pdfConvert` | แปลงหน้า PDF ให้เป็นรูปภาพ Multi-page JPEG |
| **8** | `N2.4: Prepare Image & Agent Payload` | `n8n-nodes-base.code` | ฝัง Text Prompt, **JSON Schema ตารางที่ 3 (Standard v6.2)** และจัดเตรียม Base64 Images |
| **9** | `HTTP Request` | `n8n-nodes-base.httpRequest` | เรียก Vision LLM (`deepseek-v4-flash`) ผ่าน LiteLLM Proxy พร้อมบังคับ `response_format: json_object` |
| **10** | `N4: Code: Normalize` | `n8n-nodes-base.code` | ล้างข้อมูล: แปลง Tax ID 13 หลัก, แปลงปี พ.ศ. เป็น ค.ศ., ปรับ Standard UOM, ผูก `doc_id` จริง |
| **11** | `N5: Code: STEP 1 Rules` | `n8n-nodes-base.code` | ประเมินกฎบริสุทธิ์: V-01 (ครบถ้วน), V-02 (เลขคณิตแถว), V-03 (เลขคณิตรวม), V-06 (ลายเซ็นผู้ส่ง/ผู้รับ) |
| **12** | `N6: IF: Has E28?` | `n8n-nodes-base.if` | ตรวจจับข้อผิดพลาดร้ายแรง E28 (Line Math) เพื่อ Bypass ไม่เรียก Oracle ตามข้อกำหนด D3 |
| **13** | `N7: Oracle MCP rcv_v01` | `n8n-nodes-base.httpRequest` | **Unified Indexed Query:** ค้นหาด้วย `Tax ID + Inv No.` (รองรับ Multi-PO และ Slash Variation) และ fallback ด้วย `PO_NUM` พร้อม JOIN `apps.financials_system_params_all` ดึง `CUSTOMER_TAX_ID` ตรงจาก EBS |
| **14** | `N7.1: Parse Oracle Receipts` | `n8n-nodes-base.code` | แปลงผลลัพธ์ CSV/JSON เป็น Array ของ Object ใบรับสินค้า พร้อมคอลัมน์ Multi-PO, Org, Location, และ `CUSTOMER_TAX_ID` |
| **15** | `N8: Code: STEP 2 (Receipts & ORG_ID)` | `n8n-nodes-base.code` | ประเมิน V-04 (สถานะใบรับ) และ V-05 (**Dynamic Oracle EBS 100%** เทียบ Customer Tax ID กับ `receipts[0].CUSTOMER_TAX_ID` และตรวจ Intercompany อัตโนมัติ) |
| **16** | `IF: Critical Receipt Issue?` | `n8n-nodes-base.if` | ตรวจจับกรณีไม่มีใบรับ (E17), ใบรับซ้ำ (E35), หรือติดเพดาน 50 แถว (Manual Review) |
| **17** | `N9: Code: STEP 3 (Line Matching Ladder)` | `n8n-nodes-base.code` | **Enhanced Matching Ladder:** จับคู่ตาม M1 Item Number -> M2 Line No -> M3 Description words |
| **18** | `N10: Code: STEP 4 Decision Matrix` | `n8n-nodes-base.code` | ประเมินผลการตัดสินสุดท้าย: Auto-pass, Review, Hold, Manual Review พร้อมกำหนดผู้รับผิดชอบงาน และประกอบโครงสร้าง JSON Table 9 (`oracle_data`, `exceptions`, `evaluations`) |
| **19** | `N11: Code: Schema Validate` | `n8n-nodes-base.code` | ตรวจสอบความถูกต้องของ JSON Table 9 Output ให้ครบถ้วนตาม Standard v6.2 |
| **20** | `N12: HTTP: POST Portal` | `n8n-nodes-base.httpRequest` | ส่งผลลัพธ์การตรวจสอบ Table 9 ไปยัง AIVA Verification Portal |
| **21** | `N13: Paperless: Update Status` | `n8n-nodes-base.code` | จัดเตรียมชุดแท็กสถานะ เช่น `aiva-autopass`, `aiva-hold`, `aiva-review` |
| **22** | `N13.1: Paperless: Add Tag to Prevent Duplicate` | `@mephistojb/n8n-nodes-paperless.paperless` | บันทึกเพิ่มแท็ก ID 12 (`check n8n`) แบบ `append_tags: true` เพื่อป้องกันการดึงซ้ำ |
| **23** | `N14: Verification & Tagging Summary` | `n8n-nodes-base.code` | สร้างสรุปผล Audit Report ปิดรอบการประมวลผลของเอกสาร |

---

## 4. โครงสร้างคำสั่ง Unified All-in-One SQL Query

```sql
SELECT DISTINCT 
    v.PO_NUM,
    v.RCV_NUM,
    v.RCV_INV_NUM,
    v.AP_INV_NUM,
    v.ITM_CODE,
    v.ITM_DESC,
    v.UOM,
    v.RCV_QTY,
    v.PO_UPRICE,
    (v.RCV_QTY * v.PO_UPRICE) as LINE_TOTAL,
    v.ORG_ID as INV_ORG_ID,
    ood.operating_unit as OU_ORG_ID,
    hou.name as OU_NAME,
    hla.postal_code as CUSTOMER_POSTAL,
    hla.location_code as CUSTOMER_LOC_CODE,
    pv.vendor_name as SUPPLIER_NAME,
    COALESCE(pv.vat_registration_num, pv.num_1099) AS SUPPLIER_TAX_ID,
    fsp.vat_registration_num AS CUSTOMER_TAX_ID
FROM apps.AH_DEV_RCV_PO_AP_MATCHING_V v
JOIN apps.po_vendors pv ON v.vendor_id = pv.vendor_id
LEFT JOIN apps.org_organization_definitions ood ON v.org_id = ood.organization_id
LEFT JOIN apps.hr_operating_units hou ON ood.operating_unit = hou.organization_id
LEFT JOIN apps.hr_all_organization_units haou ON v.org_id = haou.organization_id
LEFT JOIN apps.hr_locations_all hla ON haou.location_id = hla.location_id
LEFT JOIN apps.financials_system_params_all fsp ON ood.operating_unit = fsp.org_id
WHERE (
    -- ค้นหาผ่าน Index แบบ IN (...) เพื่อความเร็วระดับมิลลิวินาที
    (v.RCV_INV_NUM IN ('SON-2609017', 'SON2609017') OR v.AP_INV_NUM IN ('SON-2609017', 'SON2609017'))
    AND (COALESCE(pv.vat_registration_num, pv.num_1099) = '0205553019816')
)
ORDER BY v.RCV_NUM, v.ITM_CODE;
```

---

## 5. Master Data Entities (Oracle EBS Dynamic Architecture)

> 💡 **การปลดระวางไฟล์ Static (`master_data.py`):**  
> ปัจจุบันระบบเปลี่ยนผ่านสู่ **Oracle Dynamic 100%** โดยดึงข้อมูลนิติบุคคลทั้ง 40 Inventory Orgs และ 20 Operating Units ตรงจาก Oracle EBS ผ่าน `apps.financials_system_params_all` ร่วมกับ `apps.org_organization_definitions` แบบ Real-time ผ่าน `master_data_service.py` (แคชในหน่วยความจำและรีเฟรชทุก 1 ชม.) ทำให้ตัดปัญหาข้อมูลคลาดเคลื่อนจากการ Hardcode ได้อย่างสิ้นเชิง

### ตารางนิติบุคคลหลักในกลุ่มอาปิโก (จากฐานข้อมูลจริง Oracle EBS)

| Inv Org | Operating Unit | ชื่อบริษัทนิติบุคคล | เลขประจำตัวผู้เสียภาษี (Tax ID ใน EBS) | รหัสไปรษณีย์ | ที่อยู่จดทะเบียนหลัก |
|:---:|:---:|---|:---:|:---:|---|
| **101 / 102 / 103 / 104 / 222** | **101** | **บมจ. อาปิโก ไฮเทค** | **`0107545000179`** ✅ | 13160 | 99 Moo 1 Hitech Industrial Estate Banlane |
| **195 / 352** | **195** | **บจก. อาปิโก ไฮเทค ทูลลิ่ง** | **`0145548001557`** ✅ | **13160** | **99/1 Moo 1 Hitech Industrial Estate Banlane** |
| **175 / 176** | **176** | **บจก. อาปิโก ไฮเทค พาร์ท** | **`0145548001549`** ✅ | **13160** | **99/2 Moo 1 Hi-tech Industrial Estate Banlane** |
| **199 / 200** | **197** | บมจ. อาปิโก ฟอร์จจิ้ง | `0107547000354` | 20000 | 700/20 Moo 6 Amata Nakron Industrial Estate |
| **202 / 203** | **202** | บจก. อาปิโก ไอทีเอส | `0135547003157` | 13160 | 99 Moo 1 Hi-tech Industrial Estate |
| **223 / 224** | **223** | บจก. เอ แมคชั่น | `0145549002271` | 13160 | 99 Moo 1 Hi-tech Industrial Estate |
| **243 / 244** | **243** | บจก. อาปิโก มิตซุยเกะ (ประเทศไทย) | `0145549002085` | 13160 | 99 Moo 1 Hitech Industrial Estate |
| **263 / 264** | **263** | บจก. เอ อีอาร์พี | `0145553001179` | 13160 | 99 Moo 1 Hitech Industrial Estate |
| **285 / 287** | **285** | บมจ. อาปิโก พลาสติก | `0107537000131` | 10570 | 358-358/1 Moo 17 Bangplee Industrial Estate |
| **289 / 291** | **289** | บจก. อาปิโก สตรัคเจอรัล โปรดักส์ | `0205551028176` | 20000 | 700/16 Amata Nakorn Industrial Estate |
| **309 / 310** | **309** | บจก. อาปิโก อมตะ | `0105535001499` | 20160 | 700/483 AMATA NAKORN INDUSTRIAL ESTATE |
| **329 / 330** | **329** | บจก. อาปิโก ลีดเทค | `0145556001111` | 13210 | 56 Moo 9 T.Thanu A.U-Thai |
| **349 / 350** | **349** | บจก. เอ็ดชา อาปิโก ออโตโมทีฟ | `0145556001391` | 13160 | 99 Moo 1 Banlane |
| **353 / 354** | **353** | บจก. อาปิโก พรีซิชั่น | `0205557018563` | 20000 | 700/16 Moo 6 Amata Nakron Industrial Estate |
| **373 / 376** | **373** | บจก. เอเบิล มอเตอร์ส | `0135546008643` | 12120 | 14/9 MOO 14 PHAHOLYOTHIN ROAD |
| **413 / 433** | **413** | บจก. อาปิโก ไฮเทค ออโตเมชั่น | `0145563000434` | 13160 | 99 Moo 1 Ban lane |
| **453 / 454** | **453** | บจก. เอเบิล มอเตอร์ส ปากเกร็ด | `0125562036711` | 11120 | 38/83 Moo 5 Tiwanon Road |
| **473 / 474** | **473** | บจก. เอเบิล มอเตอร์ส ปทุมธานี | `0135562027568` | 12000 | 88 Moo 5 Sai Bang Bua Thong |
| **475 / 495** | **475** | บจก. อาปิโก ไบค์ | `0145553001829` | 13160 | 99 Moo 1 Hi-tech Industrial Estate |
| **535 / 536** | **535** | บจก. เอเบิล อีวี | `0135566030351` | 12120 | 14/9 Moo 14 Phaholyothin Road |
| **555 / 556** | **555** | บจก. เอ็มจี เอเบิล มอเตอร์ส | `0135564010484` | 12000 | 88 Moo 5 Bang Bua Thong |
| **596 / 615** | **596** | AAPICO AVEE SDN. BHD. | `200301017448(619868-V)` | 35900 | Lot No 17 Jalan Jelawai 1 Proton City |

---

## 6. กฎการตรวจสอบ 9 ข้อ (Validation Rules V-01 ถึง V-09)

| รหัสกฎ | ชื่อกฎการตรวจสอบ | ข้อกำหนดและการคำนวณ | Exception Code | Severity |
|:---:|---|---|:---:|:---:|
| **V-01** | Pure Document Completeness | ตรวจสอบฟิลด์จำเป็น 8 ฟิลด์ครบ และ `pages_complete == true` | **E13** | Medium |
| **V-02** | Line Math Check | ตรวจสอบ $\|(\text{qty} \times \text{unit\_price}) - \text{amount}\| \le 0.50$ | **E28** | High *(Halt)* |
| **V-03** | Document Math Check | ตรวจสอบผลรวมบรรทัดกับ Subtotal, VAT 7%, และ Grand Total | **E31 / E16** | High / Low |
| **V-04** | Oracle Receipt Active Check | ตรวจสอบการพบใบรับสินค้าใน Oracle ERP โดยต้องมีใบรับที่ active เพียง 1 ใบ | **E17 / E35** | High |
| **V-05** | Customer Entity & Tax ID Match | เทียบ Tax ID ลูกค้า 13 หลัก กับ `receipts[0].CUSTOMER_TAX_ID` จาก Oracle EBS และตรวจที่อยู่/รหัสไปรษณีย์ พร้อมตรวจ Intercompany อัตโนมัติ | **E09** | High / Med |
| **V-06** | Signatures Verification | ตรวจสอบการพบลายเซ็นผู้รับของ (Receiver) และผู้ส่งของ (Supplier) | **E26** | High / Med |
| **V-07** | Line Matching Ladder | จับคู่รายการตาม M1 Item Code -> M2 Line No -> M3 Desc และตรวจราคา | **E05 / E29 / E30 / E12** | High / Med / Low |
| **V-08** | Quantities Check | ตรวจสอบยอดวางบิลเทียบยอดรับสินค้าจริง ห้ามเกินยอดรับ | **E06 / E34** | High / Med |
| **V-09** | Total Amount Check | ตรวจสอบยอดรวมมูลค่าบิลเทียบกับยอดรวมมูลค่าใบรับสินค้าใน Oracle | **E31** | High |

---

## 7. กรณีศึกษาผลการทดสอบจริง (Live Verification Cases)


### กรณีศึกษาที่ 1: บิล Single-PO (Doc 114, PO 42050734)
* **ผู้ขาย:** SON AUTO ENGINEERING CO., LTD (`0205553019816`)
* **Invoice No:** `SON-2609017`
* **ผู้ซื้อ:** บจก. อาปิโก ไฮเทค ทูลลิ่ง (`0145548001557`, Org ID: 352)
* **ผลลัพธ์:** **Auto-pass (100% Pass, 0 Exceptions)** ทุกกฎ V-01 ถึง V-09 ผ่านเกณฑ์สมบูรณ์แบบ

### กรณีศึกษาที่ 2: บิล Multi-PO ครอบคลุม 3 POs ในบิลเดียว (Invoice SQ26/085013)
* **ผู้ขาย:** JAROONRAT PRODUCTS CO., LTD. (`0135537003456`)
* **Invoice No:** `SQ26/085013`
* **ผู้ซื้อ:** บจก. อาปิโก ไฮเทค พาร์ท (`0145548001549`, Org ID: 175, OU: 176)
* **PO ที่เกี่ยวข้อง:** 3 POs (`43026973`, `43041729`, `43043027`)
* **ผลลัพธ์:** **Auto-pass (100% Pass, 0 Exceptions)** ใน Query เดียว (ใช้เวลา < 1 วินาที)
  - Line 1: `POP3000263A` | PO 43026973 | 789.60 บาท
  - Line 2: `POP3000311A` | PO 43041729 | 4,005.20 บาท
  - Line 3: `POP3000433A` | PO 43043027 | 607.20 บาท
  - Subtotal รวม: 5,402.00 บาท | VAT 7%: 378.14 บาท | ยอดสุทธิรวม: 5,780.14 บาท (ตรงกับบิลและ AP 100%)

### กรณีศึกษาที่ 3: บิล AAPICO Hitech PCL (Doc 15, Invoice SQ26/071249)
* **ผู้ขาย:** JAROONRAT PRODUCTS CO., LTD. (`0135537003456`)
* **Invoice No:** `SQ26/071249` (Slash-variant matching: `SQ26/071249` / `SQ26071249`)
* **ผู้ซื้อ:** บมจ. อาปิโก ไฮเทค (`0107545000179`, Org ID: 103, OU: 101)
* **PO ที่เกี่ยวข้อง:** PO `41031383` (Receipt `11030062`)
* **ผลลัพธ์:** **Auto-pass (100% Pass, 0 Exceptions)** 
  - Dynamic Tax ID จาก Oracle EBS: `0107545000179` ตรงกับเลข 13 หลักบนหัวบิล
  - V-05: PASS (Matched branch 00003, OU: AH - Aapico Hitech)
  - V-07 ถึง V-09: รายการอะไหล่ตรงกับใบรับสินค้า ยอดเงินรวม 3,248.52 บาท ตรงกัน 100%

