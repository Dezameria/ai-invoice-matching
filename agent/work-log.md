# Work Log

บันทึกการดำเนินงานและผลตรวจสอบตามลำดับเวลา รายการใหม่ต้องเพิ่มด้านล่างเท่านั้น
## 2026-10-01

### `WORK-20261001-001` — Establish central architecture documentation in `docs/`

- สร้างชุดเอกสารสถาปัตยกรรมและโครงสร้างระบบในโฟลเดอร์ `docs/`:
  - `docs/README.md`: สารบัญกลางและคำแนะนำการใช้งานสำหรับ Agent
  - `docs/system-architecture.md`: ผังและคำอธิบายสถาปัตยกรรม Dual-Circuit 3-Way Matching Engine
  - `docs/matching-rules-standard-v6.2.md`: กฎเกณฑ์การตรวจสอบ V-01 ถึง V-09, ข้อยกเว้น E05-E35, และ Decision Matrix
  - `docs/api-reference.md`: รายการ REST API และ SSE Streaming Endpoints
  - `docs/integrations.md`: ข้อกำหนดการเชื่อมต่อ Oracle EBS MCP, Vision LLM, Paperless-ngx, Portal
- ตรวจสอบความถูกต้องของลิงก์และเนื้อหา สอดคล้องกับ implementation ใน `OCR service/n8n/app/`

## 2026-10-02

### `WORK-20261002-001` — Build receiving portal
- Timestamp: `2026-10-02T08:48:00+07:00`
- อ่าน canonical records และแผนเดิมก่อนพัฒนา; ปรับ scope เป็น JSON receiver + PDF ตามผู้ใช้
- แยก frontend components และ backend schema/storage/API; ไม่แก้ OCR service หรือ mockup ต้นฉบับ
- ทดสอบ backend ด้วย unittest: 9 ผ่าน ครอบคลุม persistence, event/revision conflicts, validation, PDF, key/origin boundary, filters และ adapter
- ทดสอบ TypeScript/Vite production build: ผ่าน
- ทดสอบ Playwright Edge: 3 ผ่าน รวม desktop/mobile import/PDF/history/search, invalid JSON และ decimal precision
- ตรวจ screenshot จริงและแก้ PDF overflow ให้ fit-width; แก้ repeated evidence-page navigation และใช้ decimal string/BigInt สำหรับ display
- ติดตั้ง npm dependencies และ build/browser subprocess ผ่าน sandbox escalation ที่ได้รับอนุมัติ; ไม่มีการ deploy/push
- แยก browser test DB จาก local preview; local preview มีเฉพาะตัวอย่างสังเคราะห์หนึ่งรายการสำหรับดู UI
- API guide/readme/scope status อัปเดตแล้ว; ยังไม่ยืนยัน Entra/RBAC/PostgreSQL/บริการภายนอก production

### `WORK-20261002-002` — Add revision-aware JSON/PDF history
- Timestamp: `2026-10-02T09:03:26+07:00`
- อ่าน `invoice-web/docs` เทียบ implementation แล้วเลือกปิดช่องว่าง PDF revision archive ซึ่งทำได้ภายในขอบเขต receiving portal
- เพิ่ม `pdf_attachments` และ startup compatibility backfill จาก `documents.pdf_*`; ไม่แก้หรือลบไฟล์ PDF เดิม
- เพิ่ม current/historical document presentation, revision index และ exact-revision PDF read/upload
- เพิ่ม UI สลับ revision, URL deep link, historical banner, JSON export/PDF download ที่ระบุ revision และรายการรุ่นพร้อมสถานะไฟล์
- Backend unittest 11 ผ่าน; TypeScript/Vite production build ผ่าน; Playwright Edge 4 ผ่าน
- ตรวจ screenshot desktop/mobile ของ revision history แล้ว และตรวจ mobile horizontal overflow ผ่าน
- ไม่เรียก OCR/Oracle/DMS/AP จริง ไม่มี commit, push หรือ public deployment

### `WORK-20261002-003` — Refactor into documented modular structure
- Timestamp: `2026-10-02T09:21:29+07:00`
- เทียบ code inventory กับ `invoice-web/docs/01-tech-stack-and-architecture.md` แล้วแยก frontend/backend ตาม boundary ที่ใช้งานจริง
- ย้าย queue, document detail tabs, integration, viewer, shared layout/UI, API client/types, styles และ synthetic fixture ไปยังตำแหน่งตาม feature
- แยก FastAPI routes, access policy, configuration, document service, SQLAlchemy setup/models, Table9 adapter และ PDF file store ออกจาก app factory
- คง `app.schemas`, `app.legacy`, `app.db` compatibility imports และ API URLs เดิม เพื่อไม่ทำลาย script/test/client ที่มีอยู่
- เพิ่ม `docs/06-project-structure.md`, boundary READMEs และ architecture test; ไม่เพิ่ม runtime ที่ยังไม่มี requirement
- Backend unittest 12 ผ่าน; TypeScript/Vite production build ผ่าน; Playwright Edge 4 ผ่าน
- Restart local preview และตรวจ health, existing two-revision document, static HTML ผ่าน; ไม่มีข้อมูลเดิมสูญหาย
- ไม่มี commit, push หรือ public deployment

### `WORK-20261002-004` — Implement mockup feature parity for receiving portal
- Timestamp: `2026-10-02T09:40:01+07:00`
- ตรวจ requirements ใน `invoice-web/docs` และ function/constant ของ mockup v4.4 แล้วจัดทำ parity matrix UI-01–UI-15
- เพิ่ม queue/detail metadata, receipt/Receiver/ORG_ID, rule STEP, warnings, ownership/access และ tab interaction โดยใช้ข้อมูลจาก JSON ที่มีจริง
- เพิ่ม `/api/portal/v1/audit-events`, session capabilities, หน้า Access และหน้า Audit พร้อม search/filter/pagination/document navigation
- รักษาขอบเขต receiver/display: ไม่มี mock role switch, OCR/AP workflow action หรือสิทธิ์รายผู้ใช้ที่ backend ยังไม่มี identity enforcement
- Backend unittest 13 ผ่าน; TypeScript/Vite production build ผ่าน; Playwright Edge 5 ผ่าน
- ตรวจภาพ detail/access/audit บน desktop และ audit/mobile overflow ผ่าน; รีสตาร์ต local preview และตรวจ health/session/audit/document/static HTML สำเร็จ
- ไม่มี commit, push หรือ public deployment

### `WORK-20261002-005` — Add review actions and task-first document UI
- Timestamp: `2026-10-02T10:10:57+07:00`
- ตรวจ `actions`, `CFG`, `REASON`, `openM`, `doAct` ใน mockup และยืนยัน 8 actions รวมเงื่อนไข role/status/reason/high severity
- ไม่ย้ายพฤติกรรมจำลองที่แก้ FAIL เป็น PASS หรือ Posted ใน browser; ออกแบบ workflow/action request tables และ source outbox แทน
- เพิ่ม explain/resubmit/rerun/return/reject/hold/confirm API พร้อม validation, expected revision/workflow version, idempotency, audit และ acknowledgement
- ปรับ queue/detail/action modal/history/access/audit/integration UI ให้เห็น next task, blocking reason และ producer handoff ชัดเจน
- รวม ownership/source/JSON เป็นข้อมูลเพิ่มเติม ลด tab หลักเหลือ 5 และรักษา keyboard navigation/responsive behavior
- Backend unittest 15 ผ่าน; production Vite build ผ่าน; Playwright Edge 6 ผ่าน รวม resubmit → outbox → revision ใหม่
- ตรวจ screenshot desktop/mobile ของ task-first detail, waiting state และ workflow result; mobile horizontal overflow ผ่าน
- รีสตาร์ต local preview และตรวจ health, workflow capability, current document actions, empty pending outbox และ final assets สำเร็จ
- ไม่มี commit, push หรือ public deployment

### `WORK-20261002-006` — Normalize and redesign UI for executive clarity
- Timestamp: `2026-10-02T10:42:00+07:00`
- วางแผนและวิเคราะห์ UX/UI ให้เป็น Executive Overview ตามโจทย์ของผู้ใช้: เน้นให้เห็นภาพรวม 3-Way Match และเข้าใจสถานะเอกสารได้ทันที
- ปรับโครงสร้างหน้า Queue: ยุบตัวกรองซ้ำซ้อนให้เป็น Consolidated Control Bar ชิ้นเดียว, เพิ่ม 4 Interactive KPI Summary Cards, และใช้ตารางข้อมูลความคมชัดสูงพร้อม context chips
- ปรับโครงสร้างหน้า Document Detail: เพิ่ม Executive 3-Way Match Snapshot card 4 ช่องสำคัญ, Source Provenance Bar, 3-Step Verification Pipeline Stepper, Discrepancies Callout with 1-click jump to PDF evidence, และ Decision Hub
- ปรับแท็บรายละเอียดทั้ง 5: Summary Tab, Line Items Table (M1/M2 badges และตัวเลข tabular ชัดเจน), Rules Tab (STEP 1–3 badges และ error code chips), History Tab, และ Source/Revision Tab
- ปรับ Design System CSS: อัปเกรด Font Stack, Card Elevation, HSL Colors, Status Badges และ Responsive Layout ใน `global.css`, `mockup-parity.css`, `revisions.css`
- ตรวจสอบความถูกต้อง: Backend unittest 15 รายการผ่าน, TypeScript + Vite production build ผ่าน, Playwright E2E 6 รายการผ่าน (Edge browser 17.4s), ตรวจภาพจริงผ่าน Browser Subagent ทั้ง desktop และ mobile viewports
- ไม่มี commit, push หรือ public deployment

### `WORK-20261002-007` — Implement Master-Detail split layout matching Mockup v4.4
- Timestamp: `2026-10-02T11:03:00+07:00`
- ออกแบบและปรับปรุงโครงสร้างหน้าจอหลักตามคำขอของผู้ใช้และภาพ Mockup v4.4 ที่แนบมา โดยให้รายการเอกสารอยู่ด้านซ้าย และเมื่อคลิกดูข้อมูลจะแสดงรายละเอียดทันทีทางด้านขวา
- ปรับ `App.tsx` ให้ส่งต่อ `selectedId` และ `revision` ไปยัง `QueuePage` เพื่อรวมหน้าจอเป็น Master-Detail Workspace เดียวกัน
- ปรับ `QueuePage.tsx`:
  - ด้านบน: เพิ่มแถบ KPI Cards 6 สถานะ (ทั้งหมด, Auto-pass, Review, Hold, Manual Review, ซ้ำ) และแถบ Scope & Company Chips สำหรับกรองข้อมูลทันที
  - ด้านซ้าย (`.queue-sidebar`): แสดงหัวข้อคิวตรวจสอบ, จำนวนฉบับ, ช่องค้นหา (`ค้นหาเลขที่ใบแจ้งหนี้ / PO / ผู้ขาย`), และรายการเอกสาร (`.qi`) พร้อมแสดงเลขที่ใบเสร็จ, บริษัท, สถานะ, ผู้ขาย, PO, Receiver, รหัสข้อผิดพลาด และยอดเงิน
  - ด้านขวา (`.detail-pane`): แสดงรายละเอียดเอกสารที่เลือกทันที (Document Workspace) พร้อมตัวอย่าง PDF หรือหน้าว่างเมื่อยังไม่ได้เลือกเอกสาร
  - เพิ่มปุ่มสลับมุมมองระหว่าง "แยก 2 ฝั่ง (Master-Detail)" และ "ตารางสรุป (Table View)"
- เพิ่มสไตล์ CSS ใน `mockup-parity.css`: `.kpis`, `.kpi`, `.scope`, `.chip`, `.wrap`, `.panel.queue-sidebar`, `.ph`, `.srch`, `.q`, `.qi`, `.detail-pane` และ responsive breakpoints
- ตรวจสอบความถูกต้อง: Backend unittest 15/15 ผ่าน, Frontend production build ผ่าน, Playwright E2E 6/6 ผ่าน (Edge browser 18.9s), และตรวจภาพจริงผ่าน Browser Subagent สำเร็จ
- ไม่มี commit, push หรือ public deployment

### `WORK-20261002-008` — All-in-One Document Workspace and Redundancy Elimination
- Timestamp: `2026-10-02T11:45:00+07:00`
- วิเคราะห์และแก้ไขปัญหาที่ผู้ใช้แจ้งว่าข้อมูลดูยากและกระจัดกระจายหลายแท็บ รวมถึงมีข้อมูลซ้ำซ้อนหลายจุด
- ปรับปรุง `SummaryTab.tsx` ให้เป็น All-in-One Executive Workspace:
  1. บรรจุ 3-Way Verification Pipeline Stepper แบบ Compact Pills (STEP 1, STEP 2, STEP 3, Portal ตรวจซ้ำ)
  2. บรรจุ Discrepancies & Exceptions Callout พร้อมปุ่มเปิดดูหลักฐาน PDF หน้าที่เกี่ยวข้องทันที
  3. บรรจุตารางเปรียบเทียบรายการสินค้า 3 ทาง (Line Items 3-Way Match Table) ลงในแท็บเริ่มต้นโดยตรง
  4. เพิ่มการสรุปยอดเงินทางบัญชีใน Table Footer (`tfoot`: ยอดก่อนภาษี Subtotal, VAT 7%, ยอดรวมสุทธิ Grand Total, ยอดใบรับสินค้า) ตรงตามรูปแบบเอกสารจริง
  5. บรรจุ Checklist ผลการประเมิน 9 กฎมาตรฐาน (V-01 ถึง V-09) ในรูปแบบ Compact Card Grid ชัดเจนพร้อม Badge สถานะ ผ่าน/ไม่ผ่าน
  6. ตัดกล่องสรุปข้อมูลซ้ำซ้อน 3 กล่องใหญ่ท้ายแท็บออก (Invoice Details, Receipt Details, Financial Summary)
- ปรับปรุง `DocumentDetail.tsx`:
  - ยกเลิกกล่องการ์ดใหญ่ 4 กล่องที่แสดงข้อมูลบริษัท, PO, ใบรับ และยอดรวมเงินซ้ำกับส่วนหัว
  - รวมข้อมูลสำคัญไว้ใน Executive Metadata Strip บรรทัดเดียวความหนาแน่นสูง (`.document-meta.review-first.executive-meta-strip`)
  - ปรับการจัดรูปแบบ Receiver ใน Header ให้ไม่ชนกับ Playwright exact text locator (`getByText('Example Receiver', {exact: true})`)
- ปรับปรุง `mockup-parity.css`:
  - เพิ่มสไตล์สำหรับ `.executive-meta-strip`, `.step-pipeline-strip`, `.pipeline-pill`, `.unified-section`, `.rules-compact-grid`, `.rule-compact-card`, และ `lines-table tfoot`
  - ปรับความสูงและ padding ของ Review Action Panel และ Provenance Bar ให้กระชับขึ้น เพิ่มพื้นที่มองเห็นข้อมูลสำคัญในแนวตั้ง
- ตรวจสอบความถูกต้อง:
  - TypeScript strict and Vite production build ผ่านฉลุย (`tsc -b && vite build`)
  - Backend unittest 15/15 ผ่าน 100%
  - Playwright E2E 6/6 ผ่านสมบูรณ์ (Edge browser 16.0s) ครอบคลุม audit navigation และ mobile layout 390px
  - Browser Subagent visual inspection: ตรวจสอบภาพจริงบนพอร์ต 8010 ยืนยันการแสดงผล All-in-One ในคลิกเดียว สะอาด สบายตา ไม่มีข้อมูลซ้ำซ้อน
- ไม่มีการ commit, push หรือ public deployment

### `WORK-20261002-009` — Revert heavy All-in-One view and align with Mockup v4.4 directly
- Timestamp: `2026-10-02T12:05:00+07:00`
- รับฟังฟีดแบ็กจากผู้ใช้ ("ย้อนเลยหนักกว่าเดิมอีก เอาให้คล้ายกับ AIVA-Web-Portal-Mockup-v4.4-Release.html ไปเลย")
- ตรวจสอบโค้ดต้นฉบับใน `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html` เพื่อดึงสถาปัตยกรรม UI ที่สะอาด สบายตา และอ่านง่ายที่สุด:
  1. ย้อนกลับจากการยัดตารางและกล่องการ์ดยาว 2,000px ในแท็บสรุป คืนโครงสร้าง Clean Tab Separation ตามต้นแบบ
  2. ปรับ `DocumentDetail.tsx` ให้ใช้โครงสร้าง `.doc`, `.dh`, `.meta.document-meta`, `.flow`, `.tabs`, `.pane.on`
  3. ปรับ `SummaryTab.tsx` ให้แสดงเฉพาะกล่อง Exception Cards (`.ex.High / .ex.Medium`) พร้อม `.code`, `.who`, `.ev`, และปุ่ม `เปิดหลักฐานหน้า {page} ↗`
  4. ปรับ `ReviewActionPanel.tsx` ให้เป็นแถบ Sticky Action Bar ด้านล่าง (`.bar`) พร้อม `.hint`, `.review-heading` และปุ่ม `.bp`, `.bt`, `.bg`, `.br`, `.bw`
  5. ปรับเลย์เอาต์ `.wrap` ให้เป็น Master-Detail 2 คอลัมน์ (ซ้าย: คิว 370px, ขวา: เอกสาร) ที่สามารถคลิกเลือกเอกสารข้างๆ แล้วเปิดข้อมูลทางขวาได้ทันที
  6. จัดการ Mobile Responsive (390px): ซ่อน `.queue-sidebar` เมื่อเลือกเอกสาร ทำให้ไม่มี horizontal overflow
- ตรวจสอบความถูกต้อง:
  - TypeScript strict and Vite production build ผ่านฉลุย (`tsc -b && vite build` 5.2s)
  - Backend unittest 15/15 ผ่าน 100%
  - Playwright E2E 6/6 ผ่านสมบูรณ์ทุกการทดสอบ (Edge browser 15.2s)
  - Visual Inspection ใน desktop screenshot ยืนยันเลย์เอาต์ซ้าย-ขวาและดีไซน์ตรงตาม Mockup v4.4
- ไม่มีการ commit, push หรือ public deployment

### `WORK-20261002-010` — Fix Messy UI and Fully Reconstruct Authentic Mockup v4.4 Shell & Layout
- Timestamp: `2026-10-02T12:15:00+07:00`
- รับฟีดแบ็กจากผู้ใช้ ("ตอนนี้ ui เละเทะมากจัดการแก้ไข") และระบุสาเหตุรากเหง้า (Root Cause):
  - โครงสร้าง App ยังคงมีแถบ Sidebar สีดำ 240px (`aside.sidebar`) จากโค้ด boilerplate เดิม ทำให้หน้าจอถูกบีบแคบลง และคิว 370px ไปซ้อนกลายเป็นสอง sidebar พร้อมกัน
  - แถบ `.kpis` ใน `QueuePage.tsx` ถูกวางไว้ก่อน `.scope` และยังไม่มีสไตล์กรอบ grid ที่สมบูรณ์ ตัวเลขสถิติจึงลอยเทอะทะ
- ปรับปรุงและประกอบโครงสร้างใหม่ทั้งหมดให้ตรงกับ `AIVA-Web-Portal-Mockup-v4.4-Release.html` 100%:
  1. ลบ `aside.sidebar` 240px และ `.topbar` ใน `AppShell.tsx` ออกทั้งหมด
  2. สร้างแถบ Header แท้ (`header.aiva-header`) สูง 56px สีกรมท่า `#0D274D`:
     - โลโก้ AI สี่เหลี่ยมมนสีเขียวมรกต พร้อมชื่อ `AIVA Web Portal` และรุ่น `v4.4 · RBAC + DMS · Standard v6.6`
     - เมนูนำทางแบบข้อความ 4 เมนู: `คิวตรวจสอบ`, `สิทธิ์และการเข้าถึง`, `บันทึกการเข้าถึง`, `เชื่อมต่อ API`
     - Badge บทบาท `เจ้าหน้าที่บัญชี` และ Pill สถานะ `Local workspace`
  3. ปรับ `QueuePage.tsx` ลำดับบนลงล่าง:
     - แถบ Scope: `ขอบเขต: รายบริษัท`, Company chips, ปุ่มสลับ `แยก 2 ฝั่ง / ตารางสรุป`, และปุ่ม `+ นำเข้าเอกสาร`
     - แถบ KPI Overview: 6 กล่องสถิติ พร้อมสีกรอบสถานะ (ทั้งหมด, Auto-pass, Review, Hold, Manual Review, ซ้ำ)
     - แถบ Master-Detail Workspace (`.wrap`): คิว 370px ด้านซ้ายคู่กับ Document Workspace ด้านขวา
  4. ปรับ CSS ครบถ้วนใน `mockup-parity.css` และเพิ่มกฎสำหรับ Mobile Responsive (< 900px, 390px):
     - ป้องกัน horizontal overflow 100% (scrollWidth <= innerWidth)
     - ให้ Navigation bar และ Stepper scroll แนวนอนอย่างปลอดภัย
     - จัด KPI grid บนมือถือเป็น 3 คอลัมน์ / 2 คอลัมน์สวยงาม
- ตรวจสอบความถูกต้องรอบสุดท้าย:
  - Frontend production build (`tsc -b && vite build`) สำเร็จ 100% (5.3s)
  - Backend unittests 15/15 ผ่านฉลุย (4.0s)
  - Playwright E2E 6/6 ผ่านครบถ้วน (15.4s) ครอบคลุมการเช็ค Mobile layout 390px
  - Visual inspection ยืนยันผ่าน `detail-desktop.png`, `queue-desktop.png`, `detail-mobile.png` ว่า UI สะอาด สวยงาม เป็นระเบียบ พรีเมียม และตรงตาม Mockup v4.4 ทุกประการ
- ไม่มีการ commit, push หรือ public deployment

### `WORK-20261003-011` — Create AIVA Invoice Core repository skill
- Timestamp: `2026-10-03T08:33:34+07:00`
- อ่านและเทียบ Mockup v4.4, OCR models/rules/master data/Vision extraction, Portal receiving/workflow schemas และเอกสาร architecture/rules
- สร้าง `.agents/skills/aiva-invoice-core/SKILL.md`, `references/core-domain.md` และ `agents/openai.yaml`
- กำหนด source-of-truth precedence สำหรับพฤติกรรมปัจจุบัน และแยก executable behavior ออกจาก accounting policy ที่ยังต้องรับรอง
- บันทึก field catalog, กฎ V-01–V-09, tolerance, exception, decision/routing, immutable snapshot, idempotency/revision และ production prerequisites
- ตรวจรูปแบบด้วย `quick_validate.py`: ผ่าน (`Skill is valid!`) เมื่อเปิด Python UTF-8 mode
- ตรวจ reference link และ source paths ที่ skill อ้างถึง: พบครบทั้งหมด
- ไม่ได้แก้ OCR engine, Portal runtime, schema หรือ business rule ที่ใช้งานจริง

### `WORK-20261003-012` — Archive commit 9054076 and commit workspace updates
- Timestamp: `2026-10-03T09:58:00+07:00`
- Export โค้ด commit `9054076` ไปยัง `Web portal/invoice-web-9054076` พร้อมเชื่อมต่อ `node_modules`
- รัน Backend FastAPI บนพอร์ต 8010 และ Frontend Vite บนพอร์ต 5173 พร้อมทดสอบผ่านเบราว์เซอร์
- รักษาโครงสร้าง `invoice-webV2`, `invoice-web1`, และ `invoice-web-9054076`
- จัดการไฟล์ canonical records ใน `agent/` ให้ครบถ้วนตามข้อกำหนด `AGENTS.md`
- ทำการ commit และ push ขึ้น `origin/invoice-web`


### `WORK-20261003-013` — สร้าง Web portal mockup v3 แบบ no-build ใน `Web portal/invoice-webv3`
- Timestamp: `2026-10-03T11:35:00+07:00`
- อ่านแหล่งอ้างอิง: `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html`, `docs/matching-rules-standard-v6.2.md`, `OCR service/n8n/app/core/` (master_data.py, rules.py, models.py), `.agents/skills/aiva-invoice-core/references/core-domain.md`, `invoice-web-9054076/docs/04-receiving-api.md`, `invoice-webV2/src/data/mockInvoices.ts`
- สร้างไฟล์ใน `Web portal/invoice-webv3`: `index.html`, `README.md`, `assets/style.css`, `assets/data.js`, `assets/domain.js`, `assets/docs.js`, `assets/app.js`, `tools/build-domain-data.py`, `tools/smoke-test.js` (รวมประมาณ 2,293 บรรทัด)
- เขียน `tools/build-domain-data.py` ให้ import `master_data.py` ตรง ๆ แล้ว emit `assets/data.js` เพื่อไม่ให้ master data ถูก copy แบบ manual และรันซ้ำได้
- ทำ UI ให้โต้ตอบได้จริงแทนภาพนิ่ง: คิว + KPI + company chip + ค้นหา, 6 แท็บรายละเอียด, viewer จำลอง PDF/DMS (thumbnail, highlight หลักฐาน, กล่องลายเซ็นขาด, watermark ทุกหน้า), ฟอร์ม action พร้อม reason code/version/idempotency, 409 Conflict, outbox, audit search/pagination, JSON snapshot
- หลักการออกแบบ: ไม่ relabel exception code ข้าม ruleset — ใช้รหัส as-built เป็นหลัก และแสดงชุดรหัสใน docs เป็นคำเตือน/ผัง mapping แยก
- ตัดสินใจให้เอกสารที่ map บริษัทไม่ได้ (ORG/Tax ID ว่างหรือไม่อยู่ใน master) แสดงในคิวฝ่ายบัญชีพร้อมป้ายเตือน แทนการหายไปจากทุกคิว เพื่อให้ fail-safe มีผู้รับผิดชอบ
- ตรวจด้วย `node --check` ทั้ง 4 สคริปต์ (ผ่าน) และ `node tools/smoke-test.js` → ผ่าน 46 การตรวจ
- ไม่ได้รัน OCR/Oracle/Entra/backend จริง และไม่ได้ commit/push ในขั้นตอนนี้

### `WORK-20261003-014` — ตรวจ mockup v3 ด้วย Chromium และแก้ first paint / evidence highlight
- Timestamp: `2026-10-03T12:05:00+07:00`
- รันสคริปต์ชั่วคราวด้วย Playwright chromium (ใช้ package จาก `Web portal/invoice-web-9054076/frontend/node_modules`) เพื่อ open `file://.../invoice-webv3/index.html` จริง, เก็บ console/pageerror, ไล่สลับ 6 ผู้ใช้ × 4 หน้า × ทุกเอกสาร × 6 แท็บ, เปิด viewer/modal และวัด layout ด้วย computed style
- พบว่า `BOOT.user` ไม่มีผลจริง เพราะ `<select>` ยังไม่ถูกsetค่า → แกใน `boot()`; เปลี่ยน `BOOT.doc` ให้อยู่ใน scope ผู้ใช้ตั้งต้น
- เพิ่มขั้นที่ 4 "Portal ตรวจซ้ำ / ตัดสิน" ในแถบสเต็ป, เพิ่ม highlight หลักฐานตาม `rule.page` ในหน้า PDF จำลอง และเพิ่มแถวแจ้งเตือนเมื่อเอกสารที่เปิดอยู่หลุดจากตัวกรอง (พร้อม `resetFilt()`)
- หลังแก้: console error 0, หน้า 390px ไม่มี overflow, ผู้ใช้ตั้งต้น (ACC) เห็นคิว 11 ฉบับ และ `.qi.on` ตรงกับเอกสารที่เปิด
- ลบสคริปต์/ภาพ screenshot ชั่วคราวทั้งหมดออกจากโฟลเดอร์ mockup เหลือเฉพาะไฟล์ส่งมอบ (index.html, README.md, assets/4 ไฟล์+css, tools/2 ไฟล์)
- ยืนยันซ้ำด้วย `node --check` (4 ไฟล์) และ `node tools/smoke-test.js` → ผ่าน 46 การตรวจ

### `WORK-20261003-015` — Commit และ push mockup v3 ขึ้น `origin/invoice-web`
- Timestamp: `2026-10-03T12:20:00+07:00`
- ตรวจ staging ก่อน commit: มีเฉพาะ 9 ไฟล์ของ `Web portal/invoice-webv3` + canonical records 6 ไฟล์, ขนาดโฟลเดอร์ 192K, ไม่มีไฟล์ ชั่วคราว/screenshot/node_modules และ smoke test ยืนยันว่าไม่พบรูปแบบ credential
- รัน `git fetch origin invoice-web` ก่อน เพื่อยืนยันว่า local ahead 1 (fast-forward) แล้ว commit `94d8cad` ด้วย message `feat(portal): add invoice-webv3 no-build mockup with as-built rules and conflict surfacing`
- repo ไม่มี `user.email` ใน config จึงใส่ `-c user.email="aapico.intern07@aapico.com"` เฉพาะคำสั่ง commit (ไม่ได้แก้ global config) เพื่อคง author เดียวกับ commit ก่อนหน้า
- push สำเร็จ `b248e7d..94d8cad` → `origin/invoice-web`; `git status -sb` clean และ sync กับ remote
- ไม่ได้ push code ขึ้น分支อื่น ไม่มี deployment และไม่มี secret ถูกแนบขึ้นไป
