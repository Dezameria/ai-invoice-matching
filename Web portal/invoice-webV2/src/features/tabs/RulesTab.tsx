import React, { useState } from 'react';
import { Badge } from '../../components/common/Badge';
import { Info } from 'lucide-react';
import type { RuleEvaluation } from '../../types/invoice';

interface RulesTabProps {
  rules: RuleEvaluation[];
}

export const RulesTab: React.FC<RulesTabProps> = ({ rules }) => {
  const [stepFilter, setStepFilter] = useState<number | 'ALL'>('ALL');

  const filtered = stepFilter === 'ALL' ? rules : rules.filter(r => r.step === stepFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Information Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: '#EFF6FF',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #BFDBFE',
          fontSize: '12px',
          color: '#1E40AF'
        }}
      >
        <Info size={16} />
        <span>
          <strong>Table 9 Deterministic Evaluation (Standard 6.2):</strong> ผลการตัดสินคำนวณจากกฎเกณฑ์ตายตัว กฎที่ไม่ได้ประเมินหรือถูกระงับจะแสดงเป็น <em>not_evaluated</em> โดยระบบไม่เติมผล PASS สมมติ
        </span>
      </div>

      {/* Filter by Step */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>กรองตามขั้นตอน:</span>
        {[
          { id: 'ALL' as const, label: 'ทั้งหมด (Table 9: V-01..V-09)' },
          { id: 1, label: 'STEP 1: สกัดเอกสาร & คณิตศาสตร์ (V-01..V-03, V-06)' },
          { id: 2, label: 'STEP 2: ค้นหา Oracle EBS (V-04, V-05)' },
          { id: 3, label: 'STEP 3: ตรวจจับคู่ 3-Way (V-07..V-09)' }
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => setStepFilter(btn.id)}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: stepFilter === btn.id ? 600 : 500,
              backgroundColor: stepFilter === btn.id ? 'var(--navy-800)' : 'var(--bg-muted)',
              color: stepFilter === btn.id ? '#FFFFFF' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer'
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Rules List Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '10px 14px', width: '80px' }}>รหัสกฎ</th>
              <th style={{ padding: '10px 14px' }}>ชื่อกฎเกณฑ์และวัตถุประสงค์ (Rule Title)</th>
              <th style={{ padding: '10px 14px', width: '80px' }}>ขั้นตอน</th>
              <th style={{ padding: '10px 14px' }}>รายละเอียด / ข้อยกเว้น / หลักฐาน</th>
              <th style={{ padding: '10px 14px', width: '130px', textAlign: 'center' }}>ผลการตรวจ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr
                key={r.ruleId}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: r.result === 'FAIL' ? '#FEF2F2' : r.result === 'MANUAL' ? '#FFFBEB' : r.result === 'not_evaluated' ? '#F8FAFC' : 'transparent'
                }}
              >
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--navy-900)' }}>
                  {r.ruleId}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Standard 6.2 Table 9</div>
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                  Step {r.step}
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                  <div>{r.details || '-'}</div>
                  {r.exceptionCode && (
                    <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '1px 6px', borderRadius: '3px', fontSize: '11px' }}>
                        Code: {r.exceptionCode}
                      </span>
                      {r.severity && <Badge severity={r.severity} size="sm" />}
                    </div>
                  )}
                  {r.evidence && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      <strong>หลักฐาน:</strong> {r.evidence} {r.page ? `(หน้า ${r.page})` : ''}
                    </div>
                  )}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <Badge ruleResult={r.result} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
