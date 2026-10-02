import { useEffect, useRef, useState } from 'react'
import { FileJson, Upload, X, CheckCircle2 } from 'lucide-react'
import { post, uploadPdf } from '../../api/client'
import { sample } from '../../test/fixtures/sample'

export default function ImportDialog({onClose, onImported}: {onClose: () => void; onImported: (id: string) => void}) {
  const [text, setText] = useState('')
  const [pdf, setPdf] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {dialog.current?.showModal()}, [])
  async function submit() {
    setBusy(true); setError('')
    let imported: {id: string; revision: number} | undefined
    try {
      let data: unknown
      try {data = JSON.parse(text)} catch {throw new Error('JSON ไม่ถูกต้อง กรุณาตรวจเครื่องหมายและรูปแบบข้อมูล')}
      imported = await post<{id: string; revision: number}>('/imports', data)
      if (pdf) await uploadPdf(imported.id, imported.revision, pdf)
      onImported(imported.id)
    } catch (e) {
      if (imported) {setSavedId(imported.id); setError(`บันทึก JSON แล้ว แต่แนบ PDF ไม่สำเร็จ: ${(e as Error).message}`)}
      else setError((e as Error).message)
    } finally {setBusy(false)}
  }
  return <dialog ref={dialog} className="import-dialog" onCancel={e => {if (busy) e.preventDefault(); else onClose()}}>
    <div className="dialog-head"><div className="heading-with-icon"><div className="mini-icon"><FileJson size={22}/></div><div><h2>นำเข้าเอกสาร</h2><p>รับข้อมูล JSON และแนบไฟล์ PDF จากระบบต้นทาง</p></div></div><button className="icon-button" aria-label="ปิด" disabled={busy} onClick={onClose}><X/></button></div>
    <div className="dialog-body"><div className="import-steps"><span className="active">1 <b>ข้อมูล JSON</b></span><i/><span>2 <b>แนบ PDF (ถ้ามี)</b></span></div>
      <div className="field-title"><label htmlFor="json-input">ข้อมูลเอกสาร <span className="required">*</span></label><div><button className="text-button" onClick={() => setText(JSON.stringify({...sample, event_id: `demo-${crypto.randomUUID()}`, external_id: `DEMO-${Date.now()}`}, null, 2))}>ใช้ตัวอย่าง</button><label className="text-button">เลือกไฟล์ .json<input type="file" accept="application/json,.json" hidden onChange={async e => {const f = e.target.files?.[0]; if (!f) return; if (f.size > 2 * 1024 * 1024) {setError('JSON ต้องไม่เกิน 2 MB'); return} setText(await f.text())}}/></label></div></div>
      <textarea id="json-input" className="json-input" spellCheck={false} placeholder={'{\n  "schema_version": "1.0",\n  "source_system": "your-system",\n  ...\n}'} value={text} onChange={e => setText(e.target.value)}/>
      <label className="upload-box"><div className="mini-icon">{pdf ? <CheckCircle2/> : <Upload/>}</div><div><b>{pdf?.name || 'เลือกเอกสาร PDF ต้นฉบับ'}</b><p>ไม่บังคับ · สูงสุด 20 MB · แนบภายหลังได้</p></div><span className="button secondary">เลือกไฟล์</span><input type="file" accept="application/pdf" hidden onChange={e => {setPdf(e.target.files?.[0] || null)}}/></label>
      {error && <div role="alert" className="notice danger pre-wrap">{error}</div>}
      <div className="notice info">พอร์ทัลจะแสดงผลตาม JSON ที่ได้รับ โดยไม่รัน OCR หรือตรวจ matching ซ้ำ</div>
    </div><div className="dialog-footer">{savedId && <button className="button secondary" onClick={() => onImported(savedId)}>เปิดเอกสารที่บันทึกแล้ว</button>}<button className="button secondary" disabled={busy} onClick={onClose}>ยกเลิก</button><button className="button primary" disabled={!text.trim() || busy} onClick={submit}>{busy ? <span className="spinner"/> : <Upload size={16}/>} {busy ? 'กำลังนำเข้า…' : 'นำเข้าเอกสาร'}</button></div>
  </dialog>
}
