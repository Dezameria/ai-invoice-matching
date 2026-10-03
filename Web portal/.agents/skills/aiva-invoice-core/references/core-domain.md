# AIVA Invoice Matching — Core Domain Reference

เอกสารนี้สรุปแก่นของระบบจาก Mockup v4.4, OCR service และ docs ณ 2026-10-03 มีไว้ช่วยออกแบบและพัฒนาต่อ ไม่ใช่มาตรฐานบัญชีที่รับรองแล้ว

## 1. ขอบเขตระบบหลัก

กระแสข้อมูลหลัก:

`Invoice/PDF -> OCR/Vision extraction -> normalize -> document rules -> Oracle receipt lookup -> 3-way match -> versioned result snapshot -> Portal review/actions -> upstream rerun/resubmit/AP integration`

ขอบเขตความรับผิดชอบ:

- OCR/Vision: อ่าน field, line, page และลายเซ็นจากเอกสาร
- Rules engine: normalize, คำนวณ, เทียบ master/receipt และตัดสินผลแบบ deterministic
- Oracle/Master data: ให้ PO/receipt/entity facts; ไม่ใช้ค่าที่ UI สร้างแทน
- Portal: รับ snapshot, PDF และ revision; แสดง evidence; เก็บ human workflow/audit; ไม่รัน OCR หรือ matching ใหม่
- Human workflow: อธิบาย ส่งใหม่ ตรวจใหม่ คืน ระงับ ปฏิเสธ หรือยืนยัน โดยไม่แก้ snapshot ต้นทาง

สถานะต้องแยก 3 แกน:

- Verification: `Auto-pass`, `Review`, `Hold`, `Manual Review`
- Workflow: เช่น pending review, confirmed, rejected, awaiting new revision
- Processing/job: เช่น queued, running, failed, completed

`Duplicate`, `Confirmed`, `Posted`, `Rejected` เป็นสถานะที่ Portal รองรับ แต่ไม่ใช่ผล 4 แบบของ OCR rules engine

## 2. Field หลักที่ระบบควรรู้จัก

### 2.1 Identity, version และ traceability

| Field | ความหมาย / requirement |
|---|---|
| `schema_version` | รุ่น contract ของ receiver; Portal ปัจจุบันรับ `1.0` |
| `event_id` | idempotency key ต่อ `source_system`; retry payload เดิมใช้ค่าเดิม |
| `source_system` | namespace ของ producer ต้องใช้ชื่อคงที่ |
| `external_id` / `doc_id` | รหัสเอกสารต้นทาง; อย่าสับสนกับ Portal UUID |
| `revision` / `validation_round` | รุ่น snapshot และรอบตรวจ; นิยามความสัมพันธ์ให้ชัด |
| `standard_version` | รุ่นมาตรฐาน/ผลตรวจ เช่น `6.2`; ไม่ใช่ Portal schema version |
| `engine_version` / `rule_catalog_version` | ควรมีเมื่อเปิดหลาย ruleset เพื่อแปล code ได้ถูกต้อง |
| `timestamp` / received/updated time | ใช้ audit และลำดับเหตุการณ์; ต้องมี timezone |
| `status` | ผลจากต้นทางตาม enum ที่ contract ระบุ |

### 2.2 Invoice header

| Field | OCR core | Portal snapshot | หมายเหตุ |
|---|---:|---:|---|
| `invoice_num` | required โดย V-01 | required | normalize whitespace/case โดยไม่ทำลายค่าต้นฉบับที่ต้อง audit |
| `invoice_date` | required โดย V-01 | optional ใน receiver | รองรับ พ.ศ./ค.ศ.; normalized ปัจจุบันเป็น `DD/MM/YYYY` |
| `supplier_name` | required โดย V-01 | required | เก็บชื่อจากเอกสาร |
| `supplier_tax_id` | required โดย V-01 | optional ใน receiver | OCR code รับเฉพาะตัวเลข 13 หลัก; entity ต่างประเทศต้องมี policy แยก |
| `customer_name` | required โดย V-01 | แทนด้วย `company` required | ต้องมี mapping ที่ตรวจสอบได้ |
| `customer_address` | requiredต่อ V-05 | ยังไม่มีใน Portal v1 | ใช้เทียบสำนักงานใหญ่/สาขา |
| `customer_tax_id` | required โดย V-01 | optional ใน receiver | เทียบ master entity |
| `po_number` | required โดย V-01 | optional ใน receiver | OCR ปัจจุบันเก็บเลขท้ายสูงสุด 8 หลัก |
| `release_num` | ไม่มีใน OCR core | optional | แสดงจาก upstream เท่านั้น |
| `currency` | default `THB` | 3 ตัวอักษร uppercase | ต้องตรวจ currency ก่อนคำนวณข้ามแหล่ง |
| `sub_total` | ใช้ V-03/V-09 | optional | ใช้ decimal ใน boundary ธุรกิจ |
| `vat` | ใช้ V-03 | optional | engine ปัจจุบันคาด VAT 7% |
| `grand_total` | ใช้ V-03 | optional | `sub_total + vat` |
| `po_type` | default `Purchase Order` | ยังไม่มีใน Portal v1 | ใช้แยก logic หากรองรับชนิดอื่น |
| `pages_complete` | ใช้ V-01/V-06 | PDF metadata แยก | ต้องยืนยันทุกหน้าที่จำเป็นถูกอ่าน |

### 2.3 Invoice line

| Field | ความหมาย |
|---|---|
| `line_no` | ลำดับบรรทัดต้นทาง; จำเป็นต่อ evidence และ fallback matching |
| `item_code` | ควรเพิ่มเป็น field แยก; engine ปัจจุบันค้น code ใน description |
| `description` | รายละเอียดสินค้า/บริการ; Portal บังคับต่อแถว |
| `qty` / `quantity` | จำนวนที่วางบิล |
| `uom` | หน่วยนับ normalized เช่น PCS, KG, SHT, JOB, CYL, TRIP |
| `unit_price` | ราคาต่อหน่วยใน invoice |
| `amount` | ยอดต่อบรรทัด |
| `receipt_line` | บรรทัด receipt ที่จับคู่ |
| `receipt_qty` | จำนวนรับจริงของบรรทัดที่จับคู่ |
| `receipt_price` | ราคา ERP/receipt ของบรรทัดที่จับคู่ |
| `match_level` | วิธีจับคู่ เช่น item, line, description; ต้องบอก ambiguity ได้ |

ควรมี match evidence ที่ชี้ invoice line, receipt/PO line, method, candidate count และเหตุผล ไม่ให้ UI จับคู่เอง

### 2.4 Signature และ document evidence

| Field | ความหมาย |
|---|---|
| `signatures.supplier_or_deliverer.present/page` | พบลายเซ็นผู้ส่งและหน้าที่พบ |
| `signatures.receiver.present/page` | พบลายเซ็นผู้รับและหน้าที่พบ |
| `rule.evidence` | ข้อเท็จจริงสั้นที่รองรับผลกฎ ไม่ใส่ข้อมูลลับ |
| `rule.page` | หน้า PDF สำหรับ deep link; Portal รับ 1–500 |
| PDF revision metadata | ต้องผูกกับ snapshot revision และบอก stale PDF ให้ผู้ใช้ทราบ |

### 2.5 Oracle receipt / entity facts

ขั้นต่ำสำหรับ matching:

- `PO_NUMBER`, `RECEIPT_NUM`, `LINE_NUM`
- `ITEM_NUMBER`, `ITEM_DESCRIPTION`
- `QUANTITY_RECEIVED`, `UNIT_MEAS_LOOKUP_CODE`, `UNIT_PRICE`, `LINE_TOTAL`
- `ORG_ID`, `OU_ORG_ID`, `OU_NAME`
- `RCV_INV_NUM`, `AP_INV_NUM`
- `CUSTOMER_POSTAL`, `CUSTOMER_LOC_CODE`
- `SUPPLIER_NAME`, `SUPPLIER_TAX_ID`

Portal summary ใช้ `receipt_num`, `org_id`, `receiver`, `receipt_total`; ค่าเหล่านี้ต้องมาจาก source ที่ตรวจสอบได้ ปัจจุบัน OCR model ยังไม่มี Receiver/EMPLOYEE_ID จึงยังบังคับ ownership แบบ production ไม่ได้

Master entity ขั้นต่ำ: `org_id`, `ou_id`, entity name, tax ID, status, postal/branch identifiers และ address. ถ้า entity ไม่พบ/ไม่ active/กำกวม ให้ Manual Review

### 2.6 Rule result และ exception

| Field | Requirement |
|---|---|
| `rule_id` | `V-01` ถึง `V-09` |
| `result` | OCR: `PASS/FAIL/MANUAL/not_evaluated`; Portal: `pass/fail/manual_review/not_evaluated` |
| `exception_code` | แปลร่วมกับ standard/rule version ห้ามแปลเดี่ยว |
| `severity` | `Low`, `Medium`, `High` |
| `details/evidence/page` | เหตุผลและตำแหน่งหลักฐาน |
| decision `assigned_to` | OCR ปัจจุบันเป็น `user/accounting`; production ต้อง map กับ identity/role จริง |
| decision `halted_by` | rule ที่หยุดขั้นต่อไป เช่น V-02 |
| decision `manual_review` | ระบุ fail-safe/manual path แยกจาก exception |

OCR Table 9 ต้องมีครบ 9 rule โดย rule ที่ไม่ได้รันเป็น `not_evaluated`; Portal receiver อนุญาต partial rules และต้องแสดง “ไม่มีข้อมูล” ห้ามเติม PASS

### 2.7 Workflow, access และ audit

Action request หลัก:

- `request_id`, `action`, `reason_code`, `note`
- `new_receipt_num` เป็น hint เท่านั้น ต้องตรวจ Oracle ใหม่
- `expected_revision`, `expected_workflow_version` สำหรับ optimistic concurrency
- action ปัจจุบัน: `explain`, `resubmit`, `rerun`, `return`, `reject`, `hold`, `confirm`

ทุก mutation ต้องเก็บ actor immutable ID, เวลา, action, reason, before/after version, document/revision และผลสำเร็จ/ล้มเหลว. ห้ามใช้ชื่อแสดงผลเป็น identity key

## 3. กฎ V-01 ถึง V-09 ตาม engine ปัจจุบัน (Standard 6.2 as-built)

| Rule | การตรวจจริง | เกณฑ์/ผลหลัก |
|---|---|---|
| V-01 | ความครบถ้วนของ header, lines และ pages | ขาด supplier/customer name+tax ID, invoice num/date, PO, lines หรือหน้าไม่ครบ -> `E13` Medium |
| V-02 | คณิตศาสตร์รายบรรทัด | `abs(qty * unit_price - amount) <= 0.50`; เกิน -> `E28` High และหยุดก่อน Oracle |
| V-03 | คณิตศาสตร์ทั้งเอกสาร | sum lines vs subtotal <= 0.50; VAT 7% diff <= 1.00; subtotal+VAT vs grand <= 0.50; เกิน -> `E31` High; ต่างแต่ในกรอบ -> `E16` Low |
| V-04 | active receipt | ไม่มี receipt qty > 0 -> `E17`; หลาย receipt number -> `E35`; rows >= 50 -> MANUAL |
| V-05 | customer entity | map `ORG_ID` ไป active master, tax ID exact และ postal/branch อยู่ใน address; tax/address mismatch -> `E09`; master ไม่พร้อม -> MANUAL |
| V-06 | ลายเซ็น | receiver หาย -> `E26` High; supplier/deliverer หาย -> `E26` Medium; หน้าไม่ครบถูกจัดการที่ V-01 |
| V-07 | line/price/UOM match | item code ใน description -> line number -> description token -> first active row fallback; ไม่พบ `E30`; ราคาเกินกรอบ `E05`; UOM ต่าง `E12`; ราคา diff <=1% และ <=200 -> `E29` Low |
| V-08 | quantity | invoice qty > received -> `E06` High; น้อยกว่า -> `E34` Medium partial billing |
| V-09 | receipt total | `abs(invoice subtotal - sum(received qty * receipt unit price)) <= 0.50`; เกิน -> `E31` High |

ข้อควรระวังก่อน production:

- V-07 fallback ไป receipt แถวแรกอาจจับคู่ผิดและใช้ receipt row ซ้ำ ต้องเพิ่ม ambiguity/one-to-one policy และ golden cases
- V-05 ใช้ substring ของ postal/branch ใน address จึงยังไม่ใช่ address validation ที่แข็งแรง
- Vision แปลง PDF สูงสุด 4 หน้า แต่ Portal รับ PDF ได้ถึง 500 หน้า; ต้องกำหนด page coverage และ `pages_complete` ให้ไม่ Auto-pass เอกสารที่อ่านไม่ครบ
- ใช้ float ใน OCR core แต่ Portal ใช้ Decimal; งานการเงินควรกำหนด rounding/precision ที่ boundary ให้ชัด

## 4. Decision และ routing ปัจจุบัน

ลำดับ decision ของ engine:

1. มี `manual_review=True` -> `Manual Review`
2. มี exception High -> `Hold`
3. มี exception Medium -> `Review`
4. อื่น ๆ -> `Auto-pass` (Low exception ยัง Auto-pass)

Assignment ปัจจุบัน:

- Auto-pass -> ไม่มีผู้รับผิดชอบ
- ถ้ามี code ใน `E06,E12,E13,E17,E26,E34,E35` -> `user`
- นอกนั้น -> `accounting`

Dependency error, schema/version mismatch, ambiguous match หรือข้อมูลที่ต้องใช้ตัดสินใจไม่ครบ ต้อง fail-safe เป็น Manual Review/Hold; ห้าม Auto-pass

## 5. Requirement หลัก

### Must-have เชิงข้อมูลและกฎ

- schema ปฏิเสธ unknown fields ที่ boundary สำคัญและตรวจ enum/length/precision
- เก็บ raw/source reference แยกจาก normalized values และผลคำนวณ
- ทุกผล rule ย้อนกลับไปหา input/evidence และ version ที่ใช้ได้
- Oracle query ไม่เกินหนึ่งครั้งต่อเอกสารตาม design ปัจจุบัน และ bypass เมื่อ V-02 พบ E28
- ไม่ใช้ข้อมูลสมมติแทน receipt/entity/receiver/match/evidence
- รองรับ revision แบบเพิ่มขึ้นและเก็บ snapshot เก่าแบบ immutable
- JSON กับ PDF อาจมาคนละ transaction; retry แยกได้โดยไม่สร้างเอกสารซ้ำ

### Must-have เชิง workflow/integration

- ingest และ action มี idempotency; payload เดิมคืนผลเดิม ส่วน key เดิมแต่ body ต่างต้อง conflict
- ใช้ optimistic version; หน้าจอเก่าต้องได้ 409 และโหลดสถานะใหม่
- resubmit/rerun สร้างคำขอ durable และยังไม่ถือว่าสำเร็จจน snapshot revision ใหม่มาถึง
- confirm/hold/reject ไม่แก้ rule results หรือ exceptions ใน source snapshot
- AP post ต้องมี acknowledgement และ separation of duties; ยังไม่เปิดจาก shared-key pilot
- error response/log ห้ามสะท้อน credential หรือ invoice payload เต็ม

### Must-have ก่อน multi-user production

- identity จริง เช่น Entra tenant/object ID; RBAC และ company/receiver mapping ที่ backend
- ตรวจสิทธิ์ทุก list/count/search/detail/JSON/history/PDF/action/audit route รวม direct URL
- ผู้ยืนยันกับผู้ส่ง AP ต้องเป็นคนละ immutable identity
- durable database/migrations/backups, approved object storage/retention/legal hold
- rate limit, malware scan, observability, timeout/retry/dead-letter และ disaster recovery
- rule catalog/version mapping ที่เจ้าของมาตรฐานรับรอง พร้อม non-overridable/overridable policy

## 6. ความขัดแย้งที่ต้องไม่เดา

| หัวข้อ | docs/mockup บางส่วน | code/contract ปัจจุบัน |
|---|---|---|
| Standard | Mockup มี 6.6/1.5 | OCR engine 6.2; Portal schema 1.0 |
| V-01 codes | docs แจก E05–E09 ตาม field | engine รวมเป็น E13 |
| V-03 codes | docs ระบุ E27/E29 | engine ใช้ E31 และ E16 |
| V-05 codes | docs ระบุ E15/E16 | engine ใช้ E09 |
| V-07/V-08/V-09 | docs ระบุ E19/E21/E22 และ V-09 เป็นราคา | engine ใช้ E05/E06/E31 และ V-09 เทียบ subtotal receipt |
| Table 9 | docs ตัวอย่างเป็น rules object/lowercase | model จริงเป็น rules array และ status casing แบบ title |
| Input API | docs ตัวอย่าง `header/line_items/totals` | normalizer/code หลักใช้ `invoice/lines/signatures` พร้อม aliases บางส่วน |
| Rule completeness | OCR output บังคับครบ 9 | Portal ingest รองรับ partial snapshot |

เมื่อต้องเปลี่ยนจุดเหล่านี้ ให้เลือก ruleset ที่รับรอง สร้าง versioned adapter และ contract/golden tests; ห้าม relabel legacy data ให้เป็นรุ่นใหม่

## 7. แหล่งอ้างอิงหลักใน repository

- `OCR service/n8n/app/core/models.py`
- `OCR service/n8n/app/core/rules.py`
- `OCR service/n8n/app/core/master_data.py`
- `OCR service/n8n/app/services/vision_extractor.py`
- `Web portal/invoice-web/backend/app/domain/documents/schemas.py`
- `Web portal/invoice-web/backend/app/domain/workflow/schemas.py`
- `Web portal/invoice-web/docs/04-receiving-api.md`
- `Web portal/invoice-web/docs/02-mockup-requirements-and-gaps.md`
- `docs/matching-rules-standard-v6.2.md`
- `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html`

