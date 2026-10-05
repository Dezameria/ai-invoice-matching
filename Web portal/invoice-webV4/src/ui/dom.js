/**
 * ui/dom.js — ของเล็ดน้อยฝั่ง DOM (ไม่มี business logic)
 * portal ไม่มี build step → ใช้ ES module ล้วน + escape ทุกค่าที่แทรกเข้า HTML
 */

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}

/** ใส่ class ตาม tone (ok/warn/bad/info/muted) */
export function badge(text, tone = "muted", extraClass = "") {
  return `<span class="badge ${tone} ${extraClass}">${esc(text)}</span>`;
}

export function card({ title, sub = "", tone = "", body = "", actions = "", id = "" }) {
  return `<section class="card ${tone}" ${id ? `id="${esc(id)}"` : ""}>
    <header class="card-head"><div><h2>${esc(title)}</h2>${sub ? `<p class="card-sub">${sub}</p>` : ""}</div>${actions ? `<div class="card-actions">${actions}</div>` : ""}</header>
    <div class="card-body">${body}</div>
  </section>`;
}

export function kv(rows, cols = 2) {
  return `<dl class="kv cols-${cols}">${rows
    .filter(Boolean)
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v ?? ""}</dd></div>`)
    .join("")}</dl>`;
}

export function table({ head = [], rows = [], cls = "", empty = "ไม่มีรายการ" }) {
  const list = typeof rows === "string" ? [rows] : rows;
  if (!list.length) return `<p class="empty">${esc(empty)}</p>`;
  const cell = (c) => `<td>${c ?? ""}</td>`;
  const row = (r) =>
    typeof r === "string" && r.trim().startsWith("<tr") ? r : `<tr>${(Array.isArray(r) ? r : [r]).map(cell).join("")}</tr>`;
  return `<div class="table-wrap ${cls}"><table><thead><tr>${head
    .map((h) => `<th>${esc(h)}</th>`)
    .join("")}</tr></thead><tbody>${list.map(row).join("")}</tbody></table></div>`;
}

export function note(text, tone = "info") {
  return `<p class="note ${tone}">${text}</p>`;
}

export function jsonBlock(value, summary = "ดู JSON ดิบ (snapshot)") {
  return `<details class="json"><summary>${esc(summary)}</summary><pre>${esc(JSON.stringify(value, null, 2))}</pre></details>`;
}

export function progress(pct, tone = "teal") {
  const w = Math.max(0, Math.min(100, Math.round(pct)));
  return `<div class="bar ${tone}"><span style="width:${w}%"></span></div>`;
}

/** ตั้งเนื้อหา + ลบ listener เดิม (event ใช้ delegation จาก root จึงไม่ต้อง bind ใหม่) */
/**
 * เขียน HTML ลงหมุด (จุดเดียวที่แตะ innerHTML)
 *
 * ต้อง blur ก่อน ถ้าโฟกัสอยู่ในก้อนที่จะเขียนทับ — ไม่งั้น Chrome จะ throw
 * "The node to be removed is no longer a child of this node" ตอนมันทำ blur เอง
 * (เจอตจริงตอนพิมพ์ในช่องค้นหาของคิว — ผู้ใช้พิมพ์ต่อไม่ได้)
 */
export function mount(node, htmlString) {
  const active = document.activeElement;
  if (active && active !== document.body && node.contains(active)) active.blur();
  node.innerHTML = htmlString;
  node.scrollTop = 0;
}

export function on(root, selector, event, handler) {
  root.addEventListener(event, (ev) => {
    const target = ev.target.closest?.(selector);
    if (target && root.contains(target)) handler(ev, target);
  });
}

let toastSeq = 0;
export function toast(message, tone = "info", ms = 5200) {
  const host = document.getElementById("toast");
  if (!host) return;
  const id = `t${++toastSeq}`;
  host.insertAdjacentHTML(
    "beforeend",
    `<div class="toast ${tone}" id="${id}"><span class="dot"></span><div>${message}</div><button class="x" data-toast-close="${id}" aria-label="ปิด">×</button></div>`,
  );
  setTimeout(() => document.getElementById(id)?.remove(), ms);
}

/** modal ฟอร์มสั้น ๆ (ทุก action ต้องบันทึกเหตุผล) */
export function openForm({ title, hint = "", label = "เหตุผล / หมายเหตุ", value = "", confirmText = "บันทึก", danger = false, required = true }, onSubmit) {
  const host = document.getElementById("modal");
  host.innerHTML = `<div class="modal-back" data-modal-close="1"></div>
    <div class="modal ${danger ? "danger" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header><h3>${esc(title)}</h3><button class="x" data-modal-close="1" aria-label="ปิด">×</button></header>
      ${hint ? `<p class="modal-hint">${hint}</p>` : ""}
      <label class="field"><span>${esc(label)}</span>
        <textarea id="modal-note" rows="4" ${required ? "required minlength=5" : ""} placeholder="${esc(value || "ระบุสิ่งที่ตรวจ / สิ่งที่ต้องแก้ไข")}" autofocus>${esc(value)}</textarea>
      </label>
      <footer><button class="btn ghost" data-modal-close="1">ยกเลิก</button>
      <button class="btn ${danger ? "danger" : "primary"}" data-modal-ok="1">${esc(confirmText)}</button></footer>
    </div>`;
  const ta = host.querySelector("#modal-note");
  const close = () => {
    host.innerHTML = "";
  };
  const ok = () => {
    const text = ta.value.trim();
    if (required && text.length < 5) {
      ta.focus();
      ta.classList.add("shake");
      setTimeout(() => ta.classList.remove("shake"), 420);
      return;
    }
    close();
    onSubmit(text);
  };
  host.querySelectorAll("[data-modal-close]").forEach((n) => n.addEventListener("click", close));
  host.querySelector("[data-modal-ok]").addEventListener("click", ok);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) ok();
  });
  setTimeout(() => ta.focus(), 30);
}

/** modal แสดงผลตรวจ snapshot (JSON ที่ผู้ใช้แปะ) */
export function openText({ title, hint = "", rows = 16, value = "{}" }, onSubmit) {
  const host = document.getElementById("modal");
  host.innerHTML = `<div class="modal-back" data-modal-close="1"></div>
    <div class="modal wide" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header><h3>${esc(title)}</h3><button class="x" data-modal-close="1" aria-label="ปิด">×</button></header>
      ${hint ? `<p class="modal-hint">${hint}</p>` : ""}
      <label class="field"><span>snapshot JSON</span><textarea id="modal-json" rows="${rows}" spellcheck="false">${esc(value)}</textarea></label>
      <footer><button class="btn ghost" data-modal-close="1">ยกเลิก</button><button class="btn primary" data-modal-ok="1">ส่งเข้า ingestion boundary</button></footer>
    </div>`;
  const ta = host.querySelector("#modal-json");
  const close = () => {
    host.innerHTML = "";
  };
  const ok = () => {
    close();
    onSubmit(ta.value);
  };
  host.querySelectorAll("[data-modal-close]").forEach((n) => n.addEventListener("click", close));
  host.querySelector("[data-modal-ok]").addEventListener("click", ok);
}
