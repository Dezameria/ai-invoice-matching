import React from 'react';
import { Layers, CheckCircle2, Clock, PauseCircle, AlertTriangle, CopyCheck, BadgeCheck } from 'lucide-react';
import type { KpiMetrics } from '../../types/navigation';
import type { InvoiceStatus } from '../../types/invoice';

interface KpiBarProps {
  metrics: KpiMetrics;
  selectedStatus: InvoiceStatus | 'ALL' | 'CONFIRMED';
  onSelectStatus: (status: InvoiceStatus | 'ALL' | 'CONFIRMED') => void;
}

export const KpiBar: React.FC<KpiBarProps> = ({
  metrics,
  selectedStatus,
  onSelectStatus
}) => {
  const cards = [
    {
      id: 'ALL' as const,
      label: 'ทั้งหมด',
      sublabel: 'Total Queue',
      count: metrics.total,
      icon: <Layers size={18} />,
      accentColor: '#3B82F6',
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE'
    },
    {
      id: 'AUTO_PASS' as const,
      label: 'Auto-pass',
      sublabel: 'ผลตรวจผ่านสมบูรณ์ 100%',
      count: metrics.autoPass,
      icon: <CheckCircle2 size={18} />,
      accentColor: 'var(--status-autopass)',
      bgColor: 'var(--status-autopass-bg)',
      borderColor: 'var(--status-autopass-border)'
    },
    {
      id: 'REVIEW' as const,
      label: 'Review',
      sublabel: 'พบข้อยกเว้น Medium/Low',
      count: metrics.review,
      icon: <Clock size={18} />,
      accentColor: 'var(--status-review)',
      bgColor: 'var(--status-review-bg)',
      borderColor: 'var(--status-review-border)'
    },
    {
      id: 'HOLD' as const,
      label: 'Hold',
      sublabel: 'พบข้อยกเว้น High / ขาดใบรับ',
      count: metrics.hold,
      icon: <PauseCircle size={18} />,
      accentColor: 'var(--status-hold)',
      bgColor: 'var(--status-hold-bg)',
      borderColor: 'var(--status-hold-border)'
    },
    {
      id: 'MANUAL_REVIEW' as const,
      label: 'Manual Review',
      sublabel: 'ส่งตรวจเฉพาะทาง / กฎ V-08',
      count: metrics.manualReview,
      icon: <AlertTriangle size={18} />,
      accentColor: 'var(--status-manual)',
      bgColor: 'var(--status-manual-bg)',
      borderColor: 'var(--status-manual-border)'
    },
    {
      id: 'DUPLICATE' as const,
      label: 'ซ้ำ (Duplicate)',
      sublabel: 'เลขที่ซ้ำในระบบ ERP',
      count: metrics.duplicate,
      icon: <CopyCheck size={18} />,
      accentColor: 'var(--status-duplicate)',
      bgColor: 'var(--status-duplicate-bg)',
      borderColor: 'var(--status-duplicate-border)'
    },
    {
      id: 'CONFIRMED' as const,
      label: 'อนุมัติแล้ว',
      sublabel: 'Confirmed for AP',
      count: metrics.confirmed || 0,
      icon: <BadgeCheck size={18} />,
      accentColor: '#059669',
      bgColor: '#DCFCE7',
      borderColor: '#86EFAC'
    }
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        padding: '16px 24px',
        backgroundColor: 'var(--bg-app)'
      }}
    >
      {cards.map(card => {
        const isSelected = selectedStatus === card.id;
        return (
          <div
            key={card.id}
            onClick={() => onSelectStatus(card.id)}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              border: isSelected ? `2px solid ${card.accentColor}` : '1px solid var(--border-subtle)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-xs)',
              transition: 'var(--transition-fast)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = card.borderColor;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }
            }}
            onMouseLeave={e => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
              }
            }}
          >
            {/* Top row: Icon and label */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {card.label}
              </span>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: card.bgColor,
                  color: card.accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {card.icon}
              </div>
            </div>

            {/* Middle: Count number */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                {card.count}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>รายการ</span>
            </div>

            {/* Bottom: Sublabel hint */}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {card.sublabel}
            </span>
          </div>
        );
      })}
    </div>
  );
};
