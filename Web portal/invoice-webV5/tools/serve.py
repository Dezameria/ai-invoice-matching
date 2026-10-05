#!/usr/bin/env python3
"""เซิร์ฟเวอร์ static สำหรับ portal (ไม่มี build step)

ใช้งาน:
    python tools/serve.py [--port 8080] [--host 127.0.0.1] [--open]

เหตุผลที่ต้องรันผ่านเซิร์ฟเวอร์:เบราว์เซอร์บล็อก ES modules เมื่อเปิด index.html
ด้วย file:// (CORS) — เครื่องมือนี้เสิร์ฟโฟลเดอร์ portal พร้อม header ที่ถูกต้อง
"""

from __future__ import annotations

import argparse
import functools
import os
import socket
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NO_CACHE = (".html", ".js", ".mjs", ".css", ".json")


class Handler(SimpleHTTPRequestHandler):
    server_version = "AIVA-Portal/4.0"

    def end_headers(self) -> None:  # ปิด cache ระหว่างพัฒนา (แก้โค้ดแล้วเห็นทันที)
        self.send_header("Cache-Control", "no-store, must-revalidate")
        ext = os.path.splitext(self.path.split("?")[0])[1].lower()
        if ext in NO_CACHE:
            self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("  %s - %s\n" % (self.address_string(), fmt % args))


def utf8_console() -> None:
    """Windows console มักเป็น cp1252 — ถ้าไม่แก้จะ UnicodeEncodeError ตอนพิมพ์ภาษาไทย"""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except Exception:
            pass


def main() -> int:
    utf8_console()
    ap = argparse.ArgumentParser(description="เสิร์ฟ AIVA Invoice Review Portal v5 (no-build ES modules)")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--open", action="store_true", help="เปิดเบราว์เซอร์อัตโนมัติ")
    args = ap.parse_args()

    try:
        socket.inet_aton(args.host)
    except OSError:
        print(f"✗ host ไม่ถูกต้อง: {args.host}")
        return 2

    if not os.path.isfile(os.path.join(ROOT, "index.html")):
        print(f"✗ ไม่พบ index.html ใน {ROOT} — เช็คว่ารันจากโฟลเดอร์ portal หรือไม่")
        return 2

    handler = functools.partial(Handler, directory=ROOT)
    try:
        httpd = ThreadingHTTPServer((args.host, args.port), handler)
    except OSError as exc:
        print(f"✗ ผูกพอร์ต {args.host}:{args.port} ไม่ได้ ({exc}) — ลอง --port อื่น")
        return 2

    url = f"http://{args.host}:{args.port}/index.html"
    print("AIVA Invoice Review Portal v5")
    print(f"  โฟลเดอร์ : {ROOT}")
    print(f"  เปิดที่  : {url}")
    print("  หยุดด้วย Ctrl+C")
    if args.open:
        webbrowser.open(url)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nปิดเซิร์ฟเวอร์แล้ว")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
