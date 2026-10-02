import { CheckCircle2, FilePlus2, FileSearch, FileText, History, RefreshCw, Send } from 'lucide-react'
import type { Activity } from '../../../api/types'
import { dateTime, Empty } from '../../../components/ui'

type Props = { activities?: Activity[]; error?: Error | null; loading: boolean }

const kindIcons: Record<string, typeof History> = {
  received: FileText,
  pdf_attached: FilePlus2,
  pdf_viewed: FileSearch,
  workflow_action: Send,
  action_acknowledged: CheckCircle2,
  workflow_resumed: RefreshCw,
}

export default function HistoryTab({ activities, error, loading }: Props) {
  return (
    <div className="history-tab-content">
      <div className="section-title">
        <div className="title-with-desc">
          <h3>ประวัติเอกสารและการดำเนินงาน (Activity Timeline)</h3>
          <span className="subtitle">บันทึกเหตุการณ์ตั้งแต่การรับข้อมูล แนบหลักฐาน จนถึงการตัดสินใจ</span>
        </div>
        <History size={18} />
      </div>

      {loading ? (
        <Empty loading title="กำลังโหลดประวัติ…" />
      ) : error ? (
        <div className="notice danger">{error.message}</div>
      ) : !activities?.length ? (
        <Empty title="ยังไม่มีบันทึกประวัติการดำเนินงาน" />
      ) : (
        <div className="timeline-container">
          <div className="timeline">
            {activities.map(activity => {
              const EventIcon = kindIcons[activity.kind] || History
              return (
                <div key={activity.id} className="timeline-item">
                  <div className="timeline-marker">
                    <div className="marker-dot">
                      <EventIcon size={12} />
                    </div>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-date">{dateTime(activity.created_at)}</span>
                      <span className={`timeline-tag kind-${activity.kind}`}>{activity.kind}</span>
                    </div>
                    <b className="timeline-title">
                      {
                        (
                          {
                            received: 'รับข้อมูลจากระบบต้นทาง',
                            pdf_attached: 'แนบเอกสาร PDF',
                            pdf_viewed: 'เปิดอ่าน PDF',
                            workflow_action: 'ดำเนินการเอกสาร',
                            action_acknowledged: 'ระบบต้นทางตอบรับคำขอ',
                            workflow_resumed: 'ได้รับผลตรวจรอบใหม่',
                          } as Record<string, string>
                        )[activity.kind] || activity.kind
                      }
                    </b>
                    <p className="timeline-detail">{activity.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
