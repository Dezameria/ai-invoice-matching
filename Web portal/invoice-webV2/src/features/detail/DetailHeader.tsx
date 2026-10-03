import React from 'react';
import { FileText, Building2, Calendar, CheckSquare, XSquare, AlertOctagon, ShieldAlert } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import type { InvoiceDocument } from '../../types/invoice';

interface DetailHeaderProps {
  document: InvoiceDocument;
  showPdf: boolean;
  onTogglePdf: () => void;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  document,
  showPdf,
  onTogglePdf
}) => {
  const { summary, verificationStatus, workflowStatus, isDuplicate } = document;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '18px 24px'
      }}
    >
      {/* Top row: Title, Dual Status Badges & PDF Toggle Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
            {summary.invoiceNum}
          </h1>

          {/* 1. Verification Engine Status Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} title="ผลการตรวจสอบจาก OCR Rules Engine (Immutable Snapshot)">
            <Badge verificationStatus={verificationStatus} />
          </div>

          {/* 2. Workflow / Human Action Status Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} title="สถานะขั้นตอนงานของมนุษย์ / ระบบบัญชี AP">
            <Badge workflowStatus={workflowStatus} />
          </div>

          {/* 3. Duplicate Flag if applicable */}
          {isDuplicate && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: 'var(--status-duplicate-bg)',
                color: 'var(--status-duplicate)',
                border: '1px solid var(--status-duplicate-border)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)'
              }}
            >
              <AlertOctagon size={12} /> เอกสารซ้ำ (Duplicate)
            </span>
          )}

          {/* Company Chip */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'var(--bg-muted)',
              color: 'var(--text-secondary)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <Building2 size={13} />
            {summary.company}
          </span>

          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            รอบตรวจ: #{summary.validationRound}
          </span>
        </div>

        {/* Action Button: Toggle PDF */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant={showPdf ? 'primary' : 'secondary'}
            size="sm"
            icon={<FileText size={15} />}
            onClick={onTogglePdf}
          >
            {showPdf ? 'ซ่อน PDF เอกสาร' : '📄 เปิดดู PDF คู่ขนาน'}
          </Button>
        </div>
      </div>

      {/* Sub-row: Versioning & Signatures Traceability Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginTop: '10px',
          padding: '6px 12px',
          backgroundColor: '#F8FAFC',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid #E2E8F0',
          fontSize: '11px',
          color: 'var(--text-secondary)'
        }}
      >
        {/* Left: Version Traceability */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span>
            <strong>มาตรฐาน:</strong> Table 9 (v{summary.standardVersion})
          </span>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <span>
            <strong>Schema:</strong> v{summary.schemaVersion}
          </span>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <span>
            <strong>Engine:</strong> {summary.engineVersion}
          </span>
          {summary.haltedBy && (
            <span style={{ color: 'var(--status-manual)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldAlert size={13} /> ระงับการประมวลผลที่กฎ: {summary.haltedBy} (Halted)
            </span>
          )}
        </div>

        {/* Right: Signature Verification Evidence */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ผลตรวจลายเซ็น (V-06):</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              color: summary.signatures.supplierOrDeliverer.present ? 'var(--status-autopass)' : 'var(--status-review)'
            }}
          >
            {summary.signatures.supplierOrDeliverer.present ? <CheckSquare size={13} /> : <XSquare size={13} />}
            ผู้ส่งของ {summary.signatures.supplierOrDeliverer.page ? `(หน้า ${summary.signatures.supplierOrDeliverer.page})` : ''}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              color: summary.signatures.receiver.present ? 'var(--status-autopass)' : 'var(--status-manual)'
            }}
          >
            {summary.signatures.receiver.present ? <CheckSquare size={13} /> : <XSquare size={13} />}
            ผู้รับของ {summary.signatures.receiver.page ? `(หน้า ${summary.signatures.receiver.page})` : ''}
          </span>
        </div>
      </div>

      {/* Metadata strip bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          marginTop: '12px',
          padding: '12px 16px',
          backgroundColor: 'var(--bg-app)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ผู้ขาย (Supplier)</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
            {summary.supplierName}
          </span>
          {summary.supplierTaxId && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              Tax: {summary.supplierTaxId}
            </span>
          )}
        </div>

        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>เลขที่ PO</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy-800)', fontFamily: 'monospace' }}>
            {summary.poNumber} {summary.releaseNumber ? `(Rel: ${summary.releaseNumber})` : ''}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ใบรับสินค้า (GRN)</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: summary.receiptNumber === '-' ? 'var(--status-manual)' : 'var(--text-primary)', fontFamily: 'monospace' }}>
            {summary.receiptNumber || '-'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ผู้รับของ (Receiver)</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {summary.receiverName || '-'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>วันที่ / กำหนดชำระ</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={12} />
            {summary.dueDate}
          </span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ยอดรวมสุทธิ (Grand Total)</span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy-900)' }}>
            {summary.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {summary.currency}
          </span>
        </div>
      </div>
    </div>
  );
};
