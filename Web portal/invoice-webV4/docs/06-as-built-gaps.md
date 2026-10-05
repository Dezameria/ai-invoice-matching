# 06 · บันทึกส่วนต่าง as-built ↔ มาตรฐาน 6.2

หน้านี้ (และหน้า `#/help` ใน portal) บันทึก **พฤติกรรมจริงของ engine** ที่คนรีวิวต้องรู้
ไม่งั้นจะเข้าใจผิดว่า portal ทำงานผิด ทั้งที่ engine ทำตามโค้ดจริง

ที่มา: `src/engine/rules.js` (mirror ของ `OCR service/n8n/app/core/rules.py`) ·
เอกสารอ้างอิงมาตรฐาน 6.2 + `core-domain.md` · catalog ในโค้ด: `src/domain/ruleCatalog.js`

## tolerance ที่ใช้จริง (จาก bundle meta)

| รายการ | ค่า as-built |
|--------|--------------|
| คณิตศาสตร์รายบรรทัด (V-02) | ± `0.50` |
| Σ บรรทัด vs subtotal (V-03) | ± `0.50` |
| VAT 7% (V-03) | ± `1.00` |
| subtotal + VAT vs grand total (V-03) | ± `0.50` |
| ยอดรับจริงรวม vs subtotal (V-09) | ± `0.50` |
| ส่วนต่างราคา (V-07) | ≤ `1%` **และ** ≤ `200` บาท |
| เพดานแถว SQL ปลอดภัย (V-04) | `50` แถว → เกินนี้ = MANUAL (ไม่เดา) |

## ส่วนต่างรายกฎ

| กฎ | มาตรฐาน 6.2 เขียนไว้ | as-built ทำจริง | ผลต่อคนรีวิว |
|----|---------------------|-----------------|---------------|
| **V-01** ความครบถ้วน | แยกรายฟิลด์ว่าขาดอะไร | รวมทุกฟิลด์ที่ขาดเป็นรหัสเดียว **E13** และ "อ่านหน้าไม่ครบ" ก็ออก E13 ที่นี่ | ต้องเปิดดูรายละเอียดใน rule.details เองว่าขาดอะไร · E13 เป็นรหัสงานผู้ใช้ (Medium → Review) |
| **V-02** คณิตศาสตร์รายบรรทัด | แจ้ง E28 แล้วตรวจข้ออื่นต่อ | **bypass**: ไม่เรียก Oracle → V-04 V-05 V-07 V-08 V-09 กลายเป็น `not_evaluated` ทั้งหมด | เอกสาร E28 จะไม่มีข้อมูลฝั่งรับของเลย อย่าสรุปว่า "ของไม่ตรง" ให้สรุปว่า "ยังไม่ได้เทียบ" |
| **V-03** คณิตศาสตร์ทั้งเอกสาร | VAT ตามที่เอกสารระบุ | คาดหวัง **VAT 7% เสมอ** | บิลต่างประเทศ/ไม่มี VAT/สกุลเงินอื่น โดน **E31 High (Hold)** ทั้งที่ยอดถูก (demo: `AIVA-2609-0019`) |
| **V-06** ลายเซ็น | ตรวจเมื่อมีหลักฐานครบ | ขาดผู้รับของ = High (Hold) · ขาดผู้ส่ง = Medium (Review) · ถ้าหน้าไม่ครบ **ข้าม** การตรวจนี้ | ต้องอ่าน V-01 ก่อนเสมอว่าข้ามเพราะอะไร |
| **V-04** มีใบรับใน ERP | ต้องมีแถวที่จำนวนรับ > 0 | ไม่มีแถว = E17 High · หลายเลขใบรับ = E35 High · แถว ≥ 50 = **MANUAL** | เคส 50 แถว (`AIVA-2609-0022`) เป็น fail-safe ไม่ใช่ bug |
| **V-05** นิติบุคคล ↔ master | เทียบ Tax ID + ที่อยู่ ของทั้งใบรับ | ใช้ **ORG_ID ของแถวแรก** เป็นตัวแทนทั้งใบรับ · สถานะไม่ใช่ ACTIVE → MANUAL · Tax ID ผู้ขายว่าง → E13 | ใบรับข้าม ORG จะตรวจไม่ครบ (ช่องว่างที่ต้องแจ้งทีม engine) |
| **V-07** จับคู่รายบรรทัด | bilinear 1-1 พร้อมกันซ้ำได้ | M1 item code → M2 ชื่อตรง → M3 token → **M4 fallback ใช้แถวแรกที่ยัง active แบบไม่กันซ้ำ** | M4 อาจจับผิดบรรทัด/ใช้แถวซ้ำ และ **E30 แทบไม่เกิด** เมื่อมีแถว active — อย่าอ่านว่า "จับคู่ได้หมด" ให้ดูคอลัมน์ M-level |
| **V-07** ราคา/หน่วยนับ | ≤1% และ ≤200 = ผ่าน (Low) | E29 Low, E12 Medium, E05 High | E29 เดี่ยว ๆ = Review ได้ แต่เมื่อ V-09 ต่อ E31 มาด้วยกลายเป็น **Hold** |
| **V-08** จำนวนวางบิล vs รับจริง | วางเกิน = High, วางบางส่วน = Medium | ตรงตามนั้น (E06 High / E34 Medium) | งาน E34 เป็นของผู้ใช้ ไม่ใช่บัญชี |
| **V-09** ยอดรวม ↔ มูลค่ารับจริง | เทียบเฉพาะส่วนที่เกี่ยวข้อง | เทียบ **ทั้งใบรับทุกบรรทัด** กับ subtotal ของบิล | วางบิลบางส่วน/หลายใบรับมักโดน E31 High ทั้งที่ V-08 บอกแค่ Medium — เป็นความขัดแย้งที่มีจริงในโค้ด |

## ลำดับ decision (as-built)

`Manual Review` > `Hold` > `Review` > `Auto-pass`
(High → Hold, Medium → Review, Low/PASS → Auto-pass, MANUAL/not_evaluated ที่ชี้ว่าไม่อาจสรุปได้ → Manual Review)

## รหัสข้อยกเว้น as-built (15) และเจ้าของงาน

`E05 E06 E09 E12 E13 E16 E17 E25 E26 E28 E29 E30 E31 E34 E35`

- งาน **ผู้ใช้** (`assigned_to = user`): `E06 E12 E13 E17 E26 E34 E35`
- ที่เหลือ → ฝ่ายบัญชี · `E16 E29` เป็น info/Low (engine แนบมากับ PASS ได้)
- portal ใช้ severity จาก **master** เป็นตัวจัดคิวเสมอ ถ้า snapshot ส่ง severity ไม่ตรง → warning

## ความขัดแย้งของข้อมูลอ้างอิงที่ยังไม่ปิด (เคยบันทึกไว้ตั้งแต่ v3)

| เรื่อง | อาการ | ผลกับ v4 |
|--------|-------|-----------|
| Tax ID `0107545000179` / ORG `222` / ORG `196` | mockup อ้างถึง แต่ไม่มีใน master 48 แถว | fixture ใช้ ORG `222` เพื่อให้เกิด `UNMAPPED` จริง (demo) |
| ORG `556` | master map แล้ว แต่ mockup เก่าบอกยังไม่ได้ map | v4 ยึด master → map เป็น MGP |
| master มี Tax ID ว่าง / รูปแบบไม่ 13 หลัก (เช่น `200301017448(619868-V)` ของมาเลเซีย) | ทำให้ strict "13 หลัก" ใช้ไม่ได้ | smoke test ตรวจ "ส่วนใหญ่ 13 หลัก" + ทุกแถวมี orgId/status |
| `exceptions[]` / `matches[]` / `signatures` ไม่มีใน output n8n จริง | v4 ต้องประกอบเองใน fixture | ต้องแก้ที่ producer ก่อนต่อ backend |

## สิ่งที่ยัง **ปิดไม่ได้** ใน portal (ต้องมีการงานอื่นก่อน)

| งาน | ติดอะไร | v4 แสดงผลยังไง |
|-----|---------|------------------|
| `post` ส่งตั้งหนี้ที่ AP | ยังไม่มี Posting Gateway + acknowledgement contract | ปุ่มมี แต่ guard `ap-contract` บล็อกทุกกรณี + เขียนเหตุผลใน UI |
| Login ด้วย Entra ID | ยังไม่ลงทะเบียน app + role mapping | เลือกผู้ใช้เดโม 7 คน (สลับแล้วสิทธิ์เปลี่ยนจริง) |
| ดึง snapshot จาก queue/API จริง | ยังไม่มี endpoint ให้ portal เรียก | `ingest` + ปุ่มทดสอบ JSON |
| ส่งออกงานให้ OCR rerun | ไม่มี worker บริโภค outbox | outbox ค้างใน store + เดโม "ส่งรุ่นค้าง" |
| เปิด PDF จริง | ไม่มี PDF storage/PDF API client | metadata + watermark + สถานะ current/stale/missing |
| ตรวจซ้ำฝั่ง portal | **ไม่ทำโดยเจตนา** | engine mirror อยู่แค่ใน `tools/` (มีเทสต์เฝ้า import) |
| audit ลงฐานข้อมูล + hash chain | ยังเก็บใน localStorage | v3 เคยทำ hash chain จำลองไว้ → พอร์ตได้ |
| duplicate ตรวจที่ engine | v4 คำนวณ `supplier_name||invoice_num` เอง | ต้องให้ n8n ส่ง `duplicate_of` มา |

## Production checklist (ก่อนใช้จริง)

- [ ] producer ปล่อย snapshot ครบ contract (schema_version, event_id, revision, decimal string)
- [ ] เพิ่ม `exceptions[] matches[] signatures[] document.uploaded_by` ใน output ของ n8n
- [ ] ต่อ API ingestion + auth (portal → backend) และกันการรับ event ซ้ำฝั่ง server
- [ ] map ผู้ใช้ Entra ID → role + ขอบเขตบริษัท (และซิงก์ `RECEIVER` จาก Oracle)
- [ ] เก็บ workflow/audit/outbox ลงฐานข้อมูล + optimistic locking ฝั่ง server
- [ ] ตกลง contract Ack กับทีม AP เพื่อปลดบล็อก `post`
- [ ] แก้ V-09/V-03 ให้ recognise บิลไม่มี VAT/คนละสกุลเงิน (หรือเพิ่มกฎเฉพาะ)
- [ ] ทำให้ V-07 M4 กันแถวซ้ำ และส่ง E30 เมื่อไม่พบบรรทัดตรงจริง
- [ ] นโยบาย retention/PII ของ PDF + audit log (portal ไม่เก็บ PDF อยู่แล้ว)
- [ ] accessibility (contrast, keyboard, screen reader ภาษาไทย) และ browser E2E
