# Current State

Last verified: `2026-10-02T10:40:00+07:00`

## Repository
- Branch: `invoice-web`
- Existing OCR service and original HTML mockup remain unchanged this development session.
- Agent records, central docs and invoice-web are uncommitted/untracked in the working tree; no commit/push performed.

## Implemented Portal
- `invoice-web/frontend`: React + TypeScript + Vite + TanStack Query; UI ถูก normalize และ redesign ใหม่ทั้งหมดเพื่อให้อ่านง่ายและเห็นภาพรวม 3-Way Match ทันที.
- Normalized Queue View: KPI overview strip (ทั้งหมด/ผ่าน/รอตรวจ/ระงับ) แบบ interactive, single-bar unified filters (search, company, source, status, quick-tabs, chips), และ high-contrast table พร้อม context chips (ใบรับ, receiver, PO, amount tabular nums).
- Normalized Document Detail: Executive 3-Way Match Snapshot card (Vendor, PO/Release, Goods Receipt, Grand Total), Provenance bar, Executive Workflow Decision Hub, 3-Step Verification Pipeline Stepper, Discrepancy/Exception callout พร้อม direct PDF evidence link, และ 5 แท็บข้อมูล (สรุป, รายการสินค้า 3-way line match, กฎการตรวจพร้อม code/step, ประวัติตาม timeline, ข้อมูลเพิ่มเติมและ JSON).
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
- Backend: 15 unittest tests passed (persistence, idempotency, conflicts, revisions, schema validation, versioned PDF, global audit, workflow action/version/idempotency/outbox/revision completion, compatibility backfill, origin, keys, filters, adapter, architecture boundaries).
- Frontend: TypeScript strict and Vite production build passed.
- Playwright: 6 tests passed on Edge browser (17.4s), covering import, PDF canvas viewer, tabs, history, filters, mobile viewport (390px) no-overflow, invalid JSON rejection, exact large decimal display, revision deep link/archived PDF, access/audit navigation, and review action persistent outbox.
- Browser subagent visual inspection: ตรวจ Queue page, Document detail overview, Line items table, Rules list, Revision history, Audit page, Action waiting state บน desktop และ mobile เรียบร้อย.
- Local preview on port 8010 serves latest production bundle successfully.
- No live OCR, Oracle, LiteLLM, Paperless or AP tests executed.

## Existing System
- `OCR service/n8n/app` remains the existing Python OCR and matching service.
- `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html` remains UI/data reference.
- `docs/` remains original architecture reference; code/docs have known contract and rules-version differences recorded in invoice-web planning documents.

## Constraints / Next Work
- Current release is local/integration pilot, not company-scoped production: shared API keys are workspace-wide; Entra, user/receiver RBAC and immutable user audit remain unimplemented.
- Workflow actions ใน shared-key pilot ไม่มีตัวตนรายบุคคล; ต้องเชื่อม Entra ก่อนบังคับ EU/ACC/APR และ separation of duties.
- SQLite startup table creation currently used; PostgreSQL/Alembic and production backup/storage/retention/scan/rate limits remain future work.
- `workers`, `migrations` และ `infra` เป็น boundary พร้อม README เท่านั้น ยังไม่มี Celery/Redis, Alembic runtime หรือ production deployment.
- PDF binary upload only; no live DMS URL connector/watermark. JSON/PDF เปิดย้อนหลังตาม revision ได้ แต่ retention/legal hold/cleanup ยังไม่ทำ.
- Need sanitized real producer contract to validate upstream mapping; never relabel legacy codes as a new standard.
- Producer ต้องเชื่อม action outbox และกำหนด SLA/retry/dead-letter ก่อนใช้ resubmit/rerun กับงานจริง; AP post ยังไม่เปิด.
- Keep logs free of secrets and invoice payloads; read Thai files explicitly with UTF-8.
