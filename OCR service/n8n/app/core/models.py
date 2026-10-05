"""Pydantic Data Models for Extraction, Rules, and Table 9 Schema (Standard v6.2)."""

from datetime import datetime
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


# =============================================================================
# 1. Extraction Models (Standard v6.2 Table 3)
# =============================================================================

class InvoiceHeader(BaseModel):
    supplier_name: Optional[str] = Field(default="", description="ชื่อบริษัทผู้ขาย")
    supplier_tax_id: Optional[str] = Field(default=None, description="เลขประจำตัวผู้เสียภาษี 13 หลักของผู้ขาย")
    customer_name: Optional[str] = Field(default="", description="ชื่อลูกค้านิติบุคคล")
    customer_address: Optional[str] = Field(default="", description="ที่อยู่ลูกค้า")
    customer_tax_id: Optional[str] = Field(default=None, description="เลขประจำตัวผู้เสียภาษี 13 หลักของลูกค้า")
    invoice_num: Optional[str] = Field(default="", description="เลขที่ใบกำกับภาษี/ใบส่งสินค้า")
    invoice_date: Optional[str] = Field(default=None, description="วันที่ในเอกสาร DD/MM/YYYY")
    po_number: Optional[str] = Field(default=None, description="เลขที่ใบสั่งซื้อ 8 หลัก")
    currency: str = Field(default="THB", description="สกุลเงิน")
    sub_total: float = Field(default=0.0, description="ยอดรวมก่อนภาษี")
    vat: float = Field(default=0.0, description="ภาษีมูลค่าเพิ่ม 7%")
    grand_total: float = Field(default=0.0, description="ยอดรวมทั้งสิ้น")


class InvoiceLine(BaseModel):
    line_no: int = Field(default=1, description="ลำดับรายการ")
    description: str = Field(default="", description="รายละเอียดสินค้าหรือบริการ")
    qty: float = Field(default=0.0, description="จำนวน")
    uom: str = Field(default="PCS", description="หน่วยนับ")
    unit_price: float = Field(default=0.0, description="ราคาต่อหน่วย")
    amount: float = Field(default=0.0, description="จำนวนเงินรวมในบรรทัด")

    @property
    def quantity(self) -> float:
        """Alias for qty."""
        return self.qty


class SignatureInfo(BaseModel):
    present: bool = Field(default=False, description="พบลายเซ็นหรือไม่")
    page: Optional[int] = Field(default=None, description="หมายเลขหน้าที่พบลายเซ็น")


class Signatures(BaseModel):
    supplier_or_deliverer: SignatureInfo = Field(default_factory=SignatureInfo, description="ลายเซ็นผู้ส่งของ")
    receiver: SignatureInfo = Field(default_factory=SignatureInfo, description="ลายเซ็นผู้รับของ")


class ExtractedDocument(BaseModel):
    doc_id: Optional[int] = Field(default=1001, description="รหัสเอกสาร")
    validation_round: int = Field(default=1, description="รอบการตรวจ")
    invoice: InvoiceHeader = Field(default_factory=InvoiceHeader)
    lines: List[InvoiceLine] = Field(default_factory=list)
    signatures: Signatures = Field(default_factory=Signatures)
    pages_complete: bool = Field(default=True, description="เอกสารหน้าครบถ้วน")
    po_type: str = Field(default="Purchase Order", description="ประเภท PO")


# =============================================================================
# 2. Oracle ERP Receipt Models
# =============================================================================

class OracleReceipt(BaseModel):
    PO_NUMBER: str
    RECEIPT_NUM: str
    LINE_NUM: int
    ITEM_NUMBER: str = ""
    ITEM_DESCRIPTION: str = ""
    QUANTITY_RECEIVED: float = 0.0
    UNIT_MEAS_LOOKUP_CODE: str = ""
    UNIT_PRICE: float = 0.0
    ORG_ID: Optional[int] = None
    LINE_TOTAL: Optional[float] = None
    RCV_INV_NUM: Optional[str] = None
    AP_INV_NUM: Optional[str] = None
    OU_ORG_ID: Optional[int] = None
    OU_NAME: Optional[str] = None
    CUSTOMER_POSTAL: Optional[str] = None
    CUSTOMER_LOC_CODE: Optional[str] = None
    CUSTOMER_TAX_ID: Optional[str] = None
    SUPPLIER_NAME: Optional[str] = None
    SUPPLIER_TAX_ID: Optional[str] = None



# =============================================================================
# 3. Rules & Exceptions Models
# =============================================================================

class RuleResult(BaseModel):
    rule_id: str = Field(..., description="รหัสกฎ เช่น V-01 ถึง V-09")
    result: Literal["PASS", "FAIL", "MANUAL", "not_evaluated"] = Field(..., description="ผลการตรวจ")
    code: Optional[str] = Field(default=None, description="รหัส Exception หากไม่ผ่าน")
    severity: Optional[Literal["Low", "Medium", "High"]] = Field(default=None, description="ระดับความรุนแรง")
    details: Optional[str] = Field(default=None, description="รายละเอียดประกอบ")


class ExceptionItem(BaseModel):
    code: str = Field(..., description="รหัส Exception เช่น E09, E28")
    severity: Literal["Low", "Medium", "High"] = Field(..., description="ระดับความรุนแรง")
    rule_id: str = Field(..., description="กฎที่ตรวจพบ")
    message: str = Field(..., description="คำอธิบายข้อผิดพลาด")


# =============================================================================
# 4. Table 9 Standard Output Models (Standard v6.2)
# =============================================================================

class DecisionInfo(BaseModel):
    status: Literal["Auto-pass", "Review", "Hold", "Manual Review"]
    assigned_to: Optional[Literal["user", "accounting"]] = None
    halted_by: Optional[str] = None
    manual_review: bool = False


class InvoiceSummary(BaseModel):
    invoice_num: str
    po_number: Optional[str] = None
    supplier_name: str
    supplier_tax_id: Optional[str] = None
    customer_name: str
    customer_tax_id: Optional[str] = None
    address_matched: Optional[str] = None
    intercompany: bool = False
    sub_total: float
    vat: float
    grand_total: float
    po_type: str = "Purchase Order"


class Table9Output(BaseModel):
    standard_version: str = "6.2"
    doc_id: Optional[int] = None
    validation_round: int = 1
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    decision: DecisionInfo
    invoice_summary: InvoiceSummary
    rules: List[RuleResult]
    exceptions: List[ExceptionItem]
    oracle_data: Optional[Dict[str, Any]] = Field(default=None, description="ข้อมูล Receipts ที่ได้จากการเปรียบเทียบกับ Oracle EBS")


# =============================================================================
# 5. Service & API Response Wrappers
# =============================================================================

class VerificationResponse(BaseModel):
    success: bool
    status: str
    message: str
    data: Optional[Table9Output] = None
    paperless_update: Optional[Dict[str, Any]] = None
    execution_time_seconds: float = 0.0
