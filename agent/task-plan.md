# Task และ Plan

Last updated: 2026-10-02T20:52:00+07:00

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
