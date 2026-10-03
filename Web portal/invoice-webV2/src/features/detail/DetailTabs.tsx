import React from 'react';
import { AlertCircle, ListOrdered, CheckSquare, History, Code2 } from 'lucide-react';
import type { DetailTabType } from '../../types/navigation';

interface DetailTabsProps {
  activeTab: DetailTabType;
  onTabChange: (tab: DetailTabType) => void;
  exceptionsCount: number;
  lineItemsCount: number;
  rulesCount: number;
}

export const DetailTabs: React.FC<DetailTabsProps> = ({
  activeTab,
  onTabChange,
  exceptionsCount,
  lineItemsCount,
  rulesCount
}) => {
  const tabs = [
    {
      id: 'exceptions' as const,
      label: 'สรุปและดำเนินการ',
      icon: <AlertCircle size={15} />,
      badge: exceptionsCount > 0 ? exceptionsCount : undefined,
      badgeColor: exceptionsCount > 0 ? '#E11D48' : undefined
    },
    {
      id: 'line-items' as const,
      label: 'รายการสินค้า 3-Way Match',
      icon: <ListOrdered size={15} />,
      badge: lineItemsCount > 0 ? lineItemsCount : undefined,
      badgeColor: 'var(--navy-800)'
    },
    {
      id: 'rules' as const,
      label: 'กฎการตรวจ',
      icon: <CheckSquare size={15} />,
      badge: rulesCount > 0 ? rulesCount : undefined,
      badgeColor: '#475569'
    },
    {
      id: 'history' as const,
      label: 'ประวัติและ Audit Trail',
      icon: <History size={15} />
    },
    {
      id: 'raw-json' as const,
      label: 'ข้อมูลเพิ่มเติม (JSON)',
      icon: <Code2 size={15} />
    }
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '0 24px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-subtle)',
        overflowX: 'auto'
      }}
    >
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--navy-800)' : 'var(--text-muted)',
              borderBottom: isActive ? '2.5px solid var(--navy-800)' : '2.5px solid transparent',
              backgroundColor: 'transparent',
              transition: 'var(--transition-fast)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: isActive ? tab.badgeColor || 'var(--navy-800)' : 'var(--bg-muted)',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
