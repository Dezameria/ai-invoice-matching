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

