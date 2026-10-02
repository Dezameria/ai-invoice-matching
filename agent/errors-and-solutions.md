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
