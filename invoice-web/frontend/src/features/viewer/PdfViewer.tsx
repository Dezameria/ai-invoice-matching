import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileText, Minus, Plus, Upload } from 'lucide-react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { request } from '../../api/client'
import type { Document } from '../../api/types'
GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfViewer({doc, requestedPage, onAttach}: {doc: Document; requestedPage: {page: number; requestId: number}; onAttach: (file: File) => void}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState(500)
  const downloadUrl = useRef('')
  useEffect(() => {
    if (!stage.current) return
    const element = stage.current
    const observer = new ResizeObserver(() => {
      const style = getComputedStyle(element)
      setAvailableWidth(element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    setPage(Math.min(Math.max(1, requestedPage.page), doc.pdf.pages || 1))
  }, [requestedPage, doc.id, doc.pdf.pages])
  useEffect(() => {
    let alive = true
    let task: ReturnType<typeof getDocument> | undefined
    const abort = new AbortController()
    setPdf(null); setError('')
    if (!doc.pdf.available) return
    setLoading(true)
    request(`/documents/${doc.id}/pdf?revision=${doc.pdf.revision}`, {signal: abort.signal}).then(r => r.arrayBuffer()).then(async bytes => {
      if (!alive) return
      downloadUrl.current = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'}))
      task = getDocument({data: new Uint8Array(bytes)})
      const loaded = await task.promise
      if (alive) setPdf(loaded)
    }).catch(e => {if (alive) setError(e.message)}).finally(() => {if (alive) setLoading(false)})
    return () => { alive = false; abort.abort(); void task?.destroy(); URL.revokeObjectURL(downloadUrl.current); downloadUrl.current = '' }
  }, [doc.id, doc.updated_at, doc.pdf.available, doc.pdf.revision, doc.pdf.pages])
  useEffect(() => {
    if (!pdf || !canvas.current) return
    let cancelled = false
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined
    pdf.getPage(page).then(p => {
      if (cancelled || !canvas.current) return
      const base = p.getViewport({scale: 1})
      const viewport = p.getViewport({scale: availableWidth / base.width * zoom})
      const c = canvas.current
      const ratio = window.devicePixelRatio || 1
      c.width = Math.floor(viewport.width * ratio); c.height = Math.floor(viewport.height * ratio)
      c.style.width = `${viewport.width}px`; c.style.height = `${viewport.height}px`
      render = p.render({canvas: c, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0]})
      return render.promise
    }).catch(e => {if (!cancelled && e.name !== 'RenderingCancelledException') setError('ไม่สามารถแสดง PDF หน้านี้ได้')})
    return () => {cancelled = true; render?.cancel()}
  }, [pdf, page, zoom, availableWidth])
  return <section className="pdf-viewer" aria-label="PDF viewer">
    <div className="viewer-tools"><span className="viewer-title"><FileText size={16}/> เอกสารต้นฉบับ</span><div className="tool-group">
      <button className="icon-button" title="ย่อ" aria-label="ย่อ PDF" disabled={!pdf || zoom <= .5} onClick={() => setZoom(z => z - .25)}><Minus size={16}/></button><span>{Math.round(zoom * 100)}%</span>
      <button className="icon-button" title="ขยาย" aria-label="ขยาย PDF" disabled={!pdf || zoom >= 2} onClick={() => setZoom(z => z + .25)}><Plus size={16}/></button>
      <button className="icon-button" title="ดาวน์โหลด PDF" aria-label="ดาวน์โหลด PDF" disabled={!pdf} onClick={() => {const a = document.createElement('a'); a.href = downloadUrl.current; a.download = `${doc.invoice.invoice_num}-r${doc.pdf.revision}.pdf`; a.click()}}><Download size={16}/></button>
    </div></div>
    {doc.pdf.stale && <div className="notice warning">PDF นี้เป็นรุ่น {doc.pdf.revision} แต่ JSON เป็นรุ่น {doc.revision} กรุณาตรวจสอบกับระบบต้นทาง</div>}
    <div className="pdf-stage" ref={stage}>
      {loading && <div className="empty"><span className="spinner"/>กำลังเปิดเอกสาร…</div>}
      {error && <div className="empty error-text">{error}</div>}
      {!doc.pdf.available && <div className="empty"><div className="empty-icon"><FileText size={34}/></div><h3>ยังไม่มีไฟล์ PDF</h3><p>แนบเอกสารต้นฉบับเพื่ออ่านเทียบกับข้อมูล<br/>ที่ได้รับจากระบบต้นทาง</p><label className="button primary"><Upload size={16}/> แนบ PDF<input type="file" accept="application/pdf" hidden onChange={e => {const f = e.target.files?.[0]; if (f) onAttach(f); e.target.value = ''}}/></label><small>สูงสุด 20 MB · ไม่รองรับไฟล์ที่มีรหัสผ่าน</small></div>}
      {doc.pdf.available && <canvas ref={canvas} style={{display: pdf ? 'block' : 'none'}} aria-label={`เอกสาร PDF หน้า ${page}`}/>}
    </div>
    <div className="viewer-footer"><span><i className="dot"/> {doc.pdf.available ? 'ไฟล์ที่แนบจากระบบต้นทาง' : 'รอเอกสารต้นฉบับ'}</span><div className="tool-group"><button className="icon-button" aria-label="หน้าก่อนหน้า" disabled={!pdf || page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16}/></button><span>หน้า {pdf ? page : '—'} / {pdf?.numPages || '—'}</span><button className="icon-button" aria-label="หน้าถัดไป" disabled={!pdf || page >= pdf.numPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16}/></button></div></div>
  </section>
}
