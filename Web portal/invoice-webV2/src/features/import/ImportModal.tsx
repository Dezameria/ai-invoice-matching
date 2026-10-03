import React, { useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import type { InvoiceDocument } from '../../types/invoice';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newDoc: InvoiceDocument) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [invoiceNum, setInvoiceNum] = useState('INV-2026-9950');
  const [supplierName, setSupplierName] = useState('บจก. เคมีภัณฑ์ แอนด์ สารหล่อลื่นไทย');
  const [poNumber, setPoNumber] = useState('PO-2026-11001');
  const [company, setCompany] = useState('AAPICO Hitech PCL');
  const [grandTotal, setGrandTotal] = useState('65000.00');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName] = useState<string | null>('Tax_Invoice_Sample_9950.pdf');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      const amount = parseFloat(grandTotal) || 65000.00;
      const sub = parseFloat((amount / 1.07).toFixed(2));
      const vat = parseFloat((amount - sub).toFixed(2));

      const newDoc: InvoiceDocument = {
        id: `INV-${Date.now()}`,
        externalId: `EXT-${Date.now()}`,
        verificationStatus: 'REVIEW',
        workflowStatus: 'PENDING_REVIEW',
        status: 'REVIEW',
        urgency: 'NORMAL',
        assignedRole: 'accounting',
        summary: {
          invoiceNum: invoiceNum.trim() || 'INV-NEW-001',
          supplierName: supplierName.trim() || 'ผู้ขายใหม่',
          company,
          poNumber: poNumber.trim() || 'PO-NEW-01',
          currency: 'THB',
          subTotal: sub,
          vat: vat,
          grandTotal: amount,
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          validationRound: 1,
          schemaVersion: '1.0',
          standardVersion: '6.2',
          engineVersion: 'Table9-Engine v6.2-20261001',
          eventId: `EV-MANUAL-${Date.now()}`,
          sourceSystem: 'OCR_VISION_LITELLM',
          pdfAvailable: true,
          pdfPages: 1,
          signatures: {
            supplierOrDeliverer: { present: true, page: 1 },
            receiver: { present: true, page: 1 },
            pagesComplete: true
          }
        },
        flowSteps: {
          step1: { title: 'สกัดและตรวจเอกสาร', status: 'ok', note: 'สกัดข้อมูลใบแจ้งหนี้และคณิตศาสตร์สำเร็จ' },
          step2: { title: 'ค้นใบรับและลูกค้า', status: 'ok', note: `พบข้อมูล PO ${poNumber}` },
          step3: { title: 'เทียบ 3-Way Match', status: 'warn', note: 'เอกสารนำเข้าใหม่ รอเจ้าหน้าที่ตรวจคู่มือ' },
          step4: { title: 'Human Review & AP', status: 'warn', note: 'รอการตรวจสอบก่อนส่งต่อระบบ AP Interface' }
        },
        exceptions: [
          {
            code: 'E16',
            ruleId: 'V-03',
            ruleTitle: 'ตรวจสอบยอดเศษทศนิยมภาษีมูลค่าเพิ่มนำเข้า',
            step: 1,
            severity: 'Low',
            responsible: 'เจ้าหน้าที่บัญชี (Accountant)',
            assignedRole: 'accounting',
            message: 'เอกสารนำเข้าใหม่ผ่าน UI ตรวจสอบความถูกต้องของยอดรวมและภาษี 7%',
            evidence: 'นำเข้าโดยผู้ใช้ผ่าน Web Portal'
          }
        ],
        rules: [
          { ruleId: 'V-01', title: 'ความครบถ้วนของข้อมูลหลัก (Header, Lines, Pages)', step: 1, result: 'PASS' },
          { ruleId: 'V-02', title: 'คณิตศาสตร์รายบรรทัด (Line Arithmetic)', step: 1, result: 'PASS' },
          { ruleId: 'V-03', title: 'คณิตศาสตร์ทั้งเอกสารและภาษี (Totals & VAT 7%)', step: 1, result: 'PASS' },
          { ruleId: 'V-04', title: 'ตรวจใบรับสินค้าที่ใช้งานได้ (Active Goods Receipt)', step: 2, result: 'PASS' },
          { ruleId: 'V-05', title: 'ตรวจ Entity ลูกค้าและสาขา (Customer Entity & Master Data)', step: 2, result: 'PASS' },
          { ruleId: 'V-06', title: 'ตรวจลายเซ็นผู้ส่งมอบและผู้รับสินค้า (Required Signatures)', step: 1, result: 'PASS' },
          { ruleId: 'V-07', title: 'การจับคู่รายการสินค้าและราคา 3-Way (Line & Price Match)', step: 3, result: 'PASS' },
          { ruleId: 'V-08', title: 'การจับคู่ปริมาณสินค้า 3-Way (Quantity Match)', step: 3, result: 'PASS' },
          { ruleId: 'V-09', title: 'ตรวจยอดรวมใบรับสินค้ากับยอดใบแจ้งหนี้ (Receipt Total Match)', step: 3, result: 'PASS' }
        ],
        lineItems: [
          {
            lineNum: 1,
            itemDescription: 'รายการสินค้านำเข้าอัตโนมัติ (Imported Item)',
            uom: 'LOT',
            invoiceQty: 1,
            invoiceUnitPrice: sub,
            invoiceAmount: sub,
            poQty: 1,
            poUnitPrice: sub,
            poAmount: sub,
            receiptQty: 1,
            receiptUnitPrice: sub,
            receiptAmount: sub,
            matchStatus: 'EXACT_MATCH',
            matchLevel: 'item_code',
            varianceAmount: 0.00
          }
        ],
        revisions: [
          {
            revision: 1,
            receivedAt: new Date().toISOString(),
            verificationStatus: 'REVIEW',
            workflowStatus: 'PENDING_REVIEW',
            status: 'REVIEW',
            eventId: `EV-MANUAL-${Date.now()}`
          }
        ],
        activities: [
          {
            id: `act-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actor: 'เจ้าหน้าที่บัญชี (Web Portal)',
            actorId: 'usr-portal-import',
            action: 'MANUAL_IMPORT',
            detail: `นำเข้าเอกสารเลขที่ ${invoiceNum} สำเร็จตามมาตรฐาน Standard 6.2`,
            badgeVariant: 'info'
          }
        ],
        rawJsonSnapshot: {
          schema_version: '1.0',
          standard_version: '6.2',
          engine_version: 'Table9-Engine v6.2-20261001',
          source_system: 'PORTAL_MANUAL_IMPORT',
          imported_at: new Date().toISOString(),
          invoice_number: invoiceNum
        }
      };

      onImportSuccess(newDoc);
      setIsProcessing(false);
      onClose();
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="นำเข้าเอกสารใบแจ้งหนี้ (Import Invoice)"
      subtitle="จำลองการอัปโหลดไฟล์ PDF หรือ Table 9 JSON Snapshot เข้าสู่ระบบตรวจ 3-Way Match"
      maxWidth="520px"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose} disabled={isProcessing}>
            ยกเลิก
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? 'กำลังประมวลผล...' : 'นำเข้าเอกสาร'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Upload Box */}
        <div
          style={{
            border: '2px dashed var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-app)',
            cursor: 'pointer'
          }}
        >
          <UploadCloud size={32} color="var(--navy-800)" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            ลากและวางไฟล์ใบแจ้งหนี้ (PDF หรือ Table 9 JSON)
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            รองรับไฟล์ .pdf, .json (Schema Version 1.0, Standard 6.2) สูงสุด 20MB
          </p>
          {fileName && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', backgroundColor: '#EFF6FF', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid #BFDBFE', fontSize: '12px', color: '#1D4ED8' }}>
              <FileText size={13} />
              <span>{fileName}</span>
            </div>
          )}
        </div>

        {/* Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>เลขที่ใบแจ้งหนี้</label>
            <input
              type="text"
              value={invoiceNum}
              onChange={e => setInvoiceNum(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>เลขที่ PO</label>
            <input
              type="text"
              value={poNumber}
              onChange={e => setPoNumber(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>ชื่อผู้ขาย (Supplier)</label>
          <input
            type="text"
            value={supplierName}
            onChange={e => setSupplierName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>บริษัทในเครือ</label>
            <select
              value={company}
              onChange={e => setCompany(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              <option value="AAPICO Hitech PCL">AAPICO Hitech PCL</option>
              <option value="AAPICO Amata Co., Ltd.">AAPICO Amata Co., Ltd.</option>
              <option value="AAPICO Structural Products">AAPICO Structural Products</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>ยอดรวมสุทธิ (THB)</label>
            <input
              type="number"
              value={grandTotal}
              onChange={e => setGrandTotal(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
