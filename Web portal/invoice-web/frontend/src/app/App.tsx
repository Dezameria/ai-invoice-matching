import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, X } from 'lucide-react'
import { api, setAccessKey } from '../api/client'
import type { DocumentList, SessionInfo } from '../api/types'
import AppShell from '../components/layout/AppShell'
import { Empty } from '../components/ui'
import ImportDialog from '../features/documents/ImportDialog'
import IntegrationPage from '../features/integration/IntegrationPage'
import QueuePage from '../features/queue/QueuePage'
import AccessPage from '../features/access/AccessPage'
import AuditPage from '../features/audit/AuditPage'
import { useHashRoute } from './routing'

export default function App() {
  const {route, navigate} = useHashRoute()
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState('')
  const [key, setKey] = useState('')
  const client = useQueryClient()
  const health = useQuery({queryKey: ['health'], queryFn: () => api<{mode: string}>('/health'), retry: false})
  const session = useQuery({queryKey: ['session'], queryFn: () => api<SessionInfo>('/session'), retry: false, enabled: !!health.data})
  const summary = useQuery({queryKey: ['documents', 'summary'], queryFn: () => api<DocumentList>('/documents?page_size=1'), enabled: !!session.data})
  useEffect(() => {if (!toast) return; const timer = setTimeout(() => setToast(''), 6500); return () => clearTimeout(timer)}, [toast])
  async function imported(id: string) {setImporting(false); await client.invalidateQueries({queryKey: ['documents']}); await client.invalidateQueries({queryKey: ['document', id]}); navigate('documents', id); setToast('รับข้อมูลเอกสารเรียบร้อยแล้ว')}
  function logout() {setAccessKey(''); setKey(''); client.clear()}

  let content
  if (health.error) content = <Empty title="ยังเชื่อมต่อ Portal API ไม่ได้" description="ตรวจสอบว่า backend ทำงานอยู่ที่พอร์ต 8010 แล้วลองอีกครั้ง" action={<button className="button primary" onClick={() => health.refetch()}>ลองเชื่อมต่อใหม่</button>}/>
  else if (!health.data || session.isPending) content = <Empty title="กำลังเตรียม workspace…" loading/>
  else if (session.error) content = <div className="login-panel panel"><ShieldCheck size={36}/><h1>เข้าสู่ Workspace</h1><p>ระบุ Portal access key ที่ผู้ดูแลระบบกำหนด</p><form onSubmit={e => {e.preventDefault(); setAccessKey(key); void session.refetch()}}><input aria-label="Portal access key" type="password" value={key} onChange={e => setKey(e.target.value)} required autoComplete="off"/><button className="button primary">เข้าใช้งาน</button></form><small>เก็บ key เฉพาะในหน่วยความจำของแท็บนี้</small></div>
  else if (route.page === 'integration') content = <IntegrationPage/>
  else if (route.page === 'access') content = <AccessPage session={session.data}/>
  else if (route.page === 'audit') content = <AuditPage onOpen={id => navigate('documents', id)}/>
  else content = (
    <QueuePage
      enabled={!!session.data}
      selectedId={route.id}
      revision={route.revision}
      onImport={() => setImporting(true)}
      onIntegration={() => navigate('integration')}
      onOpen={id => navigate('documents', id)}
      onBack={() => navigate('documents')}
      onRevision={revision => navigate('documents', route.id, revision)}
      notify={setToast}
    />
  )

  return <AppShell connected={!!session.data} documentCount={summary.data?.total || 0} mode={health.data?.mode} page={route.page} onNavigate={navigate} onLogout={logout}>
    {content}
    {importing && <ImportDialog onClose={() => setImporting(false)} onImported={imported}/>} 
    {toast && <div className="toast" role="status">{toast}<button className="icon-button" onClick={() => setToast('')} aria-label="ปิดข้อความ"><X size={15}/></button></div>}
  </AppShell>
}
