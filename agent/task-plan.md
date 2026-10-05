# Task และ Plan

Last updated: `2026-10-03T16:50:00+07:00`

## Completed Task
- Task ID: `TASK-20261003-007`
- Title: พัฒนา web portal เวอร์ชัน V5 (`Web portal/invoice-webV5`) แบบ repo-reference portal (no-build)
- Status: `completed`
- Goal: แก้ปัญหา code/data duplication ของ v4 โดย sync ข้อมูลจาก repo โดยตรง (`tools/sync.py`), รวมหน้าจอที่ซ้ำซ้อนเหลือ 6 หน้า, บังคับ view เป็น pure snapshot-driven และใช้ BigInt Decimal
- Acceptance criteria:
  - [x] `node tools/smoke-test.mjs` ผ่าน 31/31 (hygiene, provenance, domain, ui)
  - [x] `node tools/browser-check.mjs` ผ่าน 29/29 (Edge headless)
  - [x] `python tools/sync.py --check` ผ่าน
- Result: โฟลเดอร์ `Web portal/invoice-webV5` ครบถ้วนพร้อมเอกสาร `PORTAL-plan.md` และ `as-built-v5.md`
- Next: commit โฟลเดอร์ V4, V5 และ push ขึ้น git

## Previous Completed Task
- Task ID: `TASK-20261003-006`
- Title: สร้าง web portal เวอร์ชัน V4 (`Web portal/invoice-webV4`) แบบ no-build ที่แสดงผลจาก snapshot เท่านั้น + เอกสารพัฒนาครบชุด
- Status: `completed`
- Goal: นำตัวอย่างเว็บ/ข้อมูลทั้งหมดใน `Web portal` (mockup v4.4, v1/v2/v3, OCR service rules + master data, skill `aiva-invoice-core`) มาสร้าง portal ที่ "ดูได้จริงและพิสูจน์ข้อห้ามทางสถาปัตยกรรมได้จริง" แทน mockup ที่ผลตรวจเป็นการพิมพ์มือ
- Plan:
  - [x] สำรวจของเดิม (v1/v2/v3 + mockup + `rules.py`/`master_data.py` + core-domain) แล้วกำหนดเลเยอร์ `domain/data/engine/ui/views/styles`
  - [x] engine mirror as-built (`src/engine/rules.js`) ที่ **ใช้เฉพาะ tools** เพื่อ generate ผลตรวจออกมาจริง
  - [x] receiving contract v1.0 + `validateSnapshot`/`rulesCompleteness` เป็นประตูข้อมูลเดียว (`store.ingest`)
  - [x] domain 10 ไฟล์แบบ pure (BigInt decimal, company mapping ไม่เดา → `UNMAPPED`, access/workflow/guards 3 ชั้น, audit append-only, store เก็บเฉพาะ overlay)
  - [x] views 6 หน้า + hash router + ตัวกรอง/action/modal ที่แสดงเหตุผลทุกปุ่มที่ถูกบล็อก
  - [x] ข้อมูลเดโม generate จาก cases 22 ฉบับ (SoD, evidence missing/stale, outbox, hand-authored, not_evaluated, M4, safety cap, USD, duplicate, terminal, decimal 6 ตำแหน่ง)
  - [x] `tools/serve.py`, `build-master-data.py`, `build-fixtures.mjs --check` (มี drift detection), `smoke-test.mjs` (9 กลุ่ม 107 การตรวจ), `browser-check.mjs` (Chromium 14 การตรวจ + ข้ามตัวเองเมื่อไม่มี playwright)
  - [x] เอกสาร `README.md` + `docs/00…07.md` (overview/architecture/data-contract/domain-model/ui-spec/build-and-test/as-built-gaps/demo-script)
- Acceptance criteria:
  - [x] `python tools/build-master-data.py` + `node tools/build-fixtures.mjs` + `--check` ผ่าน (เคส 22 · snapshot 24 · error 0 · warning 3) และไม่ drift
  - [x] `node tools/smoke-test.mjs` ผ่าน 107/107 รวมข้อห้ามสถาปัตยกรรม (no runtime engine import, no DOM ใน domain, ไม่มี parseFloat/toFixed นอก money.js, ผลตรวจห้าม hardcode)
  - [x] `node tools/browser-check.mjs` ผ่าน 14/14 — console/page error 0, ไม่มี `undefined/NaN/[object Object]` บนจอ, SoD toast ขึ้นเหตุผล, layout 390px ไม่ล้นแนวนอน
  - [x] ไม่มีอักษรภาษาอื่นปนในโค้ดและ docs (เทสต์group 7 สแกน .js/.mjs/.md; อนุโลม Greek `Σ`)
  - [x] ไม่แตะ portal เวอร์ชันอื่น/OCR/backend; ปิดรอบด้วย canonical records ครบ
- Result: โฟลเดอร์ใหม่ `Web portal/invoice-webV4` (untracked) — runtime 3 + domain 10 + data generated 2 + engine mirror 1 + ui 2 + views 6 + css 1 + tools 6 + docs 9/README; session `2026-10-03-006`, changelog `CHG-20261003-017/018`, work-log `WORK-20261003-018/019`, errors `ERR-20261003-009…014`
- Next: commit โฟลเดอร์นี้ (รอผู้ใช้สั่ง) → ทดสอบกับ snapshot ที่ dump จาก n8n จริง → ตัดสินใจ merge กลับ mockup/v3 หรือเดินต่อที่ V4

- Task ID: `TASK-20261003-005`
- Title: ยกระดับ mockup v3 ด้วยข้อสังเกตจาก log ทั้งหมด (action parity, revisions, audit, scope/SoD, decimal)
- Status: `completed`
- Goal: นำช่องว่าง/บั๊กที่บันทึกไว้ใน `agent/work-log.md`, `agent/errors-and-solutions.md`, session ก่อนหน้าและเอกสารอ้างอิง (`07-mockup-feature-parity.md`, `08-task-first-review-ux.md`, `05-implementation-status.md`) มาปิดในงาน mockup เดิม เพื่อให้ v3 สาธิตพฤติกรรมจริงได้ครบและตรง contract ขึ้น
- Plan:
  - [x] แก้บั๊กที่พบจาก log: action `explain` ทำให้ `workflow` เป็น undefined, filter "งานของฉัน" ถึงไม่ได้จาก KPI, `release_hold` ไม่มีใน action set
  - [x] action parity ตาม `08-task-first-review-ux.md`: explain/resubmit/rerun/return/reject/hold/release_hold/confirm + `post` ที่ปิดพร้อมเหตุผล + blocking reason ทุกปุ่ม
  - [x] การ์ด "ขั้นตอนถัดไป" (งาน + ปัญหา + ผู้รับผิดชอบ + action ที่ทำได้/ไม่ได้) ตามลำดับข้อมูล task-first
  - [x] separation of duties + ล็อกฝั่งบัญชีเมื่อ High exception ของฝั่งผู้ใช้ยังไม่ปิด
  - [x] revision selector + banner immutable + PDF/JSON ตรงรุ่น (stale revision ทำ action ไม่ได้)
  - [x] audit: hash chain (tamper-evident) + verify + จำลองการแก้ไขเพื่อแสดง chain ขาด + คลิกไปยังเอกสาร + ส่งออก CSV
  - [x] คิว: คอลัมน์ "งานที่ต้องทำ", sort, pagination, KPI "งานของฉัน" (UI-02/UI-03)
  - [x] viewer: zoom, เล่มหน้าด้วยปุ่ม/คีย์บอร์ด, บันทึก access event, ปุ่มดาวน์โหลด/พิมพ์ปิดพร้อม policy (UI-12)
  - [x] เคสทศนิยม Decimal ↔ float และเลข string ตรงตาม snapshot (เอกสารใหม่ `AIVA-2609-0017`)
  - [x] ขยาย `tools/smoke-test.js` ให้คลุมพฤติกรรมใหม่ทั้งหมด (46 → 60 การตรวจ)
  - [x] แปลงสคริปต์ตรวจชั่วคราวเป็นเครื่องมือถาวร `tools/browser-check.js` (Chromium จริง 14 การตรวจ + exit code) และเก็บกวาดไฟล์ `_dbg*`, `_bc.*`, `tools/_patch_*.py` + เพิ่ม `.gitignore`
  - [x] อัปเดต README (โครงสร้าง, คำสั่ง, ตาราง 17 เคสที่ map กับ `docs.js` จริง, ข้อจำกัด) + canonical records
- Acceptance criteria:
  - [x] ทุก action ที่แสดงบนหน้าจอมีผลต่อ workflow/audit/outbox ชัดเจน และไม่มี path ใดทำให้สถานะเป็น undefined
  - [x] ปุ่มที่กดไม่ได้ต้องอธิบายเหตุผลได้ (guard เดียวกันใช้ทั้งใน action bar และการ์ดขั้นตอนถัดไป) — ตรวจว่าทุกปุ่ม disabled มี `title` ยาว ≥ 10 ตัวอักษร
  - [x] ไม่แก้ snapshot/rules เดิม และ action บน revision เก่าถูกบล็อก (ตรวจว่า `d.rev`/`d.wfv`/`OUTBOX` คงเดิมหลังดูของเก่า)
  - [x] audit chain ตรวจแล้วผ่าน และแสดง chain ขาดเมื่อมีการแก้บันทึก (แล้วกู้กลับได้ด้วย `rechain()`)
  - [x] `node --check` + smoke test ผ่านโดยไม่มี `undefined`/`NaN`/`[object Object]` (รวมการไล่ด้วย Chromium จริง 102 จอ + 22 จอที่ nav เปิดให้)
- Result:
  - `assets/app.js` +685 บรรทัด (guards/todoOf/nextCard/revision view/queue sort+pagination/audit hash chain+CSV+deep link/viewer toolbar+access event), `assets/domain.js` (ACTIONS ครบ 9 ตัว + use/blocked/decide/needReceiver, REASON_CODES 12), `assets/docs.js` (revs ของ 0013/0015, เอกสาร 0017, ปรับ `upl` ของ 0012 เพื่อทดสอบ SoD), `assets/style.css` (+27 บรรทัด)
  - `tools/smoke-test.js` 46 → **60** การตรวจ ผ่านทั้งหมด; เพิ่ม `tools/browser-check.js` ผ่าน **14** การตรวจด้วย Chromium จริง (console error 0, 390px overflow 0px)
  - README ถูกรีไรต์ในส่วนพฤติกรรม/ตารางเคสให้ตรงกับ `docs.js` (ตารางเดิม drift เช่น 0005/0006/0012) + `.gitignore` กันไฟล์ชั่วคราว
  - บันทึกเป็น `CHG-20261003-015/016`, `WORK-20261003-016/017`, `ERR-20261003-006/007/008` และ session `2026-10-03-005-mockup-v3-round2.md`
  - commit `cd76db0` (mockup) + commit ของ `agent/` แยกถัง ยังไม่ได้ push
  - ข้อจำกัดที่เหลือ: hash chain/idempotency เป็นของจำลอง, `post`/download ปิดไว้, ยังไม่ต่อ backend — ต้องให้ฝ่ายบัญชีรับรองกติกา SoD/ล็อกฝั่งก่อนใช้เป็นสเปก

## Concurrent Task
- Task ID: `TASK-20261003-004`
- Title: สร้าง Web portal mockup v3 แบบ no-build ใน `Web portal/invoice-webv3`
- Status: `completed`
- Goal: ทำ mockup ที่เปิดจาก `file://` ได้ทันที โดยไม่ต้องใช้ build tooling เพื่อนำข้อมูลจริงในคลังโค้ด (master data, กฎ V-01–V-09, workflow/receiving contract) มาแสดงในโครงหน้าตาของ Mockup v4.4 พร้อมเปิดเผยข้อขัดแย้งระหว่าง docs / as-built / mockup ให้ทีมรับรองก่อนพัฒนาจริง
- Plan:
  - [x] อ่าน master data, rules engine, receiving contract, docs standard และ Mockup v4.4
  - [x] ตั้งโครง no-build (classic script 4 ไฟล์ + CSS + HTML)
  - [x] สร้าง `tools/build-domain-data.py` เพื่อกำเนิด `assets/data.js` จาก OCR service แทนการ copy มือ
  - [x] เขียน domain reference (กฎ, decision order, ownership, RBAC, action/reason code, mapping, conflicts, provenance)
  - [x] สังเคราะห์ชุดเอกสาร 16 ฉบับให้ครอบคลุมทุกเคส รวมถึง fail-safe/duplicate/revision/pipeline-fail
  - [x] ทำ UI ให้โต้ตอบได้: คิว/KPI/chips, 6 แท็บ, PDF viewer จำลอง, action + 409 + outbox, RBAC, audit, reference
  - [x] เขียน `tools/smoke-test.js` และทำให้ผ่านครบทุกการตรวจ
  - [x] อัปเดต canonical records ตาม Agent Operating Protocol
- Acceptance criteria:
  - เปิด `index.html` จาก `file://` ได้โดยไม่ต้อง install/build และไม่มีการพึ่งพาไฟล์นอกรากโปรเจกต์
  - สถานะเอกสารทุกฉบับใน mockup คำนวณซ้ำได้จาก rules ที่แสดงบนหน้าจอ (ไม่ใส่ผลแบบมือล้วน)
  - ไม่ relabel exception code ข้าม ruleset และความขัดแย้งของข้อมูลปรากฏให้ผู้ใช้เห็น
  - ทุก action จำลอง reason code, version check (409) และ outbox ตาม contract
  - ไม่แก้โค้ด portal/backend/OCR ที่ใช้อยู่
- Result:
  - เพิ่มโฟลเดอร์ `Web portal/invoice-webv3` (9 ไฟล์ ~2,293 บรรทัด) + `README.md` อธิบาย provenance และข้อจำกัด
  - `node --check` ผ่าน 4 สคริปต์; `node tools/smoke-test.js` ผ่าน 46 การตรวจ
  - commit `94d8cad` และ push ไป `origin/invoice-web` แล้ว (ยังไม่ต่อ API จริง)

## Previous Task Record
- Task ID: `TASK-20261003-002`
- Title: จัดทำ repository skill สรุปแก่นระบบ AIVA Invoice Matching
- Status: `completed`
- Goal: สกัดข้อมูลหลักจาก Mockup v4.4, OCR service และ docs ให้เป็น skill สำหรับอ้างอิงระหว่างพัฒนาต่อ โดยครอบคลุมขอบเขตระบบ field สำคัญ กฎตรวจสอบ requirement และข้อขัดแย้งของแหล่งข้อมูล โดยไม่ผูกกับโครงสร้าง implementation ที่ละเอียดเกินจำเป็น
- Plan:
  - [x] อ่าน schema และกฎที่ OCR service ใช้งานจริง
  - [x] อ่าน receiving contract และ requirement จาก Web Portal/docs
  - [x] สร้าง skill และ reference ฉบับกระชับ
  - [x] ตรวจรูปแบบ skill และตรวจทานกับ source
  - [x] ปิดงานและอัปเดต canonical records
- Acceptance criteria:
  - มีรายการ field หลักตั้งแต่เอกสาร, รายการสินค้า, receipt, ผลกฎ, workflow และ audit
  - สรุป V-01 ถึง V-09, decision, tolerance และ fail-safe ตาม implementation ปัจจุบัน
  - แยก requirement ที่ต้องมีออกจากสิ่งที่ยังต้องรับรองก่อน production
  - ระบุความขัดแย้งสำคัญระหว่าง docs, mockup และ code เพื่อไม่ให้ agent เดาความหมายเอง
- Result:
  - เพิ่ม `.agents/skills/aiva-invoice-core/SKILL.md` เป็น entrypoint และกติกาการใช้ domain knowledge
  - เพิ่ม `references/core-domain.md` ครอบคลุม system boundary, field catalog, V-01–V-09, decision/routing, workflow, production requirements และ source conflicts
  - เพิ่ม `agents/openai.yaml` สำหรับการค้นพบและเรียกใช้ skill
  - ตรวจด้วย `quick_validate.py` ผ่าน และตรวจ source/reference paths ครบ

## Active Task
- Task ID: `TASK-20261003-003`
- Title: จัดการ Commit และ Push โค้ดทั้งหมดขึ้น Git
- Status: `completed`
- Goal: บันทึกการเปลี่ยนแปลงใน Web portal (invoice-webV2, invoice-web1, invoice-web-9054076) และ Canonical records ใน agent/ ขึ้น GitHub
- Result: Commit และ push เรียบร้อย

## Previous Tasks
- Task ID: `TASK-20261003-001`
- Title: พัฒนา Modern Frontend V2 ในโฟลเดอร์ Web portal/invoice-webV2
- Status: `completed`
- Goal: สร้าง Frontend ใหม่ด้วย React 19 + TypeScript + Vite ในโฟลเดอร์ Web portal/invoice-webV2 ตามสถาปัตยกรรม V2 ที่พรีเมียม สบายตา โมเดิร์น รองรับการทำงานแบบ Standalone (Mock data สมบูรณ์) พร้อมวางโครงสร้างโมดูลที่สะอาดเพื่อเชื่อมต่อ Real API และต่อยอดได้ง่าย
- Plan:
  - [x] Initialized Vite React + TypeScript ใน `Web portal/invoice-webV2`
  - [x] ติดตั้ง dependencies พื้นฐานและ `lucide-react`
  - [x] วางโครงสร้างสถาปัตยกรรม (Architecture & Type Definitions & API Client boundary)
  - [x] จัดทำ Realistic Mock Data ครบถ้วน (Invoice summary, PO, GRN lines, 3-way matching, exceptions, rules, revisions, audit trail)
  - [x] สร้าง Premium Design System (CSS tokens, Glassmorphism/Modern card styles, typography, micro-animations, responsive layout)
  - [x] สร้าง Core Components & Features:
    - Navigation Header (Logo, Nav items, Status indicator, User role)
    - Scope Bar (Company filter chips, View switcher, Document import trigger)
    - KPI Metrics Dashboard (Interactive filter cards with status counters)
    - Master Document Queue (Search, multi-criteria filters, sorting, status badges)
    - Detailed Document Inspector
    - Document Import Modal
  - [x] ทดสอบ TypeScript build (`npm run build`)
  - [x] ทดสอบการเปิดดูและโต้ตอบด้วย Browser Subagent
  - [x] บันทึก Canonical Records ตาม Agent Operating Protocol
- Task ID: `TASK-20261002-010`
- Title: ปรับปรุงโครงสร้างหลักของ Web Portal สู่ต้นแบบ AIVA Mockup v4.4 อย่างสมบูรณ์ 100% (แก้ไข UI เละเทะ)
- Status: `completed`

## Acceptance criteria
- ลบ sidebar สีดำเดิมทิ้ง ทำให้ไม่มีแถบซ้อนสองชั้นอีกต่อไป (ผ่านการตรวจสอบ)
- ส่วนหัวเป็น Header สี Navy เข้ม (#0D274D) พร้อมเมนูครบถ้วนตาม Mockup v4.4 (ผ่านการตรวจสอบ)
- แถบ Scope และ KPI 6 กล่องวางเรียงสวยงาม ตัวเลขชัดเจน ไม่ลอย (ผ่านการตรวจสอบ)
- คิว 370px อยู่ซ้ายมือ เปิดดูเอกสารด้านขวามือได้ทันที สะอาด สบายตา ตรงตาม Mockup v4.4 (ผ่านการตรวจสอบ)
- รองรับ Mobile (390px) ไม่มี horizontal overflow และ Playwright E2E 6/6 ผ่าน 100% (ผ่านการตรวจสอบ)

## Result
- **โครงสร้าง Shell และ Header ใหม่**:
  - เปลี่ยนจาก Sidebar สีดำ 240px มาเป็น Full-width Layout พร้อมแถบ Header Navy เข้ม `#0D274D` ความสูง 56px ที่มีโลโก้ AI สีเขียว, Navigation Bar 4 รายการ, Role Badge เจ้าหน้าที่บัญชี และ Environment Pill ตรงตามต้นแบบ `AIVA-Web-Portal-Mockup-v4.4-Release.html`
- **การจัดวางหน้ารายการ (Queue Page Layout)**:
  - เรียงลำดับถูกต้อง: แถบ Scope ด้านบนสุด (พร้อม Company Chips, View Toggles, และปุ่มนำเข้าเอกสาร) -> แถบ KPI Summary 6 ใบพร้อมตัวเลขสถิติและสีระบุสถานะ -> แถบ Master-Detail Workspace 2 ฝั่ง (ซ้าย: คิว 370px, ขวา: เอกสารและ PDF)
- **สไตล์และพื้นที่แสดงผล (Visual Excellence & Parity)**:
  - ขยายพื้นที่การอ่านเอกสารให้กว้างขวาง สบายตา ปราศจากความอึดอัด คมชัด และตรงตาม Palette สีของต้นแบบ v4.4 100%
- **การทดสอบความถูกต้อง**:
  - Frontend production build (`tsc -b && vite build`) สำเร็จสมบูรณ์ (5.3s)
  - Backend unittests ผ่าน 15/15 รายการ (4.0s)
  - Playwright E2E tests ผ่านครบ 6/6 รายการ (รวม Mobile 390px zero-overflow check) (15.4s)

## Previous Result
- ปรับ Document Workspace ให้ตรงกับ AIVA Web Portal Mockup v4.4 Release โดยตรง (คิว 370px, ส่วนหัว .dh, แถบสเต็ป .flow, แท็บ 5 แท็บ, Exception Cards .ex, แถบ Sticky Action Bar .bar)
- เพิ่ม explain/resubmit/rerun/return/reject/hold/confirm แบบ persistent โดยผลตรวจ snapshot ไม่ถูกแก้ไข

## Outside this task
- Entra user/company/receiver RBAC และ account mapping
- AP submission/post และการรัน OCR/Oracle จริง
- DMS signed sessions/watermark, PostgreSQL/Alembic production runtime
