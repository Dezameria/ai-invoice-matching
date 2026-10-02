import type { Snapshot } from '../../api/types'
export const sample: Snapshot = {
  schema_version: '1.0', event_id: 'demo-invoice-001-r1', source_system: 'Demo ERP', external_id: 'DEMO-001', revision: 1, standard_version: '6.6', status: 'Review',
  invoice: { invoice_num: 'DEMO-2026-001', supplier_name: 'Example Parts Co., Ltd. (ข้อมูลตัวอย่าง)', company: 'DEMO', invoice_date: '2026-10-01', po_number: 'PO-DEMO-001', release_num: null, currency: 'THB', sub_total: '12500.00', vat: '875.00', grand_total: '13375.00' },
  receipt: {receipt_num: 'RCV-DEMO-001', org_id: 'DEMO', receiver: 'ผู้รับตัวอย่าง', receipt_total: '12500.00'},
  lines: [{description: 'Mounting bracket / ขายึดตัวอย่าง', quantity: '100', uom: 'PCS', unit_price: '125.00', amount: '12500.00', receipt_line: '1', receipt_qty: '100', receipt_price: '125.00', match_level: 'M1'}],
  rules: Array.from({length: 9}, (_, i) => ({rule_id: `V-0${i + 1}`, result: i === 5 ? 'fail' : 'pass', exception_code: i === 5 ? 'E08' : null, severity: i === 5 ? 'Medium' : null, evidence: i === 5 ? 'ข้อมูลสังเคราะห์: ระบบต้นทางแจ้งว่าไม่พบลายเซ็นผู้รับสินค้า' : 'ผลตัวอย่างจากระบบต้นทาง', page: i === 5 ? 1 : null})),
  note: 'ข้อมูลตัวอย่างสำหรับทดลอง UI เท่านั้น ไม่ใช่เอกสารจริง และไม่ได้ประมวลผล OCR ในพอร์ทัลนี้',
}
