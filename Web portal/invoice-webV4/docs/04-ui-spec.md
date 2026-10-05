# 04 · UI spec (no-build SPA)

ทุก view เป็นฟังก์ชัน `render(ctx) → html string` โดย `ctx = { store, user, route, filters }`
`app.js` เป็นตัวเดียวที่แตะ DOM (delegated events) และ repaint ทั้งหน้าหลัง state เปลี่ยน

## routing (hash)

| route | หน้า | หมายเหตุ |
|-------|------|----------|
| `#/dashboard` | แดชบอร์ด (ค่าเริ่มต้น) | KPI + ประเด็นข้อมูล + รหัสที่พบบ่อย + งานที่ต้องเคลียร์ |
| `#/queue` | คิวงาน | ตัวกรอง/เรียง/ลิงก์เข้าดีเทล |
| `#/doc/<document_id>` | ดีเทลเอกสาร | มีแท็บเลือก revision |
| `#/master` | ข้อมูลหลัก + catalog | master 48 นิติบุคคล, exception 15 รหัส, tolerance, 9 กฎ |
| `#/audit` | บันทึกการเข้าถึง | filter ชนิด/ผู้ใช้/เอกสาร + deep link |
| `#/help` | คู่มือในแอป | หลักการ, ตารางสิทธิ์, contract, เดโม, **gap log**, checklist |

`parseHash()` รองรับ `#/doc/AIVA-2609-0013?rev=2` (พารามิเตอร์ลง hash ได้)

## องค์ประกอบทั่วไป

- **topbar**: brand + version, nav (มี badge จำนวนคิว/audit), chip `contract v1.0 · engine ไม่ได้รันที่นี่`,
  chip สุขภาพข้อมูล (แดงเมื่อมี snapshot ที่ contract ไม่ผ่าน), เลืองผู้ใช้
- **ctxbar**: ผู้ใช้ปัจจุบัน + บทบาท + ขอบเขตบริษัท, เวลา build bundle, จำนวน snapshot, engine version
  → เตือนเสมอว่า "ผลเหล่านี้ frozen มาจาก engine at <built_at>"
- ทุกตัวเลขเงิน/จำนวนใช้ font Monospace (JetBrains Mono) และ format ผ่าน `fmtMoney/fmtQty`
- ทุก badge มีสีตามโทน: `ok warn bad info muted`
- watermark "ข้อมูลสาธิต — ไม่มี PDF จริง" แสดงเมื่อ `pdf_synth` หรือ `hand_authored`

## 1) Dashboard

- KPI: จำนวนงานทั้งหมด, Auto-pass/Review/Hold/Manual Review, งานของฉัน, งานที่ blocker, หลักฐานขาด
- การ์ด "ประเด็นข้อมูลที่ต้องแก้ก่อนใช้จริง" — คลิกแล้วเด้งไปคิวพร้อม **focus filter**
  (`schema rules evidence dup outbox company hand`)
- การ์ด "รหัสข้อยกเว้นที่พบบ่อย" พร้อม progress bar ความถี่ + เจ้าของงาน (user/accounting)
- การ์ด "งานหนักที่ต้องเคลียร์" (EU เห็นเฉพาะงานของตัวเอง)
- ปุ่ม **รีเซ็ตเดโม** (ล้าง overlay ทั้งหมด + audit `RESET`)

## 2) Queue

| ตัวกรอง | ค่า |
|---------|-----|
| `q` | ค้น id / DMS / ชื่อเรื่อง / ผู้ขาย / เลขที่บิล / PO |
| `status` | ผลตรวจ engine 4 ค่า |
| `wf` | สถานะงาน 6 ค่า |
| `company` | รหัสบริษัท + `UNMAPPED` |
| `assignee` | user / accounting / system / ยังไม่มี |
| `code` | ข้อยกเว้น 15 รหัส |
| `focus` | ประเด็นข้อมูลจากแดชบอร์ด (schema/rules/evidence/dup/outbox/company/hand) |
| `mine` | เฉพาะงานที่ engine มอบให้ผู้ใช้คนนี้ |
| `sort` | updated · risk · amount · id |

- เรียง `amount` ใช้ `dCmp(dec(...))` ห้ามแปลงเป็น float
- คอลัมน์: เอกสาร (+หัวเรื่อง) · ผลตรวจ · ข้อยกเว้น (สูงสุด 3 พร้อมโทนสีแดงสำหรับ E06/E31) ·
  ยอดรวม · ผลต่างเงิน (ถ้ามี) · สถานะงาน · หลักฐาน · ความพร้อม (`blockingFor`) · งานที่ต้องทำ
- แถวที่ถูกบล็อกจะยังแสดง (ไม่ซ่อน) แต่ช่อง "ความพร้อม" บอกเหตุผลสั้น ๆ
- ปุ่มล้างตัวกรอง/ล้าง focus แยกกัน

## 3) Detail (หัวใจของ portal)

เรียงตามลำดับที่คนอ่านงานจริง:

1. **หัวเรื่อง + แท็บ revision** — เลือกดูรุ่นเก่าได้ ( immutable banner + ล็อก action ของรุ่นเก่า)
2. **alert stack** — `guards()` ทั้งหมด (ความเสี่ยง/หลักฐาน/contract/rules/outbox) พร้อม action ที่ถูกบล็อก
3. **ยอดเงิน (decimal string)** — Σ มูลค่าบรรทัด, ผลต่างรายบรรทัดสูงสุด, VAT 7%, grand − (subtotal+VAT),
   Σ(จำนวนรับ × ราคาใบรับ), subtotal − ยอดรับ, สกุลเงิน (เตือนเมื่อไม่ใช่ THB) + note เมื่อ `receipt.bypassed`
4. **ตาราง 9 กฎ** แยกตามขั้น 1/2/3 — ผล (PASS/FAIL/MANUAL/not_evaluated), code, severity,
   หน้า, คำอธิบาย as-built ของกฎนั้น
5. **การจับคู่รายบรรทัด** — M1–M4 + ธง price/uom/qty + ยอดที่ engine ใช้เทียบ
6. **แถวใบรับ (Oracle SQL)** — RECEIPT_NUM, จำนวน, ราคา, LINE_TOTAL, row_count/active_row_count
7. **ข้อยกเว้น** — เรียงตาม severity + เจ้าของงาน + ขั้นตอนถัดไป
8. **panel action** — ปุ่มตามบทบาท/สถานะ, ทุกปุ่มที่ไม่ได้กด shows `reasons` เป็น toast,
   ทุก action ต้องกรอกหมายเหตุ ( modal text form )
9. **outbox panel** — งานที่ค้างส่ง pipeline + ปุ่ม **ส่งรุ่นค้าง** (เดโม)
10. **หลักฐาน PDF** — current/stale/missing + ปุ่ม **แนบ PDF จำลอง** (ไม่เก็บไฟล์)
11. **contract / revision table** — ผล validate รายรุ่น (error/warning) + `rulesCompleteness`
12. **JSON ดิบของ snapshot รุ่นที่เลือก** (`<details>`) + ปุ่ม **ทดสอบ ingestion**
13. **audit ของเอกสารนี้** (ล่าสุด 10 รายการ) + deep link ไปหน้า audit

### ฟอร์ม action

- modal เดียว (`openForm`/`openText`) บังคับหมายเหตุ ≥ 5 ตัวอักษรสำหรับทุก action
- แสดงผลกระทบ (จาก `transitionFor`) ก่อนยืนยัน: "ON_HOLD → PENDING_REVIEW"
- ถ้า `store.act()` ปฏิเสธ → toast แสดงเหตุผลทุกข้อ + บันทึก `ACTION_BLOCKED`

## 4) Master

- ตารางนิติบุคคล 48 แถว (org_id, ชื่อย่อ/เต็ม, Tax ID, OU, status, map เป็นบริษัทอะไร) +
  ตัวกรอง "เฉพาะ ACTIVE" / "map ได้เท่านั้น"
- ตาราง exception 15 รหัส (ความหมาย, severity, เจ้าของงาน, ว่า portal ใช้ทำอะไร)
- ตาราง tolerance as-built (ค่าจริงที่ engine ใช้) เทียบกับเอกสาร
- catalog กฎ 9 ข้อ + ช่อง "ต่างจากมาตรฐาน 6.2 อย่างไร"

## 5) Audit

- filter: ชนิดเหตุการณ์, ผู้ใช้, เอกสาร, keyword
- สรุป chip นับตามชนิด, ปุ่มส่งออกรายการ (copy JSON)
- แถว `VIEW` ถูกเก็บ (นโยบาย: ต้องตรวจได้ว่าใครเปิดดูเอกสารไหนบ้าง)
- deep link `#/doc/<id>` จากคอลัมน์เอกสาร

## 6) Help

- หลักการ 7 ข้อ (ไม่คำนวณซ้ำ, decimal, 3 ชั้น policy, fail-safe, audit ทุกอย่าง)
- ตารางบทบาท × action (คำนวณจาก `actionMatrix` จริง ไม่ใช่พิมพ์เอง)
- ฟิลด์ contract ที่ portal ต้องการ + อะไรทำให้ถูกปฏิเสธ
- **เดโม scenario** ที่เตรียมไว้ + วิธีเดินตาม
- **gap log as-built** (ตารางเดียวกับ docs/06 ย่อ)
- สิ่งที่ยังปิดไม่ได้ (integration) + production checklist
- คำสั่งที่ใช้ตอนพัฒนา

## เงื่อนไขการแสดงผลที่ต้องคงไว้ ( acceptance ด้าน UI )

- ไม่มีหน้าจอใด "ซ่อน" เอกสารที่มีปัญหา — ต้องขึ้นพร้อมเหตุผล (UNMAPPED / no-evidence / schema-invalid)
- ไม่มีปุ่มใดถูก disable โดยไม่มีเหตุผลให้ผู้ใช้เห็น (ทุกเคสมี `reasons`)
- ทุก action มีหมายเหตุและ audit เสมอ (ไม่มี silent change)
- เอกสาร Auto-pass ก็ยังต้องมีคนกดยืนยัน (guard `needs-approval`) → portal ไม่ตั้งหนี้เอง
- `post` แสดงเป็นปุ่มที่ปิดตายพร้อมคำอธิบาย (ไม่ลบปุ่มออก เพื่อให้เห็นเจตนา)
- หน้า render ได้ใน node โดยไม่มีเบราว์เซอร์ (smoke group 9) และไม่มี `undefined` / `[object Object]` / `NaN` โผล่บนจอ
