# Errors and Solutions — AIVA Invoice Portal V2

**Timestamp:** 2026-10-03T08:42:00+07:00

---

### ERR-20261003-001: Verification Status Overwritten by Human Action
- **Context:** `executeWorkflowAction` previously set `doc.status = 'AUTO_PASS'` upon user clicking `CONFIRM`, and `doc.status = 'MANUAL_REVIEW'` upon `REJECT`.
- **Cause:** Conflation of Verification Status (OCR Rules Engine deterministic snapshot) with Workflow Status (human approval / review lifecycle).
- **Solution:** Introduce explicit `workflowStatus` field (`PENDING_REVIEW`, `CONFIRMED`, `REJECTED`, `RESUBMITTED`, `ON_HOLD`, `POSTED`) separate from `verificationStatus` (`AUTO_PASS`, `REVIEW`, `HOLD`, `MANUAL_REVIEW`). Confirmation updates `workflowStatus = 'CONFIRMED'` without touching `verificationStatus`.
- **Prevention:** Domain invariant enforced: Portal snapshots from engine are immutable; human actions only create workflow events and transitions.

### ERR-20261003-002: Inconsistent Rule Identifiers & Exception Codes
- **Context:** Mock data used fabricated IDs (`R01`–`R07`) and rule codes as exception codes (`V-03`, `V-09`).
- **Cause:** Lack of alignment with Table 9 (Standard 6.2 as-built) specifications.
- **Solution:** Standardize on Table 9 rule IDs `V-01` through `V-09` and genuine exception codes (`E05`, `E06`, `E09`, `E12`, `E13`, `E16`, `E17`, `E26`, `E28`, `E29`, `E30`, `E31`, `E34`, `E35`).
- **Prevention:** SKILL rule 5: Never interpret exceptions from code alone; always require `standard_version + rule_id + exception_code`.
