# Implementation status — Receiving Portal

อัปเดต 2026-10-02T10:07:32+07:00

## ขอบเขตที่ผู้ใช้ปรับ

ผู้ใช้ระบุว่าเว็บรับข้อมูลจากระบบอื่น ไม่ทำครบทุกกระบวนการ จึงเป็น **JSON receiver + persistent review workflow + PDF viewer** Portal เก็บการตัดสินใจและส่งคำขอผ่าน outbox แต่ไม่รัน OCR/Oracle/AP เอง

## Implemented

- React + TypeScript + Vite + TanStack Query; Sarabun self-hosted และ lucide icons
- แยก App, DocumentDetail, ImportDialog, Integration, PdfViewer และ API/types
- UI แบบ task-first: queue แสดงงานที่ต้องทำ; detail แสดง next action/ผู้รับผิดชอบก่อนผลตรวจและ PDF; รวมข้อมูลเทคนิคไว้ในแท็บข้อมูลเพิ่มเติม
- Responsive desktop/mobile และ PDF.js fit-to-width, zoom/page navigation/download/evidence page
- FastAPI + Pydantic request schema + SQLAlchemy/SQLite; document unique by source+external ID
- Ingest / manual import / search / current และ historical detail / revision index / immutable snapshots / activity history / schema APIs
- Idempotent events, conflicting/stale revision checks, atomic document+event+activity transaction
- PDF archive แยกตาม revision, limits/parser checks, protected read, hash storage, stale revision warning และ compatibility backfill จาก pilot DB เดิม
- Revision selector, historical banner และ deep link ที่คง revision หลัง reload; JSON และ PDF ย้อนหลังตรงรุ่นกัน
- Modular monolith structure ตาม architecture plan: frontend แยก app/features/components/api/styles/test; backend แยก api/auth/domain/db/integrations/storage และ app factory เหลือเฉพาะ composition
- Document tabs แยก component รายหน้าที่; API routes ไม่เขียน SQL/ไฟล์โดยตรง และ shared compatibility imports ยังรองรับ script/tests เดิม
- Mockup parity ฝั่ง read-only: company chips, receipt/ORG_ID/Receiver header, STEP ของ V-01–V-09, ownership/access tab และ warnings จากข้อมูลที่ได้รับจริง
- หน้า capability/access แสดง permissions ที่เปิดใช้จริงกับ production dependencies ที่ยังขาด โดยไม่จำลอง role switch
- Global audit API/page สำหรับ receive, PDF attach/open พร้อม search, kind filter, pagination และ document navigation
- Persistent workflow แยกจากผลตรวจต้นทาง พร้อม explain/resubmit/rerun/return/reject/hold/confirm, reason policy, required note, optimistic concurrency และ idempotency
- Action outbox/acknowledgement สำหรับระบบต้นทาง; resubmit/rerun รอ revision ใหม่และไม่แก้ FAIL เป็น PASS ใน browser
- Separate shared Portal/integration API keys และ loopback-only development mode
- Explicit core Table9 adapter ที่ไม่เปลี่ยนความหมาย code หรือสร้าง receipt สมมติ
- ตัวอย่าง JSON/PDF สังเคราะห์, run script, integration documentation และ tests

## ความต่างจากแผนและข้อจำกัด

| เรื่อง | สถานะจริง |
|---|---|
| PostgreSQL / Alembic | ยังไม่ได้ใช้; SQLite สำหรับ pilot เริ่มใช้งานง่าย ไม่มี external DB ที่ต้องตั้งค่า; ต้อง migration ก่อน production |
| Entra / role & company scope | ยังไม่ได้ทำ; shared key ให้สิทธิ์ทั้ง workspace ไม่แกล้งแสดง role matrix ว่าควบคุมข้อมูลแล้ว |
| OCR / Oracle / matching / AP | Portal ไม่เรียกและไม่คำนวณ; resubmit/rerun เป็น outbox request และต้องรอ revision ใหม่; ยังไม่มี AP post |
| Legacy schema | canonical 1.0 เป็น contract หลัก; adapter core Table9 เป็น explicit CLI; ไม่ auto-detect arbitrary JSON |
| PDF URL / Paperless | ส่งไฟล์ binary ผ่าน API ก่อน; ยังไม่มี live DMS proxy, signed 10-minute sessions หรือ watermark |
| Activity | เก็บ receive/attach/open/workflow/acknowledgement แบบถาวร; ยังไม่มีผู้ใช้รายบุคคลหรือ tamper-evident audit |
| PDF retention | เปิดย้อนหลังตาม revision ได้แล้ว แต่ยังไม่มี retention policy, legal hold หรือ cleanup job |
| Limits | JSON 2 MB, PDF 20 MB/500 pages; ต้องเพิ่ม perimeter limits/rate limiting/scanning ก่อนเปิดภายนอก |
| Deploy | build เสิร์ฟ origin เดียวจาก FastAPI, bind loopback; ยังไม่ deploy ขึ้น public hosting |

## Verification

- Backend unittest 15 รายการ: ingestion persistence, retries/conflicts, stale revisions/history, schema redaction, PDF archive/read/stale, compatibility backfill, origin rejection, key separation, filtering/pagination, audit, workflow action/version/idempotency/outbox/revision completion, legacy adapter และ architecture boundaries
- TypeScript strict + production Vite build
- Playwright 6 รายการบน Microsoft Edge: JSON+PDF flow, tabs/history/reload/search/mobile; invalid JSON; decimal precision; revision deep link/archived PDF; access/audit; resubmit → outbox → revision ใหม่ → history
- ตรวจภาพ task-first detail, waiting state, action results และ queue บน desktop/mobile รวม PDF และ mobile overflow

ผลรันสุดท้ายบันทึกใน canonical work log ของ repository ไม่อ้างผล live OCR/Oracle/AP เพราะไม่ได้เรียกระบบเหล่านั้น

## ลำดับงานต่อไป

1. ให้ระบบต้นทางส่งตัวอย่าง sanitized JSON ที่เป็น contract จริง แล้วปรับ adapter โดยไม่แต่ง evidence
2. เชื่อม Entra และ data scopes ก่อนให้หลายบริษัทใช้งานร่วมกัน
3. PostgreSQL/Alembic, managed storage, audit/retention/scanning และ deployment controls
4. เชื่อม producer กับ action outbox และกำหนด SLA/retry/dead-letter สำหรับ resubmit/rerun
5. ถ้าต้องแสดง PDF จาก DMS โดยตรง เพิ่ม authenticated allowlisted connector และ lifecycle ของไฟล์

ก่อนเปิด `post` ต้องมี AP acknowledgement contract, Entra identity และ separation of duties; Portal ยังไม่แสดงว่าส่ง AP สำเร็จโดยไม่มีหลักฐานจากระบบปลายทาง
