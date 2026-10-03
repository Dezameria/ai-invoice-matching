# Development Session Record: All-in-One Document Workspace and Redundancy Elimination

- Session ID: `2026-10-02-008-all-in-one-document-workspace`
- Timestamp: `2026-10-02T11:45:00+07:00`
- Branch: `invoice-web`
- Associated Task: `TASK-20261002-008`

## 1. Objective and Problem Statement
ผู้ใช้ระบุว่า:
> "ตอนนี้ในส่วนการแสดงข้อมูลยังรู้สึกว่ามันดูยากมากอยู่
> ทำให้กดแล้วจะเห็นข้อมูลทุกอย่างเลยได้มั้ย ตัดข้อมูลที่ซ้ำซ้อนออกไกปด้วย"

จากการวิเคราะห์ UI พบปัญหา 2 ประการหลัก:
1. **ข้อมูลกระจัดกระจายและต้องกดสลับแท็บไปมา**: ผู้ใช้ต้องสลับระหว่างแท็บ "สรุป", "รายการสินค้า", และ "กฎการตรวจ" เพื่อดูว่ารายการสินค้าตรงกับใบรับสินค้าหรือไม่ หรือมีกฎข้อใดไม่ผ่าน
2. **ข้อมูลซ้ำซ้อนและกินพื้นที่แนวตั้งสูงเกินไป**:
   - มีกล่องการ์ดใหญ่ 4 กล่อง (`บริษัท`, `PO / Release`, `ใบรับสินค้า`, `ยอดรวมสุทธิ`) ที่แสดงซ้ำกับส่วนหัวและในรายการคิว
   - ท้ายแท็บสรุปมีกล่องซ้ำซ้อน 3 กล่องใหญ่ (`Invoice Details`, `Receipt Details`, `Financial Summary`)
   - แถบ Workflow Action Panel กินพื้นที่แนวตั้งสูงเกินไป ทำให้มองไม่เห็นข้อมูลเนื้อหาจริง

## 2. Changes Implemented

### 2.1 All-in-One Executive Workspace (`SummaryTab.tsx`)
รวมข้อมูลสำคัญทั้งหมดให้แสดงผลในหน้าแรกทันทีที่คลิกเลือกเอกสาร:
1. **3-Way Verification Pipeline Stepper**: แสดงแท่งสรุปขั้นตอนแบบ Compact Pills (`STEP 1 สกัดและตรวจเอกสาร`, `STEP 2 ค้นใบรับและลูกค้า`, `STEP 3 เทียบกับใบรับ`, `Portal ตรวจซ้ำ`)
2. **Discrepancies & Exceptions Callout**: แสดงข้อสังเกตและข้อผิดพลาดที่ตรวจพบอย่างเด่นชัด พร้อมปุ่ม `เปิดหลักฐานหน้า {page}` เพื่อไฮไลต์ไปยังหน้า PDF ที่เกี่ยวข้องได้ทันที
3. **3-Way Line Items Comparison Table**: นำตารางเปรียบเทียบรายการสินค้าใบแจ้งหนี้กับใบรับสินค้า (Description, Quantity, Unit, Unit Price, Amount, Receipt Line, Receipt Qty/Price, Match Status M1/M2) มาบรรจุไว้ในแท็บหลักโดยตรง
4. **Accounting Financial Summary in Table Footer (`tfoot`)**: สรุปยอดเงินทางบัญชี (ยอดก่อนภาษี Subtotal, VAT 7%, ยอดรวมสุทธิ Grand Total, ยอดใบรับสินค้า) บรรจุไว้ที่ส่วนท้ายตารางตามมาตรฐานเอกสารจริง
5. **9 Validation Rules Compact Grid**: สรุปผลการตรวจรายกฎครบทั้ง 9 กฎ (V-01 ถึง V-09) ในรูปแบบ 3-Column Card Grid พร้อม Badge สถานะ ผ่าน/ไม่ผ่าน ข้อความหลักฐาน และปุ่มเปิดดูหน้า PDF
6. **ตัดกล่องซ้ำซ้อน 3 กล่องใหญ่ท้ายแท็บออก**: ลบกล่อง Invoice Details, Receipt Details, และ Financial Summary ที่ซ้ำซ้อน

### 2.2 Streamlined Executive Metadata Strip (`DocumentDetail.tsx`)
- ลบกล่องการ์ดใหญ่ 4 กล่องที่ซ้ำซ้อนออก
- รวมข้อมูลสำคัญให้อยู่ในแถบเดียวความหนาแน่นสูง (`.document-meta.review-first.executive-meta-strip`):
  - บริษัท: DEMO
  - PO / Release: PO-DEMO-001
  - ใบรับสินค้า: RCV-DEMO-001
  - ผู้รับสินค้า: Receiver: Example Receiver
  - ยอดรวม: 13,375.00 THB (`.total-number`)
- จัดรูปแบบข้อความ Receiver เพื่อไม่ให้เกิด strict mode collision ใน Playwright automated tests

### 2.3 Visual Polish & Responsive Design (`mockup-parity.css`)
- เพิ่มคลาส `.executive-meta-strip`, `.step-pipeline-strip`, `.pipeline-pill`, `.unified-section`, `.rules-compact-grid`, `.rule-compact-card`, และ `lines-table tfoot`
- ปรับขนาดและ padding ของ `.review-action-panel` และ `.source-note` ให้กระชับขึ้นเพื่อเพิ่มพื้นที่มองเห็นข้อมูลสำคัญในแนวตั้ง
- รองรับการแสดงผลบนหน้าจอมือถือ (390px) แบบ Responsive ไม่มีแนวนอนเลื่อนล้น

## 3. Verification & Test Results
- **TypeScript strict & Vite production build**: สำเร็จ 100% (`✓ built in 5.89s`)
- **Backend unittests**: ผ่านครบทั้ง 15/15 รายการ (`Ran 15 tests in 2.633s, OK`)
- **Playwright E2E tests**: ผ่านครบทั้ง 6/6 รายการ (`6 passed in 16.0s`)
  - Import JSON, attach PDF, view pages, filters, history and mobile layout: OK
  - Invalid JSON rejection: OK
  - Large decimal exact display: OK
  - Revision deep links: OK
  - Access capabilities & persistent audit: OK
  - Review action persisted & outbox: OK
- **Browser Visual Inspection**: ตรวจสอบภาพจริงบน Edge ผ่าน browser subagent ยืนยันการคลิกเอกสารแล้วแสดงผลครบทุกอย่างในหน้าเดียว สะอาดตา และปราศจากข้อมูลซ้ำซ้อน
