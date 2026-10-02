"""Compatibility imports; new code should use app.domain.documents.schemas."""
from .domain.documents.schemas import Amount, Invoice, Line, Model, Receipt, Rule, Snapshot, Status, Text

__all__ = ['Amount', 'Invoice', 'Line', 'Model', 'Receipt', 'Rule', 'Snapshot', 'Status', 'Text']
