# SESSION-20261002-002 — Revision-aware document history

- Started: `2026-10-02T08:49:00+07:00`
- Completed: `2026-10-02T09:03:26+07:00`
- Task: `TASK-20261002-002`
- Status: completed

## User direction
อ่านแผนใน `invoice-web/docs` ตรวจสอบ implementation และพัฒนาต่อ โดยคงขอบเขต Portal ที่รับข้อมูล JSON/PDF จากระบบอื่น

## Delivered
- PDF attachment records แยกตาม document revision พร้อม compatibility backfill ของข้อมูล pilot เดิม
- APIs สำหรับ revision index, historical detail และ PDF exact revision โดยรักษา current endpoints
- UI selector/list/banner สำหรับเปิด JSON และ PDF ย้อนหลัง; revision อยู่ใน URL และคงอยู่หลัง reload
- Integration/readme/API/status docs ที่อธิบาย revision behavior ตาม implementation จริง

## Verification
- Backend unittest: 11 passed รวม multi-revision PDFs และ legacy backfill
- TypeScript + Vite production build: passed
- Playwright on Edge: 4 passed รวม revision deep link, archived PDF, desktop/mobile overflow
- Desktop/mobile revision-history screenshots inspected
- No live OCR, Oracle, DMS or AP integrations were exercised

## Remaining roadmap
Entra/RBAC, company/receiver isolation, PostgreSQL migrations, production storage/audit, malware scanning and retention/legal hold remain future work pending organizational requirements and real producer contracts.
