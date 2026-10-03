import { CheckCircle2, Info } from 'lucide-react'
import type { Snapshot } from '../../../api/types'
import { Empty, money } from '../../../components/ui'

export default function LinesTab({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="lines-tab-content">
      <div className="section-title">
        <div className="title-with-desc">
          <h3>
            รายการสินค้าและผลการจับคู่ <span className="tag count-tag">{snapshot.lines.length} รายการ</span>
          </h3>
          <span className="subtitle">เปรียบเทียบรายการสินค้าในใบแจ้งหนี้กับใบสั่งซื้อและใบรับสินค้า (3-Way Matching)</span>
        </div>
      </div>

      <div className="table-scroll">
        <table className="lines-table">
          <thead>
            <tr>
              <th>รายการสินค้า (Description)</th>
              <th className="align-right">จำนวน</th>
              <th>หน่วย</th>
              <th className="align-right">ราคา / หน่วย</th>
              <th className="align-right">รวมเงิน (THB)</th>
              <th>เทียบใบรับ (Line / Qty)</th>
              <th className="align-right">ราคาใบรับ</th>
              <th className="align-center">สถานะ Match</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.lines.map((line, index) => {
              const isFullMatch = line.match_level === 'M1'
              return (
                <tr key={index} className="line-row">
                  <td>
                    <div className="line-desc-cell">
                      <span className="line-index">#{index + 1}</span>
                      <b className="line-title">{line.description}</b>
                    </div>
                  </td>
                  <td className="align-right line-qty font-tabular">{line.quantity ?? '—'}</td>
                  <td>
                    <span className="uom-badge">{line.uom || '—'}</span>
                  </td>
                  <td className="align-right font-tabular">{money(line.unit_price)}</td>
                  <td className="align-right font-tabular font-bold amount-cell">{money(line.amount)}</td>
                  <td>
                    <span className="receipt-ref-badge">
                      {line.receipt_line ? `Line ${line.receipt_line}` : '—'} / {line.receipt_qty ?? '—'}
                    </span>
                  </td>
                  <td className="align-right font-tabular">{money(line.receipt_price)}</td>
                  <td className="align-center">
                    <span className={`match-badge ${isFullMatch ? 'match-full' : 'match-partial'}`}>
                      {isFullMatch && <CheckCircle2 size={12} />}
                      {line.match_level || '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!snapshot.lines.length && <Empty title="ยังไม่มีข้อมูลรายบรรทัด" />}

      <div className="notice info lines-footnote">
        <Info size={15} />
        <span>แสดงผลจับคู่ที่ระบบต้นทางส่งมา · Release ใช้แสดงข้อมูลเท่านั้น · ความคลาดเคลื่อนของราคาหรือจำนวนจะแสดงในกฎการตรวจ</span>
      </div>
    </div>
  )
}
