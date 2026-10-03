# Session `2026-10-03-004` — AIVA Invoice Portal Mockup v3 (no-build)

- Started: `2026-10-03T10:05:00+07:00`
- Completed: `2026-10-03T11:35:00+07:00`
- Task: `TASK-20261003-004`
- Status: `completed`

## Goal

สร้าง mockup เว็บใหม่ใน `Web portal/invoice-webv3` ที่เปิดจาก `file://` ได้ทันที (ไม่ต้อง build) โดยใช้ข้อมูลจริงในคลังโค้ด
(rules, master data, workflow contract) ผสมกับข้อมูลสังเคราะห์ และคงงานออกแบบของ Mockup v4.4
เพื่อใช้รีวิว UI + business rule กับทีมบัญชี/ทีมพัฒนา โดยไม่แตะ portal หรือ backend ที่ใช้อยู่

## Sources reviewed

- `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html` (เลย์เอาต์, design token, KPI, company chip, PDF viewer/watermark, RBAC)
- `OCR service/n8n/app/core/master_data.py` (นิติบุคคล 48 แถว ORG/TIN), `rules.py` (V-01–V-09, `decide()`, `owner_of()`, `match_lines()` M1–M4), `models.py`
- `docs/matching-rules-standard-v6.2.md` §5 (exception catalog 22 รหัสในเอกสาร) และ §8 (บทบาท/หน้าที่)
- `.agents/skills/aiva-invoice-core/references/core-domain.md` (domain contract + conflict list)
- `Web portal/invoice-web-9054076/docs/04-receiving-api.md` (snapshot field, workflow action, reason code, 409/idempotency/outbox)
- `Web portal/invoice-webV2/src/data/mockInvoices.ts` (โครงข้อมูลตัวอย่างของ V2)

## Changes

- `Web portal/invoice-webv3/index.html` — shell + `<script>` คลาสสิก 4 ไฟล์ตามลำดับ `data → domain → docs → app`, ป้าย MOCKUP ชัดเจน
- `Web portal/invoice-webv3/assets/style.css` — design token ต่อจาก v4.4 + องค์ประกอบ queue/KPI/flow/tabs/ex/timeline/modal/viewer/RBAC/responsive
- `Web portal/invoice-webv3/assets/data.js` — master data 48 แถว + exception catalog as-built 15 รหัส + ชุดรหัสฝั่ง user + กฎ V-01–V-09 (รีเจเนอเรตได้)
- `Web portal/invoice-webv3/assets/domain.js` — นิยามกฎ, step mapping, `decide()`, `ownerOf()`, RBAC/permission, action/reason code, catalog ฝั่ง docs, ผัง mapping docs ↔ as-built, `DATA_CONFLICTS`, `PROVENANCE`
- `Web portal/invoice-webv3/assets/docs.js` — เอกสารสังเคราะห์ 16 ฉบับ (ครอบคลุมทุกเคสการใช้งาน) + workflow label + audit/outbox เริ่มต้น + ค่า UI ตั้งต้น
- `Web portal/invoice-webv3/assets/app.js` — state, RBAC scope, queue/KPI/chips, 6 แท็บรายละเอียด (สรุป, รายการ/3-way, กฎ, หลักฐาน, ประวัติ+outbox, JSON), viewer จำลอง PDF/DMS, action modal พร้อม 409/idempotency, RBAC page, audit search/pagination, reference page
- `Web portal/invoice-webv3/tools/build-domain-data.py` — ดึง master/exception/rules จาก `OCR service/n8n/app/core` แล้วเขียน `assets/data.js`
- `Web portal/invoice-webv3/tools/smoke-test.js` — DOM ปลอม ไล่เรนเดอร์ทุกผู้ใช้/หน้า/แท็บ/เอกสาร/action + ตรวจ invariant
- `Web portal/invoice-webv3/README.md` — วิธีเปิด, โครงสร้างไฟล์, สิ่งที่ทำงานจริง, provenance, เคสที่ควรกดดู, ข้อจำกัด
- ไม่ได้แก้ `invoice-webV2`, `invoice-web1`, `invoice-web-9054076`, OCR service, backend หรือ canonical data อื่น

## Verification

- `node --check` ผ่านทั้ง `assets/data.js`, `assets/domain.js`, `assets/docs.js`, `assets/app.js`
- `node tools/smoke-test.js` → `✓ ผ่าน 46 การตรวจ` ครอบคลุม: ทุกผู้ใช้เรนเดอร์ครบ 4 หน้าโดยไม่มี `NaN`/`[object Object]`, เอกสาร 16 ฉบับครบ 6 แท็บ, viewer ทุกหน้าทุกเอกสาร, 409 เมื่อ `expected_workflow_version` ผิด (สถานะไม่ถูกแก้), confirm เพิ่ม `wf_version` + บันทึก audit, rerun สร้าง outbox `waiting_revision` + workflow `RESUBMITTED`, บล็อก action เมื่อขาด note, audit pagination, KPI นับตรงข้อมูล, master 48 แถว / 15 รหัส / 9 กฎ และสแกนรูปแบบ credential
- ตรวจด้วยตา: เอกสารที่ map บริษัทไม่ได้ต้องปรากฏในคิวฝ่ายบัญชีพร้อมป้ายเตือน (ไม่ให้หายจากทุกคิว)
- ไม่ได้รัน OCR, Oracle, Entra, DMS หรือ backend จริง; ไม่ได้ทดสอบ cross-browser

## Decisions

- ใช้ code as-built (Standard 6.2 ตาม `rules.py`) เป็นภาษาหลักของ UI และแสดง catalog ในเอกสารวิชาการแยกเป็น "ผัง mapping + คำเตือน" ไม่ relabel code เก่าเป็น code ใหม่
- ยึด decision order ของ engine ตรง ๆ: `manual_review` → Manual Review, High → Hold, Medium → Review, ที่เหลือ (รวม Low) → Auto-pass
- แสดง ownership ตาม `owner_of()`: `E06 E12 E13 E17 E26 E34 E35` เป็นงานของ user/ผู้รับของ รหัสอื่นเป็นของฝ่ายบัญชี
- Mock M1–M4 ตามจริง และตีความ M4 (fallback) เป็นสัญญาณให้คนตรวจ ไม่ใช่ matches ที่เชื่อถือได้
- ทุก action จำลองแบบ optimistic concurrency + outbox เพราะ contract จริงระบุว่า accepted ยังไม่เท่ากับสำเร็จ
- ไม่ hide ความขัดแย้งของข้อมูล: แสดง Tax ID/ORG ที่ไม่มีใน master, ORG ที่ master map แล้วแต่ mockup บอกไม่รู้จัก, ขีดจำกัด PDF สองฝั่ง, Decimal ↔ float

## Notes / Follow-up

- ยังไม่ได้ commit หรือ push (รอผู้ใช้สั่ง) — ไฟล์ทั้งหมดเป็น untracked ใน working tree
- ปุ่มคัดลอก JSON ต้องเปิดผ่าน `http://` (Clipboard API ถูกบล็อกบน `file://`)
- ขั้นตอนถัดไปที่แนะนำ: ให้ทีมบัญชีรับรองผัง mapping exception + ยืนยัน source of truth ของ `E13`/`E34` แล้วจึงตัดสินใจว่าจะเอาโครง v3 ไปต่อกับ FastAPI backend ตัวใดเป็น authoritative

## Addendum (รอบตรวจด้วย Chromium)

- เวลา: `2026-10-03T12:05:00+07:00`
- เปิด `index.html` ด้วย Chromium (Playwright) เพื่อหาสิ่งที่ DOM ปลอมมองไม่เห็น แล้วแก้ 4 จุด:
  - `boot()` ไม่ได้setค่า `<select id="user">` ทำให้ `BOOT.user` ไม่ทำงาน (first paint ตกไปที่ผู้ใช้ option แรก) → set ค่าก่อน `switchUser()` และเลือก `BOOT.doc` ที่อยู่ในขอบเขตของผู้ใช้ตั้งต้น
  - แถบสเต็ปเพิ่มขั้นที่ 4 "Portal ตรวจซ้ำ / ตัดสิน" ให้ครบ pipeline แบบ Mockup v4.4
  - หน้า PDF จำลอง highlight หลักฐานตาม `rule.page` (รายการที่ evidence อ้าง "บรรทัด N", กล่องลายเซ็น, Tax ID ผู้ขาย, เลข PO) + บรรทัดสรุปหลักฐานบนหน้า
  - คิวแสดงแถวแจ้งเตือนเมื่อเอกสารที่เปิดอยู่ไม่ตรงกับตัวกรองปัจจุบัน พร้อมปุ่ม/ลิงก์ล้างตัวกรอง (`resetFilt()`)
- ผลตรวจหลังแก้: console/page error 0, ไม่มีค่าผิดปกติ (`undefined`/`NaN`/`[object Object]`) ในการไล่ทุกผู้ใช้×ทุกหน้า×ทุกเอกสาร×ทุกแท็บ, 390px ไม่มี horizontal overflow, computed style ตรง token (header 56px `#0D274D`, active tab `#00B5AF`)
- ไฟล์ชั่วคราวที่ใช้ตรวจ (script + screenshot) ถูกลบออกหมดแล้ว โฟลเดอร์ mockup เหลือเฉพาะไฟล์ส่งมอบ
- รายละเอียดงาน/ปัญหาเพิ่มดูได้ที่ `CHG-20261003-014`, `WORK-20261003-014`, `ERR-20261003-005`

## Addendum (commit และ push)

- เวลา: `2026-10-03T12:20:00+07:00`
- commit `94d8cad` (15 ไฟล์ +2,534/−2) และ push `b248e7d..94d8cad` ไป `origin/invoice-web` สำเร็จ, working tree clean
- author ใช้ `Deizyn <aapico.intern07@aapico.com>` ผ่าน `-c user.email=...` เฉพาะคำสั่ง commit เพราะ repo นี้ไม่ได้ตั้ง `user.email` ไว้ (ไม่ได้แก้ git config)
- ก่อน commit ตรวจว่าไม่มีไฟล์ชั่วคราว/ภาพ screenshot/node_modules และ `tools/smoke-test.js` ผ่าน 46 การตรวจ (รวมสแกนรูปแบบ credential)
- รายละเอียด work log: `WORK-20261003-015`
