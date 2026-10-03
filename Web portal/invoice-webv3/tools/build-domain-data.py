"""Generate assets/data.js from the as-built OCR rules engine master data.

Source of truth (read-only):
  OCR service/n8n/app/core/master_data.py

Run from the repository root with UTF-8 mode (Thai text on Windows):
  $env:PYTHONUTF8='1'
  python "Web portal/invoice-webv3/tools/build-domain-data.py"

The mockup loads assets/data.js as a classic script (no build step, works on file://).
Never hand-edit assets/data.js; re-run this script when the rules engine master data changes.
"""

from __future__ import annotations

import argparse
import ast
import json
import pathlib
import sys

STANDARD = "AH-IT-DOC-PO-INV-Matching-Standard-v6.2-DRAFT-260930-WT (as-built)"


def repo_root(start: pathlib.Path) -> pathlib.Path:
    for base in [start, *start.parents]:
        if (base / "AGENTS.md").exists() and (base / "agent").is_dir():
            return base
    raise SystemExit("not a repository root: " + str(start))


def parse_master(path: pathlib.Path) -> dict:
    tree = ast.parse(path.read_text(encoding="utf-8"))

    entities = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "CorporateEntity":
            kw = {k.arg: ast.literal_eval(k.value) for k in node.keywords}
            entities.append(
                {
                    "org": kw["org_id"],
                    "ou": kw.get("ou_id"),
                    "name": kw["name_th"],
                    "tax": kw["tax_id"],
                    "status": kw["status"],
                    "postal": kw["postal"],
                    "br": kw.get("branches") or [],
                    "addr": kw.get("address_line") or "",
                }
            )

    exc: dict = {}
    user_codes: list[str] = []
    rules: list[str] = []
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        target = node.targets[0].id
        value = ast.literal_eval(node.value)
        if target == "VALID_EXCEPTION_CODES":
            exc = value
        elif target == "USER_TASK_CODES":
            user_codes = sorted(value)
        elif target == "STANDARD_RULES":
            rules = value

    if not entities or not exc or not rules:
        raise SystemExit("master_data.py shape changed; update this generator")

    return {"entities": entities, "exc": exc, "userCodes": user_codes, "rules": rules}


def render(data: dict) -> str:
    def js(value: object) -> str:
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

    lines = [
        "/* =============================================================",
        " * GENERATED FILE — ห้ามแก้ไขด้วยมือ (generated, do not hand-edit)",
        " * Source  : OCR service/n8n/app/core/master_data.py",
        " * Tool    : Web portal/invoice-webv3/tools/build-domain-data.py",
        " * Standard: " + STANDARD,
        " * ============================================================= */",
        "/* นิติบุคคลในเครือ (Master Data) ตามที่ rules engine ใช้งานจริง */",
        "const MASTER = " + js(data["entities"]) + ";",
        "/* รหัสข้อยกเว้น Standard 6.2 as-built: severity + คำอธิบาย */",
        "const EXC62 = " + js(data["exc"]) + ";",
        "/* code ที่ engine มอบหมายให้ user (Receiver) ทำ ไม่ใช่ accounting */",
        "const USER_TASK_CODES = " + js(data["userCodes"]) + ";",
        "const STANDARD_RULES = " + js(data["rules"]) + ";",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    here = pathlib.Path(__file__).resolve()
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--root", type=pathlib.Path, default=None, help="repository root override")
    ap.add_argument("--check", action="store_true", help="exit 1 if generated output differs from file on disk")
    args = ap.parse_args()

    root = repo_root(args.root or here.parent)
    source = root / "OCR service" / "n8n" / "app" / "core" / "master_data.py"
    target = here.parent.parent / "assets" / "data.js"

    out = render(parse_master(source))
    if args.check:
        current = target.read_text(encoding="utf-8") if target.exists() else ""
        if current != out:
            print("stale: re-run without --check", file=sys.stderr)
            return 1
        print("data.js is up to date")
        return 0

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(out, encoding="utf-8")
    print(f"wrote {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
