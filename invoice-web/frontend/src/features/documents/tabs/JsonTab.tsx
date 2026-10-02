import { FileJson } from 'lucide-react'
import type { Snapshot } from '../../../api/types'

export default function JsonTab({snapshot, onExport}: {snapshot: Snapshot; onExport: () => void}) {
  return <><div className="section-title"><h3><FileJson size={17}/> ข้อมูล JSON</h3><button className="text-button" onClick={onExport}>ดาวน์โหลด JSON</button></div><pre className="json-preview">{JSON.stringify(snapshot, null, 2)}</pre></>
}
