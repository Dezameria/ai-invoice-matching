"""Offline bridge between the synthetic dataset and the production rules engine.

Reused by build_test_dataset_wave2.py and verify_dataset.py so that every
`expected_result` stored in test_dataset.json is produced by the *real*
Standard v6.2 engine (app.core.rules + app.services.pipeline semantics)
instead of hand-written expectations.
"""
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]  # .../OCR service/n8n
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.models import OracleReceipt  # noqa: E402
from app.core.rules import (  # noqa: E402
    evaluate_step1,
    evaluate_step2,
    evaluate_step3,
    evaluate_step4_decision,
    normalize_extracted_document,
)

CSV_TO_RECEIPT = {
    "PO_NUM": "PO_NUMBER",
    "RCV_NUM": "RECEIPT_NUM",
    "ITM_CODE": "ITEM_NUMBER",
    "ITM_DESC": "ITEM_DESCRIPTION",
    "RCV_QTY": "QUANTITY_RECEIVED",
    "UOM": "UNIT_MEAS_LOOKUP_CODE",
    "PO_UPRICE": "UNIT_PRICE",
    "LINE_TOTAL": "LINE_TOTAL",
    "INV_ORG_ID": "ORG_ID",
    "OU_ORG_ID": "OU_ORG_ID",
    "OU_NAME": "OU_NAME",
    "CUSTOMER_TAX_ID": "CUSTOMER_TAX_ID",
    "CUSTOMER_POSTAL": "CUSTOMER_POSTAL",
    "CUSTOMER_LOC_CODE": "CUSTOMER_LOC_CODE",
    "SUPPLIER_NAME": "SUPPLIER_NAME",
    "SUPPLIER_TAX_ID": "SUPPLIER_TAX_ID",
}

# Fields kept inside test_dataset.json so results stay reproducible offline.
ORACLE_ROW_FIELDS = [
    "PO_NUMBER", "RECEIPT_NUM", "LINE_NUM", "ITEM_NUMBER", "ITEM_DESCRIPTION",
    "QUANTITY_RECEIVED", "UNIT_MEAS_LOOKUP_CODE", "UNIT_PRICE", "LINE_TOTAL",
    "ORG_ID", "OU_ORG_ID", "OU_NAME", "CUSTOMER_TAX_ID", "CUSTOMER_POSTAL",
    "CUSTOMER_LOC_CODE", "SUPPLIER_NAME", "SUPPLIER_TAX_ID",
]


def receipt_from_csv_row(row: Dict[str, str], line_num: Optional[int] = None) -> Dict[str, Any]:
    """Map one raw oracle_receipts.csv row onto the OracleReceipt schema."""
    receipt: Dict[str, Any] = {}
    for src, dst in CSV_TO_RECEIPT.items():
        value = row.get(src, "")
        if dst in ("QUANTITY_RECEIVED", "UNIT_PRICE", "LINE_TOTAL"):
            receipt[dst] = float(value) if value not in (None, "") else 0.0
        elif dst in ("ORG_ID", "OU_ORG_ID"):
            receipt[dst] = int(value) if str(value).strip().isdigit() else None
        else:
            receipt[dst] = str(value).strip() if value is not None else ""
    receipt["LINE_NUM"] = int(line_num) if line_num is not None else int(row.get("_LINE_NUM", 1) or 1)
    receipt["RCV_INV_NUM"] = row.get("RCV_INV_NUM", "")
    receipt["AP_INV_NUM"] = row.get("AP_INV_NUM", "")
    return receipt


def compact_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Trim oracle rows to the reproducible subset stored inside the dataset."""
    out = []
    for r in rows:
        raw = r if isinstance(r, dict) else r.model_dump()
        item = {k: raw.get(k) for k in ORACLE_ROW_FIELDS}
        desc = item.get("ITEM_DESCRIPTION") or ""
        item["ITEM_DESCRIPTION"] = desc[:70]
        out.append(item)
    return out


def run_engine(
    invoice_raw: Dict[str, Any],
    oracle_rows: List[Dict[str, Any]],
    internal_tax_ids: Optional[set] = None,
) -> Dict[str, Any]:
    """Run Steps 1-4 exactly like VerificationPipeline.execute_matching_engine.

    Oracle MCP is replaced by the caller-supplied `oracle_rows`, which makes the
    whole answer key deterministic and runnable without Oracle access.
    """
    doc = normalize_extracted_document(invoice_raw)
    rules, exceptions, has_e28, halted_by = evaluate_step1(doc)

    if has_e28:  # Principle D3: line math error bypasses Oracle entirely
        table9 = evaluate_step4_decision(
            doc=doc,
            rules=rules,
            exceptions=exceptions,
            manual_review=False,
            halted_by=halted_by,
            oracle_data={"queried": False, "reason": "Bypassed due to E28 Line Math Error",
                         "po_number": doc.invoice.po_number, "count": 0, "receipts": []},
        )
        return table9.model_dump(mode="json")

    receipts = [OracleReceipt(**r) for r in oracle_rows]
    rules, exceptions, active_rows, address_matched, intercompany, manual_review, has_critical = evaluate_step2(
        doc=doc,
        receipts=receipts,
        existing_rules=rules,
        existing_exceptions=exceptions,
        internal_tax_ids=internal_tax_ids,
    )

    if not has_critical:
        rules, exceptions = evaluate_step3(
            doc=doc,
            active_rows=active_rows,
            existing_rules=rules,
            existing_exceptions=exceptions,
        )

    table9 = evaluate_step4_decision(
        doc=doc,
        rules=rules,
        exceptions=exceptions,
        manual_review=manual_review,
        halted_by=halted_by,
        address_matched=address_matched,
        intercompany=intercompany,
        oracle_data={"queried": True, "po_number": doc.invoice.po_number,
                     "count": len(receipts), "receipts": compact_rows(receipts)},
    )
    return table9.model_dump(mode="json")


def expected_result_block(table9: Dict[str, Any], notes: str = "") -> Dict[str, Any]:
    """Convert a Table 9 payload into the dataset's `expected_result` schema."""
    rules = {r["rule_id"]: {"result": r["result"], "code": r["code"]} for r in table9["rules"]}
    codes: List[str] = []
    detail = []
    for e in table9["exceptions"]:
        if e["code"] not in codes:
            codes.append(e["code"])
        detail.append({"code": e["code"], "severity": e["severity"], "rule_id": e["rule_id"]})
    return {
        "decision_status": table9["decision"]["status"],
        "assigned_to": table9["decision"]["assigned_to"],
        "halted_by": table9["decision"]["halted_by"],
        "manual_review": table9["decision"]["manual_review"],
        "intercompany": table9["invoice_summary"]["intercompany"],
        "address_matched": table9["invoice_summary"].get("address_matched"),
        "rules": rules,
        "expected_exceptions": codes,
        "exception_detail": detail,
        "notes": notes or table9["decision"]["status"],
    }
