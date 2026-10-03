export type WorkflowActionType = 
  | 'CONFIRM'
  | 'EXPLAIN'
  | 'RESUBMIT'
  | 'RERUN'
  | 'RETURN'
  | 'REJECT'
  | 'HOLD';

export interface WorkflowActionRequest {
  documentId: string;
  action: WorkflowActionType;
  expectedRevision: number;
  expectedWorkflowVersion?: number;
  reason?: string;
  notes: string;
  requestedBy: string;
  actorId?: string;
  newReceiptNum?: string; // Optional hint for OCR re-lookup against Oracle EBS
}

export interface WorkflowActionResult {
  success: boolean;
  documentId: string;
  action: WorkflowActionType;
  newWorkflowStatus: string;
  outboxGenerated: boolean;
  outboxId?: string;
  timestamp: string;
  message: string;
}

export interface OutboxItem {
  id: string;
  documentId: string;
  action: WorkflowActionType;
  requestedAt: string;
  status: 'PENDING' | 'DISPATCHED' | 'PROCESSED';
  targetSystem: string;
  payload: Record<string, unknown>;
}
