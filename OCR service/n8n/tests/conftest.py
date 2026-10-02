"""Shared pytest setup for the OCR/matching service.

`test_suite.py` is a standalone async script (it drives a TestRunner class and calls
live Oracle/LiteLLM endpoints from main()); it is not a pytest module.
The corpus tooling in tests/test_invoices is imported as sibling modules.
"""
import sys
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = TESTS_DIR.parent

collect_ignore = ["test_suite.py"]

for path in (str(PROJECT_ROOT), str(TESTS_DIR / "test_invoices")):
    if path not in sys.path:
        sys.path.insert(0, path)
