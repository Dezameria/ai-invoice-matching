"""Inbound snapshots are supplied by upstream systems; this portal never matches invoices."""
from datetime import date
from decimal import Decimal
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field

Text = Annotated[str, Field(min_length=1, max_length=200, strip_whitespace=True)]
Amount = Annotated[Decimal, Field(allow_inf_nan=False, max_digits=20, decimal_places=6)]
Status = Literal['Auto-pass', 'Review', 'Hold', 'Manual Review', 'Duplicate', 'Confirmed', 'Posted', 'Rejected']


class Model(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Invoice(Model):
    invoice_num: Text
    supplier_name: Text
    company: Text
    invoice_date: date | None = None
    po_number: str | None = Field(default=None, max_length=200)
    release_num: str | None = Field(default=None, max_length=100)
    supplier_tax_id: str | None = Field(default=None, max_length=40)
    customer_tax_id: str | None = Field(default=None, max_length=40)
    currency: str = Field(default='THB', pattern=r'^[A-Z]{3}$')
    sub_total: Amount | None = None
    vat: Amount | None = None
    grand_total: Amount | None = None


class Receipt(Model):
    receipt_num: str | None = Field(default=None, max_length=200)
    org_id: str | None = Field(default=None, max_length=100)
    receiver: str | None = Field(default=None, max_length=200)
    receipt_total: Amount | None = None


class Line(Model):
    description: str = Field(max_length=2000)
    quantity: Amount | None = None
    uom: str | None = Field(default=None, max_length=100)
    unit_price: Amount | None = None
    amount: Amount | None = None
    receipt_line: str | None = Field(default=None, max_length=100)
    receipt_qty: Amount | None = None
    receipt_price: Amount | None = None
    match_level: str | None = Field(default=None, max_length=100)


class Rule(Model):
    rule_id: str = Field(pattern=r'^V-0[1-9]$')
    result: Literal['pass', 'fail', 'manual_review', 'not_evaluated']
    exception_code: str | None = Field(default=None, max_length=100)
    severity: Literal['Low', 'Medium', 'High'] | None = None
    evidence: str | None = Field(default=None, max_length=4000)
    page: int | None = Field(default=None, ge=1, le=500)


class Snapshot(Model):
    schema_version: Literal['1.0'] = '1.0'
    event_id: Text
    source_system: Text
    external_id: Text
    revision: int = Field(ge=1)
    standard_version: Text
    status: Status
    invoice: Invoice
    receipt: Receipt | None = None
    lines: list[Line] = Field(default_factory=list, max_length=2000)
    rules: list[Rule] = Field(default_factory=list, max_length=100)
    note: str | None = Field(default=None, max_length=4000)
