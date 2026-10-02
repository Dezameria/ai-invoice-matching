# Task และ Plan

Last updated: `2026-10-02T12:15:00+07:00`

## Active Task
- Task ID: `TASK-20261002-010`
- Title: ปรับปรุงโครงสร้างหลักของ Web Portal สู่ต้นแบบ AIVA Mockup v4.4 อย่างสมบูรณ์ 100% (แก้ไข UI เละเทะ)
- Status: `completed`
- Goal: แก้ไขปัญหา UI เละเทะที่เกิดจากการมีแถบดำด้านซ้าย 240px (Sidebar เดิม) ซ้อนกับคิว 370px, แถบ KPI ตัวเลขลอย และลำดับ component สลับกัน โดยทำการ:
  1. ลบ 240px Fixed Black Sidebar และ Light Topbar ออกทั้งหมด
  2. แทนที่ด้วย Authentic Navy Header (`header.aiva-header`, #0D274D, 56px) พร้อมโลโก้ AI สีเขียว, ลิงก์ Nav 4 หน้า, Role Badge "เจ้าหน้าที่บัญชี" และ User Workspace Pill ตาม Mockup v4.4
  3. ปรับลำดับหน้า Queue: วาง `.scope` ด้านบนสุด, ตามด้วย `.kpis` 6 กล่องที่มีสไตล์และสีขอบตรงตาม Mockup v4.4, ตามด้วย `.wrap` (คิว 370px ด้านซ้าย, Document Workspace ด้านขวา)
  4. ปรับ CSS ครบทุกองค์ประกอบ (`mockup-parity.css`) ให้มีความกลมกลืนระดับพรีเมียม สบายตา ไม่มีขยะหรือความซ้ำซ้อน
  5. รองรับ Mobile Viewport (390px) แบบ 0 Horizontal Overflow และคงความถูกต้องของ Playwright E2E 6/6 และ Backend 15/15 tests

## Plan
- [x] ลบแถบดำด้านซ้าย 240px (`aside.sidebar`) และ light topbar ใน `AppShell.tsx`
- [x] สร้าง `header.aiva-header` (#0D274D) พร้อมโลโก้, เมนูนำทาง (`คิวตรวจสอบ`, `สิทธิ์และการเข้าถึง`, `บันทึกการเข้าถึง`, `เชื่อมต่อ API`), Role badge และ status pill ตาม Mockup v4.4
- [x] ปรับลำดับใน `QueuePage.tsx`: วางแถบขอบเขต `.scope` ด้านบน, ตามด้วย `.kpis` 6 ใบ, และ `.wrap` คิว 370px คู่กับ Document Workspace
- [x] เติม CSS ของ `header.aiva-header`, `.scope`, `.kpis`, `.wrap`, `.panel.queue-sidebar`, `.doc`, `.dh`, `.flow`, `.tabs`, `.pane`, `.ex`, `.ev`, `.bar` ใน `mockup-parity.css`
- [x] ทดสอบและยืนยัน: TypeScript strict build ผ่าน, Backend unittests 15/15 ผ่าน, Playwright E2E tests 6/6 ผ่าน (รวม mobile 390px)
- [x] อัปเดต canonical records (task-plan, current-state, changelog, work-log, session file)

## Acceptance criteria
- ลบ sidebar สีดำเดิมทิ้ง ทำให้ไม่มีแถบซ้อนสองชั้นอีกต่อไป (ผ่านการตรวจสอบ)
- ส่วนหัวเป็น Header สี Navy เข้ม (#0D274D) พร้อมเมนูครบถ้วนตาม Mockup v4.4 (ผ่านการตรวจสอบ)
- แถบ Scope และ KPI 6 กล่องวางเรียงสวยงาม ตัวเลขชัดเจน ไม่ลอย (ผ่านการตรวจสอบ)
- คิว 370px อยู่ซ้ายมือ เปิดดูเอกสารด้านขวามือได้ทันที สะอาด สบายตา ตรงตาม Mockup v4.4 (ผ่านการตรวจสอบ)
- รองรับ Mobile (390px) ไม่มี horizontal overflow และ Playwright E2E 6/6 ผ่าน 100% (ผ่านการตรวจสอบ)

## Result
- **โครงสร้าง Shell และ Header ใหม่**:
  - เปลี่ยนจาก Sidebar สีดำ 240px มาเป็น Full-width Layout พร้อมแถบ Header Navy เข้ม `#0D274D` ความสูง 56px ที่มีโลโก้ AI สีเขียว, Navigation Bar 4 รายการ, Role Badge เจ้าหน้าที่บัญชี และ Environment Pill ตรงตามต้นแบบ `AIVA-Web-Portal-Mockup-v4.4-Release.html`
- **การจัดวางหน้ารายการ (Queue Page Layout)**:
  - เรียงลำดับถูกต้อง: แถบ Scope ด้านบนสุด (พร้อม Company Chips, View Toggles, และปุ่มนำเข้าเอกสาร) -> แถบ KPI Summary 6 ใบพร้อมตัวเลขสถิติและสีระบุสถานะ -> แถบ Master-Detail Workspace 2 ฝั่ง (ซ้าย: คิว 370px, ขวา: เอกสารและ PDF)
- **สไตล์และพื้นที่แสดงผล (Visual Excellence & Parity)**:
  - ขยายพื้นที่การอ่านเอกสารให้กว้างขวาง สบายตา ปราศจากความอึดอัด คมชัด และตรงตาม Palette สีของต้นแบบ v4.4 100%
- **การทดสอบความถูกต้อง**:
  - Frontend production build (`tsc -b && vite build`) สำเร็จสมบูรณ์ (5.3s)
  - Backend unittests ผ่าน 15/15 รายการ (4.0s)
  - Playwright E2E tests ผ่านครบ 6/6 รายการ (รวม Mobile 390px zero-overflow check) (15.4s)

## Previous Result
- ปรับ Document Workspace ให้ตรงกับ AIVA Web Portal Mockup v4.4 Release โดยตรง (คิว 370px, ส่วนหัว .dh, แถบสเต็ป .flow, แท็บ 5 แท็บ, Exception Cards .ex, แถบ Sticky Action Bar .bar)
- เพิ่ม explain/resubmit/rerun/return/reject/hold/confirm แบบ persistent โดยผลตรวจ snapshot ไม่ถูกแก้ไข

## Outside this task
- Entra user/company/receiver RBAC และ account mapping
- AP submission/post และการรัน OCR/Oracle จริง
- DMS signed sessions/watermark, PostgreSQL/Alembic production runtime
