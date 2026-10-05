/**
 * ui/format.js — แปลงค่าเป็นข้อความแสดงผล (ห้ามคำนวณตัวเลขที่นี่: ใช้ money.js เท่านั้น)
 */

import { fmtMoney, fmtQty } from "../domain/money.js";
import { esc } from "./dom.js";
import { WF, WF_TONE } from "../domain/workflow.js";
import { SEVERITY_LABEL } from "../domain/exceptions.js";

export const STATUS_TONE = { "Auto-pass": "ok", Review: "warn", Hold: "bad", "Manual Review": "info" };
export const STATUS_NOTE = {
  "Auto-pass": "ผ่านทุกกฎที่ engine ตรวจ — ยังต้องมี human approval 1 ครั้งก่อนตั้งหนี้",
  Review: "พบบางเรื่องที่ต้องให้คนตรวจ (Medium) — ผู้ใช้/บัญชีเคลียร์ได้",
  Hold: "พบเรื่องระดับ High — ต้องเคลียร์ก่อนส่งต่อ",
  "Manual Review": "engine ตัดสินไม่ได้ / ขาดข้อมูลหลัก — ต้องให้คนดูทั้งฉบับ",
};

export function statusBadge(status) {
  return `<span class="badge ${STATUS_TONE[status] ?? "muted"} strong">${esc(status ?? "ไม่มีข้อมูล")}</span>`;
}

export function wfBadge(wfStatus) {
  return `<span class="badge ${WF_TONE[wfStatus] ?? "muted"} pill">${esc(WF[wfStatus] ?? wfStatus)}</span>`;
}

export function sevBadge(sev) {
  const tone = sev === "High" ? "bad" : sev === "Medium" ? "warn" : "muted";
  return `<span class="badge ${tone}" title="${esc(SEVERITY_LABEL[sev] ?? sev)}">${esc(sev)}</span>`;
}

export function money(value, { sign = false } = {}) {
  const txt = fmtMoney(value);
  const tone = value === null || value === undefined ? "muted" : "";
  if (tone) return `<span class="num muted">ไม่มีข้อมูล</span>`;
  return `<span class="num ${sign && !txt.startsWith("-") ? "plus" : ""}">${esc(txt)}</span>`;
}

export function qty(value) {
  if (value === null || value === undefined) return `<span class="num muted">—</span>`;
  return `<span class="num">${esc(fmtQty(value))}</span>`;
}

export function code(text, tone = "") {
  return `<code class="${tone}">${esc(text)}</code>`;
}

export function bool(v, yes = "✓", no = "✗") {
  return `<span class="${v ? "yes" : "no"}">${v ? yes : no}</span>`;
}

const TH_FMT = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
  era: "long",
});

export function dt(iso) {
  if (!iso) return `<span class="muted">—</span>`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return esc(String(iso));
  return `<time datetime="${esc(iso)}">${esc(TH_FMT.format(d).replace(/\s*(?:ค\.?ศ\.|พ\.?ศ\.|BE|AD)/, ""))} น.</time>`;
}

export function ago(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  const min = Math.round(ms / 60000);
  if (min < 1) return "เมื่อครู่";
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  return `${Math.round(h / 24)} วันก่อน`;
}

export function link(docId, label = null, params = "") {
  return `<a class="link" href="#/doc/${esc(docId)}${params}">${esc(label ?? docId)}</a>`;
}

export function pillList(items, toneFn = () => "") {
  if (!items?.length) return `<span class="muted">—</span>`;
  return items.map((i) => `<span class="chip ${toneFn(i)}">${esc(i)}</span>`).join(" ");
}
