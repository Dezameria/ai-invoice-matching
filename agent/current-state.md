# Current State

Last verified: `2026-10-03T15:45:00+07:00`

## Repository
- Branch: `invoice-web`
- Web portal ประกอบด้วย:
  - `Web portal/invoice-webV2`: React 19 + TypeScript + Vite portal เวอร์ชันใหม่ล่าสุด (พอร์ต 5180)
  - `Web portal/invoice-web1`: สำรองโค้ดเวอร์ชันเดิม
  - `Web portal/invoice-web-9054076`: โค้ดจาก commit 9054076 สำหรับทดสอบเทียบเคียง (พอร์ต 5173 / 8010)
  - `Web portal/invoice-webv3`: mockup ใหม่แบบ no-build (plain classic script ไม่ต้อง build) สำหรับรีวิว UI + business rule
  - `Web portal/invoice-webV4`: web portal no-build แบบ ES modules ที่แยก layer จริง (domain/data/engine/ui/views) และ**แสดงผลจาก snapshot เท่านั้น** — ยังไม่ต่อ backend (untracked ใน `git status`)
- Existing OCR service and original HTML mockup remain unchanged this development session.
- Agent records, central docs and invoice-web working tree are organized; latest pushed commit `94d8cad`; local ahead ด้วย `cd76db0` (invoice-webv3 รอบ 2) ยังไม่ได้ push.
- Repository-local skill `.agents/skills/aiva-invoice-core` สรุปขอบเขตระบบ field หลัก กฎ V-01–V-09, decision/routing, workflow/audit requirements และความขัดแย้งระหว่าง code, docs และ mockup เพื่อใช้เป็น domain reference ระหว่างพัฒนาต่อ.

## Web Portal V4 (no-build, snapshot-driven) — `Web portal/invoice-webV4`

สถานะ: ใช้งาน/เดโมได้ครบ (22 เอกสาร / 24 snapshot) — `smoke-test` ผ่าน **107/107** และ `browser-check` ผ่าน **14/14** ด้วย Chromium จริง; ยังไม่ต่อ backend/OCR จริง และยังไม่ commit

หลักการที่บังคับด้วยเทสต์ (ไม่ใช่แค่สัญญาในเอกสาร):
- Portal **ไม่ recompute matching** — `src/engine/rules.js` เป็น as-built mirror ที่ `tools/` ใช้สร้าง fixture เท่านั้น (group 7 ตรวจ import pattern จริง)
- เงิน/จำนวนคงเป็น **decimal string** + helper BigInt (`src/domain/money.js`) — เคสคุมคือ `600 × 30.666667 = 18400.0002`
- ทุกอย่างเข้าระบบทาง `store.ingest()` ทางเดียว: `validateSnapshot()` (receiving contract v1.0) → ห้าม `event_id` ซ้ำ → revision ต้องเพิ่มขึ้น → ปิด outbox → audit
- นโยบาย 3 ชั้นก่อน action: `access` (ใคร) → `workflow` (สถานะงานอนุญาตไหม + optimistic version) → `guards` (หลักฐาน/สัญญาพอไหม) และปุ่มที่ปิดต้องตอบเหตุผลได้
- ข้อมูลบนจอทั้งหมด **generate ห้ามพิมพ์มือ**: `tools/cases-*.mjs` × engine mirror → `src/data/snapshots.js` (+ golden `expect`/`expectRevisions`) และ `build-fixtures.mjs --check` จับ drift ของไฟล์ generated ได้

ของที่ทำในโฟลเดอร์นี้: domain 10 ไฟล์ (`money schema company exceptions access workflow guards audit store ruleCatalog`), views 6 หน้า (dashboard/queue/detail/master/audit/help) + hash router ใน `app.js`, `src/styles/app.css` (token จาก mockup v4.4 + responsive ≤860px), tools 6 ตัว (`serve.py build-master-data.py build-fixtures.mjs cases-*.mjs smoke-test.mjs browser-check.mjs`), เอกสาร `README.md` + `docs/00…07.md`

เครื่องมือ: `python tools/serve.py --open` · `node tools/build-fixtures.mjs [--check]` · `node tools/smoke-test.mjs` (107 การตรวจ) · `node tools/browser-check.mjs` (14 การตรวจใน Chromium; ข้ามตัวเองเมื่อหา playwright ไม่เจอ)

ช่องที่ยังเปิด (จดใน `docs/05` + `docs/06`): contract test กับ producer จริง, visual regression, accessibility audit, concurrency จริง (จำลองด้วย `expectedVersion`), AP posting ปิดด้วย guard `ap-contract`, PDF เป็น metadata เท่านั้น

## Mockup v3 (no-build) — `Web portal/invoice-webv3`

สถานะ: ใช้งานได้ครบรอบ 2 (action parity + revisions + audit chain + queue + viewer + decimal) — ยังไม่ต่อ backend; รอบแรก commit `94d8cad` (push แล้ว) ส่วนรอบ 2 commit แล้วเป็น `cd76db0` (local branch `invoice-web` ยังไม่ได้ push)

- เปิดจาก `file://` ได้ทันที (ดเบิลคลิก `index.html`) ไม่ต้องมี `node_modules` หรือ bundler; ปุ่มคัดลอก JSON ต้องเปิดผ่าน `python -m http.server 5190`
- โหลดสคริปต์คลาสสิก 4 ไฟล์ตามลำดับ `assets/data.js` → `assets/domain.js` → `assets/docs.js` → `assets/app.js`
- `assets/data.js` ถูกรีเจเนอเรตด้วย `tools/build-domain-data.py` จาก `OCR service/n8n/app/core/master_data.py` (นิติบุคคล 48 แถว) และ `rules.py` (exception as-built 15 รหัส + ชุดรหัสฝั่ง user)
- พฤติกรรมที่ฝังใน UI ตรงกับ as-built engine: decision order (manual_review → Manual Review, High → Hold, Medium → Review, ที่เหลือรวม Low → Auto-pass), ownership ตาม `owner_of()`, ladder จับคู่ M1–M4 (M4 = ต้องให้คนตรวจ)
- ข้อมูลเอกสาร 17 ฉบับใน `assets/docs.js` เป็นข้อมูลสังเคราะห์ แต่โครงสร้าง field ตาม receiving contract (schema 1.0) และครอบคลุมเคส fail-safe/duplicate/revision/pipeline-fail และ Decimal ↔ float (`AIVA-2609-0017` เก็บยอดเป็น string ตรงตาม snapshot)
- workflow ครบ 9 action ตาม action parity (`explain` `resubmit` `rerun` `return` `hold` `release_hold` `reject` `confirm` `post`) และ `guards(doc)` เป็นความจริงชุดเดียวของ "ปุ่มไหนกดได้/ไม่ได้ + เพราะอะไร" ที่ใช้ร่วมกันทั้ง action bar, การ์ดขั้นตอนถัดไป และ modal; ทุกปุ่ม disabled ต้องมี `title` บอกเหตุผล
- บังคับ separation of duties (ผู้แนบเอกสาร `upl` ตัดสินเองไม่ได้), ล็อกฝั่งบัญชีเมื่อ High exception ที่ engine มอบให้ผู้ใช้ยังไม่ปิด, ล็อก action ขณะ On Hold (ถอนพักได้เฉพาะผู้ถือ hold/เจ้าของงาน/ADM) และ `post` ปิดตายพร้อมเหตุผลจนกว่าจะมี AP acknowledgement contract
- Revision snapshot: เลือกดู revision เก่าได้เป็นโหมดอ่านอย่างเดียว (banner + PDF/JSON/ผลตรวจตรงรุ่น + action ถูกบล็อก) และกลับสู่ revision ล่าสุดได้
- คิว: KPI 7 ใบ (รวม "งานของฉัน"), คอลัมน์ "งานที่ต้องทำ" ทุกแถว, sort 3 แบบ, แบ่งหน้าละ 8 รายการ; viewer มี toolbar + คีย์ลัด `←/→` + บันทึก access event + ปิดดาวน์โหลด/พิมพ์พร้อมนโยบาย
- audit ถูกผูกเป็น hash chain (`prev_hash`/`hash`) แบบจำลอง: ตรวจความต่อเนื่อง, จำลองการแก้ไขให้เห็น chain ขาด, deep link กลับเอกสาร, ส่งออก CSV พร้อม hash — hash เป็นของจำลองเพื่อการสาธิตเท่านั้น
- RBAC page แสดงผู้ใช้ 7 คน/4 บทบาท (EU/ACC/APR/ADM) ขอบเขต company ↔ receiver, nav เองก็ถูกปิดตามสิทธิ์ (ADM ไม่มีคิว, audit เห็นเฉพาะ APR/ADM), ผัง Portal ↔ Entra ID ↔ Oracle `RECEIVER` ↔ บริษัท และตาราง Mockup ↔ Production gap
- ความขัดแย้งของแหล่งข้อมูลแสดงต่อหน้าผู้ใช้ ไม่ถูกทำให้หาย: ผัง docs-catalog ↔ as-built, รหัสชนกัน (`E13`, `E34`), Tax ID `0107545000179` / ORG `222` / ORG `196` ที่ไม่มีใน master, ORG `556` ที่ master map แล้ว, ขีดจำกัด PDF portal ↔ Vision, `Decimal` ↔ JSON float
- ตัดสินใจ design สำคัญ: เอกสารที่ map บริษัทไม่ได้ (ORG/Tax ID ว่างหรือไม่อยู่ใน master) ต้องขึ้นในคิวฝ่ายบัญชีพร้อมป้ายเตือน แทนการถูกกรองหายจากทุกคิว
- เครื่องมือตรวจ: `tools/smoke-test.js` (DOM ปลอม 60 การตรวจ — logic/invariant) และ `tools/browser-check.js` (Chromium จริง 14 การตรวจ — console error, คีย์ลัด, layout 390px, ตามหน้าที่ nav เปิดให้แต่ละบทบาท); `browser-check` หา playwright จาก env/โฟลเดอร์ข้างเคียงและข้ามตัวเองถ้าไม่มี

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

## Verified
- Web Portal V5 (`Web portal/invoice-webV5`): repo-reference portal (no-build ES modules) — `node tools/smoke-test.mjs` ผ่าน **31/31** ข้อ (hygiene, provenance, domain, ui), `node tools/browser-check.mjs` ผ่าน **29/29** ข้อ (Edge headless, console error 0), `python tools/sync.py --check` ผ่าน
- Web Portal V4 (`Web portal/invoice-webV4`): snapshot-driven portal (no-build ES modules) — `node tools/smoke-test.mjs` ผ่าน **107/107** ข้อ (decimal, contract, policy, architecture), `node tools/browser-check.mjs` ผ่าน **14/14** ข้อ (Chromium, 1440px + 390px no overflow), `tools/build-fixtures.mjs --check` ผ่าน
- Mockup v3 (รอบ 2): `node --check` ผ่านทั้ง 6 สคริปต์, `node tools/smoke-test.js` ผ่าน **60** การตรวจ (เพิ่ม explain parity, SoD + ล็อกฝั่งบัญชี, on-hold/release_hold, idempotent replay + 422, expected_document_revision 409, revision read-only, audit hash chain + CSV, คิวแบ่งหน้า/sort/งานของฉัน, viewer toolbar + access event)
- Mockup v3 Chromium จริง (`node tools/browser-check.js`) ผ่าน **14** การตรวจ: 7 ผู้ใช้ × nav ที่เปิดให้ตามสิทธิ์ (EU 3, ACC 3, APR 4 มี audit, ADM 3 ไม่มีคิว = 22 จอ), 17 ฉบับ × 6 แท็บ = 102 จอ, console/page error 0, 390px overflow 0px, pagination 1–8 จาก 17, "งานของฉัน" 5 ฉบับ, CSV พร้อม hash, deep link เปิดเอกสารตรงฉบับ
- Mockup v3 (รอบแรก): เปิดด้วย Chromium แล้วแก้ first paint (`BOOT.user` ไม่เคยถูกsetค่าใน `<select>`), เพิ่ม STEP 4 "Portal ตรวจซ้ำ", highlight หลักฐานตาม `rule.page` และแถวแจ้งเตือนเมื่อเอกสารที่เปิดอยู่หลุดจากตัวกรอง
- ยังไม่ได้ทดสอบ Safari/Firefox และการเรนเดอร์ font จริงจาก Google Fonts ต้องใช้ network (offline แล้ว fallback เป็น system-ui/monospace ตามลำดับ)
- Skill package ผ่าน `quick_validate.py` เมื่อรันด้วย UTF-8 mode; reference link และ source paths ที่ระบุมีอยู่จริงครบ.
- Backend: 15 unittest tests passed (persistence, idempotency, conflicts, revisions, schema validation, versioned PDF, global audit, workflow action/version/idempotency/outbox/revision completion, compatibility backfill, origin, keys, filters, adapter, architecture boundaries).
- Frontend: TypeScript strict and Vite production build passed (`tsc -b && vite build` built clean in 5.2s).
- Playwright: 6 tests passed on Edge browser (15.2s), covering import, PDF canvas viewer, tabs, history, filters, mobile viewport (390px) no-overflow, invalid JSON rejection, exact large decimal display, revision deep link/archived PDF, access/audit navigation, and review action persistent outbox.
- Visual inspection: ยืนยันเลย์เอาต์ Master-Detail (ซ้าย: คิว 370px, ขวา: เอกสารและ PDF) สะอาดตา กระชับ ตรงตามโครงสร้าง Mockup v4.4 ปราศจากตารางซ้ำซ้อนในแท็บสรุป.
- Local preview on port 8010 serves latest production bundle successfully.
- No live OCR, Oracle, LiteLLM, Paperless or AP tests executed.


## Existing System
- `OCR service/n8n/app` remains the existing Python OCR and matching service.
- `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html` remains UI/data reference.
- `docs/` remains original architecture reference; code/docs have known contract and rules-version differences recorded in invoice-web planning documents.

## Constraints / Next Work
- Mockup v3 เป็น in-memory ทั้งหมด (reload แล้วคืนค่าเดิม) ยังไม่เรียก `GET /api/portal/v1/documents`, `/documents/{id}`, `/kpis`, `/workflow/actions`, `/workflow/outbox`
- Mockup v3: hash chain ของ audit, access event และ idempotency store เป็นการจำลองในเบราว์เซอร์ (hash สั้น คำนวณ client-side) — ใช้สาธิตพฤติกรรม ไม่ได้ใช้พิสูจน์ความถูกต้องของบันทึกใน production
- Mockup v3: `post` (ส่งเข้า AP) และปุ่มดาวน์โหลด/พิมพ์ PDF ถูกปิดพร้อมเหตุผล ต้องได้ AP acknowledgement contract + signed URL/download policy จากปลายทางก่อนทำให้กดได้
- พฤติกรรมรอบ 2 ของ mockup v3 (SoD, ล็อกฝั่งบัญชี, ใครถอนพักได้, ความหมายของ `explain`) ยังเป็นการตีความตาม docs/contract ที่เขียนไว้ในโค้ด — ต้องให้ฝ่ายบัญชีรับรองก่อนใช้เป็นสเปก
- Current release is local/integration pilot, not company-scoped production: shared API keys are workspace-wide; Entra, user/receiver RBAC and immutable user audit remain unimplemented.
- Workflow actions ใน shared-key pilot ไม่มีตัวตนรายบุคคล; ต้องเชื่อม Entra ก่อนบังคับ EU/ACC/APR และ separation of duties.
- SQLite startup table creation currently used; PostgreSQL/Alembic and production backup/storage/retention/scan/rate limits remain future work.
- `workers`, `migrations` และ `infra` เป็น boundary พร้อม README เท่านั้น ยังไม่มี Celery/Redis, Alembic runtime หรือ production deployment.
- PDF binary upload only; no live DMS URL connector/watermark. JSON/PDF เปิดย้อนหลังตาม revision ได้ แต่ retention/legal hold/cleanup ยังไม่ทำ.
- Need sanitized real producer contract to validate upstream mapping; never relabel legacy codes as a new standard.
- Producer ต้องเชื่อม action outbox และกำหนด SLA/retry/dead-letter ก่อนใช้ resubmit/rerun กับงานจริง; AP post ยังไม่เปิด.
- Keep logs free of secrets and invoice payloads; read Thai files explicitly with UTF-8.
