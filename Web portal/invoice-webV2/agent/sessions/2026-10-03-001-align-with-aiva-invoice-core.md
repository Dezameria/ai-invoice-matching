# Session 2026-10-03-001: Align System with AIVA Invoice Core

**Session Date:** 2026-10-03T08:52:00+07:00  
**Title:** Align System with AIVA Invoice Core (.agents domain specification)  
**Author:** Antigravity Agent  
**Workspace:** `Web portal/invoice-webV2`

---

## 1. Executive Summary
Adjusted and enhanced `AIVA Invoice Portal V2` (`invoice-webV2`) to fully conform with the domain contracts and architectural invariants defined in `.agents/skills/aiva-invoice-core` (`SKILL.md` and `references/core-domain.md`).

---

## 2. Key Modifications
1. **Status Architecture across 3 Distinct Axes:**
   - Separated `verificationStatus` (`AUTO_PASS`, `REVIEW`, `HOLD`, `MANUAL_REVIEW`) from `workflowStatus` (`PENDING_REVIEW`, `CONFIRMED`, `REJECTED`, `RESUBMITTED`, `ON_HOLD`, `POSTED`).
   - Fixed `ActionBar` and `client.ts` to uphold the core domain invariant: Human confirmation updates `workflowStatus = 'CONFIRMED'` without overwriting or retroactively altering the upstream OCR rules engine verification results to PASS.
2. **Table 9 Canonical Rules (Standard 6.2 as-built):**
   - Implemented rules `V-01` through `V-09` with genuine exception codes (`E05`, `E06`, `E09`, `E12`, `E13`, `E16`, `E17`, `E26`, `E28`, `E29`, `E30`, `E31`, `E34`, `E35`).
   - Added support for `not_evaluated` status (never fabricating PASS when rules were halted or skipped).
   - Added support for `haltedBy: 'V-02'` when line-item math check fails and halts before Oracle query.
3. **4-Stage Pipeline Realignment:**
   - Updated `FlowStepper` to accurately depict the 4 pipeline phases:
     - Step 1: Extraction & Completeness (`V-01`, `V-02`, `V-03`, `V-06`)
     - Step 2: Oracle Master Data & Receipt Lookup (`V-04`, `V-05`)
     - Step 3: Deterministic 3-Way Match (`V-07`, `V-08`, `V-09`)
     - Step 4: Human Review & AP Workflow (Portal Review, Concurrency & Outbox)
4. **Line-Item 3-Way Match & Ambiguity Warning:**
   - Added `matchLevel` (`item_code`, `line_num`, `description`, `first_row_fallback`, `unmatched`).
   - Added ambiguity warning when `first_row_fallback` is used, per domain contract warnings.
5. **V-06 Signature Evidence & Page Coverage:**
   - Captured `supplierOrDeliverer` and `receiver` presence, page numbers, and digital stamp overlays in PDF previewer.
6. **Optimistic Concurrency & Action Outbox:**
   - Added `expectedRevision` check in workflow requests and outbox dispatch for `RESUBMIT` / `RERUN`.

---

## 3. Verification & Validation
- **TypeScript:** `npm run build` executed clean with 0 errors (743ms).
- **Linter:** `npm run lint` (oxlint) passed with 0 warnings and 0 errors.
- **Browser Interaction:** Browser subagent navigated `http://127.0.0.1:5180/`, verified Table 9 tabs, FlowStepper 4 steps, dual status badges, line items, and halted execution case (`INV-2026-005`).
