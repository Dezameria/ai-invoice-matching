# Current State — AIVA Invoice Portal V2 (Web Portal)

**Timestamp:** 2026-10-03T08:51:00+07:00  
**Repository Corpus:** Dezameria/ai-invoice-matching  
**Workspace:** `Web portal/invoice-webV2`

---

## 1. System Overview & Scope
AIVA Invoice Portal V2 is a modern React 19 + TypeScript + Vite web application built to serve as the Human Review & 3-Way Invoice Matching Verification interface for AAPICO Hitech PCL and subsidiaries.

### Architecture Boundaries:
1. **Upstream Ingestion:** Receives immutable Table 9 result snapshots and PDF artifacts from OCR/Vision & Rules Engine (Standard 6.2 as-built, Schema 1.0).
2. **Portal Responsibility:** Renders immutable evidence, line-item 3-way matching comparisons, rule evaluations (V-01 through V-09), exception routing, and manages human workflow (Confirm, Hold, Reject, Resubmit, Rerun, Explain) with optimistic concurrency.
3. **Strict Invariant:** Portal NEVER re-runs OCR or recalculates matching; human actions NEVER rewrite OCR verification results to PASS or modify upstream evidence.

---

## 2. Status Separation across 3 Axes
- **Verification Status (Engine Result):** `Auto-pass`, `Review`, `Hold`, `Manual Review`
- **Workflow Status (Human / AP Lifecycle):** `Pending Review`, `Confirmed`, `Rejected`, `Resubmitted`, `On Hold`, `Posted`
- **Processing Status:** `Completed`, `Running`, `Queued`, `Failed`
- **Duplicate Flag:** `isDuplicate: boolean`

---

## 3. Table 9 Rules & Decision Model (Standard 6.2 as-built)
- Canonical Rules:
  - `V-01`: Header, lines & page completeness (`E13` Medium)
  - `V-02`: Line-item math (`E28` High, halts before Oracle lookup)
  - `V-03`: Document totals & VAT 7% tolerance (`E31` High / `E16` Low)
  - `V-04`: Active Goods Receipt verification (`E17` High, `E35` Medium, `MANUAL` if rows >= 50)
  - `V-05`: Customer entity & ORG_ID match (`E09` Medium, `MANUAL` if master unavailable)
  - `V-06`: Signatures presence - Deliverer & Receiver (`E26` High for receiver, Medium for supplier)
  - `V-07`: 3-Way Line Match - Item, Line, UOM, Price tolerance (`E05` Medium, `E12` Medium, `E29` Low, `E30` High)
  - `V-08`: Quantity match - Billed vs Received (`E06` High, `E34` Medium partial billing)
  - `V-09`: Receipt total match vs Invoice subtotal (`E31` High)
- Rule Results: `PASS`, `FAIL`, `MANUAL`, `not_evaluated`

---

## 4. Current Implementation Status
- React 19 + Vite + TypeScript application running locally on port 5180.
- Modern responsive layout with Split master-detail and full summary table modes.
- Integrated PDF parallel viewer with page jump, zoom controls, and digital signature detection overlays.
- Full Table 9 alignment, 3-axis status model, and optimistic concurrency implemented.
- **Verification:**
  - TypeScript compilation: `npm run build` completed clean (743ms, 0 errors).
  - Linter: `npm run lint` completed clean (0 warnings, 0 errors).
  - Subagent Browser Testing: verified Table 9 tabs, FlowStepper 4 stages, Line Item match levels, halted state (`V-02`), and action modal.
