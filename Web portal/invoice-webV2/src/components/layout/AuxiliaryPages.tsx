import React from 'react';
import { Shield, Key, CheckCircle, FileCode, Terminal, BookOpen, Layers } from 'lucide-react';

export const PermissionsPage: React.FC = () => {
  return (
    <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy-900)' }}>สิทธิ์และการเข้าถึงตามบทบาท (RBAC & Access Control)</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          การจัดการสิทธิ์การเข้าถึงข้อมูลตามบทบาทผู้ใช้งาน (RBAC) และการแยกสายงานรับผิดชอบตามข้อยกเว้น Table 9
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--navy-800)', fontWeight: 600, fontSize: '15px', marginBottom: '10px' }}>
            <Shield size={18} />
            <span>บทบาทและสายงานของคุณ</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>เจ้าหน้าที่บัญชี (Accountant / AP)</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            รับผิดชอบข้อยกเว้นด้านภาษี ทศนิยม และราคาต่อหน่วย (E05, E09, E16, E28, E29, E30, E31) สามารถอนุมัติผ่าน (Confirm) และสั่งตรวจใหม่ (Resubmit) ได้
          </p>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-autopass)', fontWeight: 600, fontSize: '15px', marginBottom: '10px' }}>
            <Key size={18} />
            <span>ขอบเขตข้อมูลที่เข้าถึงได้ (Scope)</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>ทุกบริษัทในเครือ (All Companies)</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            สิทธิ์ครอบคลุม AAPICO Hitech PCL, AAPICO Amata, และ AAPICO Structural Products
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600 }}>
          เมทริกซ์สิทธิ์ตามการดำเนินการและข้อยกเว้น (Action Permission Matrix)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left' }}>การดำเนินการ</th>
              <th style={{ padding: '10px 16px', textAlign: 'center' }}>เจ้าหน้าที่บัญชี (Accounting)</th>
              <th style={{ padding: '10px 16px', textAlign: 'center' }}>ผู้ตรวจรับ/จัดซื้อ (User)</th>
              <th style={{ padding: '10px 16px', textAlign: 'center' }}>ผู้ดูแลระบบ (Admin)</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'เปิดดูเอกสาร, Rules Table 9 และ PDF', acc: true, buy: true, adm: true },
              { name: 'จัดการข้อยกเว้นปริมาณ/ใบรับ/ลายเซ็น (E06, E12, E13, E17, E26, E34, E35)', acc: false, buy: true, adm: true },
              { name: 'จัดการข้อยกเว้นราคา/ภาษี/คณิตศาสตร์ (E05, E09, E16, E28, E31)', acc: true, buy: false, adm: true },
              { name: 'ยืนยันอนุมัติเอกสาร (Confirm for AP)', acc: true, buy: false, adm: true },
              { name: 'ขอคำอธิบายเพิ่มเติม (Explain)', acc: true, buy: true, adm: true },
              { name: 'ส่งเอกสารตรวจใหม่ (Resubmit to OCR Outbox)', acc: true, buy: true, adm: true },
              { name: 'พักเอกสาร (Hold)', acc: true, buy: true, adm: true },
              { name: 'ส่งข้อมูลเข้าระบบ ERP (AP Interface Posting)', acc: false, buy: false, adm: true }
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{row.name}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{row.acc ? <CheckCircle size={16} color="#059669" style={{ margin: '0 auto' }} /> : '-'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{row.buy ? <CheckCircle size={16} color="#059669" style={{ margin: '0 auto' }} /> : '-'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{row.adm ? <CheckCircle size={16} color="#059669" style={{ margin: '0 auto' }} /> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AuditPage: React.FC = () => {
  const auditLogs = [
    { id: 'LOG-001', time: '2026-10-02 14:20:05', actor: 'Rule Engine', actorId: 'system-rules-engine', action: 'SYSTEM_HOLD', target: 'INV-2026-7734', detail: 'ตรวจพบ Exception E17 (Missing Goods Receipt in Oracle EBS) และ E26 (Missing Signature)' },
    { id: 'LOG-002', time: '2026-10-02 11:45:05', actor: 'Rule Engine', actorId: 'system-rules-engine', action: 'EXECUTION_HALTED', target: 'INV-2026-5510', detail: 'ระงับการทำงานที่กฎ V-02 ตรวจพบ Exception E28 (Line Math Error 50x1200!=75000) บายพาสขั้นตอนค้นหา Oracle' },
    { id: 'LOG-003', time: '2026-10-02 10:15:10', actor: 'Rule Engine', actorId: 'system-rules-engine', action: 'AUTO_PASS', target: 'INV-2026-9042', detail: 'ตรวจผ่าน Table 9 ครบ 9 กฎ สถานะ AUTO_PASS ยืนยันสมบูรณ์' },
    { id: 'LOG-004', time: '2026-10-01 16:00:10', actor: 'Rule Engine', actorId: 'system-rules-engine', action: 'FLAG_MANUAL_REVIEW', target: 'INV-2026-6619', detail: 'ตรวจพบ Exception E06 (Quantity Exceeds Received) และ E09 (Branch Mismatch)' },
    { id: 'LOG-005', time: '2026-10-01 09:30:16', actor: 'Rule Engine', actorId: 'system-rules-engine', action: 'RULE_TRIGGER', target: 'INV-2026-8821', detail: 'ตรวจพบ Exception E05 (Price Variance) ในกฎ V-07 และ E16 ในกฎ V-03' },
    { id: 'LOG-006', time: '2026-10-01 09:30:15', actor: 'AIVA Vision OCR', actorId: 'system-ocr-engine', action: 'EXTRACT_SNAPSHOT', target: 'INV-2026-8821', detail: 'ประมวลผล OCR สกัดข้อมูล Table 9 Snapshot (Schema 1.0, Standard 6.2)' }
  ];

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy-900)' }}>บันทึกประวัติและตรวจสอบย้อนกลับ (Immutable Audit Logs)</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          บันทึกกิจกรรมและเหตุการณ์ทุกรายการพร้อมระบุตัวตนจริง (Immutable ID), เวลา ISO 8601, และรหัสกฎ Table 9
        </p>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '10px 14px' }}>Log ID</th>
              <th style={{ padding: '10px 14px' }}>วันและเวลา (ISO)</th>
              <th style={{ padding: '10px 14px' }}>ผู้ดำเนินการ (Actor ID)</th>
              <th style={{ padding: '10px 14px' }}>การกระทำ (Action)</th>
              <th style={{ padding: '10px 14px' }}>เอกสารเป้าหมาย</th>
              <th style={{ padding: '10px 14px' }}>รายละเอียดและข้อยกเว้น</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{log.id}</td>
                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{log.time}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--navy-800)' }}>{log.actor}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.actorId}</div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ backgroundColor: 'var(--bg-muted)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600 }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{log.target}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{log.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ApiDocsPage: React.FC = () => {
  return (
    <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy-900)' }}>ข้อกำหนดการเชื่อมต่อ API (Domain Contract & Ingestion Guide)</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          แนวทางการส่งผลตรวจ Table 9 Snapshot (Schema Version 1.0, Standard 6.2 as-built) เข้าสู่ Web Portal
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Core Principles Card */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <BookOpen size={17} color="var(--navy-800)" />
            หลักการสถาปัตยกรรม (Architectural Invariants)
          </h3>
          <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '20px', margin: 0 }}>
            <li>แยกขอบเขต: <code>source document -&gt; extraction -&gt; deterministic validation/matching -&gt; immutable snapshot -&gt; human workflow</code></li>
            <li>Web Portal มีหน้าที่แสดงผลและจัดการกระบวนการของมนุษย์ (Human Review / AP Workflow) โดย<strong>ไม่คำนวณผล matching ใหม่</strong></li>
            <li>การอนุมัติ (Confirm) ของผู้ใช้เป็นสถานะขั้นตอนงาน (Workflow Status) <strong>ห้ามเปลี่ยนผลตรวจ OCR เดิมเป็น PASS ย้อนหลัง</strong></li>
            <li>กฎที่ไม่ได้ประเมินต้องคงสถานะ <code>not_evaluated</code> ห้ามสร้างผล PASS สมมติ</li>
          </ul>
        </div>

        {/* Endpoint 1 */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Terminal size={17} color="var(--navy-800)" />
            1. Endpoint รับ Snapshot ผลตรวจ Table 9 (Ingestion API)
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            ส่ง HTTP POST พร้อม JSON Payload ตาม Schema Version 1.0:
          </p>
          <pre style={{ backgroundColor: '#0F172A', color: '#38BDF8', padding: '12px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto' }}>
            POST /api/portal/v1/ingest
          </pre>
        </div>

        {/* Endpoint 2: Action Outbox */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Layers size={17} color="var(--navy-800)" />
            2. Action Outbox สำหรับรับงานส่งตรวจใหม่ (Resubmit / Rerun Outbox)
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            เมื่อผู้ใช้สั่ง Resubmit หรือ Rerun ระบบจะสร้างรายการ Durable Outbox เพื่อให้ OCR Engine ดึงไปประมวลผลต่อใน Revision ถัดไป:
          </p>
          <pre style={{ backgroundColor: '#0F172A', color: '#E2E8F0', padding: '14px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', lineHeight: 1.5 }}>
{`GET /api/portal/v1/outbox/pending
Response: [
  {
    "id": "outbox-1727931600000",
    "document_id": "INV-2026-001",
    "action": "RESUBMIT",
    "current_revision": 1,
    "new_receipt_hint": "RC-881924",
    "status": "PENDING"
  }
]`}
          </pre>
        </div>

        {/* cURL Example */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FileCode size={17} color="var(--navy-800)" />
            3. ตัวอย่างคำสั่ง Ingestion cURL
          </h3>
          <pre style={{ backgroundColor: '#0F172A', color: '#E2E8F0', padding: '14px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', lineHeight: 1.5 }}>
{`curl -X POST http://127.0.0.1:8010/api/portal/v1/ingest \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '{
    "schema_version": "1.0",
    "standard_version": "6.2",
    "event_id": "EV-20261003-01",
    "source_system": "OCR_VISION_LITELLM",
    "invoice": {
      "invoice_num": "INV-2026-8821",
      "invoice_date": "01/10/2026",
      "supplier_name": "บจก. สยาม ออโต้พาร์ท เทคโนโลยี",
      "po_number": "PO-2026-09412",
      "currency": "THB",
      "sub_total": 125400.00,
      "vat": 8778.00,
      "grand_total": 134178.00
    },
    "rules": [
      { "rule_id": "V-01", "result": "PASS" },
      { "rule_id": "V-02", "result": "PASS" },
      { "rule_id": "V-03", "result": "PASS", "exception_code": "E16" },
      { "rule_id": "V-04", "result": "PASS" },
      { "rule_id": "V-05", "result": "PASS" },
      { "rule_id": "V-06", "result": "PASS" },
      { "rule_id": "V-07", "result": "FAIL", "exception_code": "E05" },
      { "rule_id": "V-08", "result": "PASS" },
      { "rule_id": "V-09", "result": "PASS" }
    ]
  }'`}
          </pre>
        </div>
      </div>
    </div>
  );
};
