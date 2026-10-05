#!/usr/bin/env python3
"""sync.py — ดึงข้อมูลอ้างอิงทั้งหมดจาก repo `ai-invoice-matching/` เข้ามาใน portal V5

หลักการของ V5: ทุกหน้าจออ่านจากไฟล์ที่ **generate จาก source of truth ของ repo** เท่านั้น
 portal ไม่พิมพ์ผลตรวจเอง ไม่ copy ข้อความมาตรฐานไปวางในโค้ด และไม่ map บริษัทเพิ่มเอง

แหล่งข้อมูลที่ดึง (อ่านอย่างเดียว — sync ไม่เขียนกลับเข้า repo เด็ดขาด):

| id            | path ใน repo                                        | → ไฟล์ generated                       |
|---------------|-----------------------------------------------------|----------------------------------------|
| master-data   | OCR service/n8n/app/core/master_data.py             | src/data/master-data.js                |
| repo-docs     | docs/*.md                                           | src/data/repo-docs.js                  |
| rules-engine  | OCR service/n8n/app/core/rules.py                   | src/data/sources.js (hash + ที่มาจาก)  |
| mockup-tokens | Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html | src/data/design-tokens.js              |

ใช้งาน:
    python tools/sync.py                 # generate ทุกไฟล์ + พิมพ์สรุป
    python tools/sync.py --check         # ไม่เขียนไฟล์ ล้ม (exit 1) ถ้า generated ไฟล์เก่ากว่า source
    python tools/sync.py --repo-root ..  # ระบุ repo root เอง (default: เดินหาโฟลเดอร์ "OCR service")
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# --------------------------------------------------------------------------- #
# แหล่งข้อมูลที่ sync (id = คีย์ที่ใช้ใน src/data/sources.js)
# --------------------------------------------------------------------------- #
REPO_DOCS = [
    ("architecture", "docs/system-architecture.md", "สถาปัตยกรรมและ data pipeline"),
    ("rules-standard", "docs/matching-rules-standard-v6.2.md", "กฎ V-01–V-09 + Decision Matrix + D1–D6"),
    ("api-reference", "docs/api-reference.md", "REST/SSE endpoint ที่ portal ต้องรองรับ"),
    ("integrations", "docs/integrations.md", "Oracle ORDS MCP · LiteLLM Vision · Paperless-ngx"),
    ("docs-index", "docs/README.md", "สารบัญเอกสารของ repo"),
]

MASTER_DATA_PATH = "OCR service/n8n/app/core/master_data.py"
RULES_PATH = "OCR service/n8n/app/core/rules.py"
MOCKUP_PATH = "Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html"
MODELS_PATH = "OCR service/n8n/app/core/models.py"

GENERATED_FILES = [
    "src/data/master-data.js",
    "src/data/repo-docs.js",
    "src/data/design-tokens.js",
    "src/data/sources.js",
]

BANNER = """/* =============================================================
 * GENERATED FILE — ห้ามแก้ไขด้วยมือ (do not hand-edit)
 * Tool   : tools/sync.py
 * Run    : python tools/sync.py
 * Source : {source}
 * Synced : {synced}
 * เนื้อหาในไฟล์นี้ถูกคัด/แปลงจากไฟล์ใน repo ai-invoice-matching โดยตรง
 * ============================================================= */
"""


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def utf8_console() -> None:
    """Windows console มักเป็น cp1252 — ถ้าไม่แก้จะ UnicodeEncodeError ตอนพิมพ์ภาษาไทย"""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        except Exception:
            pass


def find_repo_root(start: Path) -> Path:
    for candidate in [start, *start.parents]:
        if (candidate / "OCR service").is_dir() and (candidate / "docs").is_dir():
            return candidate
    raise SystemExit("✗ ไม่พบ repo root (มองหาโฟลเดอร์ 'OCR service' + 'docs') — ระบุ --repo-root เอง")


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stat_of(root: Path, rel: str) -> dict[str, Any]:
    p = root / rel
    if not p.is_file():
        raise SystemExit(f"✗ ไม่พบไฟล์ใน repo: {rel}")
    st = p.stat()
    text = p.read_text(encoding="utf-8", errors="replace")
    return {
        "path": rel.replace("\\", "/"),
        "bytes": st.st_size,
        "lines": text.count("\n") + 1,
        "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
        "mtime": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).astimezone().isoformat(timespec="seconds"),
        "text": text,
    }


def js(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def write_out(out: Path, content: str, check: bool) -> bool:
    """เขียนไฟล์ generated — โหมด --check ให้เทียบเนื้อหา (ข้าม timestamp) แทนการเขียน"""
    out.parent.mkdir(parents=True, exist_ok=True)
    if not check:
        out.write_text(content, encoding="utf-8")
        return True
    if not out.exists():
        print(f"  ✗ ยังไม่มีไฟล์ generated: {out}")
        return False
    ts = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+\-]\d{2}:\d{2}|Z)")
    strip = lambda s: ts.sub("<TS>", s)
    same = strip(out.read_text(encoding="utf-8")) == strip(content)
    print(f"  {'✓' if same else '✗'} {out.name}" + ("" if same else " — source ใน repo เปลี่ยนแล้ว รัน `python tools/sync.py`"))
    return same


# --------------------------------------------------------------------------- #
# 1) master data (นิติบุคคล + exception as-built + routing)
# --------------------------------------------------------------------------- #
def load_master_data(root: Path):
    """import master_data.py ตรง ๆ (pydantic model) — ไม่ parse เอง เพื่อไม่ให้แปลความผิด"""
    pkg = root / "OCR service" / "n8n"
    target = pkg / "app" / "core" / "master_data.py"
    spec = importlib.util.spec_from_file_location("aiva_master_data", target)
    if spec is None or spec.loader is None:
        raise SystemExit(f"✗ โหลด module ไม่ได้: {target}")
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)  # type: ignore[attr-defined]
    except Exception as err:  # pydantic ไม่ได้ติดตั้งในเครื่องนี้
        print(f"  ! import ผ่าน pydantic ไม่ได้ ({err}) → fallback ไปอ่าน literal ตรงจากไฟล์")
        return parse_master_data_text(target.read_text(encoding="utf-8"))
    return mod


KWARG = re.compile(r"(\w+)\s*=\s*(\[[^\]]*\]|\"[^\"]*\"|'[^']*'|[^,\)]+)")


def parse_master_data_text(text: str):
    """fallback เมื่อ import ไม่ได้ (เครื่องไม่มี pydantic): อ่าน literal ทั้ง 4 ชุดด้วย regex ล้วน

    อ่านเฉพาะสิ่งที่ sync ต้องการ ไม่แปลความเพิ่ม — ถ้ารูปแบบไฟล์ source เปลี่ยนจะล้มทันที
    (ดีกว่าเงียบแล้วได้ master data ครึ่งเดียว)
    """
    entities = []
    for call in re.findall(r"CorporateEntity\(([^)]*)\)", text):
        row: dict[str, Any] = {}
        for key, raw in KWARG.findall(call):
            val = raw.strip().rstrip(",")
            if val.startswith("["):
                row[key] = [x.strip().strip("'\"") for x in re.findall(r"[\"']([^\"']*)[\"']", val)]
            elif val[:1] in "\"'":
                row[key] = val[1:-1]
            elif val.lstrip("-").isdigit():
                row[key] = int(val)
            else:
                row[key] = val
        entities.append(row)

    def literal(name: str) -> Any:
        m = re.search(name + r"[^=]*=\s*([{\[])", text)
        if not m:
            raise SystemExit(f"✗ ไม่พบ {name} ใน master_data.py — รูปแบบ source เปลี่ยนไปจากที่ sync คาดไว้")
        open_ch, close_ch = ("{", "}") if m.group(1) == "{" else ("[", "]")
        depth, i = 0, m.start(1)
        while True:
            ch = text[i]
            if ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    break
            i += 1
        chunk = text[m.start(1) : i + 1]
        if open_ch == "{":  # VALID_EXCEPTION_CODES: dict ที่ key ไม่ quote → สกัดเป็นรายการแทน
            out = {}
            for code, sev, desc in re.findall(r'"(E\d+)":\s*\{[^}]*"severity":\s*"([^"]+)",\s*"desc":\s*"([^"]+)"', chunk):
                out[code] = {"severity": sev, "desc": desc}
            return out
        return json.loads(chunk.replace("'", '"'))

    m_user = re.search(r"USER_TASK_CODES[^=]*=\s*\{([^}]*)\}", text)
    if not m_user:
        raise SystemExit("✗ ไม่พบ USER_TASK_CODES ใน master_data.py")
    bag = {
        "MASTER_ENTITIES": entities,
        "VALID_EXCEPTION_CODES": literal("VALID_EXCEPTION_CODES"),
        "USER_TASK_CODES": sorted(set(re.findall(r'"(E\d+)"', m_user.group(1)))),
        "STANDARD_RULES": [r for r in literal("STANDARD_RULES") if isinstance(r, str) and r.startswith("V-")],
    }
    if not bag["MASTER_ENTITIES"] or not bag["VALID_EXCEPTION_CODES"] or not bag["STANDARD_RULES"]:
        raise SystemExit("✗ อ่าน master data ไม่ครบ — ติดตั้ง pydantic (pip install pydantic) แล้วรันใหม่")
    return SimpleNamespaceMaster(bag)


class SimpleNamespaceMaster:
    """หน้าตาเหมือน module ของ master_data.py (ใช้เฉพาะ attribute ที่ sync ต้องการ)"""

    def __init__(self, bag: dict[str, Any]):
        self._bag = bag

    def __getattr__(self, item: str) -> Any:
        return self._bag[item]


def build_master_data(root: Path, synced: str) -> tuple[str, dict[str, Any]]:
    md = load_master_data(root)
    st = stat_of(root, MASTER_DATA_PATH)

    entities = []
    for e in md.MASTER_ENTITIES:
        get = (lambda k: getattr(e, k)) if hasattr(e, "org_id") else (lambda k: e[k])
        entities.append(
            {
                "orgId": get("org_id"),
                "ouId": get("ou_id"),
                "nameTh": get("name_th"),
                "taxId": get("tax_id"),
                "status": get("status"),
                "postal": get("postal"),
                "branches": list(get("branches")),
                "addressLine": get("address_line") or "",
            }
        )
    active = [e for e in entities if e["status"] == "ACTIVE"]
    codes = dict(md.VALID_EXCEPTION_CODES)
    user_codes = sorted(md.USER_TASK_CODES)
    rules = list(md.STANDARD_RULES)

    meta = {
        "entities": len(entities),
        "active": len(active),
        "unknown": len([e for e in entities if e["status"] == "UNKNOWN"]),
        "revoked": len([e for e in entities if e["status"] == "REVOKED"]),
        "taxIds": len({e["taxId"] for e in entities if e["taxId"]}),
        "exceptionCodes": len(codes),
        "userTaskCodes": len(user_codes),
        "rules": len(rules),
        "source": MASTER_DATA_PATH,
        "sourceSha256": st["sha256"][:12],
        "docstring": (md.__doc__ or "").strip().splitlines()[0] if getattr(md, "__doc__", None) else "",
        "syncedAt": synced,
    }

    body = "\n".join(
        [
            BANNER.format(source=f"repo/{MASTER_DATA_PATH}", synced=synced),
            "/* นิติบุคคลตามที่ rules engine ใช้งานจริง (as-built master snapshot)",
            f" * {meta['docstring']} */",
            f"export const MASTER_ENTITIES = {js(entities)};",
            "",
            "/* รหัสข้อยกเว้น + severity ที่ engine ใช้จริง (ไม่ใช่อันดับในเอกสารมาตรฐาน) */",
            f"export const EXCEPTION_CODES_AS_BUILT = {js(codes)};",
            "",
            "/* code ที่ engine มอบงานให้ 'user' (Receiver) ไม่ใช่ 'accounting' — master_data.py:USER_TASK_CODES */",
            f"export const USER_TASK_CODES = {js(user_codes)};",
            "",
            f"export const STANDARD_RULES = {js(rules)};",
            "",
            f"export const MASTER_META = {js(meta)};",
            "",
        ]
    )
    return body, meta


# --------------------------------------------------------------------------- #
# 2) เอกสารใน repo docs/*.md — คัดทั้งไฟล์ (portal เป็นตัว render ไม่ copy ข้อความซ้ำ)
# --------------------------------------------------------------------------- #
def title_of(md_text: str, fallback: str) -> str:
    m = re.search(r"^#\s+(.+)$", md_text, re.M)
    return m.group(1).strip() if m else fallback


def build_repo_docs(root: Path, synced: str) -> tuple[str, list[dict[str, Any]]]:
    docs = []
    for doc_id, rel, blurb in REPO_DOCS:
        st = stat_of(root, rel)
        docs.append(
            {
                "id": doc_id,
                "title": title_of(st["text"], Path(rel).stem),
                "blurb": blurb,
                "path": rel,
                "bytes": st["bytes"],
                "lines": st["lines"],
                "sha256": st["sha256"],
                "mtime": st["mtime"],
                "body": st["text"],
            }
        )
    slim = [{k: v for k, v in d.items() if k != "body"} for d in docs]
    body = "\n".join(
        [
            BANNER.format(source="repo/" + ", ".join(p for _, p, _ in REPO_DOCS), synced=synced),
            "/* ต้นฉบับเอกสารของ repo (markdown ล้วน — portal เป็นตัว render และแสดง hash ประกอบ)",
            " * ข้อความมาตรฐาน/V-01…V-09 ที่แสดงใน portal คือตัวอักษรในไฟล์นี้ ไม่ได้เขียนซ้ำในโค้ด UI */",
            f"export const REPO_DOCS = {js(docs)};",
            "",
            f"export const REPO_DOCS_INDEX = {js(slim)};",
            "",
        ]
    )
    return body, slim


# --------------------------------------------------------------------------- #
# 3) design tokens จาก mockup v4.4
# --------------------------------------------------------------------------- #
def build_design_tokens(root: Path, synced: str) -> tuple[str, dict[str, Any]]:
    st = stat_of(root, MOCKUP_PATH)
    m = re.search(r":root\s*\{([^}]*)\}", st["text"])
    tokens: dict[str, str] = {}
    if m:
        for name, value in re.findall(r"(--[\w-]+)\s*:\s*([^;]+)", m.group(1)):
            tokens[name] = value.strip()
    fonts = sorted(set(re.findall(r"font-family:\s*([^;}]+)", st["text"])))[:3]
    meta = {
        "source": MOCKUP_PATH,
        "sourceSha256": st["sha256"][:12],
        "tokens": tokens,
        "fonts": fonts,
        "syncedAt": synced,
    }
    body = "\n".join(
        [
            BANNER.format(source=f"repo/{MOCKUP_PATH}", synced=synced),
            "/* ค่าสี/ฟอนต์ที่ portal v5 ใช้ — ลอกมาจาก :root ของ mockup v4.4 (ไม่ตั้งสีใหม่เอง)",
            " * app.css อ้างค่าตามตัวแปรชุดนี้; smoke-test ตรวจว่า hex ใน app.css ตรงกับ mockup จริง */",
            f"export const DESIGN_TOKENS = {js(meta)};",
            "",
        ]
    )
    return body, meta


# --------------------------------------------------------------------------- #
# 4) ทะเบียนแหล่งข้อมูล (provenance) — หน้า "ที่มาข้อมูล" อ่านจากไฟล์นี้
# --------------------------------------------------------------------------- #
def build_sources(root: Path, synced: str, meta: dict[str, Any], docs_index: list[dict[str, Any]], tokens: dict[str, Any]) -> tuple[str, str]:
    entries = []

    def add(sid: str, rel: str, role: str, feeds: list[str], note: str = "") -> None:
        st = stat_of(root, rel)
        entries.append(
            {
                "id": sid,
                "path": st["path"],
                "role": role,
                "feeds": feeds,
                "bytes": st["bytes"],
                "lines": st["lines"],
                "sha256": st["sha256"],
                "mtime": st["mtime"],
                "note": note,
            }
        )

    add(
        "master-data",
        MASTER_DATA_PATH,
        "master data + exception catalog ที่ engine ใช้ตัดสิน",
        ["src/data/master-data.js", "หน้า กฎ & ข้อยกเว้น", "หน้า ข้อมูลหลัก"],
        f"นิติบุคคล {meta['entities']} แถว (ACTIVE {meta['active']}) · exception {meta['exceptionCodes']} รหัส",
    )
    add(
        "rules-engine",
        RULES_PATH,
        " business logic as-built (V-01…V-09, decision, routing)",
        ["src/engine/rules.js (mirror — ใช้เฉพาะ tools)", "src/data/snapshots.js (สร้างตอน build)"],
        "portal ห้าม import engine ตอน runtime — มีเทสต์ no-engine-in-runtime เฝ้าอยู่",
    )
    add(
        "models",
        MODELS_PATH,
        "pydantic schema ของผลลัพธ์ฝั่ง OCR",
        ["src/domain/schema.js (receiving contract)"],
        "contract ของ portal เป็นกระจกของ field ชุดนี้",
    )
    add(
        "mockup",
        MOCKUP_PATH,
        "งานออกแบบหน้าจอ (mockup v4.4) ที่ portal ยึดเป็นแม่แบบ",
        ["src/data/design-tokens.js", "src/styles/app.css"],
        "ค่าสี/ฟอนต์ถูกลอกมาจาก :root ของ mockup — portal ไม่ตั้งชุดสีใหม่เอง",
    )
    for doc_id, rel, blurb in REPO_DOCS:
        add(doc_id, rel, blurb, ["src/data/repo-docs.js", "หน้า คู่มือระบบ", "หน้า กฎ & ข้อยกเว้น (ตารางมาตรฐาน)"])

    registry = {
        "synced_at": synced,
        "tool": "tools/sync.py",
        "repo_root_hint": "../../../",
        "portal_rules": [
            "portal ไม่คำนวณ matching ซ้ำ — อ่าน snapshot ที่ engine ส่งมาเท่านั้น",
            "ข้อความมาตรฐานทั้งหมดถูกคัดจาก docs/*.md ไม่ใช่คนพิมพ์ซ้ำ",
            "sync.py เป็น read-only — ไม่มี path ใดเขียนกลับเข้า repo",
            "ทุกไฟล์ generated มี sha256 ของ source ติดไว้ → เทียบได้ทุกเมื่อด้วย --check",
        ],
        "sources": entries,
        "generated": GENERATED_FILES,
        "designTokens": {k: v for k, v in tokens.items() if k != "tokens"},
    }
    body = "\n".join(
        [
            BANNER.format(source="ทะเบียนแหล่งข้อมูลทั้งหมดใน repo ที่ portal นี้ใช้", synced=synced),
            f"export const SOURCE_REGISTRY = {js(registry)};",
            "",
            "export const SOURCES = SOURCE_REGISTRY.sources;",
            "",
            "export function sourceOf(id) {",
            "  return SOURCE_REGISTRY.sources.find((s) => s.id === id) ?? null;",
            "}",
            "",
        ]
    )
    return body, registry


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #
def main() -> int:
    utf8_console()
    here = Path(__file__).resolve().parent
    portal = here.parent
    ap = argparse.ArgumentParser(description="sync ข้อมูลอ้างอิงจาก repo ai-invoice-matching เข้า portal V5")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--check", action="store_true", help="ไม่เขียนไฟล์ แค่ตรวจว่า generated ไฟล์ยังตรงกับ source")
    args = ap.parse_args()

    root = (args.repo_root or find_repo_root(here)).resolve()
    synced = now_iso()
    print(f"repo root : {root}")
    print(f"โหมด      : {'check (ไม่เขียนไฟล์)' if args.check else 'generate'}")

    ok = True
    artifacts: list[tuple[str, str]] = []

    master_body, meta = build_master_data(root, synced)
    artifacts.append(("src/data/master-data.js", master_body))

    docs_body, docs_index = build_repo_docs(root, synced)
    artifacts.append(("src/data/repo-docs.js", docs_body))

    tokens_body, tokens = build_design_tokens(root, synced)
    artifacts.append(("src/data/design-tokens.js", tokens_body))

    sources_body, registry = build_sources(root, synced, meta, docs_index, tokens)
    artifacts.append(("src/data/sources.js", sources_body))

    for rel, content in artifacts:
        ok = write_out(portal / rel, content, args.check) and ok

    print(
        f"\nสรุป: นิติบุคคล {meta['entities']} (ACTIVE {meta['active']}) · exception {meta['exceptionCodes']} รหัส · "
        f"เอกสาร repo {len(docs_index)} ไฟล์ ({sum(d['lines'] for d in docs_index)} บรรทัด) · design token {len(tokens['tokens'])} ตัว"
    )
    print(f"แหล่งข้อมูล {len(registry['sources'])} รายการ → src/data/sources.js")
    if not ok:
        print("\n✗ generated ไฟล์ไม่ตรงกับ source ใน repo")
        return 1
    print("✓ sync เรียบร้อย")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
