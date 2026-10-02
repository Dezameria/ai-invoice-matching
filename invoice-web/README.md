# AIVA — Invoice Receiving Portal

React/TypeScript portal สำหรับ **รับข้อมูลที่ประมวลผลแล้วจากระบบอื่น** ค้นหา อ่านผลตรวจ และเปิด PDF เทียบกัน พัฒนาจาก mockup v4.4 โดยปรับเป็น sidebar, searchable queue, detail tabs และ PDF pane ที่ย่อขยายตามหน้าจอ

## ทำอะไรได้แล้ว

- รับ JSON ผ่าน API หรือวางข้อความ/เลือกไฟล์ในหน้าเว็บ พร้อม validation ที่บอกชื่อ field
- เก็บเอกสาร ประวัติ JSON และ PDF แยกตาม revision ใน SQLite/พื้นที่ไฟล์; เปิดโปรแกรมใหม่แล้วข้อมูลยังอยู่
- ป้องกัน event ซ้ำและ revision เก่าเขียนทับ; เก็บ immutable JSON แต่ละ revision
- ค้น invoice/PO/vendor/external ID, กรองบริษัท/ต้นทาง/สถานะ, KPI และ pagination
- อ่าน summary, line items, rules, source metadata, JSON export และ history พร้อมสลับ revision หรือเปิดลิงก์ตรงไปยังรุ่นย้อนหลัง
- แสดง receipt, ORG_ID, Receiver และ STEP ของกฎตาม mockup เมื่อระบบต้นทางส่งข้อมูลมา
- แนบ PDF จริงผ่าน API/หน้าเว็บ เปิดด้วย PDF.js, เปลี่ยนหน้า, ซูม, ดาวน์โหลด และเปิดหน้าหลักฐาน
- เก็บ PDF แต่ละ revision แยกกันและแจ้งเตือนเมื่อรุ่นล่าสุดยังใช้ PDF รุ่นเก่า; ไม่ดาวน์โหลด URL ภายนอกเอง
- หน้า capability/access และ persistent audit สำหรับค้นหา/กรองเหตุการณ์รับข้อมูลและ PDF
- Workflow แยกจากผลตรวจต้นทาง พร้อมชี้แจง ส่งตรวจซ้ำ สั่งตรวจซ้ำ ส่งกลับ ปฏิเสธ พัก และยืนยัน โดยบังคับเหตุผล/version/idempotency ที่ backend
- Action outbox ให้ระบบต้นทางรับ resubmit/rerun ไปทำงาน; หน้าเว็บรอ revision ใหม่โดยไม่แก้ผลตรวจเดิม
- ตัวแปลง core Table9 จาก OCR service เดิมแบบ explicit โดยรักษา version/code เดิม
- Local mode หรือ shared API keys แยก Portal กับ integration

Portal บันทึกการยืนยันเป็น workflow decision แต่ยังไม่มีคำสั่ง OCR, matching หรือส่ง AP โดยตรง การตรวจซ้ำเกิดขึ้นเมื่อระบบต้นทางอ่าน outbox และส่ง snapshot revision ใหม่กลับมา

## เริ่มใช้งานในเครื่อง (PowerShell)

ต้องมี Node.js ที่ Vite รองรับ และ Python; ทดสอบรอบนี้ด้วย Node 26.4.0 / Python 3.14.6 บน Windows ใช้ virtual environment แยกจาก OCR service

จาก `invoice-web`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Set-Location frontend
npm ci
npm run build
Set-Location ..
.\run-local.ps1
```

เปิด [Portal](http://127.0.0.1:8010) และ [Swagger API](http://127.0.0.1:8010/api/docs) Frontend bundle เสิร์ฟจาก FastAPI ใน origin เดียว หากสร้าง `dist` หลังเปิด backend ให้ restart backend

สำหรับพัฒนา frontend ใช้ `npm run dev` ใน `frontend` แล้วเปิดพอร์ต 5173; Vite proxy `/api` ไป 8010 เก็บ backend ทำงานไว้อีก terminal

ไม่มีข้อมูลตัวอย่างใส่ DB โดยอัตโนมัติ กด **นำเข้าเอกสาร → ใช้ตัวอย่าง** หรือเลือก [invoice.json](examples/invoice.json) พร้อม [invoice.pdf](examples/invoice.pdf) ซึ่งเป็นข้อมูลสังเคราะห์สองหน้า

## เชื่อมต่อจากระบบอื่น

อ่าน [API guide และ contract](docs/04-receiving-api.md) และ [สถานะ implementation](docs/05-implementation-status.md)

1. ส่ง `POST /api/portal/v1/ingest` ด้วย canonical snapshot JSON
2. รับ Portal `id` แล้วส่ง `POST /api/portal/v1/documents/{id}/pdf?revision=1` ด้วย multipart field `file`
3. เปิดเอกสารใน Portal หรือใช้ read API
4. ระบบต้นทางอ่าน `GET /action-requests` และตอบรับผ่าน `/action-requests/{id}/ack`; ผลตรวจรอบใหม่ส่งกลับด้วย `/ingest` revision ที่สูงขึ้น

กรณี core Table9 จาก OCR เดิม:

```powershell
Set-Location backend
..\.venv\Scripts\python.exe convert_table9.py input-table9.json output-portal.json --source-system OCR --external-id DOC-EXAMPLE --event-id DOC-EXAMPLE-r1 --company DEMO
```

ตัวแปลงไม่เรียก network ไม่แก้ source และไม่แต่งข้อมูล receipt/line matching ที่ไม่มี; ตรวจ assumption THB และ company ก่อนใช้งานจริง ไม่รองรับ `/fe` projection ที่สร้างเลขใบรับทดแทน

## Data / configuration

`data/portal.sqlite3` เก็บ JSON/history; `data/pdf/` เก็บ PDF ด้วย hash ของเนื้อหา ทั้งหมดถูก ignore จาก Git ควร backup DB และ PDF คู่กันขณะหยุด local server

`.env.example` แสดงชื่อตัวแปร แต่แอปไม่โหลด `.env` เอง ให้ตั้ง `$env:PORTAL_API_KEY` และ `$env:PORTAL_INGEST_KEY` ใน process environment เมื่อต้องการ shared-key access โดยใช้ค่าที่สร้างและเก็บใน secret store ขององค์กร ห้ามใส่ key ใน bundle/URL/Git

**ขอบเขตการใช้งาน:** รุ่นนี้เป็น local/integration pilot ยังไม่มี Entra login หรือ RBAC รายบุคคล/บริษัท Portal key เป็นสิทธิ์ทั้ง workspace รวม manual import/PDF ไม่ควรเปิด keyless mode ผ่าน reverse proxy ไปให้ผู้ใช้ภายนอก เพราะ proxy ทำให้ request ดูเหมือนมาจาก loopback `PORTAL_ENV` ที่ไม่ใช่ development บังคับมีทั้งสอง key แต่ไม่ได้ทำให้รุ่นนี้พร้อม production โดยอัตโนมัติ

## ทดสอบ

จาก `invoice-web`:

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
Set-Location ../frontend
npm run build
npm run test:e2e
```

Browser tests ใช้ Microsoft Edge ที่ติดตั้งอยู่ และเปิด backend แยกพอร์ต 8011 พร้อมข้อมูลใน `data/browser-tests` ไม่ใช้ DB ปกติ ถ้า Python อยู่ใน venv ให้เปิดใช้ venv ก่อนรัน browser tests (`.\.venv\Scripts\Activate.ps1`) หรือให้ `python` ใน PATH มี backend dependencies

รายละเอียดผลทดสอบและสิ่งที่ยังไม่ทำอยู่ใน [implementation status](docs/05-implementation-status.md)

## โครงสร้างสำหรับนักพัฒนา

Frontend แยกตาม feature และ backend เป็น modular monolith โดย `main.py` ใช้ประกอบระบบเท่านั้น อ่านแผนผัง dependency และตำแหน่งเพิ่มงานแต่ละประเภทที่ [โครงสร้างโปรเจกต์สำหรับพัฒนาต่อ](docs/06-project-structure.md)
