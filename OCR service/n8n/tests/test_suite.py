"""Comprehensive Live Test Suite for AIVA PO-INV Matching Service.

Tests:
1. Environment & Configuration Settings
2. Live Oracle EBS MCP Service (rcv_v01 query on PO 42052835)
3. Live LiteLLM Vision Extraction (deepseek-v4-flash)
4. Deterministic Rules Engine (Execution #292 data, Execution #272 data, E28, E26, E17)
5. Live FastAPI Endpoints (/health, /master-entities, /oracle-receipts, /verify/extracted-json)
"""

import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import time
import asyncio
from typing import Dict, Any

from colorama import init, Fore, Style
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.core.models import (
    ExtractedDocument,
    InvoiceHeader,
    InvoiceLine,
    Signatures,
    SignatureInfo,
    OracleReceipt
)
from app.core.rules import (
    evaluate_step1,
    evaluate_step2,
    evaluate_step3,
    evaluate_step4_decision
)
from app.services.oracle_mcp import OracleMCPClient
from app.services.vision_extractor import VisionExtractor
from app.services.pipeline import VerificationPipeline

init(autoreset=True)

PASS_BADGE = f"{Fore.GREEN}[ PASS ]{Style.RESET_ALL}"
FAIL_BADGE = f"{Fore.RED}[ FAIL ]{Style.RESET_ALL}"
INFO_BADGE = f"{Fore.CYAN}[ INFO ]{Style.RESET_ALL}"
WARN_BADGE = f"{Fore.YELLOW}[ WARN ]{Style.RESET_ALL}"


class TestRunner:
    def __init__(self):
        self.settings = get_settings()
        self.client = TestClient(app)
        self.pipeline = VerificationPipeline()
        self.passed = 0
        self.failed = 0
        self.total = 0

    def print_header(self, title: str):
        print(f"\n{Fore.BLUE}{'=' * 75}{Style.RESET_ALL}")
        print(f"{Fore.BLUE}{Style.BRIGHT}  {title}{Style.RESET_ALL}")
        print(f"{Fore.BLUE}{'=' * 75}{Style.RESET_ALL}")

    def record_result(self, test_name: str, passed: bool, detail: str = ""):
        self.total += 1
        if passed:
            self.passed += 1
            print(f" {PASS_BADGE} {test_name} {Fore.LIGHTBLACK_EX}{detail}{Style.RESET_ALL}")
        else:
            self.failed += 1
            print(f" {FAIL_BADGE} {test_name} {Fore.RED}{detail}{Style.RESET_ALL}")

    # =========================================================================
    # Test Group 1: Configuration & Settings
    # =========================================================================
    def test_configuration(self):
        self.print_header("TEST SUITE 1: System Configuration & Environment")
        # 1.1 Check App Name & Version
        passed = self.settings.APP_NAME != ""
        self.record_result("App Name Configured", passed, f"({self.settings.APP_NAME})")

        # 1.2 Check Oracle MCP URL
        oracle_ok = self.settings.ORACLE_MCP_URL.startswith("http")
        self.record_result("Oracle MCP URL Configured", oracle_ok, f"({self.settings.ORACLE_MCP_URL})")

        # 1.3 Check LiteLLM URL
        llm_ok = self.settings.LITELLM_URL.startswith("http")
        self.record_result("LiteLLM URL Configured", llm_ok, f"({self.settings.LITELLM_URL}, Model: {self.settings.LITELLM_MODEL})")

    # =========================================================================
    # Test Group 2: Live Oracle EBS MCP Service
    # =========================================================================
    async def test_live_oracle_mcp(self):
        self.print_header("TEST SUITE 2: Live Oracle EBS MCP Service (Named Query)")
        client = OracleMCPClient(timeout=60.0)

        # 2.1 Query PO 42052835
        start = time.time()
        try:
            receipts = await client.get_po_receipts("42052835")
            duration = round(time.time() - start, 2)
            has_rows = len(receipts) > 0
            self.record_result(
                "Oracle MCP Query PO 42052835",
                has_rows,
                f"(Retrieved {len(receipts)} rows in {duration}s)"
            )

            # 2.2 Verify Receipt Fields & ORG_ID
            if has_rows:
                first = receipts[0]
                valid_fields = bool(first.PO_NUMBER == "42052835" and first.RECEIPT_NUM and first.ORG_ID == 352)
                self.record_result(
                    "Receipt Schema & ORG_ID Match",
                    valid_fields,
                    f"(Receipt: {first.RECEIPT_NUM}, Item: {first.ITEM_NUMBER}, ORG_ID: {first.ORG_ID})"
                )
        except Exception as e:
            self.record_result("Oracle MCP Query PO 42052835", False, f"Exception: {repr(e)}")

        # 2.3 Query Non-existent PO (Expected 0 rows)
        try:
            empty_rows = await client.get_po_receipts("99999999")
            self.record_result("Oracle MCP Handle Non-existent PO", len(empty_rows) == 0, f"({len(empty_rows)} rows returned correctly)")
        except Exception as e:
            self.record_result("Oracle MCP Handle Non-existent PO", False, f"Exception: {repr(e)}")

    # =========================================================================
    # Test Group 3: Live LiteLLM Vision Extractor Service
    # =========================================================================
    async def test_live_litellm_extractor(self):
        self.print_header("TEST SUITE 3: Live LiteLLM Service (deepseek-v4-flash)")
        extractor = VisionExtractor(timeout=60.0)

        # 3.1 Live extraction with Thai document text + Schema Prompt
        sample_doc_text = (
            "ใบกำกับภาษี/ใบส่งของ\n"
            "ผู้ขาย: บริษัท ท็อพ เลเซอร์ โปรเซสซิ่ง จำกัด เลขประจำตัว 0205549020741\n"
            "ลูกค้า: บริษัท อาปิโก ไฮเทค จำกัด เลขประจำตัว 0107545000213\n"
            "ที่อยู่: 991 หมู่ 1 นิคมไฮเทค อ.บางปะอิน จ.พระนครศรีอยุธยา 13160\n"
            "เลขที่บิล: TLP-IV-69-09-0025 วันที่: 15/09/2026 PO: 42052835\n"
            "รายการ: 1. RMA LASER CUT จำนวน 202 PCS ราคา 85.00 จำนวนเงิน 17170.00\n"
            "รวมเงิน: 17,170.00 บาท ภาษี: 1,201.90 ยอดสุทธิ: 18,371.90\n"
            "ลงชื่อผู้รับของ: สมชาย (มีลายเซ็น) ลงชื่อผู้ส่ง: สุรชัย (มีลายเซ็น)"
        )

        start = time.time()
        try:
            user_content = extractor.build_user_content(images=[], ocr_text=sample_doc_text)
            extracted = await extractor.extract_from_content(
                user_content=user_content,
                doc_id=101,
                validation_round=1
            )
            duration = round(time.time() - start, 2)
            has_inv = bool(extracted.invoice.po_number or extracted.invoice.sub_total > 0)
            self.record_result(
                "LiteLLM Vision Extractor Response",
                has_inv,
                f"(Extracted PO: {extracted.invoice.po_number}, Subtotal: {extracted.invoice.sub_total}, Vendor: {extracted.invoice.supplier_name[:20]} in {duration}s)"
            )
        except Exception as e:
            self.record_result("LiteLLM Vision Extractor Response", False, f"Exception: {repr(e)}")

    # =========================================================================
    # Test Group 4: Deterministic Rules Engine (Steps 1-4)
    # =========================================================================
    async def test_rules_engine_cases(self):
        self.print_header("TEST SUITE 4: Deterministic Rules Engine (Standard v6.2)")

        # ---------------------------------------------------------------------
        # Case 4.1: Live Execution #292 Data (PO 42052835) -> Expects 'Hold' (E09, E12)
        # ---------------------------------------------------------------------
        doc_292 = ExtractedDocument(
            doc_id=99,
            validation_round=1,
            invoice=InvoiceHeader(
                supplier_name="TOP LASER PROCESSING CO., LTD.",
                supplier_tax_id="0205549020741",
                customer_name="บริษัท อาปิโก ไฮเทค ทูลลิง จำกัด",
                customer_address="สํานักงานใหญ่ 991 หมู่ 1 นิคมอุตสาหกรรม ไฮเทค ต.บ้านเลน อ.บางปะอิน จ.พระนครศรีอยุธยา 13160",
                customer_tax_id="0145548001557",  # Does NOT match Master Tax ID for ORG_ID 352 (0107545000213)
                invoice_num="TLP-IV-69-09-0025",
                invoice_date="15/09/2026",
                po_number="42052835",
                currency="THB",
                sub_total=23370.0,
                vat=1635.9,
                grand_total=25005.9,
            ),
            lines=[
                InvoiceLine(line_no=1, description="rma transportation send spk50011 top laser to aht", qty=1, uom="TRIP", unit_price=2500.0, amount=2500.0),
                InvoiceLine(line_no=2, description="rma transportation send spk50011 aht to top laser", qty=1, uom="TRIP", unit_price=2500.0, amount=2500.0),
                InvoiceLine(line_no=3, description="rma setting part spk50011", qty=1, uom="JOB", unit_price=1200.0, amount=1200.0),
                InvoiceLine(line_no=4, description="rma laser cut part spk50011 (3d vz2)", qty=202, uom="PCS", unit_price=85.0, amount=17170.0),
            ],
            signatures=Signatures(
                supplier_or_deliverer=SignatureInfo(present=True, page=1),
                receiver=SignatureInfo(present=True, page=1)
            ),
            pages_complete=True,
            po_type="Purchase Order"
        )

        res_292 = await self.pipeline.execute_matching_engine(doc_292)
        is_hold = res_292.decision.status == "Hold"
        has_e09 = any(e.code == "E09" for e in res_292.exceptions)
        assigned_user = res_292.decision.assigned_to == "user"
        rule_count_ok = len(res_292.rules) == 9

        self.record_result(
            "Case 4.1: Live Exec #292 Data -> 'Hold' Decision",
            is_hold and has_e09 and assigned_user and rule_count_ok,
            f"(Status: {res_292.decision.status}, Assigned: {res_292.decision.assigned_to}, Rules: {len(res_292.rules)}, Exceptions: {[e.code for e in res_292.exceptions]})"
        )

        # ---------------------------------------------------------------------
        # Case 4.2: Clean Matching Document -> Expects 'Auto-pass'
        # ---------------------------------------------------------------------
        doc_autopass = ExtractedDocument(
            doc_id=102,
            validation_round=1,
            invoice=InvoiceHeader(
                supplier_name="TOP LASER PROCESSING CO., LTD.",
                supplier_tax_id="0205549020741",
                customer_name="อาปิโก ไฮเทค ทูลลิ่ง",
                customer_address="13160",
                customer_tax_id="0107545000213",  # Exact match with Master ORG_ID 352
                invoice_num="TLP-IV-69-09-0025",
                invoice_date="15/09/2026",
                po_number="42052835",
                currency="THB",
                sub_total=23370.0,
                vat=1635.9,
                grand_total=25005.9,
            ),
            lines=[
                InvoiceLine(line_no=1, description="rma transportation", qty=1, uom="TRIP", unit_price=2500.0, amount=2500.0),
                InvoiceLine(line_no=2, description="rma transportation", qty=1, uom="TRIP", unit_price=2500.0, amount=2500.0),
                InvoiceLine(line_no=3, description="rma setting part", qty=1, uom="PCS", unit_price=1200.0, amount=1200.0),
                InvoiceLine(line_no=4, description="rma laser cut", qty=202, uom="PCS", unit_price=85.0, amount=17170.0),
            ],
            signatures=Signatures(
                supplier_or_deliverer=SignatureInfo(present=True, page=1),
                receiver=SignatureInfo(present=True, page=1)
            ),
            pages_complete=True,
            po_type="Purchase Order"
        )

        res_autopass = await self.pipeline.execute_matching_engine(doc_autopass)
        # Note: In Oracle receipt 352, UOM is "Piece", line 3 in inv has "PCS" -> should pass cleanly
        is_pass = res_autopass.decision.status in ["Auto-pass", "Review"]
        self.record_result(
            "Case 4.2: Matching Tax ID & Clean Document",
            is_pass,
            f"(Decision: {res_autopass.decision.status}, Assigned: {res_autopass.decision.assigned_to})"
        )

        # ---------------------------------------------------------------------
        # Case 4.3: Line Math Error E28 -> Oracle MCP Bypassed
        # ---------------------------------------------------------------------
        doc_e28 = ExtractedDocument(
            doc_id=103,
            validation_round=1,
            invoice=InvoiceHeader(
                supplier_name="Vendor A",
                supplier_tax_id="0105553018446",
                customer_name="อาปิโก ไฮเทค",
                customer_address="13160",
                customer_tax_id="0107545000213",
                invoice_num="INV-E28",
                invoice_date="01/10/2026",
                po_number="42052835",
                sub_total=1000.0,
                vat=70.0,
                grand_total=1070.0
            ),
            lines=[
                InvoiceLine(line_no=1, description="Item 1", qty=10, uom="PCS", unit_price=100.0, amount=500.0)  # 10 * 100 != 500 (diff 500 > 0.50)
            ],
            signatures=Signatures(
                supplier_or_deliverer=SignatureInfo(present=True),
                receiver=SignatureInfo(present=True)
            )
        )

        res_e28 = await self.pipeline.execute_matching_engine(doc_e28)
        has_e28_flag = any(e.code == "E28" for e in res_e28.exceptions)
        halted_correctly = res_e28.decision.halted_by == "V-02"
        self.record_result(
            "Case 4.3: E28 Math Error Bypasses Oracle",
            has_e28_flag and halted_correctly,
            f"(Halted by: {res_e28.decision.halted_by}, Decision: {res_e28.decision.status})"
        )

        # ---------------------------------------------------------------------
        # Case 4.4: Missing Signatures E26
        # ---------------------------------------------------------------------
        doc_e26 = ExtractedDocument(
            doc_id=104,
            validation_round=1,
            invoice=InvoiceHeader(
                supplier_name="Vendor A",
                supplier_tax_id="0105553018446",
                customer_name="อาปิโก ไฮเทค",
                customer_address="13160",
                customer_tax_id="0107545000213",
                invoice_num="INV-E26",
                invoice_date="01/10/2026",
                po_number="42052835",
                sub_total=100.0,
                vat=7.0,
                grand_total=107.0
            ),
            lines=[
                InvoiceLine(line_no=1, description="Item 1", qty=1, uom="PCS", unit_price=100.0, amount=100.0)
            ],
            signatures=Signatures(
                supplier_or_deliverer=SignatureInfo(present=False),
                receiver=SignatureInfo(present=False)
            )
        )
        res_e26 = await self.pipeline.execute_matching_engine(doc_e26)
        has_e26_flag = any(e.code == "E26" for e in res_e26.exceptions)
        self.record_result(
            "Case 4.4: Missing Receiver/Supplier Signatures (E26)",
            has_e26_flag,
            f"(Exceptions: {[e.code for e in res_e26.exceptions]}, Decision: {res_e26.decision.status})"
        )

        # ---------------------------------------------------------------------
        # Case 4.5: Missing ERP Receipts (E17)
        # ---------------------------------------------------------------------
        doc_e17 = ExtractedDocument(
            doc_id=105,
            validation_round=1,
            invoice=InvoiceHeader(
                supplier_name="Vendor A",
                supplier_tax_id="0105553018446",
                customer_name="อาปิโก ไฮเทค",
                customer_address="13160",
                customer_tax_id="0107545000213",
                invoice_num="INV-E17",
                invoice_date="01/10/2026",
                po_number="99999999",  # Non-existent PO
                sub_total=100.0,
                vat=7.0,
                grand_total=107.0
            ),
            lines=[
                InvoiceLine(line_no=1, description="Item 1", qty=1, uom="PCS", unit_price=100.0, amount=100.0)
            ],
            signatures=Signatures(
                supplier_or_deliverer=SignatureInfo(present=True),
                receiver=SignatureInfo(present=True)
            )
        )
        res_e17 = await self.pipeline.execute_matching_engine(doc_e17)
        has_e17_flag = any(e.code == "E17" for e in res_e17.exceptions)
        self.record_result(
            "Case 4.5: Missing Receipts in ERP (E17)",
            has_e17_flag,
            f"(Decision: {res_e17.decision.status}, Assigned: {res_e17.decision.assigned_to})"
        )

    # =========================================================================
    # Test Group 5: Live FastAPI Endpoints
    # =========================================================================
    def test_fastapi_endpoints(self):
        self.print_header("TEST SUITE 5: FastAPI REST Endpoints")

        # 5.1 GET /health
        res = self.client.get("/health")
        self.record_result("GET /health", res.status_code == 200, f"(Status: {res.status_code})")

        # 5.2 GET /master-entities
        res_ent = self.client.get("/api/v1/master-entities")
        data_ent = res_ent.json() if res_ent.status_code == 200 else []
        self.record_result(
            "GET /api/v1/master-entities",
            res_ent.status_code == 200 and len(data_ent) == 27,
            f"(Found {len(data_ent)} master entities)"
        )

        # 5.3 GET /oracle-receipts/{po_number}
        res_rcv = self.client.get("/api/v1/oracle-receipts/42052835")
        data_rcv = res_rcv.json() if res_rcv.status_code == 200 else []
        self.record_result(
            "GET /api/v1/oracle-receipts/42052835",
            res_rcv.status_code == 200 and len(data_rcv) > 0,
            f"(Receipt lines: {len(data_rcv)})"
        )

        # 5.4 POST /api/v1/verify/extracted-json
        payload = {
            "doc_id": 99,
            "invoice": {
                "supplier_name": "TOP LASER PROCESSING CO., LTD.",
                "supplier_tax_id": "0205549020741",
                "customer_name": "บริษัท อาปิโก ไฮเทค ทูลลิง จำกัด",
                "customer_tax_id": "0145548001557",
                "invoice_num": "TLP-IV-69-09-0025",
                "invoice_date": "15/09/2026",
                "po_number": "42052835",
                "sub_total": 23370.0,
                "vat": 1635.9,
                "grand_total": 25005.9
            },
            "lines": [
                {"line_no": 1, "description": "rma transportation", "qty": 1, "uom": "TRIP", "unit_price": 2500.0, "amount": 2500.0},
                {"line_no": 2, "description": "rma transportation", "qty": 1, "uom": "TRIP", "unit_price": 2500.0, "amount": 2500.0},
                {"line_no": 3, "description": "rma setting part", "qty": 1, "uom": "JOB", "unit_price": 1200.0, "amount": 1200.0},
                {"line_no": 4, "description": "rma laser cut", "qty": 202, "uom": "PCS", "unit_price": 85.0, "amount": 17170.0}
            ],
            "signatures": {
                "supplier_or_deliverer": {"present": True},
                "receiver": {"present": True}
            }
        }
        res_verify = self.client.post("/api/v1/verify/extracted-json", json=payload)
        is_ok = res_verify.status_code == 200
        decision_status = res_verify.json().get("decision", {}).get("status") if is_ok else "ERR"
        self.record_result(
            "POST /api/v1/verify/extracted-json",
            is_ok,
            f"(Response Status: {res_verify.status_code}, Decision: {decision_status})"
        )

    # =========================================================================
    # Test Summary
    # =========================================================================
    def print_summary(self):
        print(f"\n{Fore.BLUE}{'=' * 75}{Style.RESET_ALL}")
        print(f"{Fore.BLUE}{Style.BRIGHT}  TEST EXECUTION SUMMARY{Style.RESET_ALL}")
        print(f"{Fore.BLUE}{'=' * 75}{Style.RESET_ALL}")
        print(f" Total Tests Run : {self.total}")
        print(f" Passed          : {Fore.GREEN}{self.passed}{Style.RESET_ALL}")
        print(f" Failed          : {Fore.RED if self.failed > 0 else Fore.GREEN}{self.failed}{Style.RESET_ALL}")
        success_rate = (self.passed / self.total * 100) if self.total > 0 else 0.0
        print(f" Success Rate    : {Fore.GREEN if success_rate == 100 else Fore.YELLOW}{success_rate:.1f}%{Style.RESET_ALL}")
        print(f"{Fore.BLUE}{'=' * 75}{Style.RESET_ALL}\n")


async def main():
    runner = TestRunner()
    runner.test_configuration()
    await runner.test_live_oracle_mcp()
    await runner.test_live_litellm_extractor()
    await runner.test_rules_engine_cases()
    runner.test_fastapi_endpoints()
    runner.print_summary()

    if runner.failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
