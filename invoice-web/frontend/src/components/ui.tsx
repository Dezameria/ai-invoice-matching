import type { ReactNode } from 'react'
import { FileStack } from 'lucide-react'
import type { Status } from '../api/types'
export const labels: Record<Status, string> = {'Auto-pass': 'ผ่านอัตโนมัติ', Review: 'รอตรวจสอบ', Hold: 'ระงับ', 'Manual Review': 'ตรวจด้วยคน', Duplicate: 'เอกสารซ้ำ', Confirmed: 'ยืนยันแล้ว', Posted: 'ส่ง AP แล้ว', Rejected: 'ปฏิเสธ'}
export function Badge({status}: {status: Status}) {return <span className={`badge status-${status.replace(/\s/g, '-')}`}><i/>{labels[status]}</span>}
export function money(value?: string | null) {
  if (value == null) return '—'
  // Preserve significant decimal digits from the API; only round for two-decimal display.
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(value)
  if (!match) return value
  const fraction = (match[3] || '').padEnd(3, '0')
  const cents = BigInt(match[2]) * 100n + BigInt(fraction.slice(0, 2)) + (fraction[2] >= '5' ? 1n : 0n)
  const integer = (cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${match[1]}${integer}.${(cents % 100n).toString().padStart(2, '0')}`
}
export function dateTime(value: string) {return new Date(value).toLocaleString('th-TH', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'})}
export function Empty({title, description, action, loading}: {title: string; description?: string; action?: ReactNode; loading?: boolean}) {return <div className="empty">{loading ? <span className="spinner"/> : <div className="empty-icon"><FileStack size={30}/></div>}<h3>{title}</h3>{description && <p>{description}</p>}{action}</div>}
