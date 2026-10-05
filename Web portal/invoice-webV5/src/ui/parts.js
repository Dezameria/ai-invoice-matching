/**
 * ui/parts.js — ชิ้นส่วน layout ที่ทุกหน้าใช้ (สร้าง HTML string เท่านั้น ไม่มี state)
 *
 * หลักความสะอาดของ V5: หนึ่งหน้าจอ = หัวเรื่องเดียว + เนื้อหาหลักก้อนเดียว
 * ส่วนที่เป็น "metadata ของแหล่งข้อมูล" ถูกหดเหลือบรรทัดเดียว (sourceTag) ไม่กินพื้นที่อ่าน
 */

import { esc } from "./dom.js";
import { SOURCE_REGISTRY } from "../data/sources.js";

/** หัวหน้า: ชื่อหน้า + คำอธิบายสั้น + ปุ่ม/ลิงก์มุมขวา */
export function pageHead({ title, sub = "", actions = "" }) {
  return `<header class="page-head">
    <div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</div>
    ${actions ? `<div class="page-actions">${actions}</div>` : ""}
  </header>`;
}

/**
 * แถบ KPI แบบกดกรองต่อได้
 * @param {Array<{key:string,label:string,value:number|string,tone?:string,hint?:string,href?:string,active?:boolean}>} tiles
 */
export function kpiStrip(tiles) {
  return `<div class="kpis">${tiles
    .map(
      (t) => `<button class="kpi ${t.tone ?? ""} ${t.active ? "on" : ""}" ${t.href ? `data-kpi="${esc(t.key)}"` : "disabled"} type="button">
      <span class="kpi-v">${esc(t.value)}</span>
      <span class="kpi-l">${esc(t.label)}</span>
      ${t.hint ? `<span class="kpi-h">${esc(t.hint)}</span>` : ""}
    </button>`,
    )
    .join("")}</div>`;
}

/** แท็บแนวนอน (state อยู่ใน hash → back/forward และ deep link ได้) */
export function tabs({ base, value, items, query = "" }) {
  const sep = query ? "" : "?";
  return `<nav class="tabs" role="tablist">${items
    .map(([key, label, count]) => {
      const on = key === value;
      const href = `${base}${key || query ? `?${query}${key ? `tab=${key}` : ""}`.replace(/[&?]$/, "") : ""}`;
      return `<a role="tab" aria-selected="${on}" class="tab ${on ? "on" : ""}" href="${esc(href)}">
        ${esc(label)}${count != null ? `<span class="count">${esc(count)}</span>` : ""}</a>`;
    })
    .join("")}</nav>`;
}

/** ช่องค้นหา (input) — app.js ผูก delegation ให้เองผ่าน [data-filter] */
export function searchBox(name, value, placeholder, scope = "") {
  return `<label class="fld grow"><span>ค้นหา</span>
    <input data-filter="${esc(name)}" ${scope ? `data-scope="${esc(scope)}"` : ""} value="${esc(value ?? "")}" placeholder="${esc(placeholder)}" autocomplete="off"></label>`;
}

export function selectBox(name, value, label, options, scope = "") {
  return `<label class="fld"><span>${esc(label)}</span>
    <select data-filter="${esc(name)}" ${scope ? `data-scope="${esc(scope)}"` : ""}>
      ${options
        .map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value ?? "") ? "selected" : ""}>${esc(t)}</option>`)
        .join("")}
    </select></label>`;
}

export function checkBox(name, value, checked, label, scope = "") {
  return `<label class="chk"><input type="checkbox" data-filter="${esc(name)}" ${scope ? `data-scope="${esc(scope)}"` : ""} value="${esc(value)}"
    ${checked ? "checked" : ""}><span>${esc(label)}</span></label>`;
}

/** แถบตัวกรองแถวเดียว (ไม่แยกกล่องเยอะ — ให้จอตลอดเหลือที่ไว้ให้เนื้อหา) */
export function filterBar(fields, extra = "") {
  return `<div class="filter-bar">${fields.join("")}${extra}</div>`;
}

/** pill ของรหัส/คำสั้น ๆ (toneFn เลือกสีตามค่า) */
export function chips(items, toneFn = () => "muted") {
  if (!items?.length) return "";
  return items.map((i) => `<span class="chip ${toneFn(i)}">${esc(i)}</span>`).join("");
}

/**
 * บรรทัด "ข้อมูลนี้มาจากไหน" — แสดง hash/เวลา sync สั้น ๆ พร้อมวิธี re-sync
 * ทุกหน้าที่มีข้อมูล generated ใช้บรรทัดเดียวกันนี้ เพื่อไม่ให้ต้องเดาที่มา
 */
export function sourceTag(sourceIds, note = "") {
  const list = (Array.isArray(sourceIds) ? sourceIds : [sourceIds])
    .map((id) => SOURCE_REGISTRY.sources.find((s) => s.id === id))
    .filter(Boolean);
  if (!list.length) return "";
  return `<p class="src-tag">
    <span class="src-dot"></span>
    ${list
      .map((s) => `<span class="src-item" title="sha256 ${esc(s.sha256.slice(0, 16))}… · ${esc(s.lines)} บรรทัด · แก้ไขล่าสุด ${esc(s.mtime)}"><code>${esc(
        s.path,
      )}</code> <span class="muted">${esc(s.sha256.slice(0, 8))}</span></span>`)
      .join("")}
    <span class="muted">sync ${esc(SOURCE_REGISTRY.synced_at.replace(/:\d{2}\+/, "+"))} · <code>python tools/sync.py</code></span>
    ${note ? `<span class="src-note">${note}</span>` : ""}
  </p>`;
}

export function emptyState(text, action = "") {
  return `<div class="empty-state"><p>${esc(text)}</p>${action}</div>`;
}

/** การ์ดเล็กสำหรับตัวเลข/ข้อเท็จจริงเดี่ยว */
export function statLine(items) {
  return `<div class="stat-line">${items
    .map(([k, v, tone]) => `<div class="stat ${tone ?? ""}"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`)
    .join("")}</div>`;
}

/** ปุ่มที่ "กดไม่ได้" ต้องบอกเหตุผลเสมอ (หลักการเดียวกับ V4 แต่หดเหลือ tooltip + บรรทัดใต้ปุ่ม) */
export function actionButton({ label, act, docId, version, ok = true, why = "", tone = "" }) {
  return `<div class="act">
    <button type="button" class="btn ${tone} ${ok ? "" : "off"}" ${ok ? "" : 'aria-disabled="true"'}
      data-act="${esc(act)}" data-doc="${esc(docId)}" data-v="${esc(version)}" title="${esc(ok ? "" : why)}">${esc(label)}</button>
    ${ok ? "" : `<span class="why">${esc(why)}</span>`}
  </div>`;
}
