# 02 — ข้อกำหนดจาก mockup และช่องว่างระบบ

> ผู้ใช้ปรับ scope วันที่ 2026-10-02 ให้รับข้อมูลจากระบบอื่นและแสดง PDF ต่อมาเพิ่ม action workflow ฝั่ง Portal ในรูปแบบ persistent request/outbox โดยยังไม่รัน OCR/AP หรือจำลอง RBAC ดู [สถานะล่าสุด](05-implementation-status.md), [ผลตรวจ feature parity UI-01–15](07-mockup-feature-parity.md) และ [แนวทาง Task-first UX](08-task-first-review-ux.md)

สถานะ: ข้อเสนอ ณ 2026-10-01T16:40:53+07:00 · [สารบัญ](README.md)

แหล่งหลัก: [HTML v4.4](../../Web%20portal/AIVA-Web-Portal-Mockup-v4.4-Release.html) อ้างด้วยชื่อ function/constant เพื่อค้นหาได้แม้เลขบรรทัดเปลี่ยน

## 1. หน้าจอและฟังก์ชันที่ต้องมี

| ID | ส่วนใน mockup | เป้าหมายระบบจริง | แหล่งอ้างอิง |
|---|---|---|---|
| UI-01 | Header, nav, role badge, เลือกผู้ใช้ | แสดง identity จาก Entra; menu ตามสิทธิ์; switch user ใช้เฉพาะ dev fixtures | `init`, `switchUser`, `nav`, `ROLES` |
| UI-02 | งานของฉัน / คิวตรวจสอบ | EU เห็นงานตาม Receiver; ACC/APR ตามบริษัท; ADM ไม่มีคิวเนื้อหา | `scopeCheck`, `queueShell` |
| UI-03 | Company chips, KPI, search | นับเฉพาะ scope ที่มีสิทธิ์; filter ตาม role/status/company; ค้น invoice/PO/vendor; pagination ฝั่ง server | `queueShell`, `match`, `listFilter`, `drawList` |
| UI-04 | Queue card และ detail header | เลข invoice, vendor, company, status, PO, Release, receipt, ORG_ID, Receiver, total, round, pages | `drawList`, `drawDetail` |
| UI-05 | STEP 1–3 และ Portal duplicate | แสดงผลที่ backend รายงาน รวม skipped/not evaluated; processing แยกจากผลตรวจ | `drawDetail`, `RSTEP` |
| UI-06 | แท็บสรุปผล | exception/severity/ผู้แก้/evidence; no Receiver, unmapped Receiver, duplicate และ halted warnings | `sumPane`, `EXC` |
| UI-07 | แท็บรายบรรทัด | จำนวน หน่วย ราคา ยอด invoice เทียบ receipt, matched receipt line, match level; subtotal/VAT/total; Release แสดงผลเท่านั้น | `linesPane` |
| UI-08 | แท็บกฎ 9 ข้อ | V-01 ถึง V-09 พร้อม STEP, result, code, evidence; ไม่ประเมินต้องแยกจากผ่าน | `rulesPane`, `RULES` |
| UI-09 | แท็บผู้รับผิดชอบและสิทธิ์ | บริษัทและที่มา, Receiver, mapping status, uploader, ผู้มองเห็นเอกสารตาม policy | `ownPane`, `setOwner` |
| UI-10 | แท็บ JSON | normalized document contract พร้อม source schema/standard version; จำกัดข้อมูลตามสิทธิ์เดียวกับ detail | `toJSON` |
| UI-11 | แท็บประวัติ | timeline ที่คงอยู่หลัง reload รวม verification rounds และ human actions | `hist`, `doAct` |
| UI-12 | DMS viewer | PDF/ภาพจริง thumbnails, page navigation, evidence deep link, watermark, access log | `openDMS` |
| UI-13 | Action bar และ modal | explain/resubmit/rerun/return/reject/hold/confirm/post พร้อม reason/note/new receipt hint | `actions`, `CFG`, `REASON`, `openM`, `doAct` |
| UI-14 | สิทธิ์และการเชื่อมบัญชี | policy explanation, role matrix, account mapping, companies/ORG_ID; ปุ่มเชื่อมบัญชีต้องทำงานจริง | `rbacPage` |
| UI-15 | บันทึกการเข้าถึง | เวลา user/role/action/document/detail พร้อม filter/page; export ไม่อยู่ใน mockup ให้แยกเป็น enhancement | `auditPage`, `log` |

OCR upload/gallery ที่ `/app` เป็นอีก UI หนึ่ง ไม่ใช่หน้าหลักที่ผู้ใช้ขอย้าย หากเพิ่ม upload ใน Portal ให้เป็นขอบเขตเสริมหลัง UI-01 ถึง UI-15 ไม่ใช้ gallery แทนคิวตรวจสอบของ v4.4

## 2. Role × Permission ตาม mockup

| Permission | EU Receiver | ACC บัญชี | APR หัวหน้าบัญชี | ADM IT |
|---|:---:|:---:|:---:|:---:|
| VIEW_OWN | ✓ | — | — | — |
| VIEW_CO | — | ✓ | ✓ | — |
| DMS | ✓ | ✓ | ✓ | — |
| EXPLAIN / RESUBMIT | ✓ | — | — | — |
| CONFIRM (รวม return/hold/reject) | — | ✓ | ✓ | — |
| RERUN (กรณีไม่มี Receiver) | — | ✓ | ✓ | — |
| POST | — | — | ✓ | — |
| MAP | — | — | — | ✓ |
| AUDIT | — | — | ✓ | ✓ |

ข้อกำหนดเพิ่มเติมที่ต้องบังคับใน backend:

1. EU ต้องผ่าน **ทั้ง** company membership และ Receiver mapping; ผู้สแกนไม่เท่ากับผู้รับผิดชอบ ห้ามใช้ uploader เป็นเจ้าของแทน
2. ACC/APR ดูทุก ORG_ID ภายในนิติบุคคลที่ได้รับมอบหมาย บริษัทไม่เท่ากับ inventory org; อ้าง master data เต็มชุด ไม่ hardcode เฉพาะบริษัทตัวอย่าง
3. ถ้าไม่มี receipt ใช้ customer Tax ID ระบุบริษัทตาม master; ถ้าจัดบริษัทไม่ได้เข้า scope พิเศษ `unknown` ที่มอบหมายชัดเจน ไม่ใช่ wildcard ทุกบริษัท
4. ไม่มี Receiver หรือ Receiver ไม่เชื่อมบัญชี/ไม่ active: EU ไม่เห็น, บัญชีใน scope ยังเห็น warning และดำเนินงานตาม policy; ไม่มอบหมายแทนโดยอัตโนมัติ
5. ใช้ `(Entra tenant ID, object ID)` เป็นตัวตน Portal; เชื่อม Oracle `EMPLOYEE_ID` เป็นกุญแจหลักเมื่อมีข้อมูล ใช้ Receiver name เพื่อแสดงผล หากมีแค่ชื่อและจับคู่กำกวมให้พัก mapping ไม่เดา
6. ถ้าหลาย receipts มีคนรับต่างกัน ต้องตกลง policy ก่อนเปิด scope; ค่าเริ่มต้นปลอดภัยคือส่งบัญชีจัดการ ไม่เลือก Receiver แถวแรก
7. ADM จัดการ mapping และดู security audit ที่ตัดรายละเอียดเนื้อหาเอกสารออก; APR ดู document audit เฉพาะบริษัทตน แม้ mockup เก็บ `AUDIT` เป็น array รวม ต้องไม่ย้ายการเห็นทั้งระบบแบบนั้นไปใช้งานจริง
8. หน้า RBAC เปิดได้ทุก role ตาม mockup แต่ข้อมูลบัญชี/บุคคลอื่นต้องจำกัดตาม policy: ผู้ใช้ทั่วไปดูสิทธิ์ตนและ matrix; ADM จัดการ mapping; รายละเอียดบุคคลในแท็บ owner ต้องกำหนดขอบเขตการเปิดเผย
9. ตรวจสิทธิ์ที่ list/count/search/detail/JSON/history/action/DMS/thumbnail/stream ทุกครั้ง รวม URL ที่พิมพ์เองและลิงก์ duplicate ต่างบริษัท
10. ผู้ยืนยันต้องไม่ใช่ผู้ส่ง AP; ตรวจด้วย immutable user ID ใน transaction ไม่ใช้ชื่อหรือการ disable ปุ่มอย่างเดียว

## 3. Workflow และเงื่อนไขการเปลี่ยนสถานะ

แยก `verification_status` (Auto-pass, Review, Hold, Manual Review) ออกจาก `workflow_status` และ `job_status` เพื่อรักษาผล OCR เดิมหลังมนุษย์ดำเนินงาน UI ใช้ badge หลักตามลำดับ Posted/Rejected → Confirmed → Duplicate → manual Hold → ผล OCR พร้อมแสดง processing แยกต่างหาก ลำดับนี้เป็นข้อเสนอและต้องมีตัวอย่างตรวจรับ

| Action | ผู้ทำ/เงื่อนไข | ผลถาวรที่ต้องบันทึก |
|---|---|---|
| explain | EU ที่เห็นเอกสารและ assigned ฝั่ง EU; ยังไม่ปิด | เก็บเหตุผล/หมายเหตุ ส่งงานให้บัญชี; ไม่เปลี่ยนผล OCR |
| resubmit | EU ใน scope และ assigned ฝั่ง EU | สร้าง verification round ใหม่ อ้าง document version ใหม่หรือเดิมอย่างชัดเจน ไม่เปลี่ยน FAIL เป็น PASS ใน browser |
| rerun | ACC/APR, ไม่มี Receiver และเข้าเงื่อนไขตรวจซ้ำ | สร้าง job/round ใหม่; receipt number ที่กรอกเป็น hint ต้องตรวจจาก Oracle ไม่ถือเป็นหลักฐาน |
| return | ACC/APR, มี Receiver active/mapped, ยังไม่ assigned EU | ส่งงานให้ EU พร้อมเหตุผล; หาก Confirmed ต้อง invalidate approval ก่อน |
| hold | ACC/APR, ยังไม่ปิดและยังไม่ Hold | เก็บ hold decision/reason; ยกเลิก approval ที่ค้างอยู่ |
| reject | ACC/APR, ยังไม่ปิด | ปิดเป็น Rejected พร้อมเหตุผล; ห้าม post ภายหลัง |
| confirm | ACC/APR, assigned บัญชี, ไม่ Duplicate/Confirmed/ปิด | เก็บ confirmed_by/round/version; ถ้ามี High ต้องมี note ตาม mockup; ไม่ลบ exceptions |
| post | APR, Confirmed, คนละคนกับผู้ยืนยัน | ตรวจสิทธิ์และ duplicate ใหม่; สร้าง AP submission; Posted เมื่อได้ acknowledgment ตาม contract |

ทุก action ต้องมี reason code ที่ server อนุญาต; note ตามเงื่อนไข ห้ามกดซ้ำสร้างงานซ้ำ ทุก mutation ส่ง expected version; หากสถานะเปลี่ยนโดยคนอื่นตอบ 409 แล้วให้โหลดข้อมูลล่าสุด

`Posted` และ `Rejected` เป็น terminal ตาม mockup การเปิดใหม่/ยกเลิก AP ไม่อยู่ในขอบเขต parity ต้องมี workflow แยกหากต้องการ `Confirmed` ที่ถูก hold/return หรือเกิดผลตรวจรอบใหม่ต้องไม่สามารถนำ approval เก่ามาส่ง AP

Duplicate ถูกบล็อก confirm/post ใน mockup แต่ยังไม่มี action resolve duplicate ที่สมบูรณ์ ระยะแรกอนุญาต reject พร้อมเหตุผล หากต้องมี “ไม่ใช่เอกสารซ้ำ” ให้เจ้าของบัญชีกำหนดสิทธิ์ หลักฐาน และการตรวจซ้ำก่อนพัฒนา ห้ามสร้างปุ่มปลดล็อกโดยไม่มี policy

Mockup อนุญาต confirm เมื่อมี High พร้อม note แต่ไม่ได้พิสูจน์ว่าทุก exception override ได้จริง ต้องให้เจ้าของมาตรฐานแบ่ง non-overridable/overridable ก่อน production; ระหว่างนั้นห้าม auto-approve และห้าม auto-post

## 4. ความต่างที่ยืนยันจากโค้ด

| GAP | หลักฐาน | ผลกระทบและงานที่ต้องทำ |
|---|---|---|
| G-01 มาตรฐานต่างรุ่น | mockup `EXC` / `toJSON`: 6.6, 1.5; `Table9Output`: 6.2; `_build_result_payload`: 1.1 | ทำ versioned adapter และรับรอง rule catalog; ห้ามเปลี่ยน label เป็น 6.6 โดยไม่แก้ engine |
| G-02 รหัสซ้ำแต่ความหมายต่างกัน | E05 ใน mockup = Receipt Not Found; docs rules = missing invoice; `evaluate_step3` = price variance | key ต้องรวม engine/ruleset version + rule ID + code; ห้าม map code อย่างเดียว |
| G-03 docs กับ code ต่างกันในกฎ | docs อธิบาย V-09 ราคา, แต่ `evaluate_step3` ตรวจ receipt subtotal; code ให้ partial qty เป็น E34 | ตรวจ rules V-01–09/tolerance/decision กับเจ้าของมาตรฐานและสร้าง golden cases |
| G-04 API examples ไม่ตรง | docs ตัวอย่าง `table9`, `header/line_items`, `step_start`; code ใช้ `VerificationResponse.data`, normalize input และ event `step` | export OpenAPI จาก build ที่ระบุ version; contract tests จาก synthetic fixtures; ไม่ generate client จากตัวอย่าง docs |
| G-05 ข้อมูลเพื่อควบคุมสิทธิ์ไม่ครบ | `OracleReceipt` ไม่มี Receiver/EMPLOYEE_ID; Table9 ไม่มี access/DMS/release | เพิ่ม schema/query output และตรวจ join จริงกับ Oracle owner; ข้อความ “ยืนยันแล้ว” ใน HTML ไม่ใช่ผล integration test |
| G-06 ค่าทดแทนใน SSE UI | `_build_result_payload` ใช้ PO บอก receipt found, สร้าง `RCV-{po}`, fallback ORG_ID 103, receipt total จาก invoice subtotal | ใช้ receipt จริงเท่านั้น; ไม่มีข้อมูลเป็น null/not_evaluated ไม่สร้างหลักฐานขึ้นมา |
| G-07 matching evidence ไม่ใช่ผลจาก engine โดยตรง | `_build_result_payload` จับคู่ด้วย line no./first row; engine มี fallback first receipt row เช่นกัน | ให้ engine ส่ง match record พร้อม receipt/PO/line/method; ตรวจ ambiguity และการใช้ receipt quantity ซ้ำ ห้าม UI คำนวณ match ใหม่ |
| G-08 สิทธิ์และ persistence จำลอง | `ME`, `DOCS`, `AUDIT`, `scopeCheck`, `doAct` อยู่ใน browser | เพิ่ม Entra/API policies/DB/transactions; refresh แล้วข้อมูลต้องคงอยู่ |
| G-09 rerun และ AP จำลอง | `doAct` ล้าง exception และตั้ง Posted โดยตรง | ใช้ durable jobs และ AP acknowledgment; ไม่มีการแกล้งผ่านหรือ post สำเร็จทันที |
| G-10 Viewer ยังไม่ใช่ secure DMS | `openDMS` จำลอง; `/fe/.../pdf` proxy ใน source ไม่เห็น document authorization | เพิ่ม authenticated viewer session 10 นาที, watermark และ audit; ทุก content request ตรวจ scope |
| G-11 webhook ยังเป็นผู้ส่ง | `services/portal.py` ส่ง Table9 HTTP POST | เพิ่ม receiver, service auth, event identity, durable ingestion, retry/dedup/outbox; ไม่ใช่ Portal API ที่มีอยู่แล้ว |
| G-12 runtime controls ยังไม่ครบ | `main.py` CORS wildcard; routes ไม่เห็น Entra/document RBAC; requirements เป็น lower bounds | จำกัด origin/internal access, lock dependencies, harden error responses และ production config |

## 5. วิธีจัดการมาตรฐานที่ขัดกัน

ยึด mockup ด้าน UX เป็นเป้าหมาย ส่วนกฎบัญชีต้องรับรองจากเจ้าของมาตรฐานฉบับที่ตกลง ไม่ยก HTML เป็น specification ของคณิตศาสตร์โดยอัตโนมัติ เก็บ `source_standard_version`, `engine_version`, `portal_schema_version`, `rule_catalog_version` แยกกัน

ทำ catalog ครบ 9 rules และทุก exception ที่ใช้งาน โดยมี meaning, severity, assigned group, tolerance, override policy, evidence requirements และ migration mapping แยกตามเวอร์ชัน กรณีไม่มี mapping ที่รับรองให้แสดงผลเดิมพร้อมป้าย legacy/incompatible และส่ง review ไม่เดาว่าเป็น exception ของ v6.6

การรองรับ legacy ชั่วคราวทำเพื่ออ่านและตรวจทานได้ ไม่ได้แปลว่าส่ง AP ได้ การเปิด workflow จริงต้องผ่าน G-01 ถึง G-07 และการรับรอง policy ก่อน
