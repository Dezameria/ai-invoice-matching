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
