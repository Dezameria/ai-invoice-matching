# Task Plan — AIVA Invoice Portal V2 Improvement

**Timestamp:** 2026-10-03T08:51:00+07:00  
**Target:** Align system with `.agents/skills/aiva-invoice-core` domain specifications and contracts.  
**Status:** COMPLETED

---

## Goals & Objectives
1. **Separate Status Axes:** Disentangle Verification Status (`AUTO_PASS`, `REVIEW`, `HOLD`, `MANUAL_REVIEW`) from Workflow Status (`PENDING_REVIEW`, `CONFIRMED`, `REJECTED`, `RESUBMITTED`, `ON_HOLD`, `POSTED`). Prevent human confirmation from overwriting OCR verification results to PASS.
2. **Canonical Table 9 Rules (V-01 to V-09):** Replace fictional rule IDs and exception codes with the authentic 9 rules and exception codes (`E05`, `E06`, `E09`, `E12`, `E13`, `E16`, `E17`, `E26`, `E28`, `E29`, `E30`, `E31`, `E34`, `E35`), including `not_evaluated` handling and `halted_by` indicators.
3. **Deterministic Routing & Assignment:** Implement proper exception-to-role assignment (`user` vs `accounting`) and decision hierarchy.
4. **4-Stage Pipeline Realignment:** Correct Flow Stepper to represent the 4 architectural phases (Extraction & Basic Rules -> Oracle Lookup -> 3-Way Match -> Human Review & AP Workflow) instead of claiming "Portal ตรวจซ้ำ".
5. **3-Way Match Enhancements:** Enhance line item table with `match_level` (`item_code`, `line_num`, `description`, `first_row_fallback`), ambiguity warnings, candidate count, and PO/receipt line links.
6. **Signature & Page Evidence:** Add V-06 signature detection metadata (`supplier_or_deliverer`, `receiver`, page citations) and page completeness tracking.
7. **Traceability & Versioning:** Enforce `schema_version` (1.0), `standard_version` (6.2), `engine_version`, `validation_round`, `event_id`, and optimistic revision concurrency in actions.
8. **Realistic Synthetic Dataset:** Update mock invoices to reflect real-world Table 9 edge cases (price variance, active receipt missing, quantity exceed, line math halt, clean auto-pass, duplicate).

---

## Step-by-Step Execution Plan
- [x] Step 0: Initialize agent canonical records (`current-state.md`, `task-plan.md`, `errors-and-solutions.md`, `changelog.md`, `work-log.md`).
- [x] Step 1: Update type definitions in `src/types/invoice.ts`, `src/types/workflow.ts`, and `src/types/navigation.ts`.
- [x] Step 2: Update mock datasets in `src/data/mockInvoices.ts` with complete Table 9 rules (V-01 to V-09), exception codes, and realistic domain scenarios.
- [x] Step 3: Fix `src/api/client.ts` to uphold immutable snapshot invariants, separate workflow status transitions from verification status, and enforce concurrency checks.
- [x] Step 4: Enhance UI components:
  - `src/components/common/Badge.tsx` (verification, workflow, duplicate, not_evaluated badges)
  - `src/features/detail/DetailHeader.tsx` (dual badges, versions, signatures & page coverage)
  - `src/features/detail/FlowStepper.tsx` (4 architectural stages, halted indicator)
  - `src/features/tabs/RulesTab.tsx` (Table 9 complete, not_evaluated, exception details)
  - `src/features/tabs/ExceptionsTab.tsx` (authentic exception codes, routing, evidence jump)
  - `src/features/tabs/LineItemsTab.tsx` (match levels, ambiguity notices, variances)
  - `src/features/actions/ActionBar.tsx` (dual status, routing banner, proper actions)
  - `src/features/queue/QueueSidebar.tsx` & `QueueSummaryTable.tsx` (status filters and badges)
  - `src/features/kpi/KpiBar.tsx` (clean metrics breakdown)
  - `src/features/viewer/DocumentViewer.tsx` (signatures markers)
  - `src/features/import/ImportModal.tsx` (Table 9 schema import)
  - `src/App.tsx` (clean state flow, lint-free effect dependencies)
- [x] Step 5: Test and verify TypeScript build (`npm run build`) and linting (`npm run lint`).
- [x] Step 6: Test UI interactions in browser and verify all screens.
- [x] Step 7: Record changelog, work log, and session history in `agent/`.
