"""Offline regression tests for the synthetic invoice corpus in tests/test_invoices.

No Oracle, no LiteLLM, no FastAPI — everything runs against `app.core.rules`.
These tests fail if the answer key, the rules engine or the rendered PDFs disagree.

    .venv/Scripts/python.exe -m pytest tests/test_invoice_corpus.py -q
"""
import sys
from collections import Counter
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "tests" / "test_invoices"
if str(CORPUS) not in sys.path:
    sys.path.insert(0, str(CORPUS))

import check_pdfs          # noqa: E402  (corpus tooling, sibling module)
import verify_dataset      # noqa: E402

DATASET_PATH = CORPUS / "test_dataset.json"
PDF_DIR = CORPUS / "pdfs"

# The answer key and the rendered PDFs are derived from a production Oracle extract
# (`tests/test_invoices/_raw/oracle_receipts.csv`) and are therefore kept out of the
# repository.  Regenerate them locally with build_test_dataset*.py +
# generate_invoices.py; a clean clone skips this module instead of failing.
if not DATASET_PATH.exists():
    pytest.skip(
        f"synthetic corpus data not present: {DATASET_PATH}",
        allow_module_level=True,
    )

RULES = ["V-01", "V-02", "V-03", "V-04", "V-05", "V-06", "V-07", "V-08", "V-09"]
DECISIONS = {"Auto-pass", "Review", "Hold", "Manual Review"}
WAVE1_PREFIXES = ("INV-A", "INV-B", "INV-C", "INV-D", "INV-E")
WAVE2_PREFIXES = ("INV-F", "INV-G", "INV-H", "INV-I", "INV-J")
# codes the current engine can emit and that the corpus is expected to exercise
COVERED_CODES = {"E05", "E06", "E09", "E12", "E13", "E16", "E17", "E26",
                 "E28", "E29", "E31", "E34", "E35"}


@pytest.fixture(scope="session")
def dataset():
    return check_pdfs.load_dataset()


@pytest.fixture(scope="session")
def replay(dataset):
    """Engine replay of every expected_result (read-only, nothing is written)."""
    return verify_dataset.verify(dataset, fix=False)


@pytest.fixture(scope="session")
def pdf_audit(dataset):
    return check_pdfs.audit(dataset)


def test_dataset_shape(dataset):
    invoices = dataset["invoices"]
    assert len(invoices) == 155, "corpus must stay at 155 invoices (55 wave 1 + 100 wave 2)"
    ids = [i["invoice_id"] for i in invoices]
    assert len(set(ids)) == len(ids), "duplicate invoice_id in test_dataset.json"
    serials = [i["invoice_data"].get("invoice_num") for i in invoices
               if i["invoice_data"].get("invoice_num")]
    assert len(set(serials)) == len(serials), "invoice_num must be unique when present"
    for inv in invoices:
        assert inv["pdf_filename"] == f"{inv['invoice_id']}.pdf"
        assert inv["invoice_id"].startswith(WAVE1_PREFIXES + WAVE2_PREFIXES)


def test_answer_key_is_complete(dataset):
    for inv in dataset["invoices"]:
        er = inv.get("expected_result", {})
        assert er.get("decision_status") in DECISIONS, f"{inv['invoice_id']}: bad decision_status"
        assert set(er.get("rules", {})) >= set(RULES), f"{inv['invoice_id']}: missing rules"
        assert er.get("expected_exceptions") is not None, f"{inv['invoice_id']}: no exception list"
        assert er.get("halted_by") in (None, "", "V-02"), \
            f"{inv['invoice_id']}: engine only ever halts at V-02"


def test_every_expectation_matches_the_engine(replay):
    drifted = replay["drifted"]
    detail = "; ".join(
        f"{iid}: {b['decision_status']}/{b['exceptions']} != "
        f"{a['decision_status']}/{a['exceptions']}"
        for iid, b, a in drifted[:5])
    assert not drifted, f"{len(drifted)} expectation(s) disagree with app.core.rules -> {detail}"
    assert not replay["unverifiable"], f"cannot replay: {replay['unverifiable'][:10]}"
    assert not replay["problems"], f"structural problems: {replay['problems'][:10]}"


def test_rule_and_exception_coverage(dataset, replay):
    assert set(replay["statuses"]) == DECISIONS, f"decision mix changed: {dict(replay['statuses'])}"
    missing = COVERED_CODES - set(replay["codes"])
    assert not missing, f"exception codes no longer exercised: {sorted(missing)}"
    for rule in RULES:
        results = Counter(inv["expected_result"]["rules"][rule]["result"] for inv in dataset["invoices"])
        assert set(results) - {"not_evaluated"}, f"{rule} is never evaluated in the corpus"
        assert "FAIL" in results or rule == "V-04", f"{rule} has no failing case"


def test_wave2_category_invariants(dataset):
    by_cat = Counter(i["category"] for i in dataset["invoices"] if i.get("wave") == 2)
    assert by_cat == {"F": 20, "G": 25, "H": 25, "I": 10, "J": 20}, f"wave 2 mix changed: {by_cat}"
    for inv in dataset["invoices"]:
        if inv.get("wave") != 2:
            continue
        er, iid = inv["expected_result"], inv["invoice_id"]
        codes = set(er["expected_exceptions"])
        if inv["category"] == "F":
            assert er["decision_status"] == "Auto-pass", f"{iid}: valid invoice must auto-pass"
        if inv["category"] in {"G", "H"}:
            assert er["decision_status"] != "Auto-pass", f"{iid}: failing invoice must not pass"
            assert codes, f"{iid}: failing invoice must raise at least one code"
        if inv["category"] == "I":
            assert er.get("intercompany"), f"{iid}: intercompany flag must be true"

    j_ids = {i["invoice_id"] for i in dataset["invoices"]
             if i.get("wave") == 2 and i["category"] == "J"
             and i["expected_result"]["decision_status"] == "Auto-pass"}
    assert len(j_ids) >= 10, "layout/format variants must still be read correctly"
    assert {"INV-J17", "INV-J20"} <= j_ids, "the two documented engine blind spots must still pass"


@pytest.mark.skipif(not PDF_DIR.exists(), reason="rendered PDFs are not present locally")
def test_pdf_files_exist_and_match_the_key(dataset, pdf_audit):
    assert pdf_audit["invoices"] == len(dataset["invoices"])
    assert pdf_audit["pages"] >= pdf_audit["invoices"]
    assert not pdf_audit["failures"], \
        f"PDF/key mismatches: {pdf_audit['failures'][:8]}"


def test_multi_page_and_incomplete_documents(dataset):
    multi = [i for i in dataset["invoices"] if i.get("document_flags", {}).get("pages", 1) > 1]
    incomplete = [i for i in dataset["invoices"]
                  if not i.get("document_flags", {}).get("pages_complete", True)]
    assert len(multi) >= 2, "corpus should keep multi-page invoices"
    assert len(incomplete) >= 1, "corpus should keep an incomplete-upload invoice"
    for inv in incomplete:
        assert "E13" in inv["expected_result"]["expected_exceptions"], \
            f"{inv['invoice_id']}: incomplete pages must raise E13"
