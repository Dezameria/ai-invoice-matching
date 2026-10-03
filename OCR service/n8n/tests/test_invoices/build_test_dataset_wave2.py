"""Wave 2 — add 100 synthetic invoices (INV-F/G/H/I/J series) to test_dataset.json.

Differences from build_test_dataset.py (wave 1, INV-A..E):
  * Expected results are NOT hand-written. Every `expected_result` is produced by
    the production Standard v6.2 engine through invoice_engine.run_engine(),
    so the answer key can never drift from app/core/rules.py.
  * The Oracle rows fed to the engine are stored per invoice (`oracle_rows`),
    which keeps the whole dataset reproducible without Oracle connectivity.
  * Wider coverage: E17/E35/Manual-Review (50-row safety cap), UOM E12,
    E29 in-tolerance pricing, boundary values (0.50 / 1.00 / 1%), price-swap
    forgeries, silent forgeries and multi-page / scan-noise documents.

Run:  python build_test_dataset_wave2.py
"""
import csv
import hashlib
import json
import re
from datetime import date, timedelta
from pathlib import Path

from invoice_engine import compact_rows, expected_result_block, receipt_from_csv_row, run_engine

BASE = Path(__file__).resolve().parent
RAW = BASE / "_raw"
OUT = BASE / "test_dataset.json"

MEDIUM = {"E12", "E13", "E34"}
HIGH = {"E05", "E06", "E09", "E17", "E26", "E28", "E30", "E31", "E35"}
BASE_DATE = date(2026, 7, 6)
QUERY_DATE = "2026-10-02"
WAVE = 2
GENERATOR = "Synthetic Invoice Generator v2.0 (engine-derived expectations)"

ALT_ADDRESS = "88/5 Bang Na-Trat Road, Bang Na, Bangkok 10260"
BRANCH_ADDRESS_SUFFIX = "สาขา 00003"
INTERNAL_SUPPLIERS = [
    ("บริษัท อาปิโก ไฮเทค พาร์ทส จำกัด", "0145548001549"),
    ("บริษัท อาปิโก ไฮเทค ทูลลิ่ง จำกัด", "0145548001557"),
    ("บริษัท อาพิโก อมาตะ จำกัด", "0105535001499"),
    ("บริษัท อาปิโก Precision จำกัด", "0205557018563"),
    ("บริษัท เอเอไอทีเอส จำกัด", "0135547003157"),
    ("บริษัท เอ อีอาร์พี จำกัด", "0145553001179"),
]
ABSENT_POS = ["40099001", "40099002", "40099003", "40099004"]
LONG_DESC_TAIL = (" — วัตถุดิบ stainless steel grade 304, คุณภาพสูง สำหรับงาน automotive, "
                  "ทนความร้อน/กัดกร่อน, มาตรฐาน IATF 16949, LOT/TRACEABILITY REQUIRED")
CATEGORY_LABELS = {
    "F": "Valid / Tolerated (Wave 2)",
    "G": "Single Rule FAIL (Wave 2)",
    "H": "Multi-Rule FAIL (Wave 2)",
    "I": "Intercompany (Wave 2)",
    "J": "Edge Cases & OCR Challenges (Wave 2)",
}


# =============================================================================
# Raw data loading and deterministic group selection
# =============================================================================
def load_csv(name):
    with open(RAW / name, encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        return [dict(zip(header, rec)) for rec in reader if len(rec) == len(header)]


def load_pool():
    rows = load_csv("oracle_receipts.csv")
    groups = {}
    for r in rows:
        groups.setdefault(r["RCV_NUM"], []).append(r)
    ordered = sorted(groups.items())
    valid = [(k, v) for k, v in ordered
             if v[0].get("SUPPLIER_TAX_ID") and len(v[0]["SUPPLIER_TAX_ID"]) == 13]
    # wave 1 consumed ordered indexes 0..50, start the wave-2 pool past them
    pool = valid[51:] + valid[:51]
    real_pos = {r["PO_NUM"] for r in rows}
    return valid, pool, real_pos


class Picker:
    """Deterministic, non-repeating base-data picker."""

    def __init__(self, valid, pool, real_pos):
        self.valid = valid
        self.pool = pool
        self.real_pos = real_pos
        self.used = set()
        self.reuse_cursor = {}

    @staticmethod
    def _match(rows, crit):
        if "min_lines" in crit and len(rows) < crit["min_lines"]:
            return False
        if "max_lines" in crit and len(rows) > crit["max_lines"]:
            return False
        if "uom_in" in crit and not any(r["UOM"] in crit["uom_in"] for r in rows):
            return False
        if "min_price" in crit and not any(float(r["PO_UPRICE"]) >= crit["min_price"] for r in rows):
            return False
        if "max_qty" in crit and not any(float(r["RCV_QTY"]) <= crit["max_qty"] for r in rows):
            return False
        if "qty_eq" in crit and not any(float(r["RCV_QTY"]) == crit["qty_eq"] for r in rows):
            return False
        if "min_line_total" in crit and not any(
                float(r["RCV_QTY"]) * float(r["PO_UPRICE"]) >= crit["min_line_total"] for r in rows):
            return False
        if "supplier_like" in crit and not any(
                crit["supplier_like"].lower() in r["SUPPLIER_NAME"].lower() for r in rows):
            return False
        return True

    def pick(self, crit):
        matches = [(k, v) for k, v in self.pool if self._match(v, crit)]
        if not matches:
            raise LookupError(f"no base-data group matches {crit}")
        fresh = [m for m in matches if m[0] not in self.used]
        if fresh:
            key, rows = fresh[0]
            self.used.add(key)
            return key, rows
        if crit.get("reuse") is False:
            raise LookupError(f"base-data exhausted for {crit}")
        # shapes are scarce (only 19 multi-line receipts in the extract), so reuse is allowed
        # but always after every fresh group has been used once
        n = self.reuse_cursor.get(repr(sorted(crit.items())), 0)
        self.reuse_cursor[repr(sorted(crit.items()))] = n + 1
        return matches[n % len(matches)]

    def pick_price_swap(self):
        """Group holding >=2 rows with identical qty but very different unit prices."""
        candidates = []
        for key, rows in self.valid:
            found = self._swap_pair(rows)
            if found:
                candidates.append((key, rows, found))
        if not candidates:
            raise LookupError("no price-swap candidate group found")
        fresh = [c for c in candidates if c[0] not in self.used]
        if fresh:
            self.used.add(fresh[0][0])
            return fresh[0]
        self.reuse_cursor["price_swap"] = self.reuse_cursor.get("price_swap", 0) + 1
        n = self.reuse_cursor["price_swap"]
        return candidates[n % len(candidates)]

    @staticmethod
    def _swap_pair(rows):
        byq = {}
        for i, r in enumerate(rows):
            byq.setdefault(r["RCV_QTY"], []).append(i)
        for _q, idxs in byq.items():
            if len(idxs) >= 2:
                prices = [float(rows[i]["PO_UPRICE"]) for i in idxs]
                if max(prices) - min(prices) > 250:
                    lo = min(idxs, key=lambda i: float(rows[i]["PO_UPRICE"]))
                    hi = max(idxs, key=lambda i: float(rows[i]["PO_UPRICE"]))
                    return (lo, hi)
        return None

    def pick_multi_receipt(self):
        """Two receipts (distinct RECEIPT_NUM) under the same PO — feeds V-04 E35."""
        by_po = {}
        for key, rows in self.valid:
            by_po.setdefault(rows[0]["PO_NUM"], []).append((key, rows))
        for po, entries in sorted(by_po.items()):
            if len(entries) < 2:
                continue
            a, b = entries[0], entries[1]
            if a[0] in self.used or b[0] in self.used:
                continue
            if a[1][0]["SUPPLIER_TAX_ID"] != b[1][0]["SUPPLIER_TAX_ID"]:
                continue
            self.used.update([a[0], b[0]])
            return po, a, b
        raise LookupError("no multi-receipt PO found")


# =============================================================================
# Case construction
# =============================================================================
def money(v):
    return round(v + 0.0, 2)


def supplier_abbr(name):
    words = re.findall(r"[A-Z0-9]+", name.upper())
    core = "".join(w[0] for w in words if w not in {"CO", "LTD", "PUBLIC", "THAILAND"})
    return (core[:3] or "ABC") + "26"


def invoice_number(idx, supplier_name, style):
    abbr = supplier_abbr(supplier_name)
    serial = 10000 + idx
    base = f"{abbr}/{serial:05d}"
    if style == "dash":
        return f"{abbr}-{serial:05d}"
    if style == "noslash":
        return f"{abbr}{serial:05d}"
    if style == "space":
        return f"{abbr} {serial:05d}"
    if style == "lower":
        return base.lower()
    if style == "dot":
        return f"{abbr}.{serial:05d}"
    return base


def date_text(idx, style):
    d = BASE_DATE + timedelta(days=(idx * 3) % 88)
    if style == "be":
        return f"{d.day:02d}/{d.month:02d}/{d.year + 543}"
    if style == "thai_month":
        return f"{d.day} ก.ค. {d.year + 543}"
    return d.strftime("%d/%m/%Y")


def po_text(po, style):
    if style == "prefix_ah":
        return f"AH-{po}"
    if style == "prefix_po":
        return f"PO{po}"
    if style == "dashes":
        return f"{po[:5]}-{po[5:]}"
    return po


def build_invoice_lines(receipt_rows, mods, swap_map=None):
    """Turn Oracle receipt rows (OracleReceipt dicts) into printed invoice lines."""
    src = list(receipt_rows)
    if mods.get("drop_line") is not None:
        src = [r for i, r in enumerate(src) if i != mods["drop_line"]]
    lines = []
    for i, r in enumerate(src, 1):
        qty = float(r["QUANTITY_RECEIVED"])
        price = float(r["UNIT_PRICE"])
        desc = r["ITEM_DESCRIPTION"]
        item_no = r["ITEM_NUMBER"]

        if mods.get("price_scale") is not None:
            price = money(price * mods["price_scale"])
        pa = mods.get("price_abs")
        if pa is not None and pa.get("line", i) in (i, "all"):
            price = money(price + pa["delta"])
        if swap_map and i - 1 in swap_map:
            price = float(receipt_rows[swap_map[i - 1]]["UNIT_PRICE"])
        if mods.get("qty_scale") is not None:
            qty = money(qty * mods["qty_scale"])

        amount = money(qty * price)
        offset = mods.get("line_amount_offset")
        if offset is not None and mods.get("line_amount_offset_line", i) in (i, "all"):
            amount = money(amount + offset)

        if mods.get("desc_strip_code") and item_no:
            desc = desc.replace(item_no, " ").strip()
        if mods.get("desc_suffix"):
            desc = desc + LONG_DESC_TAIL
        if mods.get("desc_prefix_lot"):
            desc = f"LOT#{2600 + i} / {desc}"

        uom = mods.get("uom_print") or r["UNIT_MEAS_LOOKUP_CODE"]
        lines.append({
            "line_no": i,
            "description": desc.strip() or item_no,
            "qty": qty,
            "uom": uom,
            "unit_price": price,
            "amount": amount,
        })

    if mods.get("price_shift_balance"):
        psb = mods["price_shift_balance"]
        gain = lines[psb.get("gain_line", 1) - 1]
        delta_amt = money(gain["qty"] * gain["unit_price"] * psb["pct"])
        others = [l for l in lines if l is not gain]
        assert others, "price_shift_balance needs at least two lines"
        loss = others[0] if "loss_line" not in psb else lines[psb["loss_line"] - 1]
        new_loss_price = money(loss["unit_price"] - delta_amt / loss["qty"])
        assert new_loss_price > 0, "balancing line cannot absorb the price shift"
        gain["unit_price"] = money(gain["unit_price"] + delta_amt / gain["qty"])
        loss["unit_price"] = new_loss_price
        for l in (gain, loss):
            l["amount"] = money(l["qty"] * l["unit_price"])

    if mods.get("duplicate_line"):
        dup = []
        for l in lines:
            dup.append(l)
            dup.append(dict(l))
        lines = [dict(l, line_no=i) for i, l in enumerate(dup, 1)]
    if mods.get("reorder_lines") and len(lines) > 1:
        lines = lines[::-1]
    return lines


def compute_totals(lines, mods):
    sub = money(sum(l["amount"] for l in lines))
    if mods.get("sub_total_offset") is not None:
        sub = money(sub + mods["sub_total_offset"])
    if mods.get("sub_total_round") is not None:
        sub = money(sub + mods["sub_total_round"])
    if mods.get("sub_total_override") is not None:
        sub = money(mods["sub_total_override"])
    vat = money(sub * 0.07)
    if mods.get("vat_offset") is not None:
        vat = money(vat + mods["vat_offset"])
    grand = money(sub + vat)
    if mods.get("grand_total_offset") is not None:
        grand = money(grand + mods["grand_total_offset"])
    return sub, vat, grand


def shift_digit(tax_id, position=-1, delta=1):
    digits = list(tax_id)
    digits[position] = str((int(digits[position]) + delta) % 10)
    return "".join(digits)


def mask_tax_id(tax_id):
    return f"{tax_id[:4]}-{tax_id[4:8]}-{tax_id[8:12]}-{tax_id[12]}"


def build_entry(spec, picker, internal_tax_ids, idx):
    mods = spec.get("mods", {})
    scenario = spec.get("scenario", "single_receipt")
    swap_map = None

    if scenario == "single_receipt":
        key, rows = picker.pick(spec.get("pick", {}))
        basis_rows = [receipt_from_csv_row(r, i) for i, r in enumerate(rows, 1)]
        oracle_rows = basis_rows
        base, po_number, receipt_label = rows[0], rows[0]["PO_NUM"], key
    elif scenario == "price_swap":
        key, rows, (lo, hi) = picker.pick_price_swap()
        basis_rows = [receipt_from_csv_row(r, i) for i, r in enumerate(rows, 1)]
        oracle_rows = basis_rows
        swap_map = {lo: hi, hi: lo}
        base, po_number, receipt_label = rows[0], rows[0]["PO_NUM"], key
    elif scenario == "no_receipts":
        key, rows = picker.pick(spec.get("pick", {}))
        basis_rows = [receipt_from_csv_row(r, i) for i, r in enumerate(rows, 1)]
        oracle_rows = []  # the ERP returns nothing for this PO
        base, po_number = rows[0], spec["absent_po"]
        receipt_label = f"{spec['absent_po']} (no Oracle receipt)"
    elif scenario == "multi_receipt":
        po_number, (ka, ra), (kb, rb) = picker.pick_multi_receipt()
        merged = list(ra) + list(rb)
        basis_rows = [receipt_from_csv_row(r, i) for i, r in enumerate(merged, 1)]
        oracle_rows = basis_rows
        base, receipt_label = ra[0], f"{ka} + {kb}"
    elif scenario == "cap50":
        key, rows = picker.pick({"min_lines": 2, "max_lines": 5})
        oracle_rows = []
        for n in range(50):
            src = rows[n % len(rows)]
            rc = receipt_from_csv_row(src, n + 1)
            rc["ITEM_NUMBER"] = f"{src['ITM_CODE']}-{n + 1:02d}"
            rc["QUANTITY_RECEIVED"] = money(float(src["RCV_QTY"]) / len(rows))
            rc["LINE_TOTAL"] = money(rc["QUANTITY_RECEIVED"] * rc["UNIT_PRICE"])
            oracle_rows.append(rc)
        base, po_number = rows[0], rows[0]["PO_NUM"]
        receipt_label = f"{key} (50 receipt lines synthesised from real rows)"
        cap_lines = [
            {"line_no": i, "description": r["ITEM_DESCRIPTION"], "qty": r["QUANTITY_RECEIVED"],
             "uom": r["UNIT_MEAS_LOOKUP_CODE"], "unit_price": r["UNIT_PRICE"],
             "amount": money(r["QUANTITY_RECEIVED"] * r["UNIT_PRICE"])}
            for i, r in enumerate(oracle_rows[:2], 1)
        ]
        return finish_entry(spec, base, po_number, receipt_label, oracle_rows, cap_lines,
                            internal_tax_ids, idx)
    else:
        raise ValueError(f"unknown scenario {scenario}")

    lines = build_invoice_lines(basis_rows, mods, swap_map)
    return finish_entry(spec, base, po_number, receipt_label, oracle_rows, lines,
                        internal_tax_ids, idx)


def finish_entry(spec, base, po_number, receipt_label, oracle_rows, lines,
                 internal_tax_ids, idx):
    mods = spec.get("mods", {})
    difficulty = spec.get("diff", "medium")
    float_noise_note = ""
    sub, vat, grand = compute_totals(lines, mods)
    if mods.get("zero_totals"):
        sub = vat = grand = 0.0
        lines = []

    supplier_name = base["SUPPLIER_NAME"]
    supplier_tax_id = base["SUPPLIER_TAX_ID"]
    customer_tax_id = base["CUSTOMER_TAX_ID"]
    address = " ".join(x for x in [base["CUSTOMER_ADDR1"], base["CUSTOMER_ADDR2"],
                                   base["CUSTOMER_POSTAL"]] if x)

    if mods.get("internal_supplier") is not None:
        supplier_name, supplier_tax_id = INTERNAL_SUPPLIERS[mods["internal_supplier"] % len(INTERNAL_SUPPLIERS)]
    if mods.get("supplier_tax_shift") is not None:
        supplier_tax_id = shift_digit(supplier_tax_id, mods["supplier_tax_shift"])
    if mods.get("customer_tax_shift") is not None:
        customer_tax_id = shift_digit(customer_tax_id, mods["customer_tax_shift"])
    if mods.get("customer_tax_override"):
        customer_tax_id = mods["customer_tax_override"]
    if mods.get("customer_tax_truncated"):
        customer_tax_id = customer_tax_id[:-1]
    if mods.get("tax_id_masked"):
        supplier_tax_id = mask_tax_id(supplier_tax_id)
        customer_tax_id = mask_tax_id(customer_tax_id)
    if mods.get("address_override"):
        address = mods["address_override"]
    if mods.get("address_branch_suffix"):
        address = f"{address} {BRANCH_ADDRESS_SUFFIX}"

    inv_num = invoice_number(idx, supplier_name, mods.get("inv_style"))
    if mods.get("inv_num_spaces_inner"):
        inv_num = f"{inv_num[:3]} {inv_num[3:]}".replace("/", " / ")
    date_str = date_text(idx, mods.get("date_style"))
    po_text_value = po_text(po_number, mods.get("po_style"))

    dropped = set(mods.get("drop_fields", []))
    header = {
        "supplier_name": supplier_name,
        "supplier_tax_id": supplier_tax_id,
        "customer_name": base["OU_NAME"],
        "customer_tax_id": customer_tax_id,
        "customer_address": address,
        "invoice_num": inv_num,
        "invoice_date": date_str,
        "po_number": po_text_value,
        "currency": "THB",
    }
    for field in dropped:
        header[field] = None

    signatures = {
        "supplier_or_deliverer": {"present": mods.get("sig_missing") != "supplier"},
        "receiver": {"present": mods.get("sig_missing") != "receiver"},
    }
    pages_complete = mods.get("pages_complete", True)

    raw = dict(header)
    raw.update({"lines": lines, "signatures": signatures, "pages_complete": pages_complete,
                "sub_total": sub, "vat": vat, "grand_total": grand})

    table9 = run_engine(raw, oracle_rows, internal_tax_ids)
    expected = expected_result_block(table9, notes=spec.get("note", ""))
    # Document engine float-precision artefacts: `sub_total + vat` is not always
    # bit-identical to its 2-decimal rounding, which makes V-03 raise a benign E16.
    if abs((sub + vat) - grand) > 0 and "E16" in expected["expected_exceptions"]:
        float_noise_note = ("E16 comes from float representation of sub_total + VAT "
                            f"(diff {abs((sub + vat) - grand):.1e}), not from a document defect.")
        expected["notes"] = " | ".join(x for x in [spec.get("note", ""), float_noise_note] if x)

    layout = spec["layout"]
    noise = bool(spec.get("scan_noise")) or (
        layout == "tax_invoice" and int(hashlib.md5(spec["id"].encode()).hexdigest(), 16) % 3 == 0
    )
    pdf_hints = {
        "layout": layout,
        "scan_noise": noise,
        "split_pages": bool(spec.get("split_pages")) and pages_complete,
        "only_first_page": not pages_complete,
        "amount_format": "comma",
        "note": spec.get("pdf_note", ""),
    }

    entry = {
        "invoice_id": spec["id"],
        "pdf_filename": f"{spec['id']}.pdf",
        "wave": WAVE,
        "category": spec["cat"],
        "category_label": CATEGORY_LABELS[spec["cat"]],
        "difficulty": difficulty,
        "description": spec["desc"],
        "oracle_source": {
            "po_number": po_number,
            "receipt_num": receipt_label,
            "org_id": int(base["INV_ORG_ID"]),
            "ou_org_id": int(base["OU_ORG_ID"]),
            "ou_name": base["OU_NAME"],
            "receipt_scenario": spec.get("scenario", "single_receipt"),
            "receipt_rows_fed": len(oracle_rows),
        },
        "oracle_rows": compact_rows(oracle_rows),
        "invoice_data": dict(header, lines=lines, sub_total=sub, vat=vat, grand_total=grand,
                             signatures=signatures, layout=layout, pdf_hints=pdf_hints),
        "document_flags": {
            "pages_complete": pages_complete,
            "pages": 2 if (spec.get("split_pages") and pages_complete) else 1,
        },
        "expected_result": expected,
        "forgery_details": None if not mods else {
            "target_rule": spec.get("target"),
            "modification": spec.get("mod_note") or spec["desc"],
            "detection_difficulty": difficulty,
        },
    }
    return entry


# =============================================================================
# Wave-2 test matrix (100 invoices)
# =============================================================================
def any_pick(**kw):
    return {"max_lines": 9, **kw}


SPECS = [
    # ---------------- Category F: valid / tolerated (20) ----------------
    dict(id="INV-F01", cat="F", layout="tax_invoice", pick=any_pick(), desc="Perfect 1:1 match against Oracle receipt", diff="easy"),
    dict(id="INV-F02", cat="F", layout="abbreviated", pick=any_pick(), desc="Perfect match, abbreviated tax invoice layout", diff="easy"),
    dict(id="INV-F03", cat="F", layout="commercial", pick=any_pick(), desc="Perfect match, English commercial invoice layout", diff="easy"),
    dict(id="INV-F04", cat="F", layout="tax_invoice", pick={"min_lines": 3}, desc="Perfect match on a 3+ line receipt", diff="easy"),
    dict(id="INV-F05", cat="F", layout="tax_invoice", pick={"min_lines": 4}, split_pages=True,
         desc="Multi-line invoice split across two pages, all lines match", diff="medium"),
    dict(id="INV-F06", cat="F", layout="tax_invoice", pick={"uom_in": ["Sheet"]}, scan_noise=True,
         desc="Sheet-material invoice with thousands-separated amounts", diff="easy"),
    dict(id="INV-F07", cat="F", layout="tax_invoice", pick=any_pick(), mods={"sub_total_round": 0.20},
         target="V-03", desc="sub_total rounded +0.20 (<=0.50) => V-03 PASS with E16", diff="medium"),
    dict(id="INV-F08", cat="F", layout="abbreviated", pick=any_pick(), mods={"sub_total_round": 0.35},
         target="V-03", desc="sub_total rounded +0.35 => E16 Low, still Auto-pass", diff="medium"),
    dict(id="INV-F09", cat="F", layout="commercial", pick=any_pick(), mods={"sub_total_round": 0.49},
         target="V-03", desc="sub_total rounded +0.49 (boundary) => E16 Low, Auto-pass", diff="hard"),
    dict(id="INV-F10", cat="F", layout="tax_invoice", pick={"qty_eq": 1, "min_price": 50, "reuse": True},
         mods={"price_abs": {"line": 1, "delta": 0.40}}, target="V-07",
         desc="Unit price +0.40 on a qty=1 line: V-07 E29 (in tolerance) and V-09 stays within 0.50", diff="hard"),
    dict(id="INV-F11", cat="F", layout="tax_invoice", pick={"qty_eq": 1, "min_price": 50, "reuse": True},
         mods={"price_abs": {"line": 1, "delta": 0.50}}, target="V-07",
         desc="Unit price +0.50 (exact V-09 tolerance) => E29 Low, Auto-pass", diff="hard"),
    dict(id="INV-F12", cat="F", layout="tax_invoice", pick={"uom_in": ["Piece"]}, mods={"uom_print": "pcs"},
         desc="UOM printed as 'pcs' normalises to PCS like Oracle 'Piece' (no E12)", diff="medium"),
    dict(id="INV-F13", cat="F", layout="tax_invoice", pick={"uom_in": ["Sheet"]}, mods={"uom_print": "แผ่น"},
         desc="Thai UOM 'แผ่น' normalises to SHT like Oracle 'Sheet' (no E12)", diff="medium"),
    dict(id="INV-F14", cat="F", layout="commercial", pick={"uom_in": ["Kilogram"]}, mods={"uom_print": "กก."},
         desc="Thai UOM 'กก.' normalises to KG like Oracle 'Kilogram' (no E12)", diff="medium"),
    dict(id="INV-F15", cat="F", layout="abbreviated", pick={"uom_in": ["Piece"]}, mods={"uom_print": "ตัว"},
         desc="Thai UOM 'ตัว' normalises to PCS (no E12)", diff="medium"),
    dict(id="INV-F16", cat="F", layout="tax_invoice", pick={"min_lines": 3}, mods={"reorder_lines": True},
         desc="Multi-line invoice with shuffled line order (price/qty matching still applies)", diff="medium"),
    dict(id="INV-F17", cat="F", layout="tax_invoice", pick={"min_lines": 2}, mods={"desc_strip_code": True},
         desc="Item number removed from descriptions, price+qty still exact", diff="medium"),
    dict(id="INV-F18", cat="F", layout="tax_invoice", pick=any_pick(), mods={"address_branch_suffix": True},
         desc="Buyer address carries branch marker 00003, V-05 records the branch", diff="medium"),
    dict(id="INV-F19", cat="F", layout="tax_invoice", pick=any_pick(),
         mods={"date_style": "be", "po_style": "prefix_ah", "inv_style": "dash"},
         desc="Buddhist-Era date + 'AH-' PO prefix + dashed invoice number, all normalised", diff="hard"),
    dict(id="INV-F20", cat="F", layout="commercial", pick=any_pick(), mods={"inv_style": "lower"},
         desc="Lower-case invoice number normalised by the engine", diff="easy"),

    # ---------------- Category G: single-rule FAIL (25) ----------------
    dict(id="INV-G01", cat="G", layout="tax_invoice", pick=any_pick(), mods={"drop_fields": ["supplier_name"]},
         target="V-01", desc="V-01 E13: supplier name missing from the document", diff="easy"),
    dict(id="INV-G02", cat="G", layout="abbreviated", pick=any_pick(), mods={"drop_fields": ["customer_name"]},
         target="V-01", desc="V-01 E13: customer name missing", diff="easy"),
    dict(id="INV-G03", cat="G", layout="tax_invoice", pick=any_pick(), mods={"drop_fields": ["invoice_date"]},
         target="V-01", desc="V-01 E13: invoice date missing", diff="easy"),
    dict(id="INV-G04", cat="G", layout="commercial", pick=any_pick(), mods={"customer_tax_truncated": True},
         target="V-01", desc="V-01 E13: customer tax ID printed with only 12 digits", diff="medium"),
    dict(id="INV-G05", cat="G", layout="tax_invoice", pick=any_pick(), mods={"zero_totals": True},
         target="V-01", desc="V-01 E13: item table blank (no lines) and totals zeroed", diff="easy"),
    dict(id="INV-G06", cat="G", layout="tax_invoice", pick={"min_lines": 3}, mods={"pages_complete": False},
         target="V-01", desc="V-01 E13: second page of a 2-page invoice never uploaded", diff="hard",
         split_pages=True, pdf_note="Page 2 of the original scan is missing from this upload"),
    dict(id="INV-G07", cat="G", layout="abbreviated", pick=any_pick(), mods={"drop_fields": ["invoice_num"]},
         target="V-01", desc="V-01 E13: invoice number missing", diff="easy"),
    dict(id="INV-G08", cat="G", layout="tax_invoice", pick=any_pick(), mods={"line_amount_offset": 12.5},
         target="V-02", desc="V-02 E28: line amount exceeds qty x price by 12.50", diff="easy"),
    dict(id="INV-G09", cat="G", layout="commercial", pick=any_pick(), mods={"line_amount_offset": -60.0},
         target="V-02", desc="V-02 E28: line amount below qty x price by 60.00", diff="easy"),
    dict(id="INV-G10", cat="G", layout="tax_invoice", pick=any_pick(), mods={"line_amount_offset": 0.6},
         target="V-02", desc="V-02 boundary: line amount differs by 0.60 (threshold 0.50)", diff="hard"),
    dict(id="INV-G11", cat="G", layout="tax_invoice", pick=any_pick(), mods={"sub_total_offset": 250.0},
         target="V-03", desc="V-03 E31: stated sub_total exceeds sum(lines) by 250.00", diff="easy"),
    dict(id="INV-G12", cat="G", layout="abbreviated", pick=any_pick(), mods={"vat_offset": 5.0},
         target="V-03", desc="V-03 E31: VAT overstatement of 5.00 (>1.00 tolerance)", diff="easy"),
    dict(id="INV-G13", cat="G", layout="commercial", pick=any_pick(), mods={"grand_total_offset": 3.0},
         target="V-03", desc="V-03 E31: grand total exceeds sub_total + VAT by 3.00", diff="easy"),
    dict(id="INV-G14", cat="G", layout="tax_invoice", pick=any_pick(), scenario="no_receipts",
         absent_po="40099001", desc="V-04 E17: PO is not present in Oracle EBS (no receipt at all)", diff="easy"),
    dict(id="INV-G15", cat="G", layout="tax_invoice", pick={"min_lines": 3}, scenario="no_receipts",
         absent_po="40099002", desc="V-04 E17: multi-line invoice billed against an un-received PO", diff="medium"),
    dict(id="INV-G16", cat="G", layout="tax_invoice", scenario="multi_receipt", pick=any_pick(),
         desc="V-04 E35: one invoice covers two different Oracle receipts of the same PO", diff="medium"),
    dict(id="INV-G17", cat="G", layout="commercial", scenario="multi_receipt", pick=any_pick(),
         desc="V-04 E35: two receipts merged into one commercial invoice", diff="medium"),
    dict(id="INV-G18", cat="G", layout="tax_invoice", pick=any_pick(), mods={"customer_tax_shift": 0},
         target="V-05", desc="V-05 E09: first digit of the customer tax ID altered", diff="hard"),
    dict(id="INV-G19", cat="G", layout="tax_invoice", pick=any_pick(), mods={"customer_tax_override": "0107545000357"},
         target="V-05", desc="V-05 E09: customer tax ID replaced by another AIVA group entity", diff="medium"),
    dict(id="INV-G20", cat="G", layout="tax_invoice", pick=any_pick(), mods={"address_override": ALT_ADDRESS},
         target="V-05", desc="V-05 E09 (Medium): buyer address postal code does not match Oracle", diff="medium"),
    dict(id="INV-G21", cat="G", layout="abbreviated", pick=any_pick(),
         mods={"address_override": "12 Moo 4, Map Ta Phod, Rayong 21150"},
         target="V-05", desc="V-05 E09 (Medium): buyer address in another province", diff="medium"),
    dict(id="INV-G22", cat="G", layout="tax_invoice", pick=any_pick(), mods={"sig_missing": "supplier"},
         target="V-06", desc="V-06 E26 (Medium): deliverer signature missing", diff="medium"),
    dict(id="INV-G23", cat="G", layout="tax_invoice", pick=any_pick(), mods={"sig_missing": "receiver"},
         target="V-06", desc="V-06 E26 (High): receiver signature missing", diff="easy"),
    dict(id="INV-G24", cat="G", layout="tax_invoice", pick={"min_lines": 2},
         mods={"price_shift_balance": {"pct": 0.06}}, scenario="single_receipt",
         target="V-07", desc="V-07 E05: one line priced +6% while another is discounted so the invoice "
                             "subtotal still equals Oracle exactly",
         diff="hard"),
    dict(id="INV-G25", cat="G", layout="tax_invoice", pick=any_pick(), mods={"qty_scale": 1.2},
         target="V-08", desc="V-08 E06: billed quantity 20% above received (V-09 E31 side effect)", diff="easy"),

    # ---------------- Category H: multi-rule FAIL (25) ----------------
    dict(id="INV-H01", cat="H", layout="tax_invoice", pick=any_pick(),
         mods={"drop_fields": ["supplier_tax_id"], "sub_total_offset": 400.0},
         target="V-01+V-03", desc="E13 + E31: supplier tax ID removed and sub_total inflated by 400", diff="medium"),
    dict(id="INV-H02", cat="H", layout="abbreviated", pick=any_pick(),
         mods={"drop_fields": ["po_number"], "vat_offset": 150.0},
         target="V-01+V-03", desc="E13 + E31: PO number removed and VAT overstated by 150", diff="medium"),
    dict(id="INV-H03", cat="H", layout="tax_invoice", pick=any_pick(),
         mods={"drop_fields": ["invoice_date"], "line_amount_offset": 300.0},
         target="V-01+V-02", desc="E13 + E28: missing date and line math error (Oracle step skipped)", diff="medium"),
    dict(id="INV-H04", cat="H", layout="commercial", pick=any_pick(),
         mods={"drop_fields": ["customer_name"], "grand_total_offset": 10.0, "sig_missing": "receiver"},
         target="V-01+V-03+V-06", desc="E13 + E31 + E26: no customer name, wrong grand total, no receiver signature",
         diff="medium"),
    dict(id="INV-H05", cat="H", layout="tax_invoice", pick=any_pick(),
         mods={"drop_fields": ["invoice_num"], "sub_total_offset": 180.0},
         target="V-01+V-03", desc="E13 + E31: invoice number missing and subtotal overstated", diff="medium"),
    dict(id="INV-H06", cat="H", layout="tax_invoice", pick=any_pick(),
         mods={"line_amount_offset": 200.0, "qty_scale": 1.5},
         target="V-02+V-08", desc="E28 halts the run: quantity inflation never evaluated (Oracle skipped)", diff="medium"),
    dict(id="INV-H07", cat="H", layout="abbreviated", pick=any_pick(),
         mods={"line_amount_offset": 100.0, "customer_tax_shift": 5},
         target="V-02+V-05", desc="E28 + wrong customer tax ID: E28 halt hides the entity mismatch", diff="hard"),
    dict(id="INV-H08", cat="H", layout="commercial", pick=any_pick(),
         mods={"line_amount_offset": 80.0, "sig_missing": "receiver"},
         target="V-02+V-06", desc="E28 + missing receiver signature", diff="easy"),
    dict(id="INV-H09", cat="H", layout="tax_invoice", pick=any_pick(),
         mods={"customer_tax_shift": 3, "sig_missing": "receiver"},
         target="V-05+V-06", desc="E09 + E26: wrong customer tax ID and no receiver signature", diff="medium"),
    dict(id="INV-H10", cat="H", layout="tax_invoice", pick=any_pick(),
         mods={"customer_tax_override": "0107545000170", "price_scale": 1.3},
         target="V-05+V-07+V-09", desc="E09 + E05 + E31: wrong tax ID, prices scaled x1.3", diff="medium"),
    dict(id="INV-H11", cat="H", layout="commercial", pick=any_pick(),
         mods={"customer_tax_shift": 7, "qty_scale": 1.4},
         target="V-05+V-08+V-09", desc="E09 + E06 + E31: wrong tax ID and 40% over-billing", diff="medium"),
    dict(id="INV-H12", cat="H", layout="tax_invoice", pick={"uom_in": ["Piece", "Sheet"]},
         mods={"address_override": ALT_ADDRESS, "uom_print": "LOT"},
         target="V-05+V-07", desc="E09 (Medium) + E12 (Medium): address and UOM mismatch only => Review", diff="hard"),
    dict(id="INV-H13", cat="H", layout="tax_invoice", pick=any_pick(),
         mods={"price_scale": 1.5, "qty_scale": 1.5},
         target="V-07+V-08+V-09", desc="E05 + E06 + E31: price and quantity both scaled x1.5", diff="medium"),
    dict(id="INV-H14", cat="H", layout="abbreviated", pick=any_pick(),
         mods={"duplicate_line": True, "price_scale": 1.1},
         target="V-07+V-08+V-09",
         desc="E05 + E06 + E29 + E31 + E34: every receipt line billed twice at +10% price "
              "(the duplicate copy matches a spare row, so E29/E34 appear too)",
         diff="hard"),
    dict(id="INV-H15", cat="H", layout="tax_invoice", pick={"min_lines": 2},
         mods={"price_shift_balance": {"pct": 0.05}, "sub_total_round": 0.4},
         target="V-07+V-03", desc="E05 + E16: balanced price shift with a 0.40 sub_total rounding trick",
         diff="hard"),
    dict(id="INV-H16", cat="H", layout="tax_invoice", pick=any_pick(),
         mods={"drop_fields": ["po_number"], "customer_tax_shift": 1, "sig_missing": "receiver"},
         target="V-01+V-05+V-06", desc="E13 + E09 + E26: no PO, wrong customer tax ID, no receiver signature",
         diff="medium"),
    dict(id="INV-H17", cat="H", layout="commercial", pick=any_pick(),
         mods={"drop_fields": ["supplier_name"], "customer_tax_shift": 2, "sig_missing": "receiver"},
         target="V-01+V-05+V-06", desc="E13 + E09 + E26: no supplier name, tax ID digit error, no signature",
         diff="medium"),
    dict(id="INV-H18", cat="H", layout="tax_invoice", pick={"uom_in": ["Piece", "Sheet"]},
         mods={"drop_fields": ["supplier_tax_id"], "address_override": ALT_ADDRESS, "uom_print": "ลัง"},
         target="V-01+V-05+V-07", desc="E13 + E09 (Medium) + E12: incomplete header, wrong address, Thai UOM",
         diff="hard"),
    dict(id="INV-H19", cat="H", layout="tax_invoice", scenario="multi_receipt",
         mods={"customer_tax_shift": 4},
         target="V-04+V-05", desc="E35 + E09: two receipts merged and the customer tax ID is wrong", diff="hard"),
    dict(id="INV-H20", cat="H", layout="commercial", scenario="multi_receipt",
         mods={"sig_missing": "supplier"},
         target="V-04+V-06", desc="E35 + E26 (Medium): two receipts merged and deliverer signature missing", diff="medium"),
    dict(id="INV-H21", cat="H", layout="tax_invoice", scenario="no_receipts", absent_po="40099003",
         mods={"sub_total_offset": 300.0},
         target="V-04+V-09", desc="E17 + E31: no Oracle receipt and the subtotal is also overstated", diff="medium"),
    dict(id="INV-H22", cat="H", layout="abbreviated", scenario="no_receipts", absent_po="40099004",
         mods={"drop_fields": ["supplier_tax_id"]},
         target="V-01+V-04", desc="E13 + E17: incomplete header against a PO that was never received", diff="medium"),
    dict(id="INV-H23", cat="H", layout="tax_invoice", pick={"uom_in": ["Piece", "Sheet"]},
         mods={"sub_total_offset": 400.0, "customer_tax_shift": 6, "uom_print": "LOTS"},
         target="V-03+V-05+V-07", desc="E31 + E09 + E12: subtotal, tax ID and UOM all wrong", diff="medium"),
    dict(id="INV-H24", cat="H", layout="tax_invoice", pick={"uom_in": ["Kilogram"]},
         mods={"qty_scale": 0.5, "uom_print": "กระป๋อง"},
         target="V-07+V-08+V-09", desc="E34 + E12 + E31: half-billed quantity, wrong UOM, subtotal gap", diff="medium"),
    dict(id="INV-H25", cat="H", layout="tax_invoice", pick={"min_lines": 2},
         mods={"drop_line": 0, "uom_print": "JET"},
         target="V-07+V-09", desc="E12 + E31: only part of the receipt lines are billed and UOM is wrong", diff="hard"),

    # ---------------- Category I: intercompany (10) ----------------
    dict(id="INV-I01", cat="I", layout="tax_invoice", pick=any_pick(), mods={"internal_supplier": 0},
         desc="Intercompany supplier AHP, otherwise a clean match", diff="easy"),
    dict(id="INV-I02", cat="I", layout="commercial", pick=any_pick(), mods={"internal_supplier": 1},
         desc="Intercompany supplier AHT (English layout), clean match", diff="easy"),
    dict(id="INV-I03", cat="I", layout="abbreviated", pick=any_pick(), mods={"internal_supplier": 2},
         desc="Intercompany supplier AAA, clean match", diff="easy"),
    dict(id="INV-I04", cat="I", layout="tax_invoice", pick={"min_lines": 2}, mods={"internal_supplier": 3},
         target=None, desc="Intercompany supplier APC on a multi-line receipt, clean match", diff="medium"),
    dict(id="INV-I05", cat="I", layout="tax_invoice", pick=any_pick(),
         mods={"internal_supplier": 4, "qty_scale": 0.5},
         target="V-08+V-09", desc="Intercompany + partial billing (E34) and subtotal gap (E31)", diff="medium"),
    dict(id="INV-I06", cat="I", layout="tax_invoice", pick={"uom_in": ["Sheet"]},
         mods={"internal_supplier": 5, "uom_print": "แผ่นฟิล์ม"},
         target="V-07", desc="Intercompany + unrecognised Thai UOM (E12 Medium)", diff="medium"),
    dict(id="INV-I07", cat="I", layout="commercial", pick=any_pick(),
         mods={"internal_supplier": 0, "sig_missing": "receiver"},
         target="V-06", desc="Intercompany + missing receiver signature (E26)", diff="medium"),
    dict(id="INV-I08", cat="I", layout="tax_invoice", pick=any_pick(),
         mods={"internal_supplier": 1, "sub_total_offset": 600.0},
         target="V-03+V-09", desc="Intercompany + subtotal overstated by 600 (E31)", diff="medium"),
    dict(id="INV-I09", cat="I", layout="abbreviated", pick=any_pick(),
         mods={"internal_supplier": 2, "qty_scale": 1.25},
         target="V-08+V-09", desc="Intercompany + 25% over-billing (E06, E31)", diff="medium"),
    dict(id="INV-I10", cat="I", layout="tax_invoice", pick=any_pick(),
         mods={"internal_supplier": 3, "customer_tax_shift": 9},
         target="V-05", desc="Intercompany + wrong customer tax ID (E09)", diff="medium"),

    # ---------------- Category J: edge cases (20) ----------------
    dict(id="INV-J01", cat="J", layout="tax_invoice", pick=any_pick(), mods={"date_style": "be"},
         desc="Buddhist Era date 2569 converted to 2026 by clean_date", diff="medium"),
    dict(id="INV-J02", cat="J", layout="abbreviated", pick=any_pick(), scan_noise=True,
         mods={"date_style": "be"}, desc="Buddhist Era date on a noisy scan", diff="hard"),
    dict(id="INV-J03", cat="J", layout="tax_invoice", pick=any_pick(), mods={"date_style": "thai_month"},
         desc="Thai month-name date is not parseable; V-01 still passes (engine raises no E25)", diff="hard"),
    dict(id="INV-J04", cat="J", layout="tax_invoice", pick=any_pick(), mods={"po_style": "prefix_ah"},
         desc="PO written as 'AH-400000xx'; last 8 digits extracted", diff="medium"),
    dict(id="INV-J05", cat="J", layout="commercial", pick=any_pick(), mods={"po_style": "prefix_po"},
         desc="PO written as 'PO400000xx'; digits extracted", diff="medium"),
    dict(id="INV-J06", cat="J", layout="tax_invoice", pick=any_pick(), mods={"po_style": "dashes"},
         desc="PO written with an inserted dash; cleaning restores 8 digits", diff="hard"),
    dict(id="INV-J07", cat="J", layout="tax_invoice", pick=any_pick(), mods={"tax_id_masked": True},
         desc="Both tax IDs printed with dash groups; still 13 digits after cleaning", diff="medium"),
    dict(id="INV-J08", cat="J", layout="abbreviated", pick=any_pick(),
         mods={"inv_style": "lower", "inv_num_spaces_inner": True},
         desc="Lower-case invoice number containing spaces, normalised by N4", diff="medium"),
    dict(id="INV-J09", cat="J", layout="tax_invoice", pick={"min_lines": 2}, mods={"desc_suffix": True},
         desc="Very long mixed Thai/English descriptions (matching ladder stress test)", diff="hard"),
    dict(id="INV-J10", cat="J", layout="commercial", pick={"min_lines": 2}, mods={"desc_prefix_lot": True},
         desc="Descriptions prefixed with LOT codes; price/qty still exact", diff="medium"),
    dict(id="INV-J11", cat="J", layout="tax_invoice", pick={"uom_in": ["Kilogram"]}, scan_noise=True,
         desc="Bulk-weight invoice (kg, long decimals) from a poor-quality scan", diff="medium"),
    dict(id="INV-J12", cat="J", layout="tax_invoice", pick={"min_line_total": 100000},
         desc="High-value invoice with comma separated amounts", diff="easy"),
    dict(id="INV-J13", cat="J", layout="tax_invoice", pick=any_pick(), mods={"line_amount_offset": 0.5},
         target="V-02", desc="Boundary: line amount differs by exactly 0.50 => V-02 PASS, still Auto-pass",
         diff="hard"),
    dict(id="INV-J14", cat="J", layout="abbreviated", pick=any_pick(), mods={"vat_offset": 1.0},
         target="V-03", desc="Boundary: VAT differs by exactly 1.00 => V-03 PASS with E16", diff="hard"),
    dict(id="INV-J15", cat="J", layout="tax_invoice", pick={"qty_eq": 1, "min_price": 50, "reuse": True},
         mods={"price_abs": {"line": 1, "delta": -0.30}}, target="V-07",
         desc="Unit price -0.30 on qty=1: E29 Low, V-09 within tolerance => Auto-pass", diff="hard"),
    dict(id="INV-J16", cat="J", layout="tax_invoice", pick={"qty_eq": 1, "min_price": 50, "reuse": True},
         mods={"price_abs": {"line": 1, "delta": 0.51}}, target="V-09",
         desc="Boundary: price +0.51 breaks the 0.50 V-09 tolerance => E31 Hold with only E29 on V-07",
         diff="hard"),
    dict(id="INV-J17", cat="J", layout="commercial", pick=any_pick(), mods={"supplier_tax_shift": 6},
         desc="Silent forgery: supplier tax ID changed by one digit, no rule covers it => Auto-pass",
         diff="hard"),
    dict(id="INV-J18", cat="J", layout="tax_invoice", pick=any_pick(), mods={"customer_tax_shift": 11},
         target="V-05", desc="Single-digit customer tax ID error in the middle of the number", diff="hard"),
    dict(id="INV-J19", cat="J", layout="tax_invoice", scenario="cap50", pick=any_pick(),
         target="V-04", desc="50 Oracle receipt lines hit the SQL safety cap => Manual Review, step 3 skipped",
         diff="hard"),
    dict(id="INV-J20", cat="J", layout="tax_invoice", scenario="price_swap", split_pages=True,
         scan_noise=True,
         desc="Silent forgery: unit prices of two equal-qty receipt lines are swapped, so V-07/V-08/V-09 "
              "all stay clean => Auto-pass",
         diff="hard"),
]


# =============================================================================
# Merge / report
# =============================================================================
WAVE2_RE = re.compile(r"^INV-[FGHIJ]\d{2}$")


def main():
    valid, pool, real_pos = load_pool()
    entity_rows = load_csv("oracle_entities.csv")
    internal_tax_ids = {r["TAX_ID"] for r in entity_rows if r.get("TAX_ID")}
    picker = Picker(valid, pool, real_pos)

    dataset = json.loads(OUT.read_text(encoding="utf-8"))
    keep = [inv for inv in dataset["invoices"] if not WAVE2_RE.match(inv["invoice_id"])]
    wave1_ids = {(inv["invoice_data"].get("invoice_num") or "").strip().upper() for inv in keep}

    built, report, code_warnings = [], [], []
    for i, spec in enumerate(SPECS, start=1):
        entry = build_entry(spec, picker, internal_tax_ids, i)
        built.append(entry)
        er = entry["expected_result"]
        codes = set(er["expected_exceptions"])
        cat = spec["cat"]
        # category-level invariants (the engine remains the source of truth)
        if cat == "F":
            assert er["decision_status"] == "Auto-pass", (
                f"{spec['id']} expected Auto-pass, engine says {er['decision_status']} {sorted(codes)}")
        if cat == "G":
            assert codes, f"{spec['id']} produced no exception at all"
            assert not (codes & HIGH) or er["decision_status"] in ("Hold", "Review"), spec["id"]
        if cat == "H":
            # an E28 halt (or the V-04 safety cap) suppresses every downstream rule
            assert len(codes) >= 2 or er["manual_review"] or "E28" in codes, (
                f"{spec['id']} expected multiple exceptions, got {sorted(codes)}")
        if cat == "I":
            assert er["intercompany"] is True, f"{spec['id']} is not flagged intercompany"
        if cat == "J":
            assert er["rules"], spec["id"]
        report.append((spec["id"], entry["category"], er["decision_status"],
                       er["halted_by"] or "-", "+".join(sorted(codes)) or "-",
                       "IC" if er["intercompany"] else ""))
        # codes in negative phrasing ("no E12", "raises no E25") are deliberate absences
        _neg = "(?i)" + chr(92) + "b(?:no|not)" + chr(92) + "s+E[0-9]{2}"
        desc_norm = re.sub(_neg, "", spec["desc"])
        mentioned = set(re.findall("E[0-9]{2}", desc_norm))
        derived = set(er["expected_exceptions"])
        if mentioned and not mentioned <= derived:
            code_warnings.append(f"{spec['id']}: description mentions {sorted(mentioned)} "
                                 f"but engine produced {sorted(derived)}")
        er["summary"] = (f"{er['decision_status']} | {'+'.join(sorted(derived)) or 'no exceptions'}"
                         + (f" | halted_by {er['halted_by']}" if er["halted_by"] else ""))

    # sanity checks
    nums = [(e["invoice_data"]["invoice_num"] or "").strip().upper() for e in built
            if e["invoice_data"].get("invoice_num")]
    assert len(set(nums)) == len(nums), "duplicate invoice numbers inside wave 2"
    assert not (set(nums) & wave1_ids), "wave 2 invoice numbers collide with wave 1"
    ids = [e["invoice_id"] for e in built]
    assert len(set(ids)) == len(ids) == 100, f"expected 100 unique wave-2 ids, got {len(set(ids))}"

    dataset["invoices"] = keep + built
    dist = {}
    for inv in dataset["invoices"]:
        dist[inv["expected_result"]["decision_status"]] = dist.get(inv["expected_result"]["decision_status"], 0) + 1
    dataset["metadata"] = {
        "generated_at": "2026-10-02T16:40:00+07:00",
        "generator": GENERATOR,
        "total_invoices": len(dataset["invoices"]),
        "waves": {"1": {"ids": "INV-A..E", "count": len(keep)},
                  "2": {"ids": "INV-F..J", "count": len(built)}},
        "oracle_source_query_date": QUERY_DATE,
        "expectation_source": ("all expected_result blocks are produced by app.core.rules: "
                              "wave 2 natively, wave 1 recalibrated by verify_dataset.py --fix"),
        "decision_distribution": dist,
        "distribution": {
            "valid_or_tolerated": sum(1 for e in built if e["category"] == "F"),
            "single_fail": sum(1 for e in built if e["category"] == "G"),
            "multi_fail": sum(1 for e in built if e["category"] == "H"),
            "intercompany": sum(1 for e in built if e["category"] == "I"),
            "edge_cases": sum(1 for e in built if e["category"] == "J"),
        },
    }
    OUT.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Wrote {OUT} — total invoices: {len(dataset['invoices'])} "
          f"(wave 1 kept: {len(keep)}, wave 2 added: {len(built)})")
    print(f"Decision distribution (whole dataset): {dist}")
    print(f"Base-data groups consumed by wave 2: {len(picker.used)}")
    print(f"\n{'ID':<9}{'CAT':<4}{'DECISION':<16}{'HALTED':<9}{'EXCEPTIONS':<22}{'IC'}")
    for row in report:
        print(f"{row[0]:<9}{row[1]:<4}{row[2]:<16}{row[3]:<9}{row[4]:<22}{row[5]}")
    if code_warnings:
        print("\n[ WARN ] descriptions that under-report the engine outcome:")
        for w in code_warnings:
            print(f"  - {w}")


if __name__ == "__main__":
    main()
