import React from 'react';
import { Search, FileText, ChevronRight, AlertCircle, AlertOctagon } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import type { InvoiceDocument } from '../../types/invoice';

interface QueueSidebarProps {
  invoices: InvoiceDocument[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const QueueSidebar: React.FC<QueueSidebarProps> = ({
  invoices,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange
}) => {
  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        minWidth: 'var(--sidebar-width)',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - var(--header-height) - 130px)',
        position: 'sticky',
        top: 'calc(var(--header-height) + 130px)'
      }}
    >
      {/* Search Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-muted)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่ใบแจ้งหนี้ / PO / ผู้ขาย..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '13px',
              fontFamily: 'inherit',
              color: 'var(--text-primary)'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
            คิวเอกสาร ({invoices.length})
          </span>
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              style={{ fontSize: '11px', color: '#2563EB', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Invoice List Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
            <FileText size={36} color="var(--border-strong)" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: '13px', fontWeight: 500 }}>ไม่พบเอกสารตรงตามเงื่อนไข</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {invoices.map(inv => {
              const isSelected = inv.id === selectedId;
              return (
                <div
                  key={inv.id}
                  onClick={() => onSelect(inv.id)}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '1.5px solid var(--navy-800)' : '1px solid var(--border-subtle)',
                    backgroundColor: isSelected ? '#F8FAFC' : '#FFFFFF',
                    cursor: 'pointer',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                    transition: 'var(--transition-fast)',
                    position: 'relative'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  {/* Top: Invoice No + Status Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {inv.summary.invoiceNum}
                      </span>
                      {inv.isDuplicate && (
                        <span title="เอกสารซ้ำ" style={{ color: 'var(--status-duplicate)' }}>
                          <AlertOctagon size={13} />
                        </span>
                      )}
                      {inv.urgency === 'HIGH' && (
                        <span title="ด่วนมาก" style={{ display: 'inline-flex', color: '#E11D48' }}>
                          <AlertCircle size={13} />
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Badge verificationStatus={inv.verificationStatus} size="sm" />
                      {inv.workflowStatus === 'CONFIRMED' && (
                        <span style={{ fontSize: '10px', backgroundColor: '#DCFCE7', color: '#16A34A', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                          อนุมัติ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Supplier Name */}
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inv.summary.supplierName}
                  </div>

                  {/* Metadata Row: PO & Total */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>PO: {inv.summary.poNumber}</span>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                      {inv.summary.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {inv.summary.currency}
                    </span>
                  </div>

                  {/* Active Indicator Chevron */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--navy-800)'
                      }}
                    >
                      <ChevronRight size={18} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
