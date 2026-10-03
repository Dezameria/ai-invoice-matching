# Synthetic Invoice Generator — AI Agent Prompt

> **Purpose**: Instruct a local AI Agent to generate 50+ synthetic Thai Tax Invoice PDFs (mix of valid and intentionally invalid) and an accompanying `test_dataset.json` answer key for end-to-end testing of the AIVA PO-INV Matching Verification System.

---

## 🎯 OBJECTIVE

You are a **Test Data Engineer AI**. Your mission is to:

1. **Query Oracle EBS** to retrieve real Supplier, PO, Receipt, Item, and Customer data.
2. **Generate 50+ PDF invoices** — some pixel-perfect valid, some with deliberate errors targeting specific validation rules.
3. **Produce a single `test_dataset.json`** file with the ground-truth answer key for every generated invoice.
4. **Save all outputs** to `./tests/test_invoices/` relative to the project root.

---

## 📋 STEP 1: Query Oracle EBS for Base Data

Run the following SQL queries against Oracle EBS to collect real data. These queries use the **exact same views and tables** used by the production system.

### Query 1A — Receipt + PO + Supplier + Customer Data (Primary)

```sql
SELECT DISTINCT
    v.PO_NUM,
    v.RCV_NUM,
    v.RCV_INV_NUM,
    v.AP_INV_NUM,
    v.ITM_CODE,
    v.ITM_DESC,
    v.UOM,
    v.RCV_QTY,
    v.PO_UPRICE,
    (v.RCV_QTY * v.PO_UPRICE) as LINE_TOTAL,
    v.ORG_ID as INV_ORG_ID,
    ood.operating_unit as OU_ORG_ID,
    hou.name as OU_NAME,
    fsp.vat_registration_num as CUSTOMER_TAX_ID,
    hla.postal_code as CUSTOMER_POSTAL,
    hla.location_code as CUSTOMER_LOC_CODE,
    hla.address_line_1 as CUSTOMER_ADDR1,
    hla.address_line_2 as CUSTOMER_ADDR2,
    pv.vendor_name as SUPPLIER_NAME,
    COALESCE(pv.vat_registration_num, pv.num_1099) AS SUPPLIER_TAX_ID
FROM apps.AH_DEV_RCV_PO_AP_MATCHING_V v
JOIN apps.po_vendors pv ON v.vendor_id = pv.vendor_id
LEFT JOIN apps.org_organization_definitions ood ON v.org_id = ood.organization_id
LEFT JOIN apps.hr_operating_units hou ON ood.operating_unit = hou.organization_id
LEFT JOIN apps.financials_system_params_all fsp ON ood.operating_unit = fsp.org_id
LEFT JOIN apps.hr_all_organization_units haou ON v.org_id = haou.organization_id
LEFT JOIN apps.hr_locations_all hla ON haou.location_id = hla.location_id
WHERE v.RCV_QTY > 0
AND ROWNUM <= 200
ORDER BY v.RCV_NUM, v.ITM_CODE
```

### Query 1B — All Corporate Entities (for Intercompany checks)

```sql
SELECT DISTINCT
    ood.organization_id as inv_org_id,
    ood.organization_code as inv_code,
    ood.organization_name as inv_name,
    ood.operating_unit as ou_org_id,
    hou.name as ou_name,
    fsp.vat_registration_num as tax_id,
    hla.postal_code,
    hla.location_code,
    hla.address_line_1,
    hla.address_line_2
FROM apps.org_organization_definitions ood
JOIN apps.hr_operating_units hou ON ood.operating_unit = hou.organization_id
LEFT JOIN apps.financials_system_params_all fsp ON ood.operating_unit = fsp.org_id
LEFT JOIN apps.hr_all_organization_units haou ON ood.organization_id = haou.organization_id
LEFT JOIN apps.hr_locations_all hla ON haou.location_id = hla.location_id
WHERE ood.operating_unit IS NOT NULL
ORDER BY ood.organization_id
```

Save the results as:
- `./tests/test_invoices/_raw/oracle_receipts.csv`
- `./tests/test_invoices/_raw/oracle_entities.csv`

---

## 📋 STEP 2: Design the Test Matrix (50+ Invoices)

Create invoices according to this distribution. Each invoice targets a **specific combination** of pass/fail outcomes across 9 validation rules.

### Category A — VALID Invoices (Expected: Auto-pass) → ~15 invoices

| ID Range | Description | Special Condition |
|-----------|-------------|-------------------|
| INV-A01 to INV-A05 | Perfect match with real Oracle data | All rules PASS |
| INV-A06 to INV-A08 | Valid with minor rounding differences | V-03 PASS with E16 (Low rounding diff ≤0.50) |
| INV-A09 to INV-A11 | Valid with partial billing | V-08 qty < received (E34 Medium) — but status = Review |
| INV-A12 to INV-A15 | Valid with different layouts/formats | Mix of Tax Invoice, Abbreviated, Commercial |

### Category B — Single Rule FAIL (Easy to detect) → ~15 invoices

| ID Range | Target Rule | What to Fake | Expected Code |
|-----------|-------------|--------------|---------------|
| INV-B01 to INV-B02 | V-01 | Remove `supplier_tax_id` or `po_number` from the PDF | E13 |
| INV-B03 to INV-B04 | V-02 | Make `qty × unit_price ≠ amount` by > 0.50 | E28 |
| INV-B05 to INV-B06 | V-03 | Make `sum(lines) ≠ sub_total` or `sub_total × 1.07 ≠ grand_total` by > 1.00 | E31 |
| INV-B07 to INV-B08 | V-05 | Use wrong Customer Tax ID (e.g., change last digit) | E09 |
| INV-B09 to INV-B10 | V-06 | Omit receiver signature | E26 |
| INV-B11 to INV-B12 | V-07 | Change unit_price significantly (>1% and >200 THB) | E05 |
| INV-B13 to INV-B14 | V-08 | Set invoice qty > receipt qty | E06 |
| INV-B15 | V-09 | Make sub_total differ from sum(rcv_qty × rcv_price) by > 0.50 | E31 |

### Category C — Multi-Rule FAIL (Requires careful inspection) → ~10 invoices

| ID Range | Target Rules | What to Fake |
|-----------|-------------|--------------|
| INV-C01 to INV-C02 | V-01 + V-03 | Missing fields AND wrong math |
| INV-C03 to INV-C04 | V-05 + V-07 | Wrong Customer Tax ID AND wrong unit price |
| INV-C05 to INV-C06 | V-02 + V-08 | Line math error AND quantity exceeds received |
| INV-C07 to INV-C08 | V-07 + V-08 + V-09 | Wrong price + over-billed qty + total mismatch |
| INV-C09 to INV-C10 | V-01 + V-05 + V-06 | Missing PO + wrong tax ID + no signature |

### Category D — Intercompany Invoices → ~5 invoices

| ID Range | Description | Expected |
|-----------|-------------|----------|
| INV-D01 to INV-D02 | Supplier Tax ID = one of the internal entity Tax IDs from Query 1B | `intercompany: true`, PASS |
| INV-D03 to INV-D05 | Intercompany + other errors (wrong qty, wrong total) | `intercompany: true` + specific FAIL |

### Category E — Edge Cases & OCR Challenges → ~10 invoices

| ID Range | Description | Expected |
|-----------|-------------|----------|
| INV-E01 to INV-E02 | Buddhist Era dates (e.g., 15/07/2569 instead of 2026) | V-01 PASS (system converts) |
| INV-E03 to INV-E04 | PO number with prefix (e.g., "AH-12345678" or "PO12345678") | V-01 PASS (system extracts last 8 digits) |
| INV-E05 to INV-E06 | Very long item descriptions with Thai + English mixed | V-07 matching challenge |
| INV-E07 to INV-E08 | Subtle 1-digit Tax ID errors (hard to spot visually) | V-05 FAIL E09 |
| INV-E09 to INV-E10 | Invoice number format variations (with/without slash, e.g., SQ26/12345 vs SQ2612345) | V-04 PASS (system handles) |

---

## 📋 STEP 3: Generate PDF Invoices

For **each invoice** in the test matrix, generate a PDF file with the following specifications:

### PDF Layout Requirements

Generate invoices in **multiple layout styles** to simulate real-world diversity:

#### Layout 1 — Thai Tax Invoice (ใบกำกับภาษี)
```
┌─────────────────────────────────────────────┐
│  [Company Logo Area]                         │
│  ชื่อบริษัท: {supplier_name}                 │
│  เลขประจำตัวผู้เสียภาษี: {supplier_tax_id}    │
│  ที่อยู่: {supplier_address}                  │
│                                              │
│         ใบกำกับภาษี / Tax Invoice             │
│  เลขที่: {invoice_num}    วันที่: {date}      │
│                                              │
│  ลูกค้า: {customer_name}                      │
│  เลขประจำตัวผู้เสียภาษี: {customer_tax_id}    │
│  ที่อยู่: {customer_address}                  │
│  เลขที่ PO: {po_number}                      │
│                                              │
│  ┌─────┬──────────┬─────┬──────┬─────┬──────┐│
│  │ ลำดับ│ รายละเอียด │ จำนวน │ หน่วย │ ราคา/หน่วย│ จำนวนเงิน ││
│  ├─────┼──────────┼─────┼──────┼─────┼──────┤│
│  │  1  │ {desc}   │{qty}│{uom} │{up} │{amt} ││
│  │  2  │ {desc}   │{qty}│{uom} │{up} │{amt} ││
│  └─────┴──────────┴─────┴──────┴─────┴──────┘│
│                                              │
│                    รวมก่อนภาษี: {sub_total}    │
│                    ภาษีมูลค่าเพิ่ม 7%: {vat}   │
│                    ยอดรวมทั้งสิ้น: {grand_total}│
│                                              │
│  ผู้ส่งของ: ___________  ผู้รับของ: ___________ │
│  (Signature Area)        (Signature Area)     │
└─────────────────────────────────────────────┘
```

#### Layout 2 — Abbreviated Tax Invoice (ใบกำกับภาษีอย่างย่อ)
- Simplified format with less detail
- Smaller font, compact layout

#### Layout 3 — English Commercial Invoice
- Standard English invoice format
- "INVOICE" header, "Bill To" section
- Western date format with numbers

### PDF Generation Rules

1. **Font**: Use a Thai-compatible font (e.g., THSarabunNew, Sarabun, or Angsana New). If unavailable, use a Unicode font that renders Thai correctly.
2. **Library**: Use Python with `fpdf2` or `reportlab` to generate PDFs.
3. **Signatures**: For valid invoices, draw simple signature-like marks. For V-06 FAIL cases, leave signature areas blank.
4. **File naming**: `{invoice_id}.pdf` (e.g., `INV-A01.pdf`, `INV-B03.pdf`)
5. **Save to**: `./tests/test_invoices/pdfs/`

### Data Population Rules

- **For valid invoices (Category A)**: Use **exact data** from Oracle Query 1A results. Match `PO_NUM`, `SUPPLIER_NAME`, `SUPPLIER_TAX_ID`, `CUSTOMER_TAX_ID`, `CUSTOMER_POSTAL`, items, quantities, and prices exactly.
- **For fake invoices (Categories B-E)**: Start with real Oracle data, then **modify only the specific fields** that the target rule checks, as described in the test matrix.
- **Invoice numbers**: Generate plausible invoice numbers like `SQ26/00101`, `IV-2026-0042`, `TI670001`, etc.
- **Dates**: Use recent dates (within the last 3 months). For Buddhist Era tests, use year + 543.
- **Amounts**: Calculate correctly from line items unless deliberately faking V-03/V-09.
  - `sub_total = sum(qty × unit_price)` for each line
  - `vat = sub_total × 0.07`
  - `grand_total = sub_total + vat`

---

## 📋 STEP 4: Generate the Answer Key (`test_dataset.json`)

Create a single JSON file at `./tests/test_invoices/test_dataset.json` with the following schema:

```json
{
  "metadata": {
    "generated_at": "2026-10-02T10:00:00Z",
    "generator": "Synthetic Invoice Generator v1.0",
    "total_invoices": 55,
    "oracle_source_query_date": "2026-10-02",
    "distribution": {
      "auto_pass": 15,
      "single_fail": 15,
      "multi_fail": 10,
      "intercompany": 5,
      "edge_cases": 10
    }
  },
  "invoices": [
    {
      "invoice_id": "INV-A01",
      "pdf_filename": "INV-A01.pdf",
      "category": "A",
      "category_label": "Valid — Auto-pass",
      "difficulty": "easy",
      "description": "Perfect match invoice using real Oracle PO 12345678 data",
      
      "oracle_source": {
        "po_number": "12345678",
        "receipt_num": "RCV-00001",
        "org_id": 103,
        "ou_org_id": 101,
        "ou_name": "AH - Aapico Hitech"
      },
      
      "invoice_data": {
        "supplier_name": "บริษัท ตัวอย่าง จำกัด",
        "supplier_tax_id": "0105555000111",
        "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
        "customer_tax_id": "0107545000179",
        "customer_address": "99 หมู่ 1 ถ.พหลโยธิน ต.บ้านใหม่ อ.หนองแค จ.สระบุรี 13160",
        "invoice_num": "SQ26/00101",
        "invoice_date": "15/07/2026",
        "po_number": "12345678",
        "currency": "THB",
        "lines": [
          {
            "line_no": 1,
            "description": "ITEM-001 ชิ้นงานทดสอบ",
            "qty": 100.0,
            "uom": "PCS",
            "unit_price": 50.00,
            "amount": 5000.00
          }
        ],
        "sub_total": 5000.00,
        "vat": 350.00,
        "grand_total": 5350.00,
        "signatures": {
          "supplier_or_deliverer": { "present": true },
          "receiver": { "present": true }
        }
      },
      
      "expected_result": {
        "decision_status": "Auto-pass",
        "assigned_to": null,
        "halted_by": null,
        "manual_review": false,
        "intercompany": false,
        "rules": {
          "V-01": { "result": "PASS", "code": null },
          "V-02": { "result": "PASS", "code": null },
          "V-03": { "result": "PASS", "code": null },
          "V-04": { "result": "PASS", "code": null },
          "V-05": { "result": "PASS", "code": null },
          "V-06": { "result": "PASS", "code": null },
          "V-07": { "result": "PASS", "code": null },
          "V-08": { "result": "PASS", "code": null },
          "V-09": { "result": "PASS", "code": null }
        },
        "expected_exceptions": [],
        "notes": "All fields match Oracle EBS exactly. Should produce clean Auto-pass."
      },
      
      "forgery_details": null
    },
    {
      "invoice_id": "INV-B03",
      "pdf_filename": "INV-B03.pdf",
      "category": "B",
      "category_label": "Single Rule FAIL",
      "difficulty": "easy",
      "description": "V-02 FAIL: Line 1 qty×price (100×52=5200) ≠ stated amount (5000), diff=200 > 0.50",
      
      "oracle_source": {
        "po_number": "12345678",
        "receipt_num": "RCV-00001",
        "org_id": 103,
        "ou_org_id": 101,
        "ou_name": "AH - Aapico Hitech"
      },
      
      "invoice_data": {
        "supplier_name": "บริษัท ตัวอย่าง จำกัด",
        "supplier_tax_id": "0105555000111",
        "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
        "customer_tax_id": "0107545000179",
        "customer_address": "99 หมู่ 1 ถ.พหลโยธิน ต.บ้านใหม่ อ.หนองแค จ.สระบุรี 13160",
        "invoice_num": "SQ26/00102",
        "invoice_date": "16/07/2026",
        "po_number": "12345678",
        "currency": "THB",
        "lines": [
          {
            "line_no": 1,
            "description": "ITEM-001 ชิ้นงานทดสอบ",
            "qty": 100.0,
            "uom": "PCS",
            "unit_price": 52.00,
            "amount": 5000.00
          }
        ],
        "sub_total": 5000.00,
        "vat": 350.00,
        "grand_total": 5350.00,
        "signatures": {
          "supplier_or_deliverer": { "present": true },
          "receiver": { "present": true }
        }
      },
      
      "expected_result": {
        "decision_status": "Hold",
        "assigned_to": "accounting",
        "halted_by": "V-02",
        "manual_review": false,
        "intercompany": false,
        "rules": {
          "V-01": { "result": "PASS", "code": null },
          "V-02": { "result": "FAIL", "code": "E28" },
          "V-03": { "result": "PASS", "code": null },
          "V-04": { "result": "not_evaluated", "code": null },
          "V-05": { "result": "not_evaluated", "code": null },
          "V-06": { "result": "PASS", "code": null },
          "V-07": { "result": "not_evaluated", "code": null },
          "V-08": { "result": "not_evaluated", "code": null },
          "V-09": { "result": "not_evaluated", "code": null }
        },
        "expected_exceptions": ["E28"],
        "notes": "V-02 E28 causes halt (has_e28=true). Oracle EBS query is SKIPPED. V-04 to V-09 become not_evaluated."
      },
      
      "forgery_details": {
        "target_rule": "V-02",
        "modification": "Changed unit_price from 50.00 to 52.00 but kept amount at 5000.00. Diff = |100×52 - 5000| = 200 > 0.50 threshold.",
        "detection_difficulty": "easy"
      }
    }
  ]
}
```

---

## 📋 STEP 5: Validation Rule Reference

Use this reference to ensure your expected results are correct. This is the **exact logic** used by the production system.

### Rule V-01 — Document Completeness
- **Checks**: `supplier_name`, `supplier_tax_id` (13 digits), `customer_name`, `customer_tax_id` (13 digits), `invoice_num`, `invoice_date`, `po_number` (8-digit), `lines[]` length > 0, `pages_complete`
- **FAIL**: Code `E13`, Severity `Medium`
- **Note**: Tax IDs are cleaned to digits only, must be exactly 13. PO number is cleaned to last 8 digits.

### Rule V-02 — Line Math Check
- **Checks**: For each line, `|qty × unit_price - amount| <= 0.50`
- **FAIL**: Code `E28`, Severity `High`
- **CRITICAL**: If V-02 FAIL → **Oracle query is SKIPPED** → V-04 through V-09 become `not_evaluated`

### Rule V-03 — Document Math Check
- **Checks**:
  - `|sum(line amounts) - sub_total| <= 0.50`
  - `|sub_total × 0.07 - vat| <= 1.00`
  - `|sub_total + vat - grand_total| <= 0.50`
- **FAIL**: Code `E31`, Severity `High` (if any diff exceeds threshold)
- **PASS with E16**: If diffs exist but within thresholds, Code `E16`, Severity `Low`

### Rule V-04 — Receipt Active Check
- **Checks**: Oracle receipts exist with `QUANTITY_RECEIVED > 0`
- **FAIL E17**: No receipts found or all qty = 0
- **FAIL E35**: Multiple distinct `RECEIPT_NUM` values found
- **MANUAL**: ≥ 50 rows returned (Safety Cap)

### Rule V-05 — Customer Entity & Tax ID Match
- **Checks**: `invoice.customer_tax_id == receipts[0].CUSTOMER_TAX_ID` (from Oracle `fsp.vat_registration_num`)
- **Then checks**: Customer address contains `receipts[0].CUSTOMER_POSTAL` or location code parts
- **FAIL E09**: Tax ID mismatch (High) or Address mismatch (Medium)

### Rule V-06 — Signatures Check
- **Checks**: `signatures.receiver.present` and `signatures.supplier_or_deliverer.present`
- **FAIL E26**: Missing receiver (High) or supplier signature (Medium)

### Rule V-07 — Line Matching Ladder (M1→M4)
- **Matching order**: M1 (Item Number in description) → M2 (Line number) → M3 (Description keywords) → M4 (Fallback to first row)
- **Price check**: `|invoice_price - oracle_price|`
  - If ≤ 1% AND ≤ 200 THB → E29 (Low, acceptable)
  - If > 1% OR > 200 THB → E05 (High, FAIL)
- **UOM check**: E12 (Medium) if mismatched

### Rule V-08 — Quantity Check
- **Checks**: `invoice.qty <= receipt.QUANTITY_RECEIVED`
- **FAIL E06**: Invoice qty > received qty (High)
- **INFO E34**: Invoice qty < received qty (Medium, partial billing)

### Rule V-09 — Total Amount Check
- **Checks**: `|invoice.sub_total - sum(rcv_qty × po_uprice for all receipts)| <= 0.50`
- **FAIL E31**: Subtotal mismatch (High)

### Decision Matrix
| Condition | Status |
|-----------|--------|
| `manual_review = true` | Manual Review |
| Any `High` severity exception | Hold |
| Any `Medium` severity exception (no High) | Review |
| No exceptions or only `Low` | Auto-pass |

### Intercompany Check
- If `invoice.supplier_tax_id` is found in the set of all `fsp.vat_registration_num` values from Query 1B → `intercompany: true`

---

## 📋 STEP 6: Generate Python Script

Create a Python script at `./tests/test_invoices/generate_invoices.py` that:

1. Reads the `test_dataset.json`
2. For each entry in `invoices[]`, generates the PDF using `fpdf2`
3. Applies the correct layout (randomized across Layout 1/2/3)
4. Saves to `./tests/test_invoices/pdfs/{invoice_id}.pdf`

### Required dependencies:
```bash
pip install fpdf2
```

### Script structure:
```python
import json
from fpdf import FPDF
from pathlib import Path

OUTPUT_DIR = Path("./tests/test_invoices/pdfs")
DATASET_FILE = Path("./tests/test_invoices/test_dataset.json")

class ThaiInvoicePDF(FPDF):
    """Custom PDF class with Thai font support."""
    
    def __init__(self, layout: str = "tax_invoice"):
        super().__init__()
        self.layout = layout
        # Register Thai font (THSarabunNew or fallback)
        # self.add_font("THSarabun", "", "THSarabunNew.ttf", uni=True)
    
    def generate_tax_invoice(self, data: dict):
        """Layout 1: Thai Tax Invoice"""
        ...
    
    def generate_abbreviated(self, data: dict):
        """Layout 2: Abbreviated Tax Invoice"""
        ...
    
    def generate_commercial(self, data: dict):
        """Layout 3: English Commercial Invoice"""
        ...

def main():
    with open(DATASET_FILE, "r", encoding="utf-8") as f:
        dataset = json.load(f)
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    for inv in dataset["invoices"]:
        pdf = ThaiInvoicePDF()
        layout = determine_layout(inv)
        generate_pdf(pdf, inv, layout)
        pdf.output(str(OUTPUT_DIR / inv["pdf_filename"]))
        print(f"Generated: {inv['pdf_filename']}")

if __name__ == "__main__":
    main()
```

---

## 📋 STEP 7: Output Directory Structure

After completion, the directory structure should be:

```
./tests/test_invoices/
├── _raw/
│   ├── oracle_receipts.csv      # Raw Oracle query results
│   └── oracle_entities.csv      # Raw entity query results
├── pdfs/
│   ├── INV-A01.pdf
│   ├── INV-A02.pdf
│   ├── ...
│   ├── INV-B01.pdf
│   ├── ...
│   ├── INV-E10.pdf
│   └── (55+ PDF files)
├── test_dataset.json            # Complete answer key
└── generate_invoices.py         # PDF generation script
```

---

## ⚠️ CRITICAL CONSTRAINTS

1. **Real data first**: Always start with real Oracle data. Only modify the specific fields needed to trigger the target validation rule failure.
2. **Consistent math**: Unless deliberately faking V-03 or V-09, always ensure `sub_total = sum(line amounts)`, `vat = sub_total × 0.07`, `grand_total = sub_total + vat`.
3. **Tax ID format**: Must be exactly 13 digits. For fakes, change only 1-2 digits to make it realistic.
4. **PO number**: Must be extractable to 8 digits. The system takes the last 8 digits.
5. **Mixed difficulty**: ~40% easy to spot, ~40% moderate, ~20% hard to distinguish from valid.
6. **Thai encoding**: All PDFs must render Thai text correctly.
7. **No duplicate invoice numbers**: Each invoice must have a unique `invoice_num`.
8. **Date format**: DD/MM/YYYY on the PDF. Buddhist Era dates should show year + 543 (e.g., 2569 instead of 2026).

---

## ✅ COMPLETION CHECKLIST

- [ ] Oracle data queried and saved to `_raw/`
- [ ] `test_dataset.json` created with 50+ entries
- [ ] Each entry has complete `oracle_source`, `invoice_data`, `expected_result`, and `forgery_details`
- [ ] `generate_invoices.py` created and tested
- [ ] All PDFs generated in `pdfs/` folder
- [ ] At least 3 different PDF layouts used
- [ ] Thai text renders correctly in PDFs
- [ ] All expected results verified against the Rule Reference in Step 5
- [ ] Intercompany cases use real internal Tax IDs from Query 1B
- [ ] Edge cases cover Buddhist Era dates, PO prefix variations, and invoice number format variations
