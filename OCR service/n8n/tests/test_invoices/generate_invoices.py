"""Render every invoice in test_dataset.json into pdfs/{invoice_id}.pdf.

Supports the four print styles used by the dataset (Thai tax invoice, abbreviated
tax invoice, English commercial invoice) plus the wave-2 `pdf_hints`:

    scan_noise    : light watermark + speckles, simulating a photocopied scan
    split_pages   : item table continued on page 2 (real two-page invoice)
    note          : footer text (e.g. "page 2 of the original scan is missing")
    amount_format : thousands separators

Missing header fields are printed as "—" so that the vision extractor is forced
to report them as absent, exactly as the answer key expects.

Usage:
    python generate_invoices.py            # all invoices
    python generate_invoices.py INV-F INV-J20
"""
import json
import random
import sys
from pathlib import Path

from fpdf import FPDF

BASE = Path(__file__).resolve().parent
DATASET_FILE = BASE / "test_dataset.json"
OUTPUT_DIR = BASE / "pdfs"
THAI_FONT = r"C:\Windows\Fonts\tahoma.ttf"
PLACEHOLDER = "—"
COLS = {"tax_invoice": [12, 78, 18, 20, 25, 27],
        "abbreviated": [10, 88, 18, 18, 24, 28],
        "commercial": [12, 78, 18, 20, 25, 27]}
HEADERS = {
    "tax_invoice": ["ลำดับ", "รายละเอียด", "จำนวน", "หน่วย", "ราคา/หน่วย", "จำนวนเงิน"],
    "abbreviated": ["#", "รายละเอียด", "จำนวน", "หน่วย", "ราคา", "จำนวนเงิน"],
    "commercial": ["No.", "Description", "Qty", "Unit", "Unit Price", "Amount"],
}
ROW_H = {"tax_invoice": 6, "abbreviated": 5, "commercial": 6}


def fmt(v):
    if v is None:
        return PLACEHOLDER
    if isinstance(v, float):
        return f"{v:,.2f}"
    return str(v)


def val(v, blank_note=PLACEHOLDER):
    return v if (v is not None and str(v).strip()) else blank_note


def draw_signature(pdf, x, y):
    pdf.set_draw_color(20, 20, 20)
    pdf.set_line_width(0.4)
    pdf.line(x, y, x + 12, y - 4)
    pdf.line(x + 12, y - 4, x + 22, y + 2)
    pdf.line(x + 22, y + 2, x + 34, y - 6)
    pdf.line(x, y + 6, x + 34, y + 6)


class ThaiInvoicePDF(FPDF):
    def __init__(self, layout="tax_invoice", hints=None, seed_text="INV"):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.layout = layout
        self.hints = hints or {}
        self.rng = random.Random(seed_text)
        self.add_font("TH", "", THAI_FONT)
        self.add_font("TH", "B", THAI_FONT)
        self.set_auto_page_break(False)

    # ------------------------------------------------------------------ helpers
    def fit(self, text, width):
        """Trim text so it never overflows its column."""
        text = "" if text is None else str(text)
        if self.get_string_width(text) <= width - 1.5:
            return text
        while text and self.get_string_width(text + "..") > width - 1.5:
            text = text[:-1]
        return text + ".."

    def scan_noise(self):
        """Watermark + speckles so the PDF is not a pixel-perfect render."""
        self.set_text_color(222, 222, 222)
        self.set_font("TH", "B", 46)
        with self.rotation(-32, 105, 145):
            self.text(55, 148, "สำเนา / COPY")
        self.set_text_color(0, 0, 0)
        self.set_draw_color(238, 238, 238)
        self.set_line_width(0.2)
        for _ in range(55):
            x = self.l_margin + self.rng.uniform(0, self.epw)
            y = self.t_margin + self.rng.uniform(0, 250)
            w = self.rng.uniform(0.6, 7)
            self.line(x, y, x + w, y + self.rng.uniform(-0.5, 0.5))

    # ------------------------------------------------------------------ pieces
    def _header(self, d):
        self.set_font("TH", "B", 14)
        self.cell(0, 8, val(d.get("supplier_name")), new_x="LMARGIN", new_y="NEXT")
        self.set_font("TH", "", 10)
        self.cell(0, 5, "เลขประจำตัวผู้เสียภาษี: " + val(d.get("supplier_tax_id")),
                  new_x="LMARGIN", new_y="NEXT")
        self.set_font("TH", "", 9)
        self.cell(0, 5, val(d.get("customer_address"), ""), new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def _table(self, d, lines):
        cols, row_h = COLS[self.layout], ROW_H[self.layout]
        self.set_font("TH", "B", 9 if self.layout != "abbreviated" else 8)
        x0 = self.l_margin
        for i, h in enumerate(HEADERS[self.layout]):
            self.set_x(x0 + sum(cols[:i]))
            self.cell(cols[i], row_h + 1, h, border=1, align="C")
        self.ln(row_h + 1)
        self.set_font("TH", "", 9 if self.layout != "abbreviated" else 8)
        if not lines:
            self.set_x(x0)
            self.set_text_color(140, 140, 140)
            self.cell(sum(cols), row_h, "(ไม่มีรายการสินค้าในเอกสารนี้ / no item lines printed)",
                      border=1, align="C")
            self.set_text_color(0, 0, 0)
            self.ln(row_h)
            return
        for line in lines:
            x = x0
            cells = [
                str(line["line_no"]),
                self.fit(line["description"], cols[1]),
                self._num(line["qty"]),
                self.fit(line["uom"], cols[3]),
                fmt(line["unit_price"]),
                fmt(line["amount"]),
            ]
            aligns = ["C", "L", "R", "C", "R", "R"]
            for i, text in enumerate(cells):
                self.set_x(x + sum(cols[:i]))
                self.cell(cols[i], row_h, text, border=1, align=aligns[i])
            self.ln(row_h)

    @staticmethod
    def _num(qty):
        if float(qty) == int(float(qty)):
            return f"{int(float(qty)):,d}"
        return f"{float(qty):,.4f}".rstrip("0")

    def _totals(self, d):
        label_x = self.l_margin + (60 if self.layout != "abbreviated" else 70)
        lw = 40 if self.layout != "abbreviated" else 35
        vw = 35 if self.layout != "abbreviated" else 30
        size = 10 if self.layout != "abbreviated" else 9
        self.set_font("TH", "", size)
        for label, value, bold in (("รวมก่อนภาษี", d["sub_total"], False),
                                   ("ภาษีมูลค่าเพิ่ม 7%", d["vat"], False),
                                   ("ยอดรวมทั้งสิ้น", d["grand_total"], True)):
            self.set_x(label_x)
            self.set_font("TH", "B" if bold else "", size + (1 if bold else 0))
            self.cell(lw, 6 + (1 if bold else 0), label, align="R")
            self.cell(vw, 6 + (1 if bold else 0), fmt(value), align="R")
            self.ln(6 + (1 if bold else 0))

    def _signatures(self, d):
        sig = d.get("signatures", {})
        y = self.get_y() + 12
        self.set_font("TH", "", 9)
        self.set_x(self.l_margin)
        self.cell(60, 5, "ผู้ส่งของ:")
        self.set_x(self.l_margin + 90)
        self.cell(60, 5, "ผู้รับของ:")
        self.set_draw_color(120, 120, 120)
        self.set_line_width(0.2)
        self.line(self.l_margin + 22, y + 14, self.l_margin + 62, y + 14)
        self.line(self.l_margin + 112, y + 14, self.l_margin + 152, y + 14)
        if sig.get("supplier_or_deliverer", {}).get("present"):
            draw_signature(self, self.l_margin + 26, y + 10)
        if sig.get("receiver", {}).get("present"):
            draw_signature(self, self.l_margin + 116, y + 10)
        self.set_y(y + 20)

    def _doc_meta(self, d):
        self.set_font("TH", "", 10)
        self.cell(0, 6, f"เลขที่: {val(d.get('invoice_num'))}    วันที่: {val(d.get('invoice_date'))}",
                  new_x="LMARGIN", new_y="NEXT")

    def _customer_block(self, d):
        self.cell(0, 6, f"ลูกค้า: {val(d.get('customer_name'))}", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 6, "เลขประจำตัวผู้เสียภาษี: " + val(d.get("customer_tax_id")),
                  new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 6, "เลขที่ PO: " + val(d.get("po_number")), new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def _footer_note(self):
        note = self.hints.get("note")
        if note:
            self.set_y(-28)
            self.set_font("TH", "", 8)
            self.set_text_color(150, 150, 150)
            self.cell(0, 5, f"หมายเหตุทดสอบ: {note}", new_x="LMARGIN", new_y="NEXT")
            self.set_text_color(0, 0, 0)

    def _continuation_header(self, d, page_no, pages):
        self.set_font("TH", "B", 11)
        self.cell(0, 6, val(d.get("supplier_name")), new_x="LMARGIN", new_y="NEXT")
        self.set_font("TH", "", 9)
        self.cell(0, 5, f"ใบกำกับภาษี (ต่อ) — เลขที่ {val(d.get('invoice_num'))} "
                        f"หน้า {page_no} จาก {pages}", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    # ------------------------------------------------------------------ layouts
    def generate_tax_invoice(self, d):
        lines = d["lines"]
        split = (bool(self.hints.get("split_pages")) and not self.hints.get("only_first_page")
                 and len(lines) > 2)
        first = lines if not split else lines[: max(2, (len(lines) + 1) // 2)]
        rest = [] if not split else lines[len(first):]
        pages = 2 if rest else 1

        self.add_page()
        if self.hints.get("scan_noise"):
            self.scan_noise()
        self._header(d)
        self.set_font("TH", "B", 16)
        self.cell(0, 8, "ใบกำกับภาษี / Tax Invoice", align="C", new_x="LMARGIN", new_y="NEXT")
        self._doc_meta(d)
        self._customer_block(d)
        self._table(d, first)
        if rest:
            self.set_font("TH", "", 9)
            self.set_text_color(120, 120, 120)
            self.cell(0, 6, "(มีรายการต่อในหน้าถัดไป / continued on the next page)",
                      new_x="LMARGIN", new_y="NEXT")
            self.set_text_color(0, 0, 0)
            self._totals(d)
        elif not d["lines"]:
            self._totals(d)
        else:
            self._totals(d)
            self._signatures(d)
        self._footer_note()

        if rest:
            self.add_page()
            if self.hints.get("scan_noise"):
                self.scan_noise()
            self._continuation_header(d, 2, pages)
            self._table(d, rest)
            self.ln(3)
            self._totals(d)
            self._signatures(d)
            self._footer_note()

    def generate_abbreviated(self, d):
        self.add_page()
        if self.hints.get("scan_noise"):
            self.scan_noise()
        self.set_font("TH", "B", 11)
        self.cell(0, 6, val(d.get("supplier_name")), new_x="LMARGIN", new_y="NEXT")
        self.set_font("TH", "", 8)
        self.cell(0, 4, "เลขประจำตัวผู้เสียภาษี: " + val(d.get("supplier_tax_id")),
                  new_x="LMARGIN", new_y="NEXT")
        self.set_font("TH", "B", 12)
        self.cell(0, 6, "ใบกำกับภาษีอย่างย่อ / Abbreviated Tax Invoice", align="C",
                  new_x="LMARGIN", new_y="NEXT")
        self.set_font("TH", "", 8)
        self.cell(0, 4, f"เลขที่: {val(d.get('invoice_num'))}  วันที่: {val(d.get('invoice_date'))}  "
                        f"ลูกค้า: {val(d.get('customer_name'))}", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 4, "เลขประจำตัวผู้เสียภาษี: " + val(d.get("customer_tax_id")),
                  new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 4, "PO: " + val(d.get("po_number")), new_x="LMARGIN", new_y="NEXT")
        self.ln(1)
        self._table(d, d["lines"])
        self.ln(2)
        self._totals(d)
        self._signatures(d)
        self._footer_note()

    def generate_commercial(self, d):
        self.add_page()
        if self.hints.get("scan_noise"):
            self.scan_noise()
        self.set_font("TH", "B", 16)
        self.cell(0, 8, "INVOICE", new_x="LMARGIN", new_y="NEXT")
        self.set_font("TH", "", 10)
        self.cell(0, 5, val(d.get("supplier_name")), new_x="LMARGIN", new_y="NEXT")
        self.set_font("TH", "", 8)
        self.cell(0, 4, "Tax ID: " + val(d.get("supplier_tax_id")), new_x="LMARGIN", new_y="NEXT")
        self.ln(3)
        self.set_font("TH", "B", 10)
        self.cell(0, 5, "Bill To", new_x="LMARGIN", new_y="NEXT")
        self.set_font("TH", "", 9)
        self.cell(0, 5, val(d.get("customer_name")), new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 5, "Tax ID: " + val(d.get("customer_tax_id")), new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 5, val(d.get("customer_address"), ""), new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 5, "PO Number: " + val(d.get("po_number")), new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 5, f"Invoice No: {val(d.get('invoice_num'))}   Date: {val(d.get('invoice_date'))}   "
                        f"Currency: {d.get('currency')}", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)
        self._table(d, d["lines"])
        self.ln(2)
        self._totals(d)
        self._signatures(d)
        self._footer_note()


def determine_layout(inv):
    d = inv.get("invoice_data", {})
    return d.get("pdf_hints", {}).get("layout") or d.get("layout", "tax_invoice")


def generate_pdf(inv):
    d = inv["invoice_data"]
    hints = d.get("pdf_hints", {})
    layout = determine_layout(inv)
    pdf = ThaiInvoicePDF(layout, hints, seed_text=inv["invoice_id"])
    getattr(pdf, f"generate_{layout}", pdf.generate_tax_invoice)(d)
    return pdf


def main():
    wanted = tuple(sys.argv[1:])
    dataset = json.loads(DATASET_FILE.read_text(encoding="utf-8"))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    written, layouts = 0, {}
    for inv in dataset["invoices"]:
        if wanted and not inv["invoice_id"].startswith(wanted):
            continue
        layout = determine_layout(inv)
        generate_pdf(inv).output(str(OUTPUT_DIR / inv["pdf_filename"]))
        layouts[layout] = layouts.get(layout, 0) + 1
        written += 1

    print(f"Generated {written} PDFs into {OUTPUT_DIR}")
    print(f"Layouts used: {layouts}")


if __name__ == "__main__":
    main()
