# SESSION-20261002-004 — Mockup feature parity

- Started: `2026-10-02T09:25:58+07:00`
- Completed: `2026-10-02T09:40:01+07:00`
- Task: `TASK-20261002-004`
- Status: completed

## User direction
ตรวจ requirements ใน `invoice-web/docs` และพัฒนาต่อโดยอ้างอิง feature/function และหน้าตาของ `AIVA-Web-Portal-Mockup-v4.4-Release.html` เป็นหลัก ให้พร้อมใช้งานในขอบเขตเว็บรับ JSON/PDF จากระบบอื่น

## Delivered
- Feature parity matrix UI-01–UI-15 พร้อมสถานะ ready/partial/dependency และ release boundary ที่ตรวจสอบได้
- Queue และ document header ที่แสดง company, PO/release, receipt, ORG_ID, Receiver, total, revision และ PDF context
- Six detail tabs: summary, line comparison, rules with STEP 1–3, ownership/access, JSON and persistent history
- Global audit API/page with search, event-kind filter, pagination and document navigation
- Access page driven by session permissions/capabilities พร้อมรายการ organizational dependencies ที่ยังไม่เปิดใช้
- Responsive styles และ accessible keyboard navigation ของ document tabs

## Verification
- Backend unittest: 13 passed
- TypeScript + Vite production build: passed
- Playwright on Edge: 5 passed
- Desktop/mobile screenshots for detail, access and audit visually inspected; root horizontal overflow check passed
- Local preview on port 8010 restarted; health, session capabilities, audit events, stored two-revision document and static frontend returned successfully

## Release boundary
Release นี้พร้อมสำหรับ local/shared-key receiving pilot. Entra identity, company/receiver RBAC, Oracle mapping, OCR/AP workflow actions, signed DMS sessions และ production PostgreSQL/Alembic infrastructure ยังต้องมีข้อกำหนดและระบบภายนอกก่อนเปิดใช้จริง
