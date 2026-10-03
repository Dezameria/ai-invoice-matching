import React from 'react';
import { Plus, SplitSquareVertical, Table2 } from 'lucide-react';
import { Button } from '../common/Button';
import type { ViewLayoutMode } from '../../types/navigation';

interface ScopeBarProps {
  selectedCompany: string;
  onSelectCompany: (company: string) => void;
  viewMode: ViewLayoutMode;
  onViewModeChange: (mode: ViewLayoutMode) => void;
  onOpenImport: () => void;
}

export const ScopeBar: React.FC<ScopeBarProps> = ({
  selectedCompany,
  onSelectCompany,
  viewMode,
  onViewModeChange,
  onOpenImport
}) => {
  const companies = [
    { id: 'ALL', label: 'ทุกบริษัท' },
    { id: 'AAPICO Hitech PCL', label: 'AAPICO Hitech PCL' },
    { id: 'AAPICO Amata Co., Ltd.', label: 'AAPICO Amata Co., Ltd.' },
    { id: 'AAPICO Structural Products', label: 'AAPICO Structural Products' }
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '16px',
        flexWrap: 'wrap'
      }}
    >
      {/* Left: Company Scope Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          ขอบเขตบริษัท:
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {companies.map(c => {
            const isSelected = selectedCompany === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelectCompany(c.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 500,
                  backgroundColor: isSelected ? 'var(--navy-800)' : 'var(--bg-muted)',
                  color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid var(--navy-900)' : '1px solid var(--border-subtle)',
                  transition: 'var(--transition-fast)'
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Layout Switcher & Import Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* View Layout Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-muted)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <button
            onClick={() => onViewModeChange('split')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: viewMode === 'split' ? 600 : 500,
              backgroundColor: viewMode === 'split' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'split' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: viewMode === 'split' ? 'var(--shadow-xs)' : 'none',
              transition: 'var(--transition-fast)'
            }}
          >
            <SplitSquareVertical size={14} />
            แยก 2 ฝั่ง
          </button>
          <button
            onClick={() => onViewModeChange('summary-table')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: viewMode === 'summary-table' ? 600 : 500,
              backgroundColor: viewMode === 'summary-table' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'summary-table' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: viewMode === 'summary-table' ? 'var(--shadow-xs)' : 'none',
              transition: 'var(--transition-fast)'
            }}
          >
            <Table2 size={14} />
            ตารางสรุป
          </button>
        </div>

        {/* Import Document Button */}
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={15} />}
          onClick={onOpenImport}
        >
          นำเข้าเอกสาร
        </Button>
      </div>
    </div>
  );
};
