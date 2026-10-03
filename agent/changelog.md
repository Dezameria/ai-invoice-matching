# Changelog

บันทึกผลเปลี่ยนแปลงถาวรที่มีผลต่อผู้ใช้ ระบบ หรือวิธีดูแล repository รายการใหม่ต้องเพิ่มด้านล่างเท่านั้น
## 2026-10-01

### Added — `CHG-20261001-001`

- เพิ่มโฟลเดอร์ `docs/` สำหรับเป็นศูนย์กลางเอกสารสถาปัตยกรรมและโครงสร้างระบบ
- เพิ่มเอกสาร `docs/README.md`, `docs/system-architecture.md`, `docs/matching-rules-standard-v6.2.md`, `docs/api-reference.md`, และ `docs/integrations.md`

## 2026-10-02

### Added — `CHG-20261002-001`
- Timestamp: `2026-10-02T08:48:00+07:00`
- เพิ่ม AIVA receiving portal ใน invoice-web: React/TypeScript frontend และ FastAPI snapshot API
- JSON import/ingest, validation, idempotency, revision protection/history และ persistent SQLite storage
- PDF attachment/viewer พร้อม fit-to-width, zoom, page navigation, evidence links และ stale warning
- เพิ่ม source filters/KPI/detail tabs, integration docs, core Table9 converter, synthetic examples และ automated tests
- ปรับขอบเขตตามผู้ใช้ให้รับข้อมูลจากระบบอื่น ไม่มีการประมวลผล OCR/AP ภายใน Portal

### Added — `CHG-20261002-002`
- Timestamp: `2026-10-02T09:03:26+07:00`
- เพิ่ม PDF archive แยกตาม document revision พร้อม backfill metadata ของฐานข้อมูล pilot เดิม
- เพิ่ม revision index และ historical detail/PDF APIs โดย endpoint เดิมยังเปิด current document ได้
- เพิ่ม revision selector, historical banner, revision list และ deep link ที่คงรุ่นหลัง reload
- ปรับเอกสาร Receiving API/implementation status และหน้าคู่มือเชื่อมต่อให้ตรงกับพฤติกรรมใหม่

### Changed — `CHG-20261002-003`
- Timestamp: `2026-10-02T09:21:29+07:00`
- จัด frontend ตาม feature boundaries: app, API contract/client, shared components, queue, documents/tabs, viewer, integration, styles และ test fixtures
- จัด backend เป็น modular monolith: API routes, auth policy, core config, document domain, database bootstrap/models, adapters และ PDF storage
- ลด `backend/app/main.py` เหลือ application composition 49 บรรทัด โดยรักษา endpoint และ compatibility imports เดิม
- เพิ่ม workers/migrations/infra boundaries พร้อมข้อจำกัด และเพิ่มเอกสาร project structure/dependency direction
- เพิ่ม architecture regression check เพื่อป้องกัน entrypoint กลับเป็นไฟล์รวมขนาดใหญ่

### Added — `CHG-20261002-004`
- Timestamp: `2026-10-02T09:40:01+07:00`
- เพิ่ม mockup read-only parity ให้ receiving portal: company chips, receipt/Receiver/ORG_ID, PO/release, STEP ของกฎ, ownership/access และ 6 detail tabs
- เพิ่ม persistent global audit API/page ที่ค้นหา กรอง แบ่งหน้า และเปิดเอกสารต้นทางได้
- เพิ่มหน้า Access แสดง permission/capability ที่ระบบรองรับจริง พร้อม dependency ของ Entra/RBAC/Oracle/workflow/DMS ที่ยังไม่เปิดใช้
- เพิ่ม keyboard navigation/ARIA สำหรับ tabs, responsive styles และเอกสารเทียบ UI-01–UI-15 กับ mockup v4.4

### Added — `CHG-20261002-005`
- Timestamp: `2026-10-02T10:10:57+07:00`
- เพิ่ม workflow actions จาก mockup: ชี้แจง แก้ไขแล้วส่งตรวจซ้ำ สั่งตรวจซ้ำ ส่งกลับ ปฏิเสธ พัก และยืนยัน
- แยก workflow state จากผลตรวจต้นทาง พร้อม reason policy, optimistic version, idempotency และ persistent history
- เพิ่ม action outbox/acknowledgement สำหรับ producer และปิดคำขออัตโนมัติเมื่อได้รับ revision ใหม่
- ปรับ UI เป็น task-first: queue แสดงงานที่ต้องทำ, detail แสดง next action ก่อนผลตรวจ/PDF และรวมข้อมูลเทคนิคในแท็บข้อมูลเพิ่มเติม
- เพิ่มคู่มือ Task-first UX และอัปเดต API/parity/status docs ให้ตรง implementation

### Changed — `CHG-20261002-006`
- Timestamp: `2026-10-02T10:42:00+07:00`
- ปรับปรุงและ normalize UI ทั้งหมดใน `invoice-web` (Queue, Detail, 3-Way Match Stepper, Line Items, Actions, Tabs) เพื่อให้อ่านง่าย สบายตา และเห็นภาพรวมข้อมูลชัดเจนที่สุด
- ปรับหน้า Queue: รวมแถบควบคุมตัวกรองเป็น Consolidated Single Control Bar (Search, Company, Source, Status dropdowns, quick status pills, company chips) และเพิ่ม 4 Interactive KPI Cards สำหรับกรองสถานะทันที
- ปรับหน้า Document Detail: เพิ่ม Executive 3-Way Match Snapshot Card (Company, PO/Release, Goods Receipt, Grand Total), Source Provenance Bar, 3-Step Verification Pipeline Stepper, Discrepancies Callout พร้อม direct PDF evidence jump, และ Streamlined Decision Hub
- จัดระเบียบ Detail Tabs 5 หมวดหมู่: สรุป 3-Way Match, ตารางเปรียบเทียบรายการสินค้า M1/M2 พร้อมตัวเลข tabular, 9 กฎการตรวจพร้อม STEP badge และรหัสข้อผิดพลาด, Activity Timeline, และข้อมูลแหล่งที่มาพร้อมสลับ Revision
- อัปเกรด Design System ใน `global.css`, `mockup-parity.css`, `revisions.css` (Typography, HSL color tokens, card elevation, responsive layout ป้องกัน horizontal overflow) โดยรักษา selector และ ARIA attributes ให้ผ่าน Playwright E2E 100%

### Changed — `CHG-20261002-007`
- Timestamp: `2026-10-02T11:03:00+07:00`
- ปรับโครงสร้างหน้าเอกสารหลักเป็น Master-Detail 2-Column Split View (`.wrap` = `370px 1fr`) ตามต้นแบบ `AIVA-Web-Portal-Mockup-v4.4-Release.html`
- แถบด้านซ้าย (`.queue-sidebar`): แสดงหัวข้อคิวตรวจสอบ, จำนวนฉบับ, ช่องค้นหา (`ค้นหาเลขที่ใบแจ้งหนี้ / PO / ผู้ขาย`), และรายการเอกสาร (`.qi`) ที่คลิกเลือกเพื่อดูรายละเอียดได้ทันทีโดยไม่ต้องสลับหน้า
- ด้านขวา (`.detail-pane`): แสดงรายละเอียดเอกสารที่เลือกทันที (Document Workspace) พร้อมแท็บสรุปผล, รายการสินค้าเปรียบเทียบใบรับ, กฎ 9 ข้อ, ประวัติ, ข้อมูลเพิ่มเติม, การตัดสินใจ/ดำเนินการ และตัวอย่าง PDF
- เพิ่มปุ่มสลับมุมมองระหว่าง "แยก 2 ฝั่ง (Master-Detail)" และ "ตารางสรุป (Table View)"
- อัปเกรดแถบ KPI Cards 6 สถานะ (ทั้งหมด, Auto-pass, Review, Hold, Manual Review, ซ้ำ) และแถบ Scope & Company Chips ด้านบน
- ปรับปรุงการแสดงผล Responsive สำหรับหน้าจอเล็ก (< 1024px) ให้สลับการแสดงผลระหว่างคิวและรายละเอียดอย่างราบรื่น ไม่มี horizontal overflow

### Changed — `CHG-20261002-008`
- Timestamp: `2026-10-02T11:45:00+07:00`
- ปรับปรุง Document Workspace เป็น All-in-One Executive View: รวมข้อมูลผลตรวจ, ข้อผิดพลาด, รายการสินค้าเปรียบเทียบใบรับ (Line Items 3-Way Match), ยอดรวมเงินทางบัญชี และผลประเมิน 9 กฎมาตรฐาน ให้แสดงผลครบถ้วนในหน้าเดียวทันทีที่คลิกเลือกเอกสาร โดยไม่ต้องสลับแท็บไปมา
- ตัดข้อมูลที่ซ้ำซ้อนออก (Redundancy Elimination):
  - ยกเลิกกล่องสรุป 4 การ์ดใหญ่ที่แสดงชื่อบริษัท, PO, ใบรับ และยอดรวมเงินซ้ำกับส่วนหัว
  - รวมข้อมูลสำคัญให้อยู่ใน Executive Metadata Strip บรรทัดเดียวความหนาแน่นสูง (`.document-meta.executive-meta-strip`)
  - ยกเลิกกล่องสรุปข้อมูล 3 กล่องใหญ่ท้ายแท็บสรุป (Invoice Details, Receipt Details, Financial Summary)
- รวมตารางเปรียบเทียบรายการสินค้า 3 ทาง (Line Items) บรรจุลงในแท็บเริ่มต้น พร้อมส่วนสรุปยอดเงินทางบัญชีใน Table Footer (`tfoot`: Subtotal, VAT 7%, Grand Total, ยอดใบรับ) ตามมาตรฐานเอกสารบัญชีจริง
- รวม Checklist ผลการตรวจสอบรายกฎ 9 ข้อ (V-01 ถึง V-09) ในรูปแบบ Compact Card Grid ชัดเจนพร้อม Badge สถานะ ผ่าน/ไม่ผ่าน และลิงก์เปิดดูหลักฐาน PDF หน้าที่เกี่ยวข้อง
- ปรับความกระชับของ Workflow Decision Hub และ Provenance Bar เพื่อเพิ่มพื้นที่การมองเห็นข้อมูลเอกสารในแนวตั้ง
- ทดสอบ Playwright E2E 6/6 ผ่านสมบูรณ์, Backend unittest 15/15 ผ่าน 100%, และตรวจภาพจริงผ่าน browser subagent เรียบร้อย

### Changed — `CHG-20261002-009`
- Timestamp: `2026-10-02T12:05:00+07:00`
- ปรับโครงสร้างหน้า Document Workspace ให้ตรงตามต้นแบบ `AIVA-Web-Portal-Mockup-v4.4-Release.html` โดยตรง:
  - ย้อนกลับจากมุมมอง All-in-One ที่เทอะทะและมีความยาวในแนวตั้งมากเกินไป กลับสู่สถาปัตยกรรมแบบแยกสัดส่วนที่สะอาด สบายตา ของ Mockup v4.4
  - ส่วนหัวเอกสาร (`.dh`): แสดงเลขที่ใบแจ้งหนี้, Badge สถานะ, แท็กบริษัท (`.co`), ปุ่มแนบ PDF, ปุ่ม `📄 เปิด/ซ่อน PDF` และ Metadata แถวเดียว (`.meta.document-meta`: ผู้ขาย, PO, Release, ใบรับ, ORG_ID, Receiver, ยอดรวม `.total-number`, รอบตรวจ)
  - แถบสเต็ปการตรวจ (`.flow`): 4 สเต็ป (`.st.ok / .st.warn / .st.bad / .st.skip`) สกัดและตรวจเอกสาร, ค้นใบรับและลูกค้า, เทียบกับใบรับ, และ Portal ตรวจซ้ำ
  - แถบแท็บ (`.tabs`): แท็บแนวนอน 5 แท็บสะอาดตาพร้อมแถบสี teal แสดงแท็บที่เลือก (`.tab.on`)
  - แท็บ "สรุปและดำเนินการ": แสดงเฉพาะข้อผิดพลาดและข้อสังเกต (`.ex.High / .ex.Medium`) พร้อมรหัส Exception Code, ผู้รับผิดชอบ (`.who`), กฎที่เกี่ยวข้อง, หลักฐาน (`.ev`) และปุ่มเปิดดูหน้า PDF ทันที ไม่ยัดตารางหรือการ์ดซ้ำซ้อน
  - แท็บ "รายการสินค้า": บรรจุตาราง 3-Way Match และการ์ดเปรียบเทียบยอดรวม V-03 กับ V-09 (`.grid2 .card .kv`) ไว้อย่างเป็นระเบียบ
  - แถบดำเนินการด้านล่าง (`.bar`): Sticky bar พร้อมข้อความระบุสถานะ/ผู้รับผิดชอบ (`.hint`) และปุ่ม Action (`.bp, .bt, .bg, .br, .bw`) พร้อม Modal ยืนยันการดำเนินการ
  - ปรับเลย์เอาต์ `.wrap` เป็น 2 คอลัมน์ (ซ้าย 370px: คิวเอกสารพร้อมค้นหา, ขวา: รายละเอียดเอกสาร) ให้คลิกดูข้างๆ แล้วเปิดข้อมูลทางขวาทันทีตามความต้องการของผู้ใช้
  - ตรวจสอบผ่าน Frontend production build, Backend unittests 15/15 และ Playwright E2E tests 6/6 ผ่าน 100%

### Changed — `CHG-20261002-010`
- Timestamp: `2026-10-02T12:15:00+07:00`
- ปรับโครงสร้างระดับ Application Shell และ Header สู่รูปแบบ AIVA Web Portal Mockup v4.4 อย่างสมบูรณ์ 100% (แก้ไข UI เละเทะ):
  - ลบ 240px Fixed Black Sidebar (`aside.sidebar`) และ Light Topbar (`.topbar`) เดิมทิ้ง เพื่อแก้ปัญหาจอแคบและแถบซ้อนสองชั้น
  - เพิ่ม `header.aiva-header` (#0D274D, 56px) ที่มีโลโก้ AI สีเขียว, ลิงก์ Nav 4 หมวด (`คิวตรวจสอบ`, `สิทธิ์และการเข้าถึง`, `บันทึกการเข้าถึง`, `เชื่อมต่อ API`), Role badge "เจ้าหน้าที่บัญชี", และ Environment pill
  - ปรับลำดับใน `QueuePage.tsx` ให้ถูกต้องตามแบบ v4.4: แถบ `.scope` อยู่บนสุด (พร้อม Company Chips, View Toggles, และปุ่มนำเข้าเอกสาร) ตามด้วย `.kpis` 6 ใบที่จัดสไตล์กรอบและตัวเลขสถิติชัดเจน และตามด้วย `.wrap` (คิว 370px ซ้ายมือ และ Document Workspace ขวามือ)
  - เพิ่มและปรับแต่ง CSS เต็มรูปแบบใน `mockup-parity.css` รวมถึงกฎ Responsive สำหรับ Mobile (390px) แบบ 0 Horizontal Overflow
  - ผ่านการทดสอบ: TypeScript strict build, Backend unittests 15/15 และ Playwright E2E 6/6 ผ่านครบถ้วน 100%

### Added — `CHG-20261003-011`
- Timestamp: `2026-10-03T08:33:34+07:00`
- เพิ่ม repository-local skill `aiva-invoice-core` สำหรับใช้เป็น domain contract ระหว่างออกแบบ พัฒนา และ review ระบบ AIVA Invoice Matching
- สรุป field หลักตั้งแต่ document identity, invoice/line/signature, Oracle receipt/entity, rule/exception, workflow, access และ audit
- บันทึกกฎ V-01–V-09 และ decision/routing ตาม OCR engine ที่ใช้งานจริง พร้อม requirement แบบ fail-safe และข้อจำกัดก่อน production
- ระบุ contract/version conflicts ระหว่าง OCR code, Portal receiving schema, docs และ Mockup v4.4 เพื่อป้องกันการเดาหรือแปล exception code ข้าม ruleset

### Added — `CHG-20261003-012`
- Timestamp: `2026-10-03T09:58:00+07:00`
- Export และทดสอบโค้ดจาก commit 9054076 ไว้ที่ `Web portal/invoice-web-9054076` พร้อม Backend (พอร์ต 8010) และ Frontend (พอร์ต 5173)
- รักษาและจัดโครงสร้าง Web Portal ทั้งหมด: `invoice-webV2` (เวอร์ชันใหม่ล่าสุด), `invoice-web1` (เวอร์ชันสำรอง), และ `invoice-web-9054076`
- คืนค่าและอัปเดต Canonical Records ในโฟลเดอร์ราก `agent/` ตามข้อกำหนด `AGENTS.md`



### Added — `CHG-20261003-013`
- Timestamp: `2026-10-03T11:35:00+07:00`
- เพิ่ม Web portal mockup เวอร์ชันใหม่ `Web portal/invoice-webv3` แบบ **no-build** (เปิด `index.html` จาก `file://` ได้ทันที ไม่ต้อง `npm install`/bundler) โดยใช้ design token ของ Mockup v4.4 (navy `#0D274D`, teal `#00B5AF`, Sarabun + JetBrains Mono)
- แยกชั้นข้อมูลเป็นสคริปต์คลาสสิก 4 ไฟล์ตามลำดับ `assets/data.js` → `assets/domain.js` → `assets/docs.js` → `assets/app.js` (ไม่ใช้ ES module/bundler)
- `assets/data.js` รีเจเนอเรตได้จาก `tools/build-domain-data.py` ซึ่งอ่าน `OCR service/n8n/app/core/master_data.py` (นิติบุคคล 48 แถว) และ `rules.py` (exception as-built 15 รหัส E05 E06 E09 E12 E13 E16 E17 E25 E26 E28 E29 E30 E31 E34 E35 + ชุดรหัสที่มอบหมายให้ user E06 E12 E13 E17 E26 E34 E35)
- แสดงผลตามพฤติกรรม engine จริง: decision order manual_review → Manual Review, High → Hold, Medium → Review, ที่เหลือรวม Low → Auto-pass และจับคู่รายบรรทัดแบบบันได M1 → M2 → M3 → M4 (M4 ถือว่าน่าสงสัย ต้องให้คนตรวจ)
- `assets/docs.js` เป็นข้อมูลสังเคราะห์ 16 ฉบับ ครอบคลุม Auto-pass, ขาดลายเซ็นผู้รับของ, วางบิลเกินรับจริง, เลขคณิตบรรทัดผิด, UOM/ราคาต่าง, ขาดใบรับ, หลายใบรับ, เอกสารซ้ำ, ORG/Tax ID map ไม่ได้, fallback M4, revision round 2 และ pipeline fail (fail-safe)
- จำลอง workflow ตาม receiving contract: ทุก action มี reason code, note บังคับตามกรณี, expected_workflow_version และ Idempotency-Key; version ไม่ตรงบันทึก 409 Conflict และไม่แก้สถานะ; rerun สร้าง action outbox waiting_revision และกันการสั่งซ้ำ
- เพิ่ม RBAC 6 ผู้ใช้/5 บทบาทพร้อมขอบเขต company ↔ receiver, ตารางสิทธิ์, ตาราง Portal ↔ Entra ID ↔ Oracle RECEIVER ↔ บริษัท และตาราง Mockup ↔ Production gap
- ไม่ปิดบังความขัดแย้งของแหล่งข้อมูล: แสดงผัง docs-catalog ↔ as-built mapping, รหัสที่ชนกัน (E13, E34), Tax ID 0107545000179 / ORG 222 / ORG 196 ที่ไม่มีใน master, ORG 556 ที่ master map แล้ว, ขีดจำกัด PDF ของ portal ↔ Vision และ Decimal ↔ JSON float
- เพิ่ม `tools/smoke-test.js` (DOM ปลอม) ไล่เรนเดอร์ทุกผู้ใช้ ทุกหน้า ทุกแท็บ ทุกเอกสาร ทุก action และตรวจ invariant ของ decide() — ผ่าน 46 การตรวจ
- ยังไม่ได้แก้ `invoice-webV2`, `invoice-web1`, `invoice-web-9054076`, OCR engine หรือ backend ใด และไม่ได้ต่อ API จริง

### Changed — `CHG-20261003-014`
- Timestamp: `2026-10-03T12:05:00+07:00`
- ตรวจ `Web portal/invoice-webv3` ด้วย Chromium จริง (Playwright จาก `invoice-web-9054076/frontend`) แล้วแก้สิ่งที่เจอ:
  - `boot()` ไม่เคยsetค่า `<select id="user">` ทำให้ `BOOT.user` ถูกเพิกเฉยและ mockup เปิดด้วยผู้ใช้ option แรก → setค่า select จาก `BOOT.user` ก่อน `switchUser()` และเปลี่ยน `BOOT.doc` เป็นเอกสารที่อยู่ในขอบเขตของผู้ใช้ตั้งต้น (`AIVA-2609-0003`) เพื่อไม่ให้ first paint แสดงหน้าล็อก
  - แถบสเต็ปการทำงานเพิ่มขั้นที่ 4 "Portal ตรวจซ้ำ / ตัดสิน" (สถานะมาจาก `wf` + ผู้รับผิดชอบ) ให้เห็น pipeline ครบแบบ Mockup v4.4 แทนที่จะมีแค่ STEP 1–3 ของ engine
  - หน้า PDF จำลอง highlight หลักฐานตาม `rule.page` จริง: outline สีส้มที่รายการ/คอลัมน์ที่ evidence อ้างถึง ("บรรทัด N"), กล่องลายเซ็น, คู่ Tax ID ผู้ขาย และเลข PO พร้อมสรุปบรรทัด "หลักฐานที่ระบบชี้บนหน้านี้"
  - คิวแสดงแถวแจ้งเตือนเมื่อเอกสารที่เปิดอยู่ไม่ตรงกับตัวกรอง/KPI chip ปัจจุบัน พร้อมลิงก์ `resetFilt()` ล้างตัวกรอง (เดิมคือหายไปจากคิวโดยไม่มีคำอธิบาย)
- ผลตรวจ Chromium: console/page error 0 รายการ, ไม่มีค่า `undefined`/`NaN`/`[object Object]` ในทุกผู้ใช้×ทุกหน้า×ทุกเอกสาร×ทุกแท็บ, ที่กว้าง 390px ไม่มี horizontal overflow (0px), header 56px สี `rgb(13,39,77)`, KPI 6 ใบ, แท็บ active ใช้เส้นใต้ `rgb(0,181,175)`
- ไม่มีไฟล์ portal/backend/OCR เดิมถูกแก้ (ยังเป็นโฟลเดอร์ `invoice-webv3` ใหม่อย่างเดียว)

### Changed — `CHG-20261003-015`
- Timestamp: `2026-10-03T14:10:00+07:00`
- ยกระดับ mockup v3 (`Web portal/invoice-webv3`) รอบที่ 2 ตามช่องว่างที่เก็บจาก log/เอกสาร parity ของ portal เดิม (`05-implementation-status.md`, `07-mockup-feature-parity.md`, `08-task-first-review-ux.md`):
  - **action parity ครบ 9 action** (`explain` `resubmit` `rerun` `return` `hold` `release_hold` `reject` `confirm` `post`) แทนชุดเดิม 6 action ที่ขาด `release_hold`/`post` และบั๊ก `explain` ที่ทำให้ workflow กลายเป็น `undefined`
  - เพิ่ม `guards(doc)` เป็น source of truth เดียวของ "ปุ่มไหนกดได้/ไม่ได้และเพราะอะไร" ใช้ร่วมกันทั้ง action bar, การ์ดขั้นตอนถัดไป และ modal — ทุกปุ่มที่ disabled ต้องมี `title` เป็นเหตุผล (สิทธิ์/403 ตาม scope/On Hold/คนถือ hold คนละฝั่ง/snapshot เก่า/ปิดสถานะ/ไม่มี Receiver/outbox ค้าง/ผลเป็น Hold-Manual Review/High ฝั่งผู้ใช้ยังไม่ปิด/SoD/post ยังไม่เปิด)
  - เพิ่ม **การ์ด "ขั้นตอนถัดไป"** ตามลำดับข้อมูล task-first: งานที่ต้องทำ · ผู้รับผิดชอบ (เทียบ engine assigned) · หลักฐานหน้าที่ต้องเปิด · action ที่ทำได้ · ข้อพับ "ทำไมอีก N ปุ่มกดไม่ได้"
  - บังคับ **separation of duties** (ผู้แนบเอกสาร `upl` ทำ action ประเภทตัดสินเองไม่ได้) + ล็อกฝั่งบัญชีเมื่อ High exception ที่ engine มอบให้ฝั่งผู้ใช้ยังไม่ถูกปิด + ล็อก action อื่นขณะ On Hold และให้ `release_hold` พา workflow กลับสถานะก่อนพัก
  - เพิ่ม **revision snapshot**: เลือกดู revision เก่าได้จาก dropdown, banner "อ่านอย่างเดียว", PDF/JSON/ผลตรวจตรงรุ่นกัน, ทำ action กับ revision เก่าไม่ได้ (เหตุผลอ้าง immutable) และกลับสู่ revision ล่าสุดได้
  - คิว: เพิ่มคอลัมน์ "งานที่ต้องทำ" ทุกแถว, ตัวเรียงลำดับ (ความเร่งด่วน/ยอดเงิน/วันที่), แบ่งหน้าละ 8 รายการ และ KPI ใบที่ 7 "งานของฉัน" (UI-02/UI-03)
  - audit: ผูกบันทึกเป็น **hash chain (prev_hash/hash)** จำลอง tamper-evident พร้อมปุ่มตรวจความต่อเนื่อง + ปุ่มจำลองการแก้ไขเพื่อแสดง chain ขาด, deep link จากบันทึกไปยังเอกสาร, และส่งออก CSV พร้อมคอลัมน์ hash
  - viewer: แถบเครื่องมือ (ย่อ/ขยาย, เล่มหน้าด้วยปุ่ม + คีย์ `←` `→`), บันทึก **access event** ทุกครั้งที่เปิดเอกสาร และปิดปุ่มดาวน์โหลด/พิมพ์พร้อมเหตุผลนโยบาย (production ต้องใช้ signed URL)
  - เพิ่มเอกสาร `AIVA-2609-0017` เคส **Decimal ↔ float** ที่เก็บยอดเป็น string ตรงตาม snapshot (`600 × 30.666667 = 18,400.0002`) เพื่อสาธิตว่า portal ห้ามแปลงเป็น float แล้วทำให้ผลต่างหาย — ชุดเอกสารตั้งต้นเป็น 17 ฉบับ
  - ขยาย RBAC เป็น 7 ผู้ใช้ (เพิ่ม ADM) และปิด nav ตามสิทธิ์จริง (ADM ไม่มีคิว, audit เห็นเฉพาะ APR/ADM)
- ผลทดสอบจริง: `node --check` ผ่านครบทุกไฟล์ (6 ไฟล์ รวม browser-check) · `node tools/smoke-test.js` ผ่าน **60** การตรวจ (จาก 46) · `node tools/browser-check.js` ผ่าน **14** การตรวจด้วย Chromium จริง (7 ผู้ใช้ × nav ที่เปิดให้ = 22 จอ, 17 ฉบับ × 6 แท็บ = 102 จอ, console/page error 0, ที่ 390px overflow 0px)
- ยังไม่แก้ `invoice-webV2`, `invoice-web1`, `invoice-web-9054076`, OCR engine หรือ backend ใด และยังไม่ต่อ API จริง

### Added — `CHG-20261003-016`
- Timestamp: `2026-10-03T14:15:00+07:00`
- เพิ่ม `Web portal/invoice-webv3/tools/browser-check.js` เป็นเครื่องมือถาวร: ไล่หน้าจอ mockup ด้วย Chromium จริง แล้วตรวจสิ่งที่ DOM ปลอมมองไม่เห็น (console/page error, คีย์ลัด, ปุ่ม disabled + title, layout 390px, audit chain หลังทำ action) — รายงานเป็น "✓ ผ่าน N การตรวจ" และ exit code 1 เมื่อ fail
- หา playwright จาก `$PLAYWRIGHT_PATH` หรือโฟลเดอร์ข้างเคียง ไม่ผูก path แบบ hardcode และข้ามอัตโนมัติ (exit 0) เมื่อเครื่องไม่มี playwright; รองรับ `$BASE_URL` เพื่อตรวจตอนเสิร์ฟผ่าน http
- เพิ่ม `.gitignore` ในโฟลเดอร์ mockup: ไฟล์ขึ้นต้นด้วย `_` (สคริปต์/ผลตรวจชั่วคราว), `_shots/`, `node_modules/` เพื่อไม่ให้ไฟล์ชั่วคราวหลุดเข้า repo แบบรอบก่อน
- ลบสคริปต์ชั่วคราวรอบก่อนหน้าออกจากโฟลเดอร์ส่งมอบ (`_bc.js`, `_dbg*.js/.txt`, `tools/_patch_*.py` — เป็น one-shot patch ที่ apply ลง assets/ ครบแล้ว)
- แก้ตารางเคสและตัวเลขใน `invoice-webv3/README.md` ให้ตรงกับ `assets/docs.js` จริง (ตารางเดิมยังอ้างสถานะเก่า เช่น 0005/0006/0012, 16 ฉบับ → 17 ฉบับ, 6 ผู้ใช้ 5 บทบาท → 7 ผู้ใช้ 4 บทบาท, KPI 6 → 7 ใบ) และบันทึกข้อจำกัดของ hash chain ที่เป็นการจำลอง
