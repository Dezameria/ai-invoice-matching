# SESSION-20261002-006 — Normalize and redesign UI for executive clarity

- Started: `2026-10-02T10:16:08+07:00`
- Completed: `2026-10-02T10:42:00+07:00`
- Task: `TASK-20261002-006`
- Status: completed

## User direction
ทำการจัด UI ทั้งหมดให้ดูง่ายกว่านี้ normalize ตัวของ UI ให้มันดูแล้วเห็นเป็นภาพรวมเลย เอาให้เข้าใจข้อมูลที่สุด

## Analysis and decision
- วิเคราะห์ UI เดิมพบว่าตัวกรองในหน้ารายการ (Queue) แยกเป็นหลายแถวซ้ำซ้อน และยังขาด Executive Summary Card ที่สรุปผลแบบคลิกเดียวได้
- ในหน้ารายละเอียดเอกสาร (Detail) ข้อมูลกระจายตัว ต้องเลื่อนหน้าหาข้อมูลความสัมพันธ์ของ 3-Way Match (ใบแจ้งหนี้, ใบสั่งซื้อ PO, ใบรับของ Goods Receipt)
- จึงตัดสินใจ Normalize โครงสร้าง UI ทั้งหมด:
  1. หน้า Queue: นำ KPI Metrics มาจัดเป็น 4 Interactive Cards สรุปตัวเลขพร้อมคลิกกรองสถานะได้ทันที, รวม Search และ Selectors เป็น Consolidated Single Control Toolbar ชิ้นเดียว
  2. หน้า Document Detail: เพิ่ม Executive 3-Way Match Snapshot Card แสดง 4 องค์ประกอบหลัก (คู่ค้า, PO/Release, Goods Receipt, ยอดรวมเงิน) ในระดับบนสุดของหน้า, พร้อม Provenance Bar แสดงระบบต้นทางและ Revision
  3. 3-Step Verification Pipeline Stepper: แสดงขั้นตอนการตรวจสอบ (ตรวจเอกสาร -> ค้นหาใบรับ -> เทียบรายการ) ให้เข้าใจลำดับขั้นตอนทันที
  4. Discrepancy Callout Hub: รวมจุดที่ไม่ตรง (เช่น ราคาสินค้า, ยอดเงิน) พร้อมปุ่ม 1-click jump ไปยังหน้าหลักฐานในไฟล์ PDF ทันที
  5. Detail Tabs: ปรับปรุงตารางเปรียบเทียบรายการสินค้า M1/M2 พร้อมตัวเลข tabular ชัดเจน, กฎการตรวจ 9 ข้อพร้อม STEP 1-3 และ Error Code Chips
  6. Design System: ยกระดับ Typography (Inter, Noto Sans Thai), โทนสี HSL, Card Elevation, และ Responsive Design ป้องกัน horizontal overflow บน mobile 390px

## Delivered
- `invoice-web/frontend/src/features/queue/QueuePage.tsx`: Interactive KPI strip, Consolidated control toolbar, High-contrast table with context chips
- `invoice-web/frontend/src/features/documents/DocumentDetail.tsx`: Executive 3-Way Match Snapshot card, Provenance Bar, Modern Tab Navigation
- `invoice-web/frontend/src/features/documents/ReviewActionPanel.tsx`: Modernized Decision Hub banner, Action guidance container, Modal dialog with proper ARIA accessibility
- `invoice-web/frontend/src/features/documents/tabs/`:
  - `SummaryTab.tsx`: 3-Step verification pipeline stepper, High-visibility discrepancy callouts, Direct PDF jump buttons
  - `LinesTab.tsx`: 3-Way match line items comparison table with M1/M2 badges and tabular alignment
  - `RulesTab.tsx`: Structured rule cards, STEP badges, Rule ID pills, and severity tags
  - `HistoryTab.tsx`: Modern activity timeline with date chips
  - `SourceTab.tsx`: Provenance and revision switcher cards
- Stylesheets updated in `src/styles/`: `global.css`, `mockup-parity.css`, `revisions.css`
- Verified backward compatibility with all existing Playwright and Backend automated test locators

## Verification
- Backend unittest: 15 passed (`python -m unittest discover -s tests -p "test_*.py"`)
- Frontend TypeScript & Vite production build: passed (`npm run build`)
- Playwright on Edge: 6 passed (17.4s) ครอบคลุม import, PDF canvas viewer, tabs, mobile 390px no-overflow, precision, revision deep link, access/audit, and review actions outbox
- Visual inspection via browser subagent: บันทึกภาพ Screenshot ตรวจสอบความถูกต้องของ Queue, Detail, Line Items, Rules, Actions บน Desktop และ Mobile เรียบร้อย
- Local preview running on `http://127.0.0.1:8010`

## Remaining boundary
ระบบยังคงเป็น Portal สำหรับรับผลตรวจ (Receiving & Review Portal) ที่ไม่รัน OCR หรือจำลอง AP post ภายใน client ตามขอบเขตสถาปัตยกรรมเดิม
