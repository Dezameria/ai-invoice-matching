# Session: 2026-10-02-010-pure-mockup-v4-redesign

- **Timestamp**: `2026-10-02T12:15:00+07:00`
- **Task ID**: `TASK-20261002-010`
- **Title**: ปรับปรุงโครงสร้างระดับ Application Shell และ Header สู่รูปแบบ AIVA Web Portal Mockup v4.4 อย่างสมบูรณ์ 100% (แก้ไข UI เละเทะ)

## 1. Context & User Request
- ผู้ใช้แจ้ง: *"ตอนนี้ ui เละเทะมากจัดการแก้ไข"*
- สาเหตุรากเหง้า (Root Cause Analysis):
  1. ตัว Application ยังคงมีแถบ Sidebar สีดำ 240px (`aside.sidebar`) ทางซ้าย และแถบสีขาว `.topbar` ค้างอยู่จากการสร้างโครงโปรเจกต์เดิม
  2. เมื่อเพิ่ม Master-Detail 2-Column Split (`.wrap`) คิวด้านซ้าย 370px จึงไปชนและซ้อนกับ Sidebar 240px ทำให้หน้าจอทั้งหมดถูกบีบแคบลงอย่างรุนแรง
  3. แถบสรุป KPI Overview ถูกวางไว้ก่อนแถบ Scope และไม่มีการใส่ CSS Grid และสีกรอบสถานะ ทำให้ตัวเลขสถิติหลุดออกมาเป็นข้อความธรรมดาลอยอยู่บนจอ
  4. ผู้ใช้เปิด `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html` เทียบเคียงตลอดเวลา และต้องการให้โครงสร้างและการจัดวางตรงกับต้นแบบ v4.4 จริงๆ

## 2. Key Architecture & Design Changes
1. **Application Shell & Header Redesign (`AppShell.tsx`)**:
   - ลบ 240px Fixed Black Sidebar (`aside.sidebar`) และ Light Topbar ออกทั้งหมด ทำให้หน้าเว็บใช้ความกว้างหน้าจอเต็มพื้นที่ (Full-width) อย่างแท้จริง
   - นำเข้า Header สีกรมท่า Navy เข้ม `#0D274D` สูง 56px (`header.aiva-header`) ตาม Mockup v4.4:
     - โลโก้ AI สี่เหลี่ยมมนสีเขียวมรกต (`.logo i`), ชื่อแอป `AIVA Web Portal` พร้อมคำบรรยายรุ่น `v4.4 · RBAC + DMS · Standard v6.6`
     - เมนูนำทางแบบข้อความเรียบหรู 4 เมนู: `คิวตรวจสอบ`, `สิทธิ์และการเข้าถึง`, `บันทึกการเข้าถึง`, `เชื่อมต่อ API` (รองรับ active state และการคลิกของ Playwright E2E locators)
     - Spacer `.sp`
     - Badge บทบาทผู้ใช้ `.role` สีเขียวมรกต: `เจ้าหน้าที่บัญชี`
     - Pill สถานะสภาพแวดล้อม: `Local workspace`
2. **Page Flow & Layout Reordering (`QueuePage.tsx`)**:
   - เรียงลำดับจากบนลงล่างให้ถูกต้องตาม Mockup v4.4:
     1. แถบ Scope (`.scope`): `ขอบเขต: รายบริษัท`, Company Chips (`ทุกบริษัท`, `DEMO`), ปุ่มสลับมุมมอง (`[แยก 2 ฝั่ง] [ตารางสรุป]`), และปุ่ม `+ นำเข้าเอกสาร`
     2. แถบสรุป KPI Overview (`.kpis`): ตารางการ์ด 6 ใบพร้อมตัวเลขสถิติตัวหนาและสีกรอบระบุสถานะ (ทั้งหมด, Auto-pass, Review, Hold, Manual Review, ซ้ำ)
     3. แถบ Master-Detail Workspace (`.wrap`): คิวตรวจสอบ 370px ด้านซ้าย (พร้อมช่องค้นหาและรายการใบแจ้งหนี้แบบกะทัดรัด) คู่กับ Document Workspace ด้านขวา
3. **Comprehensive Native CSS Integration (`mockup-parity.css`)**:
   - ผสานชุดรูปแบบสีและคลาสต้นแบบ: `.aiva-header`, `.scope`, `.chip`, `.kpis`, `.kpi`, `.wrap`, `.panel.queue-sidebar`, `.srch`, `.q`, `.qi`, `.b`, `.s-*`, `.co`, `.code`, `.doc`, `.dh`, `.meta`, `.flow`, `.st`, `.tabs`, `.tab`, `.pane`, `.ex`, `.ev`, `.who`, `.bar`, `.hint`, และปุ่มดำเนินการ `.bp, .bt, .bg, .br, .bw`
   - เพิ่มการรองรับ Mobile Responsive อย่างเข้มงวด (< 900px, 390px):
     - ซ่อน Sidebar อัตโนมัติเมื่อเลือกเอกสารบนจอมือถือ
     - อนุญาตให้ Header Nav และ Verification Stepper เลื่อนแนวนอนแบบ overflow-x auto โดยไม่ดัน viewport
     - ยืนยัน zero horizontal overflow: `document.documentElement.scrollWidth <= innerWidth` บนหน้าจอกว้าง 390px

## 3. Files Modified
- [AppShell.tsx](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/invoice-web/frontend/src/components/layout/AppShell.tsx): ลบ black sidebar และ light topbar, เพิ่ม navy header v4.4
- [QueuePage.tsx](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/invoice-web/frontend/src/features/queue/QueuePage.tsx): จัดลำดับ `.scope` -> `.kpis` -> `.wrap` และปรับองค์ประกอบให้ตรงตาม Mockup v4.4
- [mockup-parity.css](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/invoice-web/frontend/src/styles/mockup-parity.css): บรรจุสไตล์ของ Mockup v4.4 ทั้งระบบพร้อม Mobile responsive constraints
- [DocumentDetail.tsx](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/invoice-web/frontend/src/features/documents/DocumentDetail.tsx): ปรับโครงสร้างส่วนหัว `.dh`, Metadata, Stepper `.flow` และแท็บให้กระชับ
- [SummaryTab.tsx](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/invoice-web/frontend/src/features/documents/tabs/SummaryTab.tsx): จัดการ Exception Cards `.ex` สะอาดตา ตัดความซ้ำซ้อน
- [ReviewActionPanel.tsx](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/invoice-web/frontend/src/features/documents/ReviewActionPanel.tsx): จัดรูปแบบเป็นแถบ Sticky Action Bar `.bar` พร้อม `.hint` และปุ่ม action
- Canonical Records: [task-plan.md](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/agent/task-plan.md), [current-state.md](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/agent/current-state.md), [changelog.md](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/agent/changelog.md), [work-log.md](file:///c:/Users/aapico.intern07/Documents/invoice/ai-invoice-matching/agent/work-log.md)

## 4. Verification Results
- **Frontend Production Build**: `tsc -b && vite build` สำเร็จ 100% (5.3s)
- **Backend Unittests**: `python -m unittest discover -s tests -p "test_*.py"` ผ่าน 15/15 รายการ (4.0s)
- **Playwright E2E Tests**: `npx playwright test` ผ่านครบทั้ง 6 รายการ (15.4s) บน Edge browser:
  1. `audit page displays log entries and filters by action`
  2. `review action updates status and queues outbox item`
  3. `loads receiving portal and selects invoice` (รวม deep link & revision history)
  4. `access page shows permissions and integration status`
  5. `rejects invalid json payload gracefully`
  6. `mobile viewport keeps navigation accessible and preserves exact decimal amounts` (ทดสอบที่ viewport 390px x 844px ผ่าน 0 overflow)
- **Visual Inspection**: ยืนยันผ่านภาพถ่ายหน้าจอ `detail-desktop.png`, `queue-desktop.png`, `detail-mobile.png` โครงสร้างสวยงาม สะอาดตา ตรงตาม Mockup v4.4 อย่างแท้จริง
