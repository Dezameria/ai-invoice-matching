# Session: 2026-10-02-009-mockup-v4-native-parity

- **Timestamp**: `2026-10-02T12:05:00+07:00`
- **Task ID**: `TASK-20261002-009`
- **Title**: ปรับ Document Workspace ให้ตรงกับ AIVA Web Portal Mockup v4.4 Release โดยตรง

## 1. Context & User Request
- ผู้ใช้แจ้ง: *"ย้อนเลยหนักกว่าเดิมอีก เอาให้คล้ายกับ C:\Users\aapico.intern07\Documents\invoice\ai-invoice-matching\Web portal\AIVA-Web-Portal-Mockup-v4.4-Release.html ไปเลย"*
- สืบเนื่องจากรอบก่อนหน้าที่พยายามรวมทุกตารางและรายการกฎลงในหน้าเดียว ทำให้หน้าจอยาวกว่า 2,000px และดูอึดอัดเทอะทะ
- ผู้ใช้ต้องการย้อนกลับสู่โครงสร้าง UI ตามต้นแบบ `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html` ซึ่งมีความโปร่ง สะอาดตา แยกสัดส่วนชัดเจน และเปิดดูข้อมูลจากแถบข้างๆ ได้ทันที

## 2. Key Architecture & Design Changes
1. **Master-Detail 2-Column Split Layout (`.wrap`)**:
   - แถบด้านซ้าย (`.panel.queue-sidebar` กว้าง 370px, sticky): รายการคิวเอกสารพร้อมช่องค้นหา (`ค้นหาเลขที่ใบแจ้งหนี้ / PO / ผู้ขาย`), จำนวนเอกสาร, และรายการเอกสารแต่ละใบ (`.qi`) ที่คลิกเลือกเพื่อดูทางขวาทันที
   - แถบด้านขวา (`.detail-pane`): กล่องเอกสารที่เลือก (`.doc`) และตัวอ่าน PDF Viewer แบบคู่ขนาน
2. **Document Header (`.dh`) & Compact Metadata (`.meta.document-meta`)**:
   - บรรทัดบน: เลขที่ใบแจ้งหนี้, Badge สถานะ, แท็กบริษัท (`.co`), ปุ่มแนบ PDF, ปุ่ม `📄 เปิด/ซ่อน PDF`
   - แถว Metadata: แสดง ผู้ขาย, PO, Release, ใบรับ, ORG_ID, Receiver, ยอดรวม `.total-number`, รอบตรวจ
3. **Verification Pipeline Stepper (`.flow`)**:
   - แสดง 4 สเต็ป (`.st.ok / .st.warn / .st.bad / .st.skip`): STEP 1 สกัดและตรวจเอกสาร, STEP 2 ค้นใบรับและลูกค้า, STEP 3 เทียบกับใบรับ, และ Portal ตรวจซ้ำ
4. **Clean Tabs (`.tabs` & `.tab.on`)**:
   - 5 หมวดหมู่หลัก: `สรุปและดำเนินการ`, `รายการสินค้า`, `กฎการตรวจ`, `ประวัติ`, `ข้อมูลเพิ่มเติม`
   - แท็บ "สรุปและดำเนินการ": คืนความสะอาด โดยแสดงเฉพาะข้อผิดพลาดและข้อสังเกต (`.ex.High / .ex.Medium`) พร้อมรหัส Exception Code, ผู้รับผิดชอบ (`.who`), กฎที่เกี่ยวข้อง, หลักฐาน (`.ev`) และปุ่มเปิดดูหน้า PDF ทันที ไม่ยัดตารางหรือการ์ดซ้ำซ้อน
   - แท็บ "รายการสินค้า": ตาราง 3-Way Match และการ์ดเปรียบเทียบยอดรวม V-03 กับ V-09 (`.grid2 .card .kv`)
5. **Sticky Action Bar (`.bar`)**:
   - แสดงคำอธิบายสถานะและผู้รับผิดชอบ (`.hint`) พร้อมปุ่ม Action ตามบทบาทและสถานะ (`.bp, .bt, .bg, .br, .bw`) พร้อม Modal สำหรับระบุเหตุผล/หมายเหตุ
6. **Mobile Responsive (390px)**:
   - ซ่อนคิวด้านซ้ายอัตโนมัติเมื่อเลือกเอกสารแล้วบนจอขนาดเล็ก ทำให้ไม่มี horizontal overflow (0 overflow)

## 3. Files Modified
- `invoice-web/frontend/src/features/documents/DocumentDetail.tsx`: ปรับโครงสร้าง JSX ให้ตรงตาม `.doc`, `.dh`, `.flow`, `.tabs`, `.pane.on`, `.bar` และจัดการ props ของแต่ละแท็บ
- `invoice-web/frontend/src/features/documents/tabs/SummaryTab.tsx`: คืนรูปแบบ Exception Cards (`.ex`) และตัดตารางซ้ำซ้อนออก
- `invoice-web/frontend/src/features/documents/ReviewActionPanel.tsx`: ปรับสไตล์เป็นแถบ `.bar` ด้านล่าง
- `invoice-web/frontend/src/styles/mockup-parity.css`: เพิ่มเลย์เอาต์ `.wrap`, `.panel.queue-sidebar`, `.q`, และ responsive rules
- Canonical Records: `agent/task-plan.md`, `agent/current-state.md`, `agent/changelog.md`, `agent/work-log.md`

## 4. Verification Results
- **TypeScript & Vite Build**: `tsc -b && vite build` สำเร็จ 100% (built in 5.2s)
- **Backend Unittests**: `python -m unittest discover -s tests -p "test_*.py"` ผ่าน 15/15 รายการ
- **Playwright E2E Tests**: `npx playwright test` ผ่านครบ 6/6 รายการ (รวม deep link, revision history, action outbox, mobile 390px layout)
- **Visual Inspection**: ยืนยันผ่านภาพถ่ายหน้าจอ `detail-desktop.png` พบว่าเลย์เอาต์ซ้าย-ขวาและการจัดวางองค์ประกอบตรงตาม Mockup v4.4 อย่างแท้จริง
