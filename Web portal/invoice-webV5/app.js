/**
 * app.js — จุดเริ่มต้นเดียวของ portal (router + event delegation + shell)
 *
 * โครงที่คงไว้จาก v4 (เพราะเป็นข้อห้ามทางสถาปัตยกรรม ไม่ใช่สไตล์):
 *   • view ทุกตัวเป็น pure function ส่งกลับ HTML string — ไม่มี state ใน DOM
 *   • ทุก input เข้าถึงผ่าน delegation ที่ root → เขียนใหม่ทั้งก้อนได้โดยไม่ต้อง bind ใหม่
 *   • ปุ่มที่กดไม่ได้ต้องแสดง "เพราะอะไร" เสมอ
 *
 * สิ่งที่ v5 เปลี่ยน:
 *   • ตัวกรองของหน้า "งาน" อยู่ใน memory ของ session (ไม่ฝืนเก็บใน localStorage)
 *   • ตัวกรองของหน้าอื่นผูกกับ URL (?q=&tab=) → copy ลิงก์ส่งต่อได้
 *   • header วาดจากข้อมูลจริงของ store (contract/engine/จำนวนงาน) ไม่ hardcode ข้อความ
 */

import { esc, mount, on, toast, openForm, openText } from "./src/ui/dom.js";
import { createStore } from "./src/domain/store.js";
import { USERS, ROLE_LABEL, userById, canAct, ACTION_LABEL } from "./src/domain/access.js";
import { canTransition } from "./src/domain/workflow.js";
import { blockingFor } from "./src/domain/guards.js";
import { CONTRACT_VERSION } from "./src/domain/schema.js";
import { SOURCE_REGISTRY } from "./src/data/sources.js";

import * as work from "./src/views/work.js";
import * as detail from "./src/views/detail.js";
import * as rules from "./src/views/rules.js";
import * as manual from "./src/views/manual.js";
import * as sources from "./src/views/sources.js";
import * as audit from "./src/views/audit.js";

const ROUTES = { work: "งาน", rules: "กฎ & ข้อยกเว้น", manual: "คู่มือระบบ", sources: "ที่มาข้อมูล", audit: "ประวัติการทำงาน" };
const NAV = [
  ["work", "#/", "งาน"],
  ["rules", "#/rules", "กฎ & ข้อยกเว้น"],
  ["manual", "#/manual", "คู่มือระบบ"],
  ["sources", "#/sources", "ที่มาข้อมูล"],
  ["audit", "#/audit", "ประวัติการทำงาน"],
];

const store = createStore({});
const filters = { work: {} }; // ตัวกรองหน้างาน (session นี้เท่านั้น)

const $top = document.getElementById("top");
const $main = document.getElementById("main");
const $foot = document.getElementById("foot");

/* ------------------------------------------------------------------ *
 * route
 * ------------------------------------------------------------------ */
function parseHash() {
  const raw = (location.hash || "#/").replace(/^#/, "");
  const [path, qs] = raw.split("?");
  const params = Object.fromEntries(new URLSearchParams(qs ?? ""));
  const seg = path.split("/").filter(Boolean);
  if (seg[0] === "doc") return { view: "detail", id: decodeURIComponent(seg[1] ?? ""), params };
  const view = seg[0] === "" || seg[0] === "work" ? "work" : seg[0];
  return { view: ROUTES[view] ? view : "work", params };
}

const ctx = () => {
  const route = parseHash();
  return {
    store,
    user: store.user() ?? userById("u6"),
    meta: store.bundle_meta,
    route,
    filters: filters.work,
    go: (hash) => (location.hash = hash),
  };
};

function render() {
  const c = ctx();
  const view = { work, detail, rules, manual, sources, audit }[c.route.view] ?? work;
  drawHeader(c);
  drawFooter(c);
  const html = view.render(c);
  mount($main, typeof html === "string" ? html : String(html ?? ""));
  document.title = `${ROUTES[c.route.view] ?? "งาน"} · AIVA Invoice Portal v5`;
  restoreFocus();
}

/* ------------------------------------------------------------------ *
 * shell
 * ------------------------------------------------------------------ */
function drawHeader(c) {
  const st = store.stats();
  const view = c.route.view;
  mount(
    $top,
    `<div class="wrap top-in">
      <a class="brand" href="#/">
        <span class="brand-mark">AIVA</span>
        <span class="brand-txt"><strong>Portal ตรวจรับใบกำกับภาษี</strong><span class="muted small">v5 · อ้างอิงข้อมูลจาก repo <code>ai-invoice-matching</code></span></span>
      </a>
      <nav class="nav" aria-label="เมนูหลัก">
      ${NAV.map(([key, href, label]) => {
        const on_ = view === key || (view === "detail" && key === "work");
        const count = key === "work" ? st.docs : key === "audit" && st.audit ? st.audit : null;
        return `<a class="${on_ ? "on" : ""}" ${on_ ? 'aria-current="page"' : ""} href="${href}">${esc(label)}${
          count ? `<span class="count">${count}</span>` : ""
        }</a>`;
      }).join("")}
      </nav>
      <div class="top-right">
        <label class="user-pick"><span class="muted small">ผู้ใช้</span>
          <select data-user>
            ${USERS.map((u) => `<option value="${u.id}" ${u.id === c.user.id ? "selected" : ""}>${esc(u.name)} · ${esc(ROLE_LABEL[u.role].split(" (")[0])}</option>`).join("")}
          </select>
        </label>
        <button class="btn sm ghost" data-reset="1" title="ล้าง overlay งาน + audit ใน localStorage">รีเซ็ตเดโม</button>
      </div>
    </div>
    <div class="wrap strip">
      <span class="strip-item"><b>${st.docs}</b> เอกสาร · <b>${st.snapshots}</b> snapshot</span>
      <span class="strip-item">contract <code>v${CONTRACT_VERSION}</code></span>
      <span class="strip-item">engine <code>${esc(shortVer(c.meta.engine_version))}</code></span>
      <span class="strip-item ${st.schemaInvalid ? "bad" : ""}">${st.schemaInvalid ? `${st.schemaInvalid} snapshot ไม่ผ่าน contract` : "contract ผ่านทุก snapshot"}</span>
      <span class="strip-item ${st.outboxPending ? "warn" : ""}">${st.outboxPending ? `${st.outboxPending} คำขอค้างใน outbox` : "ไม่มีคำขอค้าง"}</span>
      <span class="strip-item">sync <code>${esc(SOURCE_REGISTRY.synced_at.slice(0, 16).replace("T", " "))}</code></span>
      <span class="strip-item role">บทบาทคุณ: <b>${esc(ROLE_LABEL[c.user.role])}</b> · ทีม ${esc(c.user.team)}</span>
    </div>`,
  );
}

const shortVer = (v) => (String(v ?? "").length > 28 ? String(v).slice(0, 26) + "…" : String(v ?? "—"));

function drawFooter(c) {
  mount(
    $foot,
    `<div class="wrap foot-in">
      <span>ข้อมูลใน portal นี้เป็น <strong>ข้อมูลเดโม/สมมติ</strong> — นิติบุคคลจริงจาก <code>OCR service/n8n/app/core/master_data.py</code> · ผลตรวจจาก mirror ของ <code>app/core/rules.py</code></span>
      <span class="muted">สร้าง snapshot ${esc(c.meta.built_at)} · ไม่มี build step · <code>python tools/serve.py</code> → <code>http://127.0.0.1:8080</code></span>
      <span><a class="link" href="#/sources">ที่มาข้อมูลทั้งหมด</a> · <a class="link" href="#/manual">คู่มือ</a></span>
    </div>`,
  );
}

/* ------------------------------------------------------------------ *
 * ตัวกรอง
 * ------------------------------------------------------------------ */
let lastFocus = null;
function restoreFocus() {
  if (!lastFocus) return;
  const node = $main.querySelector(`[data-filter="${cssEsc(lastFocus.name)}"]`);
  if (node && node.tagName === "INPUT") {
    node.focus();
    const end = node.value.length;
    node.setSelectionRange?.(end, end);
  }
  lastFocus = null;
}
const cssEsc = (s) => String(s).replace(/[^\w-]/g, "");

function setWorkFilter(name, value) {
  if (value === "" || value === null || value === undefined) delete filters.work[name];
  else filters.work[name] = value;
}

/** ตัวกรองที่ผูกกับ URL (?q=&tab=…) → copy ลิงก์ส่งต่อได้ */
function navigateWithParams(patch) {
  const route = parseHash();
  const params = { ...route.params, ...patch };
  for (const [k, v] of Object.entries(params)) if (v === "" || v == null) delete params[k];
  const qs = new URLSearchParams(params).toString();
  const next = `#${route.view === "work" ? "/" : `/${route.view}`}${qs ? `?${qs}` : ""}`;
  if (next === location.hash) render(); // ไม่มี hashchange → วาดเอง
  else location.hash = next;
}

/* ------------------------------------------------------------------ *
 * delegation
 * ------------------------------------------------------------------ */
/**
 * ตัวกรอง: พิมพ์ในช่องข้อความ → event "input" / เลือกใน select & checkbox → event "change"
 * ผูกทั้งสอง event แต่แยกกันทำงาน เพื่อไม่ให้วาดซ้ำสองรอบต่อหนึ่งการกระทำ
 */
function handleFilter(ev, node) {
  const isText = node.tagName === "INPUT" && node.type === "text";
  if (isText !== (ev.type === "input")) return;
  const { filter: name, scope } = node.dataset;
  if (isText) lastFocus = { name };
  if (scope) return navigateWithParams({ [name]: node.value });
  setWorkFilter(name, node.value);
  render();
}
on($main, "[data-filter]", "input", handleFilter);
on($main, "[data-filter]", "change", handleFilter);

on($main, "[data-kpi]", "click", (ev, node) => {
  const key = node.dataset.kpi;
  filters.work = {};
  if (key === "mine") filters.work.mine = "1";
  else if (key.startsWith("status:")) filters.work.status = key.slice(7);
  render();
});

on($main, "[data-clear-filters]", "click", () => {
  filters.work = {};
  render();
});

on($main, "[data-open]", "click", (ev, node) => (location.hash = `#/doc/${encodeURIComponent(node.dataset.open)}`));
on($main, "[data-open]", "keydown", (ev, node) => {
  if (ev.key === "Enter" || ev.key === " ") {
    ev.preventDefault();
    location.hash = `#/doc/${encodeURIComponent(node.dataset.open)}`;
  }
});

on($main, "[data-scroll]", "click", (ev, node) => {
  ev.preventDefault();
  document.getElementById(node.dataset.scroll)?.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* action ของ workflow: ตรวจ 3 ชั้นก่อน แล้วจึงให้เหตุผล */
on($main, "[data-act]", "click", (ev, node) => {
  const { act, doc, v } = node.dataset;
  const c = ctx();
  const d = store.get(doc);
  if (!d) return toast("ไม่พบเอกสารในระบบ", "bad");

  const reasons = [
    ...canAct(c.user, d, act).reasons,
    ...canTransition(d.workflow.status, act).reasons,
    ...blockingFor(d, act).map((g) => `${g.title} — ${g.detail}`),
  ];
  if (reasons.length) {
    toast(`<strong>${esc(ACTION_LABEL[act] ?? act)} ทำไม่ได้</strong><br>${reasons.map((r) => esc(r)).join("<br>")}`, "bad", 8000);
    return;
  }
  openForm(
    {
      title: `${ACTION_LABEL[act] ?? act} · ${doc}`,
      hint: `สถานะงานจะเปลี่ยนจาก <code>${esc(d.workflow.status)}</code> → <code>${esc(
        canTransition(d.workflow.status, act).to ?? "?",
      )}</code> · optimistic version v${d.workflow.version} → v${d.workflow.version + 1}<br>เหตุผลนี้จะถูกบันทึกใน audit trail`,
      confirmText: ACTION_LABEL[act] ?? act,
      danger: ["reject", "post"].includes(act),
    },
    (note) => {
      const res = store.act(doc, act, { note, expectedVersion: Number(v) });
      if (!res.ok) return toast(`<strong>ไม่ผ่าน</strong><br>${res.reasons.map((r) => esc(r)).join("<br>")}`, "bad", 9000);
      toast(
        `<strong>${esc(ACTION_LABEL[act])} สำเร็จ</strong><br>${esc(doc)} → ${esc(res.workflow.status)} (v${res.workflow.version})${
          res.workflow.status === "RESUBMITTED" ? "<br>คำขอถูกเข้าคิวใน outbox แล้ว รอ producer ส่ง revision ใหม่" : ""
        }`,
        "ok",
      );
      render();
    },
  );
});

/* ปุ่มเดโม */
on($main, "[data-demo]", "click", (ev, node) => {
  const { demo, doc } = node.dataset;
  if (demo === "deliver") {
    const res = store.deliverPending(doc);
    toast(res.ok ? `<strong>รับ revision ใหม่แล้ว</strong><br>${esc(doc)} กลับเข้าคิวตรวจ · outbox ถูกปิดอัตโนมัติ` : res.reasons.map(esc).join("<br>"), res.ok ? "ok" : "bad");
    if (res.ok) render();
  } else if (demo === "pdf") {
    const res = store.attachPdf(doc);
    toast(res.ok ? `<strong>แนบหลักฐานแล้ว</strong><br>ตอนนี้หลักฐานตรงกับ revision ปัจจุบัน` : res.reasons.map(esc).join("<br>"), res.ok ? "ok" : "bad");
    if (res.ok) render();
  } else if (demo === "json") {
    const d = store.get(doc);
    openText(
      {
        title: `ทดสอบ receiving contract — ส่ง snapshot เข้าขอบเขตของ ${doc}`,
        hint: "ระบบจะตรวจ schema → กัน event_id ซ้ำ → กัน revision ถอยหลัง → แล้วจึงรับเข้า store (ไม่บันทึกถ้าไม่ผ่าน)",
        value: JSON.stringify(nextDraft(d), null, 2),
      },
      (text) => {
        const res = store.ingestRaw(doc, text);
        toast(
          res.ok
            ? `<strong>รับเข้าระบบแล้ว</strong><br>revision ${esc(String(res.doc.current.revision))} · ปิด outbox ${res.closed ?? 0} รายการ`
            : `<strong>ปฏิเสธที่ขอบเขต (${esc(res.stage ?? "-")})</strong><br>${res.reasons.slice(0, 6).map(esc).join("<br>")}`,
          res.ok ? "ok" : "bad",
          9000,
        );
        if (res.ok) render();
      },
    );
  }
});

/** ร่าง snapshot ใบถัดไป (revision +1, event_id ใหม่) ให้ผู้ใช้แก้ต่อ — portal ไม่ตรวจความถูกของข้อมูลให้ */
function nextDraft(doc) {
  const base = doc.pending_snapshot ?? doc.current;
  return JSON.parse(
    JSON.stringify(base).replace(/"revision":\s*(\d+)/, (m, n) => `"revision": ${Number(n) + 1}`).replace(
      /"event_id":\s*"([^"]+)"/,
      (m, id) => `"event_id": "EVT-TEST-${Date.now().toString().slice(-6)}"`,
    ),
  );
}

/* เลือกผู้ใช้ / รีเซ็ต */
on($top, "[data-user]", "change", (ev, node) => {
  store.setUser(node.value);
  toast(`<strong>สลับผู้ใช้เป็น ${esc(store.user().name)}</strong><br>${esc(ROLE_LABEL[store.user().role])} — ขอบเขตการเห็นและปุ่มที่ได้จะเปลี่ยนตามบทบาท`, "info");
  render();
});
on($top, "[data-reset]", "click", () => {
  openForm(
    {
      title: "รีเซ็ตข้อมูลเดโม",
      hint: "จะลบ overlay (สถานะงาน, outbox, audit, snapshot ที่เคย ingest เพิ่ม) ออกจาก <code>localStorage</code> และกลับไปเป็นค่าตั้งต้นของ fixture",
      label: "พิมพ์เหตุผลสั้น ๆ เพื่อยืนยัน",
      confirmText: "รีเซ็ตเลย",
      danger: true,
    },
    () => {
      store.reset();
      filters.work = {};
      toast("<strong>รีเซ็ตแล้ว</strong><br>ทุกเอกสารกลับสู่สถานะตั้งต้นของ fixture", "ok");
      location.hash = "#/";
      render();
    },
  );
});

/* ------------------------------------------------------------------ *
 * start
 * ------------------------------------------------------------------ */
window.addEventListener("hashchange", () => {
  lastFocus = null;
  render();
  window.scrollTo(0, 0);
});
window.addEventListener("error", (ev) => {
  toast(`<strong>ข้อผิดพลาดของหน้าจอ</strong><br>${esc(ev.message)}<br><span class="muted small">ข้อมูลใน store ยังอยู่ครบ — รีเฟรชแล้วลองใหม่</span>`, "bad", 12000);
});

render();
