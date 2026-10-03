"""Generate synthetic integration fixtures. Does not send data to any system."""
import json
from pathlib import Path
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

HERE = Path(__file__).resolve().parent
snapshot = {
    'schema_version': '1.0', 'event_id': 'example-invoice-001-r1', 'source_system': 'Example ERP',
    'external_id': 'DEMO-001', 'revision': 1, 'standard_version': '6.6', 'status': 'Review',
    'invoice': {'invoice_num': 'DEMO-2026-001', 'supplier_name': 'Example Parts Co., Ltd.', 'company': 'DEMO',
                'invoice_date': '2026-10-01', 'po_number': 'PO-DEMO-001', 'currency': 'THB',
                'sub_total': '12500.00', 'vat': '875.00', 'grand_total': '13375.00'},
    'receipt': {'receipt_num': 'RCV-DEMO-001', 'org_id': 'DEMO', 'receiver': 'Example Receiver', 'receipt_total': '12500.00'},
    'lines': [{'description': 'Mounting bracket (synthetic)', 'quantity': '100', 'uom': 'PCS', 'unit_price': '125.00',
               'amount': '12500.00', 'receipt_line': '1', 'receipt_qty': '100', 'receipt_price': '125.00', 'match_level': 'M1'}],
    'rules': [{'rule_id': f'V-0{i}', 'result': 'fail' if i == 6 else 'pass', 'exception_code': 'E08' if i == 6 else None,
               'severity': 'Medium' if i == 6 else None, 'evidence': 'Synthetic missing signature' if i == 6 else 'Synthetic upstream result',
               'page': 2 if i == 6 else None} for i in range(1, 10)],
    'note': 'SYNTHETIC DEMO DATA - not a real invoice. Results are supplied by the example, not calculated by this portal.'
}
(HERE / 'invoice.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding='utf-8')
writer = PdfWriter()
font = DictionaryObject({NameObject('/Type'): NameObject('/Font'), NameObject('/Subtype'): NameObject('/Type1'), NameObject('/BaseFont'): NameObject('/Helvetica')})
font_ref = writer._add_object(font)
for number in (1, 2):
    page = writer.add_blank_page(width=595, height=842)
    page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/F1'): font_ref})})
    lines = [('AIVA / EXAMPLE DOCUMENT', 21), ('SYNTHETIC DATA - NOT A REAL INVOICE', 10), ('', 12),
             ('INVOICE  DEMO-2026-001', 17), ('Example Parts Co., Ltd.', 12), ('Date: 2026-10-01    |    Currency: THB', 11),
             ('PO: PO-DEMO-001    Receipt: RCV-DEMO-001', 11), ('', 12),
             ('Description                     Qty      Price       Amount', 11),
             ('Mounting bracket                100      125.00      12,500.00', 11), ('', 12),
             ('Subtotal                                      12,500.00', 12),
             ('VAT                                              875.00', 12),
             ('TOTAL                                         13,375.00', 16), ('', 12),
             ('Receiver signature: _____________________________', 11),
             (f'Example page {number} of 2. Used only for viewer and integration tests.', 10)]
    commands = ['0.08 0.18 0.28 rg']
    y = 776
    for text, size in lines:
        commands.append(f'BT /F1 {size} Tf 48 {y} Td ({text}) Tj ET')
        y -= 32
    stream = DecodedStreamObject(); stream.set_data('\n'.join(commands).encode('ascii'))
    page[NameObject('/Contents')] = writer._add_object(stream)
with (HERE / 'invoice.pdf').open('wb') as f:
    writer.write(f)
print('Created synthetic invoice.json and two-page invoice.pdf')
