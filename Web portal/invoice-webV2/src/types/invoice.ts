/**
 * AIVA Invoice Matching Domain Types
 * Based on AIVA Domain Contract (Standard 6.2 as-built, Schema 1.0)
 */

// Verification Status: Deterministic output of OCR & Rules Engine
export type VerificationStatus = 'AUTO_PASS' | 'REVIEW' | 'HOLD' | 'MANUAL_REVIEW';

// Workflow Status: Human review and ERP/AP lifecycle state
export type WorkflowStatus = 
  | 'PENDING_REVIEW'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'RESUBMITTED'
  | 'ON_HOLD'
  | 'POSTED';

// Legacy/Unified status representation for filter bars
export type InvoiceStatus = VerificationStatus | 'DUPLICATE';

export type SeverityLevel = 'High' | 'Medium' | 'Low';

export type Table9RuleId = 
  | 'V-01'
  | 'V-02'
  | 'V-03'
  | 'V-04'
  | 'V-05'
  | 'V-06'
  | 'V-07'
  | 'V-08'
  | 'V-09';

export type RuleResult = 'PASS' | 'FAIL' | 'MANUAL' | 'not_evaluated';

export type ExceptionCode = 
  | 'E05' // Unit price diff exceeds tolerance (V-07)
  | 'E06' // Invoice qty > received qty (V-08)
  | 'E09' // Customer tax ID or branch/address mismatch (V-05)
  | 'E12' // UOM mismatch (V-07)
  | 'E13' // Header, lines or page missing/incomplete (V-01)
  | 'E16' // VAT diff within acceptable tolerance (V-03)
  | 'E17' // Missing active goods receipt qty > 0 (V-04)
  | 'E26' // Signature missing: receiver or supplier (V-06)
  | 'E28' // Line arithmetic error (V-02, halts before Oracle)
  | 'E29' // Price diff within tolerance <=1% and <=200 THB (V-07)
  | 'E30' // Line item not found in receipt/PO (V-07)
  | 'E31' // Grand total or subtotal arithmetic mismatch (V-03 / V-09)
  | 'E34' // Partial billing: invoice qty < received qty (V-08)
  | 'E35'; // Multiple receipt numbers detected (V-04)

export type AssignedRole = 'accounting' | 'user' | 'none';

export type MatchStatus = 'EXACT_MATCH' | 'PRICE_MISMATCH' | 'QTY_MISMATCH' | 'MISSING_GRN' | 'UNMATCHED';

export type MatchLevel = 'item_code' | 'line_num' | 'description' | 'first_row_fallback' | 'unmatched';

export interface SignatureStatus {
  supplierOrDeliverer: {
    present: boolean;
    page?: number;
  };
  receiver: {
    present: boolean;
    page?: number;
  };
  pagesComplete: boolean;
}

export interface InvoiceSummary {
  invoiceNum: string;
  supplierName: string;
  company: string;
  poNumber: string;
  releaseNumber?: string;
  receiptNumber?: string;
  receiverName?: string;
  orgId?: string;
  supplierTaxId?: string;
  customerTaxId?: string;
  customerAddress?: string;
  currency: string;
  subTotal: number;
  vat: number;
  grandTotal: number;
  invoiceDate: string;
  dueDate: string;
  validationRound: number;
  schemaVersion: string; // e.g. "1.0"
  standardVersion: string; // e.g. "6.2"
  engineVersion: string; // e.g. "Table9-Engine v6.2-20261001"
  eventId: string;
  sourceSystem: string;
  haltedBy?: 'V-02';
  pdfAvailable: boolean;
  pdfPages: number;
  signatures: SignatureStatus;
}

export interface LineItemMatch {
  lineNum: number;
  itemDescription: string;
  itemCode?: string;
  uom: string;
  
  // Invoice Side
  invoiceQty: number;
  invoiceUnitPrice: number;
  invoiceAmount: number;
  
  // PO Side
  poQty: number;
  poUnitPrice: number;
  poAmount: number;
  poLine?: number;
  
  // Receipt (GRN) Side
  receiptQty?: number;
  receiptUnitPrice?: number;
  receiptAmount?: number;
  receiptNum?: string;
  receiptLine?: number;
  
  // Match Analysis & Evidence
  matchStatus: MatchStatus;
  matchLevel: MatchLevel;
  candidateCount?: number;
  ambiguityWarning?: string;
  varianceAmount: number;
  notes?: string;
}

export interface RuleException {
  code: ExceptionCode;
  ruleId: Table9RuleId;
  ruleTitle: string;
  step: 1 | 2 | 3;
  severity: SeverityLevel;
  responsible: string;
  assignedRole: AssignedRole;
  message: string;
  evidence: string;
  evidencePage?: number;
  suggestedAction?: string;
}

export interface RuleEvaluation {
  ruleId: Table9RuleId;
  title: string;
  step: 1 | 2 | 3;
  result: RuleResult;
  details?: string;
  exceptionCode?: ExceptionCode;
  severity?: SeverityLevel;
  evidence?: string;
  page?: number;
}

export interface PipelineFlowSteps {
  step1: { title: string; status: 'ok' | 'warn' | 'bad' | 'skip'; note: string };
  step2: { title: string; status: 'ok' | 'warn' | 'bad' | 'skip'; note: string };
  step3: { title: string; status: 'ok' | 'warn' | 'bad' | 'skip'; note: string };
  step4: { title: string; status: 'ok' | 'warn' | 'bad' | 'skip'; note: string };
}

export interface InvoiceDocument {
  id: string;
  externalId: string;
  verificationStatus: VerificationStatus;
  workflowStatus: WorkflowStatus;
  // Computed / composite status for backward compatibility
  status: InvoiceStatus;
  isDuplicate?: boolean;
  duplicateOf?: string;
  urgency: 'HIGH' | 'MEDIUM' | 'NORMAL';
  assignedRole: AssignedRole;
  summary: InvoiceSummary;
  flowSteps: PipelineFlowSteps;
  exceptions: RuleException[];
  rules: RuleEvaluation[];
  lineItems: LineItemMatch[];
  poSummary?: {
    poNumber: string;
    totalAmount: number;
    currency: string;
    buyerName: string;
    orderDate: string;
    status: string;
  };
  grnSummary?: {
    receiptNumber: string;
    receiverName: string;
    receiptDate: string;
    totalReceivedAmount: number;
  };
  revisions: {
    revision: number;
    receivedAt: string;
    verificationStatus: VerificationStatus;
    workflowStatus: WorkflowStatus;
    status: InvoiceStatus;
    eventId: string;
    note?: string;
  }[];
  activities: {
    id: string;
    timestamp: string;
    actor: string;
    actorId?: string;
    action: string;
    detail: string;
    badgeVariant?: 'success' | 'warning' | 'danger' | 'info';
  }[];
  rawJsonSnapshot: Record<string, unknown>;
}
