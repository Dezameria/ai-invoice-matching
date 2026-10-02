# SESSION-20261002-007 — Master-Detail split layout matching Mockup v4.4

- Started: `2026-10-02T10:54:27+07:00`
- Completed: `2026-10-02T11:03:00+07:00`
- Task: `TASK-20261002-007`
- Status: completed

## User direction
ทีนี้อยากให้ปรับตัวของ UI ให้หน่อย อยากให้ฟีลๆนี้เหมือนใน AIVA-Web-Portal-Mockup-v4.4-Release.html ที่ตัวของที่กดดูข้อมูลจะกดดูได้ข้างๆ และพอกดก็จะแสดงขึ้นมาเลยที่ด้านขวา ให้ดูง่ายๆ (พร้อมแนบภาพต้นแบบ Master-Detail 2 คอลัมน์)

## Analysis and decision
- ผู้ใช้ต้องการให้โครงสร้างการดูข้อมูลเหมือนกับ Mockup v4.4:
  - ด้านซ้ายมีแผงรายการคิวเอกสาร (Queue List) พร้อมช่องค้นหา และรายละเอียดสรุปของการ์ดแต่ละใบ
  - ด้านขวาเป็นแผงแสดงผลเอกสารที่เลือกทันที (Document Workspace) โดยไม่ต้องกดสลับหน้าไปมา
- ปรับโครงสร้างใน `App.tsx` และ `QueuePage.tsx` ให้เป็น Master-Detail 2-Column Split View (`.wrap` = `370px 1fr`):
  1. ด้านบนมีแถบ KPI Cards 6 สถานะ (ทั้งหมด, Auto-pass, Review, Hold, Manual Review, ซ้ำ) และ Scope Bar พร้อม Company Chips
  2. แถบด้านซ้าย (`.queue-sidebar`): แสดงหัวข้อคิว, จำนวนฉบับ, ช่องค้นหา (`aria-label="ค้นหาเอกสาร"`), และรายการเอกสาร (`.qi`) ที่มีปุ่มเลขที่ใบแจ้งหนี้, ชื่อผู้ขาย, PO, Receiver, รหัสข้อผิดพลาด และยอดเงิน
  3. แถบด้านขวา (`.detail-pane`): แสดง `DocumentDetail` ทันทีเมื่อมีการเลือกเอกสาร หรือแสดงหน้าแนะนำ "เลือกเอกสารจากคิว" เมื่อยังไม่มีการเลือก
  4. เพิ่มตัวเลือกสลับมุมมองระหว่าง "แยก 2 ฝั่ง (Master-Detail)" และ "ตารางสรุป (Table View)"
  5. รองรับ Responsive: บนหน้าจอขนาดเล็ก (< 1024px) จะแสดงแถบรายการเมื่อยังไม่ได้เลือก และสลับไปแสดงหน้ารายละเอียดพร้อมปุ่ม "กลับไปเอกสารทั้งหมด" เมื่อเลือกเอกสารแล้ว เพื่อป้องกัน horizontal overflow (ทดสอบแล้วบน 390px)

## Delivered
- `invoice-web/frontend/src/app/App.tsx`: เชื่อมต่อ routing และส่งผ่าน `selectedId`, `revision`, `onBack`, `onRevision` ไปยัง `QueuePage`
- `invoice-web/frontend/src/features/queue/QueuePage.tsx`: ปรับใช้ Master-Detail Split Layout พร้อมรองรับ Table View สลับได้
- `invoice-web/frontend/src/styles/mockup-parity.css`: เพิ่มสไตล์ `.kpis`, `.kpi`, `.scope`, `.chip`, `.wrap`, `.panel.queue-sidebar`, `.ph`, `.srch`, `.q`, `.qi`, `.detail-pane` และ responsive media queries

## Verification
- Backend unittest: 15 passed (`python -m unittest discover -s tests -p "test_*.py"`)
- Frontend TypeScript & Vite production build: passed (`npm run build`)
- Playwright on Edge: 6 passed (18.9s) ครอบคลุม import, PDF canvas viewer, tabs, mobile layout (390px), precision, revision deep link, access/audit, and review actions outbox
- Visual inspection via browser subagent: ตรวจสอบภาพจริงบน `http://127.0.0.1:8010` ยืนยันว่าคลิกเลือกเอกสารด้านซ้ายแล้วข้อมูลแสดงผลที่ด้านขวาทันทีอย่างถูกต้อง

## Remaining boundary
ยังคงรักษาขอบเขต Portal เป็นตัวรับผลตรวจและอำนวยความสะดวกในการตรวจทาน ไม่มีการรัน OCR หรือ AP posting ภายใน Portal
