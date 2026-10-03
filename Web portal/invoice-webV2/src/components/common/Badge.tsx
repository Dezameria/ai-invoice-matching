import React from 'react';
import type { VerificationStatus, WorkflowStatus, InvoiceStatus, SeverityLevel, RuleResult, MatchLevel } from '../../types/invoice';

interface BadgeProps {
  status?: InvoiceStatus;
  verificationStatus?: VerificationStatus;
  workflowStatus?: WorkflowStatus;
  ruleResult?: RuleResult;
  severity?: SeverityLevel;
  matchLevel?: MatchLevel;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'slate';
  children?: React.ReactNode;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  verificationStatus,
  workflowStatus,
  ruleResult,
  severity,
  matchLevel,
  variant,
  children,
  size = 'md'
}) => {
  let appliedVariant = variant || 'neutral';
  let label = children;

  if (verificationStatus) {
    switch (verificationStatus) {
      case 'AUTO_PASS':
        appliedVariant = 'success';
        label = label || 'Auto-pass';
        break;
      case 'REVIEW':
        appliedVariant = 'warning';
        label = label || 'Review';
        break;
      case 'HOLD':
        appliedVariant = 'danger';
        label = label || 'Hold';
        break;
      case 'MANUAL_REVIEW':
        appliedVariant = 'danger';
        label = label || 'Manual Review';
        break;
    }
  } else if (workflowStatus) {
    switch (workflowStatus) {
      case 'CONFIRMED':
        appliedVariant = 'success';
        label = label || 'อนุมัติแล้ว (Confirmed)';
        break;
      case 'PENDING_REVIEW':
        appliedVariant = 'warning';
        label = label || 'รอดำเนินการ (Pending)';
        break;
      case 'ON_HOLD':
        appliedVariant = 'neutral';
        label = label || 'พักเอกสาร (On Hold)';
        break;
      case 'REJECTED':
        appliedVariant = 'danger';
        label = label || 'ปฏิเสธแล้ว (Rejected)';
        break;
      case 'RESUBMITTED':
        appliedVariant = 'info';
        label = label || 'ส่งตรวจใหม่ (Resubmitted)';
        break;
      case 'POSTED':
        appliedVariant = 'purple';
        label = label || 'ส่งต่อ AP แล้ว (Posted)';
        break;
    }
  } else if (ruleResult) {
    switch (ruleResult) {
      case 'PASS':
        appliedVariant = 'success';
        label = label || 'PASS';
        break;
      case 'FAIL':
        appliedVariant = 'danger';
        label = label || 'FAIL';
        break;
      case 'MANUAL':
        appliedVariant = 'warning';
        label = label || 'MANUAL';
        break;
      case 'not_evaluated':
        appliedVariant = 'slate';
        label = label || 'ไม่ได้ประเมิน (not_evaluated)';
        break;
    }
  } else if (matchLevel) {
    switch (matchLevel) {
      case 'item_code':
        appliedVariant = 'success';
        label = label || 'รหัสสินค้าตรงกัน (Item Code)';
        break;
      case 'line_num':
        appliedVariant = 'info';
        label = label || 'ลำดับบรรทัด (Line Num)';
        break;
      case 'description':
        appliedVariant = 'warning';
        label = label || 'ชื่อรายการ (Description)';
        break;
      case 'first_row_fallback':
        appliedVariant = 'danger';
        label = label || 'แถวแรกสำรอง (Fallback)';
        break;
      case 'unmatched':
        appliedVariant = 'neutral';
        label = label || 'ไม่พบรายการจับคู่';
        break;
    }
  } else if (status) {
    switch (status) {
      case 'AUTO_PASS':
        appliedVariant = 'success';
        label = label || 'Auto-pass';
        break;
      case 'REVIEW':
        appliedVariant = 'warning';
        label = label || 'Review';
        break;
      case 'HOLD':
        appliedVariant = 'danger';
        label = label || 'Hold';
        break;
      case 'MANUAL_REVIEW':
        appliedVariant = 'danger';
        label = label || 'Manual Review';
        break;
      case 'DUPLICATE':
        appliedVariant = 'purple';
        label = label || 'ซ้ำ (Duplicate)';
        break;
    }
  } else if (severity) {
    switch (severity) {
      case 'High':
        appliedVariant = 'danger';
        label = label || 'High';
        break;
      case 'Medium':
        appliedVariant = 'warning';
        label = label || 'Medium';
        break;
      case 'Low':
        appliedVariant = 'info';
        label = label || 'Low';
        break;
    }
  }

  const styles: Record<string, React.CSSProperties> = {
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      fontWeight: 600,
      borderRadius: 'var(--radius-full)',
      fontSize: size === 'sm' ? '11px' : '12px',
      padding: size === 'sm' ? '2px 8px' : '3px 10px',
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
      transition: 'var(--transition-fast)'
    },
    dot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: 'currentColor'
    }
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    success: {
      backgroundColor: 'var(--status-autopass-bg)',
      color: 'var(--status-autopass)',
      border: '1px solid var(--status-autopass-border)'
    },
    warning: {
      backgroundColor: 'var(--status-review-bg)',
      color: 'var(--status-review)',
      border: '1px solid var(--status-review-border)'
    },
    danger: {
      backgroundColor: 'var(--status-manual-bg)',
      color: 'var(--status-manual)',
      border: '1px solid var(--status-manual-border)'
    },
    neutral: {
      backgroundColor: 'var(--status-hold-bg)',
      color: 'var(--status-hold)',
      border: '1px solid var(--status-hold-border)'
    },
    purple: {
      backgroundColor: 'var(--status-duplicate-bg)',
      color: 'var(--status-duplicate)',
      border: '1px solid var(--status-duplicate-border)'
    },
    info: {
      backgroundColor: '#EFF6FF',
      color: '#2563EB',
      border: '1px solid #BFDBFE'
    },
    slate: {
      backgroundColor: '#F1F5F9',
      color: '#64748B',
      border: '1px solid #CBD5E1'
    }
  };

  return (
    <span style={{ ...styles.badge, ...variantStyles[appliedVariant] }}>
      <span style={styles.dot} />
      {label}
    </span>
  );
};
