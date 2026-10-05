"""Live Oracle EBS Integration Tests for Pi Agent.

Queries live Oracle EBS via OracleMCPClient (rcv_v01 named query) and verifies
data contract, receipt rows, and 3-Way Matching pipeline with real ERP data.
"""

import sys
import json
import time
import asyncio
from pathlib import Path
from typing import Dict, Any, List

import pytest

# Ensure project root is in sys.path
_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.config import get_settings
from app.services.oracle_mcp import OracleMCPClient
from app.services.pipeline import VerificationPipeline
from app.core.models import (
    ExtractedDocument,
    InvoiceHeader,
    InvoiceLine,
    Signatures,
    SignatureInfo,
    OracleReceipt
)

SCENARIOS_PATH = _ROOT / "tests" / "fixtures" / "oracle_test_scenarios.json"


def load_scenarios() -> List[Dict[str, Any]]:
    if not SCENARIOS_PATH.exists():
        pytest.skip(f"Scenarios file not found: {SCENARIOS_PATH}")
    with open(SCENARIOS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("scenarios", [])


@pytest.fixture(scope="module")
def oracle_client():
    return OracleMCPClient(timeout=45.0)


@pytest.fixture(scope="module")
def pipeline():
    return VerificationPipeline()


@pytest.mark.live
@pytest.mark.oracle
@pytest.mark.asyncio
async def test_live_oracle_connectivity(oracle_client):
    """Test basic connectivity to Oracle EBS MCP endpoint."""
    settings = get_settings()
    assert settings.ORACLE_MCP_URL.startswith("http"), "Oracle MCP URL must be configured"
    
    start = time.time()
    receipts = await oracle_client.get_receipts(
        invoice_num="TLP-IV-69-09-0025",
        po_number="42052835",
        supplier_tax_id="0205549020741"
    )
    duration = time.time() - start
    print(f"\n[LIVE ORACLE] Queried PO 42052835 in {duration:.2f}s, retrieved {len(receipts)} rows.")
    assert len(receipts) > 0, "Expected at least 1 receipt for verified PO 42052835"


@pytest.mark.live
@pytest.mark.oracle
@pytest.mark.asyncio
async def test_live_oracle_schema_and_org_id(oracle_client):
    """Verify receipt fields and ORG_ID match Oracle EBS standard (352)."""
    receipts = await oracle_client.get_receipts(
        invoice_num="TLP-IV-69-09-0025",
        po_number="42052835",
        supplier_tax_id="0205549020741"
    )
    assert len(receipts) > 0, "Receipt rows must be returned"
    
    first = receipts[0]
    assert first.PO_NUMBER == "42052835"
    assert first.ORG_ID == 352, f"Expected ORG_ID 352, got {first.ORG_ID}"
    assert first.RECEIPT_NUM is not None, "RECEIPT_NUM must not be null"
    assert first.ITEM_NUMBER is not None, "ITEM_NUMBER must not be null"
    assert first.QUANTITY_RECEIVED is not None, "QUANTITY_RECEIVED must not be null"


@pytest.mark.live
@pytest.mark.oracle
@pytest.mark.asyncio
async def test_live_oracle_e17_nonexistent_po(oracle_client):
    """Verify that a non-existent PO returns 0 rows safely (E17 precondition)."""
    empty_rows = await oracle_client.get_po_receipts("99999999")
    assert isinstance(empty_rows, list)
    assert len(empty_rows) == 0, f"Expected 0 rows for non-existent PO 99999999, got {len(empty_rows)}"


@pytest.mark.live
@pytest.mark.oracle
@pytest.mark.asyncio
async def test_live_pipeline_matching_with_real_oracle(pipeline):
    """End-to-End matching verification against live Oracle EBS receipts."""
    # Construct verified document matching PO 42052835
    doc = ExtractedDocument(
        doc_id=9001,
        validation_round=1,
        invoice=InvoiceHeader(
            invoice_num="TLP-IV-69-09-0025",
            invoice_date="15/09/2026",
            supplier_name="TOP LASER PROCESSING CO., LTD.",
            supplier_tax_id="0205549020741",
            supplier_branch="00000",
            customer_name="อาปิโก ไฮเทค ทูลลิ่ง",
            customer_tax_id="0145548001557",
            customer_branch="00001",
            customer_address="13160",
            po_number="42052835",
            sub_total=23370.00,
            vat=1635.90,
            grand_total=25005.90,
            currency="THB"
        ),
        lines=[
            InvoiceLine(line_no=1, description="rma transportation", qty=1.0, uom="TRIP", unit_price=2500.0, amount=2500.0),
            InvoiceLine(line_no=2, description="rma transportation", qty=1.0, uom="TRIP", unit_price=2500.0, amount=2500.0),
            InvoiceLine(line_no=3, description="rma setting part", qty=1.0, uom="PCS", unit_price=1200.0, amount=1200.0),
            InvoiceLine(line_no=4, description="rma laser cut", qty=202.0, uom="PCS", unit_price=85.0, amount=17170.0)
        ],
        signatures=Signatures(
            receiver=SignatureInfo(present=True, page=1),
            supplier_or_deliverer=SignatureInfo(present=True, page=1)
        )
    )

    result = await pipeline.execute_matching_engine(doc)

    print(f"\n[LIVE PIPELINE RESULT] Doc ID: {result.doc_id}")
    print(f"Decision Status: {result.decision.status}")
    print(f"Exceptions: {[e.code for e in result.exceptions]}")
    print(f"Oracle Queried: {result.oracle_data.get('queried')}")
    print(f"Receipt Count: {result.oracle_data.get('count')}")

    assert result.decision.status in ["Auto-pass", "Review"], f"Unexpected status: {result.decision.status}"
    assert result.oracle_data.get("queried") is True, "Oracle should be queried"
    assert result.oracle_data.get("count", 0) > 0, "Receipts should be populated"


if __name__ == "__main__":
    print("=" * 65)
    print("  RUNNING LIVE ORACLE EBS TESTS (Direct Execution)")
    print("=" * 65)
    pytest.main(["-v", "-s", __file__])
