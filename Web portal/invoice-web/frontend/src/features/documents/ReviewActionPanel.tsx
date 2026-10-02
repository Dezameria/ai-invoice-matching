import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Send, ShieldCheck, X } from 'lucide-react'
import { post } from '../../api/client'
import type { AvailableAction, Document } from '../../api/types'

const workflowLabels: Record<string, string> = {
  needs_correction: 'รอผู้ใช้งานแก้ไข',
  under_review: 'รอฝ่ายบัญชีตรวจ',
  on_hold: 'พักเอกสาร',
  awaiting_revision: 'รอผลตรวจรอบใหม่',
  confirmed: 'ยืนยันแล้ว',
  rejected: 'ปฏิเสธแล้ว',
  action_failed: 'ส่งคำขอไม่สำเร็จ',
  posted: 'ส่งเข้าระบบบัญชีแล้ว',
}

const assignedLabels: Record<string, string> = {
  'End user': 'ผู้ใช้งาน / Receiver',
  Accounting: 'ฝ่ายบัญชี',
  'Source system': 'ระบบต้นทาง',
  Closed: 'ปิดงาน',
}

const actionClassMap: Record<string, string> = {
  confirm: 'bp',
  resubmit: 'bt',
  rerun: 'bt',
  return: 'bg',
  explain: 'bg',
  reject: 'br',
  hold: 'bw',
  post: 'bb',
}

type Props = { document: Document; notify: (message: string) => void }

export default function ReviewActionPanel({ document, notify }: Props) {
  const [selected, setSelected] = useState<AvailableAction | null>(null)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [receipt, setReceipt] = useState('')
  const [saving, setSaving] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const client = useQueryClient()

  const workflow = document.workflow
  const actions = workflow.available_actions || []
  const enabled = actions.filter(action => action.allowed)
  const pending = workflow.requests?.find(request => ['pending', 'accepted'].includes(request.status))

  useEffect(() => {
    if (selected) dialog.current?.showModal()
    else dialog.current?.close()
  }, [selected])

  function open(action: AvailableAction) {
    setReason(action.reasons[0]?.code || '')
    setNote('')
    setReceipt('')
    setSelected(action)
  }

  function close() {
    if (!saving) setSelected(null)
  }

  async function submit() {
    if (!selected) return
    setSaving(true)
    try {
      await post(`/documents/${document.id}/actions`, {
        request_id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${selected.action}`,
        action: selected.action,
        reason_code: reason,
        note: note || null,
        new_receipt_num: receipt || null,
        expected_revision: document.current_revision,
        expected_workflow_version: workflow.version,
      })
      await Promise.all([
        client.invalidateQueries({ queryKey: ['document', document.id] }),
        client.invalidateQueries({ queryKey: ['documents'] }),
        client.invalidateQueries({ queryKey: ['history', document.id] }),
        client.invalidateQueries({ queryKey: ['audit'] }),
      ])
      notify(
        selected.action === 'resubmit' || selected.action === 'rerun'
          ? 'ส่งคำขอไปยังคิวของระบบต้นทางแล้ว'
          : 'บันทึกการดำเนินการแล้ว'
      )
      setSelected(null)
    } catch (error) {
      notify((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const recommended = enabled.find(action => action.primary) || enabled[0]

  return (
    <div className={`bar workflow-${workflow.status}`} aria-label="การดำเนินการเอกสาร">
      <div className="hint">
        <h3 className="review-heading" style={{ fontSize: 13.5, fontWeight: 700, margin: 0, display: 'inline', color: 'var(--ink)' }}>
          {workflowLabels[workflow.status] || workflow.status}
        </h3>
        <span className="review-assignee" style={{ fontSize: 12, color: 'var(--mut)', marginLeft: 8 }}>
          (ผู้รับผิดชอบ: <b>{assignedLabels[workflow.assigned_to] || workflow.assigned_to}</b>)
        </span>
        {!document.is_current ? (
          <span style={{ fontSize: 12, color: 'var(--amb)', marginLeft: 8 }}>· กำลังดู revision ย้อนหลัง</span>
        ) : pending ? (
          <span className="pending-msg" style={{ fontSize: 12, color: 'var(--teald)', marginLeft: 8, fontWeight: 600 }}>
            · ส่งคำขอแล้ว กำลังรอระบบต้นทาง
          </span>
        ) : (
          recommended && (
            <span style={{ fontSize: 12, color: 'var(--mut)', marginLeft: 8 }}>
              · {recommended.description}
            </span>
          )
        )}
      </div>

      <div className="action-buttons" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {enabled.map(action => (
          <button
            key={action.action}
            className={actionClassMap[action.action] || 'bg'}
            onClick={() => open(action)}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Action Confirmation Modal Dialog */}
      <dialog ref={dialog} className="action-dialog" onCancel={event => { event.preventDefault(); close() }}>
        {selected && (
          <div className="dialog-wrapper">
            <div className="dialog-head">
              <div className="dialog-title-group">
                <span className="eyebrow">DOCUMENT ACTION</span>
                <h2>{selected.label}</h2>
                <p>
                  {document.invoice.invoice_num} · revision {document.current_revision}
                </p>
              </div>
              <button className="icon-button dialog-close" aria-label="ปิด" onClick={close}>
                <X size={19} />
              </button>
            </div>

            <div className="dialog-body action-form">
              <div className="action-safety-note">
                <ShieldCheck size={18} />
                <span>
                  ระบบจะบันทึกคำขอและประวัติไว้ ผลตรวจเดิมจะไม่ถูกแก้ไข หากเป็นการตรวจซ้ำต้องรอ revision ใหม่จากระบบต้นทาง
                </span>
              </div>

              <label className="form-field">
                <span className="field-label">
                  เหตุผล <b className="required-star">*</b>
                </span>
                <select value={reason} onChange={event => setReason(event.target.value)}>
                  {selected.reasons.map(item => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span className="field-label">
                  หมายเหตุ {selected.requires_note && <b className="required-star">*</b>}
                </span>
                <textarea
                  aria-label="หมายเหตุ"
                  rows={4}
                  value={note}
                  onChange={event => setNote(event.target.value)}
                  placeholder={
                    selected.requires_note
                      ? 'ผลตรวจมีความรุนแรงระดับ High กรุณาระบุเหตุผลที่ยอมรับผล'
                      : 'รายละเอียดเพิ่มเติม (ถ้ามี)'
                  }
                />
              </label>

              {selected.accepts_receipt && (
                <label className="form-field">
                  <span className="field-label">เลขที่ใบรับใหม่</span>
                  <input
                    aria-label="เลขที่ใบรับใหม่"
                    value={receipt}
                    onChange={event => setReceipt(event.target.value)}
                    placeholder="ใช้เป็นข้อมูลช่วยค้นหา ระบบต้นทางต้องตรวจสอบอีกครั้ง"
                  />
                </label>
              )}
            </div>

            <div className="dialog-footer">
              <button className="button secondary" disabled={saving} onClick={close}>
                ยกเลิก
              </button>
              <button
                className={`button ${selected.danger ? 'danger' : 'primary'}`}
                disabled={saving || !reason || (selected.requires_note && !note.trim())}
                onClick={() => void submit()}
              >
                <Send size={16} />
                {saving ? 'กำลังบันทึก…' : selected.label}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  )
}

export function WorkflowBadge({ status }: { status: string }) {
  return <span className={`workflow-badge state-${status}`}>{workflowLabels[status] || status}</span>
}
