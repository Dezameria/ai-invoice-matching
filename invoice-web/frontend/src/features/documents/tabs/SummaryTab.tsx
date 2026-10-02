import { AlertCircle, AlertTriangle, Check, ChevronRight, FileCheck, FileSpreadsheet, FileText, Info } from 'lucide-react'
import type { Rule, Snapshot } from '../../../api/types'
import { money } from '../../../components/ui'

export default function SummaryTab({ snapshot: s, onEvidence }: { snapshot: Snapshot; onEvidence: (page: number) => void }) {
  const invoice = s.invoice

  const stepMeta = [
    { title: 'ตรวจเอกสาร', desc: 'ข้อมูลหัวบิล / ภาษี / ลายเซ็น', ids: [1, 2, 3, 6], icon: FileText },
    { title: 'ค้นหาใบรับ', desc: 'จับคู่ใบรับสินค้า (GR)', ids: [4, 5], icon: FileCheck },
    { title: 'เทียบรายการ', desc: '3-Way Match ปริมาณและราคา', ids: [7, 8, 9], icon: FileSpreadsheet },
  ]

  const exceptions = s.rules.filter(
    rule => rule.result === 'fail' || rule.result === 'manual_review' || rule.exception_code
  )

  return (
    <div className="summary-tab-content">
      {/* 3-Way Match Verification Stepper */}
      <div className="section-title">
        <div className="title-with-desc">
          <h3>ภาพรวมผลจากระบบต้นทาง</h3>
          <span className="subtitle">ผลการตรวจสอบตามเกณฑ์ 3-Way Match และ OCR</span>
        </div>
        <span className="tag version-tag">มาตรฐาน {s.standard_version}</span>
      </div>

      <div className="step-grid">
        {stepMeta.map((meta, index) => {
          const rules = s.rules.filter(rule => meta.ids.includes(Number(rule.rule_id.slice(-1))))
          const state = rules.some(rule => rule.result === 'fail')
            ? 'warn'
            : rules.length === meta.ids.length && rules.every(rule => rule.result === 'pass')
            ? 'pass'
            : 'neutral'

          return (
            <div key={index} className={`step-card step-${state}`}>
              <div className="step-top-row">
                <span className="step-badge">
                  {state === 'pass' ? <Check size={14} /> : `ขั้นที่ ${index + 1}`}
                </span>
                <span className={`step-status-pill status-${state}`}>
                  {state === 'pass' ? 'ผ่าน' : state === 'warn' ? 'มีข้อสังเกต' : 'ข้อมูลไม่ครบ / ไม่ประเมิน'}
                </span>
              </div>
              <div className="step-body">
                <b className="step-title">{meta.title}</b>
                <p className="step-desc">{meta.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Discrepancies & Exceptions Callout */}
      {exceptions.length > 0 && (
        <div className="exceptions-section">
          <div className="exceptions-header">
            <AlertTriangle size={16} />
            <b>ข้อสังเกตและข้อผิดพลาดที่พบ ({exceptions.length} รายการ)</b>
          </div>
          <div className="exceptions-list">
            {exceptions.map((rule, index) => (
              <RuleNotice key={index} rule={rule} onPage={onEvidence} />
            ))}
          </div>
        </div>
      )}

      {/* Warning Banners */}
      {!s.receipt && (
        <div className="notice warning summary-warning">
          <Info size={16} />
          <span>ระบบต้นทางไม่ได้ส่งข้อมูลใบรับ จึงยังไม่มี ORG_ID, Receiver หรือหลักฐานการจับคู่ใบรับ</span>
        </div>
      )}
      {s.receipt && !s.receipt.receiver && (
        <div className="notice warning summary-warning">
          <Info size={16} />
          <span>ข้อมูลใบรับไม่มี Receiver เอกสารนี้ยังไม่สามารถกำหนดผู้รับผิดชอบรายบุคคลได้</span>
        </div>
      )}
      {s.status === 'Duplicate' && (
        <div className="notice warning summary-warning">
          <AlertCircle size={16} />
          <span>ระบบต้นทางระบุว่าเอกสารนี้ซ้ำ กรุณาตรวจรายการอ้างอิงก่อนนำข้อมูลไปใช้ต่อ</span>
        </div>
      )}
      {!s.rules.length && (
        <div className="notice info">
          <Info size={16} />
          <span>ระบบต้นทางยังไม่ได้ส่งผลตรวจรายกฎ</span>
        </div>
      )}
      {s.note && (
        <div className="notice info">
          <Info size={16} />
          <span>{s.note}</span>
        </div>
      )}

      {/* Invoice Key Details & Financial Summary Cards */}
      <div className="invoice-data-grid">
        <div className="data-panel invoice-details-panel">
          <div className="section-title spaced">
            <h3>ข้อมูลใบแจ้งหนี้</h3>
            <FileText size={16} />
          </div>
          <dl className="key-values">
            <div>
              <dt>วันที่ใบแจ้งหนี้</dt>
              <dd><b>{invoice.invoice_date || '—'}</b></dd>
            </div>
            <div>
              <dt>เลขที่ PO / Release</dt>
              <dd>
                <b>
                  {invoice.po_number || '—'} / {invoice.release_num || '—'}
                </b>
              </dd>
            </div>
            <div>
              <dt>เลขภาษีผู้ขาย</dt>
              <dd>{invoice.supplier_tax_id || 'ไม่ได้รับข้อมูล'}</dd>
            </div>
            <div>
              <dt>เลขภาษีลูกค้า</dt>
              <dd>{invoice.customer_tax_id || 'ไม่ได้รับข้อมูล'}</dd>
            </div>
            <div>
              <dt>เลขที่ใบรับ</dt>
              <dd>
                <b>{s.receipt?.receipt_num || 'ไม่ได้รับข้อมูล'}</b>
              </dd>
            </div>
            <div>
              <dt>Receiver</dt>
              <dd>{s.receipt?.receiver || 'ไม่ได้รับข้อมูล'}</dd>
            </div>
          </dl>
        </div>

        <div className="data-panel amounts-panel">
          <div className="section-title spaced">
            <h3>สรุปยอดเงิน</h3>
            <span className="currency-pill">{invoice.currency || 'THB'}</span>
          </div>
          <div className="amounts">
            <div>
              <span>ยอดก่อนภาษี (Subtotal)</span>
              <b>{money(invoice.sub_total)}</b>
            </div>
            <div>
              <span>ภาษีมูลค่าเพิ่ม (VAT)</span>
              <b>{money(invoice.vat)}</b>
            </div>
            <div className="grand-total">
              <span>
                ยอดรวมสุทธิ <small>{invoice.currency}</small>
              </span>
              <b>{money(invoice.grand_total)}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RuleNotice({ rule, onPage }: { rule: Rule; onPage: (page: number) => void }) {
  const isHigh = rule.severity === 'High'
  return (
    <div className={`rule-notice ${isHigh ? 'high' : ''}`}>
      <div className="rule-notice-icon">
        <AlertCircle size={18} />
      </div>
      <div className="rule-notice-content">
        <div className="rule-notice-heading">
          <b>
            {rule.exception_code || rule.rule_id} <span>· {rule.severity || 'ต้องตรวจสอบ'}</span>
          </b>
        </div>
        <p>{rule.evidence || 'ระบบต้นทางแจ้งข้อสังเกต'}</p>
        {rule.page && (
          <button className="text-button evidence-link" onClick={() => onPage(rule.page!)}>
            เปิดหลักฐานหน้า {rule.page} <ChevronRight size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
