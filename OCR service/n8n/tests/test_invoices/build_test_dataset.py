"""Build tests/test_invoices/test_dataset.json from raw Oracle CSVs.

Reads _raw/oracle_receipts.csv (Query 1A) and _raw/oracle_entities.csv
(Query 1B), then generates 55 synthetic invoices across categories
A (valid), B (single-rule fail), C (multi-rule fail), D (intercompany),
E (edge cases), each with full ground-truth expected results.
"""
import csv
import json
from datetime import date, timedelta
from pathlib import Path

BASE = Path(__file__).resolve().parent
RAW = BASE / "_raw"
OUT = BASE / "test_dataset.json"

HIGH = {"E28", "E31", "E09", "E05", "E06", "E26"}
MEDIUM = {"E13", "E34", "E12"}
RULES = ["V-01", "V-02", "V-03", "V-04", "V-05", "V-06", "V-07", "V-08", "V-09"]
BASE_DATE = date(2026, 7, 1)
QUERY_DATE = "2026-10-02"


def load_csv(name):
    with open(RAW / name, encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        return [dict(zip(header, rec)) for rec in reader if len(rec) == len(header)]


def group_receipts(rows):
    groups = {}
    for r in rows:
        groups.setdefault(r["RCV_NUM"], []).append(r)
    ordered = sorted(groups.items())
    return [g for g in ordered if g[1][0].get("SUPPLIER_TAX_ID") and len(g[1][0]["SUPPLIER_TAX_ID"]) == 13]


def compute_fails(mods):
    fails = {}
    if ("supplier_tax_id" in mods and mods["supplier_tax_id"] is None) or ("po_number" in mods and mods["po_number"] is None):
        fails["V-01"] = "E13"
    if mods.get("line_amount_offset") is not None:
        fails["V-02"] = "E28"
    if mods.get("sub_total_offset") is not None or mods.get("vat_offset") is not None:
        fails["V-03"] = "E31"
    if mods.get("customer_tax_id") is not None:
        fails["V-05"] = "E09"
    if mods.get("receiver_signature") is False:
        fails["V-06"] = "E26"
    if mods.get("price_scale") is not None:
        fails["V-07"] = "E05"
        fails["V-09"] = "E31"
    if mods.get("qty_scale") is not None and mods["qty_scale"] > 1:
        fails["V-08"] = "E06"
    return fails


def build_rules(fails, mods):
    rules = {}
    for r in RULES:
        rules[r] = {"result": "FAIL", "code": fails[r]} if r in fails else {"result": "PASS", "code": None}
    if "V-02" in fails:
        for r in ["V-04", "V-05", "V-07", "V-08", "V-09"]:
            rules[r] = {"result": "not_evaluated", "code": None}
    if mods.get("sub_total_round") is not None and "V-03" not in fails:
        rules["V-03"] = {"result": "PASS", "code": "E16"}
    if mods.get("qty_scale") is not None and mods["qty_scale"] < 1 and "V-08" not in fails:
        rules["V-08"] = {"result": "PASS", "code": "E34"}
    return rules


def decide(rules):
    codes = [v["code"] for v in rules.values() if v["code"]]
    if any(c in HIGH for c in codes):
        return "Hold", "accounting"
    if any(c in MEDIUM for c in codes):
        return "Review", "supervisor"
    return "Auto-pass", None


def halted_by(rules):
    for r in RULES:
        code = rules[r]["code"]
        if code and code in HIGH:
            return r
    for r in RULES:
        code = rules[r]["code"]
        if code and code in MEDIUM:
            return r
    return None


def describe_mods(mods):
    parts = []
    if "supplier_tax_id" in mods and mods["supplier_tax_id"] is None:
        parts.append("supplier tax ID removed from the invoice")
    if "po_number" in mods and mods["po_number"] is None:
        parts.append("PO number removed from the invoice")
    if mods.get("line_amount_offset") is not None:
        parts.append(f"line amounts offset by {mods['line_amount_offset']} THB (qty x price != amount)")
    if mods.get("sub_total_offset") is not None:
        parts.append(f"sub_total offset by {mods['sub_total_offset']} THB (sum(lines) != sub_total)")
    if mods.get("vat_offset") is not None:
        parts.append(f"VAT offset by {mods['vat_offset']} THB (sub_total x 0.07 != vat)")
    if mods.get("sub_total_round") is not None:
        parts.append(f"sub_total rounded up by {mods['sub_total_round']} THB (minor rounding, within 0.50)")
    if mods.get("customer_tax_id") is not None:
        parts.append(f"customer tax ID altered to {mods['customer_tax_id']} (1-digit change)")
    if mods.get("receiver_signature") is False:
        parts.append("receiver signature omitted")
    if mods.get("price_scale") is not None:
        parts.append(f"unit prices scaled x{mods['price_scale']} (>1% and >200 THB deviation)")
    if mods.get("qty_scale") is not None:
        parts.append(f"quantities scaled x{mods['qty_scale']}")
    if mods.get("buddhist_date"):
        parts.append("invoice date written in Buddhist Era (year + 543)")
    if mods.get("po_prefix"):
        parts.append(f"PO number written with prefix '{mods['po_prefix']}'")
    if mods.get("long_desc"):
        parts.append("item descriptions extended with mixed Thai/English text (V-07 matching challenge)")
    if mods.get("inv_num_style"):
        parts.append(f"invoice number format variation ({mods['inv_num_style']})")
    if isinstance(mods.get("supplier_tax_id"), str):
        parts.append(f"supplier tax ID set to internal entity tax ID {mods['supplier_tax_id']} (intercompany)")
    return "; ".join(parts) if parts else "no modification (valid invoice)"


CATEGORY_LABELS = {
    "A": "Valid — Auto-pass",
    "B": "Single Rule FAIL",
    "C": "Multi-Rule FAIL",
    "D": "Intercompany",
    "E": "Edge Cases & OCR Challenges",
}


def main():
    receipt_rows = load_csv("oracle_receipts.csv")
    entity_rows = load_csv("oracle_entities.csv")
    internal_tax_ids = {r["TAX_ID"] for r in entity_rows if r.get("TAX_ID")}
    groups = group_receipts(receipt_rows)
    multi_groups = [i for i, (rcv, rows) in enumerate(groups) if len(rows) >= 3]

    def g(i):
        return groups[i % len(groups)]

    specs = [
        # ---- Category A: valid (15) ----
        dict(id="INV-A01", cat="A", gidx=0, layout="tax_invoice", mods={}, target=None, difficulty="easy",
             desc="Perfect match invoice using real Oracle data"),
        dict(id="INV-A02", cat="A", gidx=1, layout="tax_invoice", mods={}, target=None, difficulty="easy",
             desc="Perfect match invoice using real Oracle data"),
        dict(id="INV-A03", cat="A", gidx=2, layout="tax_invoice", mods={}, target=None, difficulty="easy",
             desc="Perfect match invoice using real Oracle data"),
        dict(id="INV-A04", cat="A", gidx=3, layout="tax_invoice", mods={}, target=None, difficulty="easy",
             desc="Perfect match invoice using real Oracle data"),
        dict(id="INV-A05", cat="A", gidx=4, layout="tax_invoice", mods={}, target=None, difficulty="easy",
             desc="Perfect match invoice using real Oracle data"),
        dict(id="INV-A06", cat="A", gidx=5, layout="tax_invoice", mods={"sub_total_round": 0.3}, target="V-03",
             difficulty="medium", desc="Valid with minor rounding: sub_total off by 0.30 (E16 Low)"),
        dict(id="INV-A07", cat="A", gidx=6, layout="tax_invoice", mods={"sub_total_round": 0.4}, target="V-03",
             difficulty="medium", desc="Valid with minor rounding: sub_total off by 0.40 (E16 Low)"),
        dict(id="INV-A08", cat="A", gidx=7, layout="tax_invoice", mods={"sub_total_round": 0.5}, target="V-03",
             difficulty="medium", desc="Valid with minor rounding: sub_total off by 0.50 (E16 Low)"),
        dict(id="INV-A09", cat="A", gidx=8, layout="tax_invoice", mods={"qty_scale": 0.5}, target="V-08",
             difficulty="medium", desc="Partial billing: invoice qty below received qty (E34 Medium, Review)"),
        dict(id="INV-A10", cat="A", gidx=9, layout="tax_invoice", mods={"qty_scale": 0.6}, target="V-08",
             difficulty="medium", desc="Partial billing: invoice qty below received qty (E34 Medium, Review)"),
        dict(id="INV-A11", cat="A", gidx=10, layout="tax_invoice", mods={"qty_scale": 0.75}, target="V-08",
             difficulty="medium", desc="Partial billing: invoice qty below received qty (E34 Medium, Review)"),
        dict(id="INV-A12", cat="A", gidx=multi_groups[0], layout="abbreviated", mods={}, target=None,
             difficulty="medium", desc="Valid multi-line invoice, abbreviated tax invoice layout"),
        dict(id="INV-A13", cat="A", gidx=multi_groups[1], layout="commercial", mods={}, target=None,
             difficulty="medium", desc="Valid multi-line invoice, English commercial layout"),
        dict(id="INV-A14", cat="A", gidx=multi_groups[2], layout="abbreviated", mods={}, target=None,
             difficulty="medium", desc="Valid multi-line invoice, abbreviated tax invoice layout"),
        dict(id="INV-A15", cat="A", gidx=multi_groups[3], layout="commercial", mods={}, target=None,
             difficulty="medium", desc="Valid multi-line invoice, English commercial layout"),
        # ---- Category B: single-rule fail (15) ----
        dict(id="INV-B01", cat="B", gidx=11, layout="tax_invoice", mods={"supplier_tax_id": None},
             target="V-01", difficulty="easy", desc="V-01 FAIL: supplier tax ID missing (E13)"),
        dict(id="INV-B02", cat="B", gidx=12, layout="tax_invoice", mods={"po_number": None},
             target="V-01", difficulty="easy", desc="V-01 FAIL: PO number missing (E13)"),
        dict(id="INV-B03", cat="B", gidx=13, layout="tax_invoice", mods={"line_amount_offset": 200.0},
             target="V-02", difficulty="easy", desc="V-02 FAIL: line amount off by 200 THB (E28), Oracle query skipped"),
        dict(id="INV-B04", cat="B", gidx=14, layout="tax_invoice", mods={"line_amount_offset": 350.0},
             target="V-02", difficulty="easy", desc="V-02 FAIL: line amount off by 350 THB (E28), Oracle query skipped"),
        dict(id="INV-B05", cat="B", gidx=15, layout="tax_invoice", mods={"sub_total_offset": 500.0},
             target="V-03", difficulty="easy", desc="V-03 FAIL: sum(lines) != sub_total by 500 THB (E31)"),
        dict(id="INV-B06", cat="B", gidx=16, layout="tax_invoice", mods={"vat_offset": 120.0},
             target="V-03", difficulty="easy", desc="V-03 FAIL: sub_total x 0.07 != vat by 120 THB (E31)"),
        dict(id="INV-B07", cat="B", gidx=17, layout="tax_invoice", mods={"customer_tax_id": "0107545000178"},
             target="V-05", difficulty="easy", desc="V-05 FAIL: customer tax ID last digit changed (E09)"),
        dict(id="INV-B08", cat="B", gidx=18, layout="tax_invoice", mods={"customer_tax_id": "0107545000170"},
             target="V-05", difficulty="easy", desc="V-05 FAIL: customer tax ID 2nd-to-last digit changed (E09)"),
        dict(id="INV-B09", cat="B", gidx=19, layout="tax_invoice", mods={"receiver_signature": False},
             target="V-06", difficulty="easy", desc="V-06 FAIL: receiver signature missing (E26)"),
        dict(id="INV-B10", cat="B", gidx=20, layout="tax_invoice", mods={"receiver_signature": False},
             target="V-06", difficulty="easy", desc="V-06 FAIL: receiver signature missing (E26)"),
        dict(id="INV-B11", cat="B", gidx=21, layout="tax_invoice", mods={"price_scale": 1.5},
             target="V-07", difficulty="easy", desc="V-07 FAIL: unit price x1.5 (>1% and >200 THB) (E05)"),
        dict(id="INV-B12", cat="B", gidx=22, layout="tax_invoice", mods={"price_scale": 1.4},
             target="V-07", difficulty="easy", desc="V-07 FAIL: unit price x1.4 (>1% and >200 THB) (E05)"),
        dict(id="INV-B13", cat="B", gidx=23, layout="tax_invoice", mods={"qty_scale": 1.5},
             target="V-08", difficulty="easy", desc="V-08 FAIL: invoice qty exceeds received qty (E06)"),
        dict(id="INV-B14", cat="B", gidx=24, layout="tax_invoice", mods={"qty_scale": 1.3},
             target="V-08", difficulty="easy", desc="V-08 FAIL: invoice qty exceeds received qty (E06)"),
        dict(id="INV-B15", cat="B", gidx=25, layout="tax_invoice", mods={"price_scale": 1.1},
             target="V-09", difficulty="easy", desc="V-09 FAIL: sub_total differs from Oracle sum by >0.50 (E31); V-07 side-effect (E05)"),
        # ---- Category C: multi-rule fail (10) ----
        dict(id="INV-C01", cat="C", gidx=26, layout="tax_invoice",
             mods={"supplier_tax_id": None, "sub_total_offset": 400.0},
             target="V-01+V-03", difficulty="medium", desc="Missing supplier tax ID AND sub_total mismatch (E13 + E31)"),
        dict(id="INV-C02", cat="C", gidx=27, layout="tax_invoice",
             mods={"po_number": None, "vat_offset": 150.0},
             target="V-01+V-03", difficulty="medium", desc="Missing PO number AND vat mismatch (E13 + E31)"),
        dict(id="INV-C03", cat="C", gidx=28, layout="tax_invoice",
             mods={"customer_tax_id": "0107545000279", "price_scale": 1.5},
             target="V-05+V-07", difficulty="medium", desc="Wrong customer tax ID AND unit price x1.5 (E09 + E05)"),
        dict(id="INV-C04", cat="C", gidx=29, layout="tax_invoice",
             mods={"customer_tax_id": "0107545000171", "price_scale": 1.4},
             target="V-05+V-07", difficulty="medium", desc="Wrong customer tax ID AND unit price x1.4 (E09 + E05)"),
        dict(id="INV-C05", cat="C", gidx=30, layout="tax_invoice",
             mods={"line_amount_offset": 300.0, "qty_scale": 1.5},
             target="V-02+V-08", difficulty="medium",
             desc="Line math error AND qty exceeds received (E28 primary; V-08 not evaluated because Oracle query is skipped)"),
        dict(id="INV-C06", cat="C", gidx=31, layout="tax_invoice",
             mods={"line_amount_offset": 250.0, "qty_scale": 1.4},
             target="V-02+V-08", difficulty="medium",
             desc="Line math error AND qty exceeds received (E28 primary; V-08 not evaluated because Oracle query is skipped)"),
        dict(id="INV-C07", cat="C", gidx=32, layout="tax_invoice",
             mods={"price_scale": 1.5, "qty_scale": 1.5},
             target="V-07+V-08+V-09", difficulty="medium",
             desc="Wrong price, over-billed qty, and total mismatch (E05 + E06 + E31)"),
        dict(id="INV-C08", cat="C", gidx=33, layout="tax_invoice",
             mods={"price_scale": 1.4, "qty_scale": 1.3},
             target="V-07+V-08+V-09", difficulty="medium",
             desc="Wrong price, over-billed qty, and total mismatch (E05 + E06 + E31)"),
        dict(id="INV-C09", cat="C", gidx=34, layout="tax_invoice",
             mods={"po_number": None, "customer_tax_id": "0107545000170", "receiver_signature": False},
             target="V-01+V-05+V-06", difficulty="medium",
             desc="Missing PO, wrong customer tax ID, no receiver signature (E13 + E09 + E26)"),
        dict(id="INV-C10", cat="C", gidx=35, layout="tax_invoice",
             mods={"supplier_tax_id": None, "customer_tax_id": "0107545000178", "receiver_signature": False},
             target="V-01+V-05+V-06", difficulty="medium",
             desc="Missing supplier tax ID, wrong customer tax ID, no receiver signature (E13 + E09 + E26)"),
        # ---- Category D: intercompany (5) ----
        dict(id="INV-D01", cat="D", gidx=36, layout="tax_invoice", mods={"supplier_tax_id": "0145548001549"},
             target=None, difficulty="easy", desc="Intercompany: supplier tax ID = AHP internal entity tax ID"),
        dict(id="INV-D02", cat="D", gidx=37, layout="tax_invoice", mods={"supplier_tax_id": "0107547000354"},
             target=None, difficulty="easy", desc="Intercompany: supplier tax ID = Aapico Forging internal entity tax ID"),
        dict(id="INV-D03", cat="D", gidx=38, layout="tax_invoice",
             mods={"supplier_tax_id": "0135547003157", "qty_scale": 1.3},
             target="V-08", difficulty="medium", desc="Intercompany + invoice qty exceeds received (E06)"),
        dict(id="INV-D04", cat="D", gidx=39, layout="tax_invoice",
             mods={"supplier_tax_id": "0145548001557", "sub_total_offset": 600.0},
             target="V-03", difficulty="medium", desc="Intercompany + sub_total mismatch (E31)"),
        dict(id="INV-D05", cat="D", gidx=40, layout="tax_invoice",
             mods={"supplier_tax_id": "0145549002271", "price_scale": 1.4},
             target="V-07", difficulty="medium", desc="Intercompany + wrong unit price (E05, V-09 side-effect E31)"),
        # ---- Category E: edge cases (10) ----
        dict(id="INV-E01", cat="E", gidx=41, layout="tax_invoice", mods={"buddhist_date": True},
             target=None, difficulty="hard", desc="Buddhist Era date (2569 instead of 2026); system converts, V-01 PASS"),
        dict(id="INV-E02", cat="E", gidx=42, layout="tax_invoice", mods={"buddhist_date": True},
             target=None, difficulty="hard", desc="Buddhist Era date (2569 instead of 2026); system converts, V-01 PASS"),
        dict(id="INV-E03", cat="E", gidx=43, layout="tax_invoice", mods={"po_prefix": "AH-"},
             target=None, difficulty="hard", desc="PO number with 'AH-' prefix; system extracts last 8 digits, V-01 PASS"),
        dict(id="INV-E04", cat="E", gidx=44, layout="tax_invoice", mods={"po_prefix": "PO"},
             target=None, difficulty="hard", desc="PO number with 'PO' prefix; system extracts last 8 digits, V-01 PASS"),
        dict(id="INV-E05", cat="E", gidx=45, layout="tax_invoice", mods={"long_desc": True},
             target=None, difficulty="hard", desc="Long mixed Thai/English item descriptions (V-07 matching challenge)"),
        dict(id="INV-E06", cat="E", gidx=46, layout="tax_invoice", mods={"long_desc": True},
             target=None, difficulty="hard", desc="Long mixed Thai/English item descriptions (V-07 matching challenge)"),
        dict(id="INV-E07", cat="E", gidx=47, layout="tax_invoice", mods={"customer_tax_id": "0107545000178"},
             target="V-05", difficulty="hard", desc="Subtle 1-digit customer tax ID error (last digit), V-05 FAIL E09"),
        dict(id="INV-E08", cat="E", gidx=48, layout="tax_invoice", mods={"customer_tax_id": "0107545000170"},
             target="V-05", difficulty="hard", desc="Subtle 1-digit customer tax ID error (2nd-to-last digit), V-05 FAIL E09"),
        dict(id="INV-E09", cat="E", gidx=49, layout="tax_invoice", mods={"inv_num_style": "noslash"},
             target=None, difficulty="hard", desc="Invoice number without slash (SQ2600154); system normalizes, V-04 PASS"),
        dict(id="INV-E10", cat="E", gidx=50, layout="tax_invoice", mods={"inv_num_style": "slash"},
             target=None, difficulty="hard", desc="Invoice number with slash (SQ26/00155); V-04 PASS"),
    ]

    invoices = []
    for n, spec in enumerate(specs):
        rcv_num, rows = g(spec["gidx"])
        base = rows[0]
        mods = spec["mods"]

        lines = []
        for i, r in enumerate(rows, 1):
            qty = float(r["RCV_QTY"])
            price = float(r["PO_UPRICE"])
            if mods.get("price_scale") is not None:
                price = round(price * mods["price_scale"], 2)
            if mods.get("qty_scale") is not None:
                qty = round(qty * mods["qty_scale"], 2)
            amount = round(qty * price, 2)
            if mods.get("line_amount_offset") is not None:
                amount = round(amount + mods["line_amount_offset"], 2)
            desc = r["ITM_DESC"]
            if mods.get("long_desc"):
                desc = (desc + " — วัตถุดิบ: stainless steel grade 304, คุณภาพสูง, "
                        "เหมาะสำหรับงานรถยนต์, ทนสูร์แคโรเซ่น, มาตรฐาน IATF 16949")
            lines.append({
                "line_no": i,
                "description": desc,
                "qty": qty,
                "uom": r["UOM"],
                "unit_price": price,
                "amount": amount,
            })

        sub_total = round(sum(l["amount"] for l in lines), 2)
        if mods.get("sub_total_offset") is not None:
            sub_total = round(sub_total + mods["sub_total_offset"], 2)
        if mods.get("sub_total_round") is not None:
            sub_total = round(sub_total + mods["sub_total_round"], 2)
        vat = round(sub_total * 0.07, 2)
        if mods.get("vat_offset") is not None:
            vat = round(vat + mods["vat_offset"], 2)
        grand_total = round(sub_total + vat, 2)

        inv_date = BASE_DATE + timedelta(days=n % 90)
        if mods.get("buddhist_date"):
            inv_date_str = f"{inv_date.day:02d}/{inv_date.month:02d}/{inv_date.year + 543:04d}"
        else:
            inv_date_str = inv_date.strftime("%d/%m/%Y")

        inv_num = f"SQ26/{100 + n:05d}"
        if mods.get("inv_num_style") == "noslash":
            inv_num = f"SQ26{100 + n:05d}"

        po_number = base["PO_NUM"]
        if mods.get("po_prefix"):
            po_number = f"{mods['po_prefix']}{base['PO_NUM']}"
        if "po_number" in mods and mods["po_number"] is None:
            po_number = None

        supplier_tax_id = base["SUPPLIER_TAX_ID"]
        if "supplier_tax_id" in mods:
            supplier_tax_id = mods["supplier_tax_id"]

        customer_tax_id = base["CUSTOMER_TAX_ID"]
        if mods.get("customer_tax_id") is not None:
            customer_tax_id = mods["customer_tax_id"]

        intercompany = spec["cat"] == "D" or (
            isinstance(supplier_tax_id, str) and supplier_tax_id in internal_tax_ids
        )

        fails = compute_fails(mods)
        rules = build_rules(fails, mods)
        status, assigned_to = decide(rules)
        codes = [v["code"] for v in rules.values() if v["code"]]

        notes_map = {
            "A": "All fields match Oracle EBS exactly (or within Low/Medium tolerance).",
            "B": "Single targeted rule failure; Oracle query skipped when V-02 fails.",
            "C": "Multiple simultaneous rule failures.",
            "D": "Supplier tax ID belongs to an internal entity (intercompany).",
            "E": "Edge case: format/encoding variations the system must normalize.",
        }
        if "V-02" in fails:
            notes_map["B"] = "V-02 E28 causes halt; Oracle EBS query is SKIPPED, so V-04 through V-09 are not_evaluated."
            notes_map["C"] = "V-02 E28 causes halt; Oracle EBS query is SKIPPED, so V-04 through V-09 are not_evaluated."

        invoices.append({
            "invoice_id": spec["id"],
            "pdf_filename": f"{spec['id']}.pdf",
            "category": spec["cat"],
            "category_label": CATEGORY_LABELS[spec["cat"]],
            "difficulty": spec["difficulty"],
            "description": spec["desc"],
            "oracle_source": {
                "po_number": base["PO_NUM"],
                "receipt_num": rcv_num,
                "org_id": int(base["INV_ORG_ID"]),
                "ou_org_id": int(base["OU_ORG_ID"]),
                "ou_name": base["OU_NAME"],
            },
            "invoice_data": {
                "supplier_name": base["SUPPLIER_NAME"],
                "supplier_tax_id": supplier_tax_id,
                "customer_name": base["OU_NAME"],
                "customer_tax_id": customer_tax_id,
                "customer_address": " ".join(
                    x for x in [base["CUSTOMER_ADDR1"], base["CUSTOMER_ADDR2"], base["CUSTOMER_POSTAL"]] if x
                ),
                "invoice_num": inv_num,
                "invoice_date": inv_date_str,
                "po_number": po_number,
                "currency": "THB",
                "lines": lines,
                "sub_total": sub_total,
                "vat": vat,
                "grand_total": grand_total,
                "signatures": {
                    "supplier_or_deliverer": {"present": True},
                    "receiver": {"present": mods.get("receiver_signature", True)},
                },
                "layout": spec["layout"],
            },
            "expected_result": {
                "decision_status": status,
                "assigned_to": assigned_to,
                "halted_by": halted_by(rules),
                "manual_review": False,
                "intercompany": intercompany,
                "rules": rules,
                "expected_exceptions": codes,
                "notes": notes_map[spec["cat"]],
            },
            "forgery_details": (
                None if not mods else {
                    "target_rule": spec["target"],
                    "modification": describe_mods(mods),
                    "detection_difficulty": spec["difficulty"],
                }
            ),
        })

    dataset = {
        "metadata": {
            "generated_at": "2026-10-02T10:00:00Z",
            "generator": "Synthetic Invoice Generator v1.0",
            "total_invoices": len(invoices),
            "oracle_source_query_date": QUERY_DATE,
            "distribution": {
                "auto_pass": 15,
                "single_fail": 15,
                "multi_fail": 10,
                "intercompany": 5,
                "edge_cases": 10,
            },
        },
        "invoices": invoices,
    }

    OUT.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} with {len(invoices)} invoices")


if __name__ == "__main__":
    main()
