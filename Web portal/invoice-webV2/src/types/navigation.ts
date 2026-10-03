import type { InvoiceStatus } from './invoice';

export type MainNavPage = 'queue' | 'permissions' | 'audit' | 'api-docs';

export type ViewLayoutMode = 'split' | 'summary-table';

export type DetailTabType = 'exceptions' | 'line-items' | 'rules' | 'history' | 'raw-json';

export interface QueueFilters {
  searchTerm: string;
  company: string;
  statusFilter: InvoiceStatus | 'ALL' | 'CONFIRMED';
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'urgency';
}

export interface KpiMetrics {
  total: number;
  autoPass: number;
  review: number;
  hold: number;
  manualReview: number;
  duplicate: number;
  confirmed?: number;
}
