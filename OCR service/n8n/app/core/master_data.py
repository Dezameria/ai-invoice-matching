"""Standard Constants and Exception Codes (Standard v6.2).

Note: Static MASTER_ENTITIES has been deprecated in favor of 100% dynamic
queries directly from Oracle EBS via MasterDataService (apps.financials_system_params_all).
"""

from typing import Dict, List, Optional
from app.services.master_data_service import CorporateEntity

# Deprecated static tables - kept as empty for backward compatibility
MASTER_ENTITIES: List[CorporateEntity] = []
MASTER_ENTITIES_BY_ORG_ID: Dict[int, CorporateEntity] = {}

# Standard Rule Identifiers (All 9 Rules)
STANDARD_RULES = [
    "V-01",  # Pure Document Completeness
    "V-02",  # Line Math Check
    "V-03",  # Document Math Check
    "V-04",  # Oracle Receipt Active Check
    "V-05",  # Customer Entity & Tax ID Match (Dynamic Oracle EBS)
    "V-06",  # Signatures Verification
    "V-07",  # Line Matching Ladder (M1-M5)
    "V-08",  # Quantities Check
    "V-09",  # Total Amount Check
]

# Standard Exception Codes (Table 9)
VALID_EXCEPTION_CODES = {
    "E05": {"severity": "High", "desc": "ราคาต่อหน่วยต่างเกินเกณฑ์ยอมรับ"},
    "E06": {"severity": "High", "desc": "จำนวนวางบิลเกินยอดรับจริง"},
    "E09": {"severity": "High", "desc": "เลขประจำตัวผู้เสียภาษีลูกค้าหรือที่อยู่ไม่ตรงกับระบบ Oracle"},
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
