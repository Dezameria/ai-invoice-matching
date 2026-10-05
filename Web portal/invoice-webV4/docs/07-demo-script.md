# 07 · บทเดโม + ทะเบียนข้อมูลตัวอย่าง

เปิด portal: `python tools/serve.py --open` → `http://127.0.0.1:8080/index.html`
ผู้ใช้เริ่มต้นคือ **u6 SOMCHAI.P (APR)** — สลับผู้ใช้ได้จาก topbar ทุกเวลา (เก็บ audit `USER_SWITCH`)

ก่อนเริ่มรอบใหม่ให้กด **รีเซ็ตเดโม** ที่แดชบอร์ด (ล้าง overlay ทั้งหมด)

## ฉากที่ 1 · ผลบนจอคือผลของ engine ไม่ใช่ของ portal

1. เปิด `#/master` → ตาราง tolerance + catalog 9 กฎ (ช่อง "as-built")
2. เปิด `#/doc/AIVA-2609-0017` (ทศนิยม 6 ตำแหน่ง) → การ์ด **ยอดเงิน**
   บรรทัด "ผลต่างสูงสุดรายบรรทัด" แสดง `0.0000` และ note ระบุ `600 × 30.666667 = 18400.0002`
3. เปิด JSON ดิบ (ปุ่มดู snapshot) → `amount: "18400.0002"` เป็น string ทุกตัว
   **จุดขาย:** portal ไม่คิดเลขเอง — ตัวเลขที่เห็น copy มาจาก snapshot ทั้งหมด

## ฉากที่ 2 · Separation of duties

1. as `SOMCHAI.P (APR)` เปิด `AIVA-2609-0001` (Auto-pass, `uploadedBy = SOMCHAI.P`)
   → ปุ่ม **ยืนยันเอกสาร** กดไม่ได้ และ toast บอกเหตุผล `sod`
2. สลับเป็น `PANIDA.R (ACC)` → ปุ่มยืนยันกดไม่ได้ด้วยเหตุผล `role`
3. สลับเป็น `SOMCHAI.P` แล้วเปิด `AIVA-2609-0012` (Auto-pass, `uploadedBy = PANIDA.R`)
   → กรอกหมายเหตุแล้ว **ยืนยัน** สำเร็จ · workflow → `CONFIRMED` · version +1 · audit เพิ่ม 1 บรรทัด
4. ทดสอบ optimistic version: เปิดเอกสาร 2 แท็บ สลับผู้ใช้/กด action ในแท็บ A แล้วไปกดในแท็บ B
   → `version-conflict` (ระบบไม่ให้เขียนทับงานของคนอื่น)

## ฉากที่ 3 · `post` ปิดตายอย่างมีเหตุผล

`AIVA-2609-0021` (seed `CONFIRMED`) → ปุ่ม **ส่งตั้งหนี้ที่ AP** แสดงแต่ถูกบล็อกด้วย
guard `ap-contract` (ยังไม่ Posting Gateway contract) — ไม่ลบปุ่มออก เพื่อให้เห็นเจตนาของนโยบาย

## ฉากที่ 4 · หลักฐาน (PDF) — metadata เท่านั้น

| เอกสาร | สถานะหลักฐาน | แสดงผล |
|--------|----------------|----------|
| `AIVA-2609-0004` | **missing** (fixture ตั้ง `pdf: null`) | alert "ไม่มีหลักฐาน" + บล็อก confirm |
| `AIVA-2609-0018` | **stale** (PDF เป็นของ r1 แต่ revision ล่าสุดคือ r2) | ป้าย "หลักฐานเก่า" + บล็อก confirm |
| `AIVA-2609-0013` | current ทั้ง r1/r2 | ดูแท็บ revision เก่าแล้ว alert หาย (โหมด immutable) |

กด **แนบ PDF จำลอง** ใน `AIVA-2609-0004` → สถานะกลายเป็น current, alert หาย, audit `PDF_ATTACHED`
(ไม่มีการเก็บไฟล์จริง — watermark "ข้อมูลสาธิต" ยังอยู่)

## ฉากที่ 5 · outbox: portal สั่ง pipeline ไม่ได้

1. `AIVA-2609-0015` (seed `RESUBMITTED`, outbox 1 event, retry 3 ครั้ง) → panel outbox แสดงงานค้าง
2. กด **ส่งรุ่นค้าง (demo)** → snapshot r2 เข้าทาง `ingest()` จริง: validate → ปิด outbox →
   workflow กลับ `PENDING_REVIEW` → revision ใหม่โผล่ในแท็บ
3. กลับไปดู audit: มี `OUTBOX` และ `INGEST` ต่อ nhau อธิบายได้ครบว่าใครทำอะไร

## ฉากที่ 6 · contract enforcement จริงที่ขอบเขต

`#/doc/AIVA-2609-0012` → **ทดสอบ ingestion ด้วย JSON** → วาง JSON แล้วกดตรวจ

| สิ่งที่ลอง | ผล |
|------------|-----|
| `schema_version: "0.9"` | ปฏิเสธทั้งก้อน + audit `INGEST_REJECTED` |
| `sub_total: 1000` (number) | ปฏิเสธ "ต้องเป็น decimal string" |
| `vat: "70.1234567"` | ปฏิเสธ "ทศนิยมเกิน 6 ตำแหน่ง" |
| `event_id` ซ้ำกับของเดิม | ปฏิเสธ "event_id ซ้ำ" |
| `revision` เท่าเดิม/ย้อนหลัง | ปฏิเสธ "revision ต้องเพิ่มขึ้น" |
| JSON ถูก contract | รับเข้า overlay, workflow กลับ `PENDING_REVIEW`, ปิด outbox, audit `INGEST` |

## ฉากที่ 7 · "ไม่ได้ตรวจ" ต้องไม่กลายเป็น "ผ่าน"

- `AIVA-2609-0004` (E28 bypass) → ตารางกฎแสดง V-04/05/07/08/09 เป็น `not_evaluated` (เทา) ไม่ใช่ PASS
  และมีการ์ด bypass บอกว่าไม่เรียก Oracle เพราะอะไร
- `AIVA-2609-0020` (hand-authored, ส่งมาแค่ V-01–V-05) → การ์ด "กฎที่ยังไม่มีข้อมูล" + บล็อก confirm
  และ badge ว่า snapshot นี้คนเขียนมือ (`hand_authored`)
- `AIVA-2609-0016` (pipeline ล่มก่อนเขียน Table 9) → `Manual Review` + warning 3 รายการเรื่องฟิลด์ invoice ว่าง

## ฉากที่ 8 · map บริษัทไม่ได้ = เตือน ไม่ใช่หาย

1. as `PANIDA.R (ACC)` เปิด `AIVA-2609-0004` / `0007` → คอลัมน์บริษัทขึ้น `UNMAPPED` + เหตุผล
   (ORG ไม่มีใน master / สถานะไม่ใช่ ACTIVE / Tax ID ว่าง)
2. แดชบอร์ด → การ์ดประเด็นข้อมูล กด chip **บริษัท** → คิวกรองเหลือเฉพาะเอกสารที่มีปัญหา
3. ยืนยันว่าไม่มีเอกสารใดหายไปจากคิวแม้ map ไม่ได้ (นโยบายที่ตั้งใจ)

## ฉากที่ 9 · สิทธิ์และขอบเขต

| ผู้ใช้ | ที่เห็นต่างกัน |
|--------|----------------|
| `SOMSAK.J (EU, AH)` | เห็นเฉพาะ AH + KPI "งานของฉัน" + คิวกรอง `mine` ได้ |
| `THANAKORN.M (EU, AM/MGP)` | เห็นคนละชุดเอกสาร คนละบริษัท |
| `PANIDA.R (ACC)` | เห็น 5 บริษัท แต่ no confirm/reject |
| `SOMCHAI.P (APR)` | ยืนยัน/ปฏิเสธได้ (ยกเว้นงานที่ตัวเองแนบ) |
| `ADMIN (ADM)` | ไม่มีสิทธิ์ทางธุรกิจ — เดโม/reset เท่านั้น (หน้า help มีตารางสิทธิ์ × action) |

---

## ทะเบียนข้อมูลตัวอย่างทั้ง 22 ฉบับ

สถานะ **ผลตรวจ** มาจากการรัน engine mirror จริง (ไม่ใช่คนพิมพ์) · `งาน` = workflow ตั้งต้น

| id | งาน | ผลตรวจ | มอบให้ | รุ่น | จุดที่สาธิต |
|----|-----|--------|-------|:---:|--------------|
| 0001 | PENDING | Auto-pass | – | 1 | ผ่านครบ 9 กฎ, M1 ทุกบรรทัด · **SoD demo** (ผู้แนบ = APR คนปัจจุบัน) |
| 0002 | PENDING | Hold | user | 1 | ครบถ้วนแต่ขาดลายเซ็นผู้รับ → E26 High |
| 0003 | PENDING | Hold | user | 1 | วางเกินจำนวนรับ → E06 + E31 (V-09 ต่อ E31) |
| 0004 | PENDING | Hold | accounting | 1 | E28 → bypass Oracle (5 กฎ = not_evaluated) + **ไม่มีหลักฐาน PDF** + UNMAPPED |
| 0005 | PENDING | Review | user | 1 | M3 token + UOM ไม่ตรง → E12 Medium |
| 0006 | PENDING | Hold | user | 1 | ไม่พบการรับของ → E17 High |
| 0007 | PENDING | Manual Review | accounting | 1 | ORG 223 สถานะ UNKNOWN → V-05 fail-safe ห้าม Auto-pass |
| 0008 | PENDING | Auto-pass | – | 1 | คู่ออกซ้ำกับ 0009 (ผู้ขาย + เลขบิลเดียวกัน) |
| 0009 | **REJECTED** | Auto-pass | – | 1 | สำเนาซ้ำที่ถูกปฏิเสธ → terminal, action อื่นปิดทั้งหมด |
| 0010 | PENDING | Review | user | 1 | ไม่มี PO + Tax ID ผู้ขายว่าง → E13 · จับคู่ด้วย line number (M2) |
| 0011 | PENDING | Hold | user | 1 | หลายใบรับ (E35) + วางเกิน (E06) + วางบางส่วน (E34) พร้อมกัน |
| 0012 | PENDING | Auto-pass | – | 1 | E16 Low ยัง Auto-pass · **confirm-flow demo** (APR กดยืนยันได้) |
| 0013 | **ON_HOLD** | Review | user | 2 | 2 revision (แก้ลายเซ็นแล้วแต่ UOM ยังต่าง) + อยู่ระหว่าง On Hold + PDF ครบทุกรุ่น |
| 0014 | PENDING | Review | user | 1 | M4 fallback + อ่านหน้าไม่ครบ (8/9) → ต้องให้คนดู |
| 0015 | **RESUBMITTED** | Hold | user | 1 | outbox ค้าง (retry 3) + r2 ยังไม่มา → เดโม "ส่งรุ่นค้าง" |
| 0016 | PENDING | Manual Review | accounting | 1 | **hand-authored**: pipeline ล่ม (LiteLLM timeout) → fail-safe snapshot + ฟิลด์ว่าง 3 warning |
| 0017 | PENDING | Auto-pass | – | 1 | ทศนิยม 6 ตำแหน่ง Decimal string ไม่แตะ float (E16 Low) |
| 0018 | PENDING | Auto-pass | – | 2 | revision 2 มาแล้วแต่ PDF เป็น r1 → ป้าย "หลักฐานเก่า" + บล็อก confirm |
| 0019 | PENDING | Hold | user | 1 | บิลนำเข้า USD ไม่คิด VAT → as-built คาดหวัง VAT เสมอ → E31 + E13 (Tax ID ตปท.ว่าง) |
| 0020 | PENDING | Review | user | 1 | **hand-authored**: snapshot มีแค่ V-01–V-05 → แสดง "ไม่มีข้อมูล" ห้ามแก้เป็น PASS |
| 0021 | **CONFIRMED** | Auto-pass | – | 1 | ยืนยันแล้วแต่ `post` ยังปิด (สัญญา AP) |
| 0022 | PENDING | Manual Review | accounting | 1 | SQL คืน 50 แถวชน safety cap → V-04 = MANUAL ห้ามจับคู่รายบรรทัด |

ค่า `ORG_ID` ที่ fixture ใช้ (ของจริงจาก master): `101 103` AH · `352` AHT · `175` AHP · `376` AM ·
`556` MGP · `223` เอ แมคชั่น (Tax ID ว่าง, status UNKNOWN) · `222` ไม่มีใน master (ตั้งใจให้ UNMAPPED)

## เช็กลิสต์ก่อนเดโม (2 นาที)

```bash
node tools/build-fixtures.mjs --check   # exit 0 = ข้อมูลไม่ drift
node tools/smoke-test.mjs               # ผ่าน 107 รายการ
python tools/serve.py --open
```

ในเบราว์เซอร์: กดรีเซ็ตเดโม → สลับกลับเป็น `SOMCHAI.P` → เปิด `#/dashboard`
แล้วไล่ฉาก 1 → 9 (แต่ละฉาก ≤ 2 นาที)
