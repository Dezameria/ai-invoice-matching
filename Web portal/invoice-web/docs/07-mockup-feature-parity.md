# Mockup v4.4 feature parity

อัปเดต `2026-10-02T10:07:32+07:00`

เอกสารนี้ตรวจ `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html` จาก function และ constant จริง ได้แก่ `ROLES`, `scopeCheck`, `queueShell`, `drawList`, `drawDetail`, `sumPane`, `linesPane`, `rulesPane`, `ownPane`, `toJSON`, `hist`, `openDMS`, `actions`, `CFG`, `openM`, `doAct`, `rbacPage` และ `auditPage`

คำว่า **พร้อมใช้** ในตารางหมายถึง local/shared-key receiving pilot ที่รับ JSON/PDF จากระบบอื่น ไม่ได้หมายถึง multi-user production หรือระบบ OCR/AP ครบวงจร

## ผลตรวจ feature

| Req | สถานะ | สิ่งที่ Portal ทำจริง | ส่วนที่ยังต้องมี dependency |
|---|---|---|---|
| UI-01 Header/navigation/identity | บางส่วน | Header, responsive sidebar, environment/workspace และ 4 หน้าหลักทำงานจริง | Entra identity, role badge และ policy menu |
| UI-02 คิวตามผู้รับผิดชอบ | รอ identity | Queue ใช้งานจริง แต่เป็น workspace-wide | Receiver/company scope และ denial tests หลังเชื่อม Entra/Oracle mapping |
| UI-03 KPI/filter/search/company | พร้อมใช้ใน pilot | KPI, status/source/company filters, company chips, search, server pagination และ refresh | KPI ตาม user scope |
| UI-04 Queue/detail header | พร้อมใช้ใน pilot | invoice, vendor, company, PO/Release, receipt, ORG_ID, Receiver, total, revision และ PDF pages | ฟิลด์ที่ producer ไม่ส่งจะแสดงว่าไม่มีข้อมูล |
| UI-05 STEP 1–3 | พร้อมใช้ใน pilot | แสดงกลุ่ม STEP และ mapping STEP ของ V-01–V-09 จากผลต้นทาง รวม not evaluated | job/processing state จาก OCR worker |
| UI-06 Summary/exceptions | พร้อมใช้ใน pilot | exception, severity, evidence page และ warnings กรณีไม่มี receipt/Receiver/duplicate | ผู้แก้และ workflow assignment |
| UI-07 Line comparison | พร้อมใช้ใน pilot | invoice/receipt quantity, UOM, price, amount, receipt line และ match level | ข้อมูลขึ้นกับ producer contract |
| UI-08 Rules 9 ข้อ | พร้อมใช้ใน pilot | V-01–V-09, STEP, result, code, severity, evidence และ page link | catalog 6.6 ที่เจ้าของมาตรฐานรับรอง |
| UI-09 Owner/access tab | บางส่วน | แสดง company, ORG_ID, Receiver, source และข้อจำกัด workspace access อย่างชัดเจน | account mapping และรายชื่อผู้เห็นเอกสารจาก RBAC จริง |
| UI-10 JSON | พร้อมใช้ใน pilot | ดูและดาวน์โหลด normalized JSON ของ revision ที่เลือก | field redaction ตาม identity scope |
| UI-11 History | พร้อมใช้ใน pilot | receive/attach/open/workflow/acknowledgement/revision events คงอยู่หลัง reload | identity ของผู้ทำรายบุคคล |
| UI-12 Document viewer | บางส่วน | PDF.js, page/zoom/download, evidence deep link, exact revision และ access event | DMS signed session, thumbnails, watermark และ download policy |
| UI-13 Workflow actions | พร้อมใช้ใน pilot ยกเว้น AP post | explain/resubmit/rerun/return/reject/hold/confirm มี reason policy, modal, persistent state, optimistic version, idempotency, audit และ action outbox | Entra role authorization, OCR worker SLA และ AP post/acknowledgement |
| UI-14 Permissions/mapping | บางส่วน | หน้า capability แสดง permission/session จริงและสิ่งที่ยังไม่เปิด | Entra role matrix และ Oracle account mapping CRUD |
| UI-15 Audit | พร้อมใช้ใน pilot | Global event page ค้นหา กรองประเภท แบ่งหน้า เปิดเอกสาร และเก็บถาวร | actor/role, company-scoped audit และ tamper-evident export |

## Navigation ที่เปิดใช้

1. **เอกสารทั้งหมด** — queue/KPI/filter/company/search/import
2. **สิทธิ์และการเข้าถึง** — capability และ security boundary ของ release ปัจจุบัน
3. **บันทึกการเข้าถึง** — persistent receive/PDF events
4. **เชื่อมต่อ API** — JSON schema, ingest และ PDF contract

หน้ารายละเอียดจัดใหม่เป็น 5 แท็บเพื่อให้สแกนง่าย: สรุปและดำเนินการ, รายการสินค้า, กฎการตรวจ, ประวัติ และข้อมูลเพิ่มเติม โดยแท็บสุดท้ายรวม ownership/source/JSON ไว้ครบ รองรับ keyboard Arrow Left/Right, Home และ End

## Release boundary

รุ่นนี้พร้อมสำหรับ demo, contract integration และ local pilot เมื่อใช้ข้อมูลสังเคราะห์หรือข้อมูลที่องค์กรอนุญาต ภายใต้เงื่อนไข:

- bind เฉพาะ loopback หรือใช้ shared keys ผ่าน origin ที่ควบคุม
- backup SQLite และ `data/pdf` คู่กัน
- producer เป็นเจ้าของ status/rules/receipt/line evidence; Portal ไม่คำนวณใหม่
- ผู้ใช้ workspace เห็นข้อมูลชุดเดียวกันทั้งหมด
- ใช้ action outbox เป็นคำขอให้ระบบต้นทางรับไปทำงาน; accepted ยังไม่ใช่ผล OCR ใหม่ และไม่มีหลักฐานว่า ERP/AP รับรายการจนกว่าจะมี contract จริง

ก่อน multi-user/production ต้องปิด Entra/RBAC, PostgreSQL migrations/backups, audit identity, scanning/rate limit, retention และ infrastructure gates ในเอกสาร 01–03
