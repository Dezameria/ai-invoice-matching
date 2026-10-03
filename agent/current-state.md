# Current State

Last verified: `2026-10-02T20:20:00+07:00`

## Repository
- Branch: `invoice-web` (remote `origin/main`); งานล่าสุดเป็นการอัปเดต n8n workflow บนเซิร์ฟเวอร์ผ่าน MCP + แก้เอกสาร `OCR service/n8n/n8n flow structure.md` เท่านั้น
- Existing OCR service and original HTML mockup remain unchanged this development session.
- Agent records, central docs and invoice-web working tree are organized; latest commit `94d8cad` (invoice-webv3 mockup) pushed to `origin/invoice-web`.
- Repository-local skill `.agents/skills/aiva-invoice-core` สรุปขอบเขตระบบ field หลัก กฎ V-01–V-09, decision/routing, workflow/audit requirements และความขัดแย้งระหว่าง code, docs และ mockup เพื่อใช้เป็น domain reference ระหว่างพัฒนาต่อ.

## Mockup v3 (no-build) — `Web portal/invoice-webv3`

สถานะ: สร้างใหม่ทั้งโฟลเดอร์ ยังไม่ต่อ backend — commit `94d8cad` และ push ไป `origin/invoice-web` แล้ว (2026-10-03)

- เปิดจาก `file://` ได้ทันที (ดเบิลคลิก `index.html`) ไม่ต้องมี `node_modules` หรือ bundler; ปุ่มคัดลอก JSON ต้องเปิดผ่าน `python -m http.server 5190`
- โหลดสคริปต์คลาสสิก 4 ไฟล์ตามลำดับ `assets/data.js` → `assets/domain.js` → `assets/docs.js` → `assets/app.js`
- `assets/data.js` ถูกรีเจเนอเรตด้วย `tools/build-domain-data.py` จาก `OCR service/n8n/app/core/master_data.py` (นิติบุคคล 48 แถว) และ `rules.py` (exception as-built 15 รหัส + ชุดรหัสฝั่ง user)
- พฤติกรรมที่ฝังใน UI ตรงกับ as-built engine: decision order (manual_review → Manual Review, High → Hold, Medium → Review, ที่เหลือรวม Low → Auto-pass), ownership ตาม `owner_of()`, ladder จับคู่ M1–M4 (M4 = ต้องให้คนตรวจ)
- ข้อมูลเอกสาร 16 ฉบับใน `assets/docs.js` เป็นข้อมูลสังเคราะห์ แต่โครงสร้าง field ตาม receiving contract (schema 1.0) และครอบคลุมเคส fail-safe/duplicate/revision/pipeline-fail
- จำลอง workflow ตาม contract: reason code + required note + `expected_workflow_version` + Idempotency-Key → 409 Conflict เมื่อ version ไม่ตรง (ไม่แก้สถานะ), `rerun` สร้าง action outbox `waiting_revision` และกันการสั่งซ้ำ
- RBAC page แสดงผู้ใช้ 6 คน/5 บทบาท ขอบเขต company ↔ receiver, ผัง Portal ↔ Entra ID ↔ Oracle `RECEIVER` ↔ บริษัท และตาราง Mockup ↔ Production gap
- ความขัดแย้งของแหล่งข้อมูลแสดงต่อหน้าผู้ใช้ ไม่ถูกทำให้หาย: ผัง docs-catalog ↔ as-built, รหัสชนกัน (`E13`, `E34`), Tax ID `0107545000179` / ORG `222` / ORG `196` ที่ไม่มีใน master, ORG `556` ที่ master map แล้ว, ขีดจำกัด PDF portal ↔ Vision, `Decimal` ↔ JSON float
- ตัดสินใจ design สำคัญ: เอกสารที่ map บริษัทไม่ได้ (ORG/Tax ID ว่างหรือไม่อยู่ใน master) ต้องขึ้นในคิวฝ่ายบัญชีพร้อมป้ายเตือน แทนการถูกกรองหายจากทุกคิว
- `tools/smoke-test.js` เป็น DOM ปลอมสำหรับตรวจว่าทุกผู้ใช้/ทุกหน้า/ทุกแท็บ/ทุกเอกสาร/ทุก action เรนเดอร์ได้ และคง invariant ของ `decide()`

## Implemented Portal
- `invoice-web/frontend`: React + TypeScript + Vite + TanStack Query; UI ถูกปรับให้ตรงตามต้นแบบ `AIVA-Web-Portal-Mockup-v4.4-Release.html` อย่างสมบูรณ์ 100%:
  - แถบ Header หลัก (`header.aiva-header`): สี Navy เข้ม `#0D274D` สูง 56px พร้อมโลโก้ AI สีเขียว, ลิงก์ Nav 4 ส่วน (`คิวตรวจสอบ`, `สิทธิ์และการเข้าถึง`, `บันทึกการเข้าถึง`, `เชื่อมต่อ API`), Badge บทบาท "เจ้าหน้าที่บัญชี", และ Pill แสดงสถานะ workspace โดยลบ Sidebar สีดำเดิม 240px และ Topbar เดิมออกทั้งหมด
  - แถบขอบเขตและมุมมอง (`.scope`): วางด้านบนสุด ประกอบด้วย `ขอบเขต: รายบริษัท`, Company Chips (`ทุกบริษัท`, `DEMO`), ปุ่มสลับมุมมอง (`[แยก 2 ฝั่ง] [ตารางสรุป]`), และปุ่ม `+ นำเข้าเอกสาร`
  - แถบ KPI Overview (`.kpis`): ตารางสรุป 6 การ์ด (`.kpi`) พร้อมตัวเลขสรุปสถิติเด่นชัดและสีกรอบสถานะ (ทั้งหมด, Auto-pass, Review, Hold, Manual Review, ซ้ำ)
  - เลย์เอาต์หลัก Master-Detail 2 คอลัมน์ (`.wrap`):
    - ด้านซ้าย (`.panel.queue-sidebar` กว้าง 370px, sticky): คิวตรวจสอบเอกสารพร้อมช่องค้นหา (`ค้นหาเลขที่ใบแจ้งหนี้ / PO / ผู้ขาย`), จำนวนเอกสาร, และรายการเอกสารแต่ละใบ (`.qi`) ที่คลิกเลือกแล้วเปิดดูทางขวาทันที
    - ด้านขวา (`.detail-pane`): แสดงเอกสารที่เลือกทันทีตามสถาปัตยกรรมของ Mockup v4.4:
      1. ส่วนหัวเอกสาร (`.dh`): เลขที่ใบแจ้งหนี้, Badge สถานะ, แท็กบริษัท (`.co`), ปุ่มแนบ PDF, ปุ่ม `📄 เปิด/ซ่อน PDF` และ Metadata แถวเดียว (`.meta.document-meta`: ผู้ขาย, PO, Release, ใบรับ, ORG_ID, Receiver, ยอดรวม `.total-number`, รอบตรวจ)
      2. แถบสเต็ปการตรวจ (`.flow`): 4 สเต็ป (`.st.ok / .st.warn / .st.bad / .st.skip`) ได้แก่ STEP 1 สกัดและตรวจเอกสาร, STEP 2 ค้นใบรับและลูกค้า, STEP 3 เทียบกับใบรับ, และ Portal ตรวจซ้ำ
      3. แถบแท็บ (`.tabs`): แท็บแนวนอน 5 แท็บสะอาดตาพร้อมแถบสี teal แสดงแท็บที่เลือก (`.tab.on`)
      4. แท็บ "สรุปและดำเนินการ": แสดงเฉพาะข้อผิดพลาดและข้อสังเกต (`.ex.High / .ex.Medium`) พร้อมรหัส Exception Code, ผู้รับผิดชอบ (`.who`), กฎที่เกี่ยวข้อง, หลักฐาน (`.ev`) และปุ่มเปิดดูหน้า PDF ทันที ไม่ยัดตารางหรือการ์ดซ้ำซ้อน
      5. แท็บ "รายการสินค้า": ตาราง 3-Way Match และการ์ดเปรียบเทียบยอดรวม V-03 กับ V-09 (`.grid2 .card .kv`)
      6. แท็บ "กฎการตรวจ", "ประวัติ", และ "ข้อมูลเพิ่มเติม" (พร้อม JSON preview)
      7. แถบดำเนินการด้านล่าง (`.bar`): Sticky bar พร้อมข้อความระบุสถานะ/ผู้รับผิดชอบ (`.hint`) และปุ่ม Action (`.bp, .bt, .bg, .br, .bw`) พร้อม Modal ยืนยันการดำเนินการ
      8. ตัวอ่าน PDF Viewer แบบคู่ขนานด้านขวา รองรับการซูมและเปิดหน้าตามหลักฐาน
    - รองรับ Responsive บนหน้าจอขนาดเล็ก (Mobile 390px): ซ่อน sidebar เมื่อเลือกเอกสาร ทำให้ไม่มี overflow แนวนอน
- `invoice-web/backend`: FastAPI modular monolith แยก `api/auth/core/domain/db/integrations/storage/workers`; app factory 49 บรรทัดประกอบ dependencies และ mount frontend.
- Mockup parity ครอบคลุม company chips, receipt/Receiver/ORG_ID, PO/release, rule STEP 1–3, ownership/access, 5 task-first detail tabs, global audit search/filter/pagination และ keyboard tab navigation.
- หน้า Access แสดง permission/capability จาก `/api/portal/v1/session` และแยก organizational dependencies ที่ยังไม่ได้เปิดใช้อย่างชัดเจน; ไม่มี mock role หรือ workflow action ที่ backend ไม่บังคับใช้.
- Persistent workflow แยกจาก immutable source snapshot: explain/resubmit/rerun/return/reject/hold/confirm มี reason policy, required note, expected revision/workflow version, idempotency และ audit.
- Resubmit/rerun สร้าง action outbox สำหรับ producer; accepted ยังรอ snapshot revision ใหม่ เมื่อ revision ใหม่มาถึง request ปิดเป็น completed และ workflow เปิดรอบตรวจใหม่.
- Source integrations submit JSON snapshots and PDF bytes. Portal does not run OCR/matching, approve invoices or send AP transactions.
- Canonical API contract is `invoice-web/docs/04-receiving-api.md`; scope and implemented gaps are in `invoice-web/docs/05-implementation-status.md`.
- Mockup UI-01–UI-15 parity และข้อจำกัดอยู่ใน `invoice-web/docs/07-mockup-feature-parity.md`.
- Current file map, dependency direction และตำแหน่งเพิ่ม feature อยู่ใน `invoice-web/docs/06-project-structure.md`.
- Legacy core Table9 converter preserves original standard/code and leaves unavailable receipts/matches empty.
- Persistent local data is in ignored `invoice-web/data/`; dependency/build/test artifacts are ignored.
- Local preview runs at `http://127.0.0.1:8010`; API docs at `/api/docs`. One clearly labeled synthetic example with two JSON/PDF revisions was loaded for manual preview.

## Synthetic OCR Test Corpus (`OCR service/n8n/tests/test_invoices`)
- Corpus ถูกเชื่อมกัด pytest เป็น regression gate: `tests/test_invoice_corpus.py` replay ทั้ง 155 เคส มี pytest ที่ติด marker `live` ของ LiteLLM/Paperless เลืกงขัน offline (`python -m pytest` → `9 passed, 2 deselected in ~1.7s`) โดย `tests/conftest.py` กังไม่ให้ pytest เก็ป `test_suite.py` ที่เป็นสคริปที่ต้องยิง service จริง
- `invoice_engine.py` เป็น bridge ที่เรียก `app/core/rules.py` (Step 1–4) จริงแบบ offline โดยรับชุดแถว Oracle ที่เก็บไว้ในแต่ละ invoice (`oracle_rows`) ทำให้ expected_result ไม่มีวันหลุดจาก logic ของ production และรันซ้ำได้โดยไม่ต้องต่อ Oracle MCP.
- `build_test_dataset_wave2.py` สร้าง 100 เคสใหม่โดย expected_result ทุกตัวมาจาก engine; `verify_dataset.py` replay ทั้ง 155 เคสและ `--fix` ใช้ recalibrate key ได้; `check_pdfs.py` ตรวจว่า PDF ที่ render ตรงกับ key (ฟิลด์ที่มีต้องปรากฏ, ฟิลด์ที่หายไปต้องไม่ปรากฏ, จำนวนหน้าตรง `document_flags`).
- `generate_invoices.py` รองรับ 3 layout เดิมและเพิ่ม `pdf_hints`: watermark/ speckle จำลองเอกสาร scan, ต่อบัญชี 2 หน้า, เชิงอรรถหมายเหตุ, และพิมพ์ `—` สำหรับฟิลด์ที่ key ระบุว่าหาย.
- เคสสำคัญที่ควรทราบเมื่ออ่าน key: `halted_by` เป็น `V-02` เท่านั้นใน engine ปัจจุบัน; partial billing (E34) เกิดพร้อม E31 เสมอ; E16 บนเอกสารที่คำนวณถูกเกิดจาก float noise ของ `sub_total + vat`; `INV-J17` และ `INV-J20` เป็น forgery ที่ระบบตรวจไม่พบโดยเจตนา (ต้องได้ Auto-pass).
- ขอจำกัด: Tahoma subset ที่ฝังใน PDF ไม่มี ToUnicode map ที่ใช้ได้ ทำให้ดึงอักษรไทยเป็นข้อความได้เป็น mojibake (การ render ถูกต้อง) — เครื่องมือตรวจจึงเทียบเฉพาะ ASCII/ตัวเลข; corpus ใช้ dependencies `fpdf2` (render) และ `pypdf` (ตรวจ PDF) ซึ่งไม่ใช่ `requirements.txt` ของ service.

## n8n Workflow `aLUCmn3l0bZDjbVV` (v6.5, on server)
- Workflow ชื่อ `AIVA PO-INV Matching Verification v6.5` สถานะ `active: false`, 23 nodes, ผังการเดินงานเท่าเดิม (ไม่เพิ่ม/ลด node หรือ connection) — แก้เฉพาะ `N2.4`, `HTTP Request`, `N4`, `N7`, `N7.1`, `N8`, `N9`, `N10`, `N12`, `N13`
- ตรรกะของแต่ละ node ถูก port จาก Python แบบ 1:1: `normalize_extracted_document`→N4, `evaluate_step1`→N5, `build_receipts_sql`+`parse_csv_receipts`→N7/N7.1, `evaluate_step2`→N8, `evaluate_step3`→N9, `evaluate_step4_decision`+`pipeline`→N10, `validate_output`→N11, `PortalClient`→N12, `PaperlessClient.update_verification_status`→N13/N13.1
- Oracle REST ตรงเดียว: `((Invoice No. ทุก variation + Supplier Tax ID) OR PO_NUM)` พร้อม `CUSTOMER_TAX_ID` (ผู้ซื้อ) และ scalar `SUPPLIER_IS_INTERNAL` (สมาชิก `financials_system_params_all`) ในคำสั่งเดียว; ลำดับความสำคัญ Invoice→PO ตกอยู่ที่ N7.1 ผ่านฟิลด์ `oracle_query_mode`
- Data shape ของ n8n ต่างจาก Python และห้ามสลับกัน: ใช้ `invoice.po_number`, `lines[]`, `oracle_rcv_rows[]` (แถว active สำหรับ STEP 3), `oracle_rows_all` (ทุกแถว สำหรับ Table 9), `rules[]`, `exceptions[]` — **ไม่มี** `mergedFields` / `po_lines` / `oracle_data.rows`
- ผลตรวจ (offline): `node --check` ผ่านทั้ง 12 Code nodes และ harness `tmp/run_flow_sim.js` รัน `jsCode` ที่ export จากเซิร์ฟเวอร์จริงด้วย 7 เคส (Auto-pass, `PO_FALLBACK`, E28 bypass, E17, E06, E35, intercompany+E26) ได้ผลตรงกับ `app/core.rules` ทุกเคส
- ข้อจำกัดที่ค้าง: N7 ยังใส่ Bearer token ตรงๆ ใน header (n8n แนะนำให้ย้ายเป็น credential) และ canvas ยังไม่มี node group (20 boxes > 7);
  ยังไม่ได้ทดสอบการรันจริงแบบ end-to-end กับ Paperless/LiteLLM/Portal

## Repository Security & Git Boundary
- Global .gitignore ครอบคลุมข้อมูลความลับและเอกสารสำคัญของบริษัท 12 หมวดหมู่:
  1. Environment & Config: .env, .env.*, *.env (ยกเว้น !.env.example), *.secret*, secrets/, ault/
  2. Tokens & Credentials: credentials/, *credential*.json, *token*.json, 	oken.json, *service_account*.json, client_secret*.json, *api_key*, *apikey* (ยกเว้น package.json, package-lock.json)
  3. Private Keys & SSL/SSH: *.key, *.pem, *.pfx, *.p12, *.pkcs12, *.cer, *.crt, *.der, id_rsa*, id_ed25519*, id_ecdsa*, id_dsa*
  4. Oracle EBS & Databases: Oracle Wallet (cwallet.sso, ewallet.p12, *.wallet), Net config (*.ora, ojdbc.properties), Database files (*.db, *.sqlite*, data/, invoice-web/data/), Dumps/Backups (*.dmp, *.dump, *.bak, *.backup, *dump*.sql, *.sql.gz)
  5. Company Financials & Invoices: Real PDFs (*.pdf ทั่วทั้ง repo ยกเว้น synthetic fixture !invoice-web/examples/invoice.pdf), Excel (*.xlsx, *.xls, *.xlsm), CSV extracts (*export*.csv, *report*.csv, *receipt*.csv, *invoice*.csv, *entity*.csv, *oracle*.csv), Batch reports/payloads (*my_report*, *my_failed*, *batch_result*.json, paperless_downloads/, extracted_invoices/), Synthetic corpus จาก production extract (	ests/test_invoices/_raw/, pdfs/, 	est_dataset.json)
  6. Automation & n8n: .n8n/, 
8n-local/, *n8n_export*.json, *workflow_export*.json
  7. Python Environment: __pycache__/, *.py[cod], .venv/, env/, uild/, dist/, .pytest_cache/, coverage files
  8. Node & Frontend: 
ode_modules/, rontend/dist/, playwright-report/, 	est-results/, *.tsbuildinfo
  9. IDE, Agent & Scratch: .vscode/* (ยกเว้น !.vscode/extensions.json), .idea/, .agent/, .agents/, .pi/, .mcp.json, .gemini/, scratch/, /tmp/, 	mp/, 	emp/
  10. Archives: *.7z, *.zip, *.tar*, *.rar, *.gz, *.bz2
  11. Operating System: .DS_Store, Thumbs.db, desktop.ini, ehthumbs.db, $RECYCLE.BIN/
  12. Logs: *.log, logs/
- ตรวจสอบยืนยันด้วย git check-ignore -v ครอบคลุม 25+ pattern ตัวอย่างของ sensitive data ทุกหมวดหมู่ และยืนยันว่า invoice-web/examples/invoice.pdf และ .env.example ไม่ถูก ignore

## Verified
- Mockup v3: `node --check` ผ่านทั้ง 4 สคริปต์ใน `Web portal/invoice-webv3/assets/` และ `node tools/smoke-test.js` ผ่าน 46 การตรวจ (ครอบคลุม 409 ไม่แก้สถานะ, confirm เพิ่ม `wf_version`, rerun สร้าง outbox, บล็อก action เมื่อขาด note, KPI นับตรงข้อมูล, master 48 แถว / 15 exception code / 9 กฎ, สแกนรูปแบบ credential)
- Mockup v3 เปิดตรวจด้วย Chromium จริง (Playwright ที่ใช้ package จาก `invoice-web-9054076/frontend`): ไล่ 6 ผู้ใช้ × 4 หน้า × ทุกเอกสาร × 6 แท็บ + viewer + modal → console/page error 0, ไม่มี `undefined`/`NaN`/`[object Object]`, viewport 390px ไม่มี horizontal overflow (0px), header 56px `rgb(13,39,77)`, KPI 6 ใบ, active tab underline `rgb(0,181,175)`, คิวของผู้ใช้ตั้งต้น (ACC) 11 ฉบับ
- ยังไม่ได้ทดสอบ Safari/Firefox และการเรนเดอร์ font จริงจาก Google Fonts ต้องใช้ network (offline แล้ว fallback เป็น system-ui/monospace ตามลำดับ)
- Skill package ผ่าน `quick_validate.py` เมื่อรันด้วย UTF-8 mode; reference link และ source paths ที่ระบุมีอยู่จริงครบ.
- Backend: 15 unittest tests passed (persistence, idempotency, conflicts, revisions, schema validation, versioned PDF, global audit, workflow action/version/idempotency/outbox/revision completion, compatibility backfill, origin, keys, filters, adapter, architecture boundaries).
- Frontend: TypeScript strict and Vite production build passed (`tsc -b && vite build` built clean in 5.2s).
- Playwright: 6 tests passed on Edge browser (15.2s), covering import, PDF canvas viewer, tabs, history, filters, mobile viewport (390px) no-overflow, invalid JSON rejection, exact large decimal display, revision deep link/archived PDF, access/audit navigation, and review action persistent outbox.
- Visual inspection: ยืนยันเลย์เอาต์ Master-Detail (ซ้าย: คิว 370px, ขวา: เอกสารและ PDF) สะอาดตา กระชับ ตรงตามโครงสร้าง Mockup v4.4 ปราศจากตารางซ้ำซ้อนในแท็บสรุป.
- Local preview on port 8010 serves latest production bundle successfully.
- Test corpus: `verify_dataset.py` replayed 155/155 invoices and reported 0 drift against `app.core.rules`; `check_pdfs.py` audited 155 PDFs / 157 pages with 0 mismatches; 3 rendered pages visually inspected (Thai glyphs, watermark, blank receiver-signature area, continuation page).
- Offline pytest suite: `9 passed, 2 deselected` ใน ~1.7 วินาที (corpus 7 tests + SSE UI 2 tests ที่ไม่เรียก service ภายนอก); ยืนยันความไวของ gate ด้วยการใส่ข้อมูลผิดตงใจ 4 แบบ แล้วเครื่องมือรายงาน error ครบ
- n8n workflow v6.5: re-export จากเซิร์ฟเวอร์เทียบ byte-for-byte กับ `tmp/nodes/*.js` → ตรงกันทุกตัวอักษร (7 jsCode + N7 jsonBody); `node --check` ผ่าน 12 nodes; harness ที่รัน code จาก export จริงให้ผล 7/7 เคสตรง Python และผ่าน N11 Schema Validate ทุกเคส
- No live OCR, Oracle, LiteLLM, Paperless or AP tests executed.


## Existing System
- `OCR service/n8n/app` remains the existing Python OCR and matching service.
- `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html` remains UI/data reference.
- `docs/` remains original architecture reference; code/docs have known contract and rules-version differences recorded in invoice-web planning documents.

## Constraints / Next Work
- n8n workflow v6.5 ยัง `active: false` และยังไม่เคยรัน end-to-end จริงกับ Paperless/LiteLLM/Portal; SQL ที่ใช้จริงบนเซิร์ฟเวอร์ยังไม่ถูกยิงกับ `AH_DEV_RCV_PO_AP_MATCHING_V` (ตรวจแค่ shape ผ่าน MCP `oracle`)
- N7 ยัง hardcode Authorization header (ควรย้ายไป credential `httpTemplatedCustomAuth` ตามที่ n8n แนะนำ)
- Current release is local/integration pilot, not company-scoped production: shared API keys are workspace-wide; Entra, user/receiver RBAC and immutable user audit remain unimplemented.
- Workflow actions ใน shared-key pilot ไม่มีตัวตนรายบุคคล; ต้องเชื่อม Entra ก่อนบังคับ EU/ACC/APR และ separation of duties.
- SQLite startup table creation currently used; PostgreSQL/Alembic and production backup/storage/retention/scan/rate limits remain future work.
- `workers`, `migrations` และ `infra` เป็น boundary พร้อม README เท่านั้น ยังไม่มี Celery/Redis, Alembic runtime หรือ production deployment.
- PDF binary upload only; no live DMS URL connector/watermark. JSON/PDF เปิดย้อนหลังตาม revision ได้ แต่ retention/legal hold/cleanup ยังไม่ทำ.
- Need sanitized real producer contract to validate upstream mapping; never relabel legacy codes as a new standard.
- Producer ต้องเชื่อม action outbox และกำหนด SLA/retry/dead-letter ก่อนใช้ resubmit/rerun กับงานจริง; AP post ยังไม่เปิด.
- Keep logs free of secrets and invoice payloads; read Thai files explicitly with UTF-8.
