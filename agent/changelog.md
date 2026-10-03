# Changelog

บันทึกผลเปลี่ยนแปลงถาวรที่มีผลต่อผู้ใช้ ระบบ หรือวิธีดูแล repository รายการใหม่ต้องเพิ่มด้านล่างเท่านั้น
## 2026-10-01

### Added — `CHG-20261001-001`

- เพิ่มโฟลเดอร์ `docs/` สำหรับเป็นศูนย์กลางเอกสารสถาปัตยกรรมและโครงสร้างระบบ
- เพิ่มเอกสาร `docs/README.md`, `docs/system-architecture.md`, `docs/matching-rules-standard-v6.2.md`, `docs/api-reference.md`, และ `docs/integrations.md`

## 2026-10-02

### Added — `CHG-20261002-001`
- Timestamp: `2026-10-02T08:48:00+07:00`
- เพิ่ม AIVA receiving portal ใน invoice-web: React/TypeScript frontend และ FastAPI snapshot API
- JSON import/ingest, validation, idempotency, revision protection/history และ persistent SQLite storage
- PDF attachment/viewer พร้อม fit-to-width, zoom, page navigation, evidence links และ stale warning
- เพิ่ม source filters/KPI/detail tabs, integration docs, core Table9 converter, synthetic examples และ automated tests
- ปรับขอบเขตตามผู้ใช้ให้รับข้อมูลจากระบบอื่น ไม่มีการประมวลผล OCR/AP ภายใน Portal

### Added — `CHG-20261002-002`
- Timestamp: `2026-10-02T09:03:26+07:00`
- เพิ่ม PDF archive แยกตาม document revision พร้อม backfill metadata ของฐานข้อมูล pilot เดิม
- เพิ่ม revision index และ historical detail/PDF APIs โดย endpoint เดิมยังเปิด current document ได้
- เพิ่ม revision selector, historical banner, revision list และ deep link ที่คงรุ่นหลัง reload
- ปรับเอกสาร Receiving API/implementation status และหน้าคู่มือเชื่อมต่อให้ตรงกับพฤติกรรมใหม่

### Changed — `CHG-20261002-003`
- Timestamp: `2026-10-02T09:21:29+07:00`
- จัด frontend ตาม feature boundaries: app, API contract/client, shared components, queue, documents/tabs, viewer, integration, styles และ test fixtures
- จัด backend เป็น modular monolith: API routes, auth policy, core config, document domain, database bootstrap/models, adapters และ PDF storage
- ลด `backend/app/main.py` เหลือ application composition 49 บรรทัด โดยรักษา endpoint และ compatibility imports เดิม
- เพิ่ม workers/migrations/infra boundaries พร้อมข้อจำกัด และเพิ่มเอกสาร project structure/dependency direction
- เพิ่ม architecture regression check เพื่อป้องกัน entrypoint กลับเป็นไฟล์รวมขนาดใหญ่

### Added — `CHG-20261002-004`
- Timestamp: `2026-10-02T09:40:01+07:00`
- เพิ่ม mockup read-only parity ให้ receiving portal: company chips, receipt/Receiver/ORG_ID, PO/release, STEP ของกฎ, ownership/access และ 6 detail tabs
- เพิ่ม persistent global audit API/page ที่ค้นหา กรอง แบ่งหน้า และเปิดเอกสารต้นทางได้
- เพิ่มหน้า Access แสดง permission/capability ที่ระบบรองรับจริง พร้อม dependency ของ Entra/RBAC/Oracle/workflow/DMS ที่ยังไม่เปิดใช้
- เพิ่ม keyboard navigation/ARIA สำหรับ tabs, responsive styles และเอกสารเทียบ UI-01–UI-15 กับ mockup v4.4

### Added — `CHG-20261002-005`
- Timestamp: `2026-10-02T10:10:57+07:00`
- เพิ่ม workflow actions จาก mockup: ชี้แจง แก้ไขแล้วส่งตรวจซ้ำ สั่งตรวจซ้ำ ส่งกลับ ปฏิเสธ พัก และยืนยัน
- แยก workflow state จากผลตรวจต้นทาง พร้อม reason policy, optimistic version, idempotency และ persistent history
- เพิ่ม action outbox/acknowledgement สำหรับ producer และปิดคำขออัตโนมัติเมื่อได้รับ revision ใหม่
- ปรับ UI เป็น task-first: queue แสดงงานที่ต้องทำ, detail แสดง next action ก่อนผลตรวจ/PDF และรวมข้อมูลเทคนิคในแท็บข้อมูลเพิ่มเติม
- เพิ่มคู่มือ Task-first UX และอัปเดต API/parity/status docs ให้ตรง implementation

### Changed — `CHG-20261002-006`
- Timestamp: `2026-10-02T10:42:00+07:00`
- ปรับปรุงและ normalize UI ทั้งหมดใน `invoice-web` (Queue, Detail, 3-Way Match Stepper, Line Items, Actions, Tabs) เพื่อให้อ่านง่าย สบายตา และเห็นภาพรวมข้อมูลชัดเจนที่สุด
- ปรับหน้า Queue: รวมแถบควบคุมตัวกรองเป็น Consolidated Single Control Bar (Search, Company, Source, Status dropdowns, quick status pills, company chips) และเพิ่ม 4 Interactive KPI Cards สำหรับกรองสถานะทันที
- ปรับหน้า Document Detail: เพิ่ม Executive 3-Way Match Snapshot Card (Company, PO/Release, Goods Receipt, Grand Total), Source Provenance Bar, 3-Step Verification Pipeline Stepper, Discrepancies Callout พร้อม direct PDF evidence jump, และ Streamlined Decision Hub
- จัดระเบียบ Detail Tabs 5 หมวดหมู่: สรุป 3-Way Match, ตารางเปรียบเทียบรายการสินค้า M1/M2 พร้อมตัวเลข tabular, 9 กฎการตรวจพร้อม STEP badge และรหัสข้อผิดพลาด, Activity Timeline, และข้อมูลแหล่งที่มาพร้อมสลับ Revision
- อัปเกรด Design System ใน `global.css`, `mockup-parity.css`, `revisions.css` (Typography, HSL color tokens, card elevation, responsive layout ป้องกัน horizontal overflow) โดยรักษา selector และ ARIA attributes ให้ผ่าน Playwright E2E 100%


### Added — `CHG-20261002-007`
- Timestamp: `2026-10-02T18:40:00+07:00`
- เพิ่ม wave 2 ของชุดทดสอบ PDF สังเคราะห์ใน `OCR service/n8n/tests/test_invoices/`: `INV-F01`–`INV-J20` รวม 100 ไฟล์ (valid/tolerated 20, single-rule fail 25, multi-rule fail 25, intercompany 10, edge cases 20) ทำให้ corpus รวมเป็น 155 PDF + answer key
- เพิ่ม `invoice_engine.py`: เรียก Standard v6.2 rules engine จริง (Step 1–4) แบบ offline ด้วยชุดแถว Oracle ที่เก็บต่อ invoice ทำให้ expected_result ทุกตัวตรงกับ logic ของ production และทำซ้ำได้โดยไม่พึ่ง Oracle MCP
- เพิ่ม `build_test_dataset_wave2.py` (สร้าง 100 เคส + expectation จาก engine + self-check ระดับหมวด), `verify_dataset.py` (replay/recalibrate key ทั้ง 155 เคส), `check_pdfs.py` (ตรวจ PDF ↔ key), และ `tests/test_invoices/README.md` อธิบาย workflow
- ครอบคลุม rule path ที่เคยไม่มีใน corpus: V-04 E17 (ไม่มีใบรับ), V-04 E35 (หลายใบรับ), V-04 MANUAL 50-row safety cap, V-05 E09 ระดับ Medium (ที่อยู่/รหัสไปรษณีย์), V-06 E26 ระดับ Medium (ผู้ส่งของ), V-07 E12 (UOM) และ E29 (price ในกรอบ), boundary 0.50/1.00/1% และ forgery ที่ตรวจไม่พบโดยเจตนา 2 เคส
- `generate_invoices.py` รองรับ `pdf_hints` (scan noise/watermark, ต่อบัญชี 2 หน้า, เชิงอรรถหมายเหตุ, พิมพ์ `—` แทนฟิลด์ที่หาย) และ truncate รายละเอียดตามความกว้างคอลัมน์
- Recalibrate `expected_result` ของ wave 1 จำนวน 30 รายการให้ตรงกับ engine (`halted_by` ที่เขียนเองถูกยกเลิก, partial billing A09–A11 เป็น Hold พร้อม E31+E34, B13/B14 เพิ่ม E31) และบันทึก `recalibrated: engine-v6.2` ไว้ใน record

### Added — `CHG-20261002-008`
- Timestamp: `2026-10-02T19:05:00+07:00`
- เพิ่ม `OCR service/n8n/tests/test_invoice_corpus.py` เป็น offline regression gate ของ synthetic invoice corpus (replay 155 เคสผ่าน `app.core.rules`, ตรวจ key/PDF, ตรวจ wave-2 invariants และ code/decision coverage) — รันด้วย `python -m pytest` ใช้เวลา ~2 วินาที ไม่ต้องพึ่ง Oracle/LiteLLM
- เพิ่ม `pytest.ini` (testpaths=tests, deselect marker `live`) และ `tests/conftest.py` (กัน pytest เก็บ `test_suite.py` ที่เป็นสคริปต์ async + เพิ่ม path ของ corpus tooling)
- ให้ `tests/test_frontend_sse.py` 2 เคสที่ต้องยิง Paperless/LiteLLM จริงติด marker `live` ทำให้ค่าเริ่มต้นของ pytest เป็นชุดที่รันแบบ deterministic
- `check_pdfs.py` และ `verify_dataset.py` ถูกแยกเป็น function ที่ import ได้ (`audit`, `verify`) พร้อม mutation test ยืนยันว่าเครื่องมือจับ error ได้จริง 4 รูปแบบ
- Fixed: การตรวจ "ฟิลด์ที่ต้องหายต้องไม่อยู่ใน PDF" เดิมไม่ทำงานเลยกับ wave 1 (ไม่มี `oracle_rows` จึงเทียบค่ากับ dict ว่าง) — ตอนนี้ resolve ค่าต้นทางจาก `_raw/oracle_receipts.csv` ตาม `oracle_source.receipt_num` แล้ว และแก้ `document_flags` ที่เป็น None ให้ปลอดภัย

### Changed — `CHG-20261002-009`
- Timestamp: `2026-10-02T20:20:00+07:00`
- อัปเดต n8n workflow `aLUCmn3l0bZDjbVV` ผ่าน MCP `aiva-n8n_update_workflow` เป็น **v6.5** และเปลี่ยนชื่อ workflow เป็น `AIVA PO-INV Matching Verification v6.5` (23 nodes เท่าเดิม ไม่แก้ connection, สถานะ `active: false`)
- `N9: Code: STEP 3`: แทน Ladder M1–M4 แบบ "แถวแรกชนะ" ด้วย **8-Pass Greedy Bipartite Matcher** ตาม `app/core/rules.py::evaluate_step3` (P1 price+qty, P2 price tolerance 1%/≤200 + qty, P3 line amount เมื่อ subtotal ตรง, P4 item number + closest price, P5 price only, P6 desc similarity, P7 line number, P8 แถวที่เหลือ/reuse `active_rows[0]`) — ห้ามใช้แถวใบรับซ้ำ, เทียบ UOM ทั้งค่าดิบและ cleansed
- `N7: Oracle MCP rcv_v01` + `N7.1: Parse Oracle Receipts`: Oracle 1 round-trip เดียวด้วย `((RCV_INV_NUM/AP_INV_NUM IN (…) AND supplier tax) OR PO_NUM)` แล้ว N7.1 (port ของ `parse_csv_receipts`) เป็นผู้คัดเลือกแถว Invoice ก่อนเสมอ ถ้าไม่มีจึงใช้แถว PO → รายงาน `oracle_query_mode` = `INVOICE`/`PO_FALLBACK`/`PO`/`NONE`; ไม่ใช้ `NOT EXISTS` เพราะทำให้ view scan ทั้งก้อน (baseline ~60s)
- Intercompany เปลี่ยนจาก list hardcode เป็น scalar subquery `(SELECT COUNT(*) FROM apps.financials_system_params_all fsi WHERE fsi.vat_registration_num = '<supplier tax>') as SUPPLIER_IS_INTERNAL` ที่ N8 อ่านเป็น `rcvRows.some(r => r.SUPPLIER_IS_INTERNAL === true)`
- `N8`/`N10`: เก็บ `oracle_rows_all` (ทุกแถวที่ Oracle คืน) ไว้คู่กับ `oracle_rcv_rows` (แถว active) เพื่อให้ `oracle_data.receipts` ใน Table 9 ตรงกับ `pipeline.py`; ค่า default `po_type` แก้เป็น `Purchase Order`; E28 bypass คืน `{queried:false, reason:'Bypassed due to E28 Line Math Error', count:0, receipts:[]}`
- `N2.4` + `HTTP Request`: ใช้ `SYSTEM_PROMPT`/`EXTRACTION_GUIDE` ชุดเดียวกับ `app/services/vision_extractor.py` (รวมกฎ "ใช้น้ำหนักเป็น qty สำหรับเหล็ก/วัตถุดิบ") สร้างด้วย `join('\n')` เพื่อหนีบั๊ก escape `\n`, OCR fallback prefix, จำกัด 4 หน้า (`max_pages=4`), `temperature: 0`
- `N12: HTTP: POST Portal`: ตั้ง `onError: continueRegularOutput` + `alwaysOutputData: true` + `options.timeout: 15000` ให้เท่าพฤติกรรม `PortalClient` ที่ไม่เคย throw; `N13` รายงาน `portal_dispatch.status` (`SENT`/`FAILED`/`ERROR`) และบล็อก `paperless_update` พร้อม `checked_tag_id: 12`
- ไม่แก้ `N5: Code: STEP 1 Rules` และ `N11: Code: Schema Validate` เพราะตรรกะตรงกับ `evaluate_step1`/`validate_output` อยู่แล้ว
- เอกสาร `OCR service/n8n/n8n flow structure.md` ปรับเป็น v6.5 (สรุปสิ่งที่เปลี่ยน, ผัง, ตาราง node, SQL ใหม่, โหมดค้นหา, กฎ V-07, ตาราง Python↔n8n Parity Map, ผล regression test 7 เคส)

### Changed — `CHG-20261002-010`
- Timestamp: `2026-10-02T20:35:00+07:00`
- เพิ่ม `.gitignore` ระดับ repository เป็นครั้งแรก: กันไฟล์ archive (`*.7z`), `tmp/`, สถานะของ agent/MCP ในเครื่อง (`.pi/`, `.mcp.json`), ผลรัน batch กับ paperless จริง (`my_report*.md`, `my_failed*.json`) และข้อมูล corpus ที่สังเคราะห์จาก Oracle extract จริง (`tests/test_invoices/_raw/`, `pdfs/`, `test_dataset.json`) ไม่ให้หลุดขึ้น remote
- `tests/test_invoice_corpus.py` เพิ่ม module-level skip เมื่อไม่มี `test_dataset.json` และ skip เฉพาะเคส PDF เมื่อไม่มีโฟลเดอร์ `pdfs/` ทำให้ clone ใหม่รัน `python -m pytest` แล้วไม่แดง (ผลจริง: `2 passed, 1 skipped, 2 deselected` เมื่อไม่มี dataset, `9 passed, 2 deselected` เมื่อมีครบ)

### Security / Changed — CHG-20261002-011
- Timestamp: 2026-10-02T20:54:00+07:00
- ยกระดับ .gitignore ระดับ repository ให้ครอบคลุมข้อมูลความลับขององค์กรทั้งหมด (Company Sensitive Data, Credentials, ERP/Oracle configs, Database files, Financial spreadsheets, Live PDFs, Logs และ Runtimes)
- เพิ่ม rules ครอบคลุม 12 หมวดหมู่:
  1. Environment & Secrets: .env, .env.*, *.env (whitelist !.env.example), *.secret*, secrets/, ault/
  2. Tokens & Credentials: credentials/, *credential*.json, *token*.json, 	oken.json, *service_account*.json, client_secret*.json, *api_key*, *apikey* (whitelist !package.json, !package-lock.json)
  3. Private Keys & SSL/SSH: *.key, *.pem, *.pfx, *.p12, *.pkcs12, *.cer, *.crt, *.der, id_rsa*, id_ed25519*, id_ecdsa*, id_dsa*
  4. Oracle EBS & Databases: Oracle Wallet (cwallet.sso, ewallet.p12, *.wallet), Net config (*.ora, ojdbc.properties), Database files (*.db, *.sqlite*, data/, invoice-web/data/), Dumps/Backups (*.dmp, *.dump, *.bak, *.backup, *dump*.sql, *.sql.gz)
  5. Company Financials & Invoices: Real PDFs (*.pdf ทั่วทั้ง repo ยกเว้น fixture !invoice-web/examples/invoice.pdf), Excel (*.xlsx, *.xls, *.xlsm, *.xlsb), CSV extracts (*export*.csv, *report*.csv, *receipt*.csv, *invoice*.csv, *entity*.csv, *oracle*.csv), Batch reports/payloads (*my_report*, *my_failed*, *batch_result*.json, paperless_downloads/, extracted_invoices/), Synthetic corpus จาก production extract (	ests/test_invoices/_raw/, pdfs/, 	est_dataset.json)
  6. Automation & n8n: .n8n/, 
8n-local/, *n8n_export*.json, *workflow_export*.json
  7. Python Environment: __pycache__/, *.py[cod], .venv/, env/, uild/, dist/, .pytest_cache/, coverage files
  8. Node & Frontend: 
ode_modules/, rontend/dist/, playwright-report/, 	est-results/, *.tsbuildinfo
  9. IDE, Agent & Scratch: .vscode/* (whitelist !.vscode/extensions.json), .idea/, .agent/, .agents/, .pi/, .mcp.json, .gemini/, scratch/, /tmp/, 	mp/, 	emp/
  10. Archives: *.7z, *.zip, *.tar*, *.rar, *.gz, *.bz2, *.xz
  11. Operating System: .DS_Store, Thumbs.db, desktop.ini, ehthumbs.db, $RECYCLE.BIN/
  12. Logs: *.log, logs/
- ตรวจยืนยันด้วย git check-ignore -v ครอบคลุม 25+ pattern ตัวอย่างของ sensitive data ทุกหมวดหมู่
- รัน regression tests: pytest 9/11 passed (2 deselected), unittest 15/15 passed
