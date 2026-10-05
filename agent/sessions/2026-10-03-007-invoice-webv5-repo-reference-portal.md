# Session `2026-10-03-007` — สร้าง `invoice-webV5`: repo-reference web portal no-build

- Session ID: `2026-10-03-007`
- Task: `TASK-20261003-007`
- Started: `2026-10-03T16:00:00+07:00`
- Completed: `2026-10-03T16:50:00+07:00`
- Branch: `invoice-web`
- Scope: `Web portal/invoice-webV5/**` + `agent/**`

## เป้าหมาย

> สร้าง web portal v5 ที่แก้ปัญหาการ copy ข้อมูลจาก repo มาไว้ในโค้ด UI ของ v4 โดยเปลี่ยนเป็น **repo-reference portal** ที่ซิงก์ข้อมูลอ้างอิงตรงจาก repo ผ่าน script `sync.py` พร้อม provenance (sha256/mtime/lines) และแสดงผลจาก snapshot เท่านั้น

## สถาปัตยกรรมและสิ่งที่ตัดสินใจ

1. **Repo-reference data flow**:
   - `tools/sync.py` อ่าน `OCR service/n8n/app/core/master_data.py`, `rules.py`, `models.py`, `docs/*.md`, `AIVA-Web-Portal-Mockup-v4.4-Release.html`
   - สร้างไฟล์ generated: `master-data.js`, `sources.js`, `repo-docs.js`, `design-tokens.js` พร้อมบันทึก sha256 และห้ามแก้ไขด้วยมือ
2. **Snapshot-driven view layer**:
   - Portal เป็น view layer แสดงผลเท่านั้น ห้าม recompute matching ใน frontend
   - `tools/build-snapshots.mjs` รัน fixture 22 เคส (24 snapshots) ผ่าน `src/engine/rules.js` บันทึกลง `src/data/snapshots.js`
3. **No-build ES modules**:
   - เปิดผ่าน `tools/serve.py` (พอร์ต 8787) ไม่ต้องมี bundler หรือ npm dependencies
4. **Consolidated Views**:
   - รวมหน้าจอที่ซ้ำซ้อนจาก v4: ยุบ dashboard/queue/master/help เหลือ 6 หน้า: `work`, `detail`, `rules`, `manual`, `sources`, `audit`
5. **Enforced Guards & BigInt Money**:
   - คำนวณเงินด้วย BigInt decimal string (`domain/money.js`)
   - นโยบาย 3 ชั้น (`access → workflow → guards`) โดย `post` ถูกล็อกไว้ด้วย guard `ap-contract`

## ผลการทดสอบจริง

| การตรวจ | คำสั่ง | ผล |
|---|---|---|
| Smoke Test | `node tools/smoke-test.mjs` | **✓ ผ่าน 31/31** (hygiene, provenance, domain, UI) |
| Browser Check | `node tools/browser-check.mjs` | **✓ ผ่าน 29/29** (Edge headless + CDP, console error 0) |
| Data Sync Drift Check | `python tools/sync.py --check` | **✓ ผ่าน** (sha256 ตรงกับ repo ทุกไฟล์) |

## โครงสร้างไฟล์ที่สร้าง

- `Web portal/invoice-webV5/`
  - `index.html`, `app.js`, `README.md`
  - `docs/as-built-v5.md`, `docs/PORTAL-plan.md`
  - `src/styles/app.css`
  - `src/domain/` (money, schema, ruleCatalog, exceptions, company, workflow, access, guards, store, audit, reference, mdtext)
  - `src/data/` (snapshots, master-data, sources, repo-docs, design-tokens)
  - `src/engine/rules.js` (mirror สำหรับ build snapshot เท่านั้น)
  - `src/ui/` (dom, format, markdown, parts)
  - `src/views/` (work, detail, rules, manual, sources, audit)
  - `tools/` (serve.py, sync.py, build-snapshots.mjs, smoke-test.mjs, browser-check.mjs, cases-*.mjs)
  - `.gitignore` (tmp/, node_modules/, *.log, .DS_Store)
