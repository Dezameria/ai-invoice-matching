import { lazy, Suspense, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  History,
  Layers,
  PanelRightClose,
  PanelRightOpen,
  Upload,
} from 'lucide-react'
import { api, uploadPdf } from '../../api/client'
import type { Activity, Document } from '../../api/types'
import { Badge, dateTime, Empty, money } from '../../components/ui'
import HistoryTab from './tabs/HistoryTab'
import JsonTab from './tabs/JsonTab'
import LinesTab from './tabs/LinesTab'
import RulesTab from './tabs/RulesTab'
import SourceTab from './tabs/SourceTab'
import SummaryTab from './tabs/SummaryTab'
import ReviewActionPanel from './ReviewActionPanel'

const PdfViewer = lazy(() => import('../viewer/PdfViewer'))
const tabs = ['สรุปและดำเนินการ', 'รายการสินค้า', 'กฎการตรวจ', 'ประวัติ', 'ข้อมูลเพิ่มเติม']

type Props = {
  id: string
  revision?: number
  onBack: () => void
  onRevision: (revision?: number) => void
  notify: (message: string) => void
}

export default function DocumentDetail({ id, revision, onBack, onRevision, notify }: Props) {
  const [tab, setTab] = useState(0)
  const [viewer, setViewer] = useState(true)
  const [evidencePage, setEvidencePage] = useState({ page: 1, requestId: 0 })
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  const detail = useQuery({
    queryKey: ['document', id, revision || 'current'],
    queryFn: () => api<Document>(`/documents/${id}${revision ? `?revision=${revision}` : ''}`),
  })

  const history = useQuery({
    queryKey: ['history', id],
    queryFn: () => api<Activity[]>(`/documents/${id}/history`),
    enabled: tab === 3,
  })

  if (detail.isPending) return <Empty title="กำลังโหลดเอกสาร…" loading />
  if (detail.error)
    return (
      <Empty
        title="เปิดเอกสารไม่ได้"
        description={detail.error.message}
        action={
          <button className="button secondary" onClick={() => detail.refetch()}>
            ลองอีกครั้ง
          </button>
        }
      />
    )

  const document = detail.data
  const snapshot = document.snapshot
  const invoice = document.invoice

  async function attach(file: File) {
    setUploading(true)
    try {
      await uploadPdf(id, document.revision, file)
      await queryClient.invalidateQueries({ queryKey: ['document', id] })
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
      await queryClient.invalidateQueries({ queryKey: ['history', id] })
      notify('แนบ PDF เรียบร้อยแล้ว')
    } catch (error) {
      notify((error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  function showEvidence(page: number) {
    setEvidencePage(previous => ({ page, requestId: previous.requestId + 1 }))
    setViewer(true)
  }

  function exportJson() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }))
    const anchor = globalThis.document.createElement('a')
    anchor.href = url
    anchor.download = `${invoice.invoice_num}-r${document.revision}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function moveTab(key: string, index: number, container: HTMLElement) {
    const next =
      key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : key === 'ArrowLeft'
        ? (index - 1 + tabs.length) % tabs.length
        : key === 'Home'
        ? 0
        : key === 'End'
        ? tabs.length - 1
        : index
    if (next === index && !['Home', 'End'].includes(key)) return
    setTab(next)
    requestAnimationFrame(() => (container.querySelectorAll('button')[next] as HTMLButtonElement | undefined)?.focus())
  }

  const tabContent = [
    <SummaryTab snapshot={snapshot} onEvidence={showEvidence} />,
    <LinesTab snapshot={snapshot} />,
    <RulesTab snapshot={snapshot} onEvidence={showEvidence} />,
    <HistoryTab activities={history.data} error={history.error} loading={history.isPending} />,
    <div>
      <SourceTab document={document} snapshot={snapshot} onRevision={onRevision} />
      <div className="technical-json">
        <JsonTab snapshot={snapshot} onExport={exportJson} />
      </div>
    </div>,
  ]

  const tabIcons = [FileCheck2, FileSpreadsheet, Layers, History, FileText]

  return (
    <div className="document-workspace">
      {/* Top Breadcrumb Navigation */}
      <div className="detail-breadcrumb">
        <button className="text-button back-link" onClick={onBack}>
          <ArrowLeft size={15} /> กลับไปเอกสารทั้งหมด
        </button>
        <ChevronRight size={13} className="breadcrumb-separator" />
        <span className="breadcrumb-current">{invoice.invoice_num}</span>
      </div>

      {/* Executive Header Banner */}
      <div className="detail-heading">
        <div className="detail-title-group">
          <div className="eyebrow">
            INVOICE DETAILS{' '}
            <span className="revision-tag">
              · รุ่น {document.revision}
              {!document.is_current ? ' · ประวัติ' : ' (ล่าสุด)'}
            </span>
          </div>
          <div className="invoice-title-row">
            <h1>
              {invoice.invoice_num} <Badge status={document.status} />
            </h1>
          </div>
          <p className="supplier-subtitle">{invoice.supplier_name}</p>
        </div>

        {/* Action Controls */}
        <div className="detail-buttons">
          <label className="revision-control" title="เลือกรุ่นเอกสารย้อนหลัง">
            <span>รุ่นข้อมูล</span>
            <select
              aria-label="รุ่นข้อมูล"
              value={document.revision}
              onChange={event => {
                const selected = Number(event.target.value)
                onRevision(selected === document.current_revision ? undefined : selected)
              }}
            >
              {document.revisions?.map(item => (
                <option key={item.revision} value={item.revision}>
                  รุ่น {item.revision}
                  {item.revision === document.current_revision ? ' · ล่าสุด' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className={`button secondary upload-btn ${uploading ? 'disabled' : ''}`}>
            <Upload size={16} />
            {uploading ? 'กำลังแนบ…' : `แนบ PDF รุ่น ${document.revision}`}
            <input
              type="file"
              hidden
              accept="application/pdf"
              disabled={uploading}
              onChange={event => {
                const file = event.target.files?.[0]
                if (file) void attach(file)
                event.target.value = ''
              }}
            />
          </label>

          <button
            className="button secondary viewer-toggle-btn"
            onClick={() => setViewer(value => !value)}
            title={viewer ? 'ซ่อนตัวอย่าง PDF' : 'เปิดตัวอย่าง PDF'}
          >
            {viewer ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
            {viewer ? 'ซ่อน PDF' : 'เปิด PDF'}
          </button>
        </div>
      </div>

      {/* Revision History Notice */}
      {!document.is_current && (
        <div className="notice warning revision-banner">
          <div className="banner-text">
            <span className="banner-title">
              กำลังดูข้อมูลย้อนหลังรุ่น {document.revision} · รุ่นล่าสุดคือ {document.current_revision}
            </span>
            <small>การดำเนินการแก้ไขหรือส่งตรวจซ้ำต้องทำจากรุ่นล่าสุด</small>
          </div>
          <button className="text-button return-latest-btn" onClick={() => onRevision()}>
            กลับไปรุ่นล่าสุด
          </button>
        </div>
      )}

      {/* Main Detail Workspace (Split Layout) */}
      <div className={`detail-grid ${viewer ? '' : 'no-viewer'}`}>
        <section className="document-data">
          {/* Normalized 3-Way Match Executive Overview Card */}
          <div className="document-meta review-first">
            <div className="meta-card company-card">
              <span className="meta-label">บริษัท</span>
              <b className="meta-value">{invoice.company}</b>
              <small className="meta-hint">ข้อมูลคู่ค้าในระบบ</small>
            </div>

            <div className="meta-card po-card">
              <span className="meta-label">เลขที่ PO / Release</span>
              <b className="meta-value">
                {invoice.po_number || '—'} / {invoice.release_num || '—'}
              </b>
              <small className="meta-hint">
                {invoice.invoice_date ? `วันที่บิล: ${invoice.invoice_date}` : 'อ้างอิงใบสั่งซื้อ'}
              </small>
            </div>

            <div className="meta-card receipt-card">
              <span className="meta-label">เลขที่ใบรับ</span>
              <b className="meta-value">{snapshot.receipt?.receipt_num || 'ยังไม่ได้รับข้อมูล'}</b>
              <small className="meta-hint">
                {snapshot.receipt?.receiver ? `Receiver: ${snapshot.receipt.receiver}` : 'ไม่มี Receiver'}
              </small>
            </div>

            <div className="meta-card total-card">
              <span className="meta-label">ยอดรวมสุทธิ</span>
              <b className="total-number">
                {money(invoice.grand_total)} <small>{invoice.currency}</small>
              </b>
              <small className="meta-hint vat-breakdown">
                ก่อนภาษี {money(invoice.sub_total)} · VAT {money(invoice.vat)}
              </small>
            </div>
          </div>

          {/* Source & Revision Provenance Bar */}
          <div className="source-note">
            <span className="source-mark">
              <ExternalLink size={13} />
              <b>{document.source_system}</b>
            </span>
            <span className="source-details">
              รอบที่ {document.revision} · PDF {document.pdf.pages || 0} หน้า · รับข้อมูล {dateTime(document.updated_at)}
            </span>
          </div>

          {/* Workflow & Next Actions Hub */}
          <ReviewActionPanel document={document} notify={notify} />

          {/* Normalized Content Tabs */}
          <div className="tabs" role="tablist" aria-label="ข้อมูลเอกสาร">
            {tabs.map((label, index) => {
              const TabIcon = tabIcons[index]
              const isSelected = tab === index
              return (
                <button
                  id={`document-tab-${index}`}
                  aria-controls="document-tabpanel"
                  tabIndex={isSelected ? 0 : -1}
                  key={label}
                  role="tab"
                  aria-selected={isSelected}
                  className={`detail-tab ${isSelected ? 'active' : ''}`}
                  onKeyDown={event => {
                    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                      event.preventDefault()
                      moveTab(event.key, index, event.currentTarget.parentElement!)
                    }
                  }}
                  onClick={() => setTab(index)}
                >
                  <TabIcon size={15} />
                  <span>{label}</span>
                  {index === 1 && <small className="tab-count">{snapshot.lines.length}</small>}
                </button>
              )
            })}
          </div>

          {/* Tab Panel View */}
          <div id="document-tabpanel" aria-labelledby={`document-tab-${tab}`} className="tab-content" role="tabpanel">
            {tabContent[tab]}
          </div>

          {/* Audit Footnote */}
          <div className="detail-footnote">
            <i className="dot" />
            <span>ผลตรวจมาจากระบบต้นทาง · การดำเนินงานใน Portal ถูกบันทึกแยกและตรวจสอบย้อนหลังได้</span>
          </div>
        </section>

        {/* PDF Document Viewer Panel */}
        {viewer && (
          <Suspense fallback={<Empty loading title="กำลังโหลดตัวอ่าน PDF…" />}>
            <PdfViewer
              key={`${id}-${document.revision}-${document.pdf.revision}-${uploading}`}
              doc={document}
              requestedPage={evidencePage}
              onAttach={attach}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}
