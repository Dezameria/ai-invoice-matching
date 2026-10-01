"""Master Data Table: 27 Corporate Entities & Standard Constants.

Standard: AH-IT-DOC-PO-INV-Matching-Standard-v6.2-DRAFT-260930-WT
"""

from typing import Dict, List, Optional
from pydantic import BaseModel


class CorporateEntity(BaseModel):
    org_id: int
    name_th: str
    tax_id: str
    status: str
    postal: str
    branches: List[str]
    address_line: Optional[str] = ""
    ou_id: Optional[int] = None


# 27 Active/Known Entities verified against Oracle EBS 100%
MASTER_ENTITIES: List[CorporateEntity] = [
    CorporateEntity(org_id=101, ou_id=101, name_th="อาปิโก ไฮเทค", tax_id="0107545000213", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Hitech Industrial Estate Banlane"),
    CorporateEntity(org_id=102, ou_id=101, name_th="อาปิโก ไฮเทค", tax_id="0107545000213", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Hitech Industrial Estate Banlane"),
    CorporateEntity(org_id=103, ou_id=101, name_th="อาปิโก ไฮเทค (โรงงานอยุธยา)", tax_id="0107545000213", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Hitech Industrial Estate Banlane"),
    CorporateEntity(org_id=104, ou_id=101, name_th="อาปิโก ไฮเทค", tax_id="0107545000213", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Hitech Industrial Estate Banlane"),
    CorporateEntity(org_id=195, ou_id=195, name_th="อาปิโก ไฮเทค ทูลลิ่ง", tax_id="0145548001557", status="ACTIVE", postal="13160", branches=["13160"], address_line="99/1 Moo 1 Hitech Industrial Estate Banlane"),
    CorporateEntity(org_id=352, ou_id=195, name_th="อาปิโก ไฮเทค ทูลลิ่ง", tax_id="0145548001557", status="ACTIVE", postal="13160", branches=["13160"], address_line="99/1 Moo 1 Hitech Industrial Estate Banlane"),
    CorporateEntity(org_id=176, ou_id=176, name_th="อาปิโก ไฮเทค พาร์ท", tax_id="0145548001549", status="ACTIVE", postal="13160", branches=["13160"], address_line="99/2 Moo 1 Hi-tech Industrial Estate Banlane"),
    CorporateEntity(org_id=175, ou_id=176, name_th="อาปิโก ไฮเทค พาร์ท", tax_id="0145548001549", status="ACTIVE", postal="13160", branches=["13160"], address_line="99/2 Moo 1 Hi-tech Industrial Estate Banlane"),
    CorporateEntity(org_id=197, ou_id=197, name_th="อาปิโก ฟอร์จจิ้ง", tax_id="0107547000354", status="ACTIVE", postal="20000", branches=["20000"], address_line="700/20 Moo 6 Amata Nakron Industrial Estate"),
    CorporateEntity(org_id=199, ou_id=197, name_th="อาปิโก ฟอร์จจิ้ง อมตะ", tax_id="0107547000354", status="ACTIVE", postal="20000", branches=["20000"], address_line="700/20 Moo 6 Amata Nakron Industrial Estate"),
    CorporateEntity(org_id=200, ou_id=197, name_th="อาปิโก ฟอร์จจิ้ง แหลมฉบัง", tax_id="0107547000354", status="ACTIVE", postal="20000", branches=["20000"], address_line="700/20 Moo 6 Amata Nakron Industrial Estate"),
    CorporateEntity(org_id=202, ou_id=202, name_th="อาปิโก ไอทีเอส", tax_id="0135547003157", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Hi-tech Industrial Estate"),
    CorporateEntity(org_id=203, ou_id=202, name_th="อาปิโก ไอทีเอส", tax_id="0135547003157", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Hi-tech Industrial Estate"),
    CorporateEntity(org_id=223, ou_id=223, name_th="เอ แมคชั่น", tax_id="", status="UNKNOWN", postal="13160", branches=["13160"], address_line="99 Moo 1 Hi-tech Industrial Estate"),
    CorporateEntity(org_id=224, ou_id=223, name_th="เอ แมคชั่น", tax_id="", status="UNKNOWN", postal="13160", branches=["13160"], address_line="99 Moo 1 Hi-tech Industrial Estate"),
    CorporateEntity(org_id=243, ou_id=243, name_th="อาปิโก มิตซุยเกะ", tax_id="0145549002085", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Hitech Industrial Estate"),
    CorporateEntity(org_id=244, ou_id=243, name_th="อาปิโก มิตซุยเกะ", tax_id="0145549002085", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Hitech Industrial Estate"),
    CorporateEntity(org_id=263, ou_id=263, name_th="เอ อีอาร์พี", tax_id="0105553018446", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Hitech Industrial Estate"),
    CorporateEntity(org_id=264, ou_id=263, name_th="เอ อีอาร์พี", tax_id="0105553018446", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Hitech Industrial Estate"),
    CorporateEntity(org_id=285, ou_id=285, name_th="อาปิโก พลาสติก", tax_id="0107537000131", status="ACTIVE", postal="10570", branches=["10570"], address_line="358-358/1 Moo 17 Bangplee Industrial Estate"),
    CorporateEntity(org_id=287, ou_id=285, name_th="อาปิโก พลาสติก บางพลี", tax_id="0107537000131", status="ACTIVE", postal="10570", branches=["10570"], address_line="358-358/1 Moo 17 Bangplee Industrial Estate"),
    CorporateEntity(org_id=289, ou_id=289, name_th="อาปิโก สตรัคเจอรัล โปรดักส์", tax_id="0205551028176", status="ACTIVE", postal="20000", branches=["20000"], address_line="700/16 Amata Nakorn Industrial Estate"),
    CorporateEntity(org_id=291, ou_id=289, name_th="อาปิโก สตรัคเจอรัล โปรดักส์", tax_id="0205551028176", status="ACTIVE", postal="20000", branches=["20000"], address_line="700/16 Amata Nakorn Industrial Estate"),
    CorporateEntity(org_id=309, ou_id=309, name_th="อาปิโก อมตะ", tax_id="0105535001499", status="ACTIVE", postal="20160", branches=["20160"], address_line="700/483 AMATA NAKORN INDUSTRIAL ESTATE"),
    CorporateEntity(org_id=310, ou_id=309, name_th="อาปิโก อมตะ Plant", tax_id="0105535001499", status="ACTIVE", postal="20160", branches=["20160"], address_line="700/483 AMATA NAKORN INDUSTRIAL ESTATE"),
    CorporateEntity(org_id=329, ou_id=329, name_th="อาปิโก ลีดเทค", tax_id="0145556001111", status="ACTIVE", postal="13210", branches=["13210"], address_line="56 Moo 9 T.Thanu A.U-Thai"),
    CorporateEntity(org_id=330, ou_id=329, name_th="อาปิโก ลีดเทค", tax_id="0145556001111", status="ACTIVE", postal="13210", branches=["13210"], address_line="56 Moo 9 T.Thanu A.U-Thai"),
    CorporateEntity(org_id=349, ou_id=349, name_th="เอ็ดชา อาปิโก ออโตโมทีฟ", tax_id="0145556001391", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Banlane"),
    CorporateEntity(org_id=350, ou_id=349, name_th="เอ็ดชา อาปิโก ออโตโมทีฟ", tax_id="0145556001391", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Banlane"),
    CorporateEntity(org_id=353, ou_id=353, name_th="อาปิโก พรีซิชั่น", tax_id="0205557018563", status="ACTIVE", postal="20000", branches=["20000"], address_line="700/16 Moo 6 Amata Nakron Industrial Estate"),
    CorporateEntity(org_id=354, ou_id=353, name_th="อาปิโก พรีซิชั่น", tax_id="0205557018563", status="ACTIVE", postal="20000", branches=["20000"], address_line="700/16 Moo 6 Amata Nakron Industrial Estate"),
    CorporateEntity(org_id=373, ou_id=373, name_th="เอเบิล มอเตอร์ส", tax_id="0135546008643", status="ACTIVE", postal="12120", branches=["12120", "00001", "00003"], address_line="14/9 MOO 14 PHAHOLYOTHIN ROAD"),
    CorporateEntity(org_id=376, ou_id=373, name_th="เอเบิล มอเตอร์ส", tax_id="0135546008643", status="ACTIVE", postal="12120", branches=["12120", "00001", "00003"], address_line="14/9 MOO 14 PHAHOLYOTHIN ROAD"),
    CorporateEntity(org_id=413, ou_id=413, name_th="อาปิโก ไฮเทค ออโตเมชั่น", tax_id="0145563000434", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Ban lane"),
    CorporateEntity(org_id=433, ou_id=413, name_th="อาปิโก ไฮเทค ออโตเมชั่น", tax_id="0145563000434", status="ACTIVE", postal="13160", branches=["13160"], address_line="99 Moo 1 Ban lane"),
    CorporateEntity(org_id=453, ou_id=453, name_th="เอเบิล มอเตอร์ส ปากเกร็ด", tax_id="0125562036711", status="ACTIVE", postal="11120", branches=["11120"], address_line="38/83 Moo 5 Tiwanon Road"),
    CorporateEntity(org_id=454, ou_id=453, name_th="เอเบิล มอเตอร์ส ปากเกร็ด", tax_id="0125562036711", status="ACTIVE", postal="11120", branches=["11120"], address_line="38/83 Moo 5 Tiwanon Road"),
    CorporateEntity(org_id=473, ou_id=473, name_th="เอเบิล มอเตอร์ส ปทุมธานี", tax_id="0135562027568", status="ACTIVE", postal="12000", branches=["12000"], address_line="88 Moo 5 Sai Bang Bua Thong"),
    CorporateEntity(org_id=474, ou_id=473, name_th="เอเบิล มอเตอร์ส ปทุมธานี", tax_id="0135562027568", status="ACTIVE", postal="12000", branches=["12000"], address_line="88 Moo 5 Sai Bang Bua Thong"),
    CorporateEntity(org_id=475, ou_id=475, name_th="อาปิโก ไบค์", tax_id="0145553001829", status="ACTIVE", postal="13160", branches=["13160", "10570"], address_line="99 Moo 1 Hi-tech Industrial Estate"),
    CorporateEntity(org_id=495, ou_id=475, name_th="อาปิโก ไบค์", tax_id="0145553001829", status="ACTIVE", postal="13160", branches=["13160", "10570"], address_line="99 Moo 1 Hi-tech Industrial Estate"),
    CorporateEntity(org_id=535, ou_id=535, name_th="เอเบิล อีวี", tax_id="0135566030351", status="ACTIVE", postal="12120", branches=["12120"], address_line="14/9 Moo 14 Phaholyothin Road"),
    CorporateEntity(org_id=536, ou_id=535, name_th="เอเบิล อีวี", tax_id="0135566030351", status="ACTIVE", postal="12120", branches=["12120"], address_line="14/9 Moo 14 Phaholyothin Road"),
    CorporateEntity(org_id=555, ou_id=555, name_th="เอ็มจี เอเบิล มอเตอร์ส", tax_id="0135564010484", status="ACTIVE", postal="12000", branches=["12000", "00001", "10240", "10270"], address_line="88 Moo 5 Bang Bua Thong"),
    CorporateEntity(org_id=556, ou_id=555, name_th="เอ็มจี เอเบิล มอเตอร์ส", tax_id="0135564010484", status="ACTIVE", postal="12000", branches=["12000", "00001", "10240", "10270"], address_line="88 Moo 5 Bang Bua Thong"),
    CorporateEntity(org_id=596, ou_id=596, name_th="อาปิโก เอวีอี", tax_id="200301017448(619868-V)", status="ACTIVE", postal="35900", branches=["35900"], address_line="Lot No 17 Jalan Jelawai 1 Proton City"),
    CorporateEntity(org_id=615, ou_id=596, name_th="อาปิโก เอวีอี", tax_id="200301017448(619868-V)", status="ACTIVE", postal="35900", branches=["35900"], address_line="Lot No 17 Jalan Jelawai 1 Proton City"),
    CorporateEntity(org_id=178, ou_id=177, name_th="ยกเลิกใช้งาน", tax_id="", status="REVOKED", postal="", branches=[]),
]

# Lookup dictionary by ORG_ID (both Inventory Org and Operating Unit IDs)
MASTER_ENTITIES_BY_ORG_ID: Dict[int, CorporateEntity] = {
    e.org_id: e for e in MASTER_ENTITIES
}

# Standard Rule Identifiers (All 9 Rules)
STANDARD_RULES = [
    "V-01",  # Pure Document Completeness
    "V-02",  # Line Math Check
    "V-03",  # Document Math Check
    "V-04",  # Oracle Receipt Active Check
    "V-05",  # Customer Entity & Tax ID Match
    "V-06",  # Signatures Verification
    "V-07",  # Line Matching Ladder (M1-M5)
    "V-08",  # Quantities Check
    "V-09",  # Total Amount Check
]

# Standard Exception Codes (Table 9)
VALID_EXCEPTION_CODES = {
    "E05": {"severity": "High", "desc": "ราคาต่อหน่วยต่างเกินเกณฑ์ยอมรับ"},
    "E06": {"severity": "High", "desc": "จำนวนวางบิลเกินยอดรับจริง"},
    "E09": {"severity": "High", "desc": "เลขประจำตัวผู้เสียภาษีลูกค้าหรือที่อยู่ไม่ตรงกับ Master"},
    "E12": {"severity": "Medium", "desc": "หน่วยนับ (UOM) ไม่ตรง"},
    "E13": {"severity": "Medium", "desc": "ข้อมูลเอกสารไม่ครบถ้วน"},
    "E16": {"severity": "Low", "desc": "มีผลต่างเศษสตางค์จากการคำนวณ (ยอมรับได้)"},
    "E17": {"severity": "High", "desc": "ไม่พบใบรับสินค้าหรือจำนวนรับเป็น 0"},
    "E25": {"severity": "Medium", "desc": "วันที่ในเอกสารไม่ถูกต้อง"},
    "E26": {"severity": "High", "desc": "ไม่พบลายเซ็นผู้รับหรือผู้ส่งของ"},
    "E28": {"severity": "High", "desc": "ผลคูณจำนวนและราคาต่อหน่วยในบรรทัดไม่ตรงกับยอดเงิน"},
    "E29": {"severity": "Low", "desc": "ราคาต่างกันในกรอบยอมรับ (<=1% และ <=200 บาท)"},
    "E30": {"severity": "High", "desc": "ไม่พบบรรทัดตรงในใบรับสินค้า"},
    "E31": {"severity": "High", "desc": "ยอดรวมในเอกสารคำนวณไม่ถูกต้อง"},
    "E34": {"severity": "Medium", "desc": "วางบิลบางส่วน (Partial Billing)"},
    "E35": {"severity": "High", "desc": "พบใบรับสินค้ามากกว่า 1 ใบในรายการบิลเดียวกัน"},
}

# Task Assignment Routing: Codes routing to 'user' instead of 'accounting'
USER_TASK_CODES = {"E06", "E12", "E13", "E17", "E26", "E34", "E35"}


def find_entity_by_org_id(org_id: Optional[int]) -> Optional[CorporateEntity]:
    """Find corporate entity by EBS ORG_ID."""
    if org_id is None:
        return None
    return MASTER_ENTITIES_BY_ORG_ID.get(org_id)
