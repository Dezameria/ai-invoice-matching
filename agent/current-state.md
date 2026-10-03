# Current State

Last verified: `2026-10-03T11:35:00+07:00`

## Repository
- Branch: `invoice-web`
- Web portal ประกอบด้วย:
  - `Web portal/invoice-webV2`: React 19 + TypeScript + Vite portal เวอร์ชันใหม่ล่าสุด (พอร์ต 5180)
  - `Web portal/invoice-web1`: สำรองโค้ดเวอร์ชันเดิม
  - `Web portal/invoice-web-9054076`: โค้ดจาก commit 9054076 สำหรับทดสอบเทียบเคียง (พอร์ต 5173 / 8010)
  - `Web portal/invoice-webv3`: mockup ใหม่แบบ no-build (plain classic script ไม่ต้อง build) สำหรับรีวิว UI + business rule
- Existing OCR service and original HTML mockup remain unchanged this development session.
- Agent records, central docs and invoice-web working tree are organized; latest commit `94d8cad` (invoice-webv3 mockup) pushed to `origin/invoice-web`.
- Repository-local skill `.agents/skills/aiva-invoice-core` สรุปขอบเขตระบบ field หลัก กฎ V-01–V-09, decision/routing, workflow/audit requirements และความขัดแย้งระหว่าง code, docs และ mockup เพื่อใช้เป็น domain reference ระหว่างพัฒนาต่อ.

## Mockup v3 (no-build) — `Web portal/invoice-webv3`

สถานะ: สร้างใหม่ทั้งโฟลเดอร์ ยังไม่ต่อ backend — commit `94d8cad` และ push ไป `origin/invoice-web` แล้ว (2026-10-03)

- เปิดจาก `file://` ได้ทันที (ดเบิลคลิก `index.html`) ไม่ต้องมี `node_modules` หรือ bundler; ปุ่มคัดลอก JSON ต้องเปิดผ่าน `python -m http.server 5190`
- โหลดสคริปต์คลาสสิก 4 ไฟล์ตามลำดับ `assets/data.js` → `assets/domain.js` → `assets/docs.js` → `assets/app.js`
- `assets/data.js` ถูกรีเจเนอเรตด้วย `tools/build-domain-data.py` จาก `OCR service/n8n/app/core/master_data.py` (นิติบุคคล 48 แถว) และ `rules.py` (exception as-built 15 รหัส + ชุดรหัสฝั่ง user)
- พฤติกรรมที่ฝังใน UI ตรงกับ as-built engine: decision order (manual_review → Manual Review, High → Hold, Medium → Review, ที่เหลือรวม Low → Auto-pass), ownership ตาม `owner_of()`, ladder จับคู่ M1–M4 (M4 = ต้องให้คนตรวจ)
- ข้อมูลเอกสาร 16 ฉบับใน `assets/docs.js` เป็นข้อมูลสังเคราะห์ แต่โครงสร้าง field ตาม receiving contract (schema 1.0) และครอบคลุมเคส fail-safe/duplicate/revision/pipeline-fail
- จำลอง workflow ตาม contract: reason code + required note + `expected_workflow_version` + Idempotency-Key → 409 Conflict เมื่อ version ไม่ตรง (ไม่แก้สถานะ), `rerun` สร้าง action outbox `waiting_revision` และกันการสั่งซ้ำ
- RBAC page แสดงผู้ใช้ 6 คน/5 บทบาท ขอบเขต company ↔ receiver, ผัง Portal ↔ Entra ID ↔ Oracle `RECEIVER` ↔ บริษัท และตาราง Mockup ↔ Production gap
- ความขัดแย้งของแหล่งข้อมูลแสดงต่อหน้าผู้ใช้ ไม่ถูกทำให้หาย: ผัง docs-catalog ↔ as-built, รหัสชนกัน (`E13`, `E34`), Tax ID `0107545000179` / ORG `222` / ORG `196` ที่ไม่มีใน master, ORG `556` ที่ master map แล้ว, ขีดจำกัด PDF portal ↔ Vision, `Decimal` ↔ JSON float
- ตัดสินใจ design สำคัญ: เอกสารที่ map บริษัทไม่ได้ (ORG/Tax ID ว่างหรือไม่อยู่ใน master) ต้องขึ้นในคิวฝ่ายบัญชีพร้อมป้ายเตือน แทนการถูกกรองหายจากทุกคิว
- `tools/smoke-test.js` เป็น DOM ปลอมสำหรับตรวจว่าทุกผู้ใช้/ทุกหน้า/ทุกแท็บ/ทุกเอกสาร/ทุก action เรนเดอร์ได้ และคง invariant ของ `decide()`

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
- Mockup v3: `node --check` ผ่านทั้ง 4 สคริปต์ใน `Web portal/invoice-webv3/assets/` และ `node tools/smoke-test.js` ผ่าน 46 การตรวจ (ครอบคลุม 409 ไม่แก้สถานะ, confirm เพิ่ม `wf_version`, rerun สร้าง outbox, บล็อก action เมื่อขาด note, KPI นับตรงข้อมูล, master 48 แถว / 15 exception code / 9 กฎ, สแกนรูปแบบ credential)
- Mockup v3 เปิดตรวจด้วย Chromium จริง (Playwright ที่ใช้ package จาก `invoice-web-9054076/frontend`): ไล่ 6 ผู้ใช้ × 4 หน้า × ทุกเอกสาร × 6 แท็บ + viewer + modal → console/page error 0, ไม่มี `undefined`/`NaN`/`[object Object]`, viewport 390px ไม่มี horizontal overflow (0px), header 56px `rgb(13,39,77)`, KPI 6 ใบ, active tab underline `rgb(0,181,175)`, คิวของผู้ใช้ตั้งต้น (ACC) 11 ฉบับ
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
- Current release is local/integration pilot, not company-scoped production: shared API keys are workspace-wide; Entra, user/receiver RBAC and immutable user audit remain unimplemented.
- Workflow actions ใน shared-key pilot ไม่มีตัวตนรายบุคคล; ต้องเชื่อม Entra ก่อนบังคับ EU/ACC/APR และ separation of duties.
- SQLite startup table creation currently used; PostgreSQL/Alembic and production backup/storage/retention/scan/rate limits remain future work.
- `workers`, `migrations` และ `infra` เป็น boundary พร้อม README เท่านั้น ยังไม่มี Celery/Redis, Alembic runtime หรือ production deployment.
- PDF binary upload only; no live DMS URL connector/watermark. JSON/PDF เปิดย้อนหลังตาม revision ได้ แต่ retention/legal hold/cleanup ยังไม่ทำ.
- Need sanitized real producer contract to validate upstream mapping; never relabel legacy codes as a new standard.
- Producer ต้องเชื่อม action outbox และกำหนด SLA/retry/dead-letter ก่อนใช้ resubmit/rerun กับงานจริง; AP post ยังไม่เปิด.
- Keep logs free of secrets and invoice payloads; read Thai files explicitly with UTF-8.
