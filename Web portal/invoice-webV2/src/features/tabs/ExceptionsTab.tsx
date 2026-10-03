import React from 'react';
import { CheckCircle2, User, ExternalLink, HelpCircle } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import type { RuleException } from '../../types/invoice';

interface ExceptionsTabProps {
  exceptions: RuleException[];
  onJumpToEvidence: (page?: number) => void;
}

export const ExceptionsTab: React.FC<ExceptionsTabProps> = ({
  exceptions,
  onJumpToEvidence
}) => {
  if (exceptions.length === 0) {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--status-autopass-border)'
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--status-autopass-bg)',
            color: 'var(--status-autopass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}
        >
          <CheckCircle2 size={26} />
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--status-autopass)' }}>
          ไม่พบข้อผิดพลาดหรือข้อยกเว้นในเอกสารนี้ (0 Exceptions)
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '420px', margin: '6px auto 0' }}>
          ข้อมูลใบแจ้งหนี้, ใบสั่งซื้อ (PO) และประวัติการรับสินค้า (GRN) ตรงกันสมบูรณ์ 100% สามารถกดยืนยันผ่านเอกสารเพื่อส่งต่อระบบ ERP AP Interface ได้ทันที
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            รายการข้อผิดพลาดและข้อสังเกตจาก Table 9 ({exceptions.length} ข้อยกเว้น)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ตรวจพบตามเกณฑ์มาตรฐาน Standard 6.2 กรุณาตรวจสอบหลักฐานและติดต่อผู้รับผิดชอบก่อนตัดสินใจ
          </p>
        </div>
      </div>

      {exceptions.map((ex, index) => (
        <div
          key={`${ex.code}-${ex.ruleId}-${index}`}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${ex.severity === 'High' ? 'var(--status-manual-border)' : 'var(--status-review-border)'}`,
            padding: '16px 20px',
            boxShadow: 'var(--shadow-xs)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {/* Header row: Exception Code, Rule ID, Title & Severity */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: ex.severity === 'High' ? '#FEE2E2' : '#FEF3C7',
                  color: ex.severity === 'High' ? '#DC2626' : '#D97706',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: `1px solid ${ex.severity === 'High' ? '#FCA5A5' : '#FCD34D'}`
                }}
              >
                Code: {ex.code} ({ex.ruleId})
              </span>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {ex.ruleTitle}
              </h4>
            </div>
            <Badge severity={ex.severity} size="sm" />
          </div>

          {/* Error Message */}
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, padding: '8px 12px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)' }}>
            {ex.message}
          </div>

          {/* Details & Responsible */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <User size={14} color="var(--navy-800)" />
              <span style={{ fontWeight: 600 }}>สายงานรับผิดชอบ:</span>
              <span
                style={{
                  backgroundColor: ex.assignedRole === 'user' ? '#EFF6FF' : '#F3E8FF',
                  color: ex.assignedRole === 'user' ? '#1D4ED8' : '#7E22CE',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600
                }}
              >
                {ex.responsible}
              </span>
            </div>

            {/* Evidence Link */}
            {ex.evidence && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ExternalLink size={13} />}
                onClick={() => onJumpToEvidence(ex.evidencePage)}
              >
                📄 ดูหลักฐาน: {ex.evidence}
              </Button>
            )}
          </div>

          {/* Suggested Action hint */}
          {ex.suggestedAction && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px' }}>
              <HelpCircle size={13} color="#3B82F6" />
              <span>แนวทางปฏิบัติที่แนะนำ: {ex.suggestedAction}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
