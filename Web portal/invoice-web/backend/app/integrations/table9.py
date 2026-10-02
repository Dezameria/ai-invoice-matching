"""Explicit adapter for core Table9 v6.2. Never use the synthetic /fe receipt projection."""
from ..domain.documents.schemas import Snapshot


def from_table9(raw: dict, *, source_system: str, external_id: str, event_id: str, company: str) -> Snapshot:
    table = raw.get('data', raw)
    if not isinstance(table, dict) or 'invoice_summary' not in table:
        raise ValueError('Expected core Table9 or VerificationResponse.data; SSE /fe projections are not supported.')
    inv = table['invoice_summary']
    # Use the source version; do not relabel the old exception codes as v6.6.
    if not table.get('standard_version'):
        raise ValueError('Table9 must include standard_version.')
    results = {'PASS': 'pass', 'FAIL': 'fail', 'MANUAL': 'manual_review', 'not_evaluated': 'not_evaluated'}
    rules = []
    for r in table.get('rules', []):
        result = results[r['result']]
        related = [e for e in table.get('exceptions', []) if e['rule_id'] == r['rule_id']]
        if related:
            for e in related:
                rules.append({'rule_id': r['rule_id'], 'result': result, 'exception_code': e['code'], 'severity': e.get('severity'), 'evidence': e.get('message') or r.get('details')})
        else:
            rules.append({'rule_id': r['rule_id'], 'result': result, 'exception_code': r.get('code'), 'severity': r.get('severity'), 'evidence': r.get('details')})
    return Snapshot.model_validate({
        'schema_version': '1.0', 'event_id': event_id, 'source_system': source_system, 'external_id': external_id,
        'revision': table.get('validation_round', 1), 'standard_version': table['standard_version'],
        'status': table['decision']['status'],
        'invoice': {'invoice_num': inv['invoice_num'], 'supplier_name': inv['supplier_name'], 'company': company,
                    'po_number': inv.get('po_number'), 'supplier_tax_id': inv.get('supplier_tax_id'), 'customer_tax_id': inv.get('customer_tax_id'),
                    'currency': 'THB', 'sub_total': inv.get('sub_total'), 'vat': inv.get('vat'), 'grand_total': inv.get('grand_total')},
        'rules': rules, 'lines': [], 'receipt': None,
        'note': 'Imported from core Table9. Company and THB currency are adapter assumptions supplied by the integrating team. Receipt, line matches and evidence pages were not provided.'
    })
