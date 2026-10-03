import React, { useState } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X, FileText, CheckCircle2, AlertOctagon } from 'lucide-react';
import type { InvoiceDocument } from '../../types/invoice';

interface DocumentViewerProps {
  document: InvoiceDocument;
  onClose: () => void;
  highlightPage?: number;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onClose,
  highlightPage
}) => {
  const [currentPage, setCurrentPage] = useState<number>(highlightPage || 1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const totalPages = document.summary.pdfPages || 1;
  const { summary } = document;

  return (
    <div
      style={{
        width: '460px',
        minWidth: '420px',
        maxWidth: '520px',
        backgroundColor: '#1E293B',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - var(--header-height) - 130px)',
        position: 'sticky',
        top: 'calc(var(--header-height) + 130px)',
        zIndex: 20
      }}
    >
      {/* Top Toolbar */}
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: '#0F172A',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#E2E8F0',
          fontSize: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={15} color="#38BDF8" />
          <span style={{ fontWeight: 600, color: '#F8FAFC' }}>
            {summary.invoiceNum}.pdf
          </span>
        </div>

        {/* Zoom & Page Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Page switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#1E293B', padding: '2px 6px', borderRadius: '4px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={{ color: currentPage <= 1 ? '#64748B' : '#E2E8F0', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{ color: currentPage >= totalPages ? '#64748B' : '#E2E8F0', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#1E293B', padding: '2px 4px', borderRadius: '4px' }}>
            <button onClick={() => setZoomLevel(z => Math.max(70, z - 10))} title="ย่อ" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <ZoomOut size={13} color="#E2E8F0" />
            </button>
            <span style={{ fontSize: '10px', width: '32px', textAlign: 'center', color: '#94A3B8' }}>
              {zoomLevel}%
            </span>
            <button onClick={() => setZoomLevel(z => Math.min(140, z + 10))} title="ขยาย" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <ZoomIn size={13} color="#E2E8F0" />
            </button>
          </div>

          <button onClick={onClose} title="ปิดหน้าต่าง PDF" style={{ color: '#94A3B8', marginLeft: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Document View Canvas */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          display: 'flex',
          justifyContent: 'center',
          backgroundColor: '#334155'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: `${420 * (zoomLevel / 100)}px`,
            backgroundColor: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            borderRadius: '4px',
            padding: '24px 20px',
            fontSize: `${11 * (zoomLevel / 100)}px`,
            color: '#1E293B',
            lineHeight: 1.4,
            transformOrigin: 'top center',
            transition: 'width 150ms ease-out',
            height: 'fit-content',
            position: 'relative'
          }}
        >
          {/* Invoice Paper Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0F172A', paddingBottom: '10px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: `${14 * (zoomLevel / 100)}px`, fontWeight: 800, color: '#0F172A' }}>
              {summary.supplierName}
            </h2>
            <p style={{ fontSize: `${9 * (zoomLevel / 100)}px`, color: '#64748B' }}>
              เลขประจำตัวผู้เสียภาษี: {summary.supplierTaxId || '0105542091823'} (สำนักงานใหญ่)
            </p>
            <div style={{ fontSize: `${12 * (zoomLevel / 100)}px`, fontWeight: 700, marginTop: '4px', letterSpacing: '1px', color: '#0369A1' }}>
              ใบกำกับภาษี / ใบแจ้งหนี้ (TAX INVOICE / INVOICE)
            </div>
          </div>

          {/* Customer & Invoice Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px', fontSize: `${9.5 * (zoomLevel / 100)}px` }}>
            <div>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>ลูกค้า (Customer):</span>
              <p style={{ fontWeight: 600 }}>{summary.company}</p>
              <p style={{ color: '#64748B' }}>เลขประจำตัวผู้เสียภาษี: {summary.customerTaxId || '0107539000241'}</p>
              {summary.customerAddress && (
                <p style={{ color: '#64748B', fontSize: `${8.5 * (zoomLevel / 100)}px` }}>{summary.customerAddress}</p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p><span style={{ fontWeight: 700 }}>เลขที่:</span> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0369A1' }}>{summary.invoiceNum}</span></p>
              <p><span style={{ fontWeight: 700 }}>วันที่:</span> {summary.invoiceDate}</p>
              <p><span style={{ fontWeight: 700 }}>PO No:</span> {summary.poNumber}</p>
              <p><span style={{ fontWeight: 700 }}>กำหนดชำระ:</span> {summary.dueDate}</p>
            </div>
          </div>

          {/* Itemized Table on Invoice Paper */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: `${9 * (zoomLevel / 100)}px` }}>
            <thead>
              <tr style={{ backgroundColor: '#F1F5F9', borderTop: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>
                <th style={{ padding: '4px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '4px', textAlign: 'left' }}>รายการ</th>
                <th style={{ padding: '4px', textAlign: 'right' }}>จน.</th>
                <th style={{ padding: '4px', textAlign: 'right' }}>ราคา/หน่วย</th>
                <th style={{ padding: '4px', textAlign: 'right' }}>จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {document.lineItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '12px 4px', textAlign: 'center', color: '#64748B' }}>
                    (รายการตรวจจับคู่อยู่ในหน้าอื่น หรือเอกสารถูกระงับที่ขั้นตอนก่อนหน้า)
                  </td>
                </tr>
              ) : (
                document.lineItems.map((item, idx) => {
                  const isHighlight = item.matchStatus !== 'EXACT_MATCH';
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px dashed #E2E8F0',
                        backgroundColor: isHighlight ? '#FEF08A' : 'transparent',
                        transition: 'background-color 200ms'
                      }}
                    >
                      <td style={{ padding: '5px 4px' }}>{item.lineNum}</td>
                      <td style={{ padding: '5px 4px' }}>{item.itemDescription}</td>
                      <td style={{ padding: '5px 4px', textAlign: 'right' }}>{item.invoiceQty}</td>
                      <td style={{ padding: '5px 4px', textAlign: 'right', fontWeight: isHighlight ? 700 : 400 }}>
                        {item.invoiceUnitPrice.toFixed(2)}
                      </td>
                      <td style={{ padding: '5px 4px', textAlign: 'right', fontWeight: 600 }}>
                        {item.invoiceAmount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Highlight Callout Box if exception on this page */}
          {document.exceptions.length > 0 && (
            <div
              style={{
                margin: '10px 0',
                padding: '6px 8px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px dashed #EF4444',
                borderRadius: '4px',
                fontSize: `${8.5 * (zoomLevel / 100)}px`,
                color: '#B91C1C'
              }}
            >
              <strong>🚨 จุดตรวจพบข้อยกเว้น ({document.exceptions[0].code} {document.exceptions[0].ruleId}):</strong> {document.exceptions[0].message}
            </div>
          )}

          {/* Totals */}
          <div style={{ marginLeft: 'auto', width: '60%', borderTop: '1px solid #0F172A', paddingTop: '6px', fontSize: `${9.5 * (zoomLevel / 100)}px` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>มูลค่ารวม (Subtotal):</span>
              <span>{summary.subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
              <span>{summary.vat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid #CBD5E1', fontWeight: 700, color: '#0F172A', fontSize: `${11 * (zoomLevel / 100)}px` }}>
              <span>ยอดรวมทั้งสิ้น (Grand Total):</span>
              <span>{summary.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {summary.currency}</span>
            </div>
          </div>

          {/* Signatures Overlay Verification Box */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px', paddingTop: '10px', borderTop: '1px dashed #CBD5E1', textAlign: 'center', fontSize: `${8.5 * (zoomLevel / 100)}px`, color: '#64748B' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ height: '24px' }}>
                {summary.signatures.supplierOrDeliverer.present && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#16A34A', fontSize: `${8 * (zoomLevel / 100)}px`, fontWeight: 700, backgroundColor: '#DCFCE7', padding: '1px 4px', borderRadius: '2px' }}>
                    <CheckCircle2 size={10} /> OCR SIGN DETECTED
                  </span>
                )}
              </div>
              <p>................................................</p>
              <p>ผู้ส่งสินค้า (Delivered By)</p>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ height: '24px' }}>
                {summary.signatures.receiver.present ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#16A34A', fontSize: `${8 * (zoomLevel / 100)}px`, fontWeight: 700, backgroundColor: '#DCFCE7', padding: '1px 4px', borderRadius: '2px' }}>
                    <CheckCircle2 size={10} /> OCR SIGN DETECTED
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#DC2626', fontSize: `${8 * (zoomLevel / 100)}px`, fontWeight: 700, backgroundColor: '#FEE2E2', padding: '1px 4px', borderRadius: '2px' }}>
                    <AlertOctagon size={10} /> MISSING SIGN (E26)
                  </span>
                )}
              </div>
              <p>................................................</p>
              <p>ผู้รับสินค้า (Received By)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
