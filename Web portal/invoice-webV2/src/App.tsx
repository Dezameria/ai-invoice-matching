import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/layout/Header';
import { ScopeBar } from './components/layout/ScopeBar';
import { KpiBar } from './features/kpi/KpiBar';
import { QueueSidebar } from './features/queue/QueueSidebar';
import { QueueSummaryTable } from './features/queue/QueueSummaryTable';
import { DetailHeader } from './features/detail/DetailHeader';
import { FlowStepper } from './features/detail/FlowStepper';
import { DetailTabs } from './features/detail/DetailTabs';
import { ExceptionsTab } from './features/tabs/ExceptionsTab';
import { LineItemsTab } from './features/tabs/LineItemsTab';
import { RulesTab } from './features/tabs/RulesTab';
import { HistoryTab } from './features/tabs/HistoryTab';
import { JsonTab } from './features/tabs/JsonTab';
import { DocumentViewer } from './features/viewer/DocumentViewer';
import { ActionBar } from './features/actions/ActionBar';
import { ImportModal } from './features/import/ImportModal';
import { PermissionsPage, AuditPage, ApiDocsPage } from './components/layout/AuxiliaryPages';
import { apiClient } from './api/client';
import type { InvoiceDocument, InvoiceStatus } from './types/invoice';
import type { MainNavPage, ViewLayoutMode, DetailTabType, KpiMetrics } from './types/navigation';
import type { WorkflowActionRequest } from './types/workflow';

export const App: React.FC = () => {
  // Navigation & View Layout State
  const [currentPage, setCurrentPage] = useState<MainNavPage>('queue');
  const [viewMode, setViewMode] = useState<ViewLayoutMode>('split');
  const [mockMode, setMockMode] = useState<boolean>(true);

  // Filters State
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'ALL' | 'CONFIRMED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected Invoice & Tab State
  const [selectedId, setSelectedId] = useState<string | null>('INV-2026-001');
  const [activeTab, setActiveTab] = useState<DetailTabType>('exceptions');
  const [showPdf, setShowPdf] = useState<boolean>(true);
  const [evidencePage, setEvidencePage] = useState<number | undefined>(undefined);

  // Modals & Invoices Data State
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [invoices, setInvoices] = useState<InvoiceDocument[]>([]);
  const [kpis, setKpis] = useState<KpiMetrics>({
    total: 0,
    autoPass: 0,
    review: 0,
    hold: 0,
    manualReview: 0,
    duplicate: 0,
    confirmed: 0
  });

  // Load Invoices and KPIs
  const reloadData = useCallback(async () => {
    const docs = await apiClient.fetchDocuments({
      searchTerm,
      company: selectedCompany,
      statusFilter: selectedStatus
    });
    setInvoices(docs);

    const metrics = await apiClient.fetchKpis(selectedCompany);
    setKpis(metrics);

    // If selected document is not in current list, pick first available
    if (docs.length > 0 && (!selectedId || !docs.some(d => d.id === selectedId))) {
      setSelectedId(docs[0].id);
    }
  }, [searchTerm, selectedCompany, selectedStatus, selectedId]);

  useEffect(() => {
    let ignore = false;
    apiClient.fetchDocuments({
      searchTerm,
      company: selectedCompany,
      statusFilter: selectedStatus
    }).then(docs => {
      if (!ignore) {
        setInvoices(docs);
        if (docs.length > 0 && (!selectedId || !docs.some(d => d.id === selectedId))) {
          setSelectedId(docs[0].id);
        }
      }
    });

    apiClient.fetchKpis(selectedCompany).then(metrics => {
      if (!ignore) setKpis(metrics);
    });

    return () => {
      ignore = true;
    };
  }, [searchTerm, selectedCompany, selectedStatus, mockMode, selectedId]);

  const selectedDocument = useMemo(() => {
    return invoices.find(inv => inv.id === selectedId) || invoices[0] || null;
  }, [invoices, selectedId]);

  const handleSelectInvoice = (id: string) => {
    setSelectedId(id);
    const target = invoices.find(inv => inv.id === id);
    if (target && target.exceptions.length === 0) {
      setActiveTab('line-items');
    } else {
      setActiveTab('exceptions');
    }
  };

  const handleExecuteAction = async (req: WorkflowActionRequest) => {
    await apiClient.executeWorkflowAction(req);
    await reloadData();
  };

  const handleImportSuccess = (newDoc: InvoiceDocument) => {
    apiClient.importDocument(newDoc);
    reloadData();
    setSelectedId(newDoc.id);
    setActiveTab('exceptions');
  };

  const handleJumpToEvidence = (page?: number) => {
    setShowPdf(true);
    setEvidencePage(page || 1);
  };

  const handleToggleMockMode = () => {
    const next = !mockMode;
    setMockMode(next);
    apiClient.setMockMode(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* 1. Header Navigation */}
      <Header
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        mockMode={mockMode}
        onToggleMockMode={handleToggleMockMode}
      />

      {/* Main Content Area based on Nav */}
      {currentPage === 'permissions' && <PermissionsPage />}
      {currentPage === 'audit' && <AuditPage />}
      {currentPage === 'api-docs' && <ApiDocsPage />}

      {currentPage === 'queue' && (
        <>
          {/* 2. Scope & Company Selector */}
          <ScopeBar
            selectedCompany={selectedCompany}
            onSelectCompany={setSelectedCompany}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenImport={() => setIsImportOpen(true)}
          />

          {/* 3. KPI Metrics Overview */}
          <KpiBar
            metrics={kpis}
            selectedStatus={selectedStatus}
            onSelectStatus={setSelectedStatus}
          />

          {/* 4. Main Body: Split Master-Detail or Full-Width Summary Table */}
          {viewMode === 'summary-table' ? (
            <QueueSummaryTable
              invoices={invoices}
              onOpenInvoice={id => {
                handleSelectInvoice(id);
                setViewMode('split');
              }}
            />
          ) : (
            <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
              {/* Left Column: Document Queue */}
              <QueueSidebar
                invoices={invoices}
                selectedId={selectedId}
                onSelect={handleSelectInvoice}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />

              {/* Center Column: Detailed Document Workspace */}
              <main style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)', minWidth: 0 }}>
                {selectedDocument ? (
                  <>
                    {/* Invoice Header */}
                    <DetailHeader
                      document={selectedDocument}
                      showPdf={showPdf}
                      onTogglePdf={() => setShowPdf(prev => !prev)}
                    />

                    {/* 4-Step Rule Flow Bar */}
                    <FlowStepper flowSteps={selectedDocument.flowSteps} />

                    {/* 5 Tabs Switcher */}
                    <DetailTabs
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      exceptionsCount={selectedDocument.exceptions.length}
                      lineItemsCount={selectedDocument.lineItems.length}
                      rulesCount={selectedDocument.rules.length}
                    />

                    {/* Tab Body Content */}
                    <div style={{ padding: '20px 24px', flex: 1 }}>
                      {activeTab === 'exceptions' && (
                        <ExceptionsTab
                          exceptions={selectedDocument.exceptions}
                          onJumpToEvidence={handleJumpToEvidence}
                        />
                      )}
                      {activeTab === 'line-items' && (
                        <LineItemsTab
                          lineItems={selectedDocument.lineItems}
                          summary={selectedDocument.summary}
                        />
                      )}
                      {activeTab === 'rules' && (
                        <RulesTab rules={selectedDocument.rules} />
                      )}
                      {activeTab === 'history' && (
                        <HistoryTab
                          revisions={selectedDocument.revisions}
                          activities={selectedDocument.activities}
                        />
                      )}
                      {activeTab === 'raw-json' && (
                        <JsonTab data={selectedDocument.rawJsonSnapshot} />
                      )}
                    </div>

                    {/* Sticky Action Decision Bar */}
                    <ActionBar
                      document={selectedDocument}
                      onExecuteAction={handleExecuteAction}
                    />
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '15px', fontWeight: 600 }}>ไม่มีเอกสารที่เลือก</p>
                    <p style={{ fontSize: '13px', marginTop: '6px' }}>กรุณาเลือกเอกสารจากคิวทางซ้ายมือ หรือคลิกปุ่ม "นำเข้าเอกสาร" ด้านบน</p>
                  </div>
                )}
              </main>

              {/* Right Column: PDF Canvas Viewer */}
              {showPdf && selectedDocument && (
                <DocumentViewer
                  document={selectedDocument}
                  onClose={() => setShowPdf(false)}
                  highlightPage={evidencePage}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Import Modal Dialog */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default App;
