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


### `WORK-20261002-007` — Extend synthetic invoice corpus to 155 PDFs with engine-derived answer key
- Timestamp: `2026-10-02T18:40:00+07:00`
- ศึกษา `app/core/rules.py` และ `app/services/pipeline.py` เพื่อทำ replay path ที่เหมือน production ทุกขั้น รวมถึง branch ที่ skip Oracle (E28) และ skip STEP 3 (E17/E35/safety cap)
- ออกแบบ 100 เคสใหม่จากข้อมูล Oracle จริงใน `_raw/` โดยสร้าง `Picker` ที่เลือก receipt group แบบ deterministic (ใช้ครบทุก group ก่อนใช้ซ้ำ) และ scenario พิเศษ: ไม่มีใบรับ, หลายใบรับภายใต้ PO เดียว, price-swap, 50-row safety cap
- ให้ engine เป็นผู้ผลิต expected_result ทั้งหมด แล้วเพิ่ม invariants ตรวจผลรายหมวด (F ต้อง Auto-pass, I ต้อง intercompany=true, H ต้องมีหลาย code ฯลฯ) และ warn เมื่อ description รายงาน code น้อยกว่าจริง
- รัน `verify_dataset.py --fix` พบ drift 30 รายการของ wave 1 (ส่วนใหญ่คือ `halted_by` ที่เขียนเองและ E31 ที่เกิดพร้อม E34/E06) และ recalibrate จน drift = 0 / 155 เคส
- Render PDF ครบ 155 ไฟล์ (Tahoma, 3 layout, watermark/speckle, ต่อบัญชี 2 หน้า) และรัน `check_pdfs.py` ผ่าน 155 ไฟล์ 157 หน้าไม่มี mismatch
- ตรวจภาพจริง 3 หน้าด้วย pypdfium2 + Pillow: อักษรไทยถูกต้อง, watermark ไม่บังข้อมูล, พื้นที่ลายเซ็นผู้รับว่างตามเคส E26, หน้าต่อ (continuation) แสดงหัวเอกสารและเลขหน้า
- ติดตั้ง `fpdf2` และ `pypdf` ใน `.venv` ของ service เพื่อรันชุดทดสอบ (ไม่ถูกเพิ่มใน `requirements.txt` ของ production)
- ไม่มี commit, push หรือการเรียก Oracle/LiteLLM/Paperless จริง

### `WORK-20261002-008` — Wire the invoice corpus into an offline pytest gate
- Timestamp: `2026-10-02T19:05:00+07:00`
- เปลี่ยน `check_pdfs.py`/`verify_dataset.py` จาก script ล้วนเป็น module ที่ import ได้ (`audit(dataset)`, `verify(dataset, fix)`) โดยคง CLI เดิมไว้ แล้วสร้าง `tests/test_invoice_corpus.py` 7 test ครอบคลุม shape, engine drift, coverage, wave-2 invariants และ PDF ↔ key
- เพิ่ม `pytest.ini` + `tests/conftest.py` และ marker `live` เพื่อให้ `python -m pytest` รันเฉพาะชุด offline (ผลลัพธ์ `9 passed, 2 deselected in ~1.7s`) และรันจาก repo root ได้ผ่าน conftest path setup
- เขียน mutation check 4 แบบ (โกหกว่าฟิลด์หาย, โกหกว่าฟิลด์มี, โกหกจำนวนหน้า, โกหก decision) เพื่อยืนยันว่า gate ไม่ใช่ test เปล่า — พบว่า branch "ฟิลด์ที่ต้องหาย" ไม่ทำงานกับ wave 1 จึงแก้ให้ไปอ่านค่าจริงจาก `_raw` แล้วตรวจซ้ำผ่านทั้งหมด
- อัปเดต `OCR service/n8n/README.md` (หัวข้อ Offline Regression Suite) และ `tests/test_invoices/README.md` (หัวข้อ CI gate)
- ไม่มี commit/push และไม่มีการเรียก endpoint ภายนอก

## 2026-10-02 (รอบเย็น: n8n workflow)

### `WORK-20261002-009` — อัปเดต n8n workflow เป็น v6.5 ให้ตรงกับ Python engine ผ่าน MCP
- Timestamp: `2026-10-02T20:20:00+07:00`
- ตรวจสอบว่า `aiva-n8n` MCP ใช้งานได้ (connected + authenticated, 52 tools) แล้ว export workflow `aLUCmn3l0bZDjbVV` ตัวจริงลงมาอ่านทั้ง 23 nodes ก่อนแก้
- อ่าน `app/core/rules.py`, `app/services/oracle_mcp.py`, `pipeline.py`, `vision_extractor.py`, `portal.py`, `paperless.py`, `master_data_service.py` ทั้งไฟล์ เพื่อเทียบ parity กับ n8n ทีละ node แล้วเก็บ JS ต้นฉบับไว้ที่ `tmp/nodes/*.js`
- ยืนยัน SQL shape ด้วย MCP `oracle` (`oracle_sql_run`): invoice `112603974` ไม่ปรากฏใน `RCV_INV_NUM` (primary query คืน no rows) แต่ branch `PO_NUM='40121195'` คืนแถว → จึงใช้ `(Invoice+Tax) OR (PO_NUM)` ในคำสั่งเดียว และ scalar `SUPPLIER_IS_INTERNAL` จาก `financials_system_params_all` ตรวจ intercompany (tax `0145556001111` คืน 1)
- อัปเดตด้วย `aiva-n8n_update_workflow` หลาย-call (atomic): `N2.4`, `HTTP Request`, `N4`, `N7` (jsonBody), `N7.1`, `N8`, `N9`, `N10`, `N12` (settings + options), `N13` และเปลี่ยนชื่อ workflow เป็น `AIVA PO-INV Matching Verification v6.5`; คง `N5`/`N11` ไว้เพราะตรงกับ Python แล้ว
- พบว่า `setNodeParameter.path` สัมพัทธ์กับ `parameters` ทำให้ call แรกเขียน code ลง `parameters.parameters.jsCode` — แก้โดยเขียน path เป็น `/jsCode`, `/jsonBody`, `/options` และล้างค่าค้างด้วย `value: null` แล้ว export ซ้ำเทียบ byte-for-byte: **7 jsCode + N7 jsonBody ตรงกับไฟล์ต้นฉบับทุกตัวอักษร**
- ตรวจ `jsCode` ทั้ง 12 Code nodes ด้วย `node --check` (ผ่านทั้งหมด) และเขียน harness `tmp/run_flow_sim.js` ที่ **รัน jsCode ที่ export จาก workflow จริง** กับ input จำลอง 7 เคส: Auto-pass, PO fallback, E28 bypass, E17, E06, E35, intercompany+E26 — ผลตรงกับ Python ทุกเคส และผ่าน N11 Schema Validate ครบ
- แก้ `OCR service/n8n/n8n flow structure.md` เป็น v6.5: ตารางสิ่งที่เปลี่ยน, หลักการ D2/D3, ผัง mermaid, ตาราง node 8/9/13/14/15/17/20/21, SQL section ใหม่ (dual branch + โหมด `INVOICE/PO_FALLBACK/PO/NONE` + ข้อจำกัด `ORA-01791`), กฎ V-07, Python↔n8n Parity Map, ผล regression test และบันทึกข้อควรระวังของ MCP tool
- Workflow ยัง `active: false` จึงไม่มีผลกระทบ production ระหว่างแก้; ไม่มีการเรียก LiteLLM/Paperless/Portal จริง และไม่มี commit/push ในรอบนี้
- ก่อน commit: สร้าง `.gitignore` ของ repo (กัน archive, `tmp/`, `.pi/`, `.mcp.json`, ไฟล์ผลรัน batch ที่มีข้อมูล invoice จริง และ corpus ที่สังเคราะห์จาก Oracle extract) และเพิ่ม module-level skip ใน `tests/test_invoice_corpus.py` เพื่อให้ clone ที่ยังไม่มีข้อมูล corpus รัน pytest ผ่าน — ตรวจจริงทั้งตอนมีข้อมูล (`9 passed, 2 deselected`) และตอนถอดข้อมูลออก (`2 passed, 1 skipped`)

## 2026-10-02T20:55:00+07:00 — TASK-20261002-009: Comprehensive .gitignore for Company Sensitive Data & Push to Remote

- สำรวจความเสี่ยงข้อมูลความลับขององค์กรที่อาจหลุดขึ้น Git Repository: Environment variables, credentials/API keys, private keys, SSL certificates, Oracle database artifacts (wallet, net configs, sqlnet, tnsnames, dumps), ข้อมูลการเงิน/ใบแจ้งหนี้จริง (PDFs, Excel spreadsheets, CSV extracts), batch run reports/failed payloads, n8n automation local states, Python/Node runtime artifacts, IDE/Agent workspace files, OS metadata และ logs
- ยกระดับ root .gitignore ให้เป็นชุดกฎที่ครอบคลุม 12 หมวดหมู่อย่างสมบูรณ์ พร้อมจัดหมวดหมู่อย่างเป็นระเบียบ และกำหนดข้อยกเว้นสำหรับ template (!.env.example) และ mock test fixture (!invoice-web/examples/invoice.pdf)
- ตรวจสอบยืนยันด้วย git check-ignore -v เทียบกับ pattern จำลอง 25+ รายการ (.env, *.key, *.pem, *.pfx, cwallet.sso, tnsnames.ora, *.db, *.dmp, *.pdf, *.xlsx, *.csv, *.log, *.zip, .DS_Store, Thumbs.db) พบว่าถูก ignore ถูกต้อง 100%
- ตรวจสอบยืนยันว่า invoice-web/examples/invoice.pdf และ .env.example ไม่ถูก ignore (exit code 1)
- รัน regression tests ยืนยันว่าระบบทำงานปกติ:
  - OCR service/n8n/.venv/Scripts/python -m pytest: 9 passed, 2 deselected in 1.28s
  - invoice-web/backend unittest: 15 passed in 2.332s
- ปรับปรุง canonical records: gent/current-state.md, gent/task-plan.md, gent/changelog.md, gent/work-log.md, gent/sessions/2026-10-02-009-comprehensive-gitignore-sensitive-data.md
- เตรียม commit และ push สู่ origin/main
