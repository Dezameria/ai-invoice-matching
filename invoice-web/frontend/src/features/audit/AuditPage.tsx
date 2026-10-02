import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, FileClock, RefreshCw, Search } from 'lucide-react'
import { api } from '../../api/client'
import type { AuditPage as AuditPageData } from '../../api/types'
import { dateTime, Empty } from '../../components/ui'

const kindLabels: Record<string, string> = {received: 'รับข้อมูล', pdf_attached: 'แนบ PDF', pdf_viewed: 'เปิด PDF', workflow_action: 'ดำเนินการเอกสาร', action_acknowledged: 'ตอบรับคำขอ', workflow_resumed: 'เริ่มตรวจ revision ใหม่'}

export default function AuditPage({onOpen}: {onOpen: (id: string) => void}) {
  const [input, setInput] = useState('')
  const [kind, setKind] = useState('')
  const [page, setPage] = useState(1)
  const params = new URLSearchParams({q: input, kind, page: String(page)})
  const events = useQuery({queryKey: ['audit', input, kind, page], queryFn: () => api<AuditPageData>(`/audit-events?${params}`)})
  return <div className="full-page-feature">
    <div className="page-heading"><div><div className="eyebrow">ACCESS & DOCUMENT EVENTS</div><h1>บันทึกการเข้าถึง</h1><p>เหตุการณ์ถาวรจากการรับข้อมูล เปิดเอกสาร และการดำเนินงานของผู้ตรวจ</p></div><button className="button secondary" disabled={events.isFetching} onClick={() => events.refetch()}><RefreshCw size={16} className={events.isFetching ? 'rotate' : ''}/> รีเฟรช</button></div>
    <section className="panel audit-panel"><div className="filters"><div className="search-box"><Search size={18}/><input aria-label="ค้นหาบันทึก" placeholder="ค้นหา invoice, external ID หรือรายละเอียด…" value={input} onChange={event => {setInput(event.target.value); setPage(1)}}/></div><select aria-label="ประเภทเหตุการณ์" value={kind} onChange={event => {setKind(event.target.value); setPage(1)}}><option value="">ทุกเหตุการณ์</option>{events.data?.kinds.map(value => <option key={value} value={value}>{kindLabels[value] || value}</option>)}</select></div>
      {events.isPending ? <Empty loading title="กำลังโหลดบันทึก…"/> : events.error ? <Empty title="โหลดบันทึกไม่สำเร็จ" description={events.error.message}/> : !events.data.items.length ? <Empty title="ไม่พบบันทึกที่ตรงกับตัวกรอง"/> : <div className="table-scroll"><table className="audit-table"><thead><tr><th>เวลา</th><th>เหตุการณ์</th><th>เอกสาร</th><th>บริษัท / ต้นทาง</th><th>รายละเอียด</th><th/></tr></thead><tbody>{events.data.items.map(item => <tr key={item.id}><td className="date-cell">{dateTime(item.created_at)}</td><td><span className={`audit-kind kind-${item.kind}`}><FileClock size={13}/>{kindLabels[item.kind] || item.kind}</span></td><td><button className="document-link" onClick={() => onOpen(item.document_id)}>{item.invoice_num}</button><small>{item.external_id}</small></td><td><span className="company-tag">{item.company}</span><small>{item.source_system}</small></td><td>{item.detail}</td><td><button className="icon-button" aria-label={`เปิดเอกสาร ${item.invoice_num}`} onClick={() => onOpen(item.document_id)}><ChevronRight size={16}/></button></td></tr>)}</tbody></table></div>}
      <div className="pagination"><span>{events.data?.total ? `แสดง ${(page - 1) * 50 + 1}–${Math.min(page * 50, events.data.total)} จาก ${events.data.total} รายการ` : '0 รายการ'}<small>ข้อมูลคงอยู่หลัง reload</small></span><div><button className="icon-button" aria-label="บันทึกหน้าก่อนหน้า" disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={16}/></button><span className="page-number">{page}</span><button className="icon-button" aria-label="บันทึกหน้าถัดไป" disabled={!events.data || page * 50 >= events.data.total} onClick={() => setPage(value => value + 1)}><ChevronRight size={16}/></button></div></div>
    </section>
    <div className="notice info audit-scope-note">Local/shared-key pilot ยังไม่มีตัวตนผู้ใช้รายบุคคล บันทึกนี้จึงแสดงเหตุการณ์เอกสารและเวลา แต่ไม่แต่งชื่อผู้กระทำหรือบทบาทขึ้นมาเอง</div>
  </div>
}
