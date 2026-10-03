# Changelog — AIVA Invoice Portal V2

All notable changes to the AIVA Invoice Portal V2 project are documented in this file.
Format based on Keep a Changelog. Time format: ISO 8601 with timezone (`2026-10-03T08:42:00+07:00`).

---

## [Unreleased]
### Added
- Domain contract alignment with `.agents/skills/aiva-invoice-core`.
- Separation of status into 3 distinct axes: Verification Status (`AUTO_PASS`, `REVIEW`, `HOLD`, `MANUAL_REVIEW`) and Workflow Status (`PENDING_REVIEW`, `CONFIRMED`, `REJECTED`, `RESUBMITTED`, `ON_HOLD`, `POSTED`).
- Canonical Table 9 rule evaluation support (`V-01` through `V-09`) with authentic exception codes (`E05`..`E35`) and `not_evaluated` state.
- Support for halted rules (`haltedBy: 'V-02'`) when arithmetic check fails before Oracle query.
- Signature presence metadata tracking (`supplierOrDeliverer`, `receiver`, page citations) and `pagesComplete` flag.
- Line item 3-way match levels (`item_code`, `line_num`, `description`, `first_row_fallback`), ambiguity alerts, and candidate counters.
- Optimistic revision concurrency in workflow action requests.
- Complete canonical mock invoice dataset covering realistic domain test cases.

### Changed
- Refactored `FlowStepper` from misleading "STEP 4: Portal ตรวจซ้ำ" to the 4 architectural phases (Extraction & Basic Rules -> Oracle Lookup -> 3-Way Match -> Human Review & AP Workflow).
- Fixed `ActionBar` to prevent human confirmation from rewriting OCR verification results to `AUTO_PASS`.
- Upgraded `DetailHeader` to display both Verification Badge and Workflow Badge, plus engine/standard versions and signature detection chips.
- Upgraded `RulesTab` to render full Table 9 rules, step filtering, and `not_evaluated` status.
