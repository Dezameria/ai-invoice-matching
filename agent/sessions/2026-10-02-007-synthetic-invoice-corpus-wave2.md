# SESSION-20261002-007 — Synthetic invoice corpus wave 2 (100 PDFs + engine-derived answer key)

- Started: `2026-10-02T16:05:00+07:00`
- Completed: `2026-10-02T18:40:00+07:00`
- Task: `TASK-20261002-007`
- Status: completed

## User direction
“@synthetic_Invoice_generator_prompt.md Create more PDF test case 100 pdf file with json” — เพิ่มเคสทดสอบ PDF สังเคราะห์อีก 100 ไฟล์พร้อม JSON answer key ตาม prompt spec ของ Synthetic Invoice Generator

## Delivered
- `tests/test_invoices/invoice_engine.py` — offline bridge ที่เรียก `evaluate_step1/2/3/4_decision` ของ `app/core/rules.py` ตามลำดับเดียวกับ `VerificationPipeline.execute_matching_engine` (รวม branch skip Oracle เมื่อ E28 และ skip STEP 3 เมื่อ E17/E35/safety cap) และแปลงแถว CSV เป็น `OracleReceipt`
- `tests/test_invoices/build_test_dataset_wave2.py` — test matrix 100 เคสใหม่ `INV-F01`–`INV-J20` (F valid/tolerated 20, G single-rule 25, H multi-rule 25, I intercompany 10, J edge/OCR 20) โดย expected_result ทุกตัวผลิตจาก engine + เก็บแถว Oracle ที่ใช้ (`oracle_rows`) ต่อรายการ
- `tests/test_invoices/verify_dataset.py` — replay ทั้ง 155 เคส เทียบ key เดิมกับ engine, โหมด `--fix` ใช้ recalibrate, รายงาน code coverage และ structural problems
- `tests/test_invoices/check_pdfs.py` — ตรวจ PDF ↔ key: จำนวนหน้าตรง `document_flags`, ฟิลด์ที่ key ระบุต้องมีอยู่จริง (tax ID, serial, PO digits, ยอดรวม) และฟิลด์ที่ key ระบุว่าหายต้องไม่ปรากฏ
- `tests/test_invoices/generate_invoices.py` (rewrite) — รองรับ `pdf_hints` (watermark + speckle จำลอง scan, ต่อบัญชี 2 หน้าเฉพาะเมื่อ `pages_complete`, เชิงอรรถหมายเหตุ, placeholder `—`), fit ข้อความตามความกว้างคอลัมน์, วาดตารางเมื่อไม่มีรายการสินค้า
- `tests/test_invoices/README.md` — อธิบายโครงสร้าง waves, คำสั่งรัน, ผลข้างเคียงของ engine ที่ควรรู้ และข้อจำกัด text-layer
- `tests/test_invoices/test_dataset.json` — 155 รายการ (wave 1 = 55 recalibrated, wave 2 = 100 ใหม่) และ `tests/test_invoices/pdfs/` = 155 PDF

## Notable test design
- Scenario ใหม่ที่ engine รองรับแต่ corpus เดิมไม่เคยแตะ: ไม่มีใบรับ (E17), หลายใบรับภายใต้ PO เดียว (E35), 50 receipt lines ชน safety cap (Manual Review), V-05 fail จากที่อยู่/รหัสไปรษณีย์ (E09 Medium), V-06 ขาดลายเซ็นผู้ส่งของ (E26 Medium), UOM mismatch (E12), ราคาต่างในกรอบ (E29)
- Boundary cases: ส่วนต่างรายการ 0.50/0.60, VAT 1.00/1.20, ราคาขยับ 1% และ 1.01%, ราคา +0.50/+0.51 บนบรรทัด qty=1
- Adversarial cases ที่ตั้งใจให้ "ผ่าน": `INV-J17` แก้เลขประจำตัวผู้ขาย 1 หลัก (ไม่มีกฎเทียบ supplier กับ Oracle), `INV-J20` สลับราคาของสองบรรทัดที่ qty เท่ากัน (price-first matching จับคู่ใหม่ได้และยอดรวมเท่าเดิม)
- `INV-G24`/`INV-H15` ใช้เทคนิค balance price shift ข้าม 2 บรรทัด ทำให้ V-07 fail (E05) โดย V-08/V-09 ยัง PASS — แยก detection ของ price matching ออกจาก total check

## Verification
- `build_test_dataset_wave2.py`: สร้างครบ 100 เคส, ผ่าน invariants รายหมวด, invoice number ไม่ซ้ำกับ wave 1, ใช้ base-data 99 receipt groups จาก `_raw/oracle_receipts.csv`
- `verify_dataset.py`: replay 155/155, `All replayed expectations already match the engine output.`; decision mix Auto-pass 63 / Review 13 / Hold 78 / Manual Review 1; code coverage E05 E06 E09 E12 E13 E16 E17 E26 E28 E29 E31 E34 E35
- `generate_invoices.py`: render 155 PDF (tax_invoice 117, abbreviated 18, commercial 20)
- `check_pdfs.py`: `Checked 155 PDFs, 157 pages total — [ OK ]`
- Visual inspection (pypdfium2 + Pillow): หน้า 1 ของ `INV-F05` (watermark + รายการต่อ), `INV-G23` (พื้นที่ลายเซ็นผู้รับว่าง), หน้า 2 ของ `INV-J20` — อักษรไทย render ถูกต้อง
- แรกเริ่ม `check_pdfs.py` จับได้ว่า `INV-G06` (หน้า 2 ไม่ถูก upload) ยัง render 2 หน้า → แก้ให้ `only_first_page` ใน `pdf_hints` แล้ว generate/check ซ้ำจนผ่าน
- รันใน `.venv` ของ service โดยติดตั้ง `fpdf2` และ `pypdf` เพิ่ม (ไม่แก้ `requirements.txt`)
- ไม่มีการเรียก Oracle EBS, LiteLLM, Paperless หรือ AP จริง; ไม่มี commit/push

## Known limitations
- Expected results ผูกกับ rules engine ปัจจุบัน (`standard_version 6.2`) — ถ้าแก้ threshold/decision ต้องรัน `verify_dataset.py --fix` และทบทวนคำอธิบายของ wave 1 ควบคู่
- `E25` และ `E30` ยังไม่มีเคสเพราะ path ปัจจุบันของ engine ไม่สร้าง code นั้น (date ไม่ parse ยังถือว่า V-01 ผ่าน; fallback matching ทำให้ทุกบรรทัดจับคู่ได้เสมอ)
- Base data จาก `_raw/` มี receipt group ที่ใช้ได้ 120 กลุ่ม (หลายบรรทัด 29 กลุ่ม, ตั้งแต่ 3 บรรทัด 16 กลุ่ม) และ PO ที่มีหลายใบรับ 19 PO เคสรูปแบบหายาก (qty=1 ราคาสูง, price-swap) จึงใช้ข้อมูลฐานร่วมกันหลายเคส (wave 2 ครอบคลุม 99 group ที่ไม่ซ้ำกัน)

## Addendum — offline pytest gate (`CHG-20261002-008`)
- เพิ่ม `tests/test_invoice_corpus.py` (7 tests) ที่ replay corpus ทั้ง 155 เคสและตรวจ PDF ↔ key แบบ offline ทำให้ corpus เป็น regression gate ของ rules engine ได้จริง (`python -m pytest` → `9 passed, 2 deselected in ~1.7s`)
- เพิ่ม `pytest.ini` (deselect marker `live`) + `tests/conftest.py` (collect_ignore `test_suite.py`, sys.path ของ corpus) และติด marker `live` ให้ 2 เคสใน `test_frontend_sse.py` ที่ต้องยิง Paperless/LiteLLM
- แยก `check_pdfs.audit()` / `verify_dataset.verify()` ให้ import ได้ แล้วพิสูจน์ความไวของเครื่องมือด้วย mutation 4 แบบ; พบว่า branch ตรวจ "ฟิลด์ที่ต้องหาย" เป็น assertion เปล่ากับ wave 1 จึงแก้ให้ resolve ค่าจาก `_raw/oracle_receipts.csv` (บันทึกเป็น `ERR-20261002-004`)
- อัปเดต `OCR service/n8n/README.md` และ `tests/test_invoices/README.md` ให้ครอบคลุมคำสั่ง pytest
