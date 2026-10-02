# Current State

Last verified: `2026-10-02T20:20:00+07:00`

## Repository
- Branch: `invoice-web` (remote `origin/main`); งานล่าสุดเป็นการอัปเดต n8n workflow บนเซิร์ฟเวอร์ผ่าน MCP + แก้เอกสาร `OCR service/n8n/n8n flow structure.md` เท่านั้น
- Existing OCR service and original HTML mockup remain unchanged this development session.
- Agent records, central docs and invoice-web are uncommitted/untracked in the working tree; no commit/push performed.

## Implemented Portal
- `invoice-web/frontend`: React + TypeScript + Vite + TanStack Query; UI ถูก normalize และ redesign ใหม่ทั้งหมดเพื่อให้อ่านง่ายและเห็นภาพรวม 3-Way Match ทันที.
- Normalized Queue View: KPI overview strip (ทั้งหมด/ผ่าน/รอตรวจ/ระงับ) แบบ interactive, single-bar unified filters (search, company, source, status, quick-tabs, chips), และ high-contrast table พร้อม context chips (ใบรับ, receiver, PO, amount tabular nums).
- Normalized Document Detail: Executive 3-Way Match Snapshot card (Vendor, PO/Release, Goods Receipt, Grand Total), Provenance bar, Executive Workflow Decision Hub, 3-Step Verification Pipeline Stepper, Discrepancy/Exception callout พร้อม direct PDF evidence link, และ 5 แท็บข้อมูล (สรุป, รายการสินค้า 3-way line match, กฎการตรวจพร้อม code/step, ประวัติตาม timeline, ข้อมูลเพิ่มเติมและ JSON).
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

## Verified
- Backend: 15 unittest tests passed (persistence, idempotency, conflicts, revisions, schema validation, versioned PDF, global audit, workflow action/version/idempotency/outbox/revision completion, compatibility backfill, origin, keys, filters, adapter, architecture boundaries).
- Frontend: TypeScript strict and Vite production build passed.
- Playwright: 6 tests passed on Edge browser (17.4s), covering import, PDF canvas viewer, tabs, history, filters, mobile viewport (390px) no-overflow, invalid JSON rejection, exact large decimal display, revision deep link/archived PDF, access/audit navigation, and review action persistent outbox.
- Browser subagent visual inspection: ตรวจ Queue page, Document detail overview, Line items table, Rules list, Revision history, Audit page, Action waiting state บน desktop และ mobile เรียบร้อย.
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
