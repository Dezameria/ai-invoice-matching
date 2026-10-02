import type { ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, CircleHelp, FileClock, FolderOpen, KeyRound, Link2, LogOut } from 'lucide-react'

type Props = {
  children: ReactNode
  connected: boolean
  documentCount: number
  mode?: string
  page: string
  onNavigate: (page: string) => void
  onLogout: () => void
}

export default function AppShell({children, connected, documentCount, mode, page, onNavigate, onLogout}: Props) {
  const pageTitle = ({documents: 'เอกสารทั้งหมด', access: 'สิทธิ์และการเข้าถึง', audit: 'บันทึกการเข้าถึง', integration: 'เชื่อมต่อ API'} as Record<string, string>)[page] || 'เอกสารทั้งหมด'
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#page=documents"><div className="brand-symbol">a<span/></div><div>AIVA<small>INVOICE WORKSPACE</small></div></a><div className="workspace-label">WORKSPACE</div>
      <nav><button className={page === 'documents' ? 'active' : ''} onClick={() => onNavigate('documents')}><FolderOpen size={19}/><span>เอกสารทั้งหมด</span>{connected && <small>{documentCount}</small>}</button><button className={page === 'access' ? 'active' : ''} onClick={() => onNavigate('access')}><KeyRound size={19}/><span>สิทธิ์และการเข้าถึง</span></button><button className={page === 'audit' ? 'active' : ''} onClick={() => onNavigate('audit')}><FileClock size={19}/><span>บันทึกการเข้าถึง</span></button><button className={page === 'integration' ? 'active' : ''} onClick={() => onNavigate('integration')}><Link2 size={19}/><span>เชื่อมต่อ API</span><ArrowUpRight size={14}/></button></nav>
      <div className="sidebar-tip"><div className="tip-icon"><ArrowDownLeft size={18}/></div><b>ทุกเอกสาร ในที่เดียว</b><p>รับข้อมูลจากระบบของคุณ<br/>อ่านผลตรวจและ PDF ได้พร้อมกัน</p><button onClick={() => onNavigate('integration')}>ดูวิธีเชื่อมต่อ <ChevronRight size={14}/></button></div>
      <div className="sidebar-bottom"><span><i className={`dot ${connected ? '' : 'offline'}`}/>{connected ? 'เชื่อมต่อ Portal API แล้ว' : 'กำลังเชื่อมต่อ API'}</span><small>AIVA Portal · v0.1</small></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div><span className="header-breadcrumb">Workspace</span><ChevronRight size={14}/><b>{pageTitle}</b></div><div className="topbar-right"><span className="environment"><i/>{mode === 'secured' ? 'Shared workspace' : 'Local workspace'}</span><button className="icon-button" title="คู่มือการรับข้อมูล" aria-label="คู่มือ" onClick={() => onNavigate('integration')}><CircleHelp size={19}/></button><span className="header-divider"/><div className="avatar">AV</div><div className="profile"><b>AIVA Workspace</b><small>{mode === 'secured' ? 'API key access' : 'Development mode'}</small></div>{mode === 'secured' && connected && <button className="icon-button" title="ออกจาก workspace" aria-label="ออกจาก workspace" onClick={onLogout}><LogOut size={17}/></button>}</div></header>
      <main>{children}</main>
    </div>
  </div>
}
