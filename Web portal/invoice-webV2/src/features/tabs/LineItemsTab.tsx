import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import type { LineItemMatch, InvoiceSummary } from '../../types/invoice';

interface LineItemsTabProps {
  lineItems: LineItemMatch[];
  summary: InvoiceSummary;
}

export const LineItemsTab: React.FC<LineItemsTabProps> = ({
  lineItems,
  summary
}) => {
  const totalVariance = lineItems.reduce((acc, item) => acc + item.varianceAmount, 0);
  const hasFallback = lineItems.some(i => i.matchLevel === 'first_row_fallback');

  const getMatchBadge = (status: LineItemMatch['matchStatus']) => {
    switch (status) {
      case 'EXACT_MATCH':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--status-autopass)', backgroundColor: 'var(--status-autopass-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            <CheckCircle2 size={12} /> ตรงกัน 100%
          </span>
        );
      case 'PRICE_MISMATCH':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--status-review)', backgroundColor: 'var(--status-review-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            <AlertTriangle size={12} /> ราคาต่างกัน (E05)
          </span>
        );
      case 'QTY_MISMATCH':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--status-manual)', backgroundColor: 'var(--status-manual-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            <AlertTriangle size={12} /> จำนวนไม่ตรง (E06)
          </span>
        );
      case 'MISSING_GRN':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--status-hold)', backgroundColor: 'var(--status-hold-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            <XCircle size={12} /> ขาดใบรับ (E17)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Fallback Warning Notice if applicable */}
      {hasFallback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            backgroundColor: '#FFFBEB',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #FCD34D',
            fontSize: '12px',
            color: '#B45309'
          }}
        >
          <AlertCircle size={16} />
          <span>
            <strong>ข้อควรระวัง (Ambiguity Policy):</strong> มีรายการสินค้าที่จับคู่ด้วย Fallback แถวแรกของใบรับ อาจมีความเสี่ยงจับคู่ซ้ำหรือผิดรายการ กรุณาตรวจสอบรหัสสินค้าและจำนวนรับให้ชัดเจน
          </span>
        </div>
      )}

      {/* 3-Way Match Summary Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ padding: '14px 16px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ยอดรวมใบแจ้งหนี้ (Invoice Subtotal)</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy-900)', marginTop: '4px', display: 'block' }}>
            {summary.subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {summary.currency}
          </span>
        </div>

        <div style={{ padding: '14px 16px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
            {summary.vat.toLocaleString('en-US', { minimumFractionDigits: 2 })} {summary.currency}
          </span>
        </div>

        <div style={{ padding: '14px 16px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', border: `1.5px solid ${totalVariance > 0 ? 'var(--status-review-border)' : 'var(--status-autopass-border)'}` }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ส่วนต่างสะสม 3-Way (Variance Total)</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: totalVariance > 0 ? 'var(--status-review)' : 'var(--status-autopass)', marginTop: '4px', display: 'block' }}>
            {totalVariance.toLocaleString('en-US', { minimumFractionDigits: 2 })} {summary.currency}
          </span>
        </div>
      </div>

      {/* Line Items Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflowX: 'auto', boxShadow: 'var(--shadow-xs)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '10px 12px', fontWeight: 600, width: '40px' }}>#</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>รายละเอียดสินค้า (Description)</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>ระดับการจับคู่ (Match Level)</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>ใบแจ้งหนี้ (Qty x ราคา)</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>ใบสั่งซื้อ PO (Qty x ราคา)</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>ใบรับ GRN (Qty x ราคา)</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>ส่วนต่าง (Variance)</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>สถานะการจับคู่</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  ไม่มีข้อมูลรายการสินค้าย่อยในเอกสารฉบับนี้ หรือเครื่องยนต์ถูกระงับการทำงานก่อนถึงขั้นตอน 3-Way Match
                </td>
              </tr>
            ) : (
              lineItems.map(item => (
                <tr
                  key={item.lineNum}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: item.varianceAmount > 0 ? '#FFFBEB' : 'transparent'
                  }}
                >
                  <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{item.lineNum}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.itemDescription}</div>
                    {item.itemCode && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        Code: {item.itemCode}
                      </span>
                    )}
                    {item.notes && (
                      <div style={{ fontSize: '11px', color: item.varianceAmount > 0 ? '#B45309' : '#059669', marginTop: '2px' }}>
                        {item.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge matchLevel={item.matchLevel} size="sm" />
                    {item.candidateCount !== undefined && item.candidateCount > 1 && (
                      <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        (พบ {item.candidateCount} ผู้สมัคร)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div>{item.invoiceQty} {item.uom} x {item.invoiceUnitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      = {item.invoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div>{item.poQty} {item.uom} x {item.poUnitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontWeight: 700, color: 'var(--navy-800)' }}>
                      = {item.poAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    {item.poLine && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        Line: {item.poLine}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>{item.receiptQty ?? 0} {item.uom} x {(item.receiptUnitPrice ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {item.receiptNum ? `${item.receiptNum}${item.receiptLine ? ` (L${item.receiptLine})` : ''}` : 'ยังไม่รับ'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: item.varianceAmount > 0 ? 'var(--status-review)' : 'var(--status-autopass)' }}>
                    {item.varianceAmount > 0 ? `+${item.varianceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '0.00'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {getMatchBadge(item.matchStatus)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
