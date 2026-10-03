# AIVA Invoice Portal — Mockup v3 (no-build)

โฟลเดอร์นี้เป็น **mockup สำหรับรีวิว UI/UX และ business rule** ของ AIVA Invoice Matching Portal
เปิดได้ทันทีจาก `file://` โดยไม่ต้อง `npm install` ไม่ต้อง build และไม่มี dependency ฝังอยู่ในโฟลเดอร์

ออกแบบต่อจาก `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html` (design token เดียวกัน)
แต่เปลี่ยน "ข้อความประกอบภาพ" ให้เป็น **พฤติกรรมจริงของ engine + contract จริงของ API**
เพื่อให้ใช้เป็นสเปกให้ทีมพัฒนา/ทีมบัญชีรับรองได้ ไม่ใช่แค่ภาพสวย

> เอกสารในไฟล์นี้มี **17 ฉบับ** (เพิ่มเคส Decimal string) · สถานะทุกใบคำนวณจากกฎที่แสดงบนหน้าจอ ไม่ใช่ใส่เลขมือ

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
├── .gitignore              ไฟล์ชั่วคราวขึ้นต้นด้วย `_` ห้าม commit
├── assets/
│   ├── style.css           design token ต่อจาก Mockup v4.4 (navy #0D274D · teal #00B5AF · Sarabun/JetBrains Mono)
│   ├── data.js             *generate ได้* master data + exception catalog as-built + กฎ V-01–V-09
│   ├── domain.js           domain reference ที่เขียนด้วยมือ (กฎ, ownership, RBAC, action + guard, mapping, ข้อขัดแย้ง)
│   ├── docs.js             ข้อมูลเอกสารสังเคราะห์ 17 ฉบับ + revision snapshot ของเอกสารหลายรอบ
│   └── app.js              all render logic (innerHTML + state ใน memory) รวมถึง guards/todo/audit chain
└── tools/
    ├── build-domain-data.py  รีเจเนอเรต assets/data.js จาก OCR service/n8n/app/core
    ├── smoke-test.js         ไล่เรนเดอร์ทุกหน้า/ทุกแท็บ/ทุกเอกสาร/ทุก action ด้วย DOM ปลอม (logic + invariant)
    └── browser-check.js      ไล่หน้าจอเดียวกันด้วย Chromium จริง (console error, คีย์ลัด, layout 390px)
```

ลำดับ `<script>` สำคัญ: `data.js → domain.js → docs.js → app.js` (ทั้งหมดเป็น classic script แชร์ global scope กัน)

รีเจเนอเรตข้อมูลตั้งต้น / รันเทสต์:

```bash
python tools/build-domain-data.py     # เขียนทับ assets/data.js จาก master_data.py + rules.py
node tools/smoke-test.js              # ต้องเห็น "✓ ผ่าน 60 การตรวจ"
node tools/browser-check.js           # ต้องเห็น "✓ ผ่าน 14 การตรวจด้วย Chromium จริง" (ข้ามอัตโนมัติถ้าไม่มี playwright)
node --check assets/app.js            # ตรวจ syntax อย่างเดียว
```

`browser-check.js` หา playwright จาก `$PLAYWRIGHT_PATH` หรือ `Web portal/invoice-web-9054076/frontend/node_modules`
เปิดตรวจตอนเสิร์ฟผ่าน http ก็ได้: `BASE_URL=http://127.0.0.1:5190/ node tools/browser-check.js`

---

## 3) สิ่งที่ mockup นี้ทำจริง (ไม่ใช่ภาพนิ่ง)

- **งานเข้าคิว (queue)**: ค้นหา, กรองด้วย KPI card 7 ใบ (รวม **งานของฉัน**), กรองด้วย company chip, เรียงตามความเร่งด่วน / ยอดเงิน / วันที่, แบ่งหน้าละ 8 รายการ และแสดง **“งานที่ต้องทำ” ทุกแถว**
- **การ์ด “ขั้นตอนถัดไป”** (task-first): งานนี้คืออะไร · ใครถือ · ต้องดูหลักฐานหน้าไหน · action ไหนทำได้ และ **อีก N ปุ่มกดไม่ได้เพราะอะไร** (พับดูได้)
- **หน้ารายละเอียดเอกสาร** 6 แท็บ: สรุป · รายการสินค้า/3-way · กฎ 9 ข้อ · หลักฐาน/ลายเซ็น · ประวัติ & outbox · JSON snapshot
- **strips สเต็ป** การตรวจ (extract → ตรวจ field → จัดกลุ่ม/ตรวจซ้ำ → search PO → match → portal review) พร้อมสถานะต่อสเต็ป
- **การเทียบ 3 ทาง** รายบรรทัด พร้อม Method ที่ engine ใช้จริง (`M1` item code / `M2` line no / `M3` description / `M4` fallback → M4 = น่าสงสัย ต้องให้คนดู)
- **Viewer จำลอง PDF/DMS**: thumbnail รายหน้า, highlight ตำแหน่งหลักฐาน, กล่องลายเซ็น (ขาด = เส้นประแดง), watermark "DOCUMENT VIEW" ที่มุมขวาทุกหน้า, แถบเครื่องมือ (ย่อ/ขยาย, เล่มหน้าด้วยปุ่มและคีย์ `←` `→`), ปุ่มดาวน์โหลด/พิมพ์ **ถูกปิดพร้อมเหตุผลนโยบาย** และทุกครั้งที่เปิดเอกสารจะบันทึก *access event* ลง audit
- **Action จริงตาม workflow**: `explain` `resubmit` `rerun` `return` `hold` `release_hold` `reject` `confirm` `post` — ทุกครั้งต้องเลือก `reason_code` (`REASON_CODES` 12 รหัสจาก workflow contract) + ใส่ note เมื่อ rule บังคับ
- **Guard ชุดเดียวใช้ทั้งหน้าจอ** (`guards(doc)`): ปุ่มที่กดไม่ได้ต้องมีเหตุผลเสมอ — สิทธิ์ไม่พอ, 403 ตามขอบเขต, กำลัง On Hold, คนถือ hold คนละฝั่ง, กำลังดู snapshot เก่า, เอกสารปิดสถานะ, ยังไม่มี Receiver, มีคำขอค้างใน outbox, ผลตรวจเป็น Hold/Manual Review, High ฝั่งผู้ใช้ยังไม่ปิด, **separation of duties** (ผู้แนบเอกสารตัดสินเองไม่ได้) และ `post` ที่ปิดไว้จนกว่าจะมี AP acknowledgement contract
- **Optimistic concurrency + idempotency**: ฟอร์มทุกฟอร์มมี `expected_workflow_version`, `expected_document_revision` และ `Idempotency-Key` → version เก่า = `409 Conflict`, key เดิม + payload เดิม = replay ผลเดิม, key เดิม + payload ต่าง = `422`; ทุกกรณี **ไม่แก้สถานะ** และบันทึกลง audit
- **Action outbox จำลอง**: `resubmit`/`rerun` ไม่ได้แปลว่าสำเร็จ → สร้าง outbox `waiting_revision`, กันการสั่งซ้ำ และปิดคำขอเองเมื่อ revision ใหม่เข้ามา
- **Revision snapshot**: เลือกดู revision เก่าได้จาก dropdown → banner "กำลังดู snapshot · อ่านอย่างเดียว", PDF/JSON/ผลตรวจ **ตรงรุ่นกัน**, ทำ action ไม่ได้, กลับ revision ล่าสุดได้
- **RBAC**: 7 ผู้ใช้ × 4 บทบาท (EU/ACC/APR/ADM) × ขอบเขต (company / receiver) — nav เองก็ถูกปิดตามสิทธิ์ (ADM ไม่มีคิว, EU เห็น "งานของฉัน") + ตารางสิทธิ์, ตาราง Portal ↔ Entra ID ↔ Oracle `RECEIVER` และตาราง “Mockup ↔ Production gap”
- **Audit แบบ tamper-evident**: ทุกบันทึกมี `prev_hash`/`hash` จำลอง hash chain, ปุ่ม *ตรวจความต่อเนื่อง* + *จำลองการแก้ไขบันทึก* (chain ขาด → กู้คืนได้), ค้นหา, กรอง action, แบ่งหน้า, ไฮไลต์ 409, คลิกบันทึกลับไปยังเอกสาร และ **ส่งออก CSV พร้อมคอลัมน์ hash**
- **Decimal ↔ float**: เอกสาร `AIVA-2609-0017` เก็บยอดเป็น **string ตรงตาม snapshot** (`600 × 30.666667 = 18,400.0002`) เพื่อโชว์ว่า portal ห้ามแปลงเป็น float แล้วทำให้ผลต่างหาย
- **JSON snapshot**: คัดลอกได้ (ต้องเปิดผ่าน `http://`) ตรงตามโครง Table 9 ที่ portal รับเข้า (`schema_version 1.0`, `document_id`, `extraction_run_id`, `lines`, `rules`, `exceptions`)
- **Keyboard/Mouse**: `Esc` และคลิกพื้นหลังปิด modal, `←/→` เล่มหน้าใน viewer, `Tab`/`←→` เลื่อนแท็บ

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
| 0001 | ผ่านครบ 9 กฎ | Auto-pass · ทุกบรรทัดจับคู่ด้วย `M1` |
| 0002 | ยอดและจำนวนตรงใบรับทุกประการ แต่ขาดลายเซ็นผู้รับของ | Hold `E26` · ผู้รับผิดชอบ = ฝั่ง user (บัญชียืนยันข้ามไม่ได้) |
| 0003 | วางบิลเกินจำนวนรับจริง | Hold `E06 E31` · `E06` เป็นงานของ Receiver |
| 0004 | ORG ว่าง + ไม่มีใบรับ + `E28` Critical (bypass ไม่เรียก ERP) | Hold `E28` โผล่ในคิวฝ่ายบัญชีพร้อมป้าย “map บริษัทไม่ได้” (ไม่หายจากทุกคิว) |
| 0005 | UOM ไม่ตรง (Medium) + ยอดรวมไม่ตรง (Low) | Review `E12 E29` · จับคู่แบบ `M3` (description) |
| 0006 | ไม่พบการรับของใน ERP และเอกสารไม่มี Receiver | Hold `E17` · งานตกที่ฝ่ายบัญชี และ `resubmit` ถูกปิด → ต้องใช้ `rerun` |
| 0007 | ORG `223` ไม่มีใน master 48 แถว (master ไม่พร้อม) | Manual Review แบบ fail-safe ห้าม Auto-pass + ยังไม่ map |
| 0008 / 0009 | ผู้ขาย + เลขที่ใบแจ้งหนี้ซ้ำกัน | ป้าย Duplicate อ้างถึงกันและกัน · 0009 ถูกปฏิเสธแล้ว → action อื่นถูกบล็อกทั้งหมด |
| 0010 | ไม่มีเลข PO, Tax ID ผู้ขายว่าง, จับคู่ด้วย line no | Review `E13 E29` · `E13` เป็น code ที่ engine มอบให้ user |
| 0011 | หลายใบรับ + วางบิลเกิน (ORG `556` ที่ master map แล้ว) | Hold `E35 E06 E31` · งานผสมสองฝั่ง (`E35`/`E06` = user, `E31` = บัญชี) |
| 0012 | `E16` Low → ยัง Auto-pass แต่ผู้แนบเอกสาร (`PANIDA.R`) เป็นบัญชีที่มีสิทธิ์ยืนยันเอง | ปุ่มยืนยันปิดด้วยเหตุผล **separation of duties** · อธิบายได้ว่าใครควรกดแทน |
| 0013 | เอกสาร 2 revision (รอบ 1 `E30` จับคู่ไม่ได้ → รอบ 2 `E34`) และกำลัง On Hold | เลือกดู snapshot เก่าได้แบบอ่านอย่างเดียว · ทำ action จากของเก่าไม่ได้ · ถอนพักได้ถูกฝั่ง/ADM เท่านั้น |
| 0014 | ตัดสินด้วย fallback `M4` + ไฟล์ 9 หน้า (ชนขีดจำกัด Vision 8 หน้า) | Manual Review · ต้องมี one-time human approval |
| 0015 | ส่งตรวจซ้ำ (rerun) แล้วรอ snapshot รอบใหม่ | outbox `waiting_revision` + กันการสั่งซ้ำ + revision selector ตรงรุ่น JSON/PDF |
| 0016 | pipeline ล้มก่อนออก Table 9 (LiteLLM timeout) | fail-safe Manual Review ห้าม Auto-pass |
| 0017 | ยอดเป็น Decimal string (`600 × 30.666667 = 18,400.0002`) | แสดงเลขตรงตาม snapshot + ป้าย “Decimal string” · `E16`/`E29` Low ยัง Auto-pass |

---

## 7) ข้อจำกัดของ mockup (ต้องบอกผู้ชมให้ครบ)

- "Mockup only": ทุกอย่างเป็น in-memory — reload แล้วกลับไปข้อมูลตั้งต้น ไม่มี backend ไม่มีการตรวจสอบสิทธิ์จริง (nav ที่ถูกปิด = ชั้น UI เท่านั้น ของจริงต้อง 403 ที่ server)
- hash chain ของ audit เป็น **การจำลอง** (hash สั้น 8 ตัวอักษร, คำนวณในเบราว์เซอร์) ไว้สาธิตว่า tamper-evident ทำงานยังไง — ของจริงต้อง append-only store + hash ยืนยันจากภายนอก
- ปุ่ม "แนบ PDF" / การอัปโหลด / portal import ยังไม่มีจริง → production ต้องใช้ `multipart` + ตรวจ MIME/PDF จริง
- ผู้ใช้ portal (อีเมล, Entra ID UPN, ชื่อบุคลากร) เป็นข้อมูลสมมติ — ของจริงต้อง sync จาก Entra ID ↔ Oracle `RECEIVER`- ตัวเลข KPI / จำนวนเอกสารในคิว คำนวณจากข้อมูล 17 ฉบับนี้เท่านั้น ไม่ใช่ตัวเลขจาก production
- ไม่แสดง Workday SLA / aging จริง (mockup v4.4 มี `SLA.md` ที่ยังไม่ได้ map กับ code ใด ๆ)
- `post` (ส่งเข้า AP) และดาวน์โหลด/พิมพ์ PDF ถูก **ปิดไว้พร้อมเหตุผล** — ห้ามแกล้งทำให้กดได้เพื่อให้ดูครบ เพราะของจริงต้องมີ AP acknowledgement contract / signed URL จากปลายทาง
- separation of duties, ล็อกฝั่งบัญชีตอน High exception ฝั่งผู้ใช้ยังไม่ปิด และสิทธิ์ถอนพัก ยังเป็นการจำลองตามกติกาที่เขียนไว้ในโค้ด — production ต้องมี four-eyes approval + audit ที่ปลอมแปลงไม่ได้
- ถ้าจะเอาไปต่อกับ FastAPI จริง: แทนที่การอ่าน `DOCS` ใน `app.js` ด้วยการเรียก `GET /api/portal/v1/documents`,
  `/documents/{id}`, `/kpis`, `/workflow/actions`, `/workflow/outbox` (โครงตรงกับ `invoice-webV2/src/api/endpoints.ts`)

---

## 8) สถานะงานนี้

- สร้างใหม่ทั้งโฟลเดอร์ ไม่ได้แก้ `invoice-webV2`, `invoice-web1`, `invoice-web-9054076`, OCR engine หรือ API ใด ๆ
- รอบที่ 2 (ต.ค. 3 บ่าย): ปิดช่องว่างที่ตรวจจาก log ของ portal เดิม — action parity ครบ 9 action + guard บอกเหตุผล, การ์ดขั้นตอนถัดไป, separation of duties + ล็อกฝาย, revision snapshot read-only, คิว (งานที่ต้องทำ/sort/pagination/งานของฉัน), audit hash chain + CSV + deep link, viewer toolbar/access event/nโยบายดาวน์โหลด, เคส Decimal string, `release_hold` ที่หายไป และบั๊ก `explain` ทำให้ workflow เป็น `undefined`
- ผ่าน `node --check` ทั้ง 5 สคริปต์, `node tools/smoke-test.js` (60 การตรวจ) และ `node tools/browser-check.js` (14 การตรวจด้วย Chromium จริง: 7 ผู้ใช้ ×(nav ที่เปิดให้) + 17 ฉบับ × 6 แท็บ, console error 0, 390px overflow 0px)
- ยังไม่ได้ deploy และไม่ได้ต่อ backend จริง — ดูหัวข้อ 7 ก่อนนำไปสาธิต
