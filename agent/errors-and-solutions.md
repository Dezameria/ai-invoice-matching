# Error และ Solution

บันทึกเฉพาะปัญหาที่มีโอกาสเกิดซ้ำและมีวิธีป้องกันที่นำกลับมาใช้ได้ รายการใหม่ต้องเพิ่มด้านล่างเท่านั้น

## Entry Format

- Error ID: `ERR-YYYYMMDD-NNN`
- Detected: เวลา ISO 8601 พร้อม timezone
- Context: งานหรือไฟล์ที่เกี่ยวข้อง
- Symptom: อาการที่สังเกตได้
- Root Cause: สาเหตุที่ยืนยันแล้ว
- Solution: วิธีแก้ที่ใช้ได้ผล
- Prevention: กติกาหรือ check ที่ป้องกันการเกิดซ้ำ
- Evidence: path, test หรือ command ที่ใช้ยืนยัน โดยไม่ใส่ secret
- Status: `open`, `mitigated` หรือ `resolved`

## Known Errors

### `ERR-20261001-001` — Thai Markdown mojibake in PowerShell output

- Detected: `2026-10-01T15:18:00+07:00`
- Context: อ่าน `OCR service/n8n/README.md` และ `OCR service/n8n/n8n flow structure.md`
- Symptom: อักษรไทยแสดงเป็นชุดอักขระ `à¸...` ใน terminal output
- Root Cause: PowerShell session ถอดรหัสไฟล์ UTF-8 ด้วย encoding ที่ไม่ตรงกัน
- Solution: ระบุ UTF-8 อย่างชัดเจนเมื่ออ่านไฟล์ เช่น `Get-Content -Raw -Encoding UTF8 <path>`
- Prevention: หากพบ mojibake ให้หยุดสรุปเนื้อหาและอ่านใหม่ด้วย UTF-8 ก่อนแก้ไฟล์
- Evidence: source files แสดงโครงสร้าง Markdown ถูกต้อง แต่อักษรไทยผิดเฉพาะ output ที่อ่านด้วย default encoding
- Status: `mitigated`

### `ERR-20261002-001` — Windows test temporary directory permissions
- Detected: `2026-10-02T08:33:00+07:00`
- Context: invoice-web backend tests on Windows sandbox / Python 3.14
- Symptom: creating child PDF directory in tempfile.TemporaryDirectory returned WinError 5
- Root Cause: OS temporary directory permissions in this execution context denied nested writes/cleanup
- Solution: create unique test directories under ignored invoice-web/data/tests and verify containment before cleanup
- Prevention: keep test runtime artifacts within the writable workspace; do not weaken global filesystem permissions
- Evidence: backend unittest suite subsequently passed 9 tests
- Status: `resolved`

### `ERR-20261002-002` — Hand-written expected results drifted from the real rules engine

- Detected: `2026-10-02T18:10:00+07:00`
- Context: replay of the 55 wave-1 invoices in `tests/test_invoices/test_dataset.json` through `app.core.rules`
- Symptom: 30 invoices disagreed with the engine — `halted_by` was filled per failing rule while the engine only ever sets `V-02`; partial-billing cases (INV-A09–A11) were keyed as Review although V-09 also raises E31 (real decision is Hold); INV-B13/B14 missed E31; INV-A04 gained a benign E16
- Root Cause: expectations were derived from a hand-written rule model instead of the engine, and the engine's V-09 compares invoice subtotal with the full received value, so partial billing always adds E31
- Solution: added `invoice_engine.py` + `verify_dataset.py`; wave-2 expectations are produced by the engine at build time and wave-1 was recalibrated with `verify_dataset.py --fix` (drift now 0/155, marker `recalibrated: engine-v6.2`)
- Prevention: never hand-write Table 9 expectations; build them by calling `evaluate_step1..4` and keep the Oracle rows that produced them (`oracle_rows`) in the dataset so the key stays reproducible
- Evidence: `verify_dataset.py` prints `All replayed expectations already match the engine output.` for 155 invoices
- Status: `resolved`

### `ERR-20261002-003` — Thai text extraction from generated PDFs returns mojibake

- Detected: `2026-10-02T18:25:00+07:00`
- Context: validating rendered synthetic invoices in `tests/test_invoices/pdfs/` with pypdfium2 text pages
- Symptom: Latin/digits extracted fine but Thai strings came back as `�Ţ...Шӣ` sequences, even though rendered pages show correct Thai
- Root Cause: the embedded Tahoma subset carries no usable ToUnicode CMap for the Thai glyphs, so text-layer mapping is unreliable even though glyph rendering is correct
- Solution: `check_pdfs.py` compares only ASCII/digit tokens (tax IDs, invoice serial, PO digits, totals) which are exactly what V-01 completeness cares about, and page images are inspected visually via pypdfium2 + Pillow
- Prevention: for OCR-corpus QA, verify Thai content by rendered image (the production path is a vision LLM on page images) and do not trust the PDF text layer of Tahoma-subset PDFs
- Evidence: `check_pdfs.py` reports 155 PDFs / 157 pages with 0 mismatches; preview renders confirmed correct Thai glyphs
- Status: `mitigated`

### `ERR-20261002-004` — PDF audit silently skipped its missing-field assertion

- Detected: `2026-10-02T19:00:00+07:00`
- Context: writing `tests/test_invoice_corpus.py` and mutating the dataset to prove the audit is not vacuous
- Symptom: `check_pdfs.py` returned `[ OK ]` even after the key was edited to claim a printed field was missing; the "field must be absent" branch never fired for the 55 wave-1 invoices
- Root Cause: the branch compared against `oracle_rows[0]`, which only exists on wave-2 entries, so `absent_source` was `{}` and the digit token was shorter than the 6-char guard — a silently inert assertion
- Solution: resolve the source row from the stored wave-2 rows first, otherwise look up `_raw/oracle_receipts.csv` by `oracle_source.receipt_num` (same lookup the renderer uses); also harden `document_flags` handling with `inv.get(...) or {}`
- Prevention: whenever adding a "should be absent" style check, run a deliberate mutation (lie in the answer key) and require the checker to fail; prefer an explicit unverifiable counter over an implicit skip
- Evidence: mutation `INV-A01.supplier_tax_id = None` now yields `INV-A01: supplier_tax_id should be missing but '0105531097289' is printed`; clean dataset still reports 0 failures and `pytest` 9 passed
- Status: `resolved`

### `ERR-20261002-005` — n8n MCP `setNodeParameter` writes to a nested `parameters.parameters` key

- Detected: `2026-10-02T19:40:00+07:00`
- Context: patching Code nodes of workflow `aLUCmn3l0bZDjbVV` with `aiva-n8n_update_workflow` using `path: "/parameters/jsCode"`; the call returned `appliedOperations: 2` with no warning, but a re-export still showed the old v6.4 code
- Symptom: node gained a stray key `parameters.parameters.jsCode` containing the new code while `parameters.jsCode` (the field n8n actually executes) kept the old code — a silent, successful-looking no-op
- Root Cause: the tool's JSON Pointer `path` is already resolved **relative to the node's `parameters` object**, so `/parameters/jsCode` appends one level instead of replacing `jsCode`
- Solution: use `/jsCode`, `/jsonBody`, `/options`; remove the leftover blob with a second `setNodeParameter` operation whose `value` is `null` (the tool nulls the key). Then re-export and diff stored code against the local source files byte-for-byte
- Prevention: after every `update_workflow` call, re-fetch the workflow and compare the target field to the intended value instead of trusting `appliedOperations`; treat "op applied" as transport success, not semantic success. Node-level flags (`onError`, `alwaysOutputData`) land as top-level node keys in the export, not under `settings`
- Evidence: final export diff reports `IDENTICAL` for all 7 rewritten `jsCode` fields and the N7 `jsonBody`; `tmp/run_flow_sim.js` (which executes the exported code) then produces the expected Table 9 decisions
- Status: `resolved`

### `ERR-20261002-006` — `ORA-01791` when a receipt query drops `ITM_CODE` from the SELECT list

- Detected: `2026-10-02T19:15:00+07:00`
- Context: reshaping the `AH_DEV_RCV_PO_AP_MATCHING_V` query in `N7: Oracle MCP rcv_v01` and testing it through the `oracle` MCP tool
- Symptom: `ORA-01791: not a SELECTed expression` when the query used `SELECT DISTINCT` and `ORDER BY v.RCV_NUM, v.ITM_CODE` but omitted `v.ITM_CODE` from the projection
- Root Cause: with `SELECT DISTINCT`, every `ORDER BY` expression must appear in the select list
- Solution: always keep `v.ITM_CODE` in the projection (the matcher needs it as `ITEM_NUMBER` anyway); validate shape/syntax with a bounded query (`AND v.ITM_CODE = '…'` or `AND ROWNUM <= n`) because `max_rows` is not an accepted argument of `oracle_sql_run`
- Prevention: when editing the N7 SQL, never trim the select list without trimming `ORDER BY`; treat row counts from this dev view as non-deterministic (same query returned 2 rows then 0 rows minutes apart) and assert only shape/syntax
- Evidence: bounded queries through `oracle_sql_run` returned the expected columns including the `SUPPLIER_IS_INTERNAL` scalar (`1` for tax `0145556001111`)
- Status: `resolved`

### `ERR-20261003-006` — Workflow เปลี่ยนเป็น undefined เมื่อ action ไม่มีสถานะปลายทาง

- Detected: `2026-10-03T13:10:00+07:00` (เก็บจาก log/พฤติกรรมของ portal รอบก่อน แล้วกันการเกิดซ้ำใน mockup v3)
- Context: ฟอร์ม action ผูกสถานะปลายทางกับตาราง action (`d.wf = ACTIONS[k].wf`) และบาง action เช่น `explain` "ไม่เปลี่ยน workflow"
- Symptom: หลังกด "ชี้แจง" สถานะ workflow กลายเป็น `undefined` badge ว่างเปล่า และคิว/KPI นับเอกสารใบนี้ไม่ตรง
- Root Cause: แยก "action ที่ไม่เปลี่ยนสถานะ" ด้วยการ *ไม่ใส่ field* ทำให้ `a.wf` เป็น `undefined` แล้ว code assign ตรง ๆ ลง state — ความหมาย "ไม่เปลี่ยน" กับ "ไม่มีค่า" ถูกเขียนด้วยวิธีเดียวกัน
- Solution: ประกาศ `wf: null` ให้ชัดใน `ACTIONS` (explain/release_hold = null) และ assign แบบ `if (a.wf) d.wf = a.wf` · เพิ่ม assertion ใน `smoke-test.js` ว่าหลัง `explain` ทุกเอกสารในขอบเขตยังต้องมี `wf` ใน `WF_LABEL` และผลตรวจคงเดิม
- Prevention: state ที่เป็น enum ต้องไม่มี path ไหนเขียน `undefined` ลงไป — ให้ใช้ `null` + explicit branch และเขียน test ที่อ่านค่า state กลับหลังทำ action *ทุกตัว* ไม่ใช่เฉพาะ action ใหญ่
- Evidence: `node tools/smoke-test.js` → ผ่าน 60 การตรวจ (มีเคส explain 3 user ขึ้นไป) และ browser-check ไม่มี `undefined` บนหน้าจอ
- Status: `resolved`

### `ERR-20261003-007` — Browser check ไล่ไม่ครบหน้า เพราะอ่าน nav จากผู้ใช้คนเดียว

- Detected: `2026-10-03T14:05:00+07:00`
- Context: `tools/browser-check.js` เก็บรายการหน้าจาก `#nav` ตอนโหลดครั้งแรก (ผู้ใช้ตั้งต้น = ACC) แล้ววนทุกผู้ใช้ด้วยรายการนั้น
- Symptom: รายงาน "7 ผู้ใช้ × 3 หน้า" ทั้งที่ mockup มี 4 หน้า — หน้า audit (เปิดเฉพาะ APR/ADM) ไม่ถูกไล่หา `undefined`/`NaN` เลย และ ADM ที่ nav ไม่มีคิวก็ถูกทดสอบหน้าจอที่ไม่มีอยู่จริง
- Root Cause: nav ถูก RBAC ปิด/เปิดตามสิทธิ์ การสลับผู้ใช้จึงเปลี่ยน "หน้าจอที่เข้าถึงได้" ไม่ใช่แค่ข้อมูล — การวัด coverage จาก DOM ครั้งเดียวจึงเท่ากับวัดขอบเขตของผู้ใช้คนเดียว
- Solution: อ่าน `#nav a` ใหม่ทุกครั้งหลัง `switchUser()` แล้วไล่ตามรายการนั้น พร้อม assert ว่าบทบาทต่างกันต้องให้เห็น nav ต่างกัน (EU/ACC/APR/ADM) และจำนวนจอที่เข้าถึงได้ ≥ 18
- Prevention: เวลาทดสอบ RBAC ให้ derive "สิ่งที่ผู้ใช้กดได้" จาก UI ณ ขณะนั้น ไม่ใช่จากค่าที่เก็บไว้ตอนต้น และให้ตรวจว่า coverage ที่รายงานมาจากการวนจริง
- Evidence: หลังแก้ได้ "nav ของ EU 3 · ACC 3 · APR 4 (มี audit) · ADM 3 (ไม่มีคิว) · รวม 22 จอ" และผ่าน 14/14 การตรวจ
- Status: `resolved`

### `ERR-20261003-008` — ไฟล์ตรวจสอบชั่วคราวหลุดไปอยู่ในโฟลเดอร์ส่งมอบ

- Detected: `2026-10-03T13:55:00+07:00`
- Context: รอบพัฒนายกใหญ่ใช้สคริปต์ one-shot (`tools/_patch_a.py` … `_patch_m.py`) และผล debug (`_bc.js`, `_bc.txt`, `_dbg*`) วางไว้ในโฟลเดอร์ mockup แล้วจบ session โดยไม่ได้เก็บกวาดและไม่ได้อัปเดต records
- Symptom: `git status` มี untracked 20 ไฟล์ปะปนกับโค้ดส่งมอบ, ผู้รีวิวเห็นไฟล์ debug ในโฟลเดอร์ "no-build mockup" และงานที่เสร็จจริงถูกตรวจซ้ำใหม่ทั้งหมดเพราะไม่มีการบันทึก
- Root Cause: ไม่มี Convention/gitignore สำหรับไฟล์ชั่วคราว + เครื่องมือตรวจถูกเขียนเป็นสคริปต์ใช้แล้วทิ้ง จึงไม่มีใครเรียกใช้ซ้ำได้
- Solution: ลบไฟล์ที่ apply แล้วออก, แปลงสคริปต์ตรวจเป็นเครื่องมือถาวร `tools/browser-check.js` (assertion + exit code), เพิ่ม `.gitignore` กันไฟล์ขึ้นต้นด้วย `_`, และปิดรอบงานด้วย canonical records ตาม `AGENTS.md`
- Prevention: ไฟล์ชั่วคราวให้ขึ้นต้นด้วย `_` เสมอ (แล้ว ignore) — ถ้ามีค่าพอจะเก็บ ต้องตั้งชื่อใน `tools/` + อธิบายใน README ไม่งั้นให้ลบก่อนจบรอบ และห้ามจบรอบพัฒนาโดย `task-plan.md`/`changelog.md` ยังไม่อัปเดต
- Evidence: หลังเก็บกวาดโฟลเดอร์มีเฉพาะ `index.html`, `README.md`, `.gitignore`, `assets/` (5 ไฟล์), `tools/` (3 ไฟล์) และ smoke 60 + browser-check 14 ผ่าน
- Status: `resolved`

### `ERR-20261003-009` — import named export ที่ไม่มีอยู่จริง ทำให้ทั้ง app ไม่ bootstrap

- Detected: `2026-10-03T14:05:00+07:00`
- Context: เขียน 6 views ของ `invoice-webV4` พร้อมกัน โดยจำชื่อ helper เอง (`esc card table badge code money …`)
- Symptom: `SyntaxError: The requested module '../ui/dom.js' does not provide an export named 'code'` — browser ไม่ bootstrap เลย (ทั้งหน้าขาว ไม่ใช่ error เฉพาะส่วน)
- Root Cause: ES module ตรวจ named export ตอน link เวลา ไม่มี compile step จึงไม่รู้ล่วงหน้าว่าชื่อที่ import มีอยู่จริงหรือไม่; `code()` ถูกวางไว้ที่ `ui/format.js` แต่ view 3 ไฟล์ import จาก `ui/dom.js`
- Solution: แก้ import ใน `views/master.js`, `views/audit.js`, `views/help.js` ให้ดึง `code` จาก `../ui/format.js` แล้วเขียนสคริปต์ตรวจถาวร-style (dynamic import ทุกไฟล์ + เทียบ named import กับ export จริง) รันจนขึ้น `all imports resolve`
- Prevention: โปรเจกต์ no-build ต้องมี "import resolution check" เป็นขั้นตอนแรกสุดของ test suite (smoke group 9 render ทุก view ก็จับได้เหมือนกัน แต่ช้ากว่าและ message อ่านยากกว่า) และ helper ต้องรวมตามหมวด: DOM construction = `ui/dom.js`,การเปลี่ยนหนะแสดงผล = `ui/format.js`
- Evidence: `node tools/smoke-test.mjs` group 9 → render ผ่าน 8 view · `node tools/browser-check.mjs` ผ่านโดยไม่มี pageerror ตอน bootstrap
- Status: `resolved`

### `ERR-20261003-010` — UI helper รับได้แบบเดียว แต่ call site ส่งอีกแบบ

- Detected: `2026-10-03T14:15:00+07:00`
- Context: `table({head, rows})` ใน `src/ui/dom.js` ถูกออกแบบให้ `rows` เป็น array ของ array แต่ dashboard/queue ที่เขียนก่อนหน้าประกอบ `<tr>…</tr>` เป็น string
- Symptom: `TypeError: r.map is not a function` ที่ `src/ui/dom.js:35` ตอน render dashboard (queue ก็พังแบบเดียวกัน)
- Root Cause: helper กลางกับ call site โตคนละรอบ โดยไม่มี test ที่ render view จริงในช่วงที่เขียน → type mismatch โผล่ตอนเปิด browser เท่านั้น
- Solution: ทำให้ `mount`-level helper ยืดหยุ่น: `rows` รับได้ทั้ง array ของ array, array ที่มี array เดียว, array ของ string ที่ขึ้นต้นด้วย `<tr` และ string เปล่า ๆ (แปลงเป็น `[rows]`) แทนการ rewrite call site ทุกแห่ง
- Prevention: helper กลางต้องระบุ input ที่รับได้ใน docstring + มี test ที่ render view ทุกหน้าด้วยข้อมูลจริง (ตอนนี้คือ group 9 ของ smoke test ซึ่งจับ class นี้ได้ทันที)
- Evidence: group 9 ผ่าน 8 view รวมถึง dashboard/queue ที่เคยพัง
- Status: `resolved`

### `ERR-20261003-011` — ส่ง decimal string เข้า helper ที่รับเฉพาะ `Dec` → `RangeError … NaN → BigInt`

- Detected: `2026-10-03T14:25:00+07:00`
- Context: `src/domain/money.js` แตะ `BigInt` ตรง ๆ ตามสัญญาว่า ทุกค่าจะถูกแปลงด้วย `dec()` ก่อน
- Symptom: `RangeError: The number NaN cannot be converted to a BigInt because it is not an integer` ที่ `money.js:66` ผ่าน `dAdd` ตอนเปิดหน้า detail
- Root Cause: view ส่ง raw field จาก snapshot (`snap.invoice.vat`, `line.amount`, `null` เมื่อไม่มีค่า) เข้า `dAdd/dMul/dDiff/dCmp` ตรง ๆ → `Number(null)` = `NaN` → `BigInt(NaN)` throw; API ของ helper สื่อสารผิด (ชื่อฟังก์ชันสั้นจนเหมือนรับ string ได้)
- Solution: wrap ทุก call site ใน `views/detail.js`/`views/queue.js` ด้วย `dec(...)` และเพิ่ม helper null-safe `const D = (x) => dec(x ?? "0")` เทียบศูนย์กับ `D0 = dec("0")`; เพิ่ม test decimal คุม `600 × 30.666667 = 18400.0002` และการเทียบค่า
- Prevention:สัญญาของชั้น money คือ "รับ `Dec` เท่านั้น" — call site ต้องไม่ส่ง string/null เข้าไป ถ้าจะทำให้ helper รับ string ได้ต้องแก้ที่ money.js ที่เดียวพร้อม test ไม่ใช่กระจาย `dec()` ใน view
- Evidence: detail render ผ่านทั้งเคส VAT ปกติ / USD ไม่มี VAT / ทศนิยม 6 ตำแหน่ง และ smoke group 1 ผ่าน
- Status: `resolved`

### `ERR-20261003-012` — เขียน `innerHTML` ตอนโฟกัสอยู่ในพื้นที่เดิม ทำให้ throw ใน browser จริง

- Detected: `2026-10-03T15:05:00+07:00`
- Context: `src/ui/dom.js` มี `mount(node, html)` เป็นจุดเดียวที่แตะ `innerHTML`; ตัวกรองคิว repaint ทั้ง view ทุกครั้งที่พิมพ์ แล้วคืน focus ให้ input ใหม่
- Symptom: Chromium pageerror `Failed to set the 'innerHTML' property on 'Element': The node to be removed is no longer a child of this node. Perhaps it was moved in a 'blur' event handler?` ทุกครั้งที่พิมพ์ในช่องค้นหา — ใน node/smoke test (ไม่มี DOM) มองไม่เห็นเลย
- Root Cause: ตอน `fill()` ของ browser มีการจัดการ focus/blur ของ input ที่ถูกถอดออกกลางการ assignment — Chrome พยายามถอด node ที่ถูกย้ายไปแล้วโดย innerHTML ของเรา
- Solution: `mount()` ทำ `document.activeElement.blur()` ก่อน ถ้า activeElement อยู่ภายใน node ที่จะเขียนทับ (แล้ว handler เดิมเรียก `focus()` + คืน caret position บน element ใหม่อยู่แล้ว จึงไม่เสีย UX)
- Prevention: UI ที่ repaint ทั้งก้อนต้องถูกตรวจด้วย browser จริง (`tools/browser-check.mjs` เก็บ case พิมพ์ในช่องค้นหาไว้) — logic test อย่างเดียวไม่พอ และควรไล่ case "พิมพ์/ลบ/สลับ focus" เสมอ
- Evidence: `node tools/browser-check.mjs` → ✓ 14/14 · "ปิดท้าย: ไม่มี console error สะสมทั้งรอบ" ผ่าน
- Status: `resolved`

### `ERR-20261003-013` — ล้นแนวนอน 621px ที่จอ 390px จาก header ไม่ใช่ตาราง

- Detected: `2026-10-03T15:08:00+07:00`
- Context: CSS ของ v4 ยืม design token จาก mockup v4.4 ซึ่งออกแบบสำหรับจอ desktop และมี `@media` เดียวที่ 1180px
- Symptom: browser-check fail "ล้นแนวนอน 621px ที่จอ 390px" (document scrollWidth 1011px)
- Root Cause: `.brand { min-width: 250px }` + `nav.nav` (301px) + `.top-right` (394px) ในแถว flex เดียว ไม่ wrap; `.grid-2 { minmax(430px,1fr) }` ยังบังคับ track กว้างกว่าจอ — ตัวการไม่ใช่ `.table-wrap` ที่มี `overflow-x:auto` อยู่แล้ว
- Solution: เพิ่ม media query `max-width: 860px`: header wrap + nav เลื่อนแนวนอน (ซ่อน scrollbar), `#ctxbar` เป็น static, `#view` ลด padding, grid ทุกชุด (`kpis/kv.cols-2/two-col/grid-main/grid-2`) เป็นคอลัมน์เดียว, modal/toast ยึดความกว้างจอ
- Prevention: ตรวจ overflow ที่ 390px เป็น assertion ถาวรใน browser-check; เวลา debug ให้ list element ที่ `right > innerWidth` (probe 3 บรรทัด) แทนการเดาจาก CSS
- Evidence: `node tools/browser-check.mjs` → "mobile 390px ไม่มีการเลื่อนแนวนอน" ผ่าน (overflow ≤ 2px)
- Status: `resolved`

### `ERR-20261003-014` — อักษร CJK/ภาษาอื่นหลุดเข้าไฟล์ (โค้ด + docs) และวิธีแก้ที่ปลอดภัยบน Windows

- Detected: `2026-10-03T14:40:00+07:00`
- Context: งานนี้เขียนไทยทั้งก้อนด้วยเครื่อง Windows/Git Bash ที่ console เป็น cp874/1252 และมีทั้ง python heredoc กับ edit tool
- Symptom: เทสต์ hygiene ตกหลายรายการ — เจออักษร CJK ปนใน `docs/04-ui-spec.md`, `docs/05-build-and-test.md`, `docs/07-demo-script.md` และ `src/views/master.js` (ไฟล์ละ 1–3 ตัว); บางครั้งที่ Python เขียนไฟล์แล้วขึ้น `UnicodeEncodeError: 'charmap' codec can't encode characters`
- Root Cause: (1) ตอนพิมพ์ข้อความไทยยาว สลับ input method ทำให้ติดอักษรจีน/ญี่ปุ่นมาโดยไม่รู้ตัว (2) การส่ง `\uXXXX` ผ่าน bash heredoc ไม่เสถียร — shell/python อาจ decode ให้ก่อนถึงไฟล์ ทำให้ source JS เพี้ยน (`SyntaxError: missing ) after argument list`) (3) console Windows ไม่ใช่ UTF-8
- Solution: เพิ่มการตรวจอักษรต่างประเทศทุกไฟล์ (`.js/.mjs/.py/.md`) ใน smoke group 7 — block CJK/Hiragana/Katakana/Lao/Khmer/Myanmar/Hebrew/Arabic/Cyrillic/Vietnamese แต่ **อนุโลม Greek** เพราะ `Σ` ใช้เป็นสัญลักษณ์รวมยอดจริง ๆ · แก้ข้อความด้วย `edit` tool หรือ python ที่อ่านข้อความเดิมจากไฟล์ (ไม่ hand-escape) · ใช้ raw string `r'…'` เมื่อต้องใส่ regex/JS source ผ่าน python · เพิ่ม `_utf8_stdout()` ในสคริปต์ python ทุกตัว
- Prevention: ก่อนปิดรอบให้รัน "scan อักษรต่างประเทศ" เป็นขั้นสุดท้ายเสมอ (smoke ทำให้อยู่แล้ว) และระวังว่าเทสต์สแกน `.md` ด้วย — typo ใน docs ทำให้ suite ตกได้ ซึ่งตั้งใจให้เป็นแบบนั้น
- Evidence: `node tools/smoke-test.mjs` → "✓ ผ่านทั้งหมด 107 รายการ" รวมถึงรายการ "ไม่มีอักษรภาษาอื่นปน"; `agent/work-log.md` ก็ถูก scan เจอ อักษรจีน 2 จุด (คำที่ควรเขียนว่า branch และ "ครอบคลุม") แล้วแก้เป็นไทย/อังกฤษแล้ว
- Symptom: ตรวจ hygiene ตกหลายรายการ — เจออักษร CJK ปนอยู่ใน `docs/04-ui-spec.md`, `docs/05-build-and-test.md`, `docs/07-demo-script.md` และ `src/views/master.js` (คนละ 1–3 ตัว) กับอักษรจีนที่หลุดเข้าเงื่อนไข Japanese; บางครั้งที่ Python เขียนไฟล์แล้วขึ้น `UnicodeEncodeError: 'charmap' codec can't encode characters`
