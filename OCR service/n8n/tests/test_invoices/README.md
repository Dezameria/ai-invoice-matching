# Synthetic Invoice Test Corpus (`tests/test_invoices`)

ชุด PDF ใบกำกับภาษีสังเคราะห์ + answer key สำหรับทดสอบ end-to-end ของ AIVA PO-INV
Matching Verification System (Standard v6.2) โดยไม่ต้องเชื่อมต่อ Oracle EBS

## Contents

```
_raw/                     Oracle extracts (Query 1A receipts, Query 1B entities)
pdfs/                     155 rendered invoices  (INV-A01..INV-J20)
test_dataset.json         answer key: 155 invoices, expected Table 9 outcome each
build_test_dataset.py     wave 1 generator  (INV-A..E, 55 cases, hand-written expectations)
build_test_dataset_wave2.py  wave 2 generator (INV-F..J, 100 cases, engine-derived expectations)
invoice_engine.py         offline bridge to app.core.rules (Steps 1–4, same as the pipeline)
generate_invoices.py      renders every key entry into pdfs/{invoice_id}.pdf
verify_dataset.py         replays every expected_result through the real rules engine
check_pdfs.py             checks the rendered PDFs against the key (fields present/absent, pages)
requirements-test.txt     test-only deps (fpdf2, pypdf); install into .venv before generating
../../test_invoice_corpus.py      pytest gate that replays the whole corpus offline
```

## Waves

| Wave | IDs | Cases | Expected results |
|------|-----|-------|------------------|
| 1 | `INV-A`–`INV-E` | 55 | hand-written in `build_test_dataset.py`, then recalibrated to the engine |
| 2 | `INV-F`–`INV-J` | 100 | produced by `app.core.rules` at build time (cannot drift) |

Wave 2 categories: `F` valid/tolerated (20), `G` single-rule fail (25),
`H` multi-rule fail (25), `I` intercompany (10), `J` edge/OCR challenges (20).

Exception code coverage across the corpus: E05, E06, E09, E12, E13, E16, E17,
E26, E28, E29, E31, E34, E35. Decision mix: Auto-pass 63, Review 13, Hold 78,
Manual Review 1 (V-04 50-row safety cap).

## Workflow

```bash
# from "OCR service/n8n" (needs the project venv: fpdf2 for PDFs, app/ for the engine)
.venv/Scripts/python.exe -m pip install -r tests/test_invoices/requirements-test.txt
.venv/Scripts/python.exe tests/test_invoices/build_test_dataset_wave2.py   # +100 cases
.venv/Scripts/python.exe tests/test_invoices/verify_dataset.py --fix        # recalibrate key
.venv/Scripts/python.exe tests/test_invoices/generate_invoices.py           # render 155 PDFs
.venv/Scripts/python.exe tests/test_invoices/check_pdfs.py                  # PDF <-> key audit
```

`generate_invoices.py` accepts optional ID prefixes, e.g.
`python generate_invoices.py INV-F INV-J20`.

## CI gate

The corpus is wired into pytest so rules / PDF / key drift breaks an offline test run
(no Oracle, no LiteLLM, about 2 seconds):

```bash
.venv/Scripts/python.exe -m pytest                                  # 9 passed, 2 deselected
.venv/Scripts/python.exe -m pytest tests/test_invoice_corpus.py -q
```

`tests/test_invoice_corpus.py` asserts: 155 unique invoices, every `expected_result`
replays identically through `app.core.rules`, the wave-2 category invariants, exception
code / decision coverage, and that each PDF agrees with its key. Suites that need live
services carry a `live` marker and are deselected by `pytest.ini`; run them with
`pytest -m live`.

## Why expectations are engine-derived

`invoice_engine.run_engine()` feeds each synthetic invoice through
`evaluate_step1 → evaluate_step2 → evaluate_step3 → evaluate_step4_decision` with a
caller-supplied Oracle row set (stored per invoice as `oracle_rows`). That reproduces
`VerificationPipeline.execute_matching_engine` exactly, including both bypass paths:

- `E28` (line math) → Oracle query skipped → V-04…V-09 `not_evaluated`.
- `E17`/`E35`/safety cap → STEP 3 skipped → V-07…V-09 `not_evaluated`.

Consequences worth knowing when reading the key:

- `halted_by` is only ever `V-02` in the current engine; other failures keep it `null`.
- Partial billing (`E34`) always co-occurs with `E31`, because V-09 compares the
  invoice subtotal with the full received value.
- A benign `E16` can appear on a mathematically clean invoice: the engine compares
  `sub_total + vat` unrounded against a 2-decimal `grand_total`, so float noise
  (~1e-11) triggers the Low branch. Those entries say so in `expected_result.notes`.
- Two forgeries are intentionally **undetectable** and must stay Auto-pass:
  `INV-J17` (supplier tax ID digit changed — no rule compares it to Oracle) and
  `INV-J20` (unit prices of two equal-qty receipt lines swapped — price-first
  line matching re-pairs them and the subtotal is unchanged).

## PDF printing details

- Fonts: Tahoma (`C:\Windows\Fonts\tahoma.ttf`) so Thai renders correctly.
  Note: the embedded Tahoma subset has no usable ToUnicode map, so programmatic
  text extraction returns mojibake for Thai while rendering is correct — check
  tools therefore compare ASCII/digit tokens only.
- Layouts: Thai tax invoice, abbreviated tax invoice, English commercial invoice;
  `pdf_hints` adds watermark/speckle noise, two-page continuation, and footer notes.
- Fields the key marks as missing are printed as `—` so the vision extractor is
  forced to report them as absent.

## Secrets

No credentials, live invoice payloads or personal data are stored here; every value
comes from the `_raw/` Oracle extracts or is synthetically altered from them.
