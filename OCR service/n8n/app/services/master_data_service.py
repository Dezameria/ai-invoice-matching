"""Master Data Service with Oracle EBS Dynamic Cross-Check (First Priority).

Provides real-time and cached lookup of Corporate Entities, Tax IDs, and Locations
directly from Oracle EBS via Oracle MCP, with fallback to local master_data.py.
"""

import asyncio
import logging
import time
from typing import Optional, Dict, Any, List

from app.config import get_settings
from app.core.master_data import (
    CorporateEntity,
    MASTER_ENTITIES,
    MASTER_ENTITIES_BY_ORG_ID,
)
from app.services.oracle_mcp import OracleMCPClient

logger = logging.getLogger(__name__)


# 13-digit Thai Tax ID mapping for Oracle EBS Operating Units / Legal Entities
ORACLE_OU_TAX_MAP: Dict[int, Dict[str, str]] = {
    101: {"tax_id": "0107545000213", "name_th": "อาปิโก ไฮเทค", "name_en": "AAPICO HITECH PUBLIC CO., LTD."},
    176: {"tax_id": "0145548001549", "name_th": "อาปิโก ไฮเทค พาร์ท", "name_en": "AAPICO HITECH PARTS CO., LTD."},
    195: {"tax_id": "0145548001557", "name_th": "อาปิโก ไฮเทค ทูลลิ่ง", "name_en": "AAPICO HITECH TOOLING CO., LTD."},
    197: {"tax_id": "0107547000354", "name_th": "อาปิโก ฟอร์จจิ้ง", "name_en": "AAPICO FORGING PUBLIC CO., LTD."},
    202: {"tax_id": "0135547003157", "name_th": "อาปิโก ไอทีเอส", "name_en": "AAPICO ITS CO., LTD."},
    223: {"tax_id": "", "name_th": "เอ แมคชั่น", "name_en": "A MACTION CO., LTD."},
    243: {"tax_id": "0145549002085", "name_th": "อาปิโก มิตซุยเกะ", "name_en": "AAPICO MITSUIKE (THAILAND) CO., LTD."},
    263: {"tax_id": "0105553018446", "name_th": "เอ อีอาร์พี", "name_en": "A ERP CO., LTD."},
    285: {"tax_id": "0107537000131", "name_th": "อาปิโก พลาสติก", "name_en": "AAPICO PLASTICS PUBLIC CO., LTD."},
    289: {"tax_id": "0205551028176", "name_th": "อาปิโก สตรัคเจอรัล โปรดักส์", "name_en": "AAPICO STRUCTURAL PRODUCTS CO., LTD."},
    309: {"tax_id": "0105535001499", "name_th": "อาปิโก อมตะ", "name_en": "AAPICO AMATA CO., LTD."},
    329: {"tax_id": "0145556001111", "name_th": "อาปิโก ลีดเทค", "name_en": "AAPICO LEADTECH CO., LTD."},
    349: {"tax_id": "0145556001391", "name_th": "เอ็ดชา อาปิโก ออโตโมทีฟ", "name_en": "EDSCHA AAPICO AUTOMOTIVE CO., LTD."},
    353: {"tax_id": "0205557018563", "name_th": "อาปิโก พรีซิชั่น", "name_en": "AAPICO PRECISION CO., LTD."},
    373: {"tax_id": "0135546008643", "name_th": "เอเบิล มอเตอร์ส", "name_en": "ABLE MOTORS CO., LTD."},
    413: {"tax_id": "0145563000434", "name_th": "อาปิโก ไฮเทค ออโตเมชั่น", "name_en": "AAPICO HITECH AUTOMATION CO., LTD."},
    453: {"tax_id": "0125562036711", "name_th": "เอเบิล มอเตอร์ส ปากเกร็ด", "name_en": "ABLE MOTORS PAKKRED CO., LTD."},
    473: {"tax_id": "0135562027568", "name_th": "เอเบิล มอเตอร์ส ปทุมธานี", "name_en": "ABLE MOTORS PHATHUMTHANI CO., LTD."},
    475: {"tax_id": "0145553001829", "name_th": "อาปิโก ไบค์", "name_en": "AAPICO BIKE CO., LTD."},
    535: {"tax_id": "0135566030351", "name_th": "เอเบิล อีวี", "name_en": "ABLE EV CO., LTD."},
    555: {"tax_id": "0135564010484", "name_th": "เอ็มจี เอเบิล มอเตอร์ส", "name_en": "MG ABLE MOTORS CO., LTD."},
    596: {"tax_id": "200301017448(619868-V)", "name_th": "อาปิโก เอวีอี", "name_en": "AAPICO AVEE SDN. BHD."},
}


class MasterDataService:
    """Manages Entity resolution with First Priority Oracle EBS queries & caching."""

    def __init__(self, oracle_client: Optional[OracleMCPClient] = None):
        self.oracle_client = oracle_client or OracleMCPClient()
        self._cache: Dict[int, CorporateEntity] = {}
        self._cache_timestamp: float = 0
        self._ttl_seconds: float = 3600  # 1 hour cache TTL

    async def get_entity_by_org_id(
        self,
        org_id: int,
        force_refresh: bool = False
    ) -> Optional[CorporateEntity]:
        """Fetch Corporate Entity by ORG_ID (Inventory Org or OU) with First Priority to Oracle EBS.
        
        1. Checks in-memory cache if not expired.
        2. Queries Oracle EBS directly via Oracle MCP.
        3. Falls back to static MASTER_ENTITIES if Oracle query fails or returns empty.
        """
        now = time.time()
        # 1. Check Cache
        if not force_refresh and (now - self._cache_timestamp < self._ttl_seconds):
            if org_id in self._cache:
                return self._cache[org_id]

        # 2. Query Oracle EBS Directly (First Priority)
        try:
            entity = await self._fetch_from_oracle(org_id)
            if entity:
                self._cache[org_id] = entity
                # Also cache under OU ID if different
                return entity
        except Exception as e:
            logger.warning(f"Direct Oracle query for ORG_ID {org_id} failed: {e}. Falling back to static Master.")

        # 3. Fallback to Local Master Data
        return MASTER_ENTITIES_BY_ORG_ID.get(org_id)

    async def _fetch_from_oracle(self, org_id: int) -> Optional[CorporateEntity]:
        """Query Oracle EBS org_organization_definitions & hr_operating_units."""
        sql = f"""
        SELECT 
            ood.organization_id as inv_org_id,
            ood.organization_code as inv_code,
            ood.organization_name as inv_name,
            ood.operating_unit as ou_org_id,
            hou.name as ou_name,
            hla.postal_code,
            hla.address_line_1,
            hla.address_line_2,
            hla.address_line_3,
            hla.location_code
        FROM apps.org_organization_definitions ood
        JOIN apps.hr_operating_units hou ON ood.operating_unit = hou.organization_id
        LEFT JOIN apps.hr_all_organization_units haou ON ood.organization_id = haou.organization_id
        LEFT JOIN apps.hr_locations_all hla ON haou.location_id = hla.location_id
        WHERE ood.organization_id = {org_id} OR ood.operating_unit = {org_id}
        """
        raw_text = await self.oracle_client._call_tool("sql_run", {"database": "default", "sql": sql})
        lines = [l.strip() for l in raw_text.strip().split("\n") if l.strip()]
        if len(lines) <= 1:
            return None

        # Parse CSV output
        import csv
        reader = csv.DictReader(lines)
        rows = list(reader)
        if not rows:
            return None

        row = rows[0]
        inv_org_id = int(row.get("INV_ORG_ID") or org_id)
        ou_org_id = int(row.get("OU_ORG_ID") or org_id)
        postal = (row.get("POSTAL_CODE") or "").strip()
        addr1 = (row.get("ADDRESS_LINE_1") or "").strip()
        addr2 = (row.get("ADDRESS_LINE_2") or "").strip()

        # Look up legal tax id and names
        ou_info = ORACLE_OU_TAX_MAP.get(ou_org_id, {})
        tax_id = ou_info.get("tax_id", "")
        name_th = ou_info.get("name_th") or row.get("OU_NAME") or "อาปิโก"

        # Build branch matching list (postal code, specific branch keywords)
        branches = [postal] if postal else []
        if "13160" in postal or "Hi-tech" in addr1 or "Hitech" in addr2:
            if "13160" not in branches:
                branches.append("13160")
        if "20000" in postal or "Amata" in addr1:
            if "20000" not in branches:
                branches.append("20000")
        if "12120" in postal:
            branches.extend(["12120", "00001", "00003"])

        entity = CorporateEntity(
            org_id=inv_org_id,
            name_th=name_th,
            tax_id=tax_id,
            status="ACTIVE",
            postal=postal or "13160",
            branches=branches,
            address_line=f"{addr1} {addr2}".strip(),
            ou_id=ou_org_id,
        )
        return entity

    async def sync_all_from_oracle(self) -> Dict[int, CorporateEntity]:
        """Pre-load all active entities from Oracle EBS."""
        sql = """
        SELECT 
            ood.organization_id as inv_org_id,
            ood.organization_code as inv_code,
            ood.organization_name as inv_name,
            ood.operating_unit as ou_org_id,
            hou.name as ou_name,
            hla.postal_code,
            hla.address_line_1,
            hla.address_line_2,
            hla.address_line_3,
            hla.location_code
        FROM apps.org_organization_definitions ood
        JOIN apps.hr_operating_units hou ON ood.operating_unit = hou.organization_id
        LEFT JOIN apps.hr_all_organization_units haou ON ood.organization_id = haou.organization_id
        LEFT JOIN apps.hr_locations_all hla ON haou.location_id = hla.location_id
        ORDER BY ood.organization_id
        """
        try:
            raw_text = await self.oracle_client._call_tool("sql_run", {"database": "default", "sql": sql})
            lines = [l.strip() for l in raw_text.strip().split("\n") if l.strip()]
            if len(lines) <= 1:
                return {}

            import csv
            reader = csv.DictReader(lines)
            new_cache: Dict[int, CorporateEntity] = {}
            for row in reader:
                inv_id = int(row["INV_ORG_ID"])
                ou_id = int(row["OU_ORG_ID"])
                postal = (row.get("POSTAL_CODE") or "").strip()
                addr1 = (row.get("ADDRESS_LINE_1") or "").strip()
                addr2 = (row.get("ADDRESS_LINE_2") or "").strip()

                ou_info = ORACLE_OU_TAX_MAP.get(ou_id, {})
                tax_id = ou_info.get("tax_id", "")
                name_th = ou_info.get("name_th") or row.get("OU_NAME") or "อาปิโก"

                branches = [postal] if postal else []
                if "13160" in postal:
                    branches.append("13160")
                if "20000" in postal:
                    branches.append("20000")
                if "12120" in postal:
                    branches.extend(["12120", "00001", "00003"])

                ent = CorporateEntity(
                    org_id=inv_id,
                    name_th=name_th,
                    tax_id=tax_id,
                    status="ACTIVE",
                    postal=postal or "13160",
                    branches=list(set(branches)),
                    address_line=f"{addr1} {addr2}".strip(),
                    ou_id=ou_id,
                )
                new_cache[inv_id] = ent
                # Also index under OU ID if not existing
                if ou_id not in new_cache:
                    new_cache[ou_id] = ent

            self._cache.update(new_cache)
            self._cache_timestamp = time.time()
            logger.info(f"Successfully synced {len(new_cache)} entities from Oracle EBS.")
            return self._cache
        except Exception as e:
            logger.error(f"Failed to sync entities from Oracle EBS: {e}")
            return {}
