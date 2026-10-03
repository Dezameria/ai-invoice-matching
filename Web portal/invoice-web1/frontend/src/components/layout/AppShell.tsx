import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'

type Props = {
  children: ReactNode
  connected: boolean
  documentCount: number
  mode?: string
  page: string
  onNavigate: (page: string) => void
  onLogout: () => void
}

export default function AppShell({
  children,
  connected,
  mode,
  page,
  onNavigate,
  onLogout,
}: Props) {
  return (
    <div className="aiva-app">
      <header className="aiva-header">
        <div
          className="logo"
          onClick={() => onNavigate('documents')}
          style={{ cursor: 'pointer' }}
          title="AIVA Web Portal"
        >
          <i>AI</i>
          <div>
            AIVA Web Portal<small>v4.4 · RBAC + DMS · Standard v6.6</small>
          </div>
        </div>

        <nav id="nav">
          <button
            className={`nav-link ${page === 'documents' ? 'on' : ''}`}
            onClick={() => onNavigate('documents')}
          >
            คิวตรวจสอบ
          </button>
          <button
            className={`nav-link ${page === 'access' ? 'on' : ''}`}
            onClick={() => onNavigate('access')}
          >
            สิทธิ์และการเข้าถึง
          </button>
          <button
            className={`nav-link ${page === 'audit' ? 'on' : ''}`}
            onClick={() => onNavigate('audit')}
          >
            บันทึกการเข้าถึง
          </button>
          <button
            className={`nav-link ${page === 'integration' ? 'on' : ''}`}
            onClick={() => onNavigate('integration')}
          >
            เชื่อมต่อ API
          </button>
        </nav>

        <div className="sp" />

        <span className="role" style={{ background: '#E3F4E8', color: '#1E8A5F' }}>
          เจ้าหน้าที่บัญชี
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="u"
            style={{
              background: 'var(--navy2)',
              color: '#fff',
              border: '1px solid #2c4b75',
              borderRadius: 7,
              padding: '5px 10px',
              fontSize: 12,
            }}
          >
            {mode === 'secured' ? 'Shared workspace' : 'Local workspace'}
          </span>
          {mode === 'secured' && connected && (
            <button
              className="icon-button"
              title="ออกจาก workspace"
              aria-label="ออกจาก workspace"
              onClick={onLogout}
              style={{ color: '#C9D3DA' }}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      <main className="aiva-main">{children}</main>
    </div>
  )
}
