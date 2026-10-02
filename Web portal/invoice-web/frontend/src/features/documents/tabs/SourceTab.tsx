import { ChevronRight, Database, Info, ShieldCheck, UserCheck } from 'lucide-react'
import type { Document, Snapshot } from '../../../api/types'
import { Badge, dateTime } from '../../../components/ui'

export default function SourceTab({
  document,
  snapshot,
  onRevision,
}: {
  document: Document
  snapshot: Snapshot
  onRevision: (revision?: number) => void
}) {
  return (
    <div className="source-tab-content">
      {/* Ownership & Receiver Mapping Section */}
      <div className="section-title">
        <div className="title-with-desc">
          <h3>ผู้รับผิดชอบและข้อมูลต้นทาง</h3>
          <span className="subtitle">การกำหนดสิทธิ์และความรับผิดชอบของเอกสาร</span>
        </div>
        <UserCheck size={18} />
      </div>

      <div className="data-panel panel-padded">
        <dl className="key-values">
          <div>
            <dt>ผู้รับผิดชอบงานปัจจุบัน</dt>
            <dd>
              <b>
                {document.workflow.assigned_to === 'End user'
                  ? 'ผู้ใช้งาน / Receiver'
                  : document.workflow.assigned_to === 'Source system'
                  ? 'ระบบต้นทาง'
                  : document.workflow.assigned_to === 'Closed'
                  ? 'ปิดงาน'
                  : 'ฝ่ายบัญชี'}
              </b>
            </dd>
          </div>
          <div>
            <dt>บริษัท</dt>
            <dd>
              <b>{snapshot.invoice.company}</b>
            </dd>
          </div>
          <div>
            <dt>ORG_ID จากใบรับ</dt>
            <dd>{snapshot.receipt?.org_id || 'ไม่ได้รับข้อมูล'}</dd>
          </div>
          <div>
            <dt>Receiver</dt>
            <dd>{snapshot.receipt?.receiver || 'ไม่มี Receiver'}</dd>
          </div>
          <div>
            <dt>สถานะการเชื่อมบัญชี</dt>
            <dd>
              <span className="muted">ยังไม่เปิดใช้ Entra/Receiver mapping</span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="notice warning summary-warning">
        <Info size={16} />
        <span>
          รุ่นนี้ใช้ Portal key ระดับ workspace จึงยังไม่จำกัดเอกสารตามบริษัทหรือ Receiver การเปิดใช้หลายผู้ใช้ต้องเชื่อม identity และบังคับ scope ที่ backend ก่อน
        </span>
      </div>

      {/* Upstream Provenance Section */}
      <div className="section-title spaced">
        <div className="title-with-desc">
          <h3>ที่มาของข้อมูล (Upstream Source)</h3>
          <span className="subtitle">ระบบและรหัสอ้างอิงจากผู้ประมวลผลต้นทาง</span>
        </div>
        <Database size={18} />
      </div>

      <div className="data-panel panel-padded">
        <dl className="key-values">
          <div>
            <dt>ระบบต้นทาง</dt>
            <dd>
              <b>{snapshot.source_system}</b>
            </dd>
          </div>
          <div>
            <dt>รหัสเอกสารต้นทาง</dt>
            <dd className="mono">{snapshot.external_id}</dd>
          </div>
          <div>
            <dt>Event ID</dt>
            <dd className="mono">{snapshot.event_id}</dd>
          </div>
          <div>
            <dt>Revision</dt>
            <dd>
              <b>{snapshot.revision}</b>
              {document.is_current ? ' · ล่าสุด' : ' · ประวัติ'}
            </dd>
          </div>
          <div>
            <dt>Standard / Schema</dt>
            <dd>
              {snapshot.standard_version} / {snapshot.schema_version}
            </dd>
          </div>
        </dl>
      </div>

      {/* Revision History List */}
      <div className="section-title spaced">
        <div className="title-with-desc">
          <h3>รุ่นข้อมูลทั้งหมด (Revision History)</h3>
          <span className="subtitle">ประวัติข้อมูลย้อนหลังที่ได้รับจากระบบต้นทาง</span>
        </div>
        <span className="tag count-tag">{document.revisions?.length || 0} รุ่น</span>
      </div>

      <div className="revision-list">
        {document.revisions?.map(item => (
          <button
            className={`revision-card ${item.revision === document.revision ? 'active' : ''}`}
            key={item.revision}
            onClick={() => onRevision(item.revision === document.current_revision ? undefined : item.revision)}
          >
            <div className="revision-num">
              <b>รุ่น {item.revision}</b>
              {item.revision === document.current_revision && <small className="latest-badge">ล่าสุด</small>}
            </div>
            <div className="revision-meta">
              <span className="received-time">{dateTime(item.received_at)}</span>
              <small className="pdf-info">
                {item.pdf.available ? `PDF · ${item.pdf.pages} หน้า` : 'ไม่มี PDF รุ่นนี้'}
              </small>
            </div>
            <Badge status={item.status} />
            <div className="revision-arrow">
              <ChevronRight size={15} />
            </div>
          </button>
        ))}
      </div>

      <div className="notice info source-footnote">
        <ShieldCheck size={16} />
        <span>การแก้ไขข้อมูลหรือผลตรวจต้องมาจาก revision ใหม่ของระบบต้นทาง Portal เก็บ workflow แยกเพื่อไม่แก้หลักฐานเดิม</span>
      </div>
    </div>
  )
}
