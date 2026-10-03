import React, { useState } from 'react';
import { CheckCircle2, PauseCircle, XCircle, RotateCcw, MessageSquare, ShieldAlert, ArrowRight } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import type { InvoiceDocument } from '../../types/invoice';
import type { WorkflowActionType, WorkflowActionRequest } from '../../types/workflow';

interface ActionBarProps {
  document: InvoiceDocument;
  onExecuteAction: (req: WorkflowActionRequest) => Promise<void>;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  document,
  onExecuteAction
}) => {
  const [activeModal, setActiveModal] = useState<WorkflowActionType | null>(null);
  const [note, setNote] = useState<string>('');
  const [receiptHint, setReceiptHint] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { verificationStatus, workflowStatus, assignedRole, summary } = document;

  const handleOpenAction = (action: WorkflowActionType) => {
    setActiveModal(action);
    setNote('');
    setReceiptHint('');
    setActionError(null);
  };

  const handleConfirmAction = async () => {
    if (!activeModal) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onExecuteAction({
        documentId: document.id,
        action: activeModal,
        expectedRevision: summary.validationRound,
        notes: note,
        newReceiptNum: receiptHint.trim() || undefined,
        requestedBy: assignedRole === 'user' ? 'ฝ่ายจัดซื้อ/คลังสินค้า (User)' : 'เจ้าหน้าที่บัญชี (Accountant)',
        actorId: 'usr-acc-aapico-01'
      });
      setActiveModal(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการทำรายการ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionTitle = (action: WorkflowActionType) => {
    switch (action) {
      case 'CONFIRM': return 'ยืนยันอนุมัติเอกสาร (Confirm Invoice for AP)';
      case 'EXPLAIN': return 'ขอคำอธิบายเพิ่มเติม (Request Explanation)';
      case 'RESUBMIT': return 'ส่งเอกสารตรวจใหม่รอบถัดไป (Resubmit to OCR Outbox)';
      case 'RERUN': return 'รันการประมวลผลซ้ำ (Rerun Evaluation)';
      case 'REJECT': return 'ปฏิเสธเอกสาร / ส่งคืนผู้ขาย (Reject / Return)';
      case 'HOLD': return 'พักเอกสารชั่วคราว (Hold Invoice)';
      case 'RETURN': return 'ส่งคืนเอกสาร (Return Invoice)';
    }
  };

  const getRoleLabel = () => {
    switch (assignedRole) {
      case 'user':
        return 'สายงานจัดซื้อ / ผู้ตรวจรับสินค้า (User)';
      case 'accounting':
        return 'ฝ่ายการเงินและบัญชี (Accounting)';
      case 'none':
        return 'ระบบประมวลผลอัตโนมัติ (System / Auto-pass)';
    }
  };

  const isConfirmed = workflowStatus === 'CONFIRMED';
  const isRejected = workflowStatus === 'REJECTED';

  return (
    <>
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderTop: '1px solid var(--border-subtle)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
          zIndex: 30,
          flexWrap: 'wrap'
        }}
      >
        {/* Left: Dual Status guidance & Assignment */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>ผลตรวจ OCR:</span>
            <Badge verificationStatus={verificationStatus} size="sm" />
          </div>

          <ArrowRight size={14} color="var(--text-muted)" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>ขั้นตอนงาน:</span>
            <Badge workflowStatus={workflowStatus} size="sm" />
          </div>

          <span style={{ color: 'var(--text-muted)' }}>·</span>

          <span style={{ color: 'var(--text-secondary)' }}>
            สายงานรับผิดชอบ: <strong style={{ color: 'var(--text-primary)' }}>{getRoleLabel()}</strong>
          </span>
        </div>

        {/* Right: Workflow Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<MessageSquare size={14} />}
            onClick={() => handleOpenAction('EXPLAIN')}
          >
            ขอคำอธิบาย
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => handleOpenAction('RESUBMIT')}
          >
            ส่งตรวจใหม่ (Outbox)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<PauseCircle size={14} />}
            onClick={() => handleOpenAction('HOLD')}
            disabled={workflowStatus === 'ON_HOLD'}
          >
            พักเอกสาร
          </Button>

          <Button
            variant="danger"
            size="sm"
            icon={<XCircle size={14} />}
            onClick={() => handleOpenAction('REJECT')}
            disabled={isRejected}
          >
            ปฏิเสธ
          </Button>

          <Button
            variant="success"
            size="sm"
            icon={<CheckCircle2 size={14} />}
            onClick={() => handleOpenAction('CONFIRM')}
            disabled={isConfirmed}
          >
            {isConfirmed ? 'อนุมัติแล้ว (Confirmed)' : 'ยืนยันอนุมัติเอกสาร'}
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {activeModal && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={getActionTitle(activeModal)}
          subtitle={`เอกสารเลขที่: ${summary.invoiceNum} · รอบตรวจ #${summary.validationRound}`}
          footer={
            <>
              <Button variant="secondary" size="md" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
                ยกเลิก
              </Button>
              <Button
                variant={activeModal === 'CONFIRM' ? 'success' : activeModal === 'REJECT' ? 'danger' : 'primary'}
                size="md"
                onClick={handleConfirmAction}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการดำเนินการ'}
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {actionError && (
              <div style={{ padding: '10px 12px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-sm)', color: '#DC2626', fontSize: '12px' }}>
                <ShieldAlert size={14} style={{ display: 'inline', marginRight: '4px' }} />
                {actionError}
              </div>
            )}

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {activeModal === 'CONFIRM' && (
                <p>
                  <strong>หลักการระบบ (Domain Invariant):</strong> การยืนยันโดยผู้ใช้จะปรับเปลี่ยนสถานะขั้นตอนงาน (Workflow Status) เป็น <em>CONFIRMED</em> เพื่อส่งต่อไปยังระบบ AP Interface โดย<strong>ไม่แก้ไข</strong>ผลตรวจ OCR หรือ Table 9 ที่บันทึกไว้เดิม
                </p>
              )}
              {activeModal === 'RESUBMIT' && (
                <p>
                  ระบบจะสร้างคำขอใน <strong>Action Outbox</strong> เพื่อแจ้งเตือนให้ Upstream OCR Pipeline ประมวลผลเอกสารรอบใหม่ (Revision #{summary.validationRound + 1})
                </p>
              )}
              {activeModal === 'HOLD' && (
                <p>
                  เอกสารจะถูกเปลี่ยนสถานะงานเป็น <strong>On Hold</strong> เพื่อรอให้แผนกจัดซื้อหรือคลังสินค้าตรวจรับสินค้าและออกใบรับ (GRN) ใน Oracle EBS
                </p>
              )}
              {activeModal === 'REJECT' && (
                <p>
                  เอกสารจะถูกปฏิเสธ (Rejected) พร้อมบันทึกเหตุผลใน Audit Trail แบบไม่สามารถลบได้
                </p>
              )}
              {activeModal === 'EXPLAIN' && (
                <p>
                  ส่งข้อความร้องขอคำอธิบายเพิ่มเติมไปยังสายงานที่รับผิดชอบ
                </p>
              )}
            </div>

            {activeModal === 'RESUBMIT' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  เลขที่ใบรับสินค้าใหม่ (Optional Receipt Hint for Oracle):
                </label>
                <input
                  type="text"
                  value={receiptHint}
                  onChange={e => setReceiptHint(e.target.value)}
                  placeholder="เช่น RC-881924 (ใช้เป็นคำแนะนำสำหรับค้นหาใน Oracle EBS รอบใหม่)"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px'
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                หมายเหตุประกอบการตัดสินใจ (Notes / Required Audit Justification):
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="ระบุเหตุผลประกอบการตัดสินใจ (จะถูกบันทึกใน Immutable Audit Log)..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
