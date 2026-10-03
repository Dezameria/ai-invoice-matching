"""Oracle EBS ORDS MCP Service Client (N7, N7.1).

Connects to Oracle EBS via JSON-RPC ORDS MCP server and queries view:
apps.AH_DEV_RCV_PO_AP_MATCHING_V
"""

import asyncio
import csv
import io
import json
import logging
from typing import List, Optional
import httpx

from app.config import get_settings
from app.core.models import OracleReceipt

logger = logging.getLogger(__name__)


class OracleMCPClient:
    """Client for Oracle EBS ORDS MCP Service."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        token: Optional[str] = None,
        timeout: Optional[float] = None
    ):
        settings = get_settings()
        self.base_url = base_url or settings.ORACLE_MCP_URL
        self.token = token or settings.ORACLE_MCP_TOKEN
        self.timeout = timeout or settings.ORACLE_MCP_TIMEOUT_SECONDS

    def _build_headers(self) -> dict:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def parse_csv_receipts(self, csv_text: str) -> List[OracleReceipt]:
        """Parse MCP CSV result into structured OracleReceipt objects (N7.1)."""
        receipts: List[OracleReceipt] = []
        if not csv_text or not csv_text.strip():
            return receipts

        clean_text = csv_text.strip()
        if "no rows selected" in clean_text.lower():
            return receipts

        reader = csv.DictReader(io.StringIO(clean_text))
        for idx, row in enumerate(reader, start=1):
            try:
                po_num = str(row.get("PO_NUM") or "").strip()
                rcv_num = str(row.get("RCV_NUM") or "").strip()
                if not po_num or "no rows" in po_num.lower() or not rcv_num:
                    continue

                org_id_val = row.get("INV_ORG_ID") or row.get("ORG_ID")
                org_id = int(org_id_val) if org_id_val and org_id_val.strip() else None

                ou_id_val = row.get("OU_ORG_ID")
                ou_id = int(ou_id_val) if ou_id_val and ou_id_val.strip() else None

                line_total_val = row.get("LINE_TOTAL")
                line_total = float(line_total_val) if line_total_val and line_total_val.strip() else None

                receipt = OracleReceipt(
                    PO_NUMBER=po_num,
                    RECEIPT_NUM=rcv_num,
                    LINE_NUM=idx,
                    ITEM_NUMBER=str(row.get("ITM_CODE") or "").strip(),
                    ITEM_DESCRIPTION=str(row.get("ITM_DESC") or "").strip(),
                    QUANTITY_RECEIVED=float(row.get("RCV_QTY") or 0.0),
                    UNIT_MEAS_LOOKUP_CODE=str(row.get("UOM") or "").strip(),
                    UNIT_PRICE=float(row.get("PO_UPRICE") or 0.0),
                    ORG_ID=org_id,
                    LINE_TOTAL=line_total,
                    RCV_INV_NUM=str(row.get("RCV_INV_NUM") or "").strip() or None,
                    AP_INV_NUM=str(row.get("AP_INV_NUM") or "").strip() or None,
                    OU_ORG_ID=ou_id,
                    OU_NAME=str(row.get("OU_NAME") or "").strip() or None,
                    CUSTOMER_POSTAL=str(row.get("CUSTOMER_POSTAL") or "").strip() or None,
                    CUSTOMER_LOC_CODE=str(row.get("CUSTOMER_LOC_CODE") or "").strip() or None,
                    CUSTOMER_TAX_ID=str(row.get("CUSTOMER_TAX_ID") or "").strip() or None,
                    SUPPLIER_NAME=str(row.get("SUPPLIER_NAME") or "").strip() or None,
                    SUPPLIER_TAX_ID=str(row.get("SUPPLIER_TAX_ID") or "").strip() or None,
                )
                receipts.append(receipt)
            except Exception as e:
                logger.warning(f"Error parsing Oracle CSV row {row}: {e}")
                continue

        return receipts

    async def execute_sql(self, sql_query: str) -> str:
        """Execute SQL via ORDS MCP server tools/call (public interface)."""
        return await self._execute_sql(sql_query)

    async def _execute_sql(self, sql_query: str) -> str:
        """Execute SQL via ORDS MCP server tools/call."""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "sql_run",
                "arguments": {
                    "database": "default",
                    "sql": sql_query
                }
            }
        }

        csv_text = ""
        timeout_cfg = httpx.Timeout(self.timeout, read=self.timeout, connect=15.0)
        max_retries = 2

        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout_cfg) as client:
                    response = await client.post(
                        self.base_url,
                        json=payload,
                        headers=self._build_headers()
                    )
                    response.raise_for_status()

                    raw_body = response.text.strip()
                    try:
                        data = json.loads(raw_body)
                        if "result" in data:
                            content_list = data["result"].get("content") or []
                            if content_list and isinstance(content_list, list):
                                csv_text = content_list[0].get("text", "")
                    except json.JSONDecodeError:
                        for line in raw_body.splitlines():
                            line = line.strip()
                            if not line:
                                continue
                            data_str = line[5:].strip() if line.startswith("data:") else line
                            try:
                                data = json.loads(data_str)
                                if "result" in data:
                                    content_list = data["result"].get("content") or []
                                    if content_list and isinstance(content_list, list):
                                        csv_text = content_list[0].get("text", "")
                                        break
                            except json.JSONDecodeError:
                                continue

                break  # Success
            except (httpx.ReadTimeout, httpx.ConnectTimeout) as e:
                if attempt < max_retries:
                    logger.warning(f"Oracle MCP timeout on attempt {attempt}/{max_retries}, retrying...")
                    await asyncio.sleep(1.0)
                else:
                    raise

        return csv_text

    def _build_sql_query(
        self,
        invoice_num: Optional[str] = None,
        supplier_tax_id: Optional[str] = None,
        po_number: Optional[str] = None
    ) -> str:
        """Build Unified All-in-One SQL Query with indexed search conditions."""
        clean_inv = (invoice_num or "").strip()
        clean_tax = (supplier_tax_id or "").strip()
        clean_po = (po_number or "").strip()

        where_clause = ""
        if clean_inv:
            inv_variants = [clean_inv]
            if "/" in clean_inv:
                inv_variants.append(clean_inv.replace("/", ""))
            elif clean_inv.startswith("SQ26") and len(clean_inv) > 4:
                inv_variants.append("SQ26/" + clean_inv[4:])

            in_list = ", ".join(f"'{v}'" for v in inv_variants)
            inv_cond = f"(v.RCV_INV_NUM IN ({in_list}) OR v.AP_INV_NUM IN ({in_list}))"

            if clean_tax:
                where_clause = f"{inv_cond} AND (COALESCE(pv.vat_registration_num, pv.num_1099) = '{clean_tax}')"
            else:
                where_clause = inv_cond
        elif clean_po:
            where_clause = f"v.PO_NUM = '{clean_po}'"
        else:
            where_clause = "1=0"

        return (
            "SELECT DISTINCT "
            "v.PO_NUM, v.RCV_NUM, v.RCV_INV_NUM, v.AP_INV_NUM, "
            "v.ITM_CODE, v.ITM_DESC, v.UOM, v.RCV_QTY, v.PO_UPRICE, "
            "(v.RCV_QTY * v.PO_UPRICE) as LINE_TOTAL, "
            "v.ORG_ID as INV_ORG_ID, "
            "ood.operating_unit as OU_ORG_ID, "
            "hou.name as OU_NAME, "
            "fsp.vat_registration_num as CUSTOMER_TAX_ID, "
            "hla.postal_code as CUSTOMER_POSTAL, "
            "hla.location_code as CUSTOMER_LOC_CODE, "
            "pv.vendor_name as SUPPLIER_NAME, "
            "COALESCE(pv.vat_registration_num, pv.num_1099) AS SUPPLIER_TAX_ID "
            "FROM apps.AH_DEV_RCV_PO_AP_MATCHING_V v "
            "JOIN apps.po_vendors pv ON v.vendor_id = pv.vendor_id "
            "LEFT JOIN apps.org_organization_definitions ood ON v.org_id = ood.organization_id "
            "LEFT JOIN apps.hr_operating_units hou ON ood.operating_unit = hou.organization_id "
            "LEFT JOIN apps.financials_system_params_all fsp ON ood.operating_unit = fsp.org_id "
            "LEFT JOIN apps.hr_all_organization_units haou ON v.org_id = haou.organization_id "
            "LEFT JOIN apps.hr_locations_all hla ON haou.location_id = hla.location_id "
            f"WHERE {where_clause} "
            "ORDER BY v.RCV_NUM, v.ITM_CODE"
        )


    async def get_receipts(
        self,
        invoice_num: Optional[str] = None,
        supplier_tax_id: Optional[str] = None,
        po_number: Optional[str] = None
    ) -> List[OracleReceipt]:
        """Query Oracle receipts using Unified Query (Tax ID + Invoice No, with PO fallback)."""
        receipts: List[OracleReceipt] = []

        # 1. Primary Search: Supplier Tax ID + Invoice Number (Handles Multi-PO)
        if invoice_num:
            sql_inv = self._build_sql_query(invoice_num=invoice_num, supplier_tax_id=supplier_tax_id)
            try:
                csv_text = await self._execute_sql(sql_inv)
                receipts = self.parse_csv_receipts(csv_text)
                if receipts:
                    logger.info(f"Found {len(receipts)} receipt items by Invoice {invoice_num}")
                    return receipts
            except Exception as e:
                logger.warning(f"Error querying Oracle by Invoice {invoice_num}: {e}")

        # 2. Fallback Search: PO Number
        if po_number:
            sql_po = self._build_sql_query(po_number=po_number)
            try:
                csv_text = await self._execute_sql(sql_po)
                receipts = self.parse_csv_receipts(csv_text)
                if receipts:
                    logger.info(f"Found {len(receipts)} receipt items by PO {po_number} (fallback)")
                    return receipts
            except Exception as e:
                logger.error(f"Error querying Oracle by PO {po_number}: {e}")

        return receipts

    async def get_po_receipts(self, po_number: str) -> List[OracleReceipt]:
        """Backward-compatible method querying by PO number."""
        return await self.get_receipts(po_number=po_number)

    def get_po_receipts_sync(self, po_number: str) -> List[OracleReceipt]:
        """Synchronous query for Oracle ERP receipts."""
        import asyncio
        return asyncio.run(self.get_po_receipts(po_number))

    async def get_all_master_entities(self) -> List[dict]:
        """Query all active corporate entities and locations dynamically from Oracle EBS."""
        sql = (
            "SELECT DISTINCT "
            "ood.organization_id as inv_org_id, "
            "ood.organization_code as inv_code, "
            "ood.organization_name as inv_name, "
            "ood.operating_unit as ou_org_id, "
            "hou.name as ou_name, "
            "fsp.vat_registration_num as tax_id, "
            "hla.postal_code, "
            "hla.location_code, "
            "hla.address_line_1, "
            "hla.address_line_2 "
            "FROM apps.org_organization_definitions ood "
            "JOIN apps.hr_operating_units hou ON ood.operating_unit = hou.organization_id "
            "LEFT JOIN apps.financials_system_params_all fsp ON ood.operating_unit = fsp.org_id "
            "LEFT JOIN apps.hr_all_organization_units haou ON ood.organization_id = haou.organization_id "
            "LEFT JOIN apps.hr_locations_all hla ON haou.location_id = hla.location_id "
            "WHERE ood.operating_unit IS NOT NULL "
            "ORDER BY ood.organization_id"
        )
        csv_text = await self._execute_sql(sql)
        clean_text = csv_text.strip() if csv_text else ""
        if not clean_text or "no rows selected" in clean_text.lower():
            return []

        rows: List[dict] = []
        reader = csv.DictReader(io.StringIO(clean_text))
        for r in reader:
            inv_id_str = str(r.get("INV_ORG_ID") or "").strip()
            if not inv_id_str or not inv_id_str.isdigit():
                continue
            rows.append(r)
        return rows


