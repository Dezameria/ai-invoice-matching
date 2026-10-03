import React from 'react';
import { Eye, ArrowUpDown, AlertOctagon } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import type { InvoiceDocument } from '../../types/invoice';

interface QueueSummaryTableProps {
  invoices: InvoiceDocument[];
  onOpenInvoice: (id: string) => void;
}

export const QueueSummaryTable: React.FC<QueueSummaryTableProps> = ({
  invoices,
  onOpenInvoice
}) => {
  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-subtle)',
        margin: '0 24px 24px 24px',
        overflowX: 'auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>ตารางสรุปคิวตรวจเอกสารทั้งหมด ({invoices.length})</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ภาพรวมเอกสารทุกสถานะพร้อมผลตรวจ Table 9 และสถานะขั้นตอนงาน</p>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>ผลตรวจ OCR</th>
            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>ขั้นตอนงาน</th>
            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                เลขที่ใบแจ้งหนี้ <ArrowUpDown size={13} />
              </div>
            </th>
            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>ผู้ขาย (Supplier)</th>
            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>บริษัทในเครือ</th>
            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>เลขที่ PO</th>
            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>ใบรับสินค้า (GRN)</th>
            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>ยอดสุทธิ</th>
            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>กำหนดชำระ</th>
            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                ไม่พบรายการเอกสารในมุมมองนี้
              </td>
            </tr>
          ) : (
            invoices.map(inv => (
              <tr
                key={inv.id}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'var(--transition-fast)'
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td style={{ padding: '12px 14px' }}>
                  <Badge verificationStatus={inv.verificationStatus} size="sm" />
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <Badge workflowStatus={inv.workflowStatus} size="sm" />
                </td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--navy-800)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {inv.summary.invoiceNum}
                    {inv.isDuplicate && (
                      <span title="เอกสารซ้ำ" style={{ color: 'var(--status-duplicate)' }}>
                        <AlertOctagon size={13} />
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>
                  {inv.summary.supplierName}
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {inv.summary.company}
                </td>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '12px' }}>
                  {inv.summary.poNumber}
                </td>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '12px', color: inv.summary.receiptNumber === '-' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {inv.summary.receiptNumber || '-'}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>
                  {inv.summary.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {inv.summary.currency}
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  {inv.summary.dueDate}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Eye size={14} />}
                    onClick={() => onOpenInvoice(inv.id)}
                  >
                    เปิดตรวจ
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
