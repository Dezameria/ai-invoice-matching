# Task และ Plan

Last updated: `2026-10-03T08:33:34+07:00`

## Concurrent Task
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

## Active Task
- Task ID: `TASK-20261003-001`
- Title: พัฒนา Modern Frontend V2 ในโฟลเดอร์ Web portal/invoice-webV2
- Status: `in_progress`
- Goal: สร้าง Frontend ใหม่ด้วย React 19 + TypeScript + Vite ในโฟลเดอร์ Web portal/invoice-webV2 ตามสถาปัตยกรรม V2 ที่พรีเมียม สบายตา โมเดิร์น รองรับการทำงานแบบ Standalone (Mock data สมบูรณ์) พร้อมวางโครงสร้างโมดูลที่สะอาดเพื่อเชื่อมต่อ Real API และต่อยอดได้ง่าย
- Plan:
  - [x] Initialized Vite React + TypeScript ใน `Web portal/invoice-webV2`
  - [x] ติดตั้ง dependencies พื้นฐานและ `lucide-react`
  - [ ] วางโครงสร้างสถาปัตยกรรม (Architecture & Type Definitions & API Client boundary)
  - [ ] จัดทำ Realistic Mock Data ครบถ้วน (Invoice summary, PO, GRN lines, 3-way matching, exceptions, rules, revisions, audit trail)
  - [ ] สร้าง Premium Design System (CSS tokens, Glassmorphism/Modern card styles, typography, micro-animations, responsive layout)
  - [ ] สร้าง Core Components & Features:
    - Navigation Header (Logo, Nav items, Status indicator, User role)
    - Scope Bar (Company filter chips, View switcher, Document import trigger)
    - KPI Metrics Dashboard (Interactive filter cards with status counters)
    - Master Document Queue (Search, multi-criteria filters, sorting, status badges)
    - Detailed Document Inspector:
      - Document Header & Metadata bar
      - Rule Flow Progress Stepper (Step 1-4)
      - 5 Dynamic Tabs: Exceptions & Summary, 3-Way Match Line Items, Rules Evaluation, History & Audit, Raw JSON Inspector
      - Side-by-side Document Viewer with interactive page jumping & evidence highlighting
      - Sticky Action Bar (Confirm, Explain, Resubmit, Reject, Hold) with confirmation modals
    - Document Import Modal (Drag & drop simulated upload with validation)
  - [ ] ทดสอบ TypeScript build (`npm run build`)
  - [ ] ทดสอบการเปิดดูและโต้ตอบด้วย Browser Subagent / Playwright
  - [ ] บันทึก Canonical Records ตาม Agent Operating Protocol

## Previous Tasks
- Task ID: `TASK-20261002-010`
- Title: ปรับปรุงโครงสร้างหลักของ Web Portal สู่ต้นแบบ AIVA Mockup v4.4 อย่างสมบูรณ์ 100% (แก้ไข UI เละเทะ)
- Status: `completed`

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
