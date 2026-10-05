# Task และ Plan

<<<<<<< HEAD
Last updated: `2026-10-03T16:50:00+07:00`

## Completed Task
- Task ID: `TASK-20261003-007`
- Title: พัฒนา web portal เวอร์ชัน V5 (`Web portal/invoice-webV5`) แบบ repo-reference portal (no-build)
- Status: `completed`
- Goal: แก้ปัญหา code/data duplication ของ v4 โดย sync ข้อมูลจาก repo โดยตรง (`tools/sync.py`), รวมหน้าจอที่ซ้ำซ้อนเหลือ 6 หน้า, บังคับ view เป็น pure snapshot-driven และใช้ BigInt Decimal
- Acceptance criteria:
  - [x] `node tools/smoke-test.mjs` ผ่าน 31/31 (hygiene, provenance, domain, ui)
  - [x] `node tools/browser-check.mjs` ผ่าน 29/29 (Edge headless)
  - [x] `python tools/sync.py --check` ผ่าน
- Result: โฟลเดอร์ `Web portal/invoice-webV5` ครบถ้วนพร้อมเอกสาร `PORTAL-plan.md` และ `as-built-v5.md`
- Next: commit โฟลเดอร์ V4, V5 และ push ขึ้น git

## Previous Completed Task
- Task ID: `TASK-20261003-006`
- Title: สร้าง web portal เวอร์ชัน V4 (`Web portal/invoice-webV4`) แบบ no-build ที่แสดงผลจาก snapshot เท่านั้น + เอกสารพัฒนาครบชุด
- Status: `completed`
- Goal: นำตัวอย่างเว็บ/ข้อมูลทั้งหมดใน `Web portal` (mockup v4.4, v1/v2/v3, OCR service rules + master data, skill `aiva-invoice-core`) มาสร้าง portal ที่ "ดูได้จริงและพิสูจน์ข้อห้ามทางสถาปัตยกรรมได้จริง" แทน mockup ที่ผลตรวจเป็นการพิมพ์มือ
- Plan:
  - [x] สำรวจของเดิม (v1/v2/v3 + mockup + `rules.py`/`master_data.py` + core-domain) แล้วกำหนดเลเยอร์ `domain/data/engine/ui/views/styles`
  - [x] engine mirror as-built (`src/engine/rules.js`) ที่ **ใช้เฉพาะ tools** เพื่อ generate ผลตรวจออกมาจริง
  - [x] receiving contract v1.0 + `validateSnapshot`/`rulesCompleteness` เป็นประตูข้อมูลเดียว (`store.ingest`)
  - [x] domain 10 ไฟล์แบบ pure (BigInt decimal, company mapping ไม่เดา → `UNMAPPED`, access/workflow/guards 3 ชั้น, audit append-only, store เก็บเฉพาะ overlay)
  - [x] views 6 หน้า + hash router + ตัวกรอง/action/modal ที่แสดงเหตุผลทุกปุ่มที่ถูกบล็อก
  - [x] ข้อมูลเดโม generate จาก cases 22 ฉบับ (SoD, evidence missing/stale, outbox, hand-authored, not_evaluated, M4, safety cap, USD, duplicate, terminal, decimal 6 ตำแหน่ง)
  - [x] `tools/serve.py`, `build-master-data.py`, `build-fixtures.mjs --check` (มี drift detection), `smoke-test.mjs` (9 กลุ่ม 107 การตรวจ), `browser-check.mjs` (Chromium 14 การตรวจ + ข้ามตัวเองเมื่อไม่มี playwright)
  - [x] เอกสาร `README.md` + `docs/00…07.md` (overview/architecture/data-contract/domain-model/ui-spec/build-and-test/as-built-gaps/demo-script)
- Acceptance criteria:
  - [x] `python tools/build-master-data.py` + `node tools/build-fixtures.mjs` + `--check` ผ่าน (เคส 22 · snapshot 24 · error 0 · warning 3) และไม่ drift
  - [x] `node tools/smoke-test.mjs` ผ่าน 107/107 รวมข้อห้ามสถาปัตยกรรม (no runtime engine import, no DOM ใน domain, ไม่มี parseFloat/toFixed นอก money.js, ผลตรวจห้าม hardcode)
  - [x] `node tools/browser-check.mjs` ผ่าน 14/14 — console/page error 0, ไม่มี `undefined/NaN/[object Object]` บนจอ, SoD toast ขึ้นเหตุผล, layout 390px ไม่ล้นแนวนอน
  - [x] ไม่มีอักษรภาษาอื่นปนในโค้ดและ docs (เทสต์group 7 สแกน .js/.mjs/.md; อนุโลม Greek `Σ`)
  - [x] ไม่แตะ portal เวอร์ชันอื่น/OCR/backend; ปิดรอบด้วย canonical records ครบ
- Result: โฟลเดอร์ใหม่ `Web portal/invoice-webV4` (untracked) — runtime 3 + domain 10 + data generated 2 + engine mirror 1 + ui 2 + views 6 + css 1 + tools 6 + docs 9/README; session `2026-10-03-006`, changelog `CHG-20261003-017/018`, work-log `WORK-20261003-018/019`, errors `ERR-20261003-009…014`
- Next: commit โฟลเดอร์นี้ (รอผู้ใช้สั่ง) → ทดสอบกับ snapshot ที่ dump จาก n8n จริง → ตัดสินใจ merge กลับ mockup/v3 หรือเดินต่อที่ V4

- Task ID: `TASK-20261003-005`
- Title: ยกระดับ mockup v3 ด้วยข้อสังเกตจาก log ทั้งหมด (action parity, revisions, audit, scope/SoD, decimal)
- Status: `completed`
- Goal: นำช่องว่าง/บั๊กที่บันทึกไว้ใน `agent/work-log.md`, `agent/errors-and-solutions.md`, session ก่อนหน้าและเอกสารอ้างอิง (`07-mockup-feature-parity.md`, `08-task-first-review-ux.md`, `05-implementation-status.md`) มาปิดในงาน mockup เดิม เพื่อให้ v3 สาธิตพฤติกรรมจริงได้ครบและตรง contract ขึ้น
- Plan:
  - [x] แก้บั๊กที่พบจาก log: action `explain` ทำให้ `workflow` เป็น undefined, filter "งานของฉัน" ถึงไม่ได้จาก KPI, `release_hold` ไม่มีใน action set
  - [x] action parity ตาม `08-task-first-review-ux.md`: explain/resubmit/rerun/return/reject/hold/release_hold/confirm + `post` ที่ปิดพร้อมเหตุผล + blocking reason ทุกปุ่ม
  - [x] การ์ด "ขั้นตอนถัดไป" (งาน + ปัญหา + ผู้รับผิดชอบ + action ที่ทำได้/ไม่ได้) ตามลำดับข้อมูล task-first
  - [x] separation of duties + ล็อกฝั่งบัญชีเมื่อ High exception ของฝั่งผู้ใช้ยังไม่ปิด
  - [x] revision selector + banner immutable + PDF/JSON ตรงรุ่น (stale revision ทำ action ไม่ได้)
  - [x] audit: hash chain (tamper-evident) + verify + จำลองการแก้ไขเพื่อแสดง chain ขาด + คลิกไปยังเอกสาร + ส่งออก CSV
  - [x] คิว: คอลัมน์ "งานที่ต้องทำ", sort, pagination, KPI "งานของฉัน" (UI-02/UI-03)
  - [x] viewer: zoom, เล่มหน้าด้วยปุ่ม/คีย์บอร์ด, บันทึก access event, ปุ่มดาวน์โหลด/พิมพ์ปิดพร้อม policy (UI-12)
  - [x] เคสทศนิยม Decimal ↔ float และเลข string ตรงตาม snapshot (เอกสารใหม่ `AIVA-2609-0017`)
  - [x] ขยาย `tools/smoke-test.js` ให้คลุมพฤติกรรมใหม่ทั้งหมด (46 → 60 การตรวจ)
  - [x] แปลงสคริปต์ตรวจชั่วคราวเป็นเครื่องมือถาวร `tools/browser-check.js` (Chromium จริง 14 การตรวจ + exit code) และเก็บกวาดไฟล์ `_dbg*`, `_bc.*`, `tools/_patch_*.py` + เพิ่ม `.gitignore`
  - [x] อัปเดต README (โครงสร้าง, คำสั่ง, ตาราง 17 เคสที่ map กับ `docs.js` จริง, ข้อจำกัด) + canonical records
- Acceptance criteria:
  - [x] ทุก action ที่แสดงบนหน้าจอมีผลต่อ workflow/audit/outbox ชัดเจน และไม่มี path ใดทำให้สถานะเป็น undefined
  - [x] ปุ่มที่กดไม่ได้ต้องอธิบายเหตุผลได้ (guard เดียวกันใช้ทั้งใน action bar และการ์ดขั้นตอนถัดไป) — ตรวจว่าทุกปุ่ม disabled มี `title` ยาว ≥ 10 ตัวอักษร
  - [x] ไม่แก้ snapshot/rules เดิม และ action บน revision เก่าถูกบล็อก (ตรวจว่า `d.rev`/`d.wfv`/`OUTBOX` คงเดิมหลังดูของเก่า)
  - [x] audit chain ตรวจแล้วผ่าน และแสดง chain ขาดเมื่อมีการแก้บันทึก (แล้วกู้กลับได้ด้วย `rechain()`)
  - [x] `node --check` + smoke test ผ่านโดยไม่มี `undefined`/`NaN`/`[object Object]` (รวมการไล่ด้วย Chromium จริง 102 จอ + 22 จอที่ nav เปิดให้)
- Result:
  - `assets/app.js` +685 บรรทัด (guards/todoOf/nextCard/revision view/queue sort+pagination/audit hash chain+CSV+deep link/viewer toolbar+access event), `assets/domain.js` (ACTIONS ครบ 9 ตัว + use/blocked/decide/needReceiver, REASON_CODES 12), `assets/docs.js` (revs ของ 0013/0015, เอกสาร 0017, ปรับ `upl` ของ 0012 เพื่อทดสอบ SoD), `assets/style.css` (+27 บรรทัด)
  - `tools/smoke-test.js` 46 → **60** การตรวจ ผ่านทั้งหมด; เพิ่ม `tools/browser-check.js` ผ่าน **14** การตรวจด้วย Chromium จริง (console error 0, 390px overflow 0px)
  - README ถูกรีไรต์ในส่วนพฤติกรรม/ตารางเคสให้ตรงกับ `docs.js` (ตารางเดิม drift เช่น 0005/0006/0012) + `.gitignore` กันไฟล์ชั่วคราว
  - บันทึกเป็น `CHG-20261003-015/016`, `WORK-20261003-016/017`, `ERR-20261003-006/007/008` และ session `2026-10-03-005-mockup-v3-round2.md`
  - commit `cd76db0` (mockup) + commit ของ `agent/` แยกถัง ยังไม่ได้ push
  - ข้อจำกัดที่เหลือ: hash chain/idempotency เป็นของจำลอง, `post`/download ปิดไว้, ยังไม่ต่อ backend — ต้องให้ฝ่ายบัญชีรับรองกติกา SoD/ล็อกฝั่งก่อนใช้เป็นสเปก

## Concurrent Task
- Task ID: `TASK-20261003-004`
- Title: สร้าง Web portal mockup v3 แบบ no-build ใน `Web portal/invoice-webv3`
- Status: `completed`
- Goal: ทำ mockup ที่เปิดจาก `file://` ได้ทันที โดยไม่ต้องใช้ build tooling เพื่อนำข้อมูลจริงในคลังโค้ด (master data, กฎ V-01–V-09, workflow/receiving contract) มาแสดงในโครงหน้าตาของ Mockup v4.4 พร้อมเปิดเผยข้อขัดแย้งระหว่าง docs / as-built / mockup ให้ทีมรับรองก่อนพัฒนาจริง
- Plan:
  - [x] อ่าน master data, rules engine, receiving contract, docs standard และ Mockup v4.4
  - [x] ตั้งโครง no-build (classic script 4 ไฟล์ + CSS + HTML)
  - [x] สร้าง `tools/build-domain-data.py` เพื่อกำเนิด `assets/data.js` จาก OCR service แทนการ copy มือ
  - [x] เขียน domain reference (กฎ, decision order, ownership, RBAC, action/reason code, mapping, conflicts, provenance)
  - [x] สังเคราะห์ชุดเอกสาร 16 ฉบับให้ครอบคลุมทุกเคส รวมถึง fail-safe/duplicate/revision/pipeline-fail
  - [x] ทำ UI ให้โต้ตอบได้: คิว/KPI/chips, 6 แท็บ, PDF viewer จำลอง, action + 409 + outbox, RBAC, audit, reference
  - [x] เขียน `tools/smoke-test.js` และทำให้ผ่านครบทุกการตรวจ
  - [x] อัปเดต canonical records ตาม Agent Operating Protocol
- Acceptance criteria:
  - เปิด `index.html` จาก `file://` ได้โดยไม่ต้อง install/build และไม่มีการพึ่งพาไฟล์นอกรากโปรเจกต์
  - สถานะเอกสารทุกฉบับใน mockup คำนวณซ้ำได้จาก rules ที่แสดงบนหน้าจอ (ไม่ใส่ผลแบบมือล้วน)
  - ไม่ relabel exception code ข้าม ruleset และความขัดแย้งของข้อมูลปรากฏให้ผู้ใช้เห็น
  - ทุก action จำลอง reason code, version check (409) และ outbox ตาม contract
  - ไม่แก้โค้ด portal/backend/OCR ที่ใช้อยู่
- Result:
  - เพิ่มโฟลเดอร์ `Web portal/invoice-webv3` (9 ไฟล์ ~2,293 บรรทัด) + `README.md` อธิบาย provenance และข้อจำกัด
  - `node --check` ผ่าน 4 สคริปต์; `node tools/smoke-test.js` ผ่าน 46 การตรวจ
  - commit `94d8cad` และ push ไป `origin/invoice-web` แล้ว (ยังไม่ต่อ API จริง)

## Previous Task Record
- Task ID: `TASK-20261003-002`
- Title: จัดทำ repository skill สรุปแก่นระบบ AIVA Invoice Matching
- Status: `completed`
- Goal: สกัดข้อมูลหลักจาก Mockup v4.4, OCR service และ docs ให้เป็น skill สำหรับอ้างอิงระหว่างพัฒนาต่อ โดยครอบคลุมขอบเขตระบบ field สำคัญ กฎตรวจสอบ requirement และข้อขัดแย้งของแหล่งข้อมูล โดยไม่ผูกกับโครงสร้าง implementation ที่ละเอียดเกินจำเป็น
- Plan:
  - [x] อ่าน schema และกฎที่ OCR service ใช้งานจริง
  - [x] อ่าน receiving contract และ requirement จาก Web Portal/docs
  - [x] สร้าง skill และ reference ฉบับกระชับ
  - [x] ตรวจรูปแบบ skill และตรวจทานกับ source
  - [x] ปิดงานและอัปเดต canonical records
- Acceptance criteria:
  - มีรายการ field หลักตั้งแต่เอกสาร, รายการสินค้า, receipt, ผลกฎ, workflow และ audit
  - สรุป V-01 ถึง V-09, decision, tolerance และ fail-safe ตาม implementation ปัจจุบัน
  - แยก requirement ที่ต้องมีออกจากสิ่งที่ยังต้องรับรองก่อน production
  - ระบุความขัดแย้งสำคัญระหว่าง docs, mockup และ code เพื่อไม่ให้ agent เดาความหมายเอง
- Result:
  - เพิ่ม `.agents/skills/aiva-invoice-core/SKILL.md` เป็น entrypoint และกติกาการใช้ domain knowledge
  - เพิ่ม `references/core-domain.md` ครอบคลุม system boundary, field catalog, V-01–V-09, decision/routing, workflow, production requirements และ source conflicts
  - เพิ่ม `agents/openai.yaml` สำหรับการค้นพบและเรียกใช้ skill
  - ตรวจด้วย `quick_validate.py` ผ่าน และตรวจ source/reference paths ครบ
=======
Last updated: 2026-10-02T20:52:00+07:00
>>>>>>> origin/invoice-web

## Active Task
- Task ID: TASK-20261002-009
- Title: ยกระดับ .gitignore ให้ครอบคลุมข้อมูลความลับขององค์กรทั้งหมด (Company Sensitive Data, Credentials, Financials, ERP/Oracle Wallets & Dumps) พร้อม commit และ push ขึ้น git server
- Status: completed
- Goal: ตรวจสอบและปรับปรุง .gitignore ในระดับ repository root และ sub-projects ให้กันไฟล์ที่เป็นความลับของบริษัททุกรูปแบบ (Environment files, API tokens/keys, Private keys/certificates, Oracle wallets/configs/dumps, ฐานข้อมูล, PDF ใบแจ้งหนี้จริง, เอกสารรายงานการเงิน/บัญชี, logs, cache และ runtime artifacts) ไม่ให้รั่วไหลขึ้น git repository พร้อม commit และ push ขึ้น origin/main

## Plan
- [x] สำรวจและออกแบบชุด rules ของ .gitignore ให้ครอบคลุมทุกหมวดหมู่ของ company sensitive data
- [x] ปรับปรุง root .gitignore ให้มี rules รัดกุมและเป็นหมวดหมู่ชัดเจน
- [x] ปรับปรุง sub-directory .gitignore (OCR service/n8n/.gitignore, invoice-web/.gitignore) ให้สอดคล้องกัน
- [x] ทดสอบด้วย git check-ignore เทียบกับ pattern ตัวอย่างของ sensitive data ทุกหมวดหมู่ (เช่น .env, oracle.wallet, *.pem, *.key, *.xlsx, *.pdf, credentials.json, data/, ฯลฯ) และตรวจยืนยันว่า mock fixture (invoice-web/examples/invoice.pdf) ยังคงอยู่
- [x] รัน regression tests ทั้ง backend unittest (15 passed) และ pytest ใน OCR service/n8n (9 passed, 2 deselected)
- [x] อัปเดต canonical records (current-state.md, changelog.md, work-log.md, sessions/) ตาม protocol
- [x] ทำ git add, git commit และ git push ไปยัง remote server (origin/main) พร้อมตรวจผลยืนยัน

## Acceptance criteria
- .gitignore ระดับ root มี rules ครอบคลุม:
  - Secrets & Environment: .env*, *.secret*, *credentials*.json, 	oken.json, *service_account*.json, API keys
  - Cryptography & Certs: *.key, *.pem, *.pfx, *.p12, *.cer, *.crt, SSH keys (id_rsa*, id_ed25519*)
  - Oracle & ERP: Oracle Wallet (cwallet.sso, *.wallet), Net config (*.ora, ojdbc.properties), Database files (*.db, *.sqlite*, data/), Dumps & Backups (*.dmp, *.dump, *.bak, *dump*.sql)
  - Company & Financial Data: Real PDFs (*.pdf ยกเว้น fixture invoice-web/examples/invoice.pdf), Excel/Spreadsheets (*.xlsx, *.xls, *.xlsm), CSV exports/receipts/entities, Paperless OCR runtime payloads/reports
  - Automation & Agents: n8n state/credentials, .agent/, .agents/, .pi/, .mcp.json, scratch directories
  - Runtimes & OS: Python venv/cache, Node modules/dist/test results, OS metadata (.DS_Store, Thumbs.db), logs & archives
- git check-ignore ตรวจจับ pattern ความลับได้ถูกต้องทุกหมวดหมู่
- Test suites ที่มีอยู่ (pytest 9/11 และ unittest 15/15) ยังทำงานได้ตามปกติ
- บันทึกการเปลี่ยนแปลงใน gent/ ครบถ้วนตาม AGENTS.md
- Commit และ push ขึ้น origin/main สำเร็จอย่างปลอดภัย


## Result
- ยกระดับ root .gitignore ครอบคลุมข้อมูลความลับขององค์กร 12 หมวดหมู่: Environment variables, credentials/tokens/API keys, private keys & SSL certs, Oracle database artifacts (wallet, net configs, sqlnet, tnsnames, dumps), ข้อมูลการเงิน/ใบแจ้งหนี้จริง (PDFs, Excel spreadsheets, CSV extracts), batch run reports/failed payloads, n8n automation local states, Python/Node runtime artifacts, IDE/Agent workspace files, OS metadata และ logs
- กำหนด whitelist อย่างปลอดภัยสำหรับ .env.example และ synthetic fixture invoice-web/examples/invoice.pdf
- ทดสอบด้วย git check-ignore -v ครอบคลุม 25+ pattern ตัวแทนข้อมูลสำคัญของบริษัท ได้ผลสมบูรณ์ 100%
- ทดสอบ regression tests ผ่านทั้งหมด:
  - OCR service/n8n: 9 passed, 2 deselected in 1.28s
  - invoice-web/backend: 15 passed in 2.332s
- บันทึกการเปลี่ยนแปลงใน canonical records ครบถ้วนตาม protocol
- Commit และ push ขึ้น origin/main บน git server สำเร็จ

## Previous Result
- TASK-20261002-008 ปรับ n8n workflow LUCmn3l0bZDjbVV ให้ทำงานตรงกับ Python FastAPI engine (v6.5) ผ่าน MCP และอัปเดตเอกสาร flow structure — diff หลัง re-export รายงาน IDENTICAL สำหรับ 7 jsCode + N7 jsonBody, harness รัน code จาก export จริง: 7/7 เคสตรง Python
- TASK-20261002-007 Synthetic invoice corpus: 	ests/test_invoices/ มี 155 PDF (157 หน้า) + answer key 155 รายการที่ผลิตจาก pp/core/rules จริง
- Normalize UI ของ invoice-web ทั้งหมด: KPI cards + consolidated filter bar, high-contrast queue table, Executive 3-Way Match Snapshot, Provenance bar, 3-Step Verification Stepper, Discrepancies callout with PDF jump, Decision Hub และ 5 detail tabs
- Backend unittest 15 ผ่าน, TypeScript + Vite production build ผ่าน, Playwright E2E 6 ผ่าน (desktop/mobile 390px)

## Outside this task
- ไม่ลบหรือแก้ไข source code ฟังก์ชันการทำงานของ OCR/rules engine หรือ web portal
- ไม่ push ข้อมูลความลับหรือ payload จริงขึ้น git repository
