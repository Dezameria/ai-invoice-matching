import { CheckCircle2, ExternalLink, Info, XCircle } from 'lucide-react'
import type { Snapshot } from '../../../api/types'

const ruleNames = [
  'ฟิลด์บังคับ',
  'เลขคณิตรายบรรทัด',
  'ยอดรวมใบแจ้งหนี้',
  'ใบรับสินค้า',
  'ข้อมูลลูกค้า',
  'ลายเซ็น',
  'จับคู่รายการและราคา',
  'จำนวนสินค้า',
  'ยอดรวมใบรับ',
]

const ruleSteps = [1, 1, 1, 2, 2, 1, 3, 3, 3]

export default function RulesTab({
  snapshot,
  onEvidence,
}: {
  snapshot: Snapshot
  onEvidence: (page: number) => void
}) {
  return (
    <div className="rules-tab-content">
      <div className="section-title">
        <div className="title-with-desc">
          <h3>ผลการตรวจสอบรายกฎ (Validation Rules)</h3>
          <span className="subtitle">ผลการประเมิน 9 กฎมาตรฐานแยกตามขั้นตอน 3-Way Match</span>
        </div>
        <span className="tag version-tag">Standard {snapshot.standard_version}</span>
      </div>

      <div className="rules-list">
        {ruleNames.map((name, index) => {
          const id = `V-0${index + 1}`
          const results = snapshot.rules.filter(rule => rule.rule_id === id)
          const isFail = results.some(rule => rule.result === 'fail')
          const isPass = results.length > 0 && results.every(rule => rule.result === 'pass')
          const isManual = results.some(rule => rule.result === 'manual_review')

          return (
            <div key={id} className={`rule-row rule-${isFail ? 'fail' : isPass ? 'pass' : 'neutral'}`}>
              <div className="rule-badges">
                <span className="rule-id">{id}</span>
                <span className="rule-step">STEP {ruleSteps[index]}</span>
              </div>

              <div className="rule-info">
                <b className="rule-name">{name}</b>
                {results.map((rule, resultIndex) => (
                  <div key={resultIndex} className="rule-evidence-wrap">
                    <p className="rule-evidence">{rule.evidence || 'ไม่ได้ส่งรายละเอียด'}</p>
                    <div className="rule-meta-tags">
                      {rule.exception_code && (
                        <span className={`tag exception-tag ${rule.severity === 'High' ? 'danger' : 'warning'}`}>
                          {rule.exception_code} · {rule.severity || '—'}
                        </span>
                      )}
                      {rule.page && (
                        <button
                          className="text-button evidence-link-btn"
                          onClick={() => onEvidence(rule.page!)}
                          title={`เปิดดูหลักฐานใน PDF หน้า ${rule.page}`}
                        >
                          ดูหน้า {rule.page} <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rule-result-cell">
                <span
                  className={`rule-result ${
                    isFail ? 'fail' : isPass ? 'pass' : isManual ? 'manual' : ''
                  }`}
                >
                  {isPass && <CheckCircle2 size={13} />}
                  {isFail && <XCircle size={13} />}
                  {results.length
                    ? results
                        .map(
                          rule =>
                            ({
                              pass: 'ผ่าน',
                              fail: 'ไม่ผ่าน',
                              manual_review: 'ตรวจด้วยคน',
                              not_evaluated: 'ไม่ประเมิน',
                            }[rule.result])
                        )
                        .join(', ')
                    : 'ไม่มีข้อมูล'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="notice info rules-footnote">
        <Info size={15} />
        <span>รหัสข้อผิดพลาดอ้างอิงมาตรฐานของระบบต้นทาง ไม่แปลงความหมายข้ามเวอร์ชัน</span>
      </div>
    </div>
  )
}
