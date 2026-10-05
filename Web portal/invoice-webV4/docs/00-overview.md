# 00 · ภาพรวมและขอบเขต

## ปัญหาที่ portal นี้แก้

ทีมวางบิลของกลุ่มบริษัทรับ invoice จากผู้ขาย แล้วต้องตรวจว่า

1. เอกสารครบถ้วนและเลขในเอกสารคูณ/บวกถูกต้อง
2. มีใบรับของ (receipt) ใน ERP รองรับจริง
3. นิติบุคคลลูกค้าที่วางบิลตรงกับ ORG ที่รับของ
4. บรรทัดที่วางบิล ↔ บรรทัดที่รับจริงตรงกัน จำนวน/ราคา/หน่วยนับไม่หลุด
5. ลายเซ็น/ตราประทับครบ และไม่มีเอกสารซ้ำ

ระบบ OCR + engine (mirrored ใน `src/engine/rules.js`) ตรวจสิ่งเหล่านี้แล้วและปล่อย
**snapshot ต่อเอกสารต่อรุ่น** ออกมา หน้าที่ portal คือให้คน **อ่านผล ตัดสิน และบันทึกงาน**
โดยต้องไม่ "ตรวจซ้ำ" แล้วสร้างคำตอบที่สองขึ้นมา

## เป้าหมายของ v4

| เป้าหมาย | ทำอย่างไรในโค้ด |
|----------|------------------|
| ผลที่เห็นบนจอ = ผลของ engine เท่านั้น | UI อ่าน `SNAPSHOT_BUNDLE` ผ่าน `store` · ไม่มี runtime file ไหน import `src/engine/` |
| ข้อมูลเข้าทางเดียว ตรวจทางเดียว | `store.ingest()` → `validateSnapshot()` → ปฏิเสธ/รับ + audit |
| แยก "ผลตรวจ" ออกจาก "สถานะงาน" | snapshot immutable · overlay ของ portal (workflow/outbox/audit/pdf) เก็บแยกและ persist ได้ |
| อธิบายได้ทุกปุ่มที่กดไม่ได้ | `access` → `workflow` → `guards` คืน `reasons[]` ทุกตัว |
| เลขา/บัญชีไทยอ่านรู้เรื่องโดยไม่ต้องอบรม | ภาษาไทยทั้งหมด · badge + watermark + note ทุกจุด · หน้า `help` เป็นคู่มือในแอป |
| ทดสอบได้โดยไม่ต้องมีเบราว์เซอร์ | domain/views เป็น pure string/logic · `node tools/smoke-test.mjs` 107 การตรวจ |

## ขอบเขต (ทำ)

- คิวงาน + ดีเทลเอกสาร 9 กฎ, การจับคู่ M1–M4, แถวใบรับ, ข้อยกเว้น, ยอดเงิน decimal
- workflow: hold / release / resubmit / confirm / reject (+ `post` ที่ **ปิดตาย** พร้อมเหตุผล)
- สิทธิ์ 4 บทบาท ขอบเขตรายบริษัท และ separation of duties (ผู้แนบเอกสารตัดสินเองไม่ได้)
- รับ snapshot ใหม่เข้าระบบผ่าน JSON (ทดสอบ contract จริง: type, decimal, revision, event_id ซ้ำ)
- หลักฐาน PDF แบบ **metadata เท่านั้น** (current / stale / missing) + จำลองแนบไฟล์
- audit แบบ append-only พร้อม filter + deep link กลับเอกสาร
- หน้านี้ข้อมูลหลัก (master), exception catalog, tolerance as-built และ **gap log**

## ขอบเขต (ไม่ทำ — และบอกว่าทำไม)

| ไม่ทำ | เหตุผล | แทนที่ด้วย |
|-------|--------|-------------|
| รันกฎ V-01…V-09 ในเบราว์เซอร์ | สร้างความจริงสองชุด ผิดจาก engine แน่นอน | `tools/build-fixtures.mjs` รัน mirror แล้วเขียนลง `src/data/snapshots.js` |
| เรียก Oracle / OCR / n8n ตรงจาก portal | ไม่มี contract, ไม่มี credential, และ portal เป็น static | ปุ่ม resubmit → เขียน **outbox entry** ค้างไว้ให้ worker (มี demo "ส่งรุ่นค้างออก") |
| ส่งตั้งหนี้ที่ AP (`post`) | ต้องมี acknowledgement contract จาก AP | guard `ap-contract` บล็อกทุกเคส + แสดงเหตุผล |
| เก็บไฟล์ PDF จริง | โฟลเดอร์นี้เป็นโค้ดตัวอย่าง && นโยบายไม่เก็บต้นฉบับ | เก็บ metadata (`sha256`, `pages`, `attachedAt`, `attachedBy`) และ watermark "ข้อมูลสาธิต" |
| Login จริง (Entra ID) | ยังไม่มีการลงทะเบียน app | เลือกผู้ใช้เดโม 7 คนจาก topbar · สลับแล้วคิว/สิทธิ์เปลี่ยนทันที |
| แก้ snapshot/ผลตรวจของ engine | engine เป็น source of truth | ทำได้เฉพาะ overlay ของ portal |

## ผู้ใช้และบทบาท (as-configured)

| id | ตัวละคร | บทบาท | ขอบเขตบริษัท | ทำอะไรได้ |
|----|---------|-------|----------------|-----------|
| u1 | SOMSAK JAIDEE | EU | AH | hold, release, resubmit |
| u2 | WILAIWAN SRISUK | EU | AHT | hold, release, resubmit |
| u3 | THANAKORN MANKONG | EU | AM, MGP | hold, release, resubmit |
| u4 | PANIDA RATTANASIRI | ACC | 5 บริษัท | hold, release, resubmit |
| u5 | KAMONWAN SUWANNAKUN | ACC | 5 บริษัท | hold, release, resubmit |
| u6 | SOMCHAI PHUAPRAPAKORN | APR | 5 บริษัท | + confirm, reject, post* |
| u7 | SYSTEM ADMINISTRATOR | ADM | ทุกบริษัท | ไม่มีสิทธิ์อนุมัติ (reset/เดโมเท่านั้น) |

`post` = มีปุ่ม แต่ถูก guard บล็อกทุกบทบาท (`ap-contract`) · ADM แยกจาก business role ตามนโยบาย

## คำศัพท์ที่ใช้ตรงกันในโค้ด

- **snapshot** — ผลตรวจ 1 รุ่นของเอกสาร 1 ฉบับ (immutable, schema-gated)
- **overlay** — สถานะที่ portal เป็นเจ้าของ (workflow, outbox, audit, pdf ที่แนบเพิ่ม, snapshot ที่ ingest เพิ่ม)
- **outbox** — งานที่ portal สั่งให้ pipeline ทำต่อ (เช่น resubmit) แต่ portal ทำเองไม่ได้
- **UNMAPPED** — map ORG_ID/Tax ID → บริษัทไม่ได้ (ไม่เดา และงานไม่หายจากคิว)
- **as-built** — พฤติกรรมจริงของ engine ซึ่งต่างจากเอกสารมาตรฐาน 6.2 (ดู `docs/06`)
- **hand-authored** — snapshot ที่คนเขียนมือ (ใช้เฉพาะเคส pipeline ล่มที่ engine ไม่ปล่อยอะไรออกมา) ต้องติดธงเสมอ

## ความสัมพันธ์กับเวอร์ชันอื่น

- `invoice-webV2` — React/Vite ตัวจริงที่ต่อ API (ต้องมี backend)
- `invoice-webv3` — mockup no-build รอบที่ 1–2 (คลาสสิกสคริปต์ ไฟล์เดียวโต)
- **`invoice-webV4` (ที่นี่)** — no-build เช่นกันแต่แยก layer จริง มี contract validation,
  fixture จาก engine mirror และ automated test · ใช้เป็นต้นแบบ spec ก่อนพอร์ตเข้า V2
