import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';
import type { InvoiceDocument } from '../../types/invoice';

interface FlowStepperProps {
  flowSteps: InvoiceDocument['flowSteps'];
}

export const FlowStepper: React.FC<FlowStepperProps> = ({ flowSteps }) => {
  const steps = [
    { num: 1, title: 'STEP 1: สกัดและตรวจเอกสาร', sub: 'V-01, V-02, V-03, V-06', data: flowSteps.step1 },
    { num: 2, title: 'STEP 2: ค้นใบรับและลูกค้า', sub: 'Oracle EBS (V-04, V-05)', data: flowSteps.step2 },
    { num: 3, title: 'STEP 3: เทียบ 3-Way Match', sub: 'Deterministic (V-07..V-09)', data: flowSteps.step3 },
    { num: 4, title: 'STEP 4: Human Review & AP', sub: 'Workflow / Concurrency / Outbox', data: flowSteps.step4 }
  ];

  const getStatusIcon = (status: 'ok' | 'warn' | 'bad' | 'skip') => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 size={16} color="var(--status-autopass)" />;
      case 'warn':
        return <AlertTriangle size={16} color="var(--status-review)" />;
      case 'bad':
        return <XCircle size={16} color="var(--status-manual)" />;
      case 'skip':
        return <MinusCircle size={16} color="var(--text-muted)" />;
    }
  };

  const getStepBackground = (status: 'ok' | 'warn' | 'bad' | 'skip') => {
    switch (status) {
      case 'ok':
        return 'var(--status-autopass-bg)';
      case 'warn':
        return 'var(--status-review-bg)';
      case 'bad':
        return 'var(--status-manual-bg)';
      case 'skip':
        return '#F8FAFC';
    }
  };

  const getStepBorder = (status: 'ok' | 'warn' | 'bad' | 'skip') => {
    switch (status) {
      case 'ok':
        return 'var(--status-autopass-border)';
      case 'warn':
        return 'var(--status-review-border)';
      case 'bad':
        return 'var(--status-manual-border)';
      case 'skip':
        return '#E2E8F0';
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
        padding: '16px 24px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-subtle)'
      }}
    >
      {steps.map(step => (
        <div
          key={step.num}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: getStepBackground(step.data.status),
            border: `1px solid ${getStepBorder(step.data.status)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {step.title}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {step.sub}
              </div>
            </div>
            {getStatusIcon(step.data.status)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3, marginTop: '2px' }}>
            {step.data.note}
          </span>
        </div>
      ))}
    </div>
  );
};
