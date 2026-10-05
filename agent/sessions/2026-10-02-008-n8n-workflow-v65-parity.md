# Session: อัปเดต n8n workflow เป็น v6.5 ให้ตรงกับ Python engine ผ่าน MCP

- Session ID: `SESSION-20261002-008`
- Started: `2026-10-02T18:55:00+07:00`
- Ended: `2026-10-02T20:20:00+07:00`
- Status: `closed`
- Task IDs: `TASK-20261002-008`

## Objective

ยืนยันว่า MCP `aiva-n8n` ใช้งานได้ แล้วอัปเดต workflow `aLUCmn3l0bZDjbVV` บนเซิร์ฟเวอร์ให้แต่ละ node มีตรรกะตรงกับ Python FastAPI service (`app/main.py` → `app/services/pipeline.py` + `app/core/rules.py`) และอัปเดต `OCR service/n8n/n8n flow structure.md` เป็นเวอร์ชันล่าสุด

## Baseline

- Branch `main` (ทำงานใน working tree เดิมที่มีไฟล์ค้างจาก session ก่อนหน้า), ไม่มี commit ในรอบนี้
- Workflow บนเซิร์ฟเวอร์: ชื่อ `AIVA PO-INV Matching Verification v6.2`, 23 nodes, `active: false`,ตรรกะ STEP 3 ยังเป็น Ladder แบบ "แถวแรกชนะ", Oracle query มีแค่ branch Invoice+Tax, intercompany ยัง hardcode tax list
- ต้นฉบับ Python: `app/core/rules.py` (763 บรรทัด), `app/services/oracle_mcp.py`, `pipeline.py`, `vision_extractor.py`, `portal.py`, `paperless.py`, `master_data_service.py`, `app/core/master_data.py`
- เอกสาร: `n8n flow structure.md` v6.4.0

## Summary

- MCP `aiva-n8n` connected + authenticated (52 tools) และใช้ update ทั้ง flow ได้จริงแบบ atomic (หลาย call, call ละ ≤100 ops) โดย node เดิมที่ logic ตรงแล้วไม่ถูกแตะ
- Workflow กลายเป็น `AIVA PO-INV Matching Verification v6.5` โดย node ที่แก้: `N2.4`, `HTTP Request`, `N4`, `N7` (jsonBody), `N7.1`, `N8`, `N9`, `N10`, `N12` (settings/options), `N13` — รายละเอียดทีละ node อยู่ใน `agent/changelog.md` รายการ `CHG-20261002-009`
- จุดหลัก: 8-Pass Bipartite Line Matcher, Oracle dual-branch query ครั้งเดียว + intercompany flag แบบ dynamic, `oracle_data.receipts` ส่งครบทุกแถว, vision prompt ชุดเดียวกับ Python, Portal POST แบบไม่ทำ flow ล้ม, N13 รายงาน `portal_dispatch`
- เอกสาร `n8n flow structure.md` เขียนใหม่เป็น v6.5.0 เพิ่มตาราง Python ↔ n8n Parity Map, โหมด `oracle_query_mode` และผล regression 7 เคส

## Files Changed

- `OCR service/n8n/n8n flow structure.md` — อัปเดตเป็น v6.5.0 (header, ตารางสิ่งที่เปลี่ยน, D2/D3, mermaid, ตาราง node, SQL, V-07, Parity Map, ผลทดสอบ, ข้อควรระวัง MCP)
- `agent/current-state.md`, `agent/task-plan.md`, `agent/changelog.md`, `agent/work-log.md`, `agent/errors-and-solutions.md`, `agent/sessions/2026-10-02-008-n8n-workflow-v65-parity.md` — บันทึกตาม canonical records
- **บนเซิร์ฟเวอร์ (ไม่อยู่ใน git):** workflow `aLUCmn3l0bZDjbVV` เวอร์ชัน v6.5
- Scratch (ไม่ commit, อยู่ใน `tmp/` และถูก ignore): `tmp/nodes/*.js`, `tmp/nodes/N7_jsonbody.txt`, `tmp/wf_v65.json`, `tmp/wf_latest.json`, `tmp/run_flow_sim.js`, `tmp/dbg.js`, `tmp/chk/*`
- `.gitignore` (repo root, ไฟล์ใหม่) — กัน archive/scratch, สถานะ agent/MCP ในเครื่อง, ผลรัน batch ที่มี invoice จริง และข้อมูล corpus ที่สังเคราะห์จาก Oracle extract ไม่ให้ขึ้น remote
- `OCR service/n8n/tests/test_invoice_corpus.py` — เพิ่ม module-level skip เมื่อไม่มี answer key และ skip เฉพาะเคส PDF เมื่อไม่มี `pdfs/` (จำเป็นเพราะข้อมูล corpus ไม่ถูก commit)
- ไม่มีไฟล์ source ฝั่ง Python ถูกแก้ (Python เป็นต้นฉบับ ไม่ใช่ฝ่ายตาม)

## Validation

- `node --check` บน jsCode ทั้ง 12 Code nodes (ถอดจาก export จริงของเซิร์ฟเวอร์) → ผ่านทั้งหมด
- Diff `jsCode` ของทุก node ที่แก้ กับ `tmp/nodes/*.js` หลัง re-export → `IDENTICAL` ครบ (N4 6385, N7.1 5555, N8 4937, N9 9695, N10 3511, N13 2084, N2.4 4100 ตัวอักษร) และ N7 `jsonBody` ตรงกัน; `N12` ตรวจพบ `onError: continueRegularOutput` + `timeout: 15000`
- `node tmp/run_flow_sim.js` (รัน jsCode ที่ export จริง N4→N5→N7.1→N8→N9→N10→N11 กับ fixture 7 ชุด) → 7/7 ตรงกับที่ `app/core/rules.py` ให้ผล: Auto-pass (`INVOICE`), Auto-pass (`PO_FALLBACK`), E28 + Oracle bypass + Hold→accounting, E17 Hold→user (V-05 ไม่ถูกประเมิน), E06, E35 (ข้าม STEP 3), intercompany + E26; ทุกเคสผ่าน `N11: Schema Validate`
- SQL ตรวจผ่าน MCP `oracle` `oracle_sql_run` (bounded query): ยืนยันว่าเลขบิล `112603974` ไม่อยู่ใน `RCV_INV_NUM` แต่ PO `40121195` มีแถว (จึงต้องมี OR branch) และ scalar `SUPPLIER_IS_INTERNAL` คืน `1` สำหรับภาษี `0145556001111`
- `.venv/Scripts/python.exe -m pytest -q` → `9 passed, 2 deselected in 1.54s` เมื่อมีข้อมูล corpus ครบ และ `2 passed, 1 skipped, 2 deselected` เมื่อถอด `test_dataset.json` ออกชั่วคราว (พิสูจน์ skip guard ทำงาน แล้วคืนไฟล์เดิม 715,402 bytes)
- `git ls-files` ไม่พบ `.env`/credential ใน index; `OCR service/n8n/.env` ยังถูก ignore ตามเดิม
- ไม่มีการเรียก Paperless/LiteLLM/Portal จริง และไม่มีการเปิด workflow

## Decisions

- ใช้ `(Invoice + Tax) OR (PO_NUM)` ใน SQL เดียว + คัดเลือกแถวฝั่ง client (N7.1) แทน `NOT EXISTS` หรือ 2 calls: คงหลักการ "Oracle ครั้งเดียว" และเลี่ยง view scan ซ้ำ (baseline ~60+ วินาที) ผลลัพธ์เท่ากับ `OracleMCPClient` ที่ยิง 2 คำสั่ง
- Port ตรรกะจาก **data shape จริงของ n8n** (`lines[]`, `oracle_rcv_rows[]`, `oracle_rows_all`) ไม่ copy ชื่อตัวแปรจาก Python มาใช้
- ไม่แก้ `N5`/`N11` เพราะตรงกับ `evaluate_step1`/`validate_output` แล้ว — ลดความเสี่ยงทำสิ่งที่ถูกต้องพัง
- เก็บ `parameters: null` ที่เกิดจากการล้าง stray key ไว้ (ไม่มีผลต่อ execution) แทนการ resend payload ขนาดใหญ่ของ `N7` ซึ่งมี Authorization header
- ทดสอบด้วย harness ที่รัน code จาก export จริง แทนการรัน workflow บนเซิร์ฟเวอร์ เพื่อไม่ให้เกิด side effect กับ Paperless/LiteLLM/Oracle

## Errors

- `ERR-20261002-005` — MCP `setNodeParameter` เขียนลง `parameters.parameters.jsCode` (path สัมพัทธ์กับ `parameters`) ทำให้ call แลดู success แต่โค้ดจริงไม่เปลี่ยน
- `ERR-20261002-006` — `ORA-01791` เมื่อตัด `v.ITM_CODE` ออกจาก `SELECT DISTINCT` ทั้งที่ยัง `ORDER BY` มันอยู่
- ข้อจำกัด API อื่นที่พบ (ไม่ได้บันทึกรวมเป็น error): `setWorkflowMetadata.description` ≤ 255 ตัวอักษร, `versionName` ≤ 80, `oracle_sql_run` ไม่รับ `max_rows`, `settings` ของ node ตั้งผ่าน op อื่น ไม่ใช่ path `/settings`

## Handoff

- ไม่ push ข้อมูลที่สังเคราะห์จาก Oracle extract จริง (`_raw/`, `pdfs/`, `test_dataset.json`) ขึ้น GitHub — ถ้าต้องการ corpus gate บน CI ต้องตัดสินใจก่อนว่าจะเก็บ data artifact ไว้ที่ใด (LFS หรือ artifact store) เพราะ `verify_dataset.py` ต้องใช้ `_raw/`
- งานถัดไปที่ควรทำ: (1) รัน workflow จริง 1 ใบ (ผ่าน `aiva-n8n_execute_workflow` หรือ Manual Trigger) เพื่อพิสูจน์ path Paperless → LiteLLM → Oracle → Portal → tagging, (2) ย้าย Authorization header ของ `N7` ไปเป็น n8n credential, (3) ใส่ credential ของ node Paperless/LiteLLM/Portal ที่ยังค้างจาก setup เดิม, (4) จัด node groups/sticky notes ตามที่ n8n validate เตือน
- Workflow ยัง `active: false` — ต้องตรวจ end-to-end ก่อนเปิดใช้งาน
- Agent รอบต่อไปเวลา update workflow ผ่าน MCP: ใช้ path `/jsCode`, `/jsonBody`, `/options` และ **re-export + diff ทุกครั้ง** อย่าเชื่อ `appliedOperations`
