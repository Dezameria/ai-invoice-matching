import React from 'react';
import { Layers, ShieldCheck, Database, FileCode, CheckCircle2, UserCircle2 } from 'lucide-react';
import type { MainNavPage } from '../../types/navigation';

interface HeaderProps {
  currentPage: MainNavPage;
  onPageChange: (page: MainNavPage) => void;
  mockMode: boolean;
  onToggleMockMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onPageChange,
  mockMode,
  onToggleMockMode
}) => {
  const navItems: { id: MainNavPage; label: string; icon: React.ReactNode }[] = [
    { id: 'queue', label: 'คิวตรวจสอบ', icon: <Layers size={16} /> },
    { id: 'permissions', label: 'สิทธิ์และการเข้าถึง', icon: <ShieldCheck size={16} /> },
    { id: 'audit', label: 'บันทึกการเข้าถึง', icon: <Database size={16} /> },
    { id: 'api-docs', label: 'เชื่อมต่อ API', icon: <FileCode size={16} /> }
  ];

  return (
    <header
      style={{
        backgroundColor: 'var(--navy-800)',
        color: '#FFFFFF',
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: 'var(--shadow-md)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      {/* Brand Logo & Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => onPageChange('queue')}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '15px',
              color: '#FFFFFF',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)'
            }}
          >
            AI
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px' }}>AIVA Portal</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  color: '#93C5FD'
                }}
              >
                v2.0
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block', lineHeight: 1.1 }}>
              Invoice 3-Way Matching Engine
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {navItems.map(item => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  transition: 'var(--transition-fast)'
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.color = '#94A3B8';
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Controls: Role Badge & Workspace Mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Mock/Live switch indicator */}
        <button
          onClick={onToggleMockMode}
          title="คลิกเพื่อสลับระหว่าง Mock Data กับ Real API"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: mockMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${mockMode ? '#F59E0B' : '#10B981'}`,
            borderRadius: 'var(--radius-full)',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 600,
            color: mockMode ? '#FBBF24' : '#6EE7B7',
            cursor: 'pointer'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: mockMode ? '#F59E0B' : '#10B981',
              animation: 'pulseGlow 2s infinite'
            }}
          />
          {mockMode ? 'Mock Prototype Mode' : 'Connected to Backend (Port 8010)'}
        </button>

        {/* User Role Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}
        >
          <UserCircle2 size={16} color="#93C5FD" />
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#E2E8F0' }}>เจ้าหน้าที่บัญชี</span>
          <CheckCircle2 size={13} color="#10B981" />
        </div>
      </div>
    </header>
  );
};
