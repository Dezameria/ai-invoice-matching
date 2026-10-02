import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight,
  Bell,
  Braces,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  FileStack,
  FileText,
  Filter,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react'
import { api } from '../../api/client'
import type { DocumentList, Status } from '../../api/types'
import { Badge, Empty, dateTime, labels, money } from '../../components/ui'
import { WorkflowBadge } from '../documents/ReviewActionPanel'

type Props = {
  enabled: boolean
  onImport: () => void
  onIntegration: () => void
  onOpen: (id: string) => void
}

export default function QueuePage({ enabled, onImport, onIntegration, onOpen }: Props) {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [company, setCompany] = useState('')
  const [source, setSource] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(q)
      setPage(1)
    }, 250)
    return () => clearTimeout(timer)
  }, [q])

  const params = new URLSearchParams({ q: search, company, source, status, page: String(page) })
  const list = useQuery({
    queryKey: ['documents', search, company, source, status, page],
    queryFn: () => api<DocumentList>(`/documents?${params}`),
    enabled,
  })

  const counts = list.data?.counts || {}
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  function filterStatus(value: string) {
    setStatus(value)
    setPage(1)
  }

  const kpis = [
    {
      title: 'เอกสารทั้งหมด',
      value: total,
      status: '',
      icon: FileStack,
      tone: 'blue',
      desc: 'ทั้งหมดในระบบ',
      badge: status === '' ? 'กำลังดู' : 'ทั้งหมด',
    },
    {
      title: 'ผ่านอัตโนมัติ',
      value: counts['Auto-pass'] || 0,
      status: 'Auto-pass',
      icon: CheckCircle2,
      tone: 'green',
      desc: '3-Way Match สมบูรณ์',
      badge: 'พร้อมส่งบัญชี',
    },
    {
      title: 'รอตรวจสอบ',
      value: counts.Review || 0,
      status: 'Review',
      icon: FileCheck2,
      tone: 'amber',
      desc: 'มีรายการให้ตรวจทาน',
      badge: 'ต้องตรวจสอบ',
    },
    {
      title: 'ระงับเอกสาร',
      value: counts.Hold || 0,
      status: 'Hold',
      icon: Bell,
      tone: 'red',
      desc: 'ตรวจรายละเอียดเพิ่มเติม',
      badge: 'ติดปัญหา',
    },
  ]

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">DOCUMENT WORKSPACE</div>
          <h1>
            งานตรวจเอกสาร <span className="count-label">{total}</span>
          </h1>
          <p>ตรวจสอบความถูกต้องของใบแจ้งหนี้ จับคู่ใบสั่งซื้อ (PO) และใบรับสินค้า (GR) ในมุมมองเดียว</p>
        </div>
        <div className="heading-actions">
          <button className="button primary" onClick={onImport}>
            <Plus size={18} /> นำเข้าเอกสาร
          </button>
        </div>
      </div>

      {/* Normalized At-A-Glance KPI Strip */}
      <div className="stats-grid">
        {kpis.map(c => {
          const isSelected = status === c.status
          return (
            <button
              key={c.title}
              className={`stat-card ${isSelected ? 'selected' : ''}`}
              onClick={() => filterStatus(c.status)}
              title={`คลิกเพื่อกรองเฉพาะ: ${c.title}`}
            >
              <div className="stat-card-header">
                <span className="stat-title">{c.title}</span>
                <div className={`stat-icon ${c.tone}`}>
                  <c.icon size={20} />
                </div>
              </div>
              <strong className="stat-value">{c.value.toLocaleString()}</strong>
              <div className="stat-card-footer">
                <span className="stat-desc">{c.desc}</span>
                <span className={`stat-badge ${c.tone}`}>
                  {c.badge} <ArrowUpRight size={12} />
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Main Queue Management Section */}
      <section className="queue-panel">
        <div className="queue-heading">
          <div className="panel-title-group">
            <h2>
              <LayoutDashboard size={18} /> รายการเอกสาร
            </h2>
            <span className="panel-subtitle">แสดงรายการใบแจ้งหนี้ ผลตรวจระบบ และงานที่ต้องดำเนินการ</span>
          </div>
          <div className="queue-controls">
            <span className="live-indicator">
              <i className="dot" /> รับข้อมูลผ่าน API / JSON
            </span>
            <button
              className="icon-button"
              title="รีเฟรชรายการ"
              aria-label="รีเฟรชรายการ"
              disabled={list.isFetching}
              onClick={() => list.refetch()}
            >
              <RefreshCw size={16} className={list.isFetching ? 'rotate' : ''} />
            </button>
          </div>
        </div>

        {/* Unified Search & Multi-filter Bar */}
        <div className="filters">
          <div className="search-box">
            <Search size={18} />
            <input
              aria-label="ค้นหาเอกสาร"
              placeholder="ค้นหาเลขที่ใบแจ้งหนี้, PO หรือชื่อผู้ขาย…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            {q && (
              <button className="icon-button clear-button" aria-label="ล้างคำค้น" onClick={() => setQ('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="select-filters">
            <select
              aria-label="บริษัท"
              value={company}
              onChange={e => {
                setCompany(e.target.value)
                setPage(1)
              }}
            >
              <option value="">ทุกบริษัท</option>
              {list.data?.companies.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              aria-label="ระบบต้นทาง"
              value={source}
              onChange={e => {
                setSource(e.target.value)
                setPage(1)
              }}
            >
              <option value="">ทุกระบบต้นทาง</option>
              {list.data?.sources.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="status-select">
              <SlidersHorizontal size={15} />
              <select aria-label="สถานะ" value={status} onChange={e => filterStatus(e.target.value)}>
                <option value="">ทุกสถานะ</option>
                {Object.entries(labels).map(([s, l]) => (
                  <option key={s} value={s}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Segment Filter Row */}
        <div className="filter-segments-bar">
          <div className="quick-tabs">
            <button className={!status ? 'active' : ''} onClick={() => filterStatus('')}>
              ทั้งหมด <span>{total}</span>
            </button>
            {(['Review', 'Hold', 'Manual Review', 'Duplicate'] as Status[]).map(s => (
              <button className={status === s ? 'active' : ''} key={s} onClick={() => filterStatus(s)}>
                {labels[s]} <span>{counts[s] || 0}</span>
              </button>
            ))}
          </div>

          {!!list.data?.companies.length && (
            <div className="company-chips" aria-label="กรองตามบริษัท">
              <span className="chips-label">
                <Filter size={12} /> บริษัท:
              </span>
              <button
                className={!company ? 'active' : ''}
                onClick={() => {
                  setCompany('')
                  setPage(1)
                }}
              >
                ทั้งหมด
              </button>
              {list.data.companies.map(value => (
                <button
                  className={company === value ? 'active' : ''}
                  key={value}
                  onClick={() => {
                    setCompany(company === value ? '' : value)
                    setPage(1)
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table Content */}
        {list.isPending ? (
          <Empty loading title="กำลังโหลดรายการ…" />
        ) : list.error ? (
          <Empty
            title="โหลดเอกสารไม่สำเร็จ"
            description={list.error.message}
            action={
              <button className="button secondary" onClick={() => list.refetch()}>
                ลองอีกครั้ง
              </button>
            }
          />
        ) : !list.data?.items.length ? (
          <Empty
            title={total || search || company || status || source ? 'ไม่พบเอกสารที่ตรงกับตัวกรอง' : 'เริ่มต้นด้วยเอกสารแรกของคุณ'}
            description="นำเข้า JSON จากระบบต้นทาง แล้วแนบ PDF เพื่ออ่านเทียบข้อมูล"
            action={
              <div className="empty-actions">
                <button className="button primary" onClick={onImport}>
                  <Upload size={16} /> นำเข้า JSON
                </button>
                <button className="button secondary" onClick={onIntegration}>
                  <Braces size={16} /> ดู API
                </button>
              </div>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="document-table">
              <thead>
                <tr>
                  <th>เอกสาร / ผู้ขาย</th>
                  <th>งานที่ต้องทำ</th>
                  <th>บริษัท / PO</th>
                  <th className="align-right">ยอดรวมสุทธิ</th>
                  <th>ผลตรวจจากต้นทาง</th>
                  <th>รับข้อมูลล่าสุด</th>
                  <th>ไฟล์</th>
                  <th aria-label="การจัดการ" />
                </tr>
              </thead>
              <tbody>
                {list.data.items.map(d => (
                  <tr key={d.id} onClick={() => onOpen(d.id)} className="document-row">
                    <td>
                      <div className="document-cell">
                        <div className="file-icon">
                          <FileText size={20} />
                        </div>
                        <div className="document-info">
                          <div className="document-link-wrap">
                            <button
                              className="document-link"
                              onClick={e => {
                                e.stopPropagation()
                                onOpen(d.id)
                              }}
                            >
                              {d.invoice.invoice_num}
                            </button>
                          </div>
                          <span className="vendor-name">{d.invoice.supplier_name}</span>
                          <div className="queue-context">
                            <span className="context-chip receipt-chip">
                              {d.receipt?.receipt_num ? `ใบรับ ${d.receipt.receipt_num}` : 'ยังไม่มีใบรับ'}
                            </span>
                            <span className="context-divider">·</span>
                            <span className="context-chip receiver-chip">
                              {d.receipt?.receiver ? `Receiver: ${d.receipt.receiver}` : 'ไม่มี Receiver'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="workflow-cell">
                        <WorkflowBadge status={d.workflow.status} />
                        <small className="workflow-owner">
                          {d.workflow.assigned_to === 'End user'
                            ? 'ผู้ใช้งาน / Receiver'
                            : d.workflow.assigned_to === 'Source system'
                            ? 'ระบบต้นทาง'
                            : d.workflow.assigned_to === 'Closed'
                            ? 'ปิดงาน'
                            : 'ฝ่ายบัญชี'}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div className="company-po-cell">
                        <span className="company-tag">{d.company}</span>
                        <small className="queue-po">PO {d.invoice.po_number || '—'}</small>
                      </div>
                    </td>
                    <td className="align-right amount-cell">
                      <span className="amount-number">{money(d.invoice.grand_total)}</span>
                      <small className="currency-label">{d.invoice.currency}</small>
                    </td>
                    <td>
                      <Badge status={d.status} />
                    </td>
                    <td className="date-cell">
                      <span className="date-main">{dateTime(d.updated_at)}</span>
                      <small className="source-revision-label">
                        {d.source_system} · r{d.revision}
                      </small>
                    </td>
                    <td>
                      {d.pdf.available ? (
                        <span className={`pdf-tag ${d.pdf.stale ? 'stale' : ''}`} title={d.pdf.stale ? 'PDF รุ่นเก่า' : 'PDF สมบูรณ์'}>
                          <FileText size={12} />
                          PDF{d.pdf.stale ? ' !' : ''}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="action-cell">
                      <div className="action-chevron">
                        <ChevronRight size={17} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Section */}
        <div className="pagination">
          <span>
            {list.data?.total
              ? `แสดง ${(page - 1) * 25 + 1}–${Math.min(page * 25, list.data.total)} จาก ${list.data.total} เอกสาร`
              : '0 เอกสาร'}
            <small>อ้างอิงเวลาประเทศไทย (Asia/Bangkok)</small>
          </span>
          <div className="pagination-controls">
            <button
              className="icon-button"
              disabled={page <= 1}
              aria-label="รายการหน้าก่อนหน้า"
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="page-number">{page}</span>
            <button
              className="icon-button"
              disabled={!list.data || page * 25 >= list.data.total}
              aria-label="รายการหน้าถัดไป"
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <div className="workspace-footer">
        <ShieldCheck size={15} />
        <span>ผลตรวจมาจากระบบต้นทาง · สถานะงานและการตัดสินใจถูกบันทึกแยกใน Portal</span>
        <span>JSON contract v1.0</span>
      </div>
    </>
  )
}
