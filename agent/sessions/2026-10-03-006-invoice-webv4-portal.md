# Session `2026-10-03-006` — สร้าง `invoice-webV4`: web portal no-build ที่แสดงผลจาก snapshot เท่านั้น

- Session ID: `2026-10-03-006`
- Task: `TASK-20261003-006`
- Started: `2026-10-03T13:40:00+07:00`
- Completed: `2026-10-03T15:45:00+07:00`
- Branch: `invoice-web`
- Scope: `Web portal/invoice-webV4/**` + `agent/**` เท่านั้น (ไม่แตะ `invoice-web`, `invoice-webV2`, `invoice-webv3`, `invoice-web1`, `invoice-web-9054076`, `OCR service`)

## เป้าหมายที่ผู้ใช้สั่ง

> "สร้าง web portal จากข้อมูล + ตัวอย่างเว็บที่มีอยู่ใน `Web portal` ทั้งหมด วางใน `Web portal/invoice-webV4` พร้อมเขียน markdown documentation"

## สิ่งที่ตัดสินใจก่อนเขียนโค้ด

| การตัดสินใจ | เหตุผล |
|---|---|
| Portal **ไม่รัน matching เอง** เด็ดขาด | เป็นข้อห้ามหลักของโปรเจกต์ — ผลตรวจต้องมาจาก engine เท่านั้น; `src/engine/rules.js` เป็น as-built mirror ที่ **tools ใช้สร้าง fixture อย่างเดียว** และมีเทสต์สถาปัตยกรรมตรวจ import จริง |
| no-build ES modules | ผู้ใช้ต้องเปิดได้ทันทีแบบ mockup v3 แต่ไม่กลับไปพลาดแบบ v3 ที่ไฟล์เดียวโต → แยก `domain/data/engine/ui/views/styles` |
| snapshot เป็น **receiving contract v1.0** + extended fields ที่ติดธงชัด | portal ตรวจที่ขอบเขต (`validateSnapshot`) แล้วแสดงตามนั้น, ฟิลด์นอก contract ต้องประกาศเป็น extended ไม่ใช่แอบรับ |
| ข้อมูลเดโมทั้งหมด **generate ห้ามพิมพ์มือ** | `tools/cases-*.mjs` (input จริงแบบที่ engine ได้รับ) × engine mirror → `src/data/snapshots.js` พร้อม golden check; ถ้า ai แก้ไฟล์ generated → `build-fixtures.mjs --check` จับ drift ได้ |
| เงินเป็น decimal string + BigInt helpers | เคส `600 × 30.666667 = 18400.0002` ต้องไม่เสียเพราะ float |
| นโยบาย 3 ชั้น `access → workflow → guards` | ปุ่มที่กดไม่ได้ต้องตอบ "เพราะอะไร" ได้เสมอ และ ข้อผิดพลาดจริงรอบนี้ 6 เรื่อง (ดู `ERR-20261003-009…014`)

## สิ่งที่สร้าง (`Web portal/invoice-webV4`, 34 ไฟล์)

**runtime** · `index.html`, `app.js` (hash router + delegated events + 3-layer preflight),
`src/styles/app.css` (design token จาก mockup v4.4 + responsive ≤860px)
**domain (pure, ทดสอบใน node ได้)** · `money.js` `schema.js` `company.js` `exceptions.js`
`access.js` `workflow.js` `guards.js` `audit.js` `store.js` `ruleCatalog.js`
**data (generated)** · `master-data.js` (นิติบุคคล 48 / exception 15 รหัส / user-task 7 รหัส),
`snapshots.js` (22 เอกสาร / 24 snapshot)
**engine** · `rules.js` — mirror V-01…V-09 + M1–M4 + decision + assignment (ใช้เฉพาะ `tools/`)
**ui/views** · `dom.js` `format.js` + 6 view (dashboard/queue/detail/master/audit/help)
**tools** · `serve.py` (static + no-store + UTF-8 stdout) · `build-master-data.py` (อ่าน
`OCR service/n8n/app/core/master_data.py`) · `build-fixtures.mjs` (+ golden + `--check` drift) ·
`cases-shared/a/b/c/d/mjs` · `smoke-test.mjs` (9 กลุ่ม 107 การตรวจ) · `browser-check.mjs` (Chromium 14 การตรวจ)
**docs** · `README.md` + `docs/00…07` (overview, architecture, data-contract, domain-model,
ui-spec, build-and-test, as-built-gaps, demo-script)

## ผลการตรวจ (รันจริงทั้งหมด)

| การตรวจ | คำสั่ง | ผล |
|---|---|---|
| master data | `python tools/build-master-data.py` | นิติบุคคล 48 แถว (ACTIVE 45), exception 15 รหัส, user-task 7 (`E06 E12 E13 E17 E26 E34 E35`) |
| fixture pipeline | `node tools/build-fixtures.mjs` | `เคส 22 · snapshot 24 · ความผิดพลาด 0 · คำเตือน 3` |
| drift/golden | `node tools/build-fixtures.mjs --check` | exit 0 (และตรวจแล้วว่า probe ที่แก้ข้อมูล → exit 1) |
| logic + สถาปัตยกรรม | `node tools/smoke-test.mjs` | **✓ ผ่าน 107/107** |
| Chromium จริง | `node tools/browser-check.mjs` | **✓ ผ่าน 14/14** (1440px + 390px, console/page error 0) |
| import resolution ทุก module | สคริปต์ตรวจสอบชั่วคราว (dynamic import + เทียบ named export) | all imports resolve |

ตัวเลขที่ portal แสดงตอนนี้: ผลตรวจ `Auto-pass 7 · Review 5 · Hold 7 · Manual Review 3` ·
workflow ตั้งต้น `PENDING_REVIEW 18 · REJECTED 1 · ON_HOLD 1 · RESUBMITTED 1 · CONFIRMED 1` ·
contract error 0 / warning 3 (มาจาก `AIVA-2609-0016` ที่เขียน snapshot มือเพื่อสาธิต pipeline ล่ม)

## บั๊กที่เจอและแก้ (บันทึกลง `errors-and-solutions.md`)

1. `ERR-…009` import `code` จาก `ui/dom.js` → ไม่ export (จริงอยู่ที่ `ui/format.js`) — แก้ 3 view + เขียนสคริปต์ตรวจ named export ทุกไฟล์
2. `ERR-…010` `table()` พังเมื่อ view ส่งแถวเป็น `<tr>` string (`r.map is not a function`) — ทำให้ helper รับได้ทั้ง array/string/`<tr>`
3. `ERR-…011` `RangeError … NaN → BigInt` เพราะส่ง string/null เข้า `dAdd` ตรง ๆ — ทุก call site ใน view ต้อง `dec(...)` (เพิ่ม helper `D()`), มีเทสต์ decimal คุมไว้แล้ว
4. `ERR-…012` Chromium pageerror `Failed to set the 'innerHTML' … moved in a 'blur' event handler` ตอนพิมพ์ในช่องค้นหา → `mount()` ต้อง `blur()` element ที่ focus อยู่ก่อนเขียนทับ (เจอตจริงจาก browser-check เท่านั้น smoke test มองไม่เห็น)
5. `ERR-…013` ล้นแนวนอน 621px ที่จอ 390px → ต้นเหตุคือ header (`brand min-width:250px` + nav + top-right) ไม่ใช่ตาราง → เพิ่ม media query ≤860px (header wrap, nav เลื่อนแนวนอน, grid เป็นคอลัมน์เดียว)
6. `ERR-…014` อักษร CJK/ต่างประเทศหลุดเข้าไฟล์ (โค้ด + docs) และทำให้เทสต์ hygiene ตก — เพิ่มการตรวจทุก `.js/.mjs/.md` (ยกเว้น Greek `Σ` ที่ใช้ในป้าย Σ) + แก้ด้วย edit tool/python raw string แทน heredoc ที่ escape เพี้ยน

## ข้อค้นพบที่สำคัญ

- **browser-check ให้คุณค่าที่ smoke test ให้ไม่ได้**: บั๊ก `innerHTML`/blur และ layout 390px เกิดเฉพาะใน browser จริง — ทั้งที่ logic ผ่านครบ 107 ข้อ
- **`--check` ต้อง compare เนื้อหา ไม่ใช่ดูแค่ exit code ของ generate**: `built_at` ทำให้เทียบตรง ๆ ไม่ได้ จึง normalized timestamp ก่อนเทียบ → จับ drift ของไฟล์ generated ได้จริง
- **guard ที่ตรวจคำสำคัญ ("engine") ต้องอ่าน import ไม่ใช่ grep**: `snap.document.pages` ทำให้ fail เทสต์แบบผิด ๆ (false positive จาก field ชื่อ `document`) — pattern เดียวกันนี้ใช้กับ `parseFloat` ที่ต้องอนุโลมเฉพาะ `fmtMoney` ใน `money.js`
- **เอกสารก็เป็น surface ที่เทสต์แตะ**: smokescan รวม `.md` ทำให้ typo ฝรั่งใน docs ทำให้ suite ตก — เป็นการดี (กันเอกสาร drift) แต่ต้องแก้ก่อนปิดรอบ

## สิ่งที่ยังไม่ทำ (บันทึกใน `docs/05` + `docs/06`)

- contract test กับ producer จริง (ต้อง dump snapshot จาก n8n มา validate)
- visual regression baseline, accessibility audit (contrast/tab order/Thai screen-reader label)
- multi-user concurrency จริง (ตอนนี้จำลองด้วย optimistic version `expectedVersion`)
- AP posting ปิดตายด้วย guard `ap-contract` — รอ Posting Gateway contract
- PDF เป็น metadata เท่านั้น (ไม่มีไฟล์จริง, watermark "ข้อมูลสาธิต" ทุกหน้า)

## ไฟล์ที่แก้/เพิ่ม (โฟลเดอร์ส่งมอบ)

`Web portal/invoice-webV4/` ทั้งโฟลเดอร์ (untracked) — `index.html` · `app.js` · `README.md` ·
`src/{domain,data,engine,ui,views,styles}/**` · `tools/**` · `docs/00…07.md`
ไม่มีการแตะโค้ด portal เวอร์ชันอื่น, OCR service หรือ backend
