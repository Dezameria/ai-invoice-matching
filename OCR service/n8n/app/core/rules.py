"""Deterministic Rules Engine for 3-Way Matching Verification (Standard v6.2).

Corresponds to n8n nodes:
- N4: Code: Normalize
- N5: Code: STEP 1 Rules (V-01, V-02, V-03, V-06)
- N8: Code: STEP 2 (Receipts & ORG_ID) (V-04, V-05)
- N9: Code: STEP 3 (Line Matching Ladder) (V-07, V-08, V-09)
- N10: Code: STEP 4 Decision Matrix & JSON Table 9 Assembly
- N11: Code: Schema Validate
"""

import re
from typing import List, Dict, Any, Tuple, Optional, Set

from app.core.master_data import (
    STANDARD_RULES,
    VALID_EXCEPTION_CODES,
    USER_TASK_CODES,
)
from app.core.models import (
    ExtractedDocument,
    InvoiceHeader,
    InvoiceLine,
    Signatures,
    SignatureInfo,
    OracleReceipt,
    RuleResult,
    ExceptionItem,
    DecisionInfo,
    InvoiceSummary,
    Table9Output,
)


# =============================================================================
# Helper Normalization Functions (N4: Code: Normalize)
# =============================================================================

def clean_tax_id(tax_id: Any) -> Optional[str]:
    """Clean Tax ID to exactly 13 digits or None."""
    if not tax_id:
        return None
    digits = re.sub(r"\D", "", str(tax_id))
    return digits if len(digits) == 13 else None


def clean_po_number(po: Any) -> Optional[str]:
    """Clean PO Number to last 8 digits."""
    if not po:
        return None
    digits = re.sub(r"\D", "", str(po))
    if len(digits) >= 8:
        return digits[-8:]
    return digits if digits else None


def clean_uom(uom: Any) -> str:
    """Normalize unit of measure according to Standard v6.2 (Enhanced)."""
    if not uom:
        return "UNKNOWN"
    u = str(uom).strip().rstrip(".").upper()
    # PCS / Countable Items / Sets / Each
    # PCS: PC, PCS, PCS., PIECE, PIECES, EA, EACH, ชิ้น, อัน, ตัว, SET, เส้น
    if u in ["PCS", "PC", "PIECE", "PIECES", "EA", "EACH", "ชิ้น", "อัน", "ตัว", "SET", "เส้น"]:
        return "PCS"
    # KG: KGS, KG, KILOGRAM, กก., ก.ก.
    if u in ["KGS", "KG", "KILOGRAM", "กก", "ก.ก", "กก.", "ก.ก."]:
        return "KG"
    # BOOK: เล่ม, BOOK
    if u in ["BOOK", "เล่ม"]:
        return "BOOK"
    # CAN: กระป๋อง, CAN
    if u in ["CAN", "กระป๋อง", "กระป่อง"]:
        return "CAN"
    # DRUM: DRUM, DRUMS
    if u in ["DRUM", "DRUMS"]:
        return "DRUM"
    # Sheet
    if u in ["SHEET", "SHT", "แผ่น"]:
        return "SHT"
    # Job
    if u in ["JOB", "งาน"]:
        return "JOB"
    # Cylinder
    if u in ["CYL"]:
        return "CYL"
    if "TRIP" in u or u == "TP":
        return "TRIP"
    return u



def clean_date(date_str: Any) -> Optional[str]:
    """Normalize date to DD/MM/YYYY and convert Buddhist Era to CE."""
    if not date_str:
        return None
    match = re.search(r"(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})", str(date_str))
    if match:
        d, mo, y = match.groups()
        year = int(y)
        if year > 2400:
            year -= 543
        return f"{int(d):02d}/{int(mo):02d}/{year}"
    return str(date_str).strip()


def parse_num(val: Any) -> float:
    """Parse numeric float safely."""
    if isinstance(val, (int, float)):
        return 0.0 if (val != val) else float(val)
    if not val:
        return 0.0
    cleaned = re.sub(r"[^0-9.-]", "", str(val)).strip()
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def normalize_extracted_document(
    raw_data: Dict[str, Any],
    doc_id: Optional[int] = 1001,
    validation_round: int = 1
) -> ExtractedDocument:
    """Normalize raw LLM/parsed data into typed ExtractedDocument schema (N4)."""
    inv_raw = raw_data.get("invoice")
    if not isinstance(inv_raw, dict):
        inv_raw = raw_data

    lines_raw = raw_data.get("lines") or inv_raw.get("lines") or []
    sig_raw = raw_data.get("signatures") or inv_raw.get("signatures") or {}

    # Header with fallback aliases
    supplier_name = inv_raw.get("supplier_name") or inv_raw.get("company_name") or inv_raw.get("vendor_name") or ""
    supplier_tax_id = inv_raw.get("supplier_tax_id") or inv_raw.get("vendor_tax_id")
    customer_name = inv_raw.get("customer_name") or inv_raw.get("client_name") or ""
    customer_address = inv_raw.get("customer_address") or inv_raw.get("address") or ""
    customer_tax_id = inv_raw.get("customer_tax_id") or inv_raw.get("client_tax_id")
    invoice_num = inv_raw.get("invoice_num") or inv_raw.get("invoice_number") or inv_raw.get("inv_num") or ""
    invoice_date = inv_raw.get("invoice_date") or inv_raw.get("date")
    po_number = inv_raw.get("po_number") or inv_raw.get("po_num") or inv_raw.get("purchase_order")
    sub_total = inv_raw.get("sub_total") if inv_raw.get("sub_total") is not None else inv_raw.get("total_amount")

    header = InvoiceHeader(
        supplier_name=str(supplier_name).strip(),
        supplier_tax_id=clean_tax_id(supplier_tax_id),
        customer_name=str(customer_name).strip(),
        customer_address=str(customer_address).strip(),
        customer_tax_id=clean_tax_id(customer_tax_id),
        invoice_num=re.sub(r"\s+", "", str(invoice_num)).upper(),
        invoice_date=clean_date(invoice_date),
        po_number=clean_po_number(po_number),
        currency=str(inv_raw.get("currency") or "THB").strip().upper(),
        sub_total=parse_num(sub_total),
        vat=parse_num(inv_raw.get("vat")),
        grand_total=parse_num(inv_raw.get("grand_total")),
    )

    # Lines
    lines: List[InvoiceLine] = []
    if isinstance(lines_raw, list):
        for idx, l in enumerate(lines_raw):
            if isinstance(l, dict):
                lines.append(
                    InvoiceLine(
                        line_no=int(l.get("line_no") or (idx + 1)),
                        description=re.sub(r"\s+", " ", str(l.get("description") or "").lower()).strip(),
                        qty=parse_num(l.get("qty")),
                        uom=clean_uom(l.get("uom")),
                        unit_price=parse_num(l.get("unit_price")),
                        amount=parse_num(l.get("amount")),
                    )
                )

    # Signatures
    sup_sig = sig_raw.get("supplier_or_deliverer") or {}
    rec_sig = sig_raw.get("receiver") or {}

    signatures = Signatures(
        supplier_or_deliverer=SignatureInfo(
            present=sup_sig.get("present") is True,
            page=sup_sig.get("page")
        ),
        receiver=SignatureInfo(
            present=rec_sig.get("present") is True,
            page=rec_sig.get("page")
        )
    )

    return ExtractedDocument(
        doc_id=doc_id,
        validation_round=validation_round,
        invoice=header,
        lines=lines,
        signatures=signatures,
        pages_complete=raw_data.get("pages_complete") is not False,
        po_type=str(raw_data.get("po_type") or "Purchase Order"),
    )


# =============================================================================
# STEP 1: Pure Document Rules (V-01, V-02, V-03, V-06)
# =============================================================================

def evaluate_step1(doc: ExtractedDocument) -> Tuple[List[RuleResult], List[ExceptionItem], bool, Optional[str]]:
    """Evaluate pure document rules without external ERP dependencies (N5).

    Returns:
        (rules, exceptions, has_e28, halted_by)
    """
    rules: List[RuleResult] = []
    exceptions: List[ExceptionItem] = []
    inv = doc.invoice
    lines = doc.lines

    # V-01: Completeness of required fields + pages_complete
    v01_missing = []
    if not inv.supplier_name:
        v01_missing.append("supplier_name")
    if not inv.supplier_tax_id:
        v01_missing.append("supplier_tax_id")
    if not inv.customer_name:
        v01_missing.append("customer_name")
    if not inv.customer_tax_id:
        v01_missing.append("customer_tax_id")
    if not inv.invoice_num:
        v01_missing.append("invoice_num")
    if not inv.invoice_date:
        v01_missing.append("invoice_date")
    if not inv.po_number:
        v01_missing.append("po_number")
    if len(lines) == 0:
        v01_missing.append("lines")
    if not doc.pages_complete:
        v01_missing.append("pages_incomplete")

    if v01_missing:
        details_msg = f"Missing: {', '.join(v01_missing)}"
        rules.append(RuleResult(rule_id="V-01", result="FAIL", code="E13", severity="Medium", details=details_msg))
        exceptions.append(ExceptionItem(code="E13", severity="Medium", rule_id="V-01", message=f"ฟิลด์ไม่ครบ: {', '.join(v01_missing)}"))
    else:
        rules.append(RuleResult(rule_id="V-01", result="PASS", code=None, severity=None))

    # V-02: Line Math Check |qty * unit_price - amount| <= 0.50
    v02_failed_lines = []
    for l in lines:
        calc = l.qty * l.unit_price
        diff = abs(calc - l.amount)
        if diff > 0.50:
            v02_failed_lines.append({
                "line_no": l.line_no,
                "calc": round(calc, 2),
                "amount": round(l.amount, 2),
                "diff": round(diff, 2),
            })

    has_e28 = len(v02_failed_lines) > 0
    if has_e28:
        rules.append(RuleResult(rule_id="V-02", result="FAIL", code="E28", severity="High", details=str(v02_failed_lines)))
        exceptions.append(ExceptionItem(code="E28", severity="High", rule_id="V-02", message="ผลคูณจำนวนและราคาต่อหน่วยในบรรทัดไม่ตรงกับยอดเงิน"))
    else:
        rules.append(RuleResult(rule_id="V-02", result="PASS", code=None, severity=None))

    # V-03: Document Math Check
    sum_lines = sum(l.amount for l in lines)
    diff_sub = abs(sum_lines - inv.sub_total)
    expected_vat = round(inv.sub_total * 0.07, 2)
    diff_vat = abs(expected_vat - inv.vat)
    expected_grand = inv.sub_total + inv.vat
    diff_grand = abs(expected_grand - inv.grand_total)

    if diff_sub > 0.50 or diff_vat > 1.00 or diff_grand > 0.50:
        details_msg = f"Diff Sub: {diff_sub:.2f}, VAT: {diff_vat:.2f}, Grand: {diff_grand:.2f}"
        rules.append(RuleResult(rule_id="V-03", result="FAIL", code="E31", severity="High", details=details_msg))
        exceptions.append(ExceptionItem(code="E31", severity="High", rule_id="V-03", message="ยอดรวมในเอกสารคำนวณไม่ถูกต้องเกินกรอบกำหนด"))
    elif diff_sub > 0 or diff_vat > 0 or diff_grand > 0:
        rules.append(RuleResult(rule_id="V-03", result="PASS", code="E16", severity="Low", details="ผ่านเกณฑ์แต่มีผลต่างเศษปัดเศษ"))
        exceptions.append(ExceptionItem(code="E16", severity="Low", rule_id="V-03", message="มีผลต่างเศษสตางค์จากการคำนวณ (อยู่ในเกณฑ์ยอมรับ)"))
    else:
        rules.append(RuleResult(rule_id="V-03", result="PASS", code=None, severity=None))

    # V-06: Signatures Check
    sig = doc.signatures
    if not doc.pages_complete:
        rules.append(RuleResult(rule_id="V-06", result="PASS", code=None, severity=None, details="Incomplete page handled by V-01 E13"))
    elif not sig.receiver.present:
        rules.append(RuleResult(rule_id="V-06", result="FAIL", code="E26", severity="High", details="ขาดลายเซ็นผู้รับของ"))
        exceptions.append(ExceptionItem(code="E26", severity="High", rule_id="V-06", message="ไม่พบลายเซ็นผู้รับของบนเอกสาร"))
    elif not sig.supplier_or_deliverer.present:
        rules.append(RuleResult(rule_id="V-06", result="FAIL", code="E26", severity="Medium", details="ขาดลายเซ็นผู้ส่งของ"))
        exceptions.append(ExceptionItem(code="E26", severity="Medium", rule_id="V-06", message="ไม่พบลายเซ็นผู้ส่งของบนเอกสาร"))
    else:
        rules.append(RuleResult(rule_id="V-06", result="PASS", code=None, severity=None))

    halted_by = "V-02" if has_e28 else None
    return rules, exceptions, has_e28, halted_by


# =============================================================================
# STEP 2: Oracle Receipt & Customer Entity Rules (V-04, V-05)
# =============================================================================

def evaluate_step2(
    doc: ExtractedDocument,
    receipts: List[OracleReceipt],
    existing_rules: List[RuleResult],
    existing_exceptions: List[ExceptionItem],
    internal_tax_ids: Optional[Set[str]] = None,
) -> Tuple[List[RuleResult], List[ExceptionItem], List[OracleReceipt], Optional[str], bool, bool, bool]:
    """Evaluate Oracle receipts and Customer Entity matching dynamically from Oracle EBS (N8).

    Returns:
        (rules, exceptions, active_receipts, address_matched, intercompany, manual_review, has_critical_issue)
    """
    rules = list(existing_rules)
    exceptions = list(existing_exceptions)
    inv = doc.invoice
    manual_review = False

    # Filter active rows
    active_rows = [r for r in receipts if r.QUANTITY_RECEIVED > 0]
    distinct_receipts = list({r.RECEIPT_NUM for r in active_rows})

    # V-04: Receipt Active Check
    if len(active_rows) == 0:
        rules.append(RuleResult(rule_id="V-04", result="FAIL", code="E17", severity="High", details="ไม่พบใบรับสินค้า หรือจำนวนรับเป็น 0 ในระบบ ERP"))
        exceptions.append(ExceptionItem(code="E17", severity="High", rule_id="V-04", message="ไม่พบใบรับสินค้าหรือจำนวนรับเป็น 0 ในระบบ ERP"))
    elif len(distinct_receipts) > 1:
        details_msg = f"พบหลายใบรับ ({', '.join(distinct_receipts)})"
        rules.append(RuleResult(rule_id="V-04", result="FAIL", code="E35", severity="High", details=details_msg))
        exceptions.append(ExceptionItem(code="E35", severity="High", rule_id="V-04", message="พบใบรับสินค้ามากกว่า 1 ใบในรายการบิลเดียวกัน"))
    elif len(receipts) >= 50:
        rules.append(RuleResult(rule_id="V-04", result="MANUAL", code=None, severity="Medium", details="SQL คืนค่าชนเพดาน Safety Cap 50 แถว"))
        manual_review = True
    else:
        rules.append(RuleResult(rule_id="V-04", result="PASS", code=None, severity=None))

    # V-05: Customer Entity & Tax ID Check (100% Dynamic from Oracle EBS)
    address_matched: Optional[str] = None
    intercompany = False

    if len(receipts) == 0:
        rules.append(RuleResult(rule_id="V-05", result="not_evaluated", code=None, severity=None))
    else:
        rcv = receipts[0]
        oracle_tax_id = (rcv.CUSTOMER_TAX_ID or "").strip()
        oracle_postal = (rcv.CUSTOMER_POSTAL or "").strip()
        oracle_loc = (rcv.CUSTOMER_LOC_CODE or "").strip()
        ou_name = (rcv.OU_NAME or "").strip()

        if not oracle_tax_id:
            rules.append(RuleResult(
                rule_id="V-05",
                result="MANUAL",
                code=None,
                severity="Medium",
                details=f"ไม่พบข้อมูล Tax ID ผู้ซื้อในระบบ Oracle (Org {rcv.ORG_ID})"
            ))
            manual_review = True
        elif inv.customer_tax_id != oracle_tax_id:
            details_msg = f"Tax ID ลูกค้าไม่ตรง (Oracle: {oracle_tax_id}, Inv: {inv.customer_tax_id})"
            rules.append(RuleResult(rule_id="V-05", result="FAIL", code="E09", severity="High", details=details_msg))
            exceptions.append(ExceptionItem(code="E09", severity="High", rule_id="V-05", message="เลขประจำตัวผู้เสียภาษีลูกค้าไม่ตรงกับระบบ Oracle"))
        else:
            # Address / Branch postal check
            addr = inv.customer_address or ""
            postal_match = bool(oracle_postal and oracle_postal in addr)
            loc_match = False
            if oracle_loc:
                loc_parts = [p.strip() for p in re.split(r'[\\/\-,\s]+', oracle_loc) if len(p.strip()) > 3]
                loc_match = any(p.lower() in addr.lower() for p in loc_parts)

            if postal_match or loc_match or not oracle_postal or not addr:
                if "00003" in addr:
                    address_matched = "branch 00003"
                elif "00001" in addr:
                    address_matched = "branch 00001"
                else:
                    address_matched = f"HQ ({oracle_postal})" if oracle_postal else "HQ"
                rules.append(RuleResult(
                    rule_id="V-05",
                    result="PASS",
                    code=None,
                    severity=None,
                    details=f"Matched {address_matched} ({ou_name or 'Oracle'})"
                ))
            else:
                rules.append(RuleResult(
                    rule_id="V-05",
                    result="FAIL",
                    code="E09",
                    severity="Medium",
                    details=f"ที่อยู่ลูกค้าไม่ตรงกับรหัสไปรษณีย์ในระบบ Oracle (Oracle: {oracle_postal})"
                ))
                exceptions.append(ExceptionItem(
                    code="E09",
                    severity="Medium",
                    rule_id="V-05",
                    message="ที่อยู่ลูกค้าไม่ตรงกับข้อมูลสาขาหรือรหัสไปรษณีย์ในระบบ Oracle"
                ))

    # Intercompany check (Dynamic Oracle Tax IDs)
    if internal_tax_ids is None:
        try:
            from app.services.master_data_service import get_master_data_service
            mds = get_master_data_service()
            if mds._internal_tax_ids:
                internal_tax_ids = mds._internal_tax_ids
        except Exception:
            pass

    if internal_tax_ids and inv.supplier_tax_id:
        if inv.supplier_tax_id.strip() in internal_tax_ids:
            intercompany = True

    has_critical_issue = any(e.code in ["E17", "E35"] for e in exceptions) or manual_review
    return rules, exceptions, active_rows, address_matched, intercompany, manual_review, has_critical_issue


# =============================================================================
# STEP 3: Matching Ladder & Line Checks (V-07, V-08, V-09)
# =============================================================================

def evaluate_step3(
    doc: ExtractedDocument,
    active_rows: List[OracleReceipt],
    existing_rules: List[RuleResult],
    existing_exceptions: List[ExceptionItem]
) -> Tuple[List[RuleResult], List[ExceptionItem]]:
    """Evaluate Line Matching Ladder M1-M5, Quantities V-08, and Subtotal V-09 (N9)."""
    rules = list(existing_rules)
    exceptions = list(existing_exceptions)
    inv = doc.invoice
    lines = doc.lines

    v07_has_mismatch = False
    v08_has_mismatch = False

    # Bipartite / Price-First Matching between Invoice Lines and Oracle Receipts
    # Track assigned receipt row for each invoice line
    matched_pairs: Dict[int, Any] = {}
    used_receipt_indices: set = set()

    # Pre-calculate subtotal match check
    total_rcv_amount = sum((r.LINE_TOTAL or (r.UNIT_PRICE * r.QUANTITY_RECEIVED)) for r in active_rows)
    subtotal_perfect_match = bool(inv.sub_total > 0 and abs(inv.sub_total - total_rcv_amount) <= 1.0)

    # Helper: description score between invoice line and receipt row
    def calc_desc_similarity(l_desc: str, r_row: Any) -> int:
        score = 0
        desc_u = (l_desc or "").upper()
        item_no = (r_row.ITEM_NUMBER or "").strip().upper()
        if item_no and item_no in desc_u:
            score += 20
        r_desc = (r_row.ITEM_DESCRIPTION or "").upper()
        tokens = [w for w in re.split(r"[\s,\-\\/]+", r_desc) if len(w) > 3]
        for t in tokens:
            if t in desc_u:
                score += 2
        return score

    # Pass 1: Exact Price + Exact Quantity
    for l_idx, l in enumerate(lines):
        if l_idx in matched_pairs:
            continue
        cands = [
            (r_idx, r) for r_idx, r in enumerate(active_rows)
            if r_idx not in used_receipt_indices
            and abs(l.unit_price - r.UNIT_PRICE) < 0.01
            and abs(l.qty - r.QUANTITY_RECEIVED) < 0.001
        ]
        if cands:
            best_r_idx, best_r = max(cands, key=lambda c: calc_desc_similarity(l.description, c[1]))
            matched_pairs[l_idx] = best_r
            used_receipt_indices.add(best_r_idx)

    # Pass 2: Price within 1% (< 1% and <= 200 THB) + Exact Quantity
    for l_idx, l in enumerate(lines):
        if l_idx in matched_pairs:
            continue
        cands = []
        for r_idx, r in enumerate(active_rows):
            if r_idx in used_receipt_indices:
                continue
            if abs(l.qty - r.QUANTITY_RECEIVED) < 0.001 and r.UNIT_PRICE > 0:
                p_diff = abs(l.unit_price - r.UNIT_PRICE)
                if (p_diff / r.UNIT_PRICE) <= 0.01 and p_diff <= 200.0:
                    cands.append((r_idx, r))
        if cands:
            best_r_idx, best_r = max(cands, key=lambda c: calc_desc_similarity(l.description, c[1]))
            matched_pairs[l_idx] = best_r
            used_receipt_indices.add(best_r_idx)

    # Pass 3: If Subtotal matches 100%, Greedy matching by Line Amount
    if subtotal_perfect_match:
        for l_idx, l in enumerate(lines):
            if l_idx in matched_pairs:
                continue
            l_amt = l.amount if l.amount > 0 else (l.unit_price * l.qty)
            cands = []
            for r_idx, r in enumerate(active_rows):
                if r_idx in used_receipt_indices:
                    continue
                r_amt = r.LINE_TOTAL or (r.UNIT_PRICE * r.QUANTITY_RECEIVED)
                if abs(l_amt - r_amt) <= 1.0:
                    cands.append((r_idx, r))
            if cands:
                best_r_idx, best_r = max(cands, key=lambda c: calc_desc_similarity(l.description, c[1]))
                matched_pairs[l_idx] = best_r
                used_receipt_indices.add(best_r_idx)

    # Pass 4: Match by Item Number in description
    for l_idx, l in enumerate(lines):
        if l_idx in matched_pairs:
            continue
        desc_u = (l.description or "").upper()
        cands = [
            (r_idx, r) for r_idx, r in enumerate(active_rows)
            if r_idx not in used_receipt_indices
            and r.ITEM_NUMBER and r.ITEM_NUMBER.upper() in desc_u
        ]
        if cands:
            best_r_idx, best_r = max(cands, key=lambda c: -abs(l.unit_price - c[1].UNIT_PRICE))
            matched_pairs[l_idx] = best_r
            used_receipt_indices.add(best_r_idx)

    # Pass 5: Match by Exact Price (handles partial delivery / milestone)
    for l_idx, l in enumerate(lines):
        if l_idx in matched_pairs:
            continue
        cands = [
            (r_idx, r) for r_idx, r in enumerate(active_rows)
            if r_idx not in used_receipt_indices
            and abs(l.unit_price - r.UNIT_PRICE) < 0.01
        ]
        if cands:
            best_r_idx, best_r = max(cands, key=lambda c: calc_desc_similarity(l.description, c[1]))
            matched_pairs[l_idx] = best_r
            used_receipt_indices.add(best_r_idx)

    # Pass 6: Description substring match
    for l_idx, l in enumerate(lines):
        if l_idx in matched_pairs:
            continue
        cands = [
            (r_idx, r) for r_idx, r in enumerate(active_rows)
            if r_idx not in used_receipt_indices
            and calc_desc_similarity(l.description, r) > 0
        ]
        if cands:
            best_r_idx, best_r = max(cands, key=lambda c: calc_desc_similarity(l.description, c[1]))
            matched_pairs[l_idx] = best_r
            used_receipt_indices.add(best_r_idx)

    # Pass 7: Line number fallback (only after all content-based rules tried)
    for l_idx, l in enumerate(lines):
        if l_idx in matched_pairs:
            continue
        cands = [
            (r_idx, r) for r_idx, r in enumerate(active_rows)
            if r_idx not in used_receipt_indices
            and r.LINE_NUM == l.line_no
        ]
        if cands:
            matched_pairs[l_idx] = cands[0][1]
            used_receipt_indices.add(cands[0][0])

    # Pass 8: Any remaining receipt or active receipt fallback
    for l_idx, l in enumerate(lines):
        if l_idx in matched_pairs:
            continue
        remaining = [
            (r_idx, r) for r_idx, r in enumerate(active_rows)
            if r_idx not in used_receipt_indices
        ]
        if remaining:
            matched_pairs[l_idx] = remaining[0][1]
            used_receipt_indices.add(remaining[0][0])
        elif active_rows:
            matched_pairs[l_idx] = active_rows[0]

    for l_idx, l in enumerate(lines):
        matched = matched_pairs.get(l_idx)
        if not matched:
            v07_has_mismatch = True
            exceptions.append(ExceptionItem(code="E30", severity="High", rule_id="V-07", message=f"บรรทัดที่ {l.line_no} ไม่พบบรรทัดตรงในใบรับ"))
            continue

        # Price comparison
        price_diff = abs(l.unit_price - matched.UNIT_PRICE)
        price_pct = (price_diff / matched.UNIT_PRICE) if matched.UNIT_PRICE > 0 else 0.0

        if price_diff > 0:
            if price_pct <= 0.01 and price_diff <= 200.0:
                exceptions.append(ExceptionItem(code="E29", severity="Low", rule_id="V-07", message=f"บรรทัดที่ {l.line_no} ราคาต่างกันในกรอบยอมรับ ({price_diff:.2f} บาท)"))
            else:
                v07_has_mismatch = True
                exceptions.append(ExceptionItem(code="E05", severity="High", rule_id="V-07", message=f"บรรทัดที่ {l.line_no} ราคาต่างเกินกรอบยอมรับ"))

        # UOM Check - Normalize both sides
        cleaned_inv_uom = clean_uom(l.uom)
        cleaned_rcv_uom = clean_uom(matched.UNIT_MEAS_LOOKUP_CODE)
        if (
            cleaned_inv_uom != cleaned_rcv_uom
            and l.uom != matched.UNIT_MEAS_LOOKUP_CODE
            and cleaned_inv_uom != matched.UNIT_MEAS_LOOKUP_CODE
            and l.uom != cleaned_rcv_uom
        ):
            exceptions.append(ExceptionItem(
                code="E12",
                severity="Medium",
                rule_id="V-07",
                message=f"บรรทัดที่ {l.line_no} หน่วยนับไม่ตรง (Inv: {l.uom}, Rcv: {matched.UNIT_MEAS_LOOKUP_CODE})"
            ))

        # V-08: Quantity Check
        if l.qty > matched.QUANTITY_RECEIVED:
            v08_has_mismatch = True
            exceptions.append(ExceptionItem(
                code="E06",
                severity="High",
                rule_id="V-08",
                message=f"บรรทัดที่ {l.line_no} จำนวนวางบิลเกินยอดรับจริง (Inv: {l.qty}, Rcv: {matched.QUANTITY_RECEIVED})"
            ))
        elif l.qty < matched.QUANTITY_RECEIVED:
            exceptions.append(ExceptionItem(
                code="E34",
                severity="Medium",
                rule_id="V-08",
                message=f"บรรทัดที่ {l.line_no} วางบิลบางส่วน (Inv: {l.qty} จาก {matched.QUANTITY_RECEIVED})"
            ))


    # Append V-07 & V-08 results
    rules.append(RuleResult(
        rule_id="V-07",
        result="FAIL" if v07_has_mismatch else "PASS",
        code="E05" if v07_has_mismatch else None,
        severity="High" if v07_has_mismatch else None
    ))
    rules.append(RuleResult(
        rule_id="V-08",
        result="FAIL" if v08_has_mismatch else "PASS",
        code="E06" if v08_has_mismatch else None,
        severity="High" if v08_has_mismatch else None
    ))

    # V-09: Total Amount Check
    rcv_total = sum(r.QUANTITY_RECEIVED * r.UNIT_PRICE for r in active_rows)
    diff_rcv = abs(inv.sub_total - rcv_total)

    if diff_rcv > 0.50:
        details_msg = f"Diff: {diff_rcv:.2f} บาท"
        rules.append(RuleResult(rule_id="V-09", result="FAIL", code="E31", severity="High", details=details_msg))
        exceptions.append(ExceptionItem(code="E31", severity="High", rule_id="V-09", message="ยอดรวมมูลค่าสินค้าไม่ตรงกับยอดรวมใบรับสินค้า"))
    else:
        rules.append(RuleResult(rule_id="V-09", result="PASS", code=None, severity=None))

    return rules, exceptions


# =============================================================================
# STEP 4: Decision Matrix & JSON Table 9 Assembly (N10 & N11)
# =============================================================================

def evaluate_step4_decision(
    doc: ExtractedDocument,
    rules: List[RuleResult],
    exceptions: List[ExceptionItem],
    manual_review: bool = False,
    halted_by: Optional[str] = None,
    address_matched: Optional[str] = None,
    intercompany: bool = False,
    oracle_data: Optional[Dict[str, Any]] = None,
) -> Table9Output:
    """Aggregate all 9 rules, determine final decision, and validate Table 9 schema (N10, N11)."""
    # Ensure all 9 rules are present; if bypassed, mark as 'not_evaluated'
    evaluated_ids = {r.rule_id for r in rules}
    final_rules: List[RuleResult] = list(rules)

    for r_id in STANDARD_RULES:
        if r_id not in evaluated_ids:
            final_rules.append(RuleResult(rule_id=r_id, result="not_evaluated", code=None, severity=None))

    final_rules.sort(key=lambda r: r.rule_id)

    # Determine Final Status
    has_high = any(e.severity == "High" for e in exceptions)
    has_medium = any(e.severity == "Medium" for e in exceptions)

    if manual_review:
        final_status = "Manual Review"
    elif has_high:
        final_status = "Hold"
    elif has_medium:
        final_status = "Review"
    else:
        final_status = "Auto-pass"

    # Task Assignment Logic
    has_user_task = any(e.code in USER_TASK_CODES for e in exceptions)
    if final_status == "Auto-pass":
        assigned_to = None
    elif has_user_task:
        assigned_to = "user"
    else:
        assigned_to = "accounting"

    # Assemble Table 9 Output
    decision = DecisionInfo(
        status=final_status,
        assigned_to=assigned_to,
        halted_by=halted_by,
        manual_review=manual_review
    )

    summary = InvoiceSummary(
        invoice_num=doc.invoice.invoice_num or "",
        po_number=doc.invoice.po_number,
        supplier_name=doc.invoice.supplier_name or "",
        supplier_tax_id=doc.invoice.supplier_tax_id,
        customer_name=doc.invoice.customer_name or "",
        customer_tax_id=doc.invoice.customer_tax_id,
        address_matched=address_matched,
        intercompany=intercompany,
        sub_total=doc.invoice.sub_total,
        vat=doc.invoice.vat,
        grand_total=doc.invoice.grand_total,
        po_type=doc.po_type
    )

    table9 = Table9Output(
        standard_version="6.2",
        doc_id=doc.doc_id,
        validation_round=doc.validation_round,
        decision=decision,
        invoice_summary=summary,
        rules=final_rules,
        exceptions=exceptions,
        oracle_data=oracle_data
    )

    # N11: Schema Validate assertion
    validate_table9_schema(table9)
    return table9


def validate_table9_schema(table9: Table9Output) -> None:
    """Validate output according to Standard v6.2 Table 9 requirements (N11)."""
    errors = []
    if table9.standard_version != "6.2":
        errors.append("standard_version must be 6.2")
    if table9.decision.status not in ["Auto-pass", "Review", "Hold", "Manual Review"]:
        errors.append(f"Invalid decision.status: {table9.decision.status}")
    if len(table9.rules) != 9:
        errors.append(f"rules array must contain exactly 9 rules, got {len(table9.rules)}")

    for e in table9.exceptions:
        if e.code not in VALID_EXCEPTION_CODES:
            errors.append(f"Invalid exception code: {e.code}")

    if errors:
        raise ValueError(f"Schema Validation Failed: {'; '.join(errors)}")
