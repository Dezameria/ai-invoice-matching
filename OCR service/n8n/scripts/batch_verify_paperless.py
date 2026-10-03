"""Batch OCR and Verification Runner for Paperless Invoices.

Processes all documents with tag 'invoice' from Paperless-ngx, executes the
3-Way Matching Verification Pipeline (OCR + Document Rules + Oracle EBS Match),
and records only non-passing cases (Hold, Review, Manual Review, or Errors)
for downstream analysis and prompt/rule improvement.
"""

import argparse
import asyncio
import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

# Ensure project root is in sys.path
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.config import get_settings
from app.services.paperless import PaperlessClient
from app.services.pipeline import VerificationPipeline

# Setup basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("batch_verify")


class BatchVerificationRunner:
    """Orchestrates batch verification across Paperless documents."""

    def __init__(
        self,
        tag_id: Optional[int] = None,
        skip_checked: bool = False,
        tag_paperless: bool = False,
        post_to_portal: bool = False,
        concurrency: int = 1,
        output_json: Path = Path("failed_verifications.json"),
        output_report: Path = Path("failed_verifications_report.md"),
    ):
        self.settings = get_settings()
        self.paperless_client = PaperlessClient()
        self.pipeline = VerificationPipeline(paperless_client=self.paperless_client)

        self.tag_id = tag_id or self.settings.PAPERLESS_TAG_INVOICE_ID
        self.skip_checked = skip_checked
        self.tag_paperless = tag_paperless
        self.post_to_portal = post_to_portal
        self.concurrency = max(1, concurrency)
        self.output_json = output_json
        self.output_report = output_report

    async def run(self, limit: Optional[int] = None, single_doc_id: Optional[int] = None):
        """Run batch verification process."""
        start_time = time.time()
        print("\n" + "=" * 75)
        print("  AIVA Batch Paperless OCR & PO-INV Verification Runner")
        print("=" * 75)

        # 1. Fetch documents
        if single_doc_id:
            print(f"[*] Target mode: Single document ID {single_doc_id}")
            doc = await self.paperless_client.get_document_details(single_doc_id)
            documents = [doc]
        else:
            excluded = self.settings.PAPERLESS_TAG_CHECKED_ID if self.skip_checked else None
            filter_msg = f" (skipping checked tag {excluded})" if excluded else ""
            print(f"[*] Fetching documents with tag ID {self.tag_id}{filter_msg} from Paperless...")
            documents = await self.paperless_client.get_all_documents_by_tag(
                tag_id=self.tag_id,
                excluded_tag_id=excluded
            )

        total_docs = len(documents)
        print(f"[*] Found {total_docs} document(s) in Paperless.")

        if limit and limit > 0:
            documents = documents[:limit]
            print(f"[*] Processing limit applied: First {len(documents)} document(s).")

        if not documents:
            print("[!] No documents to process. Exiting.")
            return

        print(f"[*] Verification engine: 100% Dynamic Oracle EBS + LiteLLM Vision ({self.settings.LITELLM_MODEL})")
        print(f"[*] Concurrency level: {self.concurrency}")
        print(f"[*] Saving failed cases to: {self.output_json.resolve()}")
        print(f"[*] Saving summary report to: {self.output_report.resolve()}")
        print("-" * 75 + "\n")

        # 2. Process documents
        results: List[Dict[str, Any]] = []
        failed_cases: List[Dict[str, Any]] = []
        passed_count = 0
        failed_count = 0
        error_count = 0

        semaphore = asyncio.Semaphore(self.concurrency)
        counter = 0
        total_to_process = len(documents)

        async def process_single(doc_meta: Dict[str, Any], idx: int):
            nonlocal passed_count, failed_count, error_count, counter
            doc_id = doc_meta["id"]
            title = doc_meta.get("title", f"DOC_{doc_id}")
            original_filename = doc_meta.get("original_file_name", "")

            prefix = f"[{idx}/{total_to_process}] Doc {doc_id} ('{title}')"
            t0 = time.time()

            async with semaphore:
                try:
                    logger.info(f"{prefix} -> Starting OCR & Verification...")
                    resp = await self.pipeline.verify_paperless_document(
                        doc_meta=doc_meta,
                        post_to_portal=self.post_to_portal,
                        tag_paperless=self.tag_paperless
                    )
                    elapsed = round(time.time() - t0, 2)
                    table9 = resp.data

                    if not table9:
                        status = "Error"
                        error_msg = "No Table9 output returned"
                        logger.error(f"{prefix} -> {status} ({elapsed}s): {error_msg}")
                        error_count += 1
                        failed_count += 1
                        fail_record = {
                            "doc_id": doc_id,
                            "title": title,
                            "original_file_name": original_filename,
                            "decision": {"status": "Error", "assigned_to": "accounting", "halted_by": None},
                            "error": error_msg,
                            "elapsed_seconds": elapsed,
                            "timestamp": datetime.utcnow().isoformat() + "Z"
                        }
                        failed_cases.append(fail_record)
                        return

                    status = table9.decision.status
                    exceptions_list = [
                        {"code": e.code, "severity": e.severity, "rule_id": e.rule_id, "message": e.message}
                        for e in table9.exceptions
                    ]
                    failed_rules = [
                        {"rule_id": r.rule_id, "result": r.result, "code": r.code, "severity": r.severity, "details": r.details}
                        for r in table9.rules if r.result in ("FAIL", "MANUAL")
                    ]

                    if status == "Auto-pass" and len(exceptions_list) == 0:
                        passed_count += 1
                        logger.info(f"{prefix} -> [PASS] Auto-pass (0 exceptions) in {elapsed}s")
                    else:
                        failed_count += 1
                        ex_codes = ",".join(e["code"] for e in exceptions_list) or "None"
                        logger.warning(f"{prefix} -> [FAIL] Status: {status} | Codes: [{ex_codes}] | Halted by: {table9.decision.halted_by or '-'} in {elapsed}s")

                        fail_record = {
                            "doc_id": doc_id,
                            "title": title,
                            "original_file_name": original_filename,
                            "created_date": doc_meta.get("created"),
                            "elapsed_seconds": elapsed,
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                            "decision": table9.decision.model_dump(),
                            "invoice_summary": table9.invoice_summary.model_dump(),
                            "exceptions": exceptions_list,
                            "failed_rules": failed_rules,
                            "all_rules": [r.model_dump() for r in table9.rules],
                            "oracle_data": table9.oracle_data
                        }
                        failed_cases.append(fail_record)

                except Exception as ex:
                    elapsed = round(time.time() - t0, 2)
                    error_count += 1
                    failed_count += 1
                    logger.error(f"{prefix} -> [EXCEPTION] Failed with error: {ex} in {elapsed}s")
                    fail_record = {
                        "doc_id": doc_id,
                        "title": title,
                        "original_file_name": original_filename,
                        "created_date": doc_meta.get("created"),
                        "elapsed_seconds": elapsed,
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "decision": {"status": "Error", "assigned_to": "accounting", "halted_by": None},
                        "error": str(ex),
                        "exceptions": [{"code": "SYS_ERROR", "severity": "High", "rule_id": "SYSTEM", "message": str(ex)}],
                        "failed_rules": []
                    }
                    failed_cases.append(fail_record)

        # Execute all tasks
        tasks = [process_single(doc, i + 1) for i, doc in enumerate(documents)]
        await asyncio.gather(*tasks)

        total_elapsed = round(time.time() - start_time, 2)

        # 3. Save Failed Cases JSON
        self.output_json.parent.mkdir(parents=True, exist_ok=True)
        out_data = {
            "metadata": {
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "total_documents_processed": len(documents),
                "passed_auto_pass": passed_count,
                "failed_count": failed_count,
                "error_count": error_count,
                "pass_rate_pct": round((passed_count / len(documents) * 100), 1) if documents else 0,
                "fail_rate_pct": round((failed_count / len(documents) * 100), 1) if documents else 0,
                "total_elapsed_seconds": total_elapsed
            },
            "failed_cases": failed_cases
        }

        with open(self.output_json, "w", encoding="utf-8") as f:
            json.dump(out_data, f, ensure_ascii=False, indent=2)

        # 4. Generate Markdown Summary Report
        self._generate_markdown_report(out_data)

        # 5. Print Summary Table
        print("\n" + "=" * 75)
        print("  BATCH VERIFICATION SUMMARY")
        print("=" * 75)
        print(f"  Total Processed     : {len(documents)}")
        print(f"  Auto-pass (Passed)  : {passed_count} ({out_data['metadata']['pass_rate_pct']}%)")
        print(f"  Failed (Non-Pass)   : {failed_count} ({out_data['metadata']['fail_rate_pct']}%)")
        print(f"    - System Errors   : {error_count}")
        print(f"  Total Time Elapsed  : {total_elapsed}s")
        print(f"  Saved Failed Cases  : {self.output_json.resolve()}")
        print(f"  Saved Summary Report: {self.output_report.resolve()}")
        print("=" * 75 + "\n")

    def _generate_markdown_report(self, data: Dict[str, Any]):
        """Generate human-readable executive Markdown report."""
        meta = data["metadata"]
        cases = data["failed_cases"]

        # Aggregate exception statistics
        code_counts: Dict[str, int] = {}
        status_counts: Dict[str, int] = {}
        rule_counts: Dict[str, int] = {}

        for c in cases:
            st = c.get("decision", {}).get("status", "Unknown")
            status_counts[st] = status_counts.get(st, 0) + 1

            for ex in c.get("exceptions", []):
                cd = ex.get("code", "UNKNOWN")
                code_counts[cd] = code_counts.get(cd, 0) + 1

            for r in c.get("failed_rules", []):
                rid = r.get("rule_id", "UNKNOWN")
                rule_counts[rid] = rule_counts.get(rid, 0) + 1

        md_lines = [
            "# รายงานผลการทดสอบการตรวจสอบเอกสาร (Failed Cases Verification Report)",
            "",
            f"> **วันที่ประมวลผล:** `{meta['generated_at']}`  ",
            f"> **จำนวนเอกสารที่ทดสอบทั้งหมด:** `{meta['total_documents_processed']}` ฉบับ  ",
            f"> **ผ่านเกณฑ์ (Auto-pass):** `{meta['passed_auto_pass']}` ฉบับ ({meta['pass_rate_pct']}%)  ",
            f"> **ไม่ผ่านเกณฑ์ (Failed / Hold / Review / Error):** `{meta['failed_count']}` ฉบับ ({meta['fail_rate_pct']}%)  ",
            f"> **เวลาที่ใช้ทั้งหมด:** `{meta['total_elapsed_seconds']}` วินาที",
            "",
            "---",
            "",
            "## 1. สรุปภาพรวมสถานะการตัดสิน (Decision Status Breakdown)",
            "",
            "| สถานะการตัดสิน (Decision) | จำนวนเอกสาร (ฉบับ) | สัดส่วน (%) | คำอธิบาย |",
            "|---|:---:|:---:|---|",
            f"| **Auto-pass** | {meta['passed_auto_pass']} | {meta['pass_rate_pct']}% | เอกสารผ่านเกณฑ์สมบูรณ์ทั้ง 9 กฎ |",
        ]

        for st, cnt in sorted(status_counts.items(), key=lambda x: -x[1]):
            pct = round(cnt / meta["total_documents_processed"] * 100, 1) if meta["total_documents_processed"] else 0
            desc = "พบข้อผิดพลาดร้ายแรง (High Severity) ต้องระงับจ่าย" if st == "Hold" else (
                "พบข้อสงสัยปานกลาง ต้องตรวจสอบเพิ่มเติม" if st == "Review" else (
                    "ต้องให้เจ้าหน้าที่ตรวจทานด้วยมือ" if st == "Manual Review" else "เกิดข้อผิดพลาดในการประมวลผลระบบ"
                )
            )
            md_lines.append(f"| **{st}** | {cnt} | {pct}% | {desc} |")

        md_lines.extend([
            "",
            "---",
            "",
            "## 2. ความถี่ของรหัสข้อผิดพลาดที่พบ (Exception Code Frequency)",
            "",
            "| รหัส Exception | กฎที่เกี่ยวข้อง | จำนวนที่พบ (ครั้ง) | ระดับความรุนแรง | ความหมาย / รายละเอียดข้อผิดพลาด |",
            "|:---:|:---:|:---:|:---:|---|"
        ])

        exception_desc = {
            "E28": ("V-02", "High", "ผลคูณจำนวนและราคาต่อหน่วยในบรรทัดไม่ตรงกับยอดเงิน (Line Math Error)"),
            "E09": ("V-05", "High", "Tax ID ลูกค้า หรือที่อยู่สาขาไม่ตรงกับทะเบียนในระบบ Oracle EBS"),
            "E17": ("V-04", "High", "ไม่พบใบรับสินค้า หรือจำนวนรับเป็น 0 ในระบบ ERP"),
            "E35": ("V-04", "High", "พบใบรับสินค้ามากกว่า 1 ใบในรายการบิลเดียวกัน"),
            "E05": ("V-07", "High", "ราคาต่อหน่วยในบิลไม่ตรงกับราคาในใบรับ/PO เกินกรอบยอมรับ"),
            "E06": ("V-08", "High", "จำนวนที่วางบิลเกินกว่ายอดรับสินค้าจริงในระบบ ERP"),
            "E26": ("V-06", "High/Med", "ไม่พบลายเซ็นผู้รับสินค้า หรือผู้ส่งสินค้าบนบิล"),
            "E31": ("V-03/V-09", "High", "ยอดรวมเอกสารคำนวณไม่ถูกต้อง หรือไม่ตรงกับยอดรวมใบรับ"),
            "E34": ("V-08", "Medium", "วางบิลบางส่วน (Partial Billing) ยอดน้อยกว่ายอดรับจริง"),
            "E12": ("V-07", "Medium", "หน่วยนับ (UOM) ในบิลไม่ตรงกับระบบ ERP"),
            "E13": ("V-01", "Medium", "ฟิลด์บังคับในเอกสารสกัดได้ไม่ครบถ้วน (Completeness Error)"),
            "E16": ("V-03", "Low", "มีผลต่างเศษสตางค์จากการคำนวณ (อยู่ในเกณฑ์ยอมรับ)"),
            "E29": ("V-07", "Low", "ราคาต่างกันเล็กน้อยในกรอบยอมรับ (Tolerance)"),
            "SYS_ERROR": ("SYSTEM", "High", "เกิดข้อผิดพลาดในการเชื่อมต่อหรือแปลงไฟล์ PDF")
        }

        for cd, cnt in sorted(code_counts.items(), key=lambda x: -x[1]):
            info = exception_desc.get(cd, ("-", "Unknown", "-"))
            md_lines.append(f"| **`{cd}`** | {info[0]} | {cnt} | `{info[1]}` | {info[2]} |")

        md_lines.extend([
            "",
            "---",
            "",
            "## 3. รายการเอกสารที่ไม่ผ่านเกณฑ์โดยละเอียด (Failed Invoices Ledger)",
            "",
            "| Doc ID | ชื่อเอกสาร / เลขที่บิล | ผู้ขาย (Supplier) | ผู้ซื้อ (Customer) | สถานะ | รหัส Exception | กฎที่ไม่ผ่าน |",
            "|:---:|---|---|---|:---:|:---:|:---:|"
        ])

        for c in cases:
            doc_id = c.get("doc_id", "-")
            inv_sum = c.get("invoice_summary", {})
            inv_num = inv_sum.get("invoice_num") or c.get("title", "-")
            supp = inv_sum.get("supplier_name", "-")
            cust = inv_sum.get("customer_name", "-")
            st = c.get("decision", {}).get("status", "Error")
            codes = ", ".join(f"`{e['code']}`" for e in c.get("exceptions", [])) or "-"
            rules_failed = ", ".join(f"`{r['rule_id']}`" for r in c.get("failed_rules", [])) or "-"

            # truncate long names
            supp_short = (supp[:25] + "...") if len(supp) > 25 else supp
            cust_short = (cust[:25] + "...") if len(cust) > 25 else cust

            md_lines.append(f"| **{doc_id}** | `{inv_num}` | {supp_short} | {cust_short} | **{st}** | {codes} | {rules_failed} |")

        md_lines.extend([
            "",
            "---",
            "",
            "> 📌 ข้อมูลเชิงลึกฉบับเต็มของแต่ละเคส (รวมถึง Line Math, OCR Raw Text, และ Oracle Receipts) บันทึกไว้ในไฟล์ JSON:",
            f"> `{self.output_json.resolve()}`"
        ])

        self.output_report.parent.mkdir(parents=True, exist_ok=True)
        with open(self.output_report, "w", encoding="utf-8") as f:
            f.write("\n".join(md_lines))


def main():
    parser = argparse.ArgumentParser(description="Batch OCR & PO-INV Verification for Paperless Invoices")
    parser.add_argument("--limit", "-n", type=int, default=None, help="Limit number of documents to process (e.g. 5 or 10)")
    parser.add_argument("--doc-id", "-d", type=int, default=None, help="Process a specific single document ID")
    parser.add_argument("--tag-id", "-t", type=int, default=None, help="Paperless tag ID for invoices (default: 5)")
    parser.add_argument("--concurrency", "-c", type=int, default=2, help="Number of concurrent documents to process (default: 2)")
    parser.add_argument("--skip-checked", action="store_true", help="Skip documents already marked with Tag ID 12 (check n8n)")
    parser.add_argument("--tag-paperless", action="store_true", help="Append Tag ID 12 in Paperless after verification")
    parser.add_argument("--post-portal", action="store_true", help="Post verification result to AIVA portal")
    parser.add_argument("--output", "-o", type=Path, default=_ROOT / "tests" / "reports" / "batch_failed_verifications.json", help="Output JSON path for failed cases")
    parser.add_argument("--report", "-r", type=Path, default=_ROOT / "tests" / "reports" / "batch_verifications_report.md", help="Output Markdown report path")

    args = parser.parse_args()

    runner = BatchVerificationRunner(
        tag_id=args.tag_id,
        skip_checked=args.skip_checked,
        tag_paperless=args.tag_paperless,
        post_to_portal=args.post_portal,
        concurrency=args.concurrency,
        output_json=args.output,
        output_report=args.report,
    )

    asyncio.run(runner.run(limit=args.limit, single_doc_id=args.doc_id))


if __name__ == "__main__":
    main()
