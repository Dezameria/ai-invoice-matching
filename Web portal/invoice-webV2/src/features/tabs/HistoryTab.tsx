import React from 'react';
import { History, Clock, User, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import type { InvoiceDocument } from '../../types/invoice';

interface HistoryTabProps {
  revisions: InvoiceDocument['revisions'];
  activities: InvoiceDocument['activities'];
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  revisions,
  activities
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Revisions Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px 20px', boxShadow: 'var(--shadow-xs)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <History size={16} color="var(--navy-800)" />
          รอบการส่งตรวจเอกสาร (Verification Revisions)
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {revisions.map(rev => (
            <div
              key={rev.revision}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-app)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--navy-900)' }}>
                  Revision #{rev.revision}
                </span>
                <Badge status={rev.status} size="sm" />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Event ID: {rev.eventId}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} />
                {new Date(rev.receivedAt).toLocaleString('th-TH')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Audit Trail */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px 20px', boxShadow: 'var(--shadow-xs)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
          <ShieldCheck size={16} color="#059669" />
          บันทึกกิจกรรมและการดำเนินการ (Audit Trail Timeline)
        </h4>

        <div style={{ position: 'relative', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Vertical timeline line */}
          <div
            style={{
              position: 'absolute',
              left: '7px',
              top: '8px',
              bottom: '8px',
              width: '2px',
              backgroundColor: 'var(--border-subtle)'
            }}
          />

          {activities.map((act, idx) => (
            <div key={act.id || idx} style={{ position: 'relative' }}>
              {/* Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-21px',
                  top: '4px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: act.badgeVariant === 'success' ? 'var(--status-autopass)' : act.badgeVariant === 'warning' ? 'var(--status-review)' : 'var(--navy-800)',
                  boxShadow: '0 0 0 3px #FFFFFF'
                }}
              />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {act.action}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <User size={11} /> {act.actor}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                    · {new Date(act.timestamp).toLocaleTimeString('th-TH')}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  {act.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
