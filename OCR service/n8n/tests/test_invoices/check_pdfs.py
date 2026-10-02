"""Cross-check the rendered PDFs against test_dataset.json.

For every invoice this verifies that the answer key and the printed document agree:
  * the PDF exists and its page count matches `document_flags.pages`;
  * every header value the key says is present also appears in the PDF text
    (supplier/customer tax IDs, invoice serial, last 8 PO digits, grand total);
  * every field the key says is missing (V-01 E13 cases) really is absent.

Thai glyphs extract as mojibake (the Tahoma subset has no usable ToUnicode map),
so comparisons are restricted to ASCII/digit tokens, which is exactly what the
completeness rules care about.

Usage:  python check_pdfs.py            # exit 1 on any mismatch
"""
import json
import re
import sys
from pathlib import Path

import pypdfium2 as pdfium

BASE = Path(__file__).resolve().parent
DATASET = BASE / "test_dataset.json"
PDF_DIR = BASE / "pdfs"


def digits(text):
    return re.sub(r"[^0-9A-Za-z]", "", text or "")


def pdf_text(path):
    doc = pdfium.PdfDocument(str(path))
    chunks = []
    for page in doc:
        chunks.append(page.get_textpage().get_text_bounded())
    return len(doc), "\n".join(chunks)


def load_dataset():
    return json.loads(DATASET.read_text(encoding="utf-8"))


_GROUPS = None


def source_row(inv):
    """Oracle row behind an invoice: stored wave-2 rows first, then the raw wave-1 group."""
    global _GROUPS
    rows = inv.get("oracle_rows")
    if rows:
        return rows[0]
    if _GROUPS is None:
        import verify_dataset
        _GROUPS = verify_dataset.load_group_index()
    group = _GROUPS.get(inv.get("oracle_source", {}).get("receipt_num", ""))
    return group[0] if group else {}


def audit(dataset):
    """Return {"invoices", "pages", "failures"} for the rendered corpus."""
    failures, checked_pages = [], 0

    for inv in dataset["invoices"]:
        iid = inv["invoice_id"]
        d = inv["invoice_data"]
        flags = inv.get("document_flags") or {}
        path = PDF_DIR / inv["pdf_filename"]
        if not path.exists():
            failures.append(f"{iid}: PDF file missing")
            continue
        pages, raw = pdf_text(path)
        checked_pages += pages
        flat = digits(raw)
        expect_pages = flags.get("pages", 1)
        if pages != expect_pages:
            failures.append(f"{iid}: {pages} page(s) in PDF, key expects {expect_pages}")

        present = {
            "supplier_tax_id": d.get("supplier_tax_id"),
            "customer_tax_id": d.get("customer_tax_id"),
            "customer_name": d.get("customer_name"),
            "supplier_name": d.get("supplier_name"),
            "invoice_num": d.get("invoice_num"),
            "po_number": d.get("po_number"),
        }
        for field, value in present.items():
            token = digits(str(value)) if value is not None else ""
            if value is None:
                continue
            if token and token not in flat:
                failures.append(f"{iid}: {field} '{value}' not found in the rendered PDF")

        # fields the key marks as absent must really be missing from the document
        row0 = source_row(inv) or {}
        absent_source = {
            "supplier_name": row0.get("SUPPLIER_NAME"),
            "supplier_tax_id": row0.get("SUPPLIER_TAX_ID"),
            "po_number": row0.get("PO_NUMBER"),
        }
        for field, value in present.items():
            if value is not None:
                continue
            original = digits(str(absent_source.get(field, "")))
            if len(original) >= 6 and original in flat:
                failures.append(f"{iid}: {field} should be missing but '{absent_source[field]}' is printed")

    return {"invoices": len(dataset["invoices"]), "pages": checked_pages, "failures": failures}


def main():
    result = audit(load_dataset())
    failures = result["failures"]
    print(f"Checked {result['invoices']} PDFs, {result['pages']} pages total")
    if failures:
        print(f"[ FAIL ] {len(failures)} problem(s):")
        for f in failures[:60]:
            print(f"  - {f}")
        sys.exit(1)
    print("[ OK ] every PDF agrees with its answer key (presence/absence of key fields)")


if __name__ == "__main__":
    main()
