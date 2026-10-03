"""Master Data Service with 100% Dynamic Oracle EBS Integration.

Provides real-time and cached lookup of Corporate Entities, Tax IDs, and Locations
queried dynamically from Oracle EBS via Oracle MCP.
"""

import asyncio
import csv
import io
import logging
import time
from typing import Optional, Dict, Any, List, Set
from pydantic import BaseModel

from app.services.oracle_mcp import OracleMCPClient

logger = logging.getLogger(__name__)


class CorporateEntity(BaseModel):
    org_id: int
    name_th: str
    tax_id: str
    status: str = "ACTIVE"
    postal: str = ""
    branches: List[str] = []
    address_line: Optional[str] = ""
    ou_id: Optional[int] = None
    location_code: Optional[str] = None


class MasterDataService:
    """Manages Entity resolution dynamically from Oracle EBS with in-memory caching."""

    def __init__(self, oracle_client: Optional[OracleMCPClient] = None):
        self.oracle_client = oracle_client or OracleMCPClient()
        self._cache: Dict[int, CorporateEntity] = {}
        self._internal_tax_ids: Set[str] = set()
        self._cache_timestamp: float = 0
        self._ttl_seconds: float = 3600  # 1 hour cache TTL

    async def sync_all_from_oracle(self, force_refresh: bool = False) -> Dict[int, CorporateEntity]:
        """Fetch all active corporate entities dynamically from Oracle EBS."""
        now = time.time()
        if not force_refresh and self._cache and (now - self._cache_timestamp < self._ttl_seconds):
            return self._cache

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

        try:
            csv_text = await self.oracle_client.execute_sql(sql)
            clean_text = csv_text.strip() if csv_text else ""
            if not clean_text or "no rows selected" in clean_text.lower():
                raise RuntimeError("Oracle EBS returned no corporate entity rows.")

            reader = csv.DictReader(io.StringIO(clean_text))
            new_cache: Dict[int, CorporateEntity] = {}
            new_tax_ids: Set[str] = set()

            for row in reader:
                inv_id_val = str(row.get("INV_ORG_ID") or "").strip()
                if not inv_id_val or not inv_id_val.isdigit():
                    continue
                inv_id = int(inv_id_val)
                ou_id_val = str(row.get("OU_ORG_ID") or "").strip()
                ou_id = int(ou_id_val) if ou_id_val.isdigit() else inv_id
                tax_id = (row.get("TAX_ID") or "").strip()
                postal = (row.get("POSTAL_CODE") or "").strip()
                loc_code = (row.get("LOCATION_CODE") or "").strip()
                addr1 = (row.get("ADDRESS_LINE_1") or "").strip()
                addr2 = (row.get("ADDRESS_LINE_2") or "").strip()
                ou_name = (row.get("OU_NAME") or "").strip()
                inv_name = (row.get("INV_NAME") or "").strip()

                if tax_id and len(tax_id) >= 10:
                    new_tax_ids.add(tax_id)

                branches = [postal] if postal else []
                if "13160" in postal:
                    branches.append("13160")
                if "20000" in postal:
                    branches.append("20000")
                if "12120" in postal:
                    branches.extend(["12120", "00001", "00003"])

                entity = CorporateEntity(
                    org_id=inv_id,
                    name_th=inv_name or ou_name or "AAPICO",
                    tax_id=tax_id,
                    status="ACTIVE",
                    postal=postal,
                    branches=list(set(branches)),
                    address_line=f"{addr1} {addr2}".strip(),
                    ou_id=ou_id,
                    location_code=loc_code,
                )
                new_cache[inv_id] = entity
                if ou_id not in new_cache:
                    new_cache[ou_id] = entity

            if not new_cache:
                raise RuntimeError("No valid corporate entities could be parsed from Oracle EBS.")

            self._cache = new_cache
            self._internal_tax_ids = new_tax_ids
            self._cache_timestamp = time.time()
            logger.info(f"Successfully loaded {len(self._cache)} entities and {len(self._internal_tax_ids)} tax IDs from Oracle EBS.")
            return self._cache
        except Exception as e:
            logger.error(f"Failed to fetch corporate entities from Oracle EBS: {e}")
            raise RuntimeError(f"Oracle EBS Master Data Query Failed: {e}") from e

    async def get_entity_by_org_id(self, org_id: int) -> Optional[CorporateEntity]:
        """Fetch Corporate Entity by ORG_ID directly from Oracle-backed cache."""
        entities = await self.sync_all_from_oracle()
        return entities.get(org_id)

    async def get_all_entities(self) -> List[CorporateEntity]:
        """Get all corporate entities as a list."""
        entities = await self.sync_all_from_oracle()
        # Return distinct entities by org_id
        seen = set()
        result = []
        for e in entities.values():
            if e.org_id not in seen:
                seen.add(e.org_id)
                result.append(e)
        return sorted(result, key=lambda x: x.org_id)

    async def get_internal_tax_ids(self) -> Set[str]:
        """Get the set of all internal AAPICO group 13-digit Tax IDs."""
        await self.sync_all_from_oracle()
        return self._internal_tax_ids

    async def is_intercompany(self, supplier_tax_id: Optional[str]) -> bool:
        """Check if supplier tax ID belongs to any company within AAPICO Group."""
        if not supplier_tax_id or not supplier_tax_id.strip():
            return False
        tax_ids = await self.get_internal_tax_ids()
        return supplier_tax_id.strip() in tax_ids


# Global singleton instance
_master_data_service_instance: Optional[MasterDataService] = None


def get_master_data_service() -> MasterDataService:
    global _master_data_service_instance
    if _master_data_service_instance is None:
        _master_data_service_instance = MasterDataService()
    return _master_data_service_instance
