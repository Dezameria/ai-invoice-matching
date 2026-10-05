"""Verify / recalibrate every expected_result in test_dataset.json against the engine.

Usage:
    python verify_dataset.py            # report drift only (exit 1 if any)
    python verify_dataset.py --fix      # rewrite expected_result from the engine
    python verify_dataset.py --strict   # also fail on missing PDF files

Each invoice is replayed through app.core.rules using:
  * its stored `oracle_rows` (wave 2), or
  * the raw Oracle group named by `oracle_source.receipt_num` (wave 1).
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

from invoice_engine import expected_result_block, receipt_from_csv_row, run_engine

BASE = Path(__file__).resolve().parent
OUT = BASE / "test_dataset.json"
RAW = BASE / "_raw"
PDF_DIR = BASE / "pdfs"
RULES = ["V-01", "V-02", "V-03", "V-04", "V-05", "V-06", "V-07", "V-08", "V-09"]
FIX = "--fix" in sys.argv
STRICT = "--strict" in sys.argv


def load_group_index():
    import csv
    with open(RAW / "oracle_receipts.csv", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = [dict(zip(header, rec)) for rec in reader if len(rec) == len(header)]
    index = {}
    for r in rows:
        index.setdefault(r["RCV_NUM"], []).append(r)
    return index


def load_internal_tax_ids():
    import csv
    with open(RAW / "oracle_entities.csv", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = [dict(zip(header, rec)) for rec in reader if len(rec) == len(header)]
    return {r["TAX_ID"] for r in rows if r.get("TAX_ID")}


def resolve_rows(inv, group_index):
    # an explicitly stored (possibly empty) row set always wins
    if "oracle_rows" in inv:
        return inv["oracle_rows"]
    if "scenario_rows" in inv:
        return inv["scenario_rows"]
    receipt = inv.get("oracle_source", {}).get("receipt_num", "")
    group = group_index.get(receipt)
    if not group:
        return None
    return [receipt_from_csv_row(r, i) for i, r in enumerate(group, 1)]


def build_raw(inv):
    d = dict(inv["invoice_data"])
    flags = inv.get("document_flags", {})
    return {
        "supplier_name": d.get("supplier_name"),
        "supplier_tax_id": d.get("supplier_tax_id"),
        "customer_name": d.get("customer_name"),
        "customer_tax_id": d.get("customer_tax_id"),
        "customer_address": d.get("customer_address"),
        "invoice_num": d.get("invoice_num"),
        "invoice_date": d.get("invoice_date"),
        "po_number": d.get("po_number"),
        "currency": d.get("currency", "THB"),
        "sub_total": d.get("sub_total"),
        "vat": d.get("vat"),
        "grand_total": d.get("grand_total"),
        "lines": d.get("lines", []),
        "signatures": d.get("signatures", {}),
        "pages_complete": flags.get("pages_complete", True),
    }


def comparable(er):
    return {
        "decision_status": er["decision_status"],
        "assigned_to": er.get("assigned_to"),
        "halted_by": er.get("halted_by"),
        "manual_review": bool(er.get("manual_review")),
        "intercompany": bool(er.get("intercompany")),
        "rules": {r: {"result": er["rules"][r]["result"], "code": er["rules"][r]["code"]}
                  for r in RULES if r in er.get("rules", {})},
        "exceptions": sorted(er.get("expected_exceptions", [])),
    }


def verify(dataset, fix=False):
    """Replay every expected_result against app.core.rules.

    Returns a report dict: drifted, unverifiable, problems, statuses, codes, written.
    With fix=True the recalibrated dataset is written back to test_dataset.json.
    """
    group_index = load_group_index()
    internal = load_internal_tax_ids()

    drifted, unverifiable, problems = [], [], []
    codes, statuses = Counter(), Counter()

    for inv in dataset["invoices"]:
        rows = resolve_rows(inv, group_index)
        if rows is None:
            unverifiable.append(inv["invoice_id"])
            continue
        table9 = run_engine(build_raw(inv), rows, internal)
        fresh = expected_result_block(table9)
        fresh["address_matched"] = table9["invoice_summary"].get("address_matched")
        before, after = comparable(inv["expected_result"]), comparable(fresh)
        statuses[fresh["decision_status"]] += 1
        for c in fresh["expected_exceptions"]:
            codes[c] += 1
        if before != after:
            drifted.append((inv["invoice_id"], before, after))
            if fix:
                merged = dict(inv["expected_result"])
                merged.update({k: v for k, v in fresh.items() if k != "notes"})
                merged["notes"] = (inv["expected_result"].get("notes", "")
                                   + " [recalibrated against app.core.rules by verify_dataset.py]")
                merged["summary"] = (f"{fresh['decision_status']} | "
                                     + "+".join(sorted(fresh["expected_exceptions"]) or ["no exceptions"]))
                if fresh["halted_by"]:
                    merged["summary"] += f" | halted_by {fresh['halted_by']}"
                inv["expected_result"] = merged
                inv["recalibrated"] = "engine-v6.2"

        # structural checks (independent of the engine)
        if not inv.get("pdf_filename"):
            problems.append(f"{inv['invoice_id']}: missing pdf_filename")
        missing_rules = [r for r in RULES if r not in inv["expected_result"].get("rules", {})]
        if missing_rules:
            problems.append(f"{inv['invoice_id']}: expected_result missing rules {missing_rules}")
        if STRICT and not (PDF_DIR / inv["pdf_filename"]).exists():
            problems.append(f"{inv['invoice_id']}: {inv['pdf_filename']} not found in pdfs/")

    written = False
    if fix and drifted:
        from datetime import datetime, timedelta, timezone
        dataset["metadata"]["recalibrated_at"] = datetime.now(
            timezone(timedelta(hours=7))).isoformat(timespec="seconds")
        dataset["metadata"]["recalibrated_by"] = "verify_dataset.py (app.core.rules engine)"
        OUT.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")
        written = True

    return {"drifted": drifted, "unverifiable": unverifiable, "problems": problems,
            "statuses": statuses, "codes": codes, "written": written,
            "total": len(dataset["invoices"])}


def main():
    dataset = json.loads(OUT.read_text(encoding="utf-8"))
    report = verify(dataset, FIX)
    drifted, unverifiable, problems = report["drifted"], report["unverifiable"], report["problems"]
    statuses, codes = report["statuses"], report["codes"]

    print(f"Invoices: {report['total']} | replayed: {report['total'] - len(unverifiable)}"
          f" | unverifiable: {len(unverifiable)}")
    if unverifiable:
        print(f"  unverifiable ids: {unverifiable[:12]}{' ...' if len(unverifiable) > 12 else ''}")
    print(f"Engine decision distribution: {dict(statuses)}")
    print(f"Exception code coverage: {dict(sorted(codes.items()))}")
    if drifted:
        print(f"\n[ DRIFT ] {len(drifted)} invoice(s) disagree with the engine"
              + (" — recalibrated and written" if FIX else " — rerun with --fix to repair") + ":")
        for iid, before, after in drifted:
            print(f"  {iid}: status {before['decision_status']} -> {after['decision_status']}; "
                  f"codes {before['exceptions']} -> {after['exceptions']}; "
                  f"halted {before['halted_by']} -> {after['halted_by']}")
    else:
        print("\nAll replayed expectations already match the engine output.")
    if problems:
        print(f"\n[ FAIL ] {len(problems)} structural problem(s):")
        for p in problems[:40]:
            print(f"  - {p}")

    bad = bool(drifted and not FIX) or bool(problems)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
