# Task และ Plan

Last updated: `2026-10-02T20:20:00+07:00`

## Active Task
- Task ID: `TASK-20261002-008`
- Title: ปรับ n8n workflow `aLUCmn3l0bZDjbVV` ให้ทำงานตรงกับ Python FastAPI engine (v6.5) ผ่าน MCP และอัปเดตเอกสาร flow structure
- Status: `completed`
- Goal: ใช้ `aiva-n8n` MCP อ่าน workflow ตัวจริงบนเซิร์ฟเวอร์ แล้วแก้ node ที่ logic ยังต่างจาก `app/core/rules.py` / `app/services/*` ให้ตรงกันแบบ 1:1 โดยคงโครง node/connection เดิม และพิสูจน์ด้วย code ที่ export กลับมาจากเซิร์ฟเวอร์จริง ไม่ใช่จากไฟล์ที่ตั้งใจจะส่ง

## Plan
- [x] ตรวจว่า MCP `aiva-n8n` connected/authenticated และ export workflow ทั้ง 23 nodes ลงมาอ่านจริง (`tmp/wf_v65.json`)
- [x] อ่าน Python ทั้งไฟล์ (`rules.py`, `oracle_mcp.py`, `pipeline.py`, `vision_extractor.py`, `portal.py`, `paperless.py`, `master_data_service.py`, `models.py`) แล้วทำ gap list ราย node โดย map ชื่อฟิลด์ให้เข้ากับ data shape จริงของ n8n (`lines[]`, `oracle_rcv_rows[]`) ไม่ใช่ชื่อฝั่ง Python
- [x] เขียน JS ต้นฉบับต่อ node ไว้ที่ `tmp/nodes/*.js` + `tmp/nodes/N7_jsonbody.txt` และตรวจไวยากรณ์ด้วย `node --check`
- [x] ยืนยัน SQL shape ผ่าน MCP `oracle` (`oracle_sql_run`): dual-branch WHERE, scalar `SUPPLIER_IS_INTERNAL`, ข้อจำกัด `ORDER BY` กับ `SELECT DISTINCT`
- [x] ส่ง `aiva-n8n_update_workflow` หลายรอบ (atomic, ≤100 ops): `N2.4`, `HTTP Request`, `N4`, `N7`, `N7.1`, `N8`, `N9`, `N10`, `N12`, `N13` + rename workflow เป็น v6.5
- [x] แก้ปัญหา path ของ `setNodeParameter` (ต้องเป็น `/jsCode` ไม่ใช่ `/parameters/jsCode`) และล้างค่าค้าง `parameters.parameters`
- [x] re-export แล้ว diff `jsCode`/`jsonBody` เทียบไฟล์ต้นฉบับ byte-for-byte จนขึ้น `IDENTICAL` ครบทุก node ที่แก้
- [x] สร้าง harness `tmp/run_flow_sim.js` ที่รัน jsCode จาก export จริง ครอบคลุม 7 เคส และตรวจว่าผ่าน `N11: Schema Validate`
- [x] อัปเดต `OCR service/n8n/n8n flow structure.md` เป็น v6.5 และบันทึกผลใน canonical records ทั้งหมด

## Acceptance criteria
- ทุก node ที่ logic ต่างจาก Python ถูกแก้จนตรรกะเท่ากัน (8-pass matcher, dynamic intercompany, invoice→PO preference, full `oracle_data.receipts`, prompt parity, portal fault tolerance) และ node ที่ตรงแล้วไม่ถูกแก้
- code ที่อยู่บนเซิร์ฟเวอร์หลังอัปเดต **เท่ากับ** ไฟล์ต้นฉบับที่ตรวจแล้ว (diff 0) และทุก Code node ผ่าน `node --check`
- ผลการจำลอง 7 เคสให้ decision/code ตรงกับ rules engine ของ Python รวมถึง path E28 bypass และ E17/E35 ที่ต้องข้าม STEP 3
- workflow ไม่มี connection/data shape ที่พัง (23 nodes เท่าเดิม) และไม่มีการบันทึก token/credential ลง record หรือ log
- เอกสาร `n8n flow structure.md` อธิบาย v6.5 ได้ครบ ทั้ง SQL, query mode, parity map และผลทดสอบ

## Result
- Workflow บนเซิร์ฟเวอร์ชื่อ `AIVA PO-INV Matching Verification v6.5` (`active: false`, 23 nodes) — diff หลัง re-export รายงาน `IDENTICAL` สำหรับ 7 jsCode + N7 `jsonBody`
- `N9` เปลี่ยนเป็น 8-Pass Bipartite Matcher ที่ไม่ใช้แถวซ้ำ; `N7`/`N7.1` ยิง Oracle ครั้งเดียวด้วย `(Invoice+Tax) OR (PO_NUM)` แล้วคัดเลือกฝั่ง client (`oracle_query_mode` = `INVOICE`/`PO_FALLBACK`/`PO`/`NONE`); intercompany มาจาก scalar `SUPPLIER_IS_INTERNAL`; `N10` ส่ง `oracle_data.receipts` ครบทุกแถว; `N12` มี `onError: continueRegularOutput` + timeout 15s; `N13` รายงาน `portal_dispatch`
- harness รัน code จาก export จริง: 7/7 เคสตรง Python (Auto-pass, PO fallback, E28→`queried:false`+reason, E17, E06, E35, intercompany+E26) และ `node --check` ผ่านทั้ง 12 Code nodes
- บันทึกข้อผิดพลาดสำคัญ 2 รายการใน `errors-and-solutions.md` (`ERR-20261002-005` MCP JSON-pointer, `ERR-20261002-006` `ORA-01791` กับ `ORDER BY`)
- เหลืองานที่ยอมรับเป็นข้อจำกัด: ยังไม่เคยรัน end-to-end จริงกับ Paperless/LiteLLM/Portal และ N7 ยัง hardcode Authorization header (ควรย้ายเป็น credential)

## Previous Result
- `TASK-20261002-007` Synthetic invoice corpus: `tests/test_invoices/` มี 155 PDF (157 หน้า) + answer key 155 รายการที่ผลิตจาก `app/core/rules` จริง (`verify_dataset.py` รายงาน drift 0/155 หลัง recalibrate wave 1 จำนวน 30 รายการ), `check_pdfs.py` ผ่าน 155 ไฟล์ไม่มี mismatch, มี pytest offline gate `9 passed, 2 deselected` (~1.7s) และพิสูจน์ความไวของ gate ด้วย mutation 4 แบบ — รายละเอียดใน `agent/sessions/2026-10-02-007-synthetic-invoice-corpus-wave2.md`
- Normalize UI ของ invoice-web ทั้งหมด: KPI cards + consolidated filter bar, high-contrast queue table, Executive 3-Way Match Snapshot, Provenance bar, 3-Step Verification Stepper, Discrepancies callout with PDF jump, Decision Hub และ 5 detail tabs
- Backend unittest 15 ผ่าน, TypeScript + Vite production build ผ่าน, Playwright E2E 6 ผ่าน (desktop/mobile 390px), ตรวจภาพจริงผ่าน browser subagent
- ก่อนหน้านั้น: เพิ่ม workflow actions แบบ persistent (explain/resubmit/rerun/return/reject/hold/confirm) พร้อม reason policy, optimistic version, idempotency, audit และ action outbox

## Outside this task
- ไม่แก้กฎ/threshold ฝั่ง Python (`app/core/rules.py`) เพื่อให้ n8n ตามทัน — n8n เป็นฝ่ายตาม Python เท่านั้น
- ไม่เปิดใช้งาน workflow (`active`) และไม่วิ่งงานจริงกับ Paperless/LiteLLM/Portal ในรอบนี้
- ไม่ย้าย credential ของ N7 เป็น n8n credential และไม่มี commit/push token หรือ payload จริงใน record
