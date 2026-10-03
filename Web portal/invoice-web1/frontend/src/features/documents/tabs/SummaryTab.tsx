import type { Snapshot } from '../../../api/types'

const EXC: Record<string, [string, 'eu' | 'acc']> = {
  E01: ['Missing Field', 'eu'],
  E02: ['Arithmetic Inconsistency', 'acc'],
  E03: ['Total Mismatch', 'acc'],
  E04: ['Rounding', 'acc'],
  E05: ['Receipt Not Found', 'eu'],
  E06: ['Multiple Receipts', 'eu'],
  E07: ['Customer Mismatch', 'acc'],
  E08: ['Signature Missing', 'eu'],
  E09: ['Price Variance', 'acc'],
  E10: ['UOM Mismatch', 'eu'],
  E11: ['Line Resolved by Description', 'acc'],
  E12: ['Price Variance Within Tolerance', 'acc'],
  E13: ['Line Not Identified', 'acc'],
  E14: ['Over Quantity', 'eu'],
  E15: ['Quantity Below Receipt', 'eu'],
}

const RULES: Record<string, string> = {
  'V-01': 'V-01 ฟิลด์บังคับ',
  'V-02': 'V-02 เลขคณิตรายบรรทัด',
  'V-03': 'V-03 ยอดรวมในใบแจ้งหนี้',
  'V-04': 'V-04 พบใบรับ',
  'V-05': 'V-05 ลูกค้าตรงกับตารางที่ 4',
  'V-06': 'V-06 ลายเซ็น',
  'V-07': 'V-07 จับคู่รายบรรทัดและราคา',
  'V-08': 'V-08 จำนวนเท่ากับใบรับ',
  'V-09': 'V-09 ยอดรวมเท่ากับใบรับ',
}

export default function SummaryTab({
  snapshot: s,
  onEvidence,
}: {
  snapshot: Snapshot
  onEvidence: (page: number) => void
}) {
  const fails = s.rules.filter(
    r => r.result === 'fail' || r.result === 'manual_review' || r.exception_code
  )

  return (
    <div className="summary-tab-content">
      {fails.length > 0 ? (
        fails.map((r, i) => {
          const excInfo = r.exception_code ? EXC[r.exception_code] : undefined
          const title = excInfo ? excInfo[0] : r.rule_id
          const who = excInfo ? (excInfo[1] === 'eu' ? 'ผู้ใช้งานแก้' : 'ฝ่ายบัญชีตัดสิน') : 'ตรวจสอบ'
          const ruleLabel = RULES[r.rule_id] || r.rule_id
          const severity = r.severity || 'High'

          return (
            <div key={i} className={`ex ${severity}`}>
              {r.exception_code && <span className={`code ${severity}`}>{r.exception_code}</span>}
              <b>{title}</b>
              <span className="who">{who}</span>
              <p>{ruleLabel}</p>
              <div className="ev">
                <span>{r.evidence || 'พบข้อสังเกตจากระบบตรวจสอบ'}</span>
                {r.page && (
                  <button
                    type="button"
                    className="dmsl"
                    onClick={() => onEvidence(r.page!)}
                    style={{ background: 'none', border: 'none', padding: 0 }}
                  >
                    เปิดหลักฐานหน้า {r.page} ↗
                  </button>
                )}
              </div>
            </div>
          )
        })
      ) : (
        <div className="note i">✓ ไม่พบรหัสข้อผิดพลาดจาก AIVA</div>
      )}

      {s.rules.some(r => r.result === 'manual_review') && (
        <div className="note w">
          ⚠ Manual Review: {s.rules.find(r => r.result === 'manual_review')?.evidence}
        </div>
      )}

      {!s.receipt && (
        <div className="note w">
          ไม่มี Receiver เพราะยังไม่พบใบรับ · ผู้ใช้งานมองไม่เห็นเอกสารนี้ ฝ่ายบัญชีต้องดำเนินการ
        </div>
      )}

      {s.receipt && !s.receipt.receiver && (
        <div className="note w">
          ข้อมูลใบรับไม่มี Receiver เอกสารนี้ยังไม่สามารถกำหนดผู้รับผิดชอบรายบุคคลได้
        </div>
      )}

      {s.status === 'Duplicate' && (
        <div className="note d">
          Portal พบเอกสารซ้ำ · ห้ามส่งเข้า AP Interface จนกว่าฝ่ายบัญชีตัดสิน
        </div>
      )}

      {s.note && <div className="note i">ℹ {s.note}</div>}
    </div>
  )
}
