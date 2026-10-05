#!/usr/bin/env python3
"""รีเจเนอเรต src/data/master-data.js จาก master data จริงของ rules engine.

แหล่งข้อมูล (source of truth ของส่วนนี้):
    OCR service/n8n/app/core/master_data.py   (นิติบุคคล + exception catalog + routing codes)

หลักการ: ตัวแปลง "อ่านอย่างเดียว" — ไม่เดาข้อมูลเพิ่ม ไม่ map บริษัทใหม่
ถ้าอ่าน source ไม่ได้ให้ล้มการทำงาน (exit != 0) ห้ามเขียนไฟล์ที่ยังไม่สมบูรณ์

ใช้งาน:
    python tools/build-master-data.py [--repo-root <path>] [--out <path>]
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

HEADER = """/* =============================================================
 * GENERATED FILE — ห้ามแก้ไขด้วยมือ (do not hand-edit)
 * Source : OCR service/n8n/app/core/master_data.py
 * Tool   : tools/build-master-data.py
 * Run    : python tools/build-master-data.py
 * Standard: AH-IT-DOC-PO-INV-Matching-Standard-v6.2-DRAFT-260930-WT (as-built)
 * Built  : {built}
 * ============================================================= */
"""


def _utf8_stdout() -> None:
    """Windows console มักเป็น cp1252 → Thai/emoji พังระหว่างพิมพ์ผล"""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def find_repo_root(start: Path) -> Path:
    for candidate in [start, *start.parents]:
        if (candidate / "OCR service").is_dir():
            return candidate
    raise SystemExit("ไม่พบโฟลเดอร์ 'OCR service' — ระบุ --repo-root เอง")


def load_source(repo_root: Path):
    core = repo_root / "OCR service" / "n8n" / "app" / "core"
    if not core.is_dir():
        raise SystemExit(f"ไม่พบ path: {core}")
    sys.path.insert(0, str(repo_root / "OCR service" / "n8n"))
    from app.core import master_data as md  # noqa: PLC0415

    return md


def main() -> int:
    _utf8_stdout()
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--out", type=Path, default=here.parent / "src" / "data" / "master-data.js")
    args = ap.parse_args()

    repo_root = args.repo_root or find_repo_root(here)
    md = load_source(repo_root)

    entities = [
        {
            "orgId": e.org_id,
            "ouId": e.ou_id,
            "nameTh": e.name_th,
            "taxId": e.tax_id,
            "status": e.status,
            "postal": e.postal,
            "branches": list(e.branches),
            "addressLine": e.address_line or "",
        }
        for e in md.MASTER_ENTITIES
    ]
    active = [e for e in entities if e["status"] == "ACTIVE"]

    body = {
        "MASTER_ENTITIES": entities,
        "VALID_EXCEPTION_CODES": md.VALID_EXCEPTION_CODES,
        "USER_TASK_CODES": sorted(md.USER_TASK_CODES),
        "STANDARD_RULES": list(md.STANDARD_RULES),
    }

    lines = [
        HEADER.format(built=datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")),
        "/* นิติบุคคลในเครือตามที่ rules engine ใช้งานจริง (as-built master snapshot) */",
        "export const MASTER_ENTITIES = " + json.dumps(body["MASTER_ENTITIES"], ensure_ascii=False) + ";",
        "",
        "/* รหัสข้อยกเว้น Standard 6.2 as-built (severity + คำอธิบายจาก engine) */",
        "export const EXCEPTION_CODES_AS_BUILT = " + json.dumps(body["VALID_EXCEPTION_CODES"], ensure_ascii=False) + ";",
        "",
        "/* code ที่ engine มอบงานให้ 'user' (Receiver) ไม่ใช่ 'accounting' — rules.py:USER_TASK_CODES */",
        "export const USER_TASK_CODES = " + json.dumps(body["USER_TASK_CODES"], ensure_ascii=False) + ";",
        "",
        "export const STANDARD_RULES = " + json.dumps(body["STANDARD_RULES"], ensure_ascii=False) + ";",
        "",
        f"export const MASTER_META = {{ entities: {len(entities)}, active: {len(active)}, "
        f"source: 'OCR service/n8n/app/core/master_data.py' }};",
        "",
    ]

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("\n".join(lines), encoding="utf-8")
    print(f"เขียน {args.out} — นิติบุคคล {len(entities)} แถว (ACTIVE {len(active)}), "
          f"exception {len(body['VALID_EXCEPTION_CODES'])} รหัส, user-task codes {len(body['USER_TASK_CODES'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
