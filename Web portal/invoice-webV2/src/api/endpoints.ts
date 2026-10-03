/**
 * API Endpoints definition for AIVA Invoice Portal V2
 * Ready to connect with FastAPI backend (/api/portal/v1)
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8010/api/portal/v1';

export const ENDPOINTS = {
  DOCUMENTS: `${API_BASE_URL}/documents`,
  DOCUMENT_DETAIL: (id: string) => `${API_BASE_URL}/documents/${id}`,
  DOCUMENT_PDF: (id: string) => `${API_BASE_URL}/documents/${id}/pdf`,
  KPIS: `${API_BASE_URL}/kpis`,
  INGEST: `${API_BASE_URL}/ingest`,
  IMPORT: `${API_BASE_URL}/imports`,
  WORKFLOW_ACTION: `${API_BASE_URL}/workflow/actions`,
  OUTBOX: `${API_BASE_URL}/workflow/outbox`,
  SYSTEM_SESSION: `${API_BASE_URL}/session`,
} as const;
