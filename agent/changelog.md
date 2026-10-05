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
- `check_pdfs.py` และ `verify_dataset.py` ถูกแยก### Security / Changed — `CHG-20261002-011`
- Timestamp: `2026-10-02T20:54:00+07:00`
- ยกระดับ .gitignore ระดับ repository ให้ครอบคลุมข้อมูลความลับขององค์กรทั้งหมด (Company Sensitive Data, Credentials, ERP/Oracle configs, Database files, Financial spreadsheets, Live PDFs, Logs และ Runtimes)
- เพิ่ม rules ครอบคลุม 12 หมวดหมู่:
  1. Environment & Secrets: .env, .env.*, *.env (whitelist !.env.example), *.secret*, secrets/, vault/
  2. Tokens & Credentials: credentials/, *credential*.json, *token*.json, token.json, *service_account*.json, client_secret*.json, *api_key*, *apikey* (whitelist !package.json, !package-lock.json)
  3. Private Keys & SSL/SSH: *.key, *.pem, *.pfx, *.p12, *.pkcs12, *.cer, *.crt, *.der, id_rsa*, id_ed25519*, id_ecdsa*, id_dsa*
  4. Oracle EBS & Databases: Oracle Wallet (cwallet.sso, ewallet.p12, *.wallet), Net config (*.ora, ojdbc.properties), Database files (*.db, *.sqlite*, data/, invoice-web/data/), Dumps/Backups (*.dmp, *.dump, *.bak, *.backup, *dump*.sql, *.sql.gz)
  5. Company Financials & Invoices: Real PDFs (*.pdf ทั่วทั้ง repo ยกเว้น fixture !invoice-web/examples/invoice.pdf), Excel (*.xlsx, *.xls, *.xlsm, *.xlsb), CSV extracts (*export*.csv, *report*.csv, *receipt*.csv, *invoice*.csv, *entity*.csv, *oracle*.csv), Batch reports/payloads (*my_report*, *my_failed*, *batch_result*.json, paperless_downloads/, extracted_invoices/), Synthetic corpus จาก production extract (tests/test_invoices/_raw/, pdfs/, test_dataset.json)
  6. Automation & n8n: .n8n/, n8n-local/, *n8n_export*.json, *workflow_export*.json
  7. Python Environment: __pycache__/, *.py[cod], .venv/, venv/, build/, dist/, .pytest_cache/, coverage files
  8. Node & Frontend: node_modules/, frontend/dist/, playwright-report/, test-results/, *.tsbuildinfo
  9. IDE, Agent & Scratch: .vscode/* (whitelist !.vscode/extensions.json), .idea/, .agent/, .agents/, .pi/, .mcp.json, .gemini/, scratch/, /tmp/, tmp/, temp/
  10. Archives: *.7z, *.zip, *.tar*, *.rar, *.gz, *.bz2, *.xz
  11. Operating System: .DS_Store, Thumbs.db, desktop.ini, ehthumbs.db, $RECYCLE.BIN/
  12. Logs: *.log, logs/
- ตรวจยืนยันด้วย git check-ignore -v ครอบคลุม 25+ pattern ตัวอย่างของ sensitive data ทุกหมวดหมู่
- รัน regression tests: pytest 9/11 passed (2 deselected), unittest 15/15 passed

## 2026-10-03

### Added — `CHG-20261003-011`
- Timestamp: `2026-10-03T08:33:34+07:00`
- เพิ่ม repository-local skill `aiva-invoice-core` สำหรับใช้เป็น domain contract ระหว่างออกแบบ พัฒนา และ review ระบบ AIVA Invoice Matching
- สรุป field หลักตั้งแต่ document identity, invoice/line/signature, Oracle receipt/entity, rule/exception, workflow, access และ audit
- บันทึกกฎ V-01–V-09 และ decision/routing ตาม OCR engine ที่ใช้งานจริง พร้อม requirement แบบ fail-safe และข้อจำกัดก่อน production
- ระบุ contract/version conflicts ระหว่าง OCR code, Portal receiving schema, docs และ Mockup v4.4 เพื่อป้องกันการเดาหรือแปล exception code ข้าม ruleset

### Added — `CHG-20261003-012`
- Timestamp: `2026-10-03T09:58:00+07:00`
- Export และทดสอบโค้ดจาก commit 9054076 ไว้ที่ `Web portal/invoice-web-9054076` พร้อม Backend (พอร์ต 8010) และ Frontend (พอร์ต 5173)
- รักษาและจัดโครงสร้าง Web Portal ทั้งหมด: `invoice-webV2` (เวอร์ชันใหม่ล่าสุด), `invoice-web1` (เวอร์ชันสำรอง), และ `invoice-web-9054076`
- คืนค่าและอัปเดต Canonical Records ในโฟลเดอร์ราก `agent/` ตามข้อกำหนด `AGENTS.md`

### Added — `CHG-20261003-013`
- Timestamp: `2026-10-03T11:35:00+07:00`
- เพิ่ม Web portal mockup เวอร์ชันใหม่ `Web portal/invoice-webv3` แบบ **no-build** (เปิด `index.html` จาก `file://` ได้ทันที ไม่ต้อง `npm install`/bundler) โดยใช้ design token ของ Mockup v4.4 (navy `#0D274D`, teal `#00B5AF`, Sarabun + JetBrains Mono)
- แยกชั้นข้อมูลเป็นสคริปต์คลาสสิก 4 ไฟล์ตามลำดับ `assets/data.js` → `assets/domain.js` → `assets/docs.js` → `assets/app.js` (ไม่ใช้ ES module/bundler)
- `assets/data.js` รีเจเนอเรตได้จาก `tools/build-domain-data.py` ซึ่งอ่าน `OCR service/n8n/app/core/master_data.py` (นิติบุคคล 48 แถว) และ `rules.py` (exception as-built 15 รหัส E05 E06 E09 E12 E13 E16 E17 E25 E26 E28 E29 E30 E31 E34 E35 + ชุดรหัสที่มอบหมายให้ user E06 E12 E13 E17 E26 E34 E35)
- แสดงผลตามพฤติกรรม engine จริง: decision order manual_review → Manual Review, High → Hold, Medium → Review, ที่เหลือรวม Low → Auto-pass และจับคู่รายบรรทัดแบบบันได M1 → M2 → M3 → M4 (M4 ถือว่าน่าสงสัย ต้องให้คนตรวจ)
- `assets/docs.js` เป็นข้อมูลสังเคราะห์ 16 ฉบับ ครอบคลุม Auto-pass, ขาดลายเซ็นผู้รับของ, วางบิลเกินรับจริง, เลขคณิตบรรทัดผิด, UOM/ราคาต่าง, ขาดใบรับ, หลายใบรับ, เอกสารซ้ำ, ORG/Tax ID map ไม่ได้, fallback M4, revision round 2 และ pipeline fail (fail-safe)
- จำลอง workflow ตาม receiving contract: ทุก action มี reason code, note บังคับตามกรณี, expected_workflow_version และ Idempotency-Key; version ไม่ตรงบันทึก 409 Conflict และไม่แก้สถานะ; rerun สร้าง action outbox waiting_revision และกันการสั่งซ้ำ
- เพิ่ม RBAC 6 ผู้ใช้/5 บทบาทพร้อมขอบเขต company ↔ receiver, ตารางสิทธิ์, ตาราง Portal ↔ Entra ID ↔ Oracle RECEIVER ↔ บริษัท และตาราง Mockup ↔ Production gap
- ไม่ปิดบังความขัดแย้งของแหล่งข้อมูล: แสดงผัง docs-catalog ↔ as-built mapping, รหัสที่ชนกัน (E13, E34), Tax ID 0107545000179 / ORG 222 / ORG 196 ที่ไม่มีใน master, ORG 556 ที่ master map แล้ว, ขีดจำกัด PDF ของ portal ↔ Vision และ Decimal ↔ JSON float
- เพิ่ม `tools/smoke-test.js` (DOM ปลอม) ไล่เรนเดอร์ทุกผู้ใช้ ทุกหน้า ทุกแท็บ ทุกเอกสาร ทุก action และตรวจ invariant ของ decide() — ผ่าน 46 การตรวจ
- ยังไม่ได้แก้ `invoice-webV2`, `invoice-web1`, `invoice-web-9054076`, OCR engine หรือ backend ใด และไม่ได้ต่อ API จริง

### Changed — `CHG-20261003-014`
- Timestamp: `2026-10-03T12:05:00+07:00`
- ตรวจ `Web portal/invoice-webv3` ด้วย Chromium จริง (Playwright จาก `invoice-web-9054076/frontend`) แล้วแก้สิ่งที่เจอ:
  - `boot()` ไม่เคยsetค่า `<select id="user">` ทำให้ `BOOT.user` ถูกเพิกเฉยและ mockup เปิดด้วยผู้ใช้ option แรก → setค่า select จาก `BOOT.user` ก่อน `switchUser()` และเปลี่ยน `BOOT.doc` เป็นเอกสารที่อยู่ในขอบเขตของผู้ใช้ตั้งต้น (`AIVA-2609-0003`) เพื่อไม่ให้ first paint แสดงหน้าล็อก
  - แถบสเต็ปการทำงานเพิ่มขั้นที่ 4 "Portal ตรวจซ้ำ / ตัดสิน" (สถานะมาจาก `wf` + ผู้รับผิดชอบ) ให้เห็น pipeline ครบแบบ Mockup v4.4 แทนที่จะมีแค่ STEP 1–3 ของ engine
  - หน้า PDF จำลอง highlight หลักฐานตาม `rule.page` จริง: outline สีส้มที่รายการ/คอลัมน์ที่ evidence อ้างถึง ("บรรทัด N"), กล่องลายเซ็น, คู่ Tax ID ผู้ขาย และเลข PO พร้อมสรุปบรรทัด "หลักฐานที่ระบบชี้บนหน้านี้"
  - คิวแสดงแถวแจ้งเตือนเมื่อเอกสารที่เปิดอยู่ไม่ตรงกับตัวกรอง/KPI chip ปัจจุบัน พร้อมลิงก์ `resetFilt()` ล้างตัวกรอง (เดิมคือหายไปจากคิวโดยไม่มีคำอธิบาย)
- ผลตรวจ Chromium: console/page error 0 รายการ, ไม่มีค่า `undefined`/`NaN`/`[object Object]` ในทุกผู้ใช้×ทุกหน้า×ทุกเอกสาร×ทุกแท็บ, ที่กว้าง 390px ไม่มี horizontal overflow (0px), header 56px สี `rgb(13,39,77)`, KPI 6 ใบ, แท็บ active ใช้เส้นใต้ `rgb(0,181,175)`
- ไม่มีไฟล์ portal/backend/OCR เดิมถูกแก้ (ยังเป็นโฟลเดอร์ `invoice-webv3` ใหม่อย่างเดียว)

### Changed — `CHG-20261003-015`
- Timestamp: `2026-10-03T14:10:00+07:00`
- ยกระดับ mockup v3 (`Web portal/invoice-webv3`) รอบที่ 2 ตามช่องว่างที่เก็บจาก log/เอกสาร parity ของ portal เดิม (`05-implementation-status.md`, `07-mockup-feature-parity.md`, `08-task-first-review-ux.md`):
  - **action parity ครบ 9 action** (`explain` `resubmit` `rerun` `return` `hold` `release_hold` `reject` `confirm` `post`) แทนชุดเดิม 6 action ที่ขาด `release_hold`/`post` และบั๊ก `explain` ที่ทำให้ workflow กลายเป็น `undefined`
  - เพิ่ม `guards(doc)` เป็น source of truth เดียวของ "ปุ่มไหนกดได้/ไม่ได้และเพราะอะไร" ใช้ร่วมกันทั้ง action bar, การ์ดขั้นตอนถัดไป และ modal — ทุกปุ่มที่ disabled ต้องมี `title` เป็นเหตุผล (สิทธิ์/403 ตาม scope/On Hold/คนถือ hold คนละฝั่ง/snapshot เก่า/ปิดสถานะ/ไม่มี Receiver/outbox ค้าง/ผลเป็น Hold-Manual Review/High ฝั่งผู้ใช้ยังไม่ปิด/SoD/post ยังไม่เปิด)
  - เพิ่ม **การ์ด "ขั้นตอนถัดไป"** ตามลำดับข้อมูล task-first: งานที่ต้องทำ · ผู้รับผิดชอบ (เทียบ engine assigned) · หลักฐานหน้าที่ต้องเปิด · action ที่ทำได้ · ข้อพับ "ทำไมอีก N ปุ่มกดไม่ได้"
  - บังคับ **separation of duties** (ผู้แนบเอกสาร `upl` ทำ action ประเภทตัดสินเองไม่ได้) + ล็อกฝั่งบัญชีเมื่อ High exception ที่ engine มอบให้ฝั่งผู้ใช้ยังไม่ถูกปิด + ล็อก action อื่นขณะ On Hold และให้ `release_hold` พา workflow กลับสถานะก่อนพัก
  - เพิ่ม **revision snapshot**: เลือกดู revision เก่าได้จาก dropdown, banner "อ่านอย่างเดียว", PDF/JSON/ผลตรวจตรงรุ่นกัน, ทำ action กับ revision เก่าไม่ได้ (เหตุผลอ้าง immutable) และกลับสู่ revision ล่าสุดได้
  - คิว: เพิ่มคอลัมน์ "งานที่ต้องทำ" ทุกแถว, ตัวเรียงลำดับ (ความเร่งด่วน/ยอดเงิน/วันที่), แบ่งหน้าละ 8 รายการ และ KPI ใบที่ 7 "งานของฉัน" (UI-02/UI-03)
  - audit: ผูกบันทึกเป็น **hash chain (prev_hash/hash)** จำลอง tamper-evident พร้อมปุ่มตรวจความต่อเนื่อง + ปุ่มจำลองการแก้ไขเพื่อแสดง chain ขาด, deep link จากบันทึกไปยังเอกสาร, และส่งออก CSV พร้อมคอลัมน์ hash
  - viewer: แถบเครื่องมือ (ย่อ/ขยาย, เล่มหน้าด้วยปุ่ม + คีย์ `←` `→`), บันทึก **access event** ทุกครั้งที่เปิดเอกสาร และปิดปุ่มดาวน์โหลด/พิมพ์พร้อมเหตุผลนโยบาย (production ต้องใช้ signed URL)
  - เพิ่มเอกสาร `AIVA-2609-0017` เคส **Decimal ↔ float** ที่เก็บยอดเป็น string ตรงตาม snapshot (`600 × 30.666667 = 18,400.0002`) เพื่อสาธิตว่า portal ห้ามแปลงเป็น float แล้วทำให้ผลต่างหาย — ชุดเอกสารตั้งต้นเป็น 17 ฉบับ
  - ขยาย RBAC เป็น 7 ผู้ใช้ (เพิ่ม ADM) และปิด nav ตามสิทธิ์จริง (ADM ไม่มีคิว, audit เห็นเฉพาะ APR/ADM)
- ผลทดสอบจริง: `node --check` ผ่านครบทุกไฟล์ (6 ไฟล์ รวม browser-check) · `node tools/smoke-test.js` ผ่าน **60** การตรวจ (จาก 46) · `node tools/browser-check.js` ผ่าน **14** การตรวจด้วย Chromium จริง (7 ผู้ใช้ × nav ที่เปิดให้ = 22 จอ, 17 ฉบับ × 6 แท็บ = 102 จอ, console/page error 0, ที่ 390px overflow 0px)
- ยังไม่แก้ `invoice-webV2`, `invoice-web1`, `invoice-web-9054076`, OCR engine หรือ backend ใด และยังไม่ต่อ API จริง

### Added — `CHG-20261003-016`
- Timestamp: `2026-10-03T14:15:00+07:00`
- เพิ่ม `Web portal/invoice-webv3/tools/browser-check.js` เป็นเครื่องมือถาวร: ไล่หน้าจอ mockup ด้วย Chromium จริง แล้วตรวจสิ่งที่ DOM ปลอมมองไม่เห็น (console/page error, คีย์ลัด, ปุ่ม disabled + title, layout 390px, audit chain หลังทำ action) — รายงานเป็น "✓ ผ่าน N การตรวจ" และ exit code 1 เมื่อ fail
- หา playwright จาก `$PLAYWRIGHT_PATH` หรือโฟลเดอร์ข้างเคียง ไม่ผูก path แบบ hardcode และข้ามอัตโนมัติ (exit 0) เมื่อเครื่องไม่มี playwright; รองรับ `$BASE_URL` เพื่อตรวจตอนเสิร์ฟผ่าน http
- เพิ่ม `.gitignore` ในโฟลเดอร์ mockup: ไฟล์ขึ้นต้นด้วย `_` (สคริปต์/ผลตรวจชั่วคราว), `_shots/`, `node_modules/` เพื่อไม่ให้ไฟล์ชั่วคราวหลุดเข้า repo แบบรอบก่อน
- ลบสคริปต์ชั่วคราวรอบก่อนหน้าออกจากโฟลเดอร์ส่งมอบ (`_bc.js`, `_dbg*.js/.txt`, `tools/_patch_*.py` — เป็น one-shot patch ที่ apply ลง assets/ ครบแล้ว)
- แก้ตารางเคสและตัวเลขใน `invoice-webv3/README.md` ให้ตรงกับ `assets/docs.js` จริง (ตารางเดิมยังอ้างสถานะเก่า เช่น 0005/0006/0012, 16 ฉบับ → 17 ฉบับ, 6 ผู้ใช้ 5 บทบาท → 7 ผู้ใช้ 4 บทบาท, KPI 6 → 7 ใบ) และบันทึกข้อจำกัดของ hash chain ที่เป็นการจำลอง

### Added — `CHG-20261003-017`
- Timestamp: `2026-10-03T15:45:00+07:00`
- เพิ่ม web portal เวอร์ชันใหม่ `Web portal/invoice-webV4` — **no-build ES modules** แต่แยก layer จริง (ต่างจาก mockup v3 ที่เป็นคลาสสิกสคริปต์ไฟล์เดียว) และยึดหลัก "UI แสดงผลจาก snapshot เท่านั้น ห้าม recompute matching"
- เลเยอร์ที่บังคับด้วยเทสต์: `src/domain` (pure logic ทดสอบใน node ได้) → `src/data` (generated) → `src/views` (return HTML string) → `app.js` (layer เดียวที่แตะ DOM + hash router) และ `src/engine/rules.js` (as-built mirror V-01…V-09 + M1–M4 + decision + assignment) **ถูกใช้จาก `tools/` เท่านั้น** — group 7 ของ smoke test ตรวจ import pattern จริง ไม่ใช่ grep คำว่า engine
- domain module ที่เกิดใหม่: `money.js` (Decimal บน BigInt: `dec dAdd dSub dMul dCmp dDiff dWithin dRound fmtMoney validateDecimalString`), `schema.js` (receiving contract v1.0 + `validateSnapshot` + `rulesCompleteness` แยก "ไม่ผ่าน" ออกจาก "ไม่ได้ตรวจ"), `company.js` (`ORG_ID/Tax ID → นิติบุคคล`, ไม่เดา → `UNMAPPED` + เหตุผล), `access.js` (7 ผู้ใช้ 4 บทบาท + SoD), `workflow.js` (state machine + optimistic version + outbox), `guards.js` (16 guard + `blockingFor`/`riskLevel`), `audit.js` (append-only), `store.js` (overlay เดียวที่แตะ localStorage + `ingest()` เป็นประตูข้อมูลเดียว), `exceptions.js`, `ruleCatalog.js`
- ข้อมูลเดโม 22 เอกสาร / 24 snapshot **generate ทั้งหมดห้ามพิมพ์มือ**: `tools/cases-*.mjs` (input แบบที่ engine จริงได้รับ) × engine mirror → validate contract → golden check (`expect` ของรุ่นล่าสุด + `expectRevisions` รายรุ่น) → `src/data/snapshots.js`; `src/data/master-data.js` รีเจเนอเรตด้วย `tools/build-master-data.py` จาก `OCR service/n8n/app/core/master_data.py` (นิติบุคคล 48 / ACTIVE 45 / exception 15 รหัส / user-task 7 รหัส)
- เคสสาธิตครบทุก policy ที่ mockup เคยพูดแต่ไม่มีกลไกคุม: SoD (0001), หลักฐาน missing (0004) / stale (0018), outbox ค้าง + จำลองส่งรุ่น (0015), snapshot เขียนมือเพราะ pipeline ล่ม (0016/0020 มีธง `hand_authored`), rules ไม่ครบ → ห้ามแก้เป็น PASS (0020), `not_evaluated` ไม่เท่ากับ PASS (0004), M4/หน้าไม่ครบ (0014), SQL safety cap 50 แถว (0022), USD/no-VAT (0019), ทศนิยม 6 ตำแหน่ง `600 × 30.666667 = 18400.0002` (0017), duplicate pair + terminal REJECTED (0008/0009), `post` ปิดตายด้วย `ap-contract` (0021)
- ยังไม่แตะ portal เวอร์ชันอื่น (`invoice-web`, `invoice-webV2`, `invoice-webv3`, `invoice-web1`, `invoice-web-9054076`) และไม่ได้แก้ OCR service/backend ใด

### Added — `CHG-20261003-018`
- Timestamp: `2026-10-03T15:45:00+07:00`
- เครื่องมือของ `invoice-webV4`: `tools/serve.py` (static server + `Cache-Control: no-store` + reconfigure UTF-8 stdout เพื่อกัน `UnicodeEncodeError` บน console Windows), `tools/build-fixtures.mjs --check` แบบมี **drift detection** (regen แล้วเทียบเนื้อหาโดย normalized `built_at` → exit 1 เมื่อไฟล์ generated ไม่ตรงกับที่ engine ให้ผล), `tools/smoke-test.mjs` (9 กลุ่ม 107 การตรวจ รวม group 9 ที่ render ทุก view ด้วยข้อมูลจริง และ group 7 ที่ตรวจข้อห้ามสถาปัตยกรรม + ห้ามอักษรภาษาอื่นปนใน `.js/.mjs/.md`)
- เพิ่ม `tools/browser-check.mjs` — ตรวจด้วย Chromium จริง 14 การตรวจ (console/page error ตอน bootstrap, ค่า `undefined/NaN/[object Object]` บนจอ, toast เหตุผล SoD, ขอบเขตงานตอนสลับผู้ใช้, revision tab, layout 390px ไม่ล้นแนวนอน) เริ่ม `tools/serve.py` เองแล้วปิดตอนจบ; หา playwright จาก `PLAYWRIGHT_PATH` → `playwright` → `node_modules` โปรเจกต์ข้างเคียง และ **ข้ามตัวเองแบบ exit 0** เมื่อหาไม่เจอ (คงคุณสมบัติ no-build)
- เอกสารพัฒนา 9 ไฟล์: `README.md` + `docs/00-overview.md` (ปัญหา/ขอบเขต/role/คำศัพท์) · `01-architecture.md` (เลเยอร์ + วิธีบังคับข้อห้าม) · `02-data-contract.md` (contract v1.0 + ตัวอย่าง JSON + สิ่งที่ยัง integration ไม่ได้) · `03-domain-model.md` (API จริงทุก module พร้อม return shape ที่เปิดโค้ดยืนยันแล้ว) · `04-ui-spec.md` · `05-build-and-test.md` (pipeline, วิธีเพิ่มเคส, exit code, สิ่งที่ **ยังไม่ได้** ทดสอบ) · `06-as-built-gaps.md` (ส่วนต่าง engine ↔ มาตรฐาน 6.2) · `07-demo-script.md` (9 ฉาก + ตารางเคส 22 ฉบับทีละฉบับ)
- ผลรันจริง: `build-master-data.py` ผ่าน · `build-fixtures.mjs` → `เคส 22 · snapshot 24 · ความผิดพลาด 0 · คำเตือน 3` · `--check` exit 0 · `smoke-test.mjs` **107/107** · `browser-check.mjs` **14/14** (Chromium, 1440px + 390px, console error 0)

### Added — `CHG-20261003-019`
- Timestamp: `2026-10-03T16:50:00+07:00`
- เพิ่ม web portal เวอร์ชันใหม่ `Web portal/invoice-webV5` — **repo-reference portal** (no-build ES modules)
  - ซิงก์ข้อมูลอ้างอิงตรงจาก repo (`tools/sync.py` อ่าน master_data, rules, models, docs, mockup tokens) พร้อม header provenance ตรวจ sha256 drift
  - portal ทำหน้าที่เป็น view layer แสดงผล snapshot อย่างเดียว ห้าม recompute matching ใน frontend
  - ยุบรวมหน้าจอที่ซ้ำซ้อนจาก v4 เหลือ 6 หน้า: `work`, `detail`, `rules`, `manual`, `sources`, `audit`
  - นโยบาย 3 ชั้น `access → workflow → guards` พร้อม BigInt Decimal string สำหรับตัวเลขเงิน
  - ผลทดสอบจริง: `tools/smoke-test.mjs` ผ่าน **31/31**, `tools/browser-check.mjs` ผ่าน **29/29** (Edge headless), `tools/sync.py --check` ผ่าน
