# 05 · Build pipeline และการทดสอบ

portal ไม่มี build step — แต่มี **pipeline สร้างข้อมูล** ที่ต้องรันให้ผ่านก่อน commit
เพราะข้อมูลที่เห็นบนจอทั้งหมดถูก generate (ห้ามพิมพ์มือ)

## คำสั่งทั้งหมด

| คำสั่ง | ทำอะไร | ออกผลแบบไหน |
|--------|--------|---------------|
| `python tools/serve.py [--port 8080] [--host 127.0.0.1] [--open]` | เสิร์ฟโฟลเดอร์ portal (no-store headers) | `http://127.0.0.1:8080/index.html` · Ctrl+C หยุด |
| `python tools/build-master-data.py` | อ่าน `OCR service/n8n/app/core/master_data.py` → เขียน `src/data/master-data.js` | `เขียน … — นิติบุคคล 48 แถว (ACTIVE 45), exception 15 รหัส, user-task codes 7` |
| `node tools/build-fixtures.mjs` | cases × engine mirror → validate → golden → เขียน `src/data/snapshots.js` | `เคส 22 · snapshot 24 · ความผิดพลาด 0 · คำเตือน 3` |
| `node tools/build-fixtures.mjs --check` | เหมือนเดิมแต่ **ไม่เขียนไฟล์** + ตรวจ drift ของไฟล์เดิม | exit 1 เมื่อ contract/golden ผิด หรือไฟล์ generated ค้าง |
| `node tools/smoke-test.mjs` | ทดสอบ 9 กลุ่ม (ใน node) | `✓ ผ่านทั้งหมด 107 รายการ …` หรือ list รายการที่ตก + exit 1 |
| `node tools/browser-check.mjs` | เปิด Chromium จริง + เซิร์ฟเวอร์ชั่วคราว แล้วคลิกตรวจ 14 เรื่อง (console error, ค่าเสียบนจอ, SoD toast, layout 390px) | `✓ browser-check ผ่าน 14/14` · หา playwright ไม่เจอ → พิมพ์บอกแล้ว exit 0 |

รันทั้งหมดตามที่แนะนำก่อน commit:

```bash
python tools/build-master-data.py
node tools/build-fixtures.mjs
node tools/build-fixtures.mjs --check
node tools/smoke-test.mjs
node tools/browser-check.mjs   # ข้ามตัวเองได้ ถ้าเครื่องไม่มี playwright
```

`browser-check.mjs` หา playwright จาก `PLAYWRIGHT_PATH` → `playwright` → `node_modules` ของโปรเจกต์ข้างเคียง
และรันเซิร์ฟเวอร์เองที่ `PORT` (ค่าเริ่มต้น 8123) · ถ้ามี server เปิดอยู่แล้ว: `BASE_URL=http://127.0.0.1:8080/index.html`

## ขั้นตอนใน `build-fixtures.mjs`

```
tools/cases.mjs  (รวม cases-a…d)
      │  แต่ละ case = input เดียวกับที่ engine จริงได้รับ (invoice/lines/oracle rows/signatures)
      ▼
src/engine/rules.js  →  evaluate() → status, rules[], matches[], decision
      │
      ▼
ประกอบ snapshot ตาม contract v1.0 (+ extended fields) + resolveCompany() + metadata PDF
      │
      ▼
validateSnapshot()      ── error → build ล้มเหลว (ไม่เขียนไฟล์)
      │
      ▼
golden check            expect (รุ่นล่าสุด) / expectRevisions (ทุกรุ่น) ไม่ตรง → ล้มเหลว
      │
      ▼
src/data/snapshots.js   (มี banner "GENERATED FILE — ห้ามแก้ไขด้วยมือ")
```

หมายเหตุสำคัญ
- `caseDef.expect` ใช้กับ **revision ล่าสุดเท่านั้น** · `expectRevisions` ระบุรายรุ่น
- `pdf` ของเคส: ไม่ระบุ →สังเคราะห์ metadata ให้ทุกรุ่น (ปุ่ม/ watermark จะขึ้น "ข้อมูลสาธิต"),
  `pdf: null` → ไม่มีหลักฐาน (demo missing), ระบุ revision เดียว → หลักฐานค้างรุ่น (demo stale)
- `handAuthoredReason` + `snapshotOverride` → สร้าง snapshot ที่คนเขียนมือ (engine ปล่อยผลไม่ได้)
  และติดธง `hand_authored` ทั้งที่ bundle และ UI
- `built_at` เปลี่ยนทุกครั้ง ตอน `--check` จึงเทียบเนื้อหาหลัง normalized timestamp แล้ว

## โครงสร้างไฟล์เคส (`tools/cases-*.mjs`)

แยกเป็น `cases-a/b/c/d` เพราะไฟล์เดียวใหญ่เกินไป (เคยทำให้การเขียนไฟล์พัง) — `cases.mjs` รวมให้

| field | จำเป็น | ความหมาย |
|-------|:------:|----------|
| `id` `dms` `title` | ✅ | ระบุตัวตน + หัวข้อบนจอ |
| `actor` | ✅ | `{uploadedBy, receiver}` — `uploadedBy` คุม SoD |
| `expect` | ✅ | `{status, codes[], assigned, matchLevels[], currencyNote?, …}` ของ **รุ่นล่าสุด** |
| `rounds[]` | ✅ | input ของแต่ละ revision (`receivedAt pages invoice lines signatures oracle{rows}`) |
| `expectRevisions` | – | golden รายรุ่น (`{1:{status,codes},2:{…}}`) |
| `workflow` | – | สถานะงานตั้งต้น เช่น `REJECTED` `ON_HOLD` `CONFIRMED` `RESUBMITTED` |
| `pdf` | – | `null` = ไม่มีหลักฐาน · map `revision → metadata` = หลักฐานค้างรุ่น |
| `outbox`, `pendingRound` | – | งานค้าง + snapshot รุ่นถัดไปที่ยังไม่ส่ง (demo outbox/deliver) |
| `snapshotOverride`, `handAuthoredReason`, `rules`, `receipt` | – | เคส pipeline ล่ม / rules ไม่ครบ (เขียน snapshot มือ) |

helper ใน `cases-shared.mjs`: `row({...})` แถว Oracle (โครง SQL RCV-V01), `ln(no, desc, qty, uom, price, amount, item_code)`
บรรทัด invoice, `sig(supplier, receiver)` และ `ORG` (ORG_ID จริงจาก master — รวมค่าที่ตั้งใจให้ map ไม่ได้:
`222` ไม่มีใน master, `AMOTION 223` tax ว่าง/status UNKNOWN)

### เพิ่มเคสใหม่ (ขั้นตอนที่แนะนำ)

1. เลือกไฟล์ `cases-*.mjs` ตามกลุ่มเลขที่เอกสาร แล้วเขียน `rounds` ให้ครบ (เลขทุกตัวเป็น **string**)
2. ใส่ `expect` ตามที่ **ควรจะเป็น** — ถ้า engine ให้ผลไม่ตรง ให้ไปเทียบ `rules.py` ก่อน
   แล้วตัดสินใจว่าใครผิด (ห้ามแก้ `expect` ให้ตรงกับผลโดยไม่เข้าใจ)
3. รัน `node tools/build-fixtures.mjs` → ดู contract error/golden fail ที่พิมพ์ออกมา
4. ถ้าพฤติกรรม engine ต่างจากที่ expect จริงและยืนยันกับทีมแล้ว → จดไว้ใน [docs/06](06-as-built-gaps.md) แล้วค่อยปรับ expect
5. รัน `node tools/smoke-test.mjs` (group 9 จะ render ทุกหน้าด้วยข้อมูลใหม่)

## `smoke-test.mjs` — 9 กลุ่ม 107 การตรวจ

| กลุ่ม | ครอบคลุม |
|-------|----------|
| 1 decimal/BigInt | `600 × 30.666667 = 18400.0002`, การปัด, comparison, validate decimal, `fmtMoney` ไม่เป๋กับเลขยาว |
| 2 receiving contract | schema_version ผิด, field บังคับขาด, type ผิด, ทศนิยมเกิน, revision, decision ขัดกับ status, ฟิลด์แปลกปลอม = warning, `rulesCompleteness` |
| 3 fixture จาก engine | bundle meta, status มาจาก engine (ไม่ hardcode), ครบ 9 กฎ/hand-authored มีธง, duplicate, revision เรียง, และรัน `build-fixtures --check` เป็น subprocess |
| 4 store | สิทธิ์/ขอบเขต, สลับผู้ใช้, SoD, action สำเร็จ/ถูกบล็อก, optimistic version, outbox, ingest (ผิด/ซ้ำ/ย้อนรุ่น), attachPdf, stats, reset, persist ผ่าน storage ปลอม |
| 5 state machine | ตาราง transition ทุกแถว, `needNote` จาก `transitionFor`, สถานะ terminal |
| 6 guards | evidence current/stale/missing, rules partial/skipped, schema invalid, duplicates, M3/M4, currency, UNMAPPED, outbox, `ap-contract` บล็อก post, Auto-pass ต้องมี approval, riskLevel |
| 7 สถาปัตยกรรม | import engine ห้ามเกิดจริง, engine mirror ยังอยู่, tools ใช้ engine, ไม่มี parseFloat/toFixed นอก money.js, domain ไม่มี DOM, ไม่มี PDF จริง, index.html ไม่มี bundler + เป็น module, ไม่มีอักษรภาษาอื่นปน (.js/.mjs/.md) |
| 8 master data | 48 นิติบุคคล, orgId/taxId/status ครบ, มี ACTIVE 45, orgId ไม่ซ้ำ, exception 15 รหัส, user-task codes ตรง contract, 9 กฎมาตรฐาน |
| 9 views | render ทุกหน้า (dashboard/queue/queue-filtered/detail/detail-404/master/audit/help) และเนื้อหาสำคัญต้องอยู่ครบ (KPI, ตัวกรอง, ตาราง 9 กฎ, gap log) |

exit code: `0` = ผ่านหมด, `1` = มีรายการตก (พิมพ์รายการตกพร้อมข้อความ)

## การทดสอบที่ยัง **ไม่ได้** ทำ (และควรทำก่อนขึ้นจริง)

| อย่าง | ทำไมยังไม่มี | ทางเลือก |
|-------|--------------|----------|
| browser E2E จริง (คลิก/เมาส์/จอ 390px) | ทำแล้วใน `tools/browser-check.mjs` — แต่ข้ามตัวเองถ้าเครื่องนั้นหา playwright ไม่เจอ | ตั้ง `PLAYWRIGHT_PATH` ชี้ไปที่ playwright ที่ติดตั้งไว้ |
| visual regression | ยังไม่มี baseline ภาพ | screenshot เทียบ mockup v4.4 |
| accessibility audit | ยังไม่ได้ตรวจ contrast/tab order/Thai screen-reader label | axe + manual ด้วย NVDA |
| contract test กับ producer จริง | fixture สร้างเองจาก mirror | ต้องรัน n8n จริงแล้ว dump snapshot มา validate |
| multi-user concurrency | งานชนกันหลาย user | ต้องมี backend |

## ปุ่ม/ทางลัดสำหรับ debug ในเบราว์เซอร์

```js
window.__aiva.store.list().length          // จำนวนเอกสารที่ user ปัจจุบันเห็น
window.__aiva.store.stats()                // KPI ทั้งกระดาน
window.__aiva.validateSnapshot({...})      // ลอง validate snapshot ดิบ
window.__aiva.store._overlay()             // สถานะ overlay ที่เก็บใน localStorage
localStorage.removeItem("aiva.webv4.state.v2")  // ล้างแล้ว refresh
```
