/* =============================================================
 * AIVA Invoice Portal v3 mockup — UI layer
 * โหลดเป็น classic script (เปิดจาก file:// ได้ ไม่ต้อง build)
 * ลำดับ: data.js → domain.js → docs.js → app.js
 * ============================================================= */
"use strict";

/* ---------------- state ---------------- */
let ME = null;
let page = "queue";
let sel = null;
let tab = "sum";
let filt = "all";
let coF = new Set();
let auditF = { q: "", act: "" };
let auditPage = 1;
const AUDIT_PAGE_SIZE = 10;
let AUDIT = [];
let OUTBOX = [];
let viewerDoc = null;
let viewerPage = 1;
let viewerRev = null;
let zoom = 100;
let pending = null;
let sortK = "urg";
let qPage = 1;
let viewRev = null; /* revision ที่กำลังดู (null = revision ล่าสุด) */
let auditMsg = null;
const QUEUE_PAGE = 8;
const IDEM = {}; /* Idempotency-Key → payload signature/result (จำลอง side effect ของ backend) */

/* ---------------- master data helpers ---------------- */
const MASTER_BY_ORG = Object.fromEntries(MASTER.map(m => [m.org, m]));
const entOf = org => (org == null ? null : MASTER_BY_ORG[org] || null);
const coKeyOfTax = tax => Object.keys(CO).find(k => CO[k].tax && CO[k].tax === tax) || "?";

/* Decimal ↔ float: ค่าที่เป็น string คือเลขตรงจาก snapshot (portal ห้ามแปลงแล้วแสดงผลลัพธ์ที่เปลี่ยนไป) */
function B(n) {
  if (n == null || n === "") return "—";
  if (typeof n === "string") return n; /* แสดงตรงตาม snapshot */
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}
/* ค่าตัวเลขสำหรับเปรียบเทียบ/คำนวณ (แปลง string ตามเกณฑ์ tolerance ของ engine) */
const NUM = v => (typeof v === "string" ? Number(v.replace(/,/g, "")) || 0 : Number(v || 0));
/* แสดงเลขแบบไม่ปัด: string ออกตรงตัว, number ใช้ตัวคั่นหลักพัน */
const EX = v => (typeof v === "string" ? v : B(v));
const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9\u0E00-\u0E7F]/g, "");

/* ฟังก์ชัน hash สำหรับ demo ล่า chain ของ audit (ของจริงต้องเป็น HMAC + append-only store) */
function hashOf(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const nowT = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const toastEl = (msg, kind) => {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast on " + (kind || "");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => (t.className = "toast"), 4600);
};

/* ---------------- derive document fields ---------------- */
function decorate(d) {
  const ent = entOf(d.org);
  d._ent = ent;
  d.company = ent ? coKeyOfTax(ent.tax) : coKeyOfTax(d.taxHint || "");
  d.companyName = ent ? ent.name : CO[d.company] ? CO[d.company].name : "ไม่ระบุบริษัทใน Master";
  d.ouShort = d.org != null ? ORG_SHORT[d.org] || "ORG" + d.org : "—";
  d.owner = d.receiver || null;
  d.ownerSrc = d.receiver ? "RECEIVER จากใบรับ (RCV_VRC_HDS_V)" : "ยังไม่พบใบรับ → ไม่มี Receiver";
  d.receiverActive = !d.receiver || USERS.some(u => u.role === "EU" && u.rcv === d.receiver);
  const closed = ["REJECTED", "POSTED", "CONFIRMED"].includes(d.wf);
  d.assigned = closed
    ? "—"
    : d.status === "Auto-pass"
    ? "ระบบ"
    : !d.receiver
    ? "accounting"
    : ownerOf(d.codes);
  d._recomputed = d.dup ? d.status : decide(d.rules);
  d._statusDrift = d._recomputed !== d.status && !d.error;
  d.isDup = !!d.dup;
  d.unmapped = d.company === "?";
  return d;
}
const verifyBadge = d => (d.isDup && d.status === "Auto-pass" ? "Duplicate" : d.status);
const bVer = d => `<span class="b s-${verifyBadge(d).replace(/[- ]/g, "")}">${verifyBadge(d)}</span>`;
const bWf = d => `<span class="b w-${String(d.wf).split("_")[0]}">${WF_LABEL[d.wf] || d.wf}</span>`;
const bProc = d => `<span class="b p-${d.proc}">${d.proc}</span>`;

/* ---------------- RBAC scope ---------------- */
const can = p => (ROLES[ME.role].p || []).includes(p);
function scopeCheck(d, u) {
  u = u || ME;
  const r = ROLES[u.role];
  if (r.scope === "none") return { ok: false, why: "บทบาทนี้ไม่เข้าถึงเนื้อหาเอกสาร (ดูได้เฉพาะหน้าสิทธิ์และการเชื่อมบัญชี)" };
  if (!u.co.includes(d.company)) {
    /* ORG ที่ไม่มีใน Master → ไม่ map เข้าบริษัทใด: ให้ฝ่ายบัญชีเห็นพร้อมป้ายเตือน
       (fail-safe ต้องมีคนรับผิดชอบ ไม่ใช่หายไปจากทุกคิว) */
    if (d.company === "?" && r.scope === "company") return { ok: true, unmapped: true };
    return { ok: false, why: `เอกสารอยู่นอกบริษัทที่ได้รับมอบหมาย (${d.company === "?" ? "ยังไม่ map จาก Master" : d.company})` };
  }
  if (r.scope === "receiver") {
    if (!d.receiver) return { ok: false, why: "เอกสารยังไม่มี Receiver ในใบรับ · ฝ่ายบัญชีดำเนินการ" };
    if (d.receiver !== u.rcv) return { ok: false, why: `ไม่ได้เป็น Receiver ของใบรับนี้ (Receiver = ${d.receiver})` };
  }
  return { ok: true };
}
const visible = () => DOCS.filter(d => scopeCheck(d).ok);

/* ---------------- audit + outbox ---------------- */
function log(act, doc, detail, res) {
  AUDIT.unshift({ t: nowT(), who: ME.email, role: ROLES[ME.role].n, act, doc, detail: detail || "", res: res || "" });
  rechain();
}
/* ผูก audit เป็น hash chain (จำลอง tamper-evident log): entries เรียงจากใหม่ไปเก่า
   → คำนวณจากเหตุการณ์เก่าสุดไปใหม่สุด แต่ละรายการผูก hash ของรายการก่อนหน้า */
function rechain() {
  let prev = "GENESIS";
  for (let i = AUDIT.length - 1; i >= 0; i--) {
    const a = AUDIT[i];
    a.ph = prev;
    a.h = hashOf([prev, a.t, a.who, a.role, a.act, a.doc, a.detail, a.res].join("|"));
    prev = a.h;
  }
  auditMsg = null;
  return AUDIT.length;
}
function verifyChain() {
  let prev = "GENESIS";
  for (let i = AUDIT.length - 1; i >= 0; i--) {
    const a = AUDIT[i];
    const calc = hashOf([a.ph, a.t, a.who, a.role, a.act, a.doc, a.detail, a.res].join("|"));
    if (a.ph !== prev) return { ok: false, at: AUDIT.length - i, why: "ค่า hash ของรายการก่อนหน้าไม่ต่อเนื่อง (record ถูกถอด/สลับลำดับ)" };
    if (a.h !== calc) return { ok: false, at: AUDIT.length - i, why: "เนื้อหารายการไม่ตรงกับ hash ที่บันทึกไว้ (record ถูกแก้)" };
    prev = a.h;
  }
  return { ok: true, n: AUDIT.length };
}
/* separation of duties: so same person (enriched by Entra/Oracle username) */
function samePerson(d, u) {
  u = u || ME;
  const up = norm(d.upl);
  if (!up) return false;
  return up === norm(u.email.split("@")[0]) || up === norm(u.n) || (u.rcv !== "—" && up === norm(u.rcv));
}
function matchKpi(d, k) {
  if (k === "all") return true;
  if (k === "mine") return d.assigned === (ME.role === "EU" ? "user" : "accounting") && !["POSTED", "REJECTED"].includes(d.wf);
  if (k === "dup") return d.isDup;
  return d.status === k;
}
const coPass = d => coF.size === 0 || coF.has(d.company);

/* ---------------- bootstrap ---------------- */
function boot() {
  ME = USERS.find(u => u.id === BOOT.user) || USERS[0];
  sel = BOOT.doc;
  page = BOOT.page;
  AUDIT = AUDIT0.map(a => Object.assign({}, a));
  OUTBOX = OUTBOX0.map(o => Object.assign({}, o));
  DOCS.forEach(decorate);
  rechain();
  document.getElementById("user").innerHTML = USERS
    .map(u => `<option value="${u.id}">${esc(u.n)} · ${ROLES[u.role].n} · ${esc(u.unit)}</option>`)
    .join("");
  /* ต้องsetค่า select ก่อน switchUser ไม่งั้น dropdown จะค้างที่ option แรก แล้ว BOOT.user จะไม่ถูกใช้ */
  document.getElementById("user").value = BOOT.user;
  switchUser(true);
}
function switchUser(first) {
  ME = USERS.find(u => u.id === document.getElementById("user").value) || ME;
  const r = ROLES[ME.role];
  const rb = document.getElementById("rolebadge");
  rb.textContent = r.n;
  rb.style.background = r.bg;
  rb.style.color = r.c;
  document.getElementById("who").innerHTML = `${esc(ME.n)}<small class="mono">${esc(ME.email)}</small>`;
  page = ME.role === "ADM" ? "rbac" : "queue";
  filt = ME.role === "EU" ? "mine" : "all";
  coF = new Set();
  tab = "sum";
  viewRev = null;
  qPage = 1;
  auditMsg = null;
  const list = visible();
  if (!list.some(d => d.doc === sel)) sel = (list[0] || {}).doc || null;
  log("เข้าสู่ระบบ", "—", `Entra ID ${ME.email}` + (ME.rcv !== "—" ? ` · Oracle RECEIVER = ${ME.rcv} (EMPLOYEE_ID ${ME.emp ?? "—"})` : ""));
  render();
  if (!first) toastEl("สลับบทบาทเป็น " + ME.n + " — ขอบเขตข้อมูลที่เห็นเปลี่ยนตาม RBAC");
}

/* ---------------- shell ---------------- */
function nav() {
  const items = [
    ["queue", ME.role === "EU" ? "งานของฉัน" : "คิวตรวจสอบ", ME.role !== "ADM"],
    ["rbac", "สิทธิ์และการเชื่อมบัญชี", true],
    ["audit", "บันทึกการเข้าถึง", can("AUDIT")],
    ["ref", "มาตรฐานและรหัส", true],
  ];
  document.getElementById("nav").innerHTML = items
    .map(([k, n, on]) => `<a class="${page === k ? "on" : ""} ${on ? "" : "dis"}" ${on ? `onclick="go('${k}')"` : ""}>${n}</a>`)
    .join("");
}
function go(p) {
  page = p;
  render();
}
function render() {
  nav();
  const app = document.getElementById("app");
  if (page === "rbac") app.innerHTML = rbacPage();
  else if (page === "audit") app.innerHTML = auditView();
  else if (page === "ref") app.innerHTML = refPage();
  else {
    app.innerHTML = queueShell();
    drawList();
    drawDetail();
  }
}

/* ---------------- queue ---------------- */
const KPIS = [
  ["all", "ทั้งหมด", "เอกสารในขอบเขตสิทธิ์ที่เข้าถึงได้"],
  ["Auto-pass", "Auto-pass", "Low exception ยังนับเป็น Auto-pass"],
  ["Review", "Review", "มี Medium exception"],
  ["Hold", "Hold", "มี High exception"],
  ["Manual Review", "Manual Review", "fail-safe / master ไม่พร้อม"],
  ["dup", "เอกสารซ้ำ", "Portal คุมก่อนตั้งหนี้ แม้ผลตรวจผ่าน"],
  ["mine", "งานของฉัน", "ที่ engine มอบหมายให้ฝั่งของฉัน และยังเปิดอยู่"],
];

/* ลำดับความเร่งด่วน: สถานะงานก่อน แล้วตามด้วยอายุเอกสาร (SLA งาน) */
const URG = { Hold: 0, "Manual Review": 1, Review: 2, "Auto-pass": 3 };
const urgOf = d => {
  const w = waitingOf(d).length ? -1 : 0;
  const mine = todoOf(d)[1] === (ME.role === "EU" ? "user" : "accounting") ? 0 : 1;
  return [URG[d.status] ?? 9, w, mine, d.date];
};

function queueShell() {
  const v = visible();
  const r = ROLES[ME.role];
  const kpiHtml = KPIS.map(([k, label, sub]) => {
    const n = v.filter(d => matchKpi(d, k)).length;
    return `<div class="kpi ${filt === k ? "on" : ""}" onclick="setFilt('${k}')"><b>${n}</b><span>${label}</span><small>${sub}</small></div>`;
  }).join("");
  const companies = Array.from(new Set(v.map(d => d.company)));
  const chips = [`<span class="chip ${coF.size === 0 ? "on" : ""}" onclick="togCo(null)">ทุกบริษัท</span>`]
    .concat(companies.map(c => `<span class="chip ${coF.has(c) ? "on" : ""}" onclick="togCo('${c}')">${c === "?" ? "ยังไม่ map" : c}</span>`))
    .join("");
  const scopeNote =
    r.scope === "receiver"
      ? "ขอบเขต: <b>เฉพาะใบรับที่ตนเป็น Receiver</b> (VIEW_OWN) — เอกสารที่ยังไม่มี Receiver จะไม่โผล่ในคิวของ End User"
      : r.scope === "company"
      ? "ขอบเขต: <b>ทั้งบริษัทที่ได้รับมอบหมาย</b> (VIEW_CO) — " + ME.co.join(", ")
      : "ขอบเขต: ไม่มีสิทธิ์อ่านเนื้อหาเอกสาร";
  return `
<div class="scope"><div class="box">
  <span>🧭 ${scopeNote}</span><span class="sp"></span>
  <span>${chips}</span>
  <span class="pill">schema 1.0 · engine Standard 6.2 as-built</span>
</div></div>
<div class="kpis">${kpiHtml}</div>
<div class="wrap">
  <div class="panel queue-sidebar">
    <div class="ph"><span>คิวตรวจสอบ <span id="qn" class="pill"></span></span><span class="pill">${filt === "mine" ? "งานของฉัน" : filt === "all" ? "ทั้งหมด" : filt}</span></div>
    <div class="srch"><input id="q" placeholder="ค้นหาเลขที่ใบแจ้งหนี้ / PO / ผู้ขาย / ใบรับ" oninput="qPage=1;drawList()">
      <select id="sort" onchange="sortK=this.value;qPage=1;drawList()" title="เรียงลำดับคิว">
        ${[["urg", "เรียง: ความเร่งด่วน"], ["date", "เรียง: วันที่เอกสาร"], ["amount", "เรียง: ยอดเงิน"], ["inv", "เรียง: เลขที่"]]
          .map(([v, n]) => `<option value="${v}" ${sortK === v ? "selected" : ""}>${n}</option>`)
          .join("")}
      </select></div>
    <div class="q" id="list"></div>
    <div class="qpg" id="qpg"></div>
  </div>
  <div class="detail-pane" id="detail"></div>
</div>`;
}
function setFilt(k) {
  filt = filt === k ? "all" : k;
  render();
}
function togCo(c) {
  if (c === null) coF = new Set();
  else if (coF.has(c)) coF.delete(c);
  else coF.add(c);
  render();
}
function resetFilt() {
  filt = "all";
  coF = new Set();
  qPage = 1;
  const box = document.getElementById("q");
  if (box) box.value = "";
  render();
  toastEl("ล้างตัวกรองแล้ว — คิวแสดงทุกเอกสารที่สิทธิ์ปัจจุบันเข้าถึงได้");
}
function drawList() {
  const el = document.getElementById("list");
  if (!el) return;
  const q = ((document.getElementById("q") || {}).value || "").toLowerCase();
  let L = visible()
    .filter(d => matchKpi(d, filt) && coPass(d))
    .filter(d => [d.inv, d.po || "", d.vendor, d.rcv || "", d.ext].join(" ").toLowerCase().includes(q));
  const cmp = {
    urg: (a, b) => {
      const x = urgOf(a), y = urgOf(b);
      for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
      return 0;
    },
    date: (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0),
    amount: (a, b) => NUM(b.total) - NUM(a.total),
    inv: (a, b) => (a.inv > b.inv ? 1 : -1),
  }[sortK];
  L = L.slice().sort(cmp);
  const total = L.length;
  const pages = Math.max(1, Math.ceil(total / QUEUE_PAGE));
  if (qPage > pages) qPage = pages;
  if (qPage < 1) qPage = 1;
  const shown = L.slice((qPage - 1) * QUEUE_PAGE, qPage * QUEUE_PAGE);
  const qpg = document.getElementById("qpg");
  if (qpg)
    qpg.innerHTML =
      total > QUEUE_PAGE
        ? `<button class="bg bsm" ${qPage === 1 ? "disabled" : ""} onclick="qPage--;drawList()">← ก่อนหน้า</button>
           <span class="pill">แสดง ${(qPage - 1) * QUEUE_PAGE + 1}–${(qPage - 1) * QUEUE_PAGE + shown.length} จาก ${total}</span>
           <button class="bg bsm" ${qPage === pages ? "disabled" : ""} onclick="qPage++;drawList()">ถัดไป →</button>`
        : "";
  document.getElementById("qn").textContent = total + " ฉบับ";
  if (!total)
    return (el.innerHTML = `<div class="empty">ไม่พบเอกสารในขอบเขตสิทธิ์นี้<br><span class="src">scope = ${ROLES[ME.role].scope}</span></div>`);
  const offList = sel && !shown.some(d => d.doc === sel) ? visible().find(d => d.doc === sel) : null;
  const offHint = offList
    ? `<div class="qioff">
        <div class="v">เอกสารที่เปิดอยู่ (<b>${esc(offList.inv)}</b>) ไม่อยู่ในตัวกรอง/หน้าปัจจุบัน</div>
        <div class="r2"><span class="dmsl" onclick="resetFilt()">ล้างตัวกรองเพื่อดูเอกสารนี้ในคิว</span></div>
      </div>`
    : "";
  el.innerHTML =
    offHint +
    shown
      .map(d => {
        const [todo, who] = todoOf(d);
        return `
    <div class="qi ${d.doc === sel ? "on" : ""}" onclick="pick('${d.doc}')">
      <div class="r1"><span class="inv">${esc(d.inv)}</span>${bVer(d)}</div>
      <div class="v">${esc(d.vendor)}</div>
      <div class="todo ${todoCls(who)}">📌 ${esc(todo)}</div>
      <div class="r2"><span>PO ${esc(d.po || "—")} · <span class="co">${d.unmapped ? "ไม่ map" : d.company}/${d.ouShort}</span></span><span class="mono">${B(d.total)}</span></div>
      <div class="r2">${d.codes.length ? d.codes.map(c => `<span class="code">${c}</span>`).join("") : '<span class="ok">ไม่มี exception</span>'}<span>${bWf(d)}</span></div>
    </div>`;
      })
      .join("");
}
/* revision snapshot — mockup เก็บเฉพาะเอกสารที่ถูกแก้รอบ (docs 05: revision selector + historical banner) */
function revsOf(d) {
  if (d.revs && d.revs.length) return d.revs.slice().sort((a, b) => b.rev - a.rev);
  return [
    {
      rev: d.rev, round: d.round, at: (d.date || "") + " · รับเอกสาร", by: d.upl, status: d.status, codes: d.codes,
      sub: d.sub, vat: d.vat, total: d.total, pages: d.pages, pc: d.pc, sigS: d.sigS, sigR: d.sigR,
      rulesNote: null, note: d.note || "", closed: null,
    },
  ];
}
/* view model ของ revision ที่เลือก (ข้อมูล immutable ของ revision นั้น ไม่แตะ object จริง) */
function revVM(d) {
  if (viewRev == null || viewRev === d.rev) return d;
  const snap = revsOf(d).find(r => r.rev === viewRev);
  if (!snap) return d;
  return Object.assign({}, d, {
    rev: snap.rev, round: snap.round, status: snap.status, codes: snap.codes,
    sub: snap.sub, vat: snap.vat, total: snap.total, pages: snap.pages, pc: snap.pc,
    sigS: snap.sigS, sigR: snap.sigR, _hist: true, _rulesNote: snap.rulesNote, _snapNote: snap.note,
  });
}
function setRev(v) {
  const d = DOCS.find(x => x.doc === sel);
  viewRev = v === "" || Number(v) === d.rev ? null : Number(v);
  drawDetail();
}
/* ข้อความเตือนเมื่อเปิดดู revision เก่า (ของจริง: snapshot ต่อ revision + PDF แยกไฟล์) */
function histNote(d) {
  if (!d._hist) return "";
  const cur = (DOCS.find(x => x.doc === d.doc) || {}).rev;
  return `<div class="note w" style="margin:0 0 10px">กำลังดู <b>revision ${d.rev}</b> (immutable) · ตารางนี้ยังแสดงการประเมินของ revision ล่าสุด (${cur}) — snapshot ของ revision เก่าแสดงในหัวข้อและแท็บ JSON · production เก็บ snapshot และไฟล์ PDF แยกต่อ revision ไม่ทับของเดิม</div>`;
}
function pick(id) {
  sel = id;
  tab = "sum";
  viewRev = null;
  drawList();
  drawDetail();
}
const sevOf = (d, c) => {
  const r = d.rules.find(x => x.code === c);
  return r ? r.severity || "Low" : "";
};

/* ---------------- detail ---------------- */
function stepStatus(d, s) {
  const rs = d.rules.filter(r => RSTEP[r.rule_id] === s);
  if (!rs.length) return ["skip", "ไม่มีกฎในขั้นนี้"];
  if (rs.every(r => r.result === N)) return ["skip", "ไม่ได้ประเมิน (Bypass)"];
  if (rs.some(r => r.result === M)) return ["warn", "ต้องตรวจด้วยคน"];
  if (rs.some(r => r.result === F && r.severity === "High")) return ["bad", "พบ High"];
  if (rs.some(r => r.result === F)) return ["warn", "พบข้อสังเกต"];
  return ["ok", "ผ่าน"];
}
function drawDetail() {
  const el = document.getElementById("detail");
  if (!el) return;
  const d = DOCS.find(x => x.doc === sel);
  if (!d) return (el.innerHTML = `<div class="panel doc"><div class="empty">เลือกเอกสารจากคิวด้านซ้าย</div></div>`);
  const sc = scopeCheck(d);
  const dv = revVM(d);
  const revs = revsOf(d);
  if (!sc.ok)
    return (el.innerHTML = `<div class="panel doc"><div class="empty">🔒 ${esc(sc.why)}<br><span class="src">backend ต้องตรวจสิทธิ์ทุก route รวมถึงเปิด URL ตรง — ตอนนี้เป็นการจำลองใน UI</span></div></div>`);

  const steps = [1, 2, 3].map(s => {
    const [cls, txt] = stepStatus(d, s);
    return `<div class="st ${cls}">${STEP_NAMES[s - 1]}<small>${txt}</small></div>`;
  });
  /* ขั้นที่ 4 = งานในมือ portal (ต่างจาก 3 ขั้นของ engine) เพื่อให้เห็น pipeline ครบ */
  const portalStep =
    d.wf === "CONFIRMED" || d.wf === "POSTED" ? ["ok", d.wf === "POSTED" ? "ส่งตั้งหนี้แล้ว" : "ยืนยันแล้ว"]
    : d.wf === "REJECTED" ? ["bad", "ปฏิเสธ"]
    : d.wf === "ON_HOLD" ? ["bad", "พักไว้ (On Hold)"]
    : d.wf === "RESUBMITTED" ? ["warn", "รอ revision ใหม่"]
    : ["warn", `รอ ${d.assigned === "user" ? "ผู้รับของ" : "ฝ่ายบัญชี"} ตัดสิน`];
  steps.push(`<div class="st ${portalStep[0]}">Portal ตรวจซ้ำ / ตัดสิน<small>${portalStep[1]}</small></div>`);
  const bypassed = d.rules.filter(r => r.halted_by).length;
  if (bypassed) steps.push(`<div class="st skip">${bypassed} กฎไม่ได้ประเมิน<small>Bypass โดย ${esc(d.halted || "critical error")}</small></div>`);

  const tabs = [
    ["sum", "สรุปและดำเนินการ", d.codes.length],
    ["lines", "รายการสินค้า (3-Way)", 0],
    ["rules", "กฎการตรวจ V-01–V-09", d.rules.filter(r => r.result === F).length],
    ["evid", "หลักฐานและลายเซ็น", 0],
    ["hist", "ประวัติและ action", (d.prevRev ? 1 : 0) + OUTBOX.filter(o => o.doc === d.doc && o.state !== "completed").length],
    ["json", "JSON snapshot", 0],
  ];
  const pane = (k, h) => `<div class="pane ${tab === k ? "on" : ""}">${h}</div>`;

  el.innerHTML = `
  <div class="doc">
    <div class="dh">
      <div>
        <h2>${esc(d.inv)} ${bVer(d)} ${bWf(d)} ${bProc(d)} <span class="co">${d.unmapped ? "ยังไม่ map จาก Master" : d.company} · ORG ${d.org ?? "?"} (${d.ouShort})</span>
          ${d.isDup ? `<span class="b s-Duplicate">ซ้ำกับ ${d.dup}</span>` : ""}</h2>
        <div class="meta">
          <span>ผู้ขาย <b>${esc(d.vendor)}</b></span>
          <span>Tax ID ผู้ขาย <b class="mono">${esc(d.vtax || "ไม่พบ")}</b></span>
          <span>PO <b class="mono">${esc(d.po || "ไม่พบ")}</b></span>
          <span>Release <b class="mono">${d.release ?? "—"}</b></span>
          <span>ใบรับ <b class="mono">${d.rcv ? esc(d.rcv) : "ไม่พบ"}</b></span>
          <span>Receiver <b>${esc(d.receiver || "ไม่มี")}</b></span>
          <span>ผู้ส่งเอกสาร <b class="mono">${esc(d.upl)}</b></span>
          <span>วันที่ <b class="mono">${d.date}</b></span>
          <span>หน้า <b>${d.pages}</b>${d.pc ? "" : ' <span class="bad">อ่านไม่ครบ</span>'}</span>
        </div>
      </div>
      <div style="text-align:right">
        <div class="total-number">${B(d.total)} ${d.cur}</div>
        <div class="axes"><span>ตรวจ <b>${verifyBadge(d)}</b></span>·<span>งาน <b>${WF_LABEL[d.wf] || d.wf}</b></span>·<span>ผล <b>${d.proc}</b></span></div>
        <div class="axes"><span>รอบ <b>${dv.round}</b></span>·<span>revision
          <select id="rev" class="revsel" onchange="setRev(this.value)" title="เลือกดู revision snapshot (PDF และ JSON ตรงรุ่นกัน)">
            ${revs
              .map(r => `<option value="${r.rev}" ${r.rev === dv.rev ? "selected" : ""}>${r.rev} (รอบ ${r.round})${r.rev === d.rev ? " · ล่าสุด" : " · เก่า"}</option>`)
              .join("")}
          </select></span>·<span>wf_version <b>${d.wfv}</b></span></div>
        <button class="bg bsm" onclick="openViewer('${d.doc}',1)">📄 เอกสารต้นทาง</button>
      </div>
    </div>
    <div class="flow">${steps.join("")}</div>
    ${
      dv._hist
        ? `<div class="note w" style="margin:10px 14px 0">🕘 กำลังดู <b>snapshot ของ revision ${dv.rev}</b> · สถานะตรวจ <b>${dv.status}</b> (${
            (dv.codes || []).join(", ") || "ไม่มี exception"
          }) · ยอดรวม <b class="mono">${B(dv.total)}</b> ${dv.pc ? "" : "· <span class='bad'>อ่านเอกสารไม่ครบ</span>"}<br>
           <span class="src">${esc(dv._snapNote || "")} · ปิด revision นี้ด้วย: ${esc((revs.find(r => r.rev === dv.rev) || {}).closed || "—")} · ทำ action ไม่ได้ (ของจริงตอบ 409) และ snapshot/audit ไม่ถูกแก้</span></div>`
        : revs.length > 1
        ? `<div class="note i" style="margin:10px 14px 0">เอกสารนี้มีการตรวจ ${revs.length} revision · ผลที่กำลังแสดงคือ revision ล่าสุด (${d.rev}) · เลือกดู revision เก่าได้จากกล่องด้านบน (immutable · PDF/JSON ตรงรุ่น)</div>`
        : ""
    }
    <div class="tabs" id="tabs">${tabs
      .map(
        ([k, n, c]) =>
          `<div class="tab ${tab === k ? "on" : ""}" tabindex="0" role="tab" aria-selected="${tab === k}" onclick="setTab('${k}')" onkeydown="tabKey(event,'${k}')">${n}${c ? `<span class="cnt">${c}</span>` : ""}</div>`
      )
      .join("")}</div>
    ${pane("sum", nextCard(d) + sumPane(dv))}
    ${pane("lines", linesPane(dv))}
    ${pane("rules", rulesPane(dv))}
    ${pane("evid", evidPane(dv))}
    ${pane("hist", histPane(dv, d))}
    ${pane("json", jsonPane(dv))}
    ${actionBar(d)}
  </div>`;
}
const TAB_ORDER = ["sum", "lines", "rules", "evid", "hist", "json"];
function setTab(k) {
  tab = k;
  drawDetail();
}
function tabKey(e, k) {
  const i = TAB_ORDER.indexOf(k);
  let n = -1;
  if (e.key === "ArrowRight") n = Math.min(TAB_ORDER.length - 1, i + 1);
  else if (e.key === "ArrowLeft") n = Math.max(0, i - 1);
  else if (e.key === "Home") n = 0;
  else if (e.key === "End") n = TAB_ORDER.length - 1;
  else if (e.key === "Enter" || e.key === " ") n = i;
  if (n < 0) return;
  e.preventDefault();
  setTab(TAB_ORDER[n]);
}

/* ---------------- tab: summary ---------------- */
function sumPane(d) {
  const fails = d.rules.filter(r => r.result === F || r.result === M);
  const cards = fails
    .map(r => {
      const meta = EXC62[r.code] || {};
      const own =
        r.result === M ? "ตรวจด้วยคน 100%" : USER_TASK_CODES.includes(r.code) ? "มอบหมาย: ผู้ใช้งาน (Receiver)" : "มอบหมาย: ฝ่ายบัญชี";
      return `<div class="ex ${r.severity || "Low"}">
      <h5><span class="code sev-${r.severity || "Low"}">${r.code || "MANUAL"}</span>
        <span class="${r.severity || ""}">${esc(meta.desc || "ต้องพิจารณาด้วยคน (manual_review)")}</span>
        <span class="pill">${r.rule_id} ${esc(RULE_NAME[r.rule_id] || "")}</span>
        <span class="who">${own}</span></h5>
      <p>${esc(r.evidence || "ไม่มีรายละเอียดใน snapshot")}</p>
      ${r.page ? `<div class="ev"><span>หลักฐาน: หน้า ${r.page} ของ ${d.ext}</span><span class="dmsl" onclick="openViewer('${d.doc}',${r.page})">เปิดหน้า ${r.page} ในเอกสารต้นทาง ↗</span></div>` : ""}
    </div>`;
    })
    .join("");
  const drift = d._statusDrift
    ? `<div class="note e">⚠ ผลสรุปใน snapshot (<b>${d.status}</b>) ไม่ตรงกับที่ engine คำนวณซ้ำจาก rules (<b>${d._recomputed}</b>) — portal ต้องแสดงข้อแย้งนี้ และห้ามแก้ snapshot ต้นทาง</div>`
    : "";
  const dup = d.isDup ? `<div class="note d">ตรวจพบเอกสารซ้ำ (ผู้ขาย + เลขที่ใบแจ้งหนี้) กับ <b>${d.dup}</b> · ผลตรวจต้นทางยังเป็นการดำเนินการปกติ แต่ portal ระงับการตั้งหนี้ไว้ก่อน</div>` : "";
  const err = d.error
    ? `<div class="note e">pipeline ล้มและติดแท็ก <b>${d.error}</b> → fail-safe ห้าม Auto-pass (หลักการ D6) · ต้อง rerun เมื่อ producer พร้อม</div>`
    : "";
  const unmapped = d.unmapped
    ? `<div class="note d">ORG_ID <b>${d.org ?? "ว่าง"}</b> ไม่มีใน Master (${MASTER.length} แถว) หรือ Tax ID ว่าง → <b>ยังไม่ map เป็นบริษัทใด</b> · เอกสารถูกส่งมาให้ฝ่ายบัญชีพร้อมป้ายเตือน ห้าม auto-map หรือเดาแทนผู้ใช้</div>`
    : "";
  return `
  ${err}${unmapped}${dup}${drift}
  ${
    fails.length
      ? `<div class="ph" style="background:none;border:0;padding:0 0 8px">พบ ${fails.length} ข้อที่ต้องดำเนินการ · ${d.codes
          .map(c => `<span class="code">${c}</span>`)
          .join(" ")}</div>${cards}`
      : `<div class="note g">✅ ไม่พบ exception — ผ่านครบทั้ง 9 กฎ</div>`
  }
  <div class="grid2" style="margin-top:12px">
    <div class="card"><h4>ยอดรวมในใบแจ้งหนี้ (V-03)${d.decStr ? ' <span class="pill mono">Decimal string</span>' : ""}</h4>
      <div class="kv"><span>รวมก่อนภาษี</span><b class="mono">${B(d.sub)}</b></div>
      <div class="kv"><span>ภาษีมูลค่าเพิ่ม 7%</span><b class="mono">${B(d.vat)}</b></div>
      <div class="kv"><span>ยอดรวม</span><b class="mono">${B(d.total)}</b></div>
      <div class="kv"><span>คำนวณใหม่ sub + vat</span><b class="mono">${B(NUM(d.sub) + NUM(d.vat))}</b></div>
    </div>
    <div class="card"><h4>ยอดเทียบใบรับสินค้า (V-09)</h4>
      <div class="kv"><span>Σ(จำนวนรับ × ราคาใบรับ)</span><b class="mono">${B(d.rtotal)}</b></div>
      <div class="kv"><span>subtotal ในบิล</span><b class="mono">${B(d.sub)}</b></div>
      <div class="kv"><span>ผลต่าง</span><b class="mono ${d.rtotal != null && Math.abs(NUM(d.sub) - d.rtotal) > 0.5 ? "diff" : "ok"}">${
        d.rtotal == null ? "ไม่มีข้อมูลใบรับ" : B(Math.abs(NUM(d.sub) - d.rtotal))
      }</b></div>
      <div class="kv"><span>เกณฑ์</span><span>abs diff ≤ 0.50 บาท</span></div>
      ${
        d.decStr
          ? `<div class="note w" style="margin:8px 0 0">เลขในเอกสารนี้เป็น <b>string ตรงตาม snapshot</b> (เช่น 18,400.0002) · portal แสดงเลขเดิมของผู้ขาย ไม่แปลงเป็น float แล้วปัดผลต่างให้หาย · เกณฑ์ 0.50 บาทใช้เฉพาะการ "ตัดสิน" เท่านั้น ดู <span class="dmsl" onclick="go('ref')">ข้อขัดแย้ง Decimal ↔ float</span></div>`
          : ""
      }
    </div>
    <div class="card"><h4>ผู้รับผิดชอบและสถานะงาน</h4>
      <div class="kv"><span>Engine มอบหมายให้</span><b>${d.assigned === "user" ? "ผู้ใช้งาน (Receiver)" : d.assigned === "accounting" ? "ฝ่ายบัญชี" : "ระบบ (ไม่มีงาน)"}</b></div>
      <div class="kv"><span>Receiver</span><span>${esc(d.owner || "ไม่มี")} <span class="src">· ${esc(d.ownerSrc)}</span></span></div>
      <div class="kv"><span>Receiver มีบัญชีใน portal</span><span class="${d.receiverActive ? "ok" : "bad"}">${
        d.receiverActive ? "พบการเชื่อมบัญชี" : "ไม่พบ — ต้องเชื่อม Entra ↔ Oracle RECEIVER ก่อนเปิดใช้จริง"
      }</span></div>
      <div class="kv"><span>workflow</span><span>${WF_LABEL[d.wf] || d.wf} · wf_version ${d.wfv}</span></div>
    </div>
    <div class="card"><h4>หมายเหตุจาก snapshot</h4>
      <p style="font-size:12.4px;color:var(--mut)">${esc(d.note || "—")}</p>
      <p class="src" style="margin-top:8px">ลำดับ decision: manual_review → <b>Manual Review</b> · มี High → <b>Hold</b> · มี Medium → <b>Review</b> · นอกจากนั้นรวม Low → <b>Auto-pass</b></p>
    </div>
  </div>`;
}

/* ---------------- tab: lines ---------------- */
function linesPane(d) {
  const rows = d.lines
    .map((l, i) => {
      const [desc, qty, uom, price, amount, rline, rqty, rprice, mm] = l;
      const noR = rline == null;
      const math = NUM(qty) * NUM(price) - NUM(amount);
      const qD = noR ? null : NUM(qty) - NUM(rqty);
      const pD = noR ? null : NUM(price) - NUM(rprice);
      const bad = Math.abs(math) > 0.5;
      return `<tr class="${bad || (qD && qD > 0) ? "rz" : ""}">
      <td>${i + 1}</td>
      <td>${esc(desc)}${bad ? '<div class="src bad">V-02: qty × price ≠ amount (ต่าง ' + B(math) + ")</div>" : ""}</td>
      <td class="n">${B(qty)}</td><td>${uom}</td>
      <td class="n">${B(price)}</td><td class="n">${B(amount)}</td>
      <td>${noR ? '<span class="na">—</span>' : rline}</td>
      <td class="n">${noR ? '<span class="na">—</span>' : B(rqty)}</td>
      <td class="n">${noR ? '<span class="na">—</span>' : B(rprice)}</td>
      <td>${noR ? '<span class="na">—</span>' : `<span class="pill" title="บันไดการจับคู่ M1 item code → M2 เลขบรรทัด → M3 description → M4 fallback">${mm}</span>`}</td>
      <td class="n">${qD == null ? '<span class="na">—</span>' : `<span class="${qD > 0 ? "diff" : qD < 0 ? "Medium" : "ok"}">${B(qD)}</span>`}</td>
      <td class="n">${pD == null ? '<span class="na">—</span>' : `<span class="${Math.abs(pD) > 200 ? "diff" : "ok"}">${B(pD)}</span>`}</td>
    </tr>`;
    })
    .join("");
  return `
  ${histNote(d)}
  <div class="note i" style="margin:0 0 10px">PO <b>${esc(d.po || "ไม่พบ")}</b> · Release <b>${d.release ?? "— (Standard PO หรือ Vision อ่านไม่ได้)"}</b> — Release แสดงประกอบเท่านั้น ไม่ถูกใช้ในเกณฑ์ตรวจ</div>
  <div class="tbl-wrap"><table><thead><tr>
    <th>#</th><th>รายการในใบแจ้งหนี้</th><th style="text-align:right">จำนวน</th><th>หน่วย</th>
    <th style="text-align:right">ราคา/หน่วย</th><th style="text-align:right">ยอดเงิน</th>
    <th>บรรทัด<br>ใบรับ</th><th style="text-align:right">จำนวน<br>รับจริง</th><th style="text-align:right">ราคา<br>ใบรับ</th><th>จับคู่</th>
    <th style="text-align:right">ต่าง<br>จำนวน</th><th style="text-align:right">ต่าง<br>ราคา</th></tr></thead>
    <tbody>${rows}</tbody></table></div>
  <div class="grid2" style="margin-top:12px">
    <div class="card"><h4>ใบรับที่ระบบพบ (Oracle MCP)</h4>
      ${
        d.rcvs.length
          ? d.rcvs.map(r => `<div class="kv"><span class="mono">${esc(r)}</span><span>ใบรับสินค้า</span></div>`).join("")
          : `<div class="note w" style="margin:0">ไม่พบใบรับ — query ด้วย Tax ID ผู้ขาย + เลขที่บิล แล้ว fallback ด้วย PO (หลัก D2)</div>`
      }
      <div class="kv"><span>จำนวนครั้งที่เรียก Oracle</span><b>${d.halted ? 0 : 1} (สูงสุด 1 ครั้ง/เอกสาร)</b></div>
      ${d.halted ? `<div class="kv"><span>สถานะ</span><b class="bad">Bypass โดย ${d.halted}</b></div>` : ""}
      ${d.manyR ? `<div class="note w" style="margin:8px 0 0">มี receipt หลายใบ/หลายบรรทัดเกิน ${d.manyR} รายการ → engine ให้ manual_review (ต้องตรวจการซ้ำซ้อนด้วยคน)</div>` : ""}
    </div>
    <div class="card"><h4>นิติบุคคลลูกค้าจาก Master (V-05)</h4>
      ${
        d._ent
          ? `<div class="kv"><span>ORG_ID</span><b class="mono">${d.org} · OU ${d._ent.ou ?? "—"}</b></div>
      <div class="kv"><span>ชื่อนิติบุคคล</span><b>${esc(d._ent.name)}</b></div>
      <div class="kv"><span>Tax ID ตาม Master</span><b class="mono">${esc(d._ent.tax || "ว่าง")}</b></div>
      <div class="kv"><span>สถานะ</span><b class="${d._ent.status === "ACTIVE" ? "ok" : "bad"}">${d._ent.status}</b></div>
      <div class="kv"><span>ที่อยู่ / ไปรษณีย์</span><span>${esc(d._ent.addr || "—")} · ${esc(d._ent.postal || "—")}</span></div>
      <div class="kv"><span>สาขาที่รับได้</span><span class="mono">${d._ent.br.join(", ") || "—"}</span></div>`
          : `<div class="note w" style="margin:0">ไม่พบ ORG_ID <b>${d.org ?? "ว่าง"}</b> ใน Master (${MASTER.length} แถว) → fail-safe เป็น Manual Review</div>`
      }
    </div>
  </div>`;
}

/* ---------------- tab: rules ---------------- */
function rulesPane(d) {
  const icon = { pass: '<span class="ok">PASS</span>', fail: '<span class="bad">FAIL</span>', manual_review: '<span class="Medium">MANUAL</span>', not_evaluated: '<span class="na">not_evaluated</span>' };
  const rows = RULES.map(r => {
    const res = d.rules.find(x => x.rule_id === r.id) || { result: N };
    return `<tr>
      <td><b>${r.id}</b> ${esc(r.name)}<div class="src">เกณฑ์จริง: ${esc(r.check)}</div>${
        r.warn ? `<div class="src bad">ข้อจำกัดที่ต้องแก้ก่อน production: ${esc(r.warn)}</div>` : ""
      }</td>
      <td>${r.step}</td>
      <td>${icon[res.result] || res.result}</td>
      <td>${res.code ? `<span class="code sev-${res.severity || "Low"}">${res.code}</span> <span class="${res.severity || ""}">${res.severity || ""}</span>` : '<span class="na">—</span>'}</td>
      <td>${esc(res.evidence || (res.halted_by ? `ไม่ได้ประเมิน เพราะถูก Bypass โดย ${res.halted_by}` : res.result === "pass" ? "ผ่านเกณฑ์" : "ไม่มีข้อมูลใน snapshot"))}</td>
      <td>${res.page ? `<span class="dmsl" onclick="openViewer('${d.doc}',${res.page})">หน้า ${res.page}</span>` : '<span class="na">—</span>'}</td>
      <td class="src">${r.src}</td>
    </tr>`;
  }).join("");
  return `
  ${histNote(d)}
  <div class="warn">ตารางนี้ใช้เกณฑ์ <b>as-built ของ rules engine</b> (OCR service/n8n/app/core/rules.py) พร้อมหมายเหตุว่าเอกสารมาตรฐานเขียนไว้ต่างอย่างไร — ความขัดแย้งนี้ยังไม่ได้ข้อสรุป ดูตารางเทียบเต็มในเมนู “มาตรฐานและรหัส”</div>
  <div class="tbl-wrap"><table><thead><tr><th>กฎ</th><th>STEP</th><th>ผล</th><th>Exception</th><th>หลักฐาน / เหตุผล</th><th>หน้า</th><th>ที่มาของโค้ด</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="note i">Table 9 ต้องมีครบ 9 กฎ · กฎที่ไม่ได้รันต้องเป็น <b>not_evaluated</b> — portal ห้ามเติม PASS ให้เอง (หลัก D5)</div>`;
}

/* ---------------- tab: evidence ---------------- */
function evidPane(d) {
  const sig = (present, label) => `
    <div class="card"><h4>${label}</h4>
      <div class="kv"><span>พบบนเอกสาร</span><b class="${present ? "ok" : "bad"}">${present ? "พบ" : "ไม่พบ"}</b></div>
      <div class="kv"><span>หน้าที่พบ</span><span>${present ? "หน้า " + (d.pages > 1 ? 2 : 1) : "—"}</span></div>
      <div class="kv"><span>การตรวจ</span><span>V-06 — Vision อ่านอย่างเดียว ไม่ตัดสินเอง (หลัก D1)</span></div>
    </div>`;
  return `
  ${histNote(d)}
  <div class="grid2">
    ${sig(d.sigS, "ลายเซ็นผู้ส่งของ / ผู้ส่งมอบ")}
    ${sig(d.sigR, "ลายเซ็นผู้รับของ")}
    <div class="card"><h4>ความครบของหน้าเอกสาร</h4>
      <div class="kv"><span>จำนวนหน้าใน PDF</span><b>${d.pages}</b></div>
      <div class="kv"><span>pages_complete</span><b class="${d.pc ? "ok" : "bad"}">${d.pc ? "true" : "false"}</b></div>
      <div class="kv"><span>ข้อจำกัด extractor</span><span>Vision แปลงได้สูงสุด 4 หน้า/เอกสาร</span></div>
      <div class="kv"><span>ผลทาง UI</span><span class="${d.pc ? "ok" : "bad"}">${d.pc ? "อ่านครบทุกหน้า" : "ต้องเปิดเทียบต้นทางเอง — ห้ามสรุปว่าครบ"}</span></div>
    </div>
    <div class="card"><h4>Traceability ของ snapshot</h4>
      <div class="kv"><span>source_system</span><b class="mono">OCR_VISION_LITELLM</b></div>
      <div class="kv"><span>event_id (idempotency)</span><b class="mono">EV-${d.doc.slice(-4)}-R${d.round}</b></div>
      <div class="kv"><span>external_id</span><b class="mono">${esc(d.ext)}</b></div>
      <div class="kv"><span>schema / standard</span><span class="mono">1.0 / 6.2 as-built</span></div>
      <div class="kv"><span>engine_version</span><span class="mono">Table9-Engine v6.2-20261001</span></div>
    </div>
  </div>
  <div class="note i">PDF และ JSON ส่งคนละ transaction ได้ · เปิดย้อนหลังตาม revision ได้ · retention/legal hold ยังไม่ทำใน pilot</div>
  <div style="margin-top:12px"><button class="bn" onclick="openViewer('${d.doc}',${(d.rules.find(r => r.page) || {}).page || 1})">📄 เปิดเอกสารต้นทางพร้อมหน้าหลักฐาน</button></div>`;
}

/* ---------------- tab: history ---------------- */
function histPane(d, real) {
  d = d || real;
  const ob = OUTBOX.filter(o => o.doc === d.doc);
  const rel = AUDIT.filter(a => a.doc === d.doc);
  const realDoc = real || d;
  const revs = revsOf(realDoc);
  const tl = [];
  revs
    .slice()
    .reverse()
    .forEach(r =>
      tl.push({
        k: r.rev === realDoc.rev ? "v" : "s",
        t: `revision ${r.rev} · ตรวจรอบที่ ${r.round} · ${r.at}`,
        a: `AIVA ตรวจรอบที่ ${r.round} → ${r.status}${(r.codes || []).length ? " (" + r.codes.join(", ") + ")" : ""}`,
        d: (r.rulesNote ? r.rulesNote + " · " : "") + (r.closed ? "ปิดด้วย: " + r.closed : r.note || ""),
      })
    );
  rel
    .slice()
    .reverse()
    .forEach(a => tl.push({ k: a.act === "reject" ? "c" : a.act === "confirm" ? "g" : "h", t: a.t, a: `${a.act} โดย ${a.who}`, d: a.detail || a.res }));
  return `
  ${
    revs.length > 1
      ? `<div class="panel" style="margin:0 0 12px"><div class="ph"><span>Revision snapshot (immutable ต่อ revision)</span><span class="pill">${revs.length} revision</span></div>
      <table><thead><tr><th>revision</th><th>รอบตรวจ</th><th>เวลา/ผู้ส่ง</th><th>ผลตรวจ</th><th>ยอดรวม</th><th>หน้า</th><th>หมายเหตุ / สิ่งที่ปิด revision</th><th></th></tr></thead>
      <tbody>${revs
        .map(
          r => `<tr class="${r.rev === realDoc.rev ? "" : "rz"}">
          <td class="mono"><b>${r.rev}</b>${r.rev === realDoc.rev ? '<span class="pill"> ล่าสุด</span>' : ""}</td>
          <td class="mono">${r.round}</td>
          <td class="mono">${esc(r.at)}<div class="src">${esc(r.by || "")}</div></td>
          <td>${bVer({ status: r.status, isDup: false })}<div class="src">${(r.codes || []).join(", ") || "ไม่มี exception"}</div></td>
          <td class="n mono">${B(r.total)}</td>
          <td>${r.pages}${r.pc ? "" : '<span class="bad"> ไม่ครบ</span>'}</td>
          <td class="src">${esc(r.note || "")}${r.closed ? "<br>ปิด revision ด้วย: " + esc(r.closed) : ""}</td>
          <td>${
            r.rev === realDoc.rev
              ? '<span class="na">กำลังแสดง</span>'
              : `<span class="dmsl" onclick="setRev(${r.rev})">ดู snapshot นี้</span>`
          }</td></tr>`
        )
        .join("")}</tbody></table>
      <div class="ph" style="border-top:1px solid var(--line)">Portal ไม่เขียนทับ snapshot เดิม · การตรวจใหม่สร้าง revision ใหม่และเก็บ PDF/JSON แยกไว้ตรงรุ่นกัน</div></div>`
      : ""
  }
  ${
    ob.length
      ? `<div class="panel" style="margin:0 0 12px"><div class="ph"><span>Action outbox — คำขอที่ยังไม่ปิด</span><span class="pill">${
          ob.filter(o => o.state !== "completed").length
        } รายการรอ revision ใหม่</span></div>
    <table><thead><tr><th>request_id</th><th>action</th><th>ผู้สั่ง</th><th>เวลา</th><th>reason</th><th>expected revision</th><th>สถานะ</th></tr></thead>
    <tbody>${ob
      .map(
        o => `<tr><td class="mono">${o.req}</td><td>${o.action}</td><td class="mono">${o.by}</td><td class="mono">${o.at}</td><td class="mono">${
          o.reason
        }</td><td class="mono">${o.exp_rev}</td><td>${
          o.state === "completed" ? '<span class="pill ok">completed</span>' : `<span class="pill" style="background:var(--ambl);color:var(--amb)">${o.state}</span>`
        }</td></tr>`
      )
      .join("")}</tbody></table>
    <div class="ph" style="border-top:1px solid var(--line)">202 Accepted ไม่ใช่คำว่าการตรวจเสร็จ — ต้องเห็น snapshot revision ใหม่ (expected_revision) หรือ action_result ที่อ้างอิง request_id ก่อน</div></div>`
      : ""
  }
  <div class="grid2">
    <div><h4 style="font-size:12.5px;color:var(--navy)">Timeline ของเอกสารนี้</h4><div class="tl">${tl
      .map(e => `<div class="tle ${e.k}"><div class="t mono">${esc(e.t)}</div><div class="a">${esc(e.a)}</div><div class="d">${esc(e.d)}</div></div>`)
      .join("")}</div></div>
    <div><h4 style="font-size:12.5px;color:var(--navy)">Audit ของเอกสารนี้ (${rel.length} รายการ)</h4>
      ${
        rel.length
          ? `<div class="tl">${rel
              .map(
                a =>
                  `<div class="tle h"><div class="t mono">${esc(a.t)}</div><div class="a">${esc(a.act)} · ${esc(a.who)} <span class="pill">${esc(
                    a.role
                  )}</span></div><div class="d">${esc(a.detail || "")} ${a.res ? `<span class="src">${esc(a.res)}</span>` : ""}</div></div>`
              )
              .join("")}</div>`
          : `<div class="empty">ยังไม่มี audit ของเอกสารนี้ใน session นี้</div>`
      }
    </div>
  </div>`;
}

/* ---------------- tab: json ---------------- */
function toJSON(d) {
  return {
    schema_version: "1.0",
    event_id: `EV-${d.doc.slice(-4)}-R${d.round}`,
    source_system: "OCR_VISION_LITELLM",
    external_id: d.ext,
    doc_id: d.doc,
    revision: d.rev,
    validation_round: d.round,
    standard_version: "6.2",
    engine_version: "Table9-Engine v6.2-20261001",
    received_at: d.date + "T08:12:04+07:00",
    status: d.status,
    invoice: {
      invoice_num: d.inv,
      invoice_date: d.date,
      supplier_name: d.vendor,
      supplier_tax_id: d.vtax || null,
      po_number: d.po || null,
      release_num: d.release || null,
      currency: d.cur,
      sub_total: d.sub,
      vat: d.vat,
      grand_total: d.total,
    },
    company: {
      company: d.company,
      org_id: d.org,
      ou_id: d._ent ? d._ent.ou : null,
      entity_name: d._ent ? d._ent.name : null,
      entity_status: d._ent ? d._ent.status : "NOT_IN_MASTER",
      customer_tax_id: d._ent ? d._ent.tax : null,
    },
    receipt: { receipt_num: d.rcv, receipt_nums: d.rcvs, receiver: d.receiver, uploaded_by: d.upl, receipt_total: d.rtotal, oracle_queries: d.halted ? 0 : 1 },
    signatures: {
      supplier_or_deliverer: { present: !!d.sigS, page: d.sigS ? (d.pages > 1 ? 2 : 1) : null },
      receiver: { present: !!d.sigR, page: d.sigR ? (d.pages > 1 ? 2 : 1) : null },
      pages_complete: d.pc,
      pdf_pages: d.pages,
    },
    lines: d.lines.map((l, i) => ({
      line_no: i + 1,
      description: l[0],
      qty: l[1],
      uom: l[2],
      unit_price: l[3],
      amount: l[4],
      receipt_line: l[5],
      receipt_qty: l[6],
      receipt_price: l[7],
      match_level: l[8],
    })),
    rules: d.rules,
    exceptions: d.codes.map(c => ({
      code: c,
      severity: sevOf(d, c),
      rule_id: (d.rules.find(r => r.code === c) || {}).rule_id || null,
      assigned_to: USER_TASK_CODES.includes(c) ? "user" : "accounting",
    })),
    decision: { status: d.status, assigned_to: d.assigned, halted_by: d.halted || null, manual_review: d.rules.some(r => r.result === M), duplicate_of: d.dup || null },
    pipeline_error: d.error || null,
  };
}
function jsonHL(s) {
  return esc(s)
    .replace(/&quot;([^&]*?)&quot;:/g, '<span class="k">"$1"</span>:')
    .replace(/: &quot;([^&]*?)&quot;/g, ': <span class="s">"$1"</span>')
    .replace(/: (-?\d+(?:\.\d+)?)/g, ': <span class="n">$1</span>');
}
function jsonPane(d) {
  return `
  <div class="filters">
    <span class="pill">schema_version 1.0</span>
    <span class="pill">standard_version 6.2 (as-built)</span>
    <span class="pill">ประเมินจริง ${d.rules.filter(r => r.result !== "not_evaluated").length}/9 กฎ</span>
    <button class="bg bsm" onclick="copyJson()">คัดลอก JSON</button>
  </div>
  <pre class="json">${jsonHL(JSON.stringify(toJSON(d), null, 2))}</pre>
  <div class="note i">snapshot นี้คือสิ่งที่ producer ส่งเข้า portal และเก็บแบบ immutable — portal ไม่รัน OCR/matching ใหม่ และ human action ไม่เขียนค่าลงใน snapshot</div>`;
}
function copyJson() {
  const d = DOCS.find(x => x.doc === sel);
  const txt = JSON.stringify(toJSON(d), null, 2);
  const ok = () => toastEl("คัดลอก JSON แล้ว (ไม่มี secret และไม่มีข้อมูลส่วนบุคคล)", "g");
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, () => toastEl("เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ — เลือกข้อความในกล่องเองได้", "e"));
  else toastEl("เปิดหน้าผ่าน http:// เพื่อให้คัดลอกอัตโนมัติได้ (file:// ถูกเบราว์เซอร์จำกัด)", "e");
}

/* ---------------- action bar ---------------- */
/* ---------------- workflow: ผู้รับผิดชอบ · งานที่ต้องทำ · เงื่อนไขของแต่ละ action ---------------- */
const waitingOf = d => OUTBOX.filter(o => o.doc === d.doc && o.state !== "completed");
/* class name ต้องเป็น ASCII เท่านั้น (กันปัญหา font/CSS selector) */
const todoCls = w => (["user", "accounting", "producer", "none"].includes(w) ? "t-" + w : "t-x");
const userOwnedOpen = d => d.rules.filter(r => r.result === F && USER_TASK_CODES.includes(r.code) && r.severity === "High");
// ถังของงานตามบทบาท: EU = ถังผู้ใช้งาน (Receiver), บทบาทอื่น = ถังบัญชี
const sideOf = u => ((u || ME).role === "EU" ? "user" : "accounting");

/* "งานที่ต้องทำ" — ใช้ร่วมกันทั้งคอลัมน์คิวและการ์ดขั้นตอนถัดไป (ลำดับข้อมูลแบบ task-first) */
function todoOf(d) {
  const w = waitingOf(d);
  if (d.wf === "POSTED") return ["ปิดงาน · ตั้งหนี้แล้ว", "—"];
  if (d.wf === "REJECTED") return ["ปิดงาน · ปฏิเสธแล้ว", "—"];
  if (w.length) return [`รอ producer รับคำขอ ${w[0].action} (${w[0].state})`, "producer"];
  if (d.wf === "RETURNED") return ["รอผู้ใช้งานแก้ไขแล้วส่งใหม่", "user"];
  if (d.wf === "ON_HOLD") return ["พักไว้ · ต้องถอนพักหรือได้หลักฐานเพิ่ม", d._holdBy || "accounting"];
  if (d.wf === "CONFIRMED") return ["ยืนยันแล้ว · รอ AP post (ยังไม่เปิดใช้)", "—"];
  if (d.status === "Manual Review") return ["engine ไม่ตัดสินอัตโนมัติ · ตรวจด้วยคน", "accounting"];
  if (d.assigned === "user") return [`รอผู้รับของยืนยัน${d.codes.length ? " (" + d.codes.join(", ") + ")" : ""}`, "user"];
  if (d.assigned === "accounting") return [`รอฝ่ายบัญชี${d.codes.length ? " (" + d.codes.join(", ") + ")" : ""}`, "accounting"];
  return ["ไม่มีงานค้าง · Auto-pass", "none"];
}

/* เงื่อนไขของทุก action บนเอกสารนี้ — ความจริงชุดเดียว ใช้ทั้ง action bar และการ์ดขั้นตอนถัดไป
   หลักการ: ปุ่มที่กดไม่ได้ต้องบอก "ทำไม" ได้เสมอ (docs 08: blocking reasons) */
function guards(d) {
  const out = {};
  const w = waitingOf(d);
  const closed = ["REJECTED", "POSTED"].includes(d.wf);
  const uHigh = userOwnedOpen(d);
  const sc = scopeCheck(d);
  const onHold = d.wf === "ON_HOLD";
  for (const [k, a] of Object.entries(ACTIONS)) {
    let ok = can(a.perm);
    let why = `บทบาท ${ROLES[ME.role].n} ไม่มีสิทธิ์ ${PERM[a.perm] || a.perm} (${a.perm})`;
    if (ok && !sc.ok) {
      /* ชั้น UI ต้องไม่ปล่อยให้กด action ของเอกสารที่ขอบเขตสิทธิ์ไม่ให้เห็น (ของจริง 403 ใน backend) */
      ok = false;
      why = `403 — ${sc.why}`;
    } else if (ok && onHold && k !== "release_hold") {
      ok = false;
      why = `งานนี้ถูกพัก (On Hold) ไว้โดย ${d._holdBy === "user" ? "ฝั่งผู้ใช้งาน" : d._holdBy === "accounting" ? "ฝั่งบัญชี" : "ผู้รับผิดชอบก่อนหน้า"} · ต้องถอนพัก (release_hold) หรือได้หลักฐานเพิ่มก่อนทำ action อื่น`;
    } else if (ok && onHold && k === "release_hold" && ME.role !== "ADM" && d._holdBy && d._holdBy !== sideOf() && d.assigned !== sideOf()) {
      ok = false;
      why = `ถอนพักได้เฉพาะผู้ที่ถือ hold (ฝั่ง${d._holdBy === "user" ? "ผู้ใช้งาน" : "บัญชี"}), เจ้าของงานที่ engine มอบหมาย หรือผู้ดูแลระบบ · ของจริงคือ 403`;
    } else if (ok && a.blocked) {
      ok = false;
      why = a.blocked;
    } else if (ok && viewRev) {
      ok = false;
      why = `กำลังดู snapshot ของ revision ${viewRev} (immutable) · ทำ action ได้เฉพาะ revision ล่าสุด (${d.rev})`;
    } else if (ok && closed) {
      ok = false;
      why = `เอกสารปิดสถานะแล้ว (${WF_LABEL[d.wf] || d.wf}) · ต้องเริ่ม validation round ใหม่`;
    } else if (ok && k === "release_hold" && d.wf !== "ON_HOLD") {
      ok = false;
      why = "ถอนพักได้เฉพาะเอกสารที่พักไว้ (On Hold) เท่านั้น";
    } else if (ok && a.needReceiver && !d.receiver) {
      ok = false;
      why = "เอกสารนี้ยังไม่มี Receiver ใน Oracle · ใช้ “สั่ง AIVA ตรวจซ้ำ” แทน (ตาม action parity)";
    } else if (ok && ["resubmit", "rerun"].includes(k) && w.length) {
      ok = false;
      why = `มีคำขอ ${w[0].req} รอ producer อยู่แล้ว · กันการสั่งซ้ำซ้ำ (production ใช้ unique pending request ต่อเอกสาร)`;
    } else if (ok && k === "confirm" && (d.status === "Hold" || d.status === "Manual Review")) {
      ok = false;
      why = `ผลตรวจจากต้นทางเป็น ${d.status} · ยืนยันไม่ได้จนกว่าจะได้ revision ใหม่หรือมีการอนุมัติพิเศษแบบ four-eyes (ยังไม่เปิดใช้)`;
    } else if (ok && k === "confirm" && uHigh.length && sideOf() === "accounting") {
      ok = false;
      why = `High exception ที่มอบหมายให้ผู้ใช้ (${uHigh.map(r => r.code).join(", ")}) ยังไม่ถูกยืนยัน · ล็อกฝั่งบัญชีจนกว่า Receiver จะดำเนินการ (engine assigned = user)`;
    } else if (ok && a.decide && samePerson(d, ME)) {
      ok = false;
      why = `separation of duties: ผู้แนบเอกสารนี้คือ ${d.upl} ซึ่งเป็นคนเดียวกับผู้ใช้ปัจจุบัน · action ประเภทตัดสินต้องทำโดยผู้อื่น`;
    } else if (ok && k === "confirm" && d.status === "Review" && !a.needNote) {
      ok = true;
      why = a.n;
    }
    out[k] = [ok, ok ? a.n : why];
  }
  return out;
}

/* action ที่ทำได้จริงเรียงตามลำดับที่ควรแนะนำ */
function adviceOf(d) {
  const g = guards(d);
  return ACTION_ADVICE.filter(k => g[k][0]);
}

/* การ์ด "ขั้นตอนถัดไป" — งานอะไร · มีปัญหาอะไร · หลักฐานหน้าไหน · ทำอะไรได้/ไม่ได้และเพราะอะไร */
function nextCard(d) {
  const g = guards(d);
  const adv = adviceOf(d);
  const [todo, who] = todoOf(d);
  const evPages = Array.from(new Set(d.rules.filter(r => r.page && (r.result === F || r.result === M)).map(r => r.page))).sort((a, b) => a - b);
  const blocked = ACTION_ADVICE.filter(k => !g[k][0]);
  const rows =
    adv.length
      ? adv
          .slice(0, 3)
          .map(
            k => `<li><span class="dmsl" onclick="askAction('${k}')">${ACTIONS[k].n}</span> <span class="src">— ${esc(ACTIONS[k].use || "")}</span></li>`
          )
          .join("")
      : `<li class="src">ไม่มี action ที่สิทธิ์ปัจจุบันทำได้บนเอกสารนี้ (ดูเหตุผลด้านล่าง)</li>`;
  return `<div class="card next">
    <h4>ขั้นตอนถัดไป</h4>
    <div class="kv"><span>งานที่ต้องทำ</span><b>${esc(todo)}</b></div>
    <div class="kv"><span>ผู้รับผิดชอบ</span><span>${
      who === "user" ? "ผู้ใช้งาน (Receiver)" : who === "accounting" ? "ฝ่ายบัญชี" : who === "producer" ? "ระบบต้นทาง (AIVA/OCR)" : who === "none" ? "—" : esc(who)
    } <span class="src">· engine assigned = ${d.assigned || "—"}</span></span></div>
    <div class="kv"><span>หลักฐานที่ต้องดู</span><span>${
      evPages.length ? evPages.map(pg => `<span class="dmsl" onclick="openViewer('${d.doc}',${pg})">หน้า ${pg}</span>`).join(" · ") : "ไม่มี exception ที่ชี้หน้าหลักฐาน"
    }</span></div>
    <div class="kv"><span>workflow</span><span>${bWf(d)} <span class="src mono">wf_version ${d.wfv} · revision ${viewRev || d.rev}</span></span></div>
    <ul class="actlist">${rows}</ul>
    ${
      blocked.length
        ? `<details class="blocked"><summary>ทำไมอีก ${blocked.length} ปุ่มถึงกดไม่ได้</summary><ul>${blocked
            .map(k => `<li><b>${ACTIONS[k].n}</b> — <span class="src">${esc(g[k][1])}</span></li>`)
            .join("")}</ul></details>`
        : ""
    }
    <p class="src" style="margin-top:6px">หมายเหตุ: portal ไม่คำนวณผลตรวจใหม่ และไม่มี action ใดเปลี่ยน FAIL เป็น PASS ในหน้าจอ · การตัดสินใจทุกชิ้นบันทึกพร้อม reason code, actor, เวลา และ before/after version</p>
  </div>`;
}
function actionBar(d) {
  const g = guards(d);
  const w = waitingOf(d);
  const closed = ["REJECTED", "POSTED"].includes(d.wf);
  const btns = ACTION_ADVICE.map(k => {
    const a = ACTIONS[k];
    const [ok, why] = g[k];
    return `<button class="${a.cls}" ${ok ? "" : "disabled"} title="${esc(why)}" onclick="askAction('${k}')">${a.n}</button>`;
  }).join("");
  const hold = d.status === "Hold" || d.status === "Manual Review";
  const hint = viewRev
    ? `กำลังดู snapshot ของ <b>revision ${viewRev}</b> · โหมดอ่านอย่างเดียว (ของจริง: หน้าจอเก่าตอบ <b>409</b> แล้วโหลดสถานะใหม่)`
    : w.length
    ? `มีคำขอ <b>${w[0].req}</b> รอ snapshot revision ${w[0].exp_rev} ใหม่ · portal ยังไม่ถือว่าเสร็จ (202 Accepted)`
    : closed
    ? `เอกสารปิดสถานะแล้ว (${WF_LABEL[d.wf] || d.wf}) · snapshot และ audit เป็น immutable · การทำ action ซ้ำต้องเริ่ม validation round ใหม่`
    : hold
    ? `ผลตรวจเป็น <b>${d.status}</b> · ผู้ยืนยันและผู้ส่งเข้า AP ต้องเป็นคนละคน (ยังไม่บังคับใน pilot)`
    : `พร้อมดำเนินการ · expected_workflow_version = <b>${d.wfv}</b> · วางเมาส์บนปุ่มที่ปิดเพื่อดูเหตุผล`;
  return `<div class="bar"><div class="hint">${hint}</div><button class="bg bsm" onclick="openViewer('${d.doc}',1)">📄 ต้นทาง</button>${btns}</div>`;
}

/* ---------------- modal: ขออนุมัติ action (reason + note + version + idempotency) ---------------- */
function askAction(k) {
  const d = DOCS.find(x => x.doc === sel);
  const a = ACTIONS[k];
  const g = guards(d);
  if (!g[k][0]) {
    log(k, d.doc, g[k][1], "403 Forbidden · ไม่ผ่านเงื่อนไข (ตรวจซ้ำชั้น backend)");
    render();
    return toastEl("403 — " + g[k][1], "e");
  }
  /* Idempotency-Key ผูกกับเอกสาร + action + version → กดซ้ำจากหน้าจอเดิมได้ผลเดิม ไม่สร้างเหตุการณ์ซ้ำ */
  const idem = "IDM-" + hashOf(`${d.doc}|${k}|${d.wfv}|${viewRev || d.rev}`);
  pending = { k, doc: d.doc, idem };
  document.getElementById("mt").textContent = a.n + " · " + d.inv;
  document.getElementById("mb").innerHTML = `
    <div class="note i" style="margin:0 0 6px">เอกสาร <b>${esc(d.inv)}</b> · revision ${d.rev} · workflow <b>${WF_LABEL[d.wf] || d.wf}</b> (wf_version ${d.wfv})<br>
    <span class="src">action ไม่เขียนทับ snapshot การตรวจ · production เก็บ actor เป็น Entra object ID (immutable) + เวลา + reason + before/after version</span></div>
    <label>action ที่กำลังส่ง</label>
    <div class="mono">${k} — ${a.n}</div>
    <label>reason_code ${a.needNote ? '<span class="bad">*</span>' : ""}</label>
    <select id="a-reason">${REASON_CODES.map(c => `<option>${c}</option>`).join("")}</select>
    ${
      a.needNote
        ? `<label>คำอธิบาย <span class="bad">*</span></label><textarea id="a-note" placeholder="ระบุข้อเท็จจริงที่ยืนยัน (ห้ามใส่ข้อมูลส่วนบุคคลหรือ secret)"></textarea>`
        : `<label>คำอธิบาย (ไม่บังคับกับ action นี้)</label><textarea id="a-note" placeholder="บันทึกเพิ่มเติมถ้าจำเป็น"></textarea>`
    }
    <div class="grid2">
      <div><label>expected_document_revision</label><input id="a-rev" class="mono" value="${d.rev}"></div>
      <div><label>expected_workflow_version</label><input id="a-wfv" class="mono" value="${d.wfv}"></div>
    </div>
    <p class="src" style="margin-top:6px">กรอกค่าที่ต่างจากของจริงเพื่อจำลอง <b>409 Conflict</b> (หน้าเก่า/ข้อมูลเก่า) — ระบบจะไม่เปลี่ยนสถานะและโหลดค่าใหม่ให้</p>
    <label>Idempotency-Key</label>
    <input id="a-idem" class="mono" value="${idem}">
    <p class="src" style="margin-top:6px">key ผูกกับเอกสาร + action + version · ส่งซ้ำด้วย key และ payload เดิม = ได้ผลเดิม (idempotent replay) · payload ต่างกัน = <b>422</b>
    ${a.opensOutbox ? `<div class="note w" style="margin:8px 0 0">action นี้สร้าง <b>action outbox</b> ให้ producer · สถานะเป็น waiting_revision จนกว่า snapshot revision ${d.rev + 1} จะมาถึง</div>` : ""}
    ${a.decide ? `<div class="note i" style="margin:8px 0 0">action ประเภทตัดสิน · production ต้องผ่าน RBAC + separation of duties ในชั้น backend ไม่ใช่แค่ disables ในหน้าจอ</div>` : ""}`;
  document.getElementById("mmf").innerHTML = `<button class="bg" onclick="closeModal()">ยกเลิก</button><button class="bp" onclick="doAction()">ยืนยันการดำเนินการ</button>`;
  document.getElementById("ov").classList.add("on");
}

/* จำลองชั้น backend: ตรวจ guard → ตรวจ version → ตรวจ idempotency → แล้วจึง commit state transition */
function doAction() {
  const d = DOCS.find(x => x.doc === pending.doc);
  const a = ACTIONS[pending.k];
  const k = pending.k;
  const noteEl = document.getElementById("a-note");
  const note = (noteEl ? noteEl.value : "").trim();
  const reason = document.getElementById("a-reason").value;
  const wfv = Number(document.getElementById("a-wfv").value);
  const erev = Number((document.getElementById("a-rev") || {}).value || d.rev);
  const idemEl = document.getElementById("a-idem");
  const idem = (idemEl ? idemEl.value : pending.idem).trim() || pending.idem;
  const sig = hashOf([k, reason, note, wfv, erev].join("|"));

  const fail = (code, why) => {
    log(k, d.doc, `reason ${reason} · ${why}`, code);
    closeModal();
    render();
    return toastEl(`${code} — ${why}`, "e");
  };
  if (a.needNote && !note) return toastEl("ต้องกรอกคำอธิบายก่อนส่ง (required note)", "e");
  /* ชั้น idempotency อยู่ก่อน version check: retry ของจริงส่ง body เดิม (พร้อม version เดิม) มาซ้ำ
     ถ้าเจอ key ที่เคยบันทึกแล้วให้ตอบผลเดิม ไม่รัน state transition ซ้ำ */
  if (IDEM[idem]) {
    if (IDEM[idem].sig !== sig) return fail("422 Unprocessable", "Idempotency-Key นี้ถูกใช้กับ payload อื่นไปแล้ว (key เดิมห้ามใช้กับคำขอที่ต่างกัน)");
    log(k, d.doc, "ส่งซ้ำด้วย Idempotency-Key เดิม · idempotent hit = true", `replay ${IDEM[idem].res}`);
    closeModal();
    render();
    return toastEl(`Idempotent replay — ได้ผลเดิม (${IDEM[idem].res}) ไม่มีการสร้างเหตุการณ์ซ้ำ`, "g");
  }
  const g = guards(d);
  if (!g[k][0]) return fail("403 Forbidden", g[k][1]);
  if (erev !== d.rev) return fail("409 Conflict", `expected_document_revision = ${erev} แต่ปัจจุบันคือ ${d.rev} · โหลดสถานะใหม่`);
  if (wfv !== d.wfv) return fail("409 Conflict", `หน้านี้ใช้ wf_version ${wfv} แต่ข้อมูลจริงคือ ${d.wfv} · ห้ามกดซ้ำอัตโนมัติ`);

  const before = d.wf;
  const beforeWfv = d.wfv;
  if (k === "release_hold") {
    d.wf = d._wfBefore || "PENDING_REVIEW";
    d._holdBy = null;
    d._wfBefore = null;
  } else if (k === "hold") {
    d._wfBefore = d.wf;
    d._holdBy = ME.role === "EU" ? "user" : "accounting";
    d.wf = "ON_HOLD";
  } else if (a.wf) {
    d.wf = a.wf;
  }
  if (k === "explain") {
    d._explained = (d._explained || 0) + 1;
    d.assigned = "accounting"; /* ตาม action parity: ชี้แจงแล้วงานกลับไปอยู่กับฝ่ายบัญชี */
  }
  d.wfv += 1;
  const res = `200 OK · wf_version ${beforeWfv}→${d.wfv}`;
  IDEM[idem] = { sig, res };
  log(k, d.doc, `reason ${reason}${note ? " · " + note.slice(0, 140) : ""} · Idempotency-Key ${idem}`, res);
  if (a.opensOutbox) {
    OUTBOX.unshift({
      req: "REQ-" + hashOf(idem).slice(0, 4),
      doc: d.doc,
      action: k,
      by: ME.email,
      at: nowT(),
      state: "waiting_revision",
      reason,
      note: note.slice(0, 140),
      exp_rev: d.rev + 1,
    });
    toastEl(`202 Accepted — สร้าง action outbox แล้ว ยังไม่ถือว่าเสร็จจนกว่า revision ${d.rev + 1} จะมาถึง`, "g");
  } else if (k === "confirm") {
    toastEl("200 OK — workflow เป็น Confirmed · ผลตรวจต้นทางไม่ถูกแก้ · การส่งเข้า AP ต้องแยกผู้ยืนยันกับผู้ตั้งหนี้", "g");
  } else if (k === "explain") {
    toastEl("200 OK — บันทึกคำชี้แจงและส่งงานกลับฝ่ายบัญชี · ผลตรวจและ workflow คงเดิม", "g");
  } else {
    toastEl(`${res} · workflow ${before} → ${d.wf}`, "g");
  }
  closeModal();
  render();
}

function closeModal() {
  document.getElementById("ov").classList.remove("on");
  document.querySelector("#modal").classList.remove("wide");
  pending = null;
}

/* ---------------- DMS / PDF viewer (จำลอง) ---------------- */
function openViewer(id, pg) {
  const d = DOCS.find(x => x.doc === id || (!id && x.doc === sel));
  if (!d) return;
  if (!can("DMS")) {
    log("open", d.doc, "พยายามเปิดเอกสารต้นทาง", "403 Forbidden · ไม่มีสิทธิ์ DMS");
    return toastEl("403 — บทบาท " + ROLES[ME.role].n + " ไม่มีสิทธิ์เปิดเอกสารต้นทาง (DMS)", "e");
  }
  viewerDoc = d.doc;
  viewerPage = pg || 1;
  viewerRev = viewRev;
  zoom = 100;
  /* production: ทุกครั้งที่เปิด/ดาวน์โหลด PDF ต้องเกิด access event ผูกกับ identity และ signed session */
  log("open", d.doc, `เปิดเอกสารต้นทาง ${d.ext} หน้า ${pg || 1} · revision ${viewRev || d.rev}`, "200 OK · access event (ของจริงใช้ signed DMS session + watermark รายผู้ใช้)");
  drawViewer();
  document.getElementById("mt").textContent = "เอกสารต้นทาง " + d.ext + " — DMS viewer (จำลอง)";
  document.getElementById("mmf").innerHTML = `<span class="src">ปิดด้วย Esc หรือคลิกพื้นที่รอบนอก · production ใช้ signed session + watermark รายผู้ใช้</span><button class="bg" onclick="closeModal()">ปิด</button>`;
  document.getElementById("ov").classList.add("on");
  document.querySelector("#modal").classList.add("wide");
}
function drawViewer() {
  const d = DOCS.find(x => x.doc === viewerDoc);
  const hlPage = (d.rules.find(r => r.page) || {}).page;
  document.getElementById("mb").innerHTML = `
    <div class="note w" style="margin:0 0 10px">หน้านี้จำลอง DMS viewer เท่านั้น · production เปิด <span class="mono">https://dms.aapico.com/viewer?doc=${encodeURIComponent(
      d.ext
    )}</span> ด้วย signed session และ portal ไม่เก็บไฟล์ต้นทางเป็นของตนเอง (หลักการ D7)</div>
    ${
      viewerRev
        ? `<div class="note w" style="margin:0 0 10px">กำลังเปิด PDF ของ <b>revision ${viewerRev}</b> · production เก็บไฟล์แยกต่อ revision และห้ามอ่านสลับรุ่นกับ JSON</div>`
        : ""
    }
    <div class="vbar">
      <button class="bg bsm" ${viewerPage <= 1 ? "disabled" : ""} onclick="showPage(${Math.max(1, viewerPage - 1)})" title="ArrowLeft">← หน้าก่อนหน้า</button>
      <span class="pill mono">หน้า ${viewerPage} / ${d.pages}</span>
      <button class="bg bsm" ${viewerPage >= d.pages ? "disabled" : ""} onclick="showPage(${Math.min(d.pages, viewerPage + 1)})" title="ArrowRight">ถัดไป →</button>
      <span class="sp"></span>
      <button class="bg bsm" onclick="setZoom(${Math.max(60, zoom - 20)})" title="ย่อ">🔍−</button>
      <span class="pill mono">${zoom}%</span>
      <button class="bg bsm" onclick="setZoom(${Math.min(200, zoom + 20)})" title="ขยาย">🔍+</button>
      <button class="bg bsm" onclick="setZoom(100)">พอดี</button>
      <button class="bg bsm" disabled title="production ต้องใช้ signed URL + download/print policy ที่บันทึกเป็น audit ได้">ดาวน์โหลด/พิมพ์</button>
    </div>
    <div class="viewer">
      <div class="thumbs">${Array.from({ length: d.pages }, (_, i) => i + 1)
        .map(
          p => `<div class="thumb ${p === viewerPage ? "on" : ""}" onclick="showPage(${p})">หน้า ${p}${p === hlPage ? "<br><small>⚠ หลักฐาน</small>" : ""}</div>`
        )
        .join("")}</div>
      <div style="zoom:${zoom / 100}">${invoicePage(d, viewerPage)}</div>
    </div>
    <div class="src" style="margin-top:8px">คีย์ลัด: <span class="mono">←/→</span> เปลี่ยนหน้า · <span class="mono">Home/End</span> หน้าแรก/หน้าสุดท้าย · <span class="mono">Esc</span> ปิด · ภาพนี้เป็นการจำลอง ไม่ใช่ไฟล์ PDF จริง</div>`;
}
function showPage(p) {
  const d = DOCS.find(x => x.doc === viewerDoc);
  if (!d) return;
  viewerPage = Math.max(1, Math.min(d.pages, p));
  drawViewer();
}
function setZoom(z) {
  zoom = Math.max(60, Math.min(200, z));
  if (viewerDoc) drawViewer();
}
function invoicePage(d, p) {
  /* rule.page บอกว่าหลักฐานอยู่หน้าไหน → outline สีส้มบนหน้า PDF จำลอง */
  const pageR = d.rules.filter(r => (r.page || 1) === p && (r.result === F || r.result === M));
  const codesOn = (...cs) => (pageR.some(r => cs.includes(r.code)) ? "hl" : "");
  const lineHl = n => {
    const hit = pageR.some(r => {
      const m = /(?:บรรทัด|line)\s*(\d+)/i.exec(r.evidence || "");
      return m && Number(m[1]) === n;
    });
    return hit ? "hl" : "";
  };
  const flags = pageR.length
    ? `<div class="note w" style="margin-top:10px">หลักฐานที่ระบบชี้บนหน้านี้: ${pageR
        .map(r => `<span class="code">${r.code}</span> ${esc(r.evidence || "")}`)
        .join(" · ")}</div>`
    : "";
  if (p > 1) {
    return `<div class="page"><h3>เอกสารแนบ (ใบรับสินค้า / ใบส่งของ) หน้า ${p}/${d.pages}</h3>
      <p class="src">สแกนจาก Paperless · Vision extractor แปลงได้สูงสุด 4 หน้า → ไฟล์ ${d.pages} หน้าอาจถูกอ่านไม่ครบ (pages_complete)</p>
      <div class="tbl-wrap"><table><thead><tr><th>บรรทัด</th><th>รายการที่ระบบอ่านได้</th><th style="text-align:right">จำนวนรับ</th><th style="text-align:right">ราคา</th></tr></thead><tbody>${d.lines
        .filter((_, i) => i % 2 === p % 2)
        .map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l[0])}</td><td class="n">${B(l[6] ?? l[1])}</td><td class="n">${B(l[7] ?? l[3])}</td></tr>`)
        .join("")}</tbody></table></div>
      <div class="sig">
        <div class="${d.sigS ? "" : "miss"} ${codesOn("E26", "E34", "E35")}>${d.sigS ? "ผู้ส่งของ / ผู้ส่งมอบ: ลงนามแล้ว" : "ไม่พบลายเซ็นผู้ส่งของ → E26 (Medium)"}</div>
        <div class="${d.sigR ? "" : "miss"} ${codesOn("E26", "E34", "E35")}>${d.sigR ? "ผู้รับของ: " + esc(d.receiver || "—") : "ไม่พบลายเซ็นผู้รับของ → E26 (High)"}</div>
      </div>
      ${flags}
      <div class="wm">MOCK · ไม่ใช่เอกสารจริง · ผู้ดู ${esc(ME.email)}</div></div>`;
  }
  const hlCode = (d.rules.find(r => r.page === 1) || {}).code;
  return `<div class="page">
    <h3>ใบแจ้งหนี้ / ใบกำกับภาษี (ข้อมูลสังเคราะห์สำหรับ mockup)</h3>
    <div class="kv"><span>เลขที่เอกสาร</span><b class="mono">${esc(d.inv)}</b></div>
    <div class="kv"><span>วันที่</span><span class="mono">${d.date}</span></div>
    <div class="kv"><span>ผู้ขาย</span><span class="${codesOn("E25", "E16", "E17")}">${esc(d.vendor)} · <span class="mono ${d.vtax ? "" : "bad"}">${esc(d.vtax || "ไม่พบ Tax ID")}</span></span></div>
    <div class="kv"><span>ผู้ซื้อ</span><span>${esc(d._ent ? d._ent.name : "ไม่พบใน Master")} · <span class="mono">${esc(d._ent ? d._ent.tax : "—")}</span></span></div>
    <div class="kv"><span>เลขสั่งซื้อ</span><span class="mono ${d.po ? "" : "bad"} ${codesOn("E09", "E12", "E13")}>${esc(d.po || "ไม่พบ")}</span>${
      d.release ? ` · Release <span class="mono">${d.release}</span>` : ""
    }</div>
    <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>รายการ</th><th style="text-align:right">จำนวน</th><th>หน่วย</th><th style="text-align:right">ราคา/หน่วย</th><th style="text-align:right">ยอดเงิน</th></tr></thead><tbody>${d.lines
      .map((l, i) => {
        const badLine = Math.abs(NUM(l[1]) * NUM(l[3]) - NUM(l[4])) > 0.5;
        return `<tr class="${badLine ? "rz" : ""}"><td class="${hlCode && badLine ? "hl" : ""} ${lineHl(i + 1)}">${esc(l[0])}</td><td class="n">${B(
          l[1]
        )}</td><td>${l[2]}</td><td class="n">${B(l[3])}</td><td class="n ${badLine ? "bad" : ""}">${B(l[4])}</td></tr>`;
      })
      .join("")}</tbody></table></div>
    <div class="kv" style="margin-top:8px"><span>รวมก่อนภาษี</span><b class="mono">${B(d.sub)}</b></div>
    <div class="kv"><span>ภาษีมูลค่าเพิ่ม</span><b class="mono">${B(d.vat)}</b></div>
    <div class="kv"><span>ยอดรวม</span><b class="mono ${d.rules.some(r => r.code === "E31") ? "bad" : ""}">${B(d.total)}</b></div>
    <div class="sig">
      <div class="${d.sigS ? "" : "miss"}">${d.sigS ? "ผู้ส่งของ: ลงนามแล้ว" : "ไม่พบลายเซ็นผู้ส่งของ"}</div>
      <div class="${d.sigR ? "" : "miss"}">${d.sigR ? "ผู้รับของ: " + esc(d.receiver || "—") : "ไม่พบลายเซ็นผู้รับของ (E26 High)"}</div>
    </div>
    <div class="wm">MOCK · ไม่ใช่เอกสารจริง · ผู้ดู ${esc(ME.email)}</div>
  </div>`;
}

/* ---------------- หน้า: สิทธิ์และการเชื่อมบัญชี ---------------- */
function rbacPage() {
  const roles = Object.entries(ROLES)
    .map(
      ([k, r]) => `<tr>
      <td><b style="color:${r.c}">${r.n}</b><div class="src mono">${k}</div></td>
      <td>${r.scope === "receiver" ? "เฉพาะใบรับที่ตนเป็น Receiver" : r.scope === "company" ? "บริษัทที่ได้รับมอบหมาย" : "ไม่อ่านเนื้อหาเอกสาร"}</td>
      <td><div class="perm">${Object.keys(PERM)
        .map(p => `<i class="${r.p.includes(p) ? "yes" : "no"}" title="${esc(PERM[p])}">${r.p.includes(p) ? "✓" : "·"} ${p}</i>`)
        .join("")}</div></td>
      <td>${USERS.filter(u => u.role === k).length}</td>
    </tr>`
    )
    .join("");
  const users = USERS.map(
    u => `<tr>
      <td><b>${esc(u.n)}</b><div class="src mono">${esc(u.email)}</div></td>
      <td>${ROLES[u.role].n}</td>
      <td class="mono">${esc(u.rcv)}<div class="src">EMPLOYEE_ID ${u.emp ?? "—"}</div></td>
      <td class="mono">${u.co.join(", ") || "—"}</td>
      <td>${esc(u.unit)}</td>
      <td>${
        u.role === "EU"
          ? USERS.filter(x => x.rcv === u.rcv).length === 1
            ? '<span class="ok">เชื่อม 1:1 กับ RECEIVER</span>'
            : '<span class="bad">ชื่อซ้ำ — ต้องยึด EMPLOYEE_ID</span>'
          : '<span class="na">ไม่ใช้ RECEIVER scope</span>'
      }</td>
    </tr>`
  ).join("");
  const conf = DATA_CONFLICTS.map(c => `<tr><td><b>${esc(c.k)}</b></td><td>${esc(c.a)}</td><td>${esc(c.b)}</td><td class="Medium">${esc(c.act)}</td></tr>`).join("");
  const gaps = [
    ["Entra ID / tenant จริง", "conf", "ตอนนี้ใช้ shared API key ระดับ workspace · backend ยังไม่รู้ตัวตนรายผู้ใช้"],
    ["ตรวจสิทธิ์ทุก route (list/search/detail/JSON/PDF/action/audit)", "mock", "mockup จำลองใน browser · backend ต้องบังคับเองทุก endpoint รวมถึงเปิด URL ตรง"],
    ["optimistic concurrency (expected_workflow_version → 409)", "mock", "ทดลองได้ในหน้านี้ โดยกรอก wf_version ให้ต่างจากปัจจุบัน"],
    ["action outbox → waiting_revision → completed", "mock", "ยังไม่มี producer มารับคำขอไปทำจริง"],
    ["DMS signed session + watermark", "mock", "ลิงก์และหน้าเอกสารใน mockup เป็นภาพจำลอง ไม่ใช่ไฟล์จริง"],
    ["PostgreSQL + Alembic, backup, retention, legal hold", "conf", "ยังไม่ทำ"],
    ["AP posting + acknowledgement + separation of duties", "conf", "ยังไม่เปิดใช้ · ผู้ยืนยัน ≠ ผู้ตั้งหนี้ ต้องบังคับในชั้นหลัง"],
    ["malware scan, rate limit, dead-letter, observability", "conf", "ยังไม่ทำ"],
  ];
  return `<div class="full">
  <div class="warn">⚠ ส่วนที่ยังไม่ได้ผลจริง: backend ปัจจุบันใช้ <b>shared API key</b> ยังไม่มี RBAC รายบุคคล และ audit log ยังไม่ผูกตัวตนรายคน · ตารางสิทธิ์ด้านล่างคือ <b>ข้อกำหนดที่ต้องนำไปบังคับใช้</b> ไม่ใช่สิ่งที่ทดสอบผ่านแล้ว</div>
  <div class="panel"><div class="ph"><span>บทบาทและสิทธิ์</span><span class="pill">ต้นแบบจาก Mockup v4.4</span></div>
    <table><thead><tr><th>บทบาท</th><th>ขอบเขตข้อมูล</th><th>สิทธิ์</th><th>จำนวนผู้ใช้</th></tr></thead><tbody>${roles}</tbody></table></div>
  <div class="panel"><div class="ph"><span>การเชื่อม Portal user ↔ Entra ID ↔ Oracle RECEIVER ↔ บริษัท</span><span class="pill mono">RCV_VRC_HDS_V · EMPLOYEE_ID</span></div>
    <table><thead><tr><th>ผู้ใช้</th><th>บทบาท</th><th>RECEIVER / EMPLOYEE_ID</th><th>บริษัท</th><th>หน่วยงาน</th><th>สถานะการเชื่อม</th></tr></thead><tbody>${users}</tbody></table>
    <div class="ph" style="border-top:1px solid var(--line)">หลักการ: ใช้ immutable identity (Entra object ID / EMPLOYEE_ID) เป็น key ไม่ใช่ชื่อแสดงผล · ค่า Receiver ยึดจาก Oracle ไม่ใช่สิ่งที่ portal กรอกเอง</div></div>
  <div class="panel"><div class="ph"><span>ข้อมูลจริงที่ขัดแย้งกันระหว่างแหล่ง — portal ห้ามเดาแทนผู้ใช้</span><span class="pill">${DATA_CONFLICTS.length} ข้อ</span></div>
    <table><thead><tr><th>หัวข้อ</th><th>แหล่ง A</th><th>แหล่ง B</th><th>สิ่งที่ต้องทำ</th></tr></thead><tbody>${conf}</tbody></table></div>
  <div class="panel"><div class="ph"><span>สิ่งที่ mockup นี้ทำให้ดู เทียบกับสิ่งที่ระบบจริงยังไม่มี</span></div>
    <table><thead><tr><th>รายการ</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead><tbody>${gaps
      .map(g => `<tr><td><b>${esc(g[0])}</b></td><td><span class="tag ${g[1]}">${g[1] === "mock" ? "จำลองใน UI" : "ยังไม่มี"}</span></td><td>${esc(g[2])}</td></tr>`)
      .join("")}</tbody></table></div></div>`;
}

/* ---------------- หน้า: บันทึกการเข้าถึง ---------------- */
/* ส่งออกบันทึกเป็น CSV แล้วแสดงใน modal (Clipboard/Download API ถูกจำกัดบน file://) */
function auditExport() {
  const head = ["timestamp", "actor", "role", "action", "document", "detail", "result", "prev_hash", "hash"];
  const body = AUDIT
    .slice()
    .reverse()
    .map(a => [a.t, a.who, a.role, a.act, a.doc, a.detail, a.res, a.ph, a.h]);
  const csv = [head].concat(body)
    .map(r => r.map(c => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const b64 = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  document.getElementById("mt").textContent = "ส่งออกบันทึกการเข้าถึง (CSV)";
  document.getElementById("mb").innerHTML = `
    <div class="note i" style="margin:0 0 8px">ไฟล์นี้รวม <b>hash ของแต่ละรายการ</b> เพื่อให้ผู้ตรวจสอบย้อนหลังตรวจได้ว่าบันทึกถูกแก้หรือไม่ (tamper-evident)
    · ของจริงต้องเป็น immutable audit log ในฐานข้อมูล + HMAC/key ที่ผู้ใช้แก้ไม่ได้ และต้องมี retention policy</div>
    <div class="filters" style="border:0;padding:0 0 8px">
      <a class="bp bsm" href="${b64}" download="aiva-audit-${AUDIT.length}.csv">ดาวน์โหลด CSV (${AUDIT.length} รายการ)</a>
      <span class="src">ถ้าเปิดผ่าน file:// แล้วเบราว์เซอร์บล็อกการดาวน์โหลด ให้รัน <span class="mono">python -m http.server 5190</span></span>
    </div>
    <pre class="json" style="max-height:280px;overflow:auto">${esc(csv.slice(0, 4000))}${csv.length > 4000 ? "\n… (ตัดทอนเพื่อแสดงบนหน้าจอ)" : ""}</pre>`;
  document.getElementById("mmf").innerHTML = `<button class="bg" onclick="closeModal()">ปิด</button>`;
  document.getElementById("ov").classList.add("on");
}
function auditVerify() {
  const r = verifyChain();
  auditMsg = r.ok
    ? { ok: true, txt: `ตรวจแล้ว ${r.n} รายการต่อเนื่องกันครบ — ไม่มีรายการถูกแก้/สลับลำดับ (hash chain ต่อจาก GENESIS)` }
    : { ok: false, txt: `ตรวจไม่ผ่านที่รายการลำดับที่ ${r.at} จากท้าย: ${r.why} — ของจริงต้องแจ้งเตือน security officer และหยุดการใช้บันทึกนี้เป็นหลักฐาน` };
  render();
}
/* demo: แก้บันทึกโดยไม่ re-chain เพื่อให้เห็นว่าการ chain จับการแก้ได้ */
function auditTamperDemo() {
  if (AUDIT.length < 2) return toastEl("ไม่มีบันทึกให้ทดลอง", "e");
  const i = Math.floor(AUDIT.length / 2);
  AUDIT[i].detail = (AUDIT[i].detail || "") + " [ถูกแก้]";
  auditMsg = { ok: false, txt: `มีการแก้ไขบันทึกอันดับที่ ${AUDIT.length - i} ("ถูกแก้") โดยไม่คำนวณ hash ใหม่ — กด "ตรวจความต่อเนื่อง" เพื่อดูว่า chain จับได้` };
  render();
  toastEl("จำลองการแก้ไขบันทึก (dev only) — production ห้ามมี path แบบนี้", "e");
}
function auditOpen(doc) {
  const d = DOCS.find(x => x.doc === doc);
  if (!d) return toastEl("ไม่พบเอกสารในชุดข้อมูลนี้", "e");
  const sc = scopeCheck(d);
  if (!sc.ok) return toastEl("403 — " + sc.why, "e");
  page = "queue";
  sel = doc;
  tab = "sum";
  viewRev = null;
  render();
}
function auditView() {
  const acts = Array.from(new Set(AUDIT.map(a => a.act))).sort();
  const q = auditF.q.toLowerCase();
  const all = AUDIT.filter(a => (!auditF.act || a.act === auditF.act) && [a.doc, a.who, a.detail, a.res].join(" ").toLowerCase().includes(q));
  const pages = Math.max(1, Math.ceil(all.length / AUDIT_PAGE_SIZE));
  if (auditPage > pages) auditPage = pages;
  const rows = all.slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE);
  return `<div class="full">
  <div class="panel"><div class="ph"><span>บันทึกการเข้าถึงและการดำเนินการ</span><span class="pill">${all.length} รายการ · หน้า ${auditPage}/${pages}</span></div>
    <div style="padding:12px 14px">
      <div class="filters">
        <input placeholder="ค้นหาเลขที่เอกสาร / ผู้ใช้ / เหตุผล" value="${esc(auditF.q)}" oninput="auditF.q=this.value;auditPage=1;render()">
        <select onchange="auditF.act=this.value;auditPage=1;render()"><option value="">ทุก action</option>${acts
          .map(a => `<option ${auditF.act === a ? "selected" : ""}>${esc(a)}</option>`)
          .join("")}</select>
        <button class="bg bsm" onclick="auditF={q:'',act:''};auditPage=1;render()">ล้างค่า</button>
        <button class="bg bsm" onclick="auditVerify()">ตรวจความต่อเนื่องของบันทึก</button>
        <button class="bg bsm" onclick="auditExport()">ส่งออก CSV</button>
        <button class="bg bsm" onclick="auditTamperDemo()">จำลองการแก้ไขบันทึก (dev)</button>
        <span class="src">ของจริงต้องเป็น immutable audit log · actor เป็น Entra object ID · เก็บ before/after workflow version</span>
      </div>
      ${
        auditMsg
          ? `<div class="note ${auditMsg.ok ? "g" : "e"}" style="margin:0 0 10px">${auditMsg.ok ? "✅" : "⛔"} ${esc(auditMsg.txt)}</div>`
          : ""
      }
      <div class="tbl-wrap"><table><thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>บทบาท</th><th>action</th><th>เอกสาร</th><th>เหตุผล / รายละเอียด</th><th>ผล</th><th>hash</th></tr></thead>
        <tbody>${
          rows.length
            ? rows
                .map(
                  a => `<tr><td class="mono">${esc(a.t)}</td><td class="mono">${esc(a.who)}</td><td>${esc(a.role)}</td><td><b>${esc(
                    a.act
                  )}</b></td><td class="mono">${
                    a.doc && a.doc !== "—"
                      ? `<span class="dmsl" onclick="auditOpen('${esc(a.doc)}')">${esc(a.doc)}</span>`
                      : "—"
                  }</td><td>${esc(a.detail || "—")}</td><td class="${
                    /^4\d\d|^\s*409/.test(String(a.res)) || String(a.res).indexOf("409") === 0 ? "bad" : "src"
                  }">${esc(a.res || "—")}</td>
                  <td class="mono hashc" title="prev ${esc(a.ph || "")} → this ${esc(a.h || "")}">${esc((a.h || "").slice(0, 8))}</td></tr>`
                )
                .join("")
            : '<tr><td colspan="8" class="empty">ไม่พบรายการที่ตรงเงื่อนไข</td></tr>'
        }</tbody></table></div>
      <div class="filters" style="border:0;padding:10px 0 0">
        <button class="bg bsm" ${auditPage === 1 ? "disabled" : ""} onclick="auditPage--;render()">← ก่อนหน้า</button>
        <span class="pill">หน้า ${auditPage} / ${pages}</span>
        <button class="bg bsm" ${auditPage === pages ? "disabled" : ""} onclick="auditPage++;render()">ถัดไป →</button>
      </div>
    </div></div></div>`;
}

/* ---------------- หน้า: มาตรฐานและรหัส ---------------- */
function refPage() {
  const ownerLabel = c => (USER_TASK_CODES.includes(c) ? "ผู้ใช้งาน (Receiver)" : "ฝ่ายบัญชี");
  const ruleOfCode = c =>
    RULES.filter(r => (r.codes || []).includes(c))
      .map(r => r.id)
      .join(", ") || "—";
  const cat = Object.entries(EXC62)
    .map(
      ([c, v]) => `<tr><td class="mono"><b>${c}</b></td><td><span class="${v.severity}">${v.severity}</span></td><td>${esc(
        v.desc
      )}</td><td class="mono">${ruleOfCode(c)}</td><td>${ownerLabel(c)}</td></tr>`
    )
    .join("");
  const docsOnly = Object.entries(EXC_DOCS)
    .map(
      ([c, t]) =>
        `<tr><td class="mono"><b>${c}</b></td><td>${esc(t)}</td><td>${
          EXC62[c] ? '<span class="bad">เลขซ้ำแต่คนละความหมาย — อันตรายที่สุด</span>' : '<span class="na">ไม่มีใน as-built</span>'
        }</td></tr>`
    )
    .join("");
  const map = CODE_MAP.map(m => `<tr><td><b>${esc(m.topic)}</b></td><td>${esc(m.docs)}</td><td>${esc(m.asBuilt)}</td><td>${esc(m.owner)}</td></tr>`).join("");
  const prov = PROVENANCE.map(p => `<tr><td><b>${esc(p[0])}</b></td><td class="mono">${esc(p[1])}</td></tr>`).join("");
  const arch = [
    ["Portal เป็นผู้บริโภคผลตรวจเท่านั้น", "mock", "ไม่รัน OCR / Oracle / matching ซ้ำเอง (หลักการ D1, D4) — ปุ่ม “ให้ AIVA ตรวจใหม่” แค่สร้าง action outbox"],
    ["ช่องทางรับผลตรวจ", "conf", "Receiving API: POST /api/portal/v1/imports (idempotent ด้วย event_id) และ POST /documents · schema_version 1.0"],
    ["Endpoint ที่ frontend ประกาศไว้", "conf", "http://127.0.0.1:8010/api/portal/v1 → /documents, /documents/{id}, /documents/{id}/pdf, /kpis, /ingest, /imports, /workflow/actions, /workflow/outbox, /session"],
    ["แยกสถานะ 3 แกน", "mock", "ผลการตรวจ (Auto-pass/Review/Hold/Manual Review) · งาน (Pending/Confirmed/Rejected/On hold/Resubmitted/Posted) · การประมวลผล (Queued/Running/Completed/Failed)"],
    ["สัญญาของ action", "mock", "ต้องมี Idempotency-Key + expected_workflow_version · 409 เมื่อ version ไม่ตรง · 202 เมื่อเข้าคิว producer และยังไม่ถือว่าเสร็จ"],
  ];
  return `<div class="full">
  <div class="warn">เอกสารมาตรฐาน v6.2 ฉบับ docs กับโค้ด engine จริง <b>ใช้รหัส exception คนละชุดกัน</b> · mockup นี้ยึดชุด <b>as-built (${
    Object.keys(EXC62).length
  } รหัสใน master_data.py)</b> เป็นหลัก และเก็บชุดของ docs ไว้ข้างกันเพื่อไม่ให้ตีความผิด · ห้าม relabel ข้อมูลเก่าเป็นรุ่นใหม่</div>
  <div class="panel"><div class="ph"><span>เกณฑ์การตรวจ 9 ข้อ (Table 9) ตามโค้ดจริง</span><span class="pill mono">OCR service/n8n/app/core/rules.py</span></div>
    <table><thead><tr><th>กฎ</th><th>STEP</th><th>เกณฑ์จริงที่โค้ดตรวจ</th><th>รหัสที่เป็นผล</th></tr></thead><tbody>${RULES.map(
      r => `<tr><td><b>${r.id}</b> ${esc(r.name)}</td><td>${r.step}</td><td>${esc(r.check)}${
        r.warn ? `<div class="src bad">ข้อจำกัด: ${esc(r.warn)}</div>` : ""
      }</td><td class="mono">${(r.codes || []).map(c => `<span class="code">${c}</span>`).join("")}</td></tr>`
    ).join("")}</tbody></table></div>
  <div class="panel"><div class="ph"><span>ตารางรหัส exception ที่ engine ใช้จริง (Standard 6.2 as-built)</span><span class="pill mono">VALID_EXCEPTION_CODES</span></div>
    <table><thead><tr><th>รหัส</th><th>ระดับ</th><th>ความหมาย</th><th>กฎที่ผลิต</th><th>ผู้รับผิดชอบงาน</th></tr></thead><tbody>${cat}</tbody></table>
    <div class="ph" style="border-top:1px solid var(--line)">ลำดับ decision: <b>manual_review → Manual Review</b> · มี High → <b>Hold</b> · มี Medium → <b>Review</b> · นอกจากนั้นรวม Low → <b>Auto-pass</b> · รหัสที่มอบให้ผู้ใช้ = ${USER_TASK_CODES.join(
      ", "
    )}</div></div>
  <div class="panel"><div class="ph"><span>รหัสในฉบับ docs — แสดงไว้เพื่อระวังเลขซ้ำคนละความหมาย</span><span class="pill">docs/matching-rules-standard-v6.2.md</span></div>
    <table><thead><tr><th>รหัส</th><th>ความหมายตาม docs</th><th>สถานะ</th></tr></thead><tbody>${docsOnly}</tbody></table></div>
  <div class="panel"><div class="ph"><span>ตารางเทียบ docs ↔ as-built ตามข้อตรวจ</span></div>
    <table><thead><tr><th>ข้อตรวจ</th><th>docs บอกว่า</th><th>โค้ดจริงทำอย่างไร</th><th>ผู้รับผิดชอบ</th></tr></thead><tbody>${map}</tbody></table></div>
  <div class="panel"><div class="ph"><span>สถาปัตยกรรมและสัญญาข้อมูลที่ยึดใน mockup</span></div>
    <table><thead><tr><th>หัวข้อ</th><th>สถานะ</th><th>รายละเอียด</th></tr></thead><tbody>${arch
      .map(a => `<tr><td><b>${esc(a[0])}</b></td><td><span class="tag ${a[1]}">${a[1] === "mock" ? "จำลองใน UI" : "ต้องทำต่อ"}</span></td><td>${esc(a[2])}</td></tr>`)
      .join("")}</tbody></table></div>
  <div class="panel"><div class="ph"><span>แหล่งที่มาของข้อมูลในแต่ละไฟล์</span></div>
    <table><thead><tr><th>ข้อมูล</th><th>ที่มา</th></tr></thead><tbody>${prov}</tbody></table></div></div>`;
}

/* ---------------- init ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  boot();
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") return closeModal();
    const open = document.getElementById("ov").classList.contains("on");
    if (!open || !viewerDoc) return;
    if (e.key === "ArrowRight") { e.preventDefault(); showPage(viewerPage + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); showPage(viewerPage - 1); }
    else if (e.key === "Home") { e.preventDefault(); showPage(1); }
    else if (e.key === "End") {
      const d = DOCS.find(x => x.doc === viewerDoc);
      e.preventDefault();
      showPage(d ? d.pages : 1);
    }
  });
  document.getElementById("ov").addEventListener("click", e => {
    if (e.target.id === "ov") closeModal();
  });
});

