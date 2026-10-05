/**
 * app.js — จุดเริ่มต้นของ portal (no build, ES module ล้วน)
 *
 * ห้าม import src/engine/ ที่นี่ (มีเทสต์ enforces) — portal ไม่ตรวจซ้ำ
 */

import { createStore } from "./src/domain/store.js";
import { USERS, ROLE_LABEL, canAct, visibleDocs, isMyTask } from "./src/domain/access.js";
import { canTransition } from "./src/domain/workflow.js";
import { blockingFor } from "./src/domain/guards.js";
import { validateSnapshot } from "./src/domain/schema.js";
import { ACTION_LABEL } from "./src/domain/access.js";
import { mount, esc, toast, openForm, openText } from "./src/ui/dom.js";
import { dt } from "./src/ui/format.js";
import { CONTRACT_VERSION } from "./src/domain/schema.js";
import * as viewDashboard from "./src/views/dashboard.js";
import * as viewQueue from "./src/views/queue.js";
import * as viewDetail from "./src/views/detail.js";
import * as viewMaster from "./src/views/master.js";
import * as viewAudit from "./src/views/audit.js";
import * as viewHelp from "./src/views/help.js";

const store = createStore();

const VIEWS = {
  dashboard: { mod: viewDashboard, title: "ภาพรวมระบบ", nav: "ภาพรวม" },
  queue: { mod: viewQueue, title: "คิวงาน", nav: "คิวงาน" },
  doc: { mod: viewDetail, title: "เอกสาร", nav: "" },
  master: { mod: viewMaster, title: "ข้อมูลหลัก", nav: "ข้อมูลหลัก" },
  audit: { mod: viewAudit, title: "Audit trail", nav: "Audit" },
  help: { mod: viewHelp, title: "คู่มือ & ส่วนต่าง", nav: "คู่มือ" },
};

const filters = { queue: {}, master: {}, audit: {} };

/* ------------------------------------------------------------------ *
 * router
 * ------------------------------------------------------------------ */
function parseHash(hash) {
  const raw = String(hash || "").replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const view = parts[0] && VIEWS[parts[0]] ? parts[0] : "dashboard";
  const params = Object.fromEntries(new URLSearchParams(query));
  return { view, id: parts[1] ?? null, params };
}

/* ------------------------------------------------------------------ *
 * shell
 * ------------------------------------------------------------------ */
function topbar(route) {
  const user = store.user();
  const scope = visibleDocs(user, store.list());
  const mine = scope.filter((d) => isMyTask(user, d)).length;
  const st = store.stats();
  const nav = Object.entries(VIEWS)
    .filter(([, v]) => v.nav)
    .map(([key, v]) => {
      const count = key === "queue" ? mine : key === "audit" ? st.audit : 0;
      const active = route.view === key;
      return `<a class="nav-link ${active ? "active" : ""}" href="#/${key}">${esc(v.nav)}${count ? `<span class="pill">${count}</span>` : ""}</a>`;
    })
    .join("");

  return `<div class="brand">
      <span class="logo">AIVA</span>
      <div><strong>Invoice Review Portal</strong><span class="ver">v4 · snapshot-driven</span></div>
    </div>
    <nav class="nav">${nav}</nav>
    <div class="top-right">
      <span class="chip muted" title="portal รับ snapshot เท่านั้น ไม่ได้รัน engine ในเบราว์เซอร์">
        contract v${CONTRACT_VERSION} · engine ไม่ได้รันที่นี่
      </span>
      <span class="chip ${st.schemaInvalid ? "bad" : "ok"}" title="snapshot ที่ไม่ผ่าน receiving contract">
        data health ${st.docs - st.schemaInvalid}/${st.docs}
      </span>
      <label class="user-pick">
        <span>ผู้ใช้</span>
        <select data-user="1">
          ${USERS.map(
            (u) => `<option value="${esc(u.id)}" ${u.id === user?.id ? "selected" : ""}>${esc(u.name)} · ${esc(u.role)}</option>`,
          ).join("")}
        </select>
      </label>
    </div>`;
}

function contextBar(route) {
  const user = store.user();
  const b = store.bundle_meta;
  return `<div class="ctx">
    <span class="who"><strong>${esc(user?.name ?? "—")}</strong> <span class="chip">${esc(ROLE_LABEL[user?.role] ?? "")}</span>
      <span class="muted small">${esc(user?.team ?? "")} · บริษัทที่ถือ: ${user ? user.companies.join(", ") : "—"}</span></span>
    <span class="muted small right">ข้อมูลสังเคราะห์ 🧪 · bundle สร้าง ${esc(dt(b.built_at))} · ${b.snapshot_count} snapshot · engine ${esc(b.engine_version)}</span>
  </div>`;
}

/* ------------------------------------------------------------------ *
 * paint
 * ------------------------------------------------------------------ */
const $top = document.getElementById("topbar");
const $ctx = document.getElementById("ctxbar");
const $view = document.getElementById("view");

function currentRoute() {
  return parseHash(location.hash);
}

function paint() {
  const route = currentRoute();
  const v = VIEWS[route.view];
  document.title = `${v.title} · AIVA Invoice Review Portal v4`;
  mount($top, topbar(route));
  mount($ctx, contextBar(route));
  let html = "";
  try {
    html = v.mod.render({ store, user: store.user(), route, filters: filters[route.view] ?? {} });
  } catch (err) {
    console.error(err);
    html = `<section class="card"><header class="card-head"><h1>หน้าจอขัดข้อง</h1></header>
      <div class="card-body"><p class="bad-text">${esc(err.message)}</p>
      <p class="muted small">นี่คือ error ของ portal เอง (ไม่ใช่ผลตรวจ) — กด F5 เพื่อโหลด state จาก localStorage ใหม่</p></div></section>`;
  }
  mount($view, html);
  window.scrollTo({ top: 0 });
}

/* ------------------------------------------------------------------ *
 * actions
 * ------------------------------------------------------------------ */
function preflight(doc, action) {
  const user = store.user();
  const a = canAct(user, doc, action);
  const reasons = [...a.reasons];
  if (a.ok) {
    const t = canTransition(doc.workflow.status, action);
    reasons.push(...t.reasons);
    reasons.push(...blockingFor(doc, action).map((g) => `${g.title} — ${g.detail}`));
  }
  return reasons;
}

const ACTION_HINT = {
  hold: "งานจะถูกกักไว้ และยังไม่ถูกส่งต่อ — ระบุสิ่งที่ต้องเคลียร์ให้ชัดเจน",
  release: "ปล่อยกลับเข้าคิวตรวจ ต้องระบุว่าแก้ไขอะไรแล้ว",
  resubmit: "portal จะสร้าง event ใน outbox ให้ OCR service ตรวจใหม่ (portal ไม่รัน OCR เอง)",
  confirm: "ยืนยันว่าผลตรวจ + ภาพเอกสารถูกต้อง — ยังไม่ใช่การตั้งหนี้",
  reject: "ปฏิเสธเอกสารฉบับนี้ (สถานะปิดงาน ต้อง ingest ใหม่ถ้ายืนยันจะใช้เอกสารเดิม)",
  post: "ส่งตั้งหนี้ที่ AP — สัญญาฝั่ง AP ยังไม่ถูกสร้าง ระบบจึงปิดกั้นไว้",
};

function handleAction(docId, action, expectedVersion) {
  const doc = store.get(docId);
  if (!doc) return toast("ไม่พบเอกสาร", "bad");
  const reasons = preflight(doc, action);
  if (reasons.length) {
    toast(`<strong>${esc(ACTION_LABEL[action] ?? action)} ถูกปฏิเสธ</strong><br>${reasons.map((r) => esc(r)).join("<br>")}`, "bad", 8000);
    return;
  }
  openForm(
    {
      title: `${ACTION_LABEL[action]} · ${docId} (rev ${doc.current.revision})`,
      hint: `${esc(ACTION_HINT[action] ?? "")}<br><span class="muted small">งานเวอร์ชัน v${expectedVersion} · ถ้ามีผู้อื่นทำไปก่อน ระบบจะปฏิเสธและให้รีเฟรช</span>`,
      confirmText: ACTION_LABEL[action],
      danger: action === "reject" || action === "post",
    },
    (note) => {
      const res = store.act(docId, action, { note, expectedVersion: Number(expectedVersion) });
      if (!res.ok) {
        toast(`<strong>ทำไม่ได้</strong><br>${res.reasons.map((r) => esc(r)).join("<br>")}`, "bad", 8000);
      } else {
        toast(
          `<strong>${esc(ACTION_LABEL[action])} เรียบร้อย</strong> — สถานะใหม่ <code>${esc(res.workflow.status)}</code> (v${res.workflow.version})<br><span class="small">บันทึก audit ${esc(
            store.user()?.name ?? "",
          )} · ${esc(note)}</span>`,
          "ok",
        );
      }
      paint();
    },
  );
}

function handleDemo(kind, docId) {
  if (kind === "deliver") {
    const res = store.deliverPending(docId);
    toast(
      res.ok
        ? `<strong>รับ revision ใหม่แล้ว</strong> — ${esc(docId)} กลับเข้าคิวตรวจ · ปิด outbox ที่รอ revision นี้`
        : `<strong>ingest ไม่ผ่าน</strong><br>${res.reasons.map((r) => esc(r)).join("<br>")}`,
      res.ok ? "ok" : "bad",
      7000,
    );
    paint();
  } else if (kind === "pdf") {
    store.attachPdf(docId);
    toast(`<strong>แนบหลักฐาน (เดโม)</strong> — ตอนนี้เป็น revision ปัจจุบันแล้ว ปุ่มที่ยังปิดจะเปิดตามเงื่อนไขที่เหลือ`, "ok");
    paint();
  } else if (kind === "reset") {
    openForm(
      { title: "รีเซ็ตข้อมูลเดโม", hint: "ลบ overlay ใน localStorage (workflow/outbox/audit/snapshot ที่ ingest เพิ่ม) แล้วกลับไปใช้ค่าตั้งต้น", confirmText: "รีเซ็ต", danger: true },
      () => {
        store.reset();
        toast("<strong>รีเซ็ตแล้ว</strong> — ทุกอย่างกลับเป็นค่าตั้งต้น", "ok");
        paint();
      },
    );
  } else if (kind === "json") {
    const doc = store.get(docId);
    openText(
      {
        title: `ทดสอบ ingestion boundary · ${docId}`,
        hint: `แก้ revision/event_id แล้วส่งเข้ามา — ที่ขอบเขตจะตรวจ receiving contract v${CONTRACT_VERSION}, กันซ้ำด้วย event_id และปฏิเสธ revision ที่ไม่เพิ่ม<br>
          <span class="muted small">ลองลบฟิลด์ <code>status</code> หรือใส่ <code>"grand_total": 1234</code> (number) เพื่อดูว่า portal ปฏิเสธอย่างไร</span>`,
        value: JSON.stringify({ ...(doc?.current ?? {}), revision: (doc?.current.revision ?? 1) + 1, event_id: `EVT-MANUAL-${Date.now()}` }, null, 2),
      },
      (text) => {
        const res = store.ingestRaw(docId, text);
        if (res.ok) {
          toast(`<strong>รับ snapshot ใหม่</strong> — r${res.doc.current.revision} · ${esc(res.doc.current.status)} · ปิด outbox ${res.closed} รายการ`, "ok");
        } else {
          const errs = (res.check?.errors ?? res.reasons ?? []).slice(0, 6).map((e) => (e.path ? `${e.path} — ${e.message}` : e));
          toast(`<strong>ปฏิเสธที่ขอบเขต (${(res.check?.errors ?? res.reasons ?? []).length} ข้อ)</strong><br>${errs.map((e) => esc(e)).join("<br>")}`, "bad", 11000);
        }
        paint();
      },
    );
  }
}

/* ------------------------------------------------------------------ *
 * events
 * ------------------------------------------------------------------ */
document.addEventListener("click", (ev) => {
  const open = ev.target.closest("[data-open]");
  if (open) {
    location.hash = `#/doc/${open.dataset.open}`;
    return;
  }
  const act = ev.target.closest("[data-act]");
  if (act) {
    handleAction(act.dataset.doc, act.dataset.act, act.dataset.v ?? null);
    return;
  }
  const demo = ev.target.closest("[data-demo]");
  if (demo) {
    handleDemo(demo.dataset.demo, demo.dataset.doc ?? null);
    return;
  }
  if (ev.target.closest("[data-clear-filters]")) {
    filters[currentRoute().view] = {};
    paint();
    return;
  }
  if (ev.target.closest("[data-clear-focus]")) {
    filters.queue = { ...filters.queue, focus: "" };
    paint();
  }
});

document.addEventListener("change", (ev) => {
  const user = ev.target.closest("[data-user]");
  if (user) {
    const u = store.setUser(user.value);
    toast(`<strong>สลับผู้ใช้เป็น ${esc(u.name)}</strong><br><span class="small">${esc(ROLE_LABEL[u.role])} · เห็น ${
      visibleDocs(u, store.list()).length
    } เอกสาร · งานที่ต้องทำเอง ${visibleDocs(u, store.list()).filter((d) => isMyTask(u, d)).length}</span>`, "info", 6500);
    paint();
    return;
  }
  const f = ev.target.closest("[data-filter]");
  if (f) {
    const scope = f.dataset.scope || currentRoute().view || "queue";
    if (!filters[scope]) filters[scope] = {};
    const key = f.dataset.filter;
    filters[scope][key] = f.type === "checkbox" ? (f.checked ? f.value || "1" : "") : f.value;
    paint();
  }
});

/** พิมพ์ในช่องค้นหา: อัปเดตทันที แต่คืน focus + ตำแหน่ง cursor ให้เหมือนเดิม */
document.addEventListener("input", (ev) => {
  const f = ev.target.closest("[data-filter]");
  if (!f || f.tagName === "SELECT") return;
  const scope = f.dataset.scope || currentRoute().view || "queue";
  if (!filters[scope]) filters[scope] = {};
  filters[scope][f.dataset.filter] = f.value;
  const pos = f.selectionStart ?? f.value.length;
  paint();
  const again = document.querySelector(`[data-filter="${f.dataset.filter}"]${f.dataset.scope ? `[data-scope="${f.dataset.scope}"]` : ""}`);
  if (again) {
    again.focus();
    again.setSelectionRange?.(pos, pos);
  }
});

window.addEventListener("hashchange", paint);
paint();

/* ช่วย debug: เปิด store จาก console */
globalThis.__aiva = { store, validateSnapshot };
