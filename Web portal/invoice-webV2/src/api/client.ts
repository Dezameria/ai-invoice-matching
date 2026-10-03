import type { InvoiceDocument } from '../types/invoice';
import type { KpiMetrics, QueueFilters } from '../types/navigation';
import type { WorkflowActionRequest, WorkflowActionResult, OutboxItem } from '../types/workflow';
import { ENDPOINTS } from './endpoints';
import { initialMockInvoices, calculateKpiMetrics } from '../data/mockInvoices';

export interface ApiClientOptions {
  useMockFallback?: boolean;
}

class InvoiceApiClient {
  private useMockFallback: boolean = true;
  private localInvoices: InvoiceDocument[] = [...initialMockInvoices];
  private localOutbox: OutboxItem[] = [];

  constructor(options?: ApiClientOptions) {
    if (options?.useMockFallback !== undefined) {
      this.useMockFallback = options.useMockFallback;
    }
  }

  setMockMode(enable: boolean) {
    this.useMockFallback = enable;
  }

  getOutbox(): OutboxItem[] {
    return [...this.localOutbox];
  }

  async fetchDocuments(filters?: Partial<QueueFilters>): Promise<InvoiceDocument[]> {
    try {
      if (!this.useMockFallback) {
        const query = new URLSearchParams();
        if (filters?.searchTerm) query.append('q', filters.searchTerm);
        if (filters?.company && filters.company !== 'ALL') query.append('company', filters.company);
        if (filters?.statusFilter && filters.statusFilter !== 'ALL') query.append('status', filters.statusFilter);
        
        const response = await fetch(`${ENDPOINTS.DOCUMENTS}?${query.toString()}`);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return await response.json();
      }
    } catch {
      // Graceful fallback to mock data
      console.warn('Real API unavailable or mock mode enabled. Using local mock dataset.');
    }

    // Filter local mock data
    let result = [...this.localInvoices];
    if (filters?.searchTerm) {
      const q = filters.searchTerm.toLowerCase();
      result = result.filter(inv => 
        inv.summary.invoiceNum.toLowerCase().includes(q) ||
        inv.summary.poNumber.toLowerCase().includes(q) ||
        inv.summary.supplierName.toLowerCase().includes(q)
      );
    }
    if (filters?.company && filters.company !== 'ALL') {
      result = result.filter(inv => inv.summary.company === filters.company);
    }
    if (filters?.statusFilter && filters.statusFilter !== 'ALL') {
      if (filters.statusFilter === 'CONFIRMED') {
        result = result.filter(inv => inv.workflowStatus === 'CONFIRMED');
      } else if (filters.statusFilter === 'DUPLICATE') {
        result = result.filter(inv => inv.isDuplicate || inv.status === 'DUPLICATE');
      } else {
        result = result.filter(inv => inv.verificationStatus === filters.statusFilter);
      }
    }
    return result;
  }

  async fetchDocumentById(id: string): Promise<InvoiceDocument | null> {
    try {
      if (!this.useMockFallback) {
        const response = await fetch(ENDPOINTS.DOCUMENT_DETAIL(id));
        if (response.ok) return await response.json();
      }
    } catch {
      // Fallback
    }
    return this.localInvoices.find(inv => inv.id === id) || null;
  }

  async fetchKpis(company?: string): Promise<KpiMetrics> {
    try {
      if (!this.useMockFallback) {
        const url = company && company !== 'ALL' ? `${ENDPOINTS.KPIS}?company=${company}` : ENDPOINTS.KPIS;
        const res = await fetch(url);
        if (res.ok) return await res.json();
      }
    } catch {
      // Fallback
    }
    const filtered = company && company !== 'ALL' 
      ? this.localInvoices.filter(i => i.summary.company === company)
      : this.localInvoices;
    return calculateKpiMetrics(filtered);
  }

  async executeWorkflowAction(req: WorkflowActionRequest): Promise<WorkflowActionResult> {
    try {
      if (!this.useMockFallback) {
        const res = await fetch(ENDPOINTS.WORKFLOW_ACTION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        });
        if (res.ok) return await res.json();
      }
    } catch {
      // Fallback
    }

    // Local state mutation upholding Core Domain principles:
    // 1. Snapshot from engine is immutable: DO NOT alter verificationStatus or rules
    // 2. Action updates workflowStatus and logs immutable activity
    // 3. Optimistic concurrency check
    const doc = this.localInvoices.find(inv => inv.id === req.documentId);
    if (!doc) {
      return {
        success: false,
        documentId: req.documentId,
        action: req.action,
        newWorkflowStatus: 'UNKNOWN',
        outboxGenerated: false,
        timestamp: new Date().toISOString(),
        message: 'ไม่พบเอกสารที่ระบุ'
      };
    }

    // Optimistic Concurrency check
    if (req.expectedRevision !== doc.summary.validationRound) {
      return {
        success: false,
        documentId: req.documentId,
        action: req.action,
        newWorkflowStatus: doc.workflowStatus,
        outboxGenerated: false,
        timestamp: new Date().toISOString(),
        message: `ข้อขัดแย้งรุ่นเอกสาร (Concurrency Conflict): คาดหวังรอบ #${req.expectedRevision} แต่ปัจจุบันคือรอบ #${doc.summary.validationRound}`
      };
    }

    let outboxCreated = false;
    let outboxId: string | undefined;

    switch (req.action) {
      case 'CONFIRM':
        doc.workflowStatus = 'CONFIRMED';
        break;
      case 'HOLD':
        doc.workflowStatus = 'ON_HOLD';
        break;
      case 'REJECT':
      case 'RETURN':
        doc.workflowStatus = 'REJECTED';
        break;
      case 'RESUBMIT':
      case 'RERUN':
        doc.workflowStatus = 'RESUBMITTED';
        outboxCreated = true;
        outboxId = `outbox-${Date.now()}`;
        this.localOutbox.push({
          id: outboxId,
          documentId: doc.id,
          action: req.action,
          requestedAt: new Date().toISOString(),
          status: 'PENDING',
          targetSystem: 'OCR_VISION_LITELLM',
          payload: {
            external_id: doc.externalId,
            current_revision: doc.summary.validationRound,
            action: req.action,
            notes: req.notes,
            new_receipt_hint: req.newReceiptNum
          }
        });
        break;
      case 'EXPLAIN':
        // Workflow status remains unchanged
        break;
    }

    // Append to immutable audit activity trail
    const actorId = req.actorId || 'acc-somchai.r@aapico.com';
    const actorName = req.requestedBy || 'เจ้าหน้าที่บัญชี (Accountant)';

    doc.activities.unshift({
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: actorName,
      actorId,
      action: req.action,
      detail: req.notes || `ดำเนินการ ${req.action} สถานะขั้นตอนงานเป็น ${doc.workflowStatus}`,
      badgeVariant: req.action === 'CONFIRM' ? 'success' : req.action === 'HOLD' ? 'warning' : req.action === 'REJECT' ? 'danger' : 'info'
    });

    return {
      success: true,
      documentId: req.documentId,
      action: req.action,
      newWorkflowStatus: doc.workflowStatus,
      outboxGenerated: outboxCreated,
      outboxId,
      timestamp: new Date().toISOString(),
      message: `ดำเนินการ ${req.action} สำเร็จแล้ว (สถานะขั้นตอน: ${doc.workflowStatus})`
    };
  }

  async importDocument(newDoc: InvoiceDocument): Promise<boolean> {
    this.localInvoices.unshift(newDoc);
    return true;
  }
}

export const apiClient = new InvoiceApiClient();
