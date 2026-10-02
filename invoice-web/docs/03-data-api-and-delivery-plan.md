# 03 — ข้อมูล API และแผนส่งมอบ

> เอกสารนี้เป็นแผน end-to-end เดิม ผู้ใช้ปรับขอบเขตเป็น receiving portal แล้ว API ที่ implement จริงให้ยึด [Receiving API v1.0](04-receiving-api.md) และ [สถานะล่าสุด](05-implementation-status.md) ไม่ใช่ endpoint ที่เสนอไว้ด้านล่าง

สถานะ: ข้อเสนอ ณ 2026-10-01T16:40:53+07:00 · [สารบัญ](README.md)

## 1. แบบจำลองข้อมูลเป้าหมาย

รายการต่อไปนี้เป็นตารางใหม่ที่เสนอ ยังไม่มี migration ใน repository

| Entity | ข้อมูล/ความสัมพันธ์หลัก | ข้อกำหนด |
|---|---|---|
| users / role_grants | Entra tenant/object ID, role, active | unique identity; ไม่ใช้ email เป็น primary identity |
| companies / organizations | นิติบุคคล, tax ID, inventory/operating org IDs | Tax ID เป็น string; หนึ่งบริษัทมีหลาย org; มี source/version ของ master |
| user_company_scopes | user ↔ company หรือ unknown scope | ตรวจทุก query; ถอนสิทธิ์ต้องมีผลกับ viewer/stream ด้วย |
| receiver_mappings | user ↔ employee ID, receiver display name, valid dates | ตรวจชื่อซ้ำและ inactive; เก็บ audit ทุกการแก้ |
| documents / document_versions | Portal UUID, source system/ID, DMS version/hash, page count, uploader, company source, current version | แยก UUID จาก Paperless integer และ mockup string ID; ไม่มี default doc ID 1001 ใน production |
| verification_runs | document version, round, job ID, standard/schema/engine versions, start/end, source result | unique(document, round); ผลแต่ละรอบ immutable; รับผลเก่าห้ามทับรอบล่าสุด |
| invoice_snapshots / invoice_lines | header, PO/release, supplier/customer, quantities/UOM/prices/totals | เก็บตาม run ไม่ทับประวัติ; money เป็น decimal; Release แสดงอย่างเดียว |
| receipt_snapshots / receipt_lines | receipt/PO/line IDs, org, Receiver/employee, quantity/price, retrieved_at | รองรับหลาย PO/receipts; ห้ามใช้เลข line อย่างเดียวเป็น key |
| line_matches | invoice line ↔ receipt line(s), method, matched quantity, evidence | รองรับ split match เมื่อมาตรฐานอนุญาต; engine เป็นผู้ให้ผล |
| rule_results / exceptions | rule, result, code, severity, message, evidence page/line | เก็บครบ 9 rules; หลาย exceptions ต่อ rule; ไม่ใช้ single code แทน exceptions ทั้งหมด |
| workflow_cases / actions | current state, assigned group/receiver, row version, reason/note, actor, verified round | เปลี่ยนผ่าน domain service + transaction; invalidate confirmation เมื่อผลเปลี่ยน |
| duplicate_candidates / resolutions | document pairs, normalized business key, reason, resolution | ไม่ block การนำเข้าเพื่อให้ review ฉบับซ้ำได้; block ที่ approval/AP |
| ap_submissions | document/version/round, idempotency key, confirmer/sender, external ref, status | เก็บ pending/sending/succeeded/failed/unknown; ไม่สูญเสียเมื่อ timeout |
| audit_events | actor ID/role, action, resource ID, scope, outcome, timestamp, correlation ID | append-only; redact payload/secrets; แยก security audit จากเอกสาร |
| jobs / job_events / inbox / outbox | job/event ID, attempt, status, sequence, service identity | transactional dispatch, event dedup, recovery และ retry |

เวลาเก็บ timezone-aware UTC และแสดง Asia/Bangkok; วันที่ใบแจ้งหนี้เก็บเป็น date ไม่เลื่อนตาม timezone ข้อมูลที่ขาดใช้ null และเหตุผล ไม่ใช้ 0 แทนค่าที่ไม่รู้

จำนวนเงิน/ปริมาณใช้ Decimal/NUMERIC; precision/scale และ currency ที่รองรับต้องยืนยันกับ ERP รวม invoice number normalization สำหรับ duplicate การเก็บ raw OCR result ต้องอยู่ใน protected storage ตาม retention ไม่เขียน payload ลง operation log

## 2. Contract ระหว่าง Portal กับ OCR

Normalized document detail ต้องมีอย่างน้อย:

```text
id, source_document_id, document_version, row_version
source_standard_version, engine_version, portal_schema_version
invoice { invoice_num, po_numbers[], release_num, supplier, customer,
          currency, sub_total, vat, grand_total }
dms { source_id, version, pages, uploaded_by }   # ไม่รวม permanent public URL
receipts[] { receipt_id, po_number, org_id, receiver, employee_id, lines[] }
access { company_id, company_source, receiver_mapping_status }
verification { round, status, halted_by, oracle_called, rules[], exceptions[], line_matches[] }
workflow { status, assigned_to, confirmed_by, confirmed_round, allowed_actions[] }
jobs[] { id, type, status }
```

`access` และ `allowed_actions` คำนวณใน Portal จากข้อมูลที่เชื่อถือได้ ไม่รับค่าจาก browser; การซ่อนปุ่มไม่แทน server authorization `oracle_called` มาจาก execution record ไม่อนุมานจาก `halted_by` อย่างเดียว

Adapter ทำได้เฉพาะ normalize representation เช่น `PASS` → `pass`, `FAIL` → `fail`, `MANUAL` → `manual_review`, `user` → `end_user` ส่วนการเปลี่ยนความหมาย code/rule ต้องผ่าน catalog ที่รับรอง ไม่เดา match level, receipt total หรือ evidence page หากไม่มีให้แสดง “ยังไม่มีข้อมูล”

ผลจริงที่มีปัจจุบันคือ Table9 ใน `VerificationResponse.data` สำหรับ verify file และ Table9 โดยตรงสำหรับ extracted JSON ส่วน SSE `result` เป็นอีก schema หนึ่ง จึงต้องทดสอบแยกทั้งสาม contract และรวมเป็น output เดียวในอนาคต

## 3. API ที่มีอยู่กับ API ที่ต้องเพิ่ม

### 3.1 OCR API ปัจจุบัน — ใช้ผ่าน internal adapter

| Endpoint | ขอบเขตการใช้ |
|---|---|
| `POST /api/v1/verify/file` | file verification; ปัจจุบัน response model เป็น `VerificationResponse` |
| `POST /api/v1/verify/extracted-json` | deterministic verification จาก extracted input; ใช้กับ contract tests และงานภายใน |
| `POST /api/v1/verify/paperless-next` | process คิว Paperless เดิม; ต้องทำ ingestion ownership/dedup ก่อนเปิดหลาย workers |
| `GET /api/v1/master-entities` | master snapshot สำหรับทำ company/org mapping |
| `GET /api/v1/oracle-receipts/{po_number}` | query/debug integration; ไม่เปิด browser ทั่วไป |
| `GET /fe/documents`, `/fe/documents/{id}/pdf`, `/fe/documents/{id}/thumb` | gallery/proxy เดิม; ไม่ใช่ Portal queue พร้อม RBAC |
| `POST /fe/verify/{id}`, `/fe/verify/upload` | streaming เดิม; events ใน source ได้แก่ step/extraction/rules/oracle/result/error/done ตามเส้นทาง |

SSE เดิมเป็น POST จึงใช้ native `EventSource` เปิดตรง ๆ ไม่ได้ หากต้องใช้ช่วงเปลี่ยนผ่านให้ใช้ authenticated fetch streaming parser และจัดการ event boundaries/abort/error แต่ระบบเป้าหมายแยก POST เริ่ม job กับ GET ติดตามงาน เพื่อไม่ผูกการประมวลผลกับ connection

### 3.2 Portal API ใหม่ — namespace `/api/portal/v1`

| Method/Path | หน้าที่และข้อกำหนด |
|---|---|
| `GET /me` | current user, role, company scopes, permissions; ตรวจ Entra token |
| `GET /documents` | queue แบบ paginated; company/status/assigned/search; filter scope ก่อน pagination/count |
| `GET /documents/summary` | KPI ตาม scope และ company filters เดียวกับ queue; กำหนดชัดว่า status KPI ไม่กรองตาม card ที่เลือก |
| `GET /documents/{id}` | header, tabs data, current result, allowed actions, row_version |
| `GET /documents/{id}/runs` | verification rounds และ immutable snapshots |
| `GET /documents/{id}/history` | timeline ตามสิทธิ์ |
| `POST /documents/{id}/actions` | explain/return/hold/reject/confirm พร้อม reason/note/expected_version/idempotency key |
| `POST /documents/{id}/verification-jobs` | resubmit/rerun; ตรวจ actor/assignment/round/document version; ตอบ 202 + job ID |
| `GET /jobs/{id}` | durable job status/result reference; polling fallback |
| `GET /jobs/{id}/events` | SSE + event ID/resume cursor; authorize scope เช่นเดียวกับ document |
| `POST /documents/{id}/viewer-sessions` | ออก session อายุไม่เกิน 10 นาที ผูก user/document/version |
| `GET /viewer-sessions/{id}/content` | authenticated PDF/image stream; ตรวจสิทธิ์/expiry ทุกครั้ง; ไม่ส่ง DMS credential |
| `POST /documents/{id}/ap-submissions` | APR + confirmed round + separation of duties + duplicate recheck; 202 ไม่ใช่ Posted |
| `GET /ap-submissions/{id}` | submission status/external reference/reconciliation result |
| `GET /permissions`, `GET /companies` | role matrix และ master ภายใน scope |
| `GET /account-mappings` | ADM เห็น management view; ผู้ใช้อื่นได้เฉพาะข้อมูลตาม policy |
| `POST /account-mappings`, `PATCH /account-mappings/{id}` | ADM เปลี่ยน mapping/active status พร้อม audit/version |
| `GET /audit-events` | APR company-scoped / ADM redacted security view; pagination/filter |

แยก internal endpoint `POST /internal/v1/verification-results` สำหรับ OCR result ingestion ใช้ service credential ไม่ใช้ user login; validate schema/version/run correlation และ dedup event ID **ก่อน** update state `portal.py` เดิมยังไม่ส่ง metadata ครบ ต้องขยายหรือใช้ gateway adapter ไม่อ้างว่าต่อ webhook ได้ทันที

Error contract กลาง: `error_code`, ข้อความที่ผู้ใช้เข้าใจ, `correlation_id`, optional validation fields; 401 ต้อง login, 403 ไม่มีสิทธิ์, 404 ไม่พบ/ปิดบัง resource นอก scope ตาม policy, 409 stale/conflicting action, 422 validation, 503 dependency unavailable ห้ามเผย internal exception หรือ token

## 4. Authentication, DMS และ audit

SPA ขอ access token สำหรับ Portal API ด้วย MSAL/PKCE; API ตรวจ signature/JWKS, issuer, audience, expiry, tenant และ delegated scope แล้วโหลดสิทธิ์ภายใน ไม่ใช้ ID token แทน API access token ไม่เก็บ service secrets ใน SPA และไม่ใส่ access token ใน URL

Streaming เป้าหมายใช้ fetch GET พร้อม Authorization header จัดการ refresh/reconnect และ sequence cursor; เมื่อถูกถอนสิทธิ์ต้องปิด stream เมื่อรอบตรวจสิทธิ์ถัดไป มี polling fallback จาก job ledger

Viewer session ต้องผูกผู้ใช้ ไม่ใช่ bearer URL ที่ใครคัดลอกก็เปิดได้ ตรวจ document access สำหรับ PDF/thumb/page/evidence ทุกครั้ง และ audit ทั้ง success/denied ใช้ watermark ชื่อผู้ดู+เวลาอย่างน้อยตาม mockup ถ้าต้องให้ watermark ติดไฟล์ที่ดาวน์โหลด ต้อง render ฝั่ง server; overlay ใน browser อย่างเดียวไม่ทำให้ original PDF มี watermark

ค่า `Cache-Control: private, no-store` สำหรับเนื้อหาอ่อนไหว ป้องกัน cache ข้ามผู้ใช้ และล้าง frontend cache ตอน logout/scope change; browser JSON แสดงด้วย text rendering ไม่ inject HTML จาก OCR

## 5. งานเบื้องหลังและความถูกต้องของธุรกรรม

1. เมื่อรับ rerun/resubmit: transaction ตรวจ scope/version → จอง round → บันทึก job และ outbox → ตอบ 202; dispatcher ส่งเข้าคิว
2. Worker claim job แบบมี lease/idempotency; OCR ทำ extraction + engine ตาม ruleset ที่ตกลง เก็บผล/receipt snapshot และ event ลำดับขั้น
3. Portal ingest result แบบ transaction เดียว: dedup inbox → บันทึก immutable run → ตรวจ current version/round → เปลี่ยน current result/assignment → audit; ผลเก่ามาถึงทีหลังเก็บประวัติได้แต่ไม่ทับผลใหม่
4. คงหลัก query Oracle สูงสุดหนึ่งครั้งต่อ verification round และ skip เมื่อ critical line math ตามมาตรฐานที่รับรอง; ไม่ retry ทั้ง pipeline แบบมืด ๆ เมื่อ timeout เก็บ execution marker/snapshot และส่งสถานะ unknown/manual reconciliation ถ้าไม่ทราบว่าคำขอเดิมสำเร็จหรือไม่
5. การส่ง webhook/tag Paperless ล้มเหลวไม่ต้องรัน OCR ใหม่; retry เฉพาะ dispatch ด้วยผลเดิม มี outbox และ reconciliation ตรวจรายการที่ส่งไม่ครบ
6. การปิด browser ไม่ cancel job; SSE ใช้แจ้งความคืบหน้า PostgreSQL เป็นแหล่งสถานะสุดท้าย Redis/broker restart ต้อง recovery จาก job/outbox ได้

### AP และ duplicate

กำหนด business duplicate key ร่วมกับบัญชี: เริ่มเสนอ company/legal entity + supplier tax ID + normalized invoice number; ต้องยืนยันเรื่องปีงบ/credit note/เลขซ้ำต่างบริษัท ข้อความ mockup ใช้ supplier + invoice number จึงต้องบันทึกความต่างของ policy ไม่เพิ่ม invoice date เข้าคีย์เพียงเพื่อทำให้ตรวจไม่พบซ้ำ

รับเอกสารซ้ำเข้า queue ได้ แต่ serialize การตรวจและส่ง AP ต่อ business key ผ่าน DB lock/unique reservation ตรวจ duplicate ทั้ง Portal และ ERP ตาม contract ที่ทีม ERP รับรองก่อน enqueue การส่งซ้ำต้องใช้ submission idempotency key เดิม

เมื่อ ERP timeout หลังรับคำขอ ให้สถานะ `unknown` และค้นด้วย external correlation/reference ก่อน retry ถ้า ERP ไม่รองรับ idempotency/query reconciliation ต้องให้บัญชีตรวจด้วยคน ห้ามส่งอัตโนมัติซ้ำ `Posted` หมายถึง AP Interface รับรายการตาม acknowledgment ที่ตกลง ไม่ได้หมายถึงจ่ายเงินหรือ GL posting สำเร็จ

## 6. แผนพัฒนาและเกณฑ์ตรวจรับ

ทุกช่วงเป็นงานอนาคตและยังไม่เริ่ม; estimate เป็นกรอบวางแผนสำหรับทีม frontend 1, backend 1 พร้อม QA/บัญชี/ERP/infra ร่วม ไม่ใช่กำหนดส่งที่ยืนยันแล้ว ช่วงที่ dependency พร้อมอาจทำงานคู่ขนานได้

| Phase | งาน/ผู้รับผิดชอบหลัก | Dependency | เกณฑ์ผ่าน | กรอบเวลาเบื้องต้น |
|---|---|---|---|---|
| 0: ตกลง contract | BA+บัญชี+backend: rule catalog 6.6 เทียบ code, RBAC, duplicate/AP semantics, Oracle Receiver query, workload | เจ้าของมาตรฐาน/ERP/Entra | ปิดคำตัดสินสำคัญ G-01–07; มี synthetic golden cases และ API/schema ที่ review แล้ว | 1–2 สัปดาห์ |
| 1: UI foundation | frontend: React/TS/Vite, tokens/components, routes, fixtures, loading/error states | mockup; เริ่มได้ก่อน API จริง | UI-01–15 แสดงครบ, ทุก role demo ได้, visual review desktop/จอแคบ; ไม่มี production role switch | 1–2 สัปดาห์ |
| 2: Identity/data | backend+frontend: Entra, DB migrations, server scope, queue/detail/KPI, read-only OCR adapter | Phase 0/1, test tenant | cross-company/Receiver/ADM denial ผ่าน; reload ข้อมูลคงเดิม; no fabricated receipts | 2–3 สัปดาห์ |
| 3: Workflow/OCR/DMS | backend+frontend: actions, jobs/rounds, evidence, real viewer, mapping, audit | Phase 2, OCR contract ที่ครบ | action matrix + crash/retry tests ผ่าน; PDF evidence เปิดหน้าถูก; audit/approval version ถูกต้อง | 2–3 สัปดาห์ |
| 4: AP integration | backend+ERP+บัญชี: duplicate, SoD, AP adapter, reconcile | Phase 3, ERP sandbox/contract | ผู้ยืนยันส่งเองไม่ได้; concurrent post ไม่ซ้ำ; timeout ไม่แกล้งสำเร็จ; ERP sandbox accepted | 1–2 สัปดาห์ |
| 5: UAT/pilot | QA+infra+บัญชี: security/performance/backup/runbook, pilot company | ทุก gate ที่เกี่ยวข้อง | UAT signed off, restore/recovery ผ่าน, monitoring/rollback พร้อมก่อนขยายบริษัท | 1–2 สัปดาห์ |

เริ่มจาก vertical slice: login → scoped queue → เปิด detail 6 tabs → DMS → confirm พร้อม audit จากนั้นเพิ่ม rerun และ AP ตามลำดับ เปิดใช้งานอ่านอย่างเดียวได้ก่อนส่ง AP โดย feature flag ต้องตรวจใน backend ด้วย

### ชุดทดสอบและ acceptance scenarios

| กลุ่ม | สิ่งที่ต้องพิสูจน์ |
|---|---|
| UI parity | header/scope/KPI/queue/6 tabs/modal/สี/ฟอนต์/sticky actions; screenshots ที่ viewport เดียวกับ baseline; keyboard และไทยไม่ล้น |
| RBAC | EU คนอื่น/ต่างบริษัท/ไม่มี Receiver/unmapped ไม่เห็น; ACC/APR เห็นตามบริษัท; ADM เปิด document/JSON/PDF ไม่ได้; count/search ไม่รั่ว |
| Rules contract | ทุก V-01–09, not_evaluated/manual, version/code collision, E28 skip Oracle ตาม legacy rules; 6.6 ต้องใช้ code ตาม catalog ที่รับรอง |
| Data correctness | null receipt ไม่แสดง matched/pass; multi-PO/multi-receipt, quantity reuse, ambiguous lines/Receiver; decimal/rounding boundaries |
| Human actions | explain/return routing, high confirm ต้อง note, stale version=409, terminal actions ถูกปฏิเสธ, rerun ไม่แก้ประวัติเดิม |
| DMS | session หมดอายุ 10 นาที/ต่าง user/สิทธิ์ถูกถอน/duplicate นอก scope เปิดไม่ได้; evidence page และ watermark/audit ถูกต้อง |
| Reliability | refresh/disconnect/worker crash/broker restart/webhook ซ้ำ/out-of-order ไม่ทำงานหรือเปลี่ยนสถานะซ้ำ; dispatch retry ไม่เรียก OCR ซ้ำ |
| AP | แยกผู้ยืนยัน/ผู้ส่ง, recheck duplicate, pending ไม่ใช่ Posted, double-click/concurrent requests/timeout และ reconciliation |
| Operations | dependency outage ไม่ auto-pass; readiness/liveness ไม่ยิง Oracle query หนักถี่ ๆ; restore DB และเปิด queue ต่อได้ |

ใช้ Vitest/Testing Library สำหรับ component ที่มี behavior, Playwright สำหรับ workflows และ visual baseline, pytest สำหรับ domain/authorization/transactions และ contract tests ใช้ synthetic fixtures; live tests ต้องรันใน sandbox ที่มีสิทธิ์และข้อมูลทดสอบ ผล README เดิมไม่ใช้แทนผลทดสอบของ release ใหม่

Performance budget เริ่มเสนอ: queue/detail p95 ไม่เกิน 2 วินาทีที่ 50 concurrent users และ 100,000 document metadata records, KPI scope ถูกต้อง, job acknowledgment ไม่เกิน 1 วินาทีในเครือข่ายทดสอบ; เป็นเป้าหมายให้ยืนยันใน Phase 0 ไม่ใช่ผลวัดจริง OCR duration แยกวัดตาม pages/model และไม่เอามาปน API latency

## 7. การย้ายขึ้นใช้งานและ rollback

- เก็บ HTML เดิมเป็น reference; synthetic fixtures ต้องไม่ถูกนำเข้า production database
- นำเข้าเอกสารจริงจาก Paperless/OCR ผ่าน ingestion ที่ทำซ้ำได้ เก็บ source IDs และ version; reconcile จำนวน/สถานะรายบริษัทก่อนเปิด queue
- deploy migrations แบบเข้ากันได้ย้อนหลัง, backup ก่อน release และ dry-run ใน staging; เปิด pilot บริษัทที่ได้รับเลือกและเริ่ม read-only
- เปิด workflow หลังรับรอง rules/scope; เปิด AP หลัง sandbox tests และบัญชีตรวจรับเท่านั้น
- rollback UI/API ผ่าน image รุ่นก่อนและ feature flags; หยุดสร้าง AP submission ใหม่ได้ แต่ต้อง reconcile งานที่ส่งออกไปแล้ว ห้าม rollback DB แล้วทำให้ลืมว่าเคยส่ง AP
- คู่มือ support ต้องมี stuck job, unknown AP, unmapped Receiver, unknown company, DMS unavailable, incompatible ruleset และการถอนสิทธิ์ผู้ใช้

## 8. คำตัดสินที่ยังต้องยืนยันเมื่อเริ่มพัฒนา

| เรื่อง | เจ้าของคำตอบ | ช่วงที่ต้องได้คำตอบ |
|---|---|---|
| มาตรฐานฉบับใช้งานจริง, tolerance, exception mapping/override และ partial quantity | บัญชี/เจ้าของมาตรฐาน | Phase 0 ก่อน live verification workflow |
| Receiver/EMPLOYEE_ID query และการมอบหมายเมื่อหลายผู้รับ | ERP+บัญชี | Phase 0 ก่อนเปิด EU scope |
| Entra tenant/app registrations/roles และสิทธิ์ดู account directory/audit | IT identity+เจ้าของข้อมูล | Phase 0–2 |
| AP transport/acknowledgment/duplicate key/idempotency/reconciliation | ERP+บัญชี | ก่อน Phase 4 |
| Duplicate resolution นอกเหนือจาก reject; credit note และหลายสกุลเงิน | บัญชี | ก่อน workflow/AP ที่เกี่ยวข้อง |
| DMS versioning, watermark/download policy, retention/backup, RPO/RTO | DMS+security+infra | ก่อน Phase 3/production |
| จำนวนเอกสารต่อวัน/จำนวนหน้า/concurrency/hosting platform | Product owner+infra | Phase 0 สำหรับ sizing |

ประเด็นเหล่านี้ไม่ขวางการเริ่มแยก UI และสร้าง fixtures ตาม mockup แต่เป็น gate ก่อนเปิดความสามารถจริงที่ขึ้นกับคำตอบ
