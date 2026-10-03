# AIVA Invoice Portal — Mockup v3 (no-build)

โฟลเดอร์นี้เป็น **mockup สำหรับรีวิว UI/UX และ business rule** ของ AIVA Invoice Matching Portal
เปิดได้ทันทีจาก `file://` โดยไม่ต้อง `npm install` ไม่ต้อง build และไม่มี dependency ฝังอยู่ในโฟลเดอร์

ออกแบบต่อจาก `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html` (design token เดียวกัน)
แต่เปลี่ยน "ข้อความประกอบภาพ" ให้เป็น **พฤติกรรมจริงของ engine + contract จริงของ API**
เพื่อให้ใช้เป็นสเปกให้ทีมพัฒนา/ทีมบัญชีรับรองได้ ไม่ใช่แค่ภาพสวย

> ทุกเลขเอกสาร เลขใบแจ้งหนี้ ยอดเงิน ชื่อผู้ขาย และใบรับในไฟล์นี้คือ **ข้อมูลสังเคราะห์ (synthetic)**
> ส่วนที่ “มาจากของจริง” มีตาราง Provenance ด้านล่างและในหน้า `มาตรฐานและรหัส` ของ mockup

---

## 1) วิธีเปิด

| วิธี | ทำ | เหมาะกับ |
|---|---|---|
| เปิดไฟล์ตรง | ดับเบิลคลิก `index.html` | รีวิวทั่วไป (ปุ่มคัดลอก JSON จะถูกบล็อก เพราะ browser จำกัด Clipboard API บน `file://`) |
| เปิดผ่าน server | `python -m http.server 5190` จากโฟลเดอร์นี้ แล้วเข้า `http://127.0.0.1:5190/` | ต้องใช้ปุ่มคัดลอก JSON + รีวิวแบบแชร์ลิงก์ในวง LAN |

สลับผู้ใช้ได้ที่ dropdown มุมขวาบน — ขอบเขตคิวจะเปลี่ยนตามสิทธิ์ทันที (นี่คือส่วนสำคัญที่สุดของ mockup นี้)

---

## 2) โครงสร้างไฟล์

```
invoice-webv3/
├── index.html              โครงหน้า + <script> 4 ไฟล์ตามลำดับ (ไม่ใช้ module/bundler)
├── README.md               ไฟล์นี้
├── assets/
│   ├── style.css           design token ต่อจาก Mockup v4.4 (navy #0D274D · teal #00B5AF · Sarabun/JetBrains Mono)
│   ├── data.js             *generate ได้* master data + exception catalog as-built + กฎ V-01–V-09
│   ├── domain.js           domain reference ที่เขียนด้วยมือ (กฎ, ownership, RBAC, mapping, ข้อขัดแย้ง)
│   ├── docs.js             ข้อมูลเอกสารสังเคราะห์ 16 ฉบับ (15 เคส usage)
│   └── app.js              all render logic (innerHTML + state ใน memory)
└── tools/
    ├── build-domain-data.py  รีเจเนอเรต assets/data.js จาก OCR service/n8n/app/core
    └── smoke-test.js         ไล่เรนเดอร์ทุกหน้า/ทุกแท็บ/ทุกเอกสาร/ทุก action ด้วย DOM ปลอม
```

ลำดับ `<script>` สำคัญ: `data.js → domain.js → docs.js → app.js` (ทั้งหมดเป็น classic script แชร์ global scope กัน)

รีเจเนอเรตข้อมูลตั้งต้น / รันเทสต์:

```bash
python tools/build-domain-data.py     # เขียนทับ assets/data.js จาก master_data.py + rules.py
node tools/smoke-test.js              # ต้องเห็น "✓ ผ่าน 46 การตรวจ"
node --check assets/app.js            # ตรวจ syntax อย่างเดียว
```

---

## 3) สิ่งที่ mockup นี้ทำจริง (ไม่ใช่ภาพนิ่ง)

- **งานเข้าคิว (queue)**: ค้นหา, กรองด้วย KPI card, กรองด้วย company chip, เรียงตามความเร่งด่วน
- **หน้ารายละเอียดเอกสาร** 6 แท็บ: สรุป · รายการสินค้า/3-way · กฎ 9 ข้อ · หลักฐาน/ลายเซ็น · ประวัติ & outbox · JSON snapshot
- **strips สเต็ป** การตรวจ (extract → ตรวจ field → จัดกลุ่ม/ตรวจซ้ำ → search PO → match → portal review) พร้อมสถานะต่อสเต็ป
- **การเทียบ 3 ทาง** รายบรรทัด พร้อม Method ที่ engine ใช้จริง (`M1` item code / `M2` line no / `M3` description / `M4` fallback → M4 = น่าสงสัย ต้องให้คนดู)
- **Viewer จำลอง PDF/DMS**: thumbnail รายหน้า, highlight ตำแหน่งหลักฐาน, กล่องลายเซ็น (ขาด = เส้นประแดง), watermark "DOCUMENT VIEW" ที่มุมขวาทุกหน้า
- **Action จริงตาม workflow**: `confirm` `return_for_correction` `reject` `hold` `release_hold` `rerun` — ทุกครั้งต้องเลือก `reason_code` (อ้าง `REASON_CODES` 10 รหัสจาก workflow contract) + ใส่ note เมื่อ rule บังคับ
- **Optimistic concurrency จำลอง**: ฟอร์มทุกฟอร์มมี `expected_workflow_version` + `Idempotency-Key` สร้างอัตโนมัติ ถ้ากรอก version ไม่ตรง → บันทึก `409 Conflict` ใน audit และ **ไม่แก้สถานะ** (ลองกรอกเลขผิดดู)
- **Action outbox จำลอง**: `rerun` ไม่ได้แปลว่าสำเร็จ → สร้าง outbox `waiting_revision` และกันการสั่งซ้ำ (ปุ่ม rerun จะ disabled)
- **RBAC**: 6 ผู้ใช้ × 5 บทบาท × ขอบเขต (company / receiver) + ตารางสิทธิ์ 15 รายการ + ตาราง “Mockup ↔ Production gap”
- **Audit**: ค้นหา, กรอง action, แบ่งหน้า, ไฮไลต์รายการที่เป็น 409
- **JSON snapshot**: คัดลอกได้ (ต้องเปิดผ่าน `http://`) ตรงตามโครง Table 9 ที่ portal รับเข้า (`schema_version 1.0`, `document_id`, `extraction_run_id`, `lines`, `rules`, `exceptions`)
- **Keyboard/Mouse**: `Esc` และคลิกพื้นหลังปิด modal

---

## 4) กติกาที่ฝังไว้ (as-built ตาม `OCR service/n8n/app/core/rules.py` + `master_data.py`)

ลำดับการตัดสิน (ห้ามสลับ — มีผลต่อ "ใบไหนวิ่งอัตโนมัติ"):

```
1) rule ไหน result = manual_review  → Manual Review
2) มี exception ระดับ High           → Hold
3) มี exception ระดับ Medium         → Review
4) อย่างอื่นรวม Low                   → Auto-pass
```

การส่งต่องาน: `E06 E12 E13 E17 E26 E34 E35` = หน้าที่ **user/ผู้รับของ** · รหัสอื่น = **ฝ่ายบัญชี**
(ถ้า High อยู่ในความรับผิดชอบ user → Lock + Lock ฝั่งบัญชีจนกว่า user จะยืนยัน)

กฎ `V-01`–`V-09` แสดงพร้อม tolerance จริง: `0.01` สำหรับเลขคณิต/ยอดรวม, `±5%` สำหรับราคาต่อหน่วย,
tolerance ไม่ใช่ใบผ่านฟรี — เกิน tolerance เมื่อไหร่ต้องมี exception + คนรับรอง

---

## 5) Provenance — อะไรของจริง อะไรสังเคราะห์

| ส่วน | ที่มา | สถานะ |
|---|---|---|
| นิติบุคคล 48 แถว (ORG/TIN/ชื่อบริษัท) | `OCR service/n8n/app/core/master_data.py` ผ่าน `tools/build-domain-data.py` | **ของจริง** (Oracle master snapshot) |
| ขอบเขตสิทธิ์/หน้าที่ตาม role | `docs/matching-rules-standard-v6.2.md` §8 + `.agents/skills/aiva-invoice-core/references/core-domain.md` | **ของจริง** (นโยบายที่เขียนไว้) |
| พฤติกรรม engine: 9 กฎ, decision order, severity, M1–M4, fail-safe | `OCR service/n8n/app/core/rules.py` (`decide()` / `owner_of()` / `match_lines()`) | **ของจริง** (as-built) |
| exception catalog 15 รหัสที่ engine มีอยู่ (`E05…E35`) | `rules.py` | **ของจริง** |
| exception catalog 22 รหัสในเอกสาร + ผัง mapping ↔ as-built | `docs/matching-rules-standard-v6.2.md` §5 | **ของจริงแต่ขัดกับ as-built** → แสดงเป็นคำเตือน ไม่เงียบ |
| โครง field / workflow / reason code / 409 / idempotency / outbox | `Web portal/invoice-web-9054076/docs/04-receiving-api.md` | **ของจริง** (contract) |
| เลย์เอาต์, KPI 6 ใบ, company chip, PDF viewer, watermark | `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html` | **หน้าตาตาม v4.4** (พฤติกรรมใน mockup นี้เป็นแบบเทียม) |
| เลขเอกสาร DMS/DMS ext, ใบแจ้งหนี้, PO, Release, ใบรับ, ยอดเงิน, ชื่อผู้ขาย, ผู้ใช้ portal, รายชื่อบุคลากร | รวมกับโครงจาก `invoice-webV2/src/data/mockInvoices.ts` | **สังเคราะห์ 100%** |

### ข้อขัดแย้งจริงที่ mockup นี้ชี้ไว้ (ห้ามแก้ด้วยการ “เดาแทน”)

- Tax ID `0107545000179` ที่ Mockup v4.4 ใช้กับ AH **ไม่มีใน master 48 แถว** · AH ตัวจริงคือ `0107545000213`
- ORG `222` (mockup v4.4) และ ORG `196` **ไม่มีใน master 48 แถว** → ระบบต้อง fail-safe เป็น Manual Review ไม่ใช่เดาบริษัท
- ORG `556` v4.4 บอกว่า "ไม่รู้จัก" แต่ master map ให้เป็น เอ็มจี เอเบิล มอเตอร์ส (`0135564010484`) → ถ้า production ยังขึ้นไม่รู้จัก = master ล้าหลัง
- เอกสารที่ยัง map บริษัทไม่ได้ → v3 ให้ฝ่ายบัญชีเห็นพร้อมป้ายเตือน (v4.4 ไม่พูดถึงขั้นตอนนี้)
- `E13` มี 2 ความหมาย (docs ว่า "PO ไม่ตรง" / skill ว่า "Release ไม่ตรง"), `E34` ก็ซ้ำ 2 ความหมาย → ต้องเลือก source of truth
- Portal จำกัด PDF ที่ 100MB/20 หน้า แต่ Vision extractor ตัดที่ 2000KB base64/8 หน้า → เอกสาร 9–20 หน้าจะ "อัปโหลดได้แต่ถูกตัด"
- Python `Decimal` (portal) ↔ JSON float (receiving contract) → ต้อง normalize ก่อนเทียบทศนิยม

---

## 6) เคสที่ออกแบบมาให้ได้กดดู

| เลขเอกสาร | เคส | ผลที่ควรเห็น |
|---|---|---|
| 0001 | ผ่านครบ 9 กฎ | Auto-pass · ทุกบรรทัด M1 |
| 0002 | ขาดลายเซ็นผู้รับของ | Hold `E26` · ผู้รับผิดชอบ = user |
| 0003 | วางบิลเกินจำนวนรับจริง | Hold `E06 E31` |
| 0004 | ORG/Tax ID ว่าง → map บริษัทไม่ได้ | Manual Review + ไม่ปรากฏในคิว receiver รายคน |
| 0005 | เลขคณิตบรรทัดไม่ตรง (bypass oracle math) | Review + ยอดรวมไม่ตรง |
| 0006 | ขาดใบรับ | Hold `E12` |
| 0007 | ORG ไม่มีใน master | Manual Review `E16` + ยังไม่ map |
| 0008 / 0009 | ใบซ้ำ | ป้าย Duplicate อ้างถึงกันและกัน |
| 0010 | UOM ไม่ตรง / ราคาต่าง / หลายใบรับ | Review + จับคู่แบบ M3 |
| 0011 | ORG มีใน master แต่ master ล้าหลัง | Hold + เทียบกับ master จริง |
| 0012 | ราคาสั่งเปลี่ยนหลังอนุมัติ | Manual Review `E13` |
| 0013 | ถูก hold ไว้แล้วเพิ่งปล่อย hold | ป้าย On Hold + ประวัติเดิม |
| 0014 | ตัดสินด้วย fallback M4 | Manual Review `E17` |
| 0015 | เอกสาร revision (round 2) | เทียบกับ round แรก + outbox |
| 0016 | pipeline ล้ม / OCR ไม่ครบ | fail-safe ห้าม Auto-pass |

---

## 7) ข้อจำกัดของ mockup (ต้องบอกผู้ชมให้ครบ)

- "Mockup only": ทุกอย่างเป็น in-memory — reload แล้วกลับไปข้อมูลตั้งต้น ไม่มี backend ไม่มีการตรวจสอบสิทธิ์จริง
- ปุ่ม "แนบ PDF" / การอัปโหลด / portal import ยังไม่มีจริง → production ต้องใช้ `multipart` + ตรวจ MIME/PDF จริง
- ผู้ใช้ portal (อีเมล, Entra ID UPN, ชื่อบุคลากร) เป็นข้อมูลสมมติ — ของจริงต้อง sync จาก Entra ID ↔ Oracle `RECEIVER`- ตัวเลข KPI / จำนวนเอกสารในคิว คำนวณจากข้อมูล 16 ฉบับนี้เท่านั้น ไม่ใช่ตัวเลขจาก production
- ไม่แสดง Workday SLA / aging จริง (mockup v4.4 มี `SLA.md` ที่ยังไม่ได้ map กับ code ใด ๆ)
- ถ้าจะเอาไปต่อกับ FastAPI จริง: แทนที่การอ่าน `DOCS` ใน `app.js` ด้วยการเรียก `GET /api/portal/v1/documents`,
  `/documents/{id}`, `/kpis`, `/workflow/actions`, `/workflow/outbox` (โครงตรงกับ `invoice-webV2/src/api/endpoints.ts`)

---

## 8) สถานะงานนี้

- สร้างใหม่ทั้งโฟลเดอร์ ไม่ได้แก้ `invoice-webV2`, `invoice-web1`, `invoice-web-9054076`, OCR engine หรือ API ใด ๆ
- ผ่าน `node --check` ทั้ง 4 สคริปต์ และ `node tools/smoke-test.js` (46 การตรวจ)
- **ยังไม่ได้ commit / push / deploy** และไม่ได้ต่อ backend จริง
