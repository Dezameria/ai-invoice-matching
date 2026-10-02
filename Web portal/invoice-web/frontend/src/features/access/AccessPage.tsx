import { CheckCircle2, Clock3, KeyRound, ShieldCheck } from 'lucide-react'
import type { SessionInfo } from '../../api/types'

const ready = [
  ['รับ JSON', 'ตรวจ schema, event idempotency และ revision ก่อนจัดเก็บ'],
  ['เปิดข้อมูลย้อนหลัง', 'JSON และ PDF แยกตาม revision พร้อม deep link'],
  ['อ่าน PDF', 'ตรวจชนิด/ขนาด/จำนวนหน้า และบันทึกการเปิด'],
  ['ดูบันทึกเหตุการณ์', 'ค้นหา กรอง และแบ่งหน้าจากข้อมูลที่เก็บถาวร'],
  ['ดำเนินงานเอกสาร', 'บันทึก explain/resubmit/rerun/return/reject/hold/confirm พร้อม version และ action outbox'],
]
const pending = [
  ['Entra ID และ RBAC', 'ต้องมี tenant, app registration, role และ company/Receiver policy'],
  ['การเชื่อมบัญชี Oracle', 'ต้องยืนยัน EMPLOYEE_ID/Receiver mapping และเจ้าของข้อมูล'],
  ['สิทธิ์ Action รายบทบาท', 'Action ใช้งานได้ใน shared-key pilot แต่ต้องเชื่อม identity ก่อนแยก EU/ACC/APR'],
  ['AP / OCR jobs / DMS session', 'ต้องมี sandbox contract, durable jobs และ security policy'],
]

export default function AccessPage({session}: {session: SessionInfo}) {
  return <div className="access-page"><div className="page-heading"><div><div className="eyebrow">ACCESS MODEL</div><h1>สิทธิ์และการเข้าถึง</h1><p>แสดงความสามารถจริงของ Portal รุ่นปัจจุบัน โดยไม่จำลอง role หรือสิทธิ์ที่ backend ยังไม่ได้บังคับ</p></div><span className="environment"><i/>{session.mode === 'secured' ? 'Shared-key workspace' : 'Local workspace'}</span></div>
    <div className="access-overview"><section className="panel"><div className="access-icon ready"><ShieldCheck/></div><div><small>Workspace</small><h2>{session.workspace}</h2><p>{session.rbac ? 'เปิดใช้สิทธิ์รายบุคคลแล้ว' : 'ยังไม่มี Entra/RBAC รายบุคคล'}</p></div></section><section className="panel"><div className="access-icon"><KeyRound/></div><div><small>สิทธิ์ใน session นี้</small><h2>{session.permissions.length} รายการ</h2><p>{session.permissions.join(' · ')}</p></div></section></div>
    <div className="capability-grid"><section className="panel capability-panel"><div className="panel-heading"><h3>เปิดใช้งานแล้ว</h3><span className="tag">พร้อมใช้ใน pilot</span></div>{ready.map(([title, description]) => <div className="capability-row" key={title}><CheckCircle2/><div><b>{title}</b><p>{description}</p></div></div>)}</section><section className="panel capability-panel"><div className="panel-heading"><h3>ต้องเชื่อมระบบองค์กรก่อน</h3><span className="tag">ยังไม่เปิดใช้</span></div>{pending.map(([title, description]) => <div className="capability-row pending" key={title}><Clock3/><div><b>{title}</b><p>{description}</p></div></div>)}</section></div>
    <div className="notice warning access-warning">Portal key ให้สิทธิ์ทั้ง workspace จึงเหมาะกับ local/integration pilot เท่านั้น การแยกบริษัท ผู้รับเอกสาร และผู้อนุมัติต้องทำหลังเชื่อม identity จริง</div>
  </div>
}
