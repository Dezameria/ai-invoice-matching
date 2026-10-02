# Task และ Plan

Last updated: `2026-10-02T10:10:57+07:00`

## Active Task
- Task ID: `TASK-20261002-006`
- Title: Redesign และ normalize invoice-web UI ให้เห็นภาพรวมและเข้าใจข้อมูลง่ายขึ้น
- Status: `completed`
- Goal: ปรับปรุงการจัดวางและดีไซน์ของ UI ทั้งหมดใน invoice-web (Queue, Document Detail, Stepper, Line Items, Actions, Filters) ให้มีภาพรวมชัดเจน ข้อมูลอ่านง่าย ไม่กระจัดกระจาย ยกระดับ visual aesthetics และคงความเข้ากันได้กับ test และ workflow เดิม 100%

## Plan
- [x] วิเคราะห์และวางแผน layout ใหม่: Unified KPI cards, Consolidated single-bar filter, Normalized document table, At-a-glance 3-way match header, Streamlined decision panel
- [x] ปรับปรุง design system และ CSS ใน `global.css`, `mockup-parity.css`, `revisions.css` (Typography, colors, card elevation, responsive layout)
- [x] ปรับปรุง `QueuePage.tsx` ให้มี executive overview cards, smart unified filter bar, และ readable high-contrast table
- [x] ปรับปรุง `DocumentDetail.tsx` และ `ReviewActionPanel.tsx` ให้เห็นภาพรวม 3-way match, 3-step verification status, และ next actions อย่างชัดเจน
- [x] ปรับปรุงแท็บข้อมูล (`SummaryTab`, `LinesTab`, `RulesTab`, `HistoryTab`, `SourceTab`) ให้จัดหมวดหมู่ข้อมูลอย่างลงตัว
- [x] ตรวจสอบความถูกต้องด้วย TypeScript build, Backend unittests, Playwright end-to-end tests และ browser screenshots
- [x] บันทึกผลใน canonical records (current-state, changelog, work-log, session file)

## Acceptance criteria
- ข้อมูลสำคัญ (เลขที่เอกสาร, ผู้ขาย, ยอดเงิน, PO, ใบรับ, ผลตรวจ, งานถัดไป) เห็นได้เป็นภาพรวมทันที ไม่ต้องกดค้นหาหลายที่
- ลดความซ้ำซ้อนของตัวกรองใน Queue (รวมเป็น single cohesive control bar + interactive KPI cards)
- หน้า Detail แสดง 3-Way Match Stepper และ Next Action Hub ชัดเจนพร้อมหลักฐาน PDF
- รองรับ Responsive บน Desktop และ Mobile (ไม่มี horizontal overflow ไม่พึงประสงค์)
- Playwright E2E tests และ backend unittests ผ่านทั้งหมด 100%

## Result
- Normalize UI ทั้งหมด: จัด Typography, Contrast, Spacing, Card Elevation, และ Color Palette ใหม่ให้อ่านง่าย สบายตา และมีมาตรฐานแบบ Enterprise FinTech
- Queue Page: จัดรวม 4 KPI Summary Cards (คลิกกรองได้ทันที), Consolidated Single Control Toolbar รวม Search/Selects/Quick-tabs/Company chips, และ High-Contrast Table พร้อม context chips
- Document Detail: เพิ่ม Executive 3-Way Match Snapshot Card (Company, PO/Release, Goods Receipt, Grand Total), Provenance Bar, 3-Step Verification Pipeline Stepper, Discrepancies Callout with 1-click PDF jump, และ Decision Hub
- Detail Tabs: จัดหมวดหมู่ 5 แท็บชัดเจน (สรุป 3-way match, รายการสินค้าเปรียบเทียบใบรับ, 9 กฎการตรวจพร้อม STEP badge และรหัสข้อผิดพลาด, Activity Timeline, และข้อมูลแหล่งที่มาพร้อมสลับ Revision)
- ผ่านการทดสอบครบถ้วน: TypeScript build ผ่าน, Backend 15 unittests ผ่าน, Playwright E2E 6 tests ผ่าน (desktop & mobile 390px), และตรวจสอบภาพจริงผ่าน browser subagent เรียบร้อย

## Previous Result
- เพิ่ม explain/resubmit/rerun/return/reject/hold/confirm แบบ persistent โดยผลตรวจ snapshot ไม่ถูกแก้ไข
- เพิ่ม workflow version, reason validation, required note, idempotency, activity history และ action outbox/acknowledgement
- จัดหน้ารายละเอียดให้เห็น next action/ผู้รับผิดชอบก่อน exception และ PDF; ลดเหลือ 5 แท็บโดยรวมข้อมูลเทคนิคไว้ในข้อมูลเพิ่มเติม
- Queue แสดงงานที่ต้องทำแยกจากผลตรวจต้นทาง และหน้า Integration อธิบาย outbox → ack → revision ใหม่
- Backend 15 tests, production build และ Playwright 6 tests ผ่าน; ตรวจภาพ desktop/mobile และรีสตาร์ต preview พอร์ต 8010 แล้ว

## Outside this task
- Entra user/company/receiver RBAC และ account mapping
- AP submission/post และการรัน OCR/Oracle จริง
- DMS signed sessions/watermark, PostgreSQL/Alembic production runtime
