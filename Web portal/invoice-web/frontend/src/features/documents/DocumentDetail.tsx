import { Suspense, lazy, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, Upload } from 'lucide-react'
import { api, uploadPdf } from '../../api/client'
import type { Activity, Document } from '../../api/types'
import { Badge, Empty, money } from '../../components/ui'
import ReviewActionPanel from './ReviewActionPanel'
import HistoryTab from './tabs/HistoryTab'
import JsonTab from './tabs/JsonTab'
import LinesTab from './tabs/LinesTab'
import RulesTab from './tabs/RulesTab'
import SourceTab from './tabs/SourceTab'
import SummaryTab from './tabs/SummaryTab'

const PdfViewer = lazy(() => import('../viewer/PdfViewer'))

const RSTEP: Record<string, number> = {
  'V-01': 1,
  'V-02': 1,
  'V-03': 1,
  'V-06': 1,
  'V-04': 2,
  'V-05': 2,
  'V-07': 3,
  'V-08': 3,
  'V-09': 3,
}

type Props = {
  id: string
  revision?: number
  onBack: () => void
  onRevision: (revision?: number) => void
  notify: (message: string) => void
}

export default function DocumentDetail({
  id,
  revision,
  onBack,
  onRevision,
  notify,
}: Props) {
  const [tab, setTab] = useState(0)
  const [viewer, setViewer] = useState(true)
  const [evidencePage, setEvidencePage] = useState({ page: 1, requestId: 0 })
  const [uploading, setUploading] = useState(false)
  const client = useQueryClient()

  const detail = useQuery({
    queryKey: ['document', id, revision || 'current'],
    queryFn: () => api<Document>(`/documents/${id}${revision ? `?revision=${revision}` : ''}`),
  })

  const history = useQuery({
    queryKey: ['history', id],
    queryFn: () => api<Activity[]>(`/documents/${id}/history`),
    enabled: tab === 3,
  })

  if (detail.isLoading) {
    return (
      <div className="doc">
        <Empty loading title="กำลังโหลดข้อมูลเอกสาร…" />
      </div>
    )
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="doc">
        <Empty
          title="ไม่พบเอกสาร"
          description={detail.error?.message || 'เอกสารอาจถูกลบหรือไม่มีอยู่ในระบบ'}
          action={
            <button className="button secondary" onClick={() => detail.refetch()}>
              ลองอีกครั้ง
            </button>
          }
        />
      </div>
    )
  }

  const document = detail.data
  const snapshot = document.snapshot
  const invoice = snapshot.invoice

  async function attach(file: File) {
    setUploading(true)
    try {
      await uploadPdf(id, document.revision, file)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['document', id] }),
        client.invalidateQueries({ queryKey: ['documents'] }),
        client.invalidateQueries({ queryKey: ['history', id] }),
      ])
      notify('แนบไฟล์ PDF ต้นฉบับสำเร็จ')
    } catch (error) {
      notify((error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  function showEvidence(page: number) {
    setEvidencePage(prev => ({ page, requestId: (prev?.requestId || 0) + 1 }))
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

  const tabs = [
    'สรุปและดำเนินการ',
    `รายการสินค้า (${snapshot.lines.length})`,
    `กฎการตรวจ (${snapshot.rules.length})`,
    'ประวัติ',
    'ข้อมูลเพิ่มเติม',
  ]

  const tabContent = [
    <SummaryTab key="summary" snapshot={snapshot} onEvidence={showEvidence} />,
    <LinesTab key="lines" snapshot={snapshot} />,
    <RulesTab key="rules" snapshot={snapshot} onEvidence={showEvidence} />,
    <HistoryTab key="history" activities={history.data} error={history.error} loading={history.isLoading} />,
    <div key="source">
      <SourceTab document={document} snapshot={snapshot} onRevision={onRevision} />
      <div style={{ marginTop: 14 }}>
        <JsonTab snapshot={snapshot} onExport={exportJson} />
      </div>
    </div>,
  ]

  // Pipeline Stepper statuses matching Mockup v4.4:
  const stepStatuses = [1, 2, 3].map(stepNum => {
    const rs = snapshot.rules.filter(r => RSTEP[r.rule_id] === stepNum)
    if (rs.every(r => r.result === 'not_evaluated')) return { cls: 'skip', label: 'ไม่ได้ประเมิน' }
    if (rs.some(r => r.result === 'fail' && r.severity === 'High')) return { cls: 'bad', label: 'พบ High' }
    if (rs.some(r => r.result === 'fail' || r.result === 'manual_review')) return { cls: 'warn', label: 'ต้องตรวจ' }
    return { cls: 'ok', label: 'ผ่าน' }
  })
  const stepNames = ['STEP 1 สกัดและตรวจเอกสาร', 'STEP 2 ค้นใบรับและลูกค้า', 'STEP 3 เทียบกับใบรับ']

  return (
    <div className="document-workspace">
      {/* Top Breadcrumb Navigation */}
      <div className="detail-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <button className="button secondary bsm" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <ArrowLeft size={14} /> กลับไปเอกสารทั้งหมด
        </button>
        <ChevronRight size={13} style={{ color: 'var(--mut)' }} />
        <span style={{ fontSize: 13, color: 'var(--mut)', fontWeight: 600 }}>{invoice.invoice_num}</span>
      </div>

      {/* Revision History Notice */}
      {!document.is_current && (
        <div className="notice warning revision-banner" style={{ margin: '0 0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--ambl)', border: '1px solid #F3DFA0', borderRadius: 8 }}>
          <div>
            <b style={{ color: '#7a5b00', display: 'block', fontSize: 13 }}>
              กำลังดูข้อมูลย้อนหลังรุ่น {document.revision} · รุ่นล่าสุดคือ {document.current_revision}
            </b>
            <small style={{ color: '#7a5b00' }}>การดำเนินการแก้ไขหรือส่งตรวจซ้ำต้องทำจากรุ่นล่าสุด</small>
          </div>
          <button className="button secondary bsm" onClick={() => onRevision()} style={{ background: '#fff', borderColor: '#d4c084' }}>
            กลับไปรุ่นล่าสุด
          </button>
        </div>
      )}

      {/* Main Split Layout: Document Card + PDF Viewer */}
      <div className={`detail-grid ${viewer ? '' : 'no-viewer'}`}>
        <div className="doc">
          {/* Header .dh */}
          <div className="dh">
            <div>
              <h2>
                {invoice.invoice_num} <Badge status={document.status} /> <span className="co">{invoice.company}</span>
              </h2>
              <div className="meta document-meta">
                <div>ผู้ขาย <b>{invoice.supplier_name}</b></div>
                <div>PO <b>{invoice.po_number || '—'}</b></div>
                <div>Release <b>{invoice.release_num || '—'}</b> <span className="rnd">(จากเอกสาร · ไม่ตรวจ)</span></div>
                <div>ใบรับ <b>{snapshot.receipt?.receipt_num || '—'}</b></div>
                <div>ORG_ID <b>{snapshot.receipt?.org_id ? `${snapshot.receipt.org_id}` : '— (ยังไม่เรียก Oracle)'}</b></div>
                <div>Receiver <b>{snapshot.receipt?.receiver ? `คุณ ${snapshot.receipt.receiver}` : '— ไม่มี'}</b></div>
                <div>ยอดรวม <b className="total-number">{money(invoice.grand_total)} {invoice.currency}</b></div>
                <div>รอบตรวจ <b>{document.revision}</b></div>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                {document.revisions && document.revisions.length > 1 && (
                  <select
                    aria-label="รุ่นข้อมูล"
                    className="u bsm"
                    value={document.revision}
                    onChange={event => {
                      const selected = Number(event.target.value)
                      onRevision(selected === document.current_revision ? undefined : selected)
                    }}
                    style={{ background: '#fff', border: '1px solid var(--line)', padding: '5px 8px', borderRadius: 6, fontSize: 12, color: 'var(--ink)' }}
                  >
                    {document.revisions.map(item => (
                      <option key={item.revision} value={item.revision}>
                        รุ่น {item.revision}{item.revision === document.current_revision ? ' · ล่าสุด' : ''}
                      </option>
                    ))}
                  </select>
                )}
                <label className={`button secondary bsm ${uploading ? 'disabled' : ''}`} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Upload size={13} /> {uploading ? 'กำลังแนบ…' : 'แนบ PDF'}
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
                  className="button bn bsm"
                  onClick={() => setViewer(value => !value)}
                  title={viewer ? 'ซ่อนตัวอย่าง PDF' : 'เปิดตัวอย่าง PDF'}
                >
                  📄 {viewer ? 'ซ่อน PDF' : 'เปิดเอกสาร PDF'}
                </button>
              </div>
              <div className="rnd" style={{ marginTop: 6 }}>
                {document.id.slice(0, 15)}… · {document.pdf.pages || 0} หน้า
              </div>
            </div>
          </div>

          {/* Verification Pipeline Stepper .flow */}
          <div className="flow">
            {stepStatuses.map((s, i) => (
              <span key={i} className={`st ${s.cls}`}>
                {stepNames[i]} · {s.label}
              </span>
            ))}
            <span className={`st ${document.status === 'Duplicate' ? 'bad' : 'ok'}`}>
              Portal ตรวจซ้ำ · {document.status === 'Duplicate' ? 'พบซ้ำ' : 'ไม่ซ้ำ'}
            </span>
          </div>

          {/* Tabs .tabs */}
          <div className="tabs" role="tablist" aria-label="ข้อมูลเอกสาร">
            {tabs.map((label, index) => (
              <button
                key={label}
                role="tab"
                aria-selected={tab === index}
                className={`tab ${tab === index ? 'on' : ''}`}
                onClick={() => setTab(index)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content .pane.on */}
          <div className="pane on" role="tabpanel">
            {tabContent[tab]}
          </div>

          {/* Bottom Sticky Action Bar .bar */}
          <ReviewActionPanel document={document} notify={notify} />
        </div>

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
