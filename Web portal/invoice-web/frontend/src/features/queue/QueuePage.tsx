import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Braces,
  ChevronLeft,
  ChevronRight,
  Columns2,
  FileStack,
  FileText,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Table,
  Upload,
  X,
} from 'lucide-react'
import { api } from '../../api/client'
import type { DocumentList, Rule } from '../../api/types'
import { Badge, Empty, dateTime, labels, money } from '../../components/ui'
import { WorkflowBadge } from '../documents/ReviewActionPanel'
import DocumentDetail from '../documents/DocumentDetail'

type Props = {
  enabled: boolean
  selectedId?: string
  revision?: number
  onImport: () => void
  onIntegration: () => void
  onOpen: (id: string) => void
  onBack: () => void
  onRevision: (revision?: number) => void
  notify: (message: string) => void
}

export default function QueuePage({
  enabled,
  selectedId,
  revision,
  onImport,
  onIntegration,
  onOpen,
  onBack,
  onRevision,
  notify,
}: Props) {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [company, setCompany] = useState('')
  const [source, setSource] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'split' | 'table'>('split')

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
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.page_size)) : 1

  function filterStatus(value: string) {
    setStatus(value)
    setPage(1)
  }

  const kd = [
    { key: '', label: 'ทั้งหมด', count: total },
    { key: 'Auto-pass', label: 'Auto-pass', count: counts['Auto-pass'] || 0 },
    { key: 'Review', label: 'Review', count: counts['Review'] || 0 },
    { key: 'Hold', label: 'Hold', count: counts['Hold'] || 0 },
    { key: 'Manual Review', label: 'Manual Review', count: counts['Manual Review'] || 0 },
    { key: 'Duplicate', label: 'ซ้ำ (Portal)', count: counts['Duplicate'] || 0 },
  ]

  return (
    <div className="workspace-root">
      {/* 1. Mockup Parity Scope & Company Chips Bar */}
      <div className="scope">
        <div>
          <span>
            ขอบเขต: <b>รายบริษัท</b>
          </span>
          <span className="scope-chips">
            บริษัท:{' '}
            <button
              className={`chip ${!company ? 'on' : ''}`}
              onClick={() => {
                setCompany('')
                setPage(1)
              }}
            >
              ทุกบริษัท
            </button>
            {list.data?.companies.map(c => (
              <button
                key={c}
                className={`chip ${company === c ? 'on' : ''}`}
                onClick={() => {
                  setCompany(company === c ? '' : c)
                  setPage(1)
                }}
              >
                {c}
              </button>
            ))}
          </span>
          <span className="sp" />
          <div className="scope-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className={`button secondary bsm ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
              title="สลับเป็นมุมมอง 2 ฝั่ง (Master-Detail)"
              style={{ background: '#fff' }}
            >
              <Columns2 size={13} /> แยก 2 ฝั่ง
            </button>
            <button
              className={`button secondary bsm ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="สลับเป็นมุมมองตารางสรุปทั้งหมด"
              style={{ background: '#fff' }}
            >
              <Table size={13} /> ตารางสรุป
            </button>
            <button className="button primary bsm" onClick={onImport} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Plus size={13} /> นำเข้าเอกสาร
            </button>
          </div>
        </div>
      </div>

      {/* 2. Mockup Parity KPIs Strip */}
      <div className="kpis">
        {kd.map(k => (
          <div
            key={k.key || 'all'}
            className={`kpi ${status === k.key ? 'on' : ''}`}
            onClick={() => filterStatus(k.key)}
            title={`คลิกเพื่อกรองสถานะ: ${k.label}`}
          >
            <b>{k.count}</b>
            <span>{k.label}</span>
          </div>
        ))}
      </div>

      {/* 3. Main Master-Detail Layout */}
      {viewMode === 'split' ? (
        <div className={`wrap ${selectedId ? 'has-selected' : ''}`}>
          {/* Left Panel: Queue Sidebar */}
          <div className="panel queue-sidebar" style={{ margin: 0 }}>
            <div className="ph">
              <span>คิวตรวจสอบ</span>
              <span id="qn">{list.data?.total || 0} ฉบับ</span>
            </div>
            <div className="srch">
              <input
                id="q"
                aria-label="ค้นหาเอกสาร"
                placeholder="ค้นหาเลขที่ใบแจ้งหนี้ / PO / ผู้ขาย"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
            <div className="q" id="list">
              {list.isPending ? (
                <div className="empty">กำลังโหลดรายการ…</div>
              ) : list.error ? (
                <div className="empty">เกิดข้อผิดพลาดในการโหลดรายการ</div>
              ) : !list.data?.items.length ? (
                <div className="empty">ไม่มีเอกสารที่ตรงกับเงื่อนไข</div>
              ) : (
                list.data.items.map(d => {
                  const isSelected = d.id === selectedId
                  const failCodes = (d.snapshot?.rules || []).filter((r: Rule) => r.result === 'fail' && r.exception_code)
                  return (
                    <div
                      key={d.id}
                      className={`qi ${isSelected ? 'on' : ''}`}
                      onClick={() => onOpen(d.id)}
                    >
                      <div className="r1">
                        <span className="inv">
                          <button
                            className="qi-inv-btn"
                            onClick={e => {
                              e.stopPropagation()
                              onOpen(d.id)
                            }}
                          >
                            {d.invoice.invoice_num}
                          </button>{' '}
                          <span className="co">{d.invoice.company}</span>
                        </span>
                        <span className={`b s-${d.status.split(' ')[0]}`}>{labels[d.status] || d.status}</span>
                      </div>
                      <div className="v">ผู้ขาย: {d.invoice.supplier_name}</div>
                      <div className="r2">
                        <span>
                          PO {d.invoice.po_number || '—'}
                          {d.invoice.release_num ? `-${d.invoice.release_num}` : ''} ·{' '}
                          {d.receipt?.receiver ? `Receiver ${d.receipt.receiver}` : 'ไม่มี Receiver'}
                        </span>
                        <span className="mono">{money(d.invoice.grand_total)}</span>
                      </div>
                      <div className="qi-footer">
                        <div className="qi-codes">
                          {failCodes.slice(0, 3).map((r: Rule) => (
                            <span key={r.rule_id} className={`code ${r.severity || 'High'}`}>
                              {r.exception_code}
                            </span>
                          ))}
                        </div>
                        <span className="rnd">
                          {d.workflow.assigned_to === 'End user'
                            ? '→ ผู้ใช้งาน'
                            : d.workflow.assigned_to === 'Source system'
                            ? '→ ระบบต้นทาง'
                            : d.workflow.assigned_to === 'Closed'
                            ? '→ ปิดงาน'
                            : '→ ฝ่ายบัญชี'}{' '}
                          · รอบ {d.revision || 1}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Panel: Detail Workspace */}
          <div id="detail" className="detail-pane">
            {selectedId ? (
              <DocumentDetail
                key={`${selectedId}-${revision || 'current'}`}
                id={selectedId}
                revision={revision}
                onBack={onBack}
                onRevision={onRevision}
                notify={notify}
              />
            ) : (
              <div className="doc empty-doc">
                <div className="empty">
                  <FileStack size={42} className="empty-icon" />
                  <h3>เลือกเอกสารจากคิว</h3>
                  <p>คลิกเลือกรายการใบแจ้งหนี้จากแถบด้านซ้ายเพื่อเปิดดูรายละเอียดและตรวจสอบแบบ 3-Way Match</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Table View Option */
        <section className="queue-panel table-view-container">
          <div className="queue-heading">
            <div className="panel-title-group">
              <h2>
                <LayoutDashboard size={18} /> ตารางสรุปรายการเอกสาร
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
                          <span className="company-pill">{d.invoice.company}</span>
                          <span className="po-number">PO: {d.invoice.po_number || '—'}</span>
                          {d.invoice.release_num && <span className="release-number">Rel: {d.invoice.release_num}</span>}
                        </div>
                      </td>
                      <td className="align-right">
                        <strong className="amount-number">{money(d.invoice.grand_total)}</strong>
                      </td>
                      <td>
                        <Badge status={d.status} />
                      </td>
                      <td>
                        <span className="date-time-text">{dateTime(d.updated_at)}</span>
                      </td>
                      <td>
                        <span className={`file-badge ${d.pdf?.available ? 'has-pdf' : 'no-pdf'}`}>
                          {d.pdf?.available ? 'PDF พร้อม' : 'ไม่มี PDF'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="button secondary small open-doc-btn"
                          onClick={e => {
                            e.stopPropagation()
                            onOpen(d.id)
                          }}
                        >
                          เปิดดู
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {list.data && totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                หน้า {list.data.page} จาก {totalPages} (ทั้งหมด {list.data.total} รายการ)
              </span>
              <div className="pagination-controls">
                <button
                  className="button secondary small"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  aria-label="หน้าก่อนหน้า"
                >
                  <ChevronLeft size={16} /> ก่อนหน้า
                </button>
                <button
                  className="button secondary small"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  aria-label="หน้าถัดไป"
                >
                  ถัดไป <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
