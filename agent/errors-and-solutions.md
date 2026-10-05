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

### `ERR-20261003-001` — Skill validator reads UTF-8 Markdown with Windows legacy encoding
- Detected: `2026-10-03T08:31:00+07:00`
- Context: ตรวจ `.agents/skills/aiva-invoice-core/SKILL.md` ที่มีภาษาไทยด้วย `quick_validate.py`
- Symptom: Python ล้มด้วย `UnicodeDecodeError` จาก codec `cp1252/charmap`
- Root Cause: Python process บน Windows ใช้ legacy text encoding ขณะที่ skill file เป็น UTF-8
- Solution: ตั้ง `$env:PYTHONUTF8='1'` ก่อนรัน validator; validation ผ่าน
- Prevention: รัน Python tools ที่อ่าน Markdown ภาษาไทยด้วย UTF-8 mode และเก็บไฟล์ skill เป็น UTF-8
- Evidence: `quick_validate.py .agents/skills/aiva-invoice-core` คืน `Skill is valid!` หลังเปิด UTF-8 mode
- Status: `resolved`

### `ERR-20261003-002` — Nested brace inside a template-literal expression breaks V8 parsing

- Detected: `2026-10-03T11:35:00+07:00`
- Context: สร้าง `Web portal/invoice-webv3/assets/app.js` ฟังก์ชัน `rbacPage()` ตอนเรนเดอร์ตารางสิทธิ์
- Symptom: `node --check assets/app.js` ล้มด้วย `SyntaxError: Missing } in template expression` ทั้งที่วงเล็บดู balance ปกติ
- Root Cause: ใช้ fallback string ที่เป็น `"}"` ภายใน `${ }` ของ template literal ทำให้ parser เจอคู่ `}}` และตีความว่าจบ expression ก่อนถึงเครื่องหมายคำพูดปิด string
- Solution: เปลี่ยน fallback เป็น class name ปกติ ("no") และแยกเครื่องหมาย ✓/· ออกจากค่า class ไม่ใส่ `{`/`}` ในสตริงภายใน `${ }` อีก
- Prevention: ห้ามใส่ปีกกาใน string literal ที่อยู่ข้างใน `${ }` ของ template literal; ถ้าจำเป็นให้ออกมาเป็นตัวแปรหรือ concatenation; รัน `node --check <file>` ทุกครั้งก่อนเปิดในเบราว์เซอร์
- Evidence: หลังแก้ `node --check "Web portal/invoice-webv3/assets/app.js"` ผ่าน
- Status: `resolved`

### `ERR-20261003-003` — Global name collision between page state variable and page render function

- Detected: `2026-10-03T11:35:00+07:00`
- Context: `Web portal/invoice-webv3/assets/app.js` ประกาศ `let auditPage = 1` (เลขหน้า audit) ร่วมกับ `function auditPage()` (ตัวเรนเดอร์หน้า audit)
- Symptom: `SyntaxError: Identifier 'auditPage' has already been declared` จาก `node --check`; ในเบราว์เซอร์สคริปต์ทั้งไฟล์จะไม่ทำงาน
- Root Cause: ไฟล์ทั้งหมดเป็น classic script ที่ใช้ global scope ร่วมกัน ไม่มี module boundary ชื่อฟังก์ชันชื่อเดียวกับ state variable จึงชนกัน
- Solution: เปลี่ยนชื่อฟังก์ชันเรนเดอร์เป็น `auditView()` และแก้จุดเรียกใน `render()` ส่วน `auditPage` คงเป็น state เท่านั้น
- Prevention: ในสคริปต์ global scope ให้ตั้งชื่อฟังก์ชันเรนเดอร์ลงท้ายด้วย `View`/`Html` และ Reserve ชื่อ `*Page` ไว้ให้ state จำนวนหน้า; ใช้ `node --check` เป็น gate บังคับก่อนแจ้งว่าไฟล์พร้อมเปิด
- Evidence: `node --check` ผ่าน และ `node tools/smoke-test.js` เรนเดอร์หน้า audit ของทุกผู้ใช้ได้
- Status: `resolved`

### `ERR-20261003-004` — Fail-safe document invisible in every user queue

- Detected: `2026-10-03T11:35:00+07:00`
- Context: mockup v3 มีเอกสารที่ map บริษัทไม่ได้ (`AIVA-2609-0004` ORG/Tax ID ว่าง, `AIVA-2609-0007` ORG 223 ไม่มีใน master) และ `scopeCheck()` เทียบ `u.co.includes(d.company)` ตรง ๆ
- Symptom: `node tools/smoke-test.js` รายงานว่าไม่มีผู้ใช้คนใดใน RBAC ชุดนี้เข้าถึงเอกสารสองฉบับนี้ได้ ทั้งที่ engine ตัดสินเป็น Manual Review/Hold
- Root Cause: บริษัทของเอกสารกลายเป็น placeholder `?` เมื่อ map จาก master ไม่ได้อีกทั้ง receiver ของเอกสารที่ 2 ไม่ใช่ portal user → ไม่ match ขอบเขตใครเลย fail-safe กลายเป็น "ไม่มีใครเห็น"
- Solution: ให้ role แบบ company scope (ACC/APR) เห็นเอกสารที่ยัง map ไม่ได้พร้อมป้ายเตือน "ยังไม่ map เป็นบริษัทใด ห้าม auto-map" โดย EU ยังจำกัดตามรายคน; เพิ่ม assertion กันการ regress ใน smoke test
- Prevention: ทุก filter ที่อิง scope/ownership ต้องมี test case สำหรับ record ที่ key ไม่อยู่ใน master หรือไม่มีเจ้าของ — fail-safe ต้องชี้ไปยังผู้รับผิดชอบ ไม่ใช่ถูกกรองทิ้ง
- Evidence: `node tools/smoke-test.js` → ผ่าน 46 การตรวจ (ก่อนแก้ fail 4 รายการ)
- Status: `resolved`

### `ERR-20261003-005` — Boot state ignored because `<select>` value was never set

- Detected: `2026-10-03T12:05:00+07:00`
- Context: `Web portal/invoice-webv3` — `boot()` สร้าง `<option>` ของ dropdown ผู้ใช้แล้วเรียก `switchUser()` ซึ่งอ่านค่าจาก `document.getElementById("user").value`
- Symptom: ตั้ง `BOOT = { user: "u4", doc: "AIVA-2609-0003" }` แต่หน้าแรกที่เปิดจริงคือผู้ใช้ option แรก (u1) คิวเหลือ 1 ฉบับ และเอกสารที่เปิดอยู่ไม่ได้อยู่ในคิวที่กรองไว้
- Root Cause: `<select>` ที่เพิ่งเติม option จะ report `value` เป็น option แรกโดยอัตโนมัติ state ใน JS กับ state ใน DOM ไม่ตรงกัน และ `switchUser()` อ่านจาก DOM เป็นแหล่งเดียว
- Solution: หลังสร้าง option ให้set `select.value = BOOT.user` ก่อนเรียก `switchUser()` และตรวจว่า `BOOT.doc` อยู่ในขอบเขตของผู้ใช้ตั้งต้น
- Prevention: ทุกครั้งที่ app state มี DOM counterpart ให้ถือว่า "สร้าง element แล้ว ≠ ตั้งค่าแล้ว" — ต้องเขียนค่าลง DOM ก่อนอ่านกลับ; และให้ตรวจ first paint ด้วย browser จริงเสมอ เพราะ unit/DOM-sim test มองไม่เห็นกรณีนี้
- Evidence: Chromium check หลังแก้ได้ chips `ทุกบริษัท/AH/AHT/ยังไม่ map`, queueItems 11, `.qi.on` = rgb(238,248,248), console errors 0
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
