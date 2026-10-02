# Receiving API v1.0

อัปเดต 2026-10-02T10:07:32+07:00 · รับผลจากระบบอื่น แสดง PDF และเก็บ workflow action เป็นคำขอสำหรับระบบต้นทาง

## Authentication และที่อยู่

Base URL ในเครื่อง: `http://127.0.0.1:8010/api/portal/v1`

- Local mode: ไม่มี keys และรับเฉพาะ loopback ใช้พัฒนาในเครื่องเท่านั้น
- Shared-key mode: ตั้งทั้ง `PORTAL_API_KEY` และ `PORTAL_INGEST_KEY`; ส่ง `Authorization: Bearer <key>`
- Ingestion key ใช้ `/ingest`, `/schema`, POST PDF และ action outbox/acknowledgement; อ่านเนื้อหาเอกสารผ่าน read API ไม่ได้
- Portal key ใช้ read APIs, `/imports`, POST PDF และ document actions; ผู้ใช้ workspace รุ่นนี้มีสิทธิ์เท่ากันทั้งหมด ยังไม่มี identity/RBAC
- API ตั้งใจไม่เปิด CORS; browser ใช้ origin เดียวหรือ Vite proxy Backend-to-backend ไม่ต้องใช้ CORS
- Download contract จาก `GET /schema` หรือ OpenAPI ที่ `/api/openapi.json` และ Swagger `/api/docs`

## Snapshot JSON

ใช้ [ตัวอย่างเต็ม](../examples/invoice.json) ห้ามส่ง array/batch ใน request เดียว ขนาด request JSON ไม่เกิน 2 MB ต้องมี Content-Length; producer ควรส่งด้วย HTTP client ปกติที่คำนวณ header ให้

| Field | Required | ความหมาย |
|---|---|---|
| schema_version | ใช่ตาม contract (server default 1.0) | รับเฉพาะ `1.0` |
| event_id | ใช่ | unique ต่อ source_system; ใช้ค่าเดิมเมื่อ retry payload เดิม |
| source_system | ใช่ | ชื่อ producer เช่น OCR; เป็น key ของ namespace ต้องใช้คงที่ |
| external_id | ใช่ | รหัสเอกสารต้นทางเป็น string; unique ร่วมกับ source_system |
| revision | ใช่ | integer ≥1 และต้องสูงกว่าที่เก็บอยู่เมื่อ update |
| standard_version | ใช่ | รุ่นมาตรฐานของผลตรวจ เช่น 6.2/6.6; ไม่ใช่ schema version ของ Portal |
| status | ใช่ | Auto-pass / Review / Hold / Manual Review / Duplicate / Confirmed / Posted / Rejected |
| invoice | ใช่ | invoice_num, supplier_name, company จำเป็น; date/PO/release/tax IDs/totals optional |
| invoice.currency | ค่าเริ่มต้น THB | ISO-style uppercase 3 ตัว; ตรวจ currency ที่ producer ให้ถูกต้อง |
| receipt | ไม่ | receipt_num, org_id, receiver, receipt_total; ไม่มีข้อมูลให้ null |
| lines | ไม่ | description จำเป็นต่อแถว; quantity/uom/unit_price/amount/receipt_line/receipt_qty/receipt_price/match_level optional |
| rules | ไม่ | rule_id V-01..V-09; result pass/fail/manual_review/not_evaluated; exception_code/severity/evidence/page optional |
| note | ไม่ | ข้อความประกอบจากต้นทาง สูงสุด 4,000 ตัวอักษร |

ทุก model ปฏิเสธ unknown fields เพื่อให้ producer รู้ว่าข้อมูลใดจะไม่ถูกจัดเก็บ จำนวนเงิน/จำนวนสินค้าใช้ decimal string (แนะนำ) รองรับ 20 หลักรวมและทศนิยมสูงสุด 6 ตำแหน่ง ไม่รับ NaN/Infinity ข้อมูลต้นฉบับ normalized เก็บโดยไม่คำนวณผลตรวจใหม่

ไม่บังคับผลตรวจครบ 9 rules เพราะ Portal รองรับ partial snapshots; UI แสดง “ไม่มีข้อมูล” ถ้าไม่ได้รับ ห้าม producer ใส่ PASS เพื่อเติมช่องว่าง Rules มีได้หลายรายการต่อ rule ID เพื่อเก็บหลาย exception ห้ามอ้าง `standard_version=6.6` แล้วส่ง codes ของ 6.2

### ส่ง JSON

```powershell
# จาก invoice-web (local mode; shared-key mode เพิ่ม Authorization header)
curl.exe -X POST http://127.0.0.1:8010/api/portal/v1/ingest -H "Content-Type: application/json" --data-binary "@examples/invoice.json"
```

Response 201:

```json
{"id":"<portal-uuid>","revision":1,"duplicate":false}
```

ส่ง event เดิม+payload เดิม ได้ id/revision ของ event เดิมและ `duplicate:true` แม้มี revision ใหม่กว่าอยู่ในระบบแล้ว ส่ง event เดิมแต่ payload ต่างกันได้ 409 ส่ง event ใหม่แต่ revision ไม่ใหม่กว่าได้ 409 กรณีชนกันพร้อมกันอาจตอบ 409 ให้ retry event เดิมหลัง backoff

### ส่ง PDF แยก

```powershell
curl.exe -X POST "http://127.0.0.1:8010/api/portal/v1/documents/<portal-uuid>/pdf?revision=1" -F "file=@examples/invoice.pdf;type=application/pdf"
```

ใช้ multipart field `file` โดย revision ต้องมีอยู่ในประวัติ JSON ของเอกสาร รับ PDF สูงสุด 20 MB และ 1–500 หน้า ไม่รับ encrypted/unreadable PDF และปฏิเสธ active action บางประเภทที่ root catalog; **ไม่ใช่ antivirus scanner** การส่งไฟล์ซ้ำจะแทนเฉพาะ PDF ของ revision นั้น ส่วนไฟล์ของ revision อื่นยังเปิดย้อนหลังได้

JSON และ PDF เป็นคนละ transaction หาก JSON สำเร็จแต่ PDF ล้มเหลว ให้ retry เฉพาะ PDF ไม่ต้องสร้าง document ใหม่ ถ้า JSON revision ล่าสุดยังไม่มี PDF UI ปัจจุบันใช้ PDF revision ก่อนหน้าที่มีอยู่พร้อมแสดง stale warning ส่วนการเปิด revision ย้อนหลังใช้ PDF ที่ตรง revision เท่านั้น

ระบบไม่รับ pdf_url และไม่ไป fetch host ที่ producer ระบุ ช่วยเลี่ยงปัญหา network permissions/SSRF ตั้งแต่ boundary นี้ หากต้องเชื่อม DMS โดย URL ให้ทำ allowlisted adapter ใน phase ถัดไป

## Read API และ utility

| Method/path | รายละเอียด |
|---|---|
| GET `/health` | health/mode/schema ไม่ยิง OCR/Oracle |
| GET `/session` | ตรวจ Portal key และบอก permissions ของ workspace |
| GET `/documents?q=&company=&source=&status=&page=1&page_size=25` | รายการ, total, counts, companies, sources; max page_size=100 |
| GET `/documents/{id}?revision=` | current snapshot หรือ historical snapshot ที่ระบุ พร้อม PDF metadata, `current_revision`, `is_current` และรายการ revisions |
| GET `/documents/{id}/revisions` | revision index เรียงใหม่ไปเก่า พร้อม status, เวลารับ และสถานะ PDF ของแต่ละรุ่น |
| GET `/documents/{id}/history` | latest 100 activity records; ไม่ใช่ full compliance audit export |
| GET `/documents/{id}/revisions/{revision}` | immutable snapshot ของ revision นั้น |
| GET `/documents/{id}/pdf?revision=` | PDF binary ของ revision ที่ระบุ; ถ้าไม่ระบุจะใช้ PDF ล่าสุดที่ไม่ใหม่กว่า current JSON และส่ง stale metadata ผ่าน document detail |
| GET `/audit-events?q=&kind=&page=1&page_size=50` | persistent receive/PDF events พร้อมข้อมูลเอกสาร; ค้นหา กรองประเภท และแบ่งหน้า |
| POST `/documents/{id}/actions` | บันทึก explain/resubmit/rerun/return/reject/hold/confirm พร้อม optimistic version และ idempotency |
| GET `/action-requests?status=pending&source_system=&page=1&page_size=50` | integration outbox ให้ระบบต้นทางอ่านคำขอที่รอดำเนินการ |
| POST `/action-requests/{action_id}/ack` | ระบบต้นทางตอบรับ resubmit/rerun เป็น accepted หรือ failed |
| POST `/imports` | manual import ด้วย Portal key; ใช้ contract เดียวกับ ingest |
| GET `/schema` | JSON Schema ของ request |

`counts` ใช้ search/company/source filters แต่ไม่ใช้ status เพื่อให้เปรียบเทียบ KPI ได้ `total` ใช้ status ด้วย รายการเรียง updated_at จากใหม่ไปเก่า PDF attachment ไม่เปลี่ยนเวลารับ JSON; history เก็บเวลาการแนบแยก

`GET /session` ส่ง `capabilities` เพื่อให้ UI แสดงสิ่งที่เปิดใช้จริง รุ่น shared-key ยังไม่มี actor/role รายบุคคล ดังนั้น action/audit ระบุผู้ทำเป็น shared-key session ไม่แต่งชื่อผู้กระทำขึ้นมาเอง

## Document action และ outbox

Portal แยก `workflow.status` ออกจาก `snapshot.status` เสมอ ผลตรวจและ exception ใน snapshot เป็นหลักฐานจากระบบต้นทางและไม่ถูกแก้เป็น PASS เมื่อกดปุ่มในเว็บ

```json
{
  "request_id": "client-generated-uuid",
  "action": "resubmit",
  "reason_code": "signature_added",
  "note": "แก้ไขเอกสารต้นทางแล้ว",
  "new_receipt_num": null,
  "expected_revision": 2,
  "expected_workflow_version": 0
}
```

- `request_id` ใช้ idempotency; ค่าเดิมกับ body เดิมคืนผลเดิม ค่าเดิมแต่ body ต่างตอบ 409
- `expected_revision` และ `expected_workflow_version` ป้องกันตัดสินใจบนหน้าจอเก่า
- reason code ต้องอยู่ในรายการที่ document detail ส่งผ่าน `workflow.available_actions`; confirm ที่มี High severity ต้องมี note
- explain/return/hold/reject/confirm ถูกบันทึกเป็น workflow decision ใน Portal
- resubmit/rerun สร้าง request สถานะ pending ใน outbox; Portal แสดง “รอผลตรวจรอบใหม่” และไม่อ้างว่าตรวจสำเร็จ
- เมื่อ producer ส่ง snapshot revision ใหม่ ระบบปิด request เป็น completed และคำนวณผู้รับผิดชอบรอบถัดไปจาก payload ใหม่
- endpoint ack รับ `{"result":"accepted|failed","detail":"..."}`; accepted ยังรอ revision ใหม่ ส่วน failed ส่งงานกลับฝ่ายบัญชี

Action ที่เปิดใน pilot: `explain`, `resubmit`, `rerun`, `return`, `reject`, `hold`, `confirm` ส่วน `post` ยังไม่เปิดจนกว่าจะมี AP acknowledgement contract และ separation of duties จาก identity จริง

## Error / retry

| HTTP | ความหมาย | producer ควรทำ |
|---|---|---|
| 401 | key ผิด/ไม่มี key | แก้ credential ไม่ retry แบบเดิม |
| 403 | browser origin ไม่อนุญาตหรือไม่ใช่ loopback ใน local mode | แก้ deployment/access |
| 404 | ไม่พบเอกสาร/PDF/revision | ตรวจ id หรือแนบ PDF |
| 409 | duplicate event ที่ payload ต่าง / revision เก่า / workflow version เก่า / action ใช้ไม่ได้ในสถานะปัจจุบัน | โหลด current state; retry id เดิมเฉพาะ request เดิม |
| 411 | ไม่มี Content-Length | ใช้ fixed-length request |
| 413 | ข้อมูล/ไฟล์ใหญ่เกิน | ลดขนาด/แบ่งเอกสารที่ต้นทาง |
| 422 | schema หรือ PDF ไม่ถูกต้อง | แก้ตาม detail; ไม่มี payload เต็มสะท้อนกลับใน error |
| 5xx / timeout | service error หรือผลส่งไม่แน่ชัด | retry event_id เดิมด้วย exponential backoff; PDF retry ด้วย document id และ revision เดิม |

ตัวอย่าง validation response: `{"detail":[{"loc":["body","invoice","invoice_num"],"msg":"Field required","type":"missing"}]}`

## OCR service เดิม

`backend/convert_table9.py` รับ core Table9 หรือ wrapper `VerificationResponse.data` โดยผู้เชื่อมต่อระบุ source/external/event/company เอง เก็บ standard_version เดิม และ codes ตามต้นทาง; ถ้าไม่มี version จะ reject ไม่เดาให้

Table9 เดิมไม่มี receipt/line matches/evidence page ครบ ตัวแปลงจึงไม่สร้างข้อมูลดังกล่าว ต้องขยาย producer หากต้องการแสดงครบ ไฟล์ `/fe` SSE projection ไม่รองรับผ่าน adapter นี้เพราะมี fallback receipt fields ใน source เดิม

## ก่อนใช้ข้อมูลจริงหลายผู้ใช้

เพิ่ม Entra OIDC, user/company/receiver authorization, durable audit identity, rate limiting และ malware scanning; เลือก PostgreSQL+migrations/backups และ storage ที่องค์กรรับรอง SQLite รุ่นนี้เหมาะ local pilot ไม่ใช่ผลรับรอง multi-user production
