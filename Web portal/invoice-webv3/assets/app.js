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
let pending = null;

/* ---------------- master data helpers ---------------- */
const MASTER_BY_ORG = Object.fromEntries(MASTER.map(m => [m.org, m]));
const entOf = org => (org == null ? null : MASTER_BY_ORG[org] || null);
const coKeyOfTax = tax => Object.keys(CO).find(k => CO[k].tax && CO[k].tax === tax) || "?";

function B(n) {
  if (n == null || n === "") return "—";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
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
];

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
    <div class="srch"><input id="q" placeholder="ค้นหาเลขที่ใบแจ้งหนี้ / PO / ผู้ขาย / ใบรับ" oninput="drawList()"></div>
    <div class="q" id="list"></div>
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
  const box = document.getElementById("q");
  if (box) box.value = "";
  render();
  toastEl("ล้างตัวกรองแล้ว — คิวแสดงทุกเอกสารที่สิทธิ์ปัจจุบันเข้าถึงได้");
}
function drawList() {
  const el = document.getElementById("list");
  if (!el) return;
  const q = ((document.getElementById("q") || {}).value || "").toLowerCase();
  const L = visible()
    .filter(d => matchKpi(d, filt) && coPass(d))
    .filter(d => [d.inv, d.po || "", d.vendor, d.rcv || "", d.ext].join(" ").toLowerCase().includes(q));
  document.getElementById("qn").textContent = L.length + " ฉบับ";
  if (!L.length) return (el.innerHTML = `<div class="empty">ไม่พบเอกสารในขอบเขตสิทธิ์นี้<br><span class="src">scope = ${ROLES[ME.role].scope}</span></div>`);
  const offList = sel && !L.some(d => d.doc === sel) ? visible().find(d => d.doc === sel) : null;
  const offHint = offList
    ? `<div class="qi" style="background:#FFFDF5;cursor:default">
        <div class="v">เอกสารที่เปิดอยู่ (<b>${esc(offList.inv)}</b>) ไม่ตรงกับตัวกรองปัจจุบัน</div>
        <div class="r2"><span class="dmsl" onclick="resetFilt()">ล้างตัวกรองเพื่อดูเอกสารนี้ในคิว</span></div>
      </div>`
    : "";
  el.innerHTML = offHint + L
    .map(
      d => `
    <div class="qi ${d.doc === sel ? "on" : ""}" onclick="pick('${d.doc}')">
      <div class="r1"><span class="inv">${esc(d.inv)}</span>${bVer(d)}</div>
      <div class="v">${esc(d.vendor)}</div>
      <div class="r2"><span>PO ${esc(d.po || "—")} · <span class="co">${d.unmapped ? "ไม่ map" : d.company}/${d.ouShort}</span></span><span class="mono">${B(d.total)}</span></div>
      <div class="r2">${d.codes.length ? d.codes.map(c => `<span class="code">${c}</span>`).join("") : '<span class="ok">ไม่มี exception</span>'}<span>${bWf(d)}</span></div>
    </div>`
    )
    .join("");
}
function pick(id) {
  sel = id;
  tab = "sum";
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
        <div class="axes"><span>รอบ <b>${d.round}</b></span>·<span>revision <b>${d.rev}</b></span>·<span>wf_version <b>${d.wfv}</b></span></div>
        <button class="bg bsm" onclick="openViewer('${d.doc}',1)">📄 เอกสารต้นทาง</button>
      </div>
    </div>
    <div class="flow">${steps.join("")}</div>
    <div class="tabs">${tabs
      .map(
        ([k, n, c]) =>
          `<div class="tab ${tab === k ? "on" : ""}" tabindex="0" onclick="setTab('${k}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();setTab('${k}')}">${n}${c ? `<span class="cnt">${c}</span>` : ""}</div>`
      )
      .join("")}</div>
    ${pane("sum", sumPane(d))}
    ${pane("lines", linesPane(d))}
    ${pane("rules", rulesPane(d))}
    ${pane("evid", evidPane(d))}
    ${pane("hist", histPane(d))}
    ${pane("json", jsonPane(d))}
    ${actionBar(d)}
  </div>`;
}
function setTab(k) {
  tab = k;
  drawDetail();
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
    <div class="card"><h4>ยอดรวมในใบแจ้งหนี้ (V-03)</h4>
      <div class="kv"><span>รวมก่อนภาษี</span><b class="mono">${B(d.sub)}</b></div>
      <div class="kv"><span>ภาษีมูลค่าเพิ่ม 7%</span><b class="mono">${B(d.vat)}</b></div>
      <div class="kv"><span>ยอดรวม</span><b class="mono">${B(d.total)}</b></div>
      <div class="kv"><span>คำนวณใหม่ sub + vat</span><b class="mono">${B((d.sub || 0) + (d.vat || 0))}</b></div>
    </div>
    <div class="card"><h4>ยอดเทียบใบรับสินค้า (V-09)</h4>
      <div class="kv"><span>Σ(จำนวนรับ × ราคาใบรับ)</span><b class="mono">${B(d.rtotal)}</b></div>
      <div class="kv"><span>subtotal ในบิล</span><b class="mono">${B(d.sub)}</b></div>
      <div class="kv"><span>ผลต่าง</span><b class="mono ${d.rtotal != null && Math.abs(d.sub - d.rtotal) > 0.5 ? "diff" : "ok"}">${
        d.rtotal == null ? "ไม่มีข้อมูลใบรับ" : B(Math.abs(d.sub - d.rtotal))
      }</b></div>
      <div class="kv"><span>เกณฑ์</span><span>abs diff ≤ 0.50 บาท</span></div>
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
      const math = qty * price - amount;
      const qD = noR ? null : qty - rqty;
      const pD = noR ? null : price - rprice;
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
function histPane(d) {
  const ob = OUTBOX.filter(o => o.doc === d.doc);
  const rel = AUDIT.filter(a => a.doc === d.doc);
  const tl = [];
  if (d.prevRev)
    tl.push({
      k: "s",
      t: `revision ${d.prevRev.rev} · ตรวจรอบที่ ${d.prevRev.round}`,
      a: `ผลรอบก่อน: ${d.prevRev.status} ${d.prevRev.codes.join(", ")}`,
      d: d.prevRev.closed,
    });
  tl.push({
    k: "v",
    t: `revision ${d.rev} · ตรวจรอบที่ ${d.round}`,
    a: `AIVA ตรวจรอบที่ ${d.round} → ${d.status}`,
    d: d.codes.length ? "exception: " + d.codes.join(", ") : "ไม่มี exception",
  });
  rel
    .slice()
    .reverse()
    .forEach(a => tl.push({ k: a.act === "reject" ? "c" : a.act === "confirm" ? "g" : "h", t: a.t, a: `${a.act} โดย ${a.who}`, d: a.detail || a.res }));
  return `
  ${d.prevRev ? `<div class="note w">ผลที่แสดงตอนนี้คือของ <b>revision ${d.rev}</b> — snapshot เก่า (${d.prevRev.rev}) ถูกเก็บแบบ immutable ไม่ถูกเขียนทับ` : ""}
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
function actionBar(d) {
  if (["REJECTED", "POSTED"].includes(d.wf))
    return `<div class="bar"><div class="hint">เอกสารปิดสถานะแล้ว (${WF_LABEL[d.wf]}) — snapshot และ audit เป็น immutable · การทำ action ซ้ำต้องเริ่ม validation round ใหม่</div>
    <button class="bg bsm" onclick="openViewer('${d.doc}',1)">📄 ต้นทาง</button></div>`;
  const r = ROLES[ME.role];
  const waiting = OUTBOX.filter(o => o.doc === d.doc && o.state !== "completed");
  const btns = Object.entries(ACTIONS)
    .map(([k, a]) => {
      let ok = can(a.perm);
      let why = `บทบาท ${r.n} ไม่มีสิทธิ์ ${a.perm}`;
      if (k === "confirm" && (d.status === "Hold" || d.status === "Manual Review")) {
        ok = false;
        why = `ผลตรวจเป็น ${d.status} — กดยืนยันไม่ได้จนกว่าจะมี revision ใหม่หรือได้รับอนุมัติเป็นกรณีพิเศษ (four-eyes)`;
      }
      if (waiting.length && (k === "resubmit" || k === "rerun")) {
        ok = false;
        why = "มีคำขอเดิมที่ยังไม่ปิด (กันการสั่งซ้ำ)";
      }
      return `<button class="${a.cls}" ${ok ? "" : "disabled"} title="${esc(ok ? a.n : why)}" onclick="askAction('${k}')">${a.n}</button>`;
    })
    .join("");
  const hold = d.status === "Hold" || d.status === "Manual Review";
  const euCodes = d.codes.filter(c => USER_TASK_CODES.includes(c));
  const hint = waiting.length
    ? `มีคำขอ <b>${waiting[0].req}</b> รอ snapshot revision ใหม่ · portal ยังไม่ถือว่าสำเร็จ (202 Accepted)`
    : hold
    ? `ผลตรวจเป็น <b>${d.status}</b> · ผู้ยืนยันและผู้ส่งเข้า AP ต้องเป็นคนละคน (ยังไม่บังคับใน pilot)`
    : ME.role === "EU" && d.assigned === "user" && euCodes.length
    ? `engine มอบหมายงานนี้ให้ Receiver เพราะพบ ${euCodes.map(c => `<span class="code">${c}</span>`).join("")}`
    : `พร้อมดำเนินการ · expected_workflow_version = <b>${d.wfv}</b>`;
  return `<div class="bar"><div class="hint">${hint}</div><button class="bg bsm" onclick="openViewer('${d.doc}',1)">📄 ต้นทาง</button>${btns}</div>`;
}

function askAction(k) {
  const d = DOCS.find(x => x.doc === sel);
  const a = ACTIONS[k];
  pending = { k, doc: d.doc, idem: "IDM-" + Math.random().toString(36).slice(2, 10).toUpperCase() };
  document.getElementById("mt").textContent = a.n + " · " + d.inv;
  document.getElementById("mb").innerHTML = `
    <div class="note i" style="margin:0 0 6px">เอกสาร <b>${esc(d.inv)}</b> · revision ${d.rev} · workflow <b>${WF_LABEL[d.wf]}</b> (wf_version ${d.wfv})<br>
    <span class="src">action ไม่เขียนทับ snapshot การตรวจ · production เก็บ actor เป็น Entra object ID (immutable) + เวลา + reason + before/after version</span></div>
    <label>reason_code ${a.needNote ? '<span class="bad">*</span>' : ""}</label>
    <select id="a-reason">${REASON_CODES.map(c => `<option>${c}</option>`).join("")}</select>
    ${a.needNote ? `<label>คำอธิบาย <span class="bad">*</span></label><textarea id="a-note" placeholder="ระบุข้อเท็จจริงที่ยืนยัน (ห้ามใส่ข้อมูลส่วนบุคคลหรือ secret)"></textarea>` : ""}
    <label>expected_workflow_version</label>
    <input id="a-wfv" class="mono" value="${d.wfv}">
    <p class="src" style="margin-top:6px">ลองกรอกค่าที่ต่างจาก ${d.wfv} เพื่อจำลอง <b>409 Conflict</b> ตาม optimistic concurrency (แท็บเก่าต้องได้ 409 แล้วโหลดสถานะใหม่)</p>
    <label>Idempotency-Key</label>
    <input class="mono" value="${pending.idem}" readonly>
    ${
      a.opensOutbox
        ? `<div class="note w" style="margin:8px 0 0">action นี้สร้าง <b>action outbox</b> ให้ producer · สถานะจะเป็น waiting_revision จนกว่า snapshot revision ${
            d.rev + 1
          } จะมาถึง</div>`
        : ""
    }`;
  document.getElementById("mmf").innerHTML = `<button class="bg" onclick="closeModal()">ยกเลิก</button><button class="bp" onclick="doAction()">ยืนยันการดำเนินการ</button>`;
  document.getElementById("ov").classList.add("on");
}
function doAction() {
  const d = DOCS.find(x => x.doc === pending.doc);
  const a = ACTIONS[pending.k];
  const noteEl = document.getElementById("a-note");
  const reason = document.getElementById("a-reason").value;
  const wfv = Number(document.getElementById("a-wfv").value);
  if (a.needNote && noteEl && !noteEl.value.trim()) return toastEl("ต้องกรอกคำอธิบายก่อนส่ง (required note)", "e");
  if (wfv !== d.wfv) {
    log(pending.k, d.doc, `ส่ง expected_workflow_version = ${wfv} · ข้อมูลจริงคือ ${d.wfv}`, "409 Conflict · โหลดสถานะใหม่");
    closeModal();
    render();
    return toastEl(`409 Conflict — หน้านี้ใช้ wf_version ${wfv} แต่ข้อมูลจริงคือ ${d.wfv} ระบบโหลดสถานะใหม่ให้แล้ว ห้ามกดซ้ำอัตโนมัติ`, "e");
  }
  const before = d.wf;
  d.wf = { confirm: "CONFIRMED", reject: "REJECTED", hold: "ON_HOLD", return: "ON_HOLD", resubmit: "RESUBMITTED", rerun: "RESUBMITTED" }[pending.k];
  d.wfv += 1;
  const res = `200 OK · wf_version ${d.wfv - 1}→${d.wfv}`;
  log(pending.k, d.doc, `reason ${reason}${noteEl ? " · " + noteEl.value.trim().slice(0, 140) : ""}`, res);
  if (a.opensOutbox) {
    OUTBOX.unshift({
      req: "REQ-" + Math.floor(9000 + Math.random() * 900),
      doc: d.doc,
      action: pending.k,
      by: ME.email,
      at: nowT(),
      state: "waiting_revision",
      reason,
      note: noteEl ? noteEl.value.trim().slice(0, 140) : "",
      exp_rev: d.rev + 1,
    });
    toastEl(`202 Accepted — สร้าง action outbox แล้ว ยังไม่ถือว่าเสร็จจนกว่า revision ${d.rev + 1} จะมาถึง`, "g");
  } else if (pending.k === "confirm") {
    toastEl("200 OK — workflow เป็น Confirmed · ผลตรวจต้นทางไม่ถูกแก้ · การส่งเข้า AP ต้องแยกผู้ยืนยันกับผู้ตั้งหนี้", "g");
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
  if (!can("DMS")) return toastEl("บทบาท " + ROLES[ME.role].n + " ไม่มีสิทธิ์เปิดเอกสารต้นทาง (DMS)", "e");
  viewerDoc = d.doc;
  viewerPage = pg || 1;
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
    <div class="viewer">
      <div class="thumbs">${Array.from({ length: d.pages }, (_, i) => i + 1)
        .map(
          p => `<div class="thumb ${p === viewerPage ? "on" : ""}" onclick="showPage(${p})">หน้า ${p}${p === hlPage ? "<br><small>⚠ หลักฐาน</small>" : ""}</div>`
        )
        .join("")}</div>
      <div>${invoicePage(d, viewerPage)}</div>
    </div>`;
}
function showPage(p) {
  viewerPage = p;
  drawViewer();
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
        const badLine = Math.abs(l[1] * l[3] - l[4]) > 0.5;
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
        <span class="src">ของจริงต้องเป็น immutable audit log · actor เป็น Entra object ID · เก็บ before/after workflow version</span>
      </div>
      <div class="tbl-wrap"><table><thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>บทบาท</th><th>action</th><th>เอกสาร</th><th>เหตุผล / รายละเอียด</th><th>ผล</th></tr></thead>
        <tbody>${
          rows.length
            ? rows
                .map(
                  a => `<tr><td class="mono">${esc(a.t)}</td><td class="mono">${esc(a.who)}</td><td>${esc(a.role)}</td><td><b>${esc(
                    a.act
                  )}</b></td><td class="mono">${esc(a.doc)}</td><td>${esc(a.detail || "—")}</td><td class="${
                    String(a.res).indexOf("409") === 0 ? "bad" : "src"
                  }">${esc(a.res || "—")}</td></tr>`
                )
                .join("")
            : '<tr><td colspan="7" class="empty">ไม่พบรายการที่ตรงเงื่อนไข</td></tr>'
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
    if (e.key === "Escape") closeModal();
  });
  document.getElementById("ov").addEventListener("click", e => {
    if (e.target.id === "ov") closeModal();
  });
});

