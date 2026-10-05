# 02 · Receiving Contract v1.0 (สิ่งที่ portal ยอมรับ)

ไฟล์ต้นฉบับของ contract จริงคือ Table 9 + PDF API ของฝั่ง OCR service
สัญญาที่ portal ใช้ตรวจจริงอยู่ในโค้ด: [`src/domain/schema.js`](../src/domain/schema.js)
(ค่าที่ portal ปฏิเสธ/เตือน เปลี่ยนได้ที่ไฟล์นั้นที่เดียว)

## หลักการ fail-safe

> ข้อมูลไม่ครบ / ไม่ตรงรูปแบบ = **ห้ามสรุปผ่าน**

portal ไม่ "แก้ข้อมูลให้ตรง format" ไม่เติมค่าว่าง ไม่ปัดเลข และไม่ตีความ field ที่ไม่รู้จัก
— มันจะปฏิเสธ snapshot ทั้งก้อน หรือเตือนให้คนเห็น (warning) แล้วให้ engine เป็นคนออกข้อยกเว้นเอง

## รูปทรงข้อมูล

### บันเดิลทั้งชุด (`src/data/snapshots.js`)

```json
{
  "built_at": "2026-10-03T08:26:19.004Z",
  "generator": "tools/build-fixtures.mjs",
  "contract_version": "1.0",
  "standard_version": "6.2",
  "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
  "tolerance": {
    "lineMath": "0.50", "docSum": "0.50", "vat": "1.00", "grand": "0.50",
    "receiptTotal": "0.50", "pricePct": 0.01, "priceAbs": "200", "receiptSafetyCap": 50
  },
  "document_count": 22,
  "snapshot_count": 24,
  "hand_authored_snapshots": ["AIVA-2609-0016", "AIVA-2609-0020"],
  "documents": [ /* เอกสาร 22 ฉบับ แต่ละฉบับมี snapshots หลายรุ่น */ ]
}
```

### ระดับเอกสาร (portal-side wrapper — ไม่ใช่ส่วนหนึ่งของ contract)

| field | ความหมาย |
|-------|----------|
| `document_id`, `dms_id`, `title` | ระบุตัวตน + หัวข้อที่แสดง |
| `actor` | `{ uploadedBy, ... }` — `uploadedBy` ใช้ตรวจ separation of duties |
| `pdf` | map `revision → metadata PDF` (ถ้าไม่มี revision นั้น = หลักฐานหาย) |
| `pdf_synth` | จริง/สมมติ — เตือนว่า metadata PDF ไม่ได้มาจาก PDF API จริง |
| `seed_workflow` | สถานะงานตั้งต้น (เช่น `REJECTED`, `ON_HOLD`) เพื่อสาธิต path ต่าง ๆ |
| `outbox`, `pending_snapshot` | งานค้างที่ portal สั่ง pipeline และ snapshot รุ่นถัดไปที่ "ยังไม่ส่ง" |
| `dup_key` | `supplier_name \|\| invoice_num` — engine ใช้คู่นี้ตรวจซ้ำ |
| `duplicate_of` | document_id ของเอกสารคู่กัน (ถ้ามี) |
| `hand_authored` | ธงว่า snapshot นี้คนเขียนมือ (engine ปล่อยอะไรไม่ได้) |
| `expect` | golden expectation ( tools เท่านั้นที่ใช้ ) |
| `snapshots[]` | รุ่น 1..N ตามลำดับ revision |

### หนึ่ง snapshot — ฟิลด์ตามสัญญา v1.0 (`CONTRACT_FIELDS`)

| field | type | บังคับ | หมายเหตุ |
|-------|------|:------:|----------|
| `schema_version` | string | ✅ | ต้องเป็น `"1.0"` เท่านั้น ไม่ใช่ = ปฏิเสธทั้งก้อน |
| `event_id` | string | ✅ | ห้ามซ้ำ (store ปฏิเสธ event เดิมซ้ำ) |
| `source_system` | string | ✅ | เช่น `n8n-ocr` |
| `external_id` | string | ✅ | id ฝั่งต้นทาง |
| `document_id` | string | ✅ | ใช้ผูกกับเอกสารเดิม |
| `revision` | integer ≥ 1 | ✅ | ต้องเพิ่มทุกครั้ง (store ปฏิเสธ revision ไม่เพิ่ม) |
| `standard_version` | string | ✅ | เวอร์ชันมาตรฐานที่ใช้ (6.2) |
| `engine_version` | string | เตือน | ไม่ส่ง = ตรวจย้อนหลังไม่ได้ว่าใช้โค้ดชุดไหน |
| `rule_catalog_version` | string | เตือน | ไม่ส่ง = mapping code→ข้อความอ้างอิงไม่ได้ |
| `received_at` | string(ISO) | ✅ | เวลารับผล |
| `status` | enum | ✅ | `Auto-pass` \| `Review` \| `Hold` \| `Manual Review` |
| `invoice` | object | ✅ | ดูตารางด้านล่าง |
| `receipt` | object | ✅ | `{ org_id, org_name, company, rows[], row_count, total_value, bypassed, halted_by, receiver, … }` |
| `lines` | array | ✅ | ต้องส่งมา (ว่างได้) แต่ละบรรทัด `{line_no,item_code,description,qty,uom,unit_price,amount}` |
| `rules` | array | ✅ | ผลตรวจ V-01…V-09 |
| `note` | string\|null | – |ข้อความโน้ตที่ engine ส่ง |

### ฟิลด์ extended (demo เพิ่ม — production ต้อง map จากต้นทางจริง) `EXTENDED_FIELDS`

`document`, `signatures`, `exceptions`, `matches`, `decision`, `pdf`, `provenance`

| field | โครงสร้าง | ถ้าไม่มีแล้วเกิดอะไร |
|-------|-----------|---------------------|
| `document` | `{source, doc_id, pages, pages_complete, uploaded_by, po_type}` | ไม่แสดงจำนวนหน้า/ผู้แนบ (SoD ตรวจไม่ได้) |
| `signatures` | `{supplier_or_deliverer:{present,page}, receiver:{present,page}}` | การ์ด V-06 ไม่มีข้อมูล |
| `exceptions` | `[{code, rule_id, severity, message, page}]` | portal จัดกลุ่มงานจาก `rules[].code` แทน |
| `matches` | `[{line_no, match_level, match_note, receipt_line, receipt_num, receipt_qty, receipt_price, receipt_uom, price_flag, uom_flag, qty_flag}]` | ตารางจับคู่รายบรรทัดว่าง (M-level หาย) |
| `decision` | `{status, assigned_to, halted_by, manual_review}` | จัดคิว/ผู้รับผิดชอบไม่ได้ |
| `pdf` | metadata ต่อ revision | แสดงสถานะหลักฐานไม่ได้ |
| `provenance` | `{kind, generated_by, engine_version, hand_authored}` | ไม่รู้ว่าผลนี้มาจาก engine หรือคนเขียน → portal เตือนทันที |

## กฎ validation ที่บังคับจริง (จาก `validateSnapshot`)

### รูปแบบทั่วไป
- `schema_version !== "1.0"` → error (ปฏิเสธ)
- field บังคับว่าง/ขาด → error: `event_id source_system external_id document_id standard_version received_at`
- `revision` ไม่ใช่ integer ≥ 1 → error
- `status` นอก enum → error
- ฟิลด์ที่ไม่อยู่ใน v1.0 และไม่ใช่ extended → **warning** (`จะไม่ถูกใช้ในการตัดสิน`)

### ตัวเลข (สำคัญที่สุด)
- `invoice.sub_total vat grand_total`, `lines[].qty unit_price amount`,
  `receipt.rows[].UNIT_PRICE LINE_TOTAL QUANTITY_RECEIVED`, `receipt.total_value`
  ต้องผ่าน `validateDecimalString` → เป็น **string** รูปแบบทศนิยม **≤ 6 ตำแหน่ง** และ ≤ `MAX_DECIMAL_DIGITS`
- number (float), `NaN`, ทศนิยมเกิน 6 ตำแหน่ง, `null` ในฟิลด์ required → error
- `null` = "ไม่มี" ส่วน `""` ในฟิลด์ข้อความของ invoice = **warning**
  (ต้นทางต้องส่งข้อยกเว้นมาเอง เช่น V-01 → E13; portal ห้ามเทียมผล)

### `rules[]`
- `rule_id` ต้องรู้จัก (V-01…V-09) และไม่ซ้ำใน snapshot เดียว
- `result` ∈ `PASS | FAIL | MANUAL | not_evaluated`
- `code` ต้องอยู่ใน exception master, `severity` ∈ `Low | Medium | High`
- `result = PASS` แต่แนบ `code` ที่ไม่ใช่ `E16/E29` → warning
- **ความครบของกฎ** ตรวจแยกด้วย `rulesCompleteness(rules)`:
  `missing` (ไม่ได้ส่งมา) · `notEvaluated` (ส่งมาแต่ `not_evaluated`) · `complete` · `usable`
  → "ไม่ได้ตรวจ" ต้องแสดงเป็น *ไม่มีข้อมูล* ไม่ใช่ PASS

### `exceptions[]`
- `code` ต้องรู้จัก, `severity` ต้องอยู่ใน enum
- severity ไม่ตรงกับ master → warning (portal ยึด master ในการจัดคิว)
- ไม่มี `message` → warning (ผู้ใช้จะไม่เห็นเหตุผล)

### `receipt`
- `rows` ต้องเป็น array (ว่างได้เมื่อ bypass ไม่เรียก Oracle)
- แต่ละแถวต้องมี `RECEIPT_NUM` และตัวเลข decimal ครบ
- `row_count` ตรงกับจำนวนแถวจริงไม่ตรง → error
- `org_id` เป็น integer|null

### `decision`
- `decision.status` ขัดกับ `status` ระดับ snapshot → error (portal ไม่เลือกข้างอัตโนมัติ)
- `assigned_to` ∈ `user | accounting | system | null`

## ตัวอย่าง snapshot สั้น ๆ (ผ่าน contract)

```json
{
  "schema_version": "1.0",
  "event_id": "EVT-2609-0012-r1",
  "source_system": "n8n-ocr",
  "external_id": "OCR-99321",
  "document_id": "AIVA-2609-0012",
  "revision": 1,
  "standard_version": "6.2",
  "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
  "rule_catalog_version": "6.2",
  "received_at": "2026-09-25T09:12:04+07:00",
  "status": "Auto-pass",
  "invoice": {
    "invoice_num": "IV6909245", "supplier_name": "ABC Supply Co., Ltd.",
    "supplier_tax_id": "0107545000213", "customer_name": "APICO HIGH TECH PUBLIC CO.,LTD.",
    "customer_address": "700/1 Moo 6 …", "po_number": "4500012345", "invoice_date": "2026-09-20",
    "currency": "THB", "sub_total": "1000.00", "vat": "70.00", "grand_total": "1070.00"
  },
  "receipt": {
    "org_id": 105, "org_name": "APICO HIGH TECH PCL", "company": "AH", "company_mapped": true,
    "row_count": 1, "active_row_count": 1, "total_value": "1000.00", "bypassed": false,
    "rows": [{ "RECEIPT_NUM": "530340300", "QUANTITY_RECEIVED": "7", "UNIT_PRICE": "142.857", "LINE_TOTAL": "1000.00" }]
  },
  "lines": [{ "line_no": 1, "item_code": "100001", "description": "BRACKET ASSY", "qty": "7", "uom": "JOB", "unit_price": "142.857", "amount": "1000.00" }],
  "rules": [ { "rule_id": "V-03", "result": "PASS", "code": "E16", "severity": "Low", "details": "เศษสตางค์ในเกณฑ์", "page": 1 } ],
  "exceptions": [ { "code": "E16", "rule_id": "V-03", "severity": "Low", "message": "มีผลต่างเศษสตางค์ (อยู่ในเกณฑ์ยอมรับ)", "page": 1 } ],
  "decision": { "status": "Auto-pass", "assigned_to": null, "halted_by": null, "manual_review": false },
  "provenance": { "kind": "engine-derived", "generated_by": "tools/build-fixtures.mjs", "hand_authored": false }
}
```

> ตัวอย่างนี้ย่อ — snapshot จริงมี `rules` ครบ 9 ข้อ ถ้าส่งไม่ครบ portal จะขึ้น "กฎที่ยังไม่ได้ตรวจ"
> และบล็อก action ที่ต้องใช้กฎนั้น (ดู `guards.js`)

## วิธีทดสอบ contract ในหน้า portal

หน้าดีเทล → **ทดสอบ ingestion ด้วย JSON**: วาง JSON แล้วกดตรวจ
- ผ่าน → snapshot ถูกเก็บเป็น overlay + ปิด outbox ที่ตรง revision + audit `INGEST`
- `schema_version` ผิด / type ผิด / ทศนิยมเกิน → ปฏิเสธพร้อม list `path: message` และ audit ล้มเหลว
- `event_id` ซ้ำ → ปฏิเสธ `event_id ซ้ำกับ snapshot ที่รับไปแล้ว`
- `revision` ≤ รุ่นปัจจุบัน → ปฏิเสธ (ห้ามย้อนรุ่น)

ลองได้ทันทีด้วยปุ่มเดโม **ส่งรุ่นค้างใน outbox** (เอกสาร `AIVA-2609-0015`) ซึ่งยิง snapshot
รุ่น r2 เข้าทาง `ingest` จริง ๆ

## สิ่งที่ยังไม่ปิดใน contract จริง

| เรื่อง | สถานะ | ต้องทำอะไรต่อ |
|--------|-------|----------------|
| `exceptions[]` | ต้นทาง (n8n) ไม่ได้ปล่อย field นี้ตรง ๆ — fixture สร้างจาก `rules[]` | ตกลง producer ว่าจะส่งข้อความไทยมาจาก engine หรือให้ portal มี catalog ภาษา |
| `matches[]` | engine คำนวณใน V-07 แต่ไม่ปล่อยออกมาเป็น field | ต้องเพิ่มใน output ของ rules.py |
| `signatures` | OCR vision คืนเป็นข้อความ ไม่ใช่โครงนี้ | ต้อง map จาก vision schema |
| `pdf` metadata | v4 สมมติจาก fixtures (`pdf_synth = true`) | เรียก PDF API จริงแล้ว map `file_name/pages/uploaded_at/size` |
| `document.uploaded_by` | fixture ใส่เอง | ต้องมาจาก DMS (ผู้แนบจริง) (SoD พึ่งค่านี้) |
| duplicate detection | v4 คำนวณ `supplier_name||invoice_num` เอง | engine/n8n ต้องเป็นผู้บอก `duplicate_of` |
