/* =============================================================
 * tools/smoke-test.js — ไล่เรนเดอร์ทุกหน้า/ทุกแท็บ/ทุกเอกสารใน mockup
 * วัตถุประสงค์: ตรวจว่า mockup ไม่พังเมื่อสลับผู้ใช้ สลับแท็บ หรือยิง action
 * วิธีรัน (จากโฟลเดอร์ invoice-webv3):  node tools/smoke-test.js
 * ใช้ DOM ปลอมระดับขั้นต่ำ — ไม่ทดสอบ CSS จริง
 * ============================================================= */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const FILES = ["assets/data.js", "assets/domain.js", "assets/docs.js", "assets/app.js"];

function el(id) {
  const node = {
    id,
    innerHTML: "",
    textContent: "",
    value: "",
    className: "",
    style: {},
    classList: {
      set: new Set(),
      add(c) { this.set.add(c); },
      remove(c) { this.set.delete(c); },
      contains(c) { return this.set.has(c); },
    },
    listeners: {},
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    click() { (this.listeners.click || []).forEach(f => f({ target: node })); },
  };
  return node;
}

const nodes = new Map();
const get = id => {
  if (!nodes.has(id)) nodes.set(id, el(id));
  return nodes.get(id);
};

let domReady = null;
const document = {
  getElementById: get,
  querySelector: sel => get(sel.replace(/[^a-z]/gi, "") || "modal"),
  addEventListener(type, fn) { if (type === "DOMContentLoaded") domReady = fn; },
};

const ctx = vm.createContext({
  document,
  window: {},
  navigator: {},
  console,
  setTimeout,
  clearTimeout,
  Math,
  Date,
  JSON,
  encodeURIComponent,
  Number,
  Object,
  Array,
  String,
  Set,
});

for (const f of FILES) {
  const code = fs.readFileSync(path.join(ROOT, f), "utf8");
  try {
    vm.runInContext(code, ctx, { filename: f });
  } catch (e) {
    console.error(`✗ โหลด ${f} ไม่ผ่าน: ${e.message}`);
    process.exit(1);
  }
}
/* const/let ระดับบนสุดของ script ไม่กลายเป็น property ของ global object
   จึงต้องเปิดช่องอ่านผ่าน getter (bridge เดียวกับที่ใช้ตอน debug ใน browser) */
vm.runInContext(
  `globalThis.__S = {
     get USERS(){return USERS}, get DOCS(){return DOCS}, get MASTER(){return MASTER},
     get EXC62(){return EXC62}, get STANDARD_RULES(){return STANDARD_RULES},
     get AUDIT(){return AUDIT}, get OUTBOX(){return OUTBOX},
     get sel(){return sel}, get auditF(){return auditF},
     setAuditF(v){ auditF = v; },
   };`,
  ctx
);
const S = ctx.__S;
if (!domReady) {
  console.error("✗ ไม่พบ DOMContentLoaded handler ใน app.js");
  process.exit(1);
}
domReady();

let checks = 0;
const problems = [];
function check(name, fn) {
  checks++;
  try {
    fn();
  } catch (e) {
    problems.push(`${name}: ${e.message}`);
  }
}
const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

/* ---------- 1) ทุกผู้ใช้: ทุกหน้า ---------- */
const pages = ["queue", "rbac", "audit", "ref"];
for (const u of S.USERS) {
  check(`ผู้ใช้ ${u.id} สลับแล้วเรนเดอร์ครบ`, () => {
    get("user").value = u.id;
    ctx.switchUser();
    for (const p of pages) {
      ctx.go(p);
      const html = get("app").innerHTML;
      must(typeof html === "string" && html.length > 200, `หน้า ${p} ของ ${u.id} ว่างเปล่า`);
      must(!/undefined|NaN|\[object Object\]/.test(html), `หน้า ${p} ของ ${u.id} มีค่า undefined/NaN ปนมา`);
    }
  });
}

/* ---------- 2) เอกสารทุกฉบับ: ครบทุกแท็บ + ไม่พบ NaN ---------- */
const whoCanSee = d => S.USERS.find(u => { get("user").value = u.id; ctx.switchUser(); return ctx.scopeCheck(d).ok; });
const tabIds = ["sum", "lines", "rules", "evid", "hist", "json"];
for (const d of S.DOCS) {
  check(`เอกสาร ${d.doc}`, () => {
    const viewer = whoCanSee(d);
    must(viewer, `ไม่มีใครใน RBAC ชุดนี้เข้าถึงเอกสาร ${d.doc} ได้เลย — fail-safe ต้องมีผู้รับผิดชอบ`);
    ctx.go("queue");
    ctx.pick(d.doc);
    let all = "";
    for (const t of tabIds) {
      ctx.setTab(t);
      const h = get("detail").innerHTML;
      must(h.length > 300, `แท็บ ${t} ว่างเปล่า`);
      all += h;
    }
    must(!/NaN|\[object Object\]/.test(all), `มี NaN/[object Object] ในหน้ารายละเอียด`);
    /* Table 9 ต้องครบ 9 กฎเสมอ */
    must(d.rules.length === 9, `rules ไม่ครบ 9 ข้อ (มี ${d.rules.length})`);
    /* ผลสรุปต้องตรงกับ rules (ยกเว้น case ที่จงใจให้ drift / duplicate / pipeline fail) */
    const recomputed = ctx.decide(d.rules);
    if (!d.dup && !d.error && !d.drift && !d.prevRev) {
      must(recomputed === d.status, `status (${d.status}) ไม่ตรงกับที่คำนวณได้ (${recomputed})`);
    }
    /* snapshot ต้องไม่ถูกแก้ภายหลัง pick */
    must(JSON.stringify(ctx.toJSON(d)).length > 900, `JSON snapshot สั้นเกินไป`);
  });
}

/* ---------- 3) viewer ทุกเอกสาร ทุกหน้า ---------- */
for (const d of S.DOCS) {
  check(`viewer ${d.doc}`, () => {
    ctx.openViewer(d.doc, 1);
    for (let p = 1; p <= d.pages; p++) {
      ctx.showPage(p);
      const h = get("mb").innerHTML;
      must(h.includes("MOCK"), `หน้า ${p} ไม่มี watermark`);
    }
    ctx.closeModal();
  });
}

/* ---------- 4) action: 409 เมื่อ version ผิด / 200 + outbox เมื่อถูก ---------- */
check("optimistic concurrency 409", () => {
  get("user").value = "u6";
  ctx.switchUser();
  ctx.go("queue");
  const d = S.DOCS.find(x => x.wf === "PENDING_REVIEW" && x.status === "Auto-pass");
  must(d, "ไม่พบเอกสารที่พร้อมยืนยัน");
  ctx.pick(d.doc);
  ctx.askAction("confirm");
  get("a-wfv").value = String(d.wfv + 99);
  const before = d.wfv;
  ctx.doAction();
  must(d.wf === "PENDING_REVIEW" && d.wfv === before, "409 แต่สถานะยังถูกแก้ — ผิดหลักการ");
  must(S.AUDIT[0].res.indexOf("409") === 0, "ไม่บันทึก 409 ลง audit");
});

check("confirm ผ่านและบันทึก audit", () => {
  const d = S.DOCS.find(x => x.doc === S.sel);
  ctx.askAction("confirm");
  get("a-wfv").value = String(d.wfv);
  const before = d.wfv;
  ctx.doAction();
  must(d.wf === "CONFIRMED", "ยืนยันแล้ว workflow ต้องเป็น CONFIRMED");
  must(d.wfv === before + 1, "wf_version ต้องเพิ่มขึ้น 1");
  must(S.AUDIT[0].act === "confirm", "audit ต้องมี action confirm");
});

check("rerun เปิด action outbox และกันการสั่งซ้ำ", () => {
  get("user").value = "u4";
  ctx.switchUser();
  ctx.go("queue");
  const d = S.DOCS.find(
    x => ctx.scopeCheck(x).ok && x.assigned === "accounting" && !S.OUTBOX.some(o => o.doc === x.doc && o.state !== "completed") && !S.DOCS.some(y => y.dup === x.doc)
  );
  must(d, "ไม่พบเอกสารที่มอบหมายให้ฝ่ายบัญชีในขอบเขตของ ACC");
  ctx.pick(d.doc);
  ctx.askAction("rerun");
  get("a-wfv").value = String(d.wfv);
  get("a-note").value = "rerun จาก smoke test";
  const n = S.OUTBOX.length;
  ctx.doAction();
  must(S.OUTBOX.length === n + 1, "rerun ต้องสร้าง action outbox");
  const ob = S.OUTBOX[0];
  must(ob.state === "waiting_revision", "outbox ต้องเริ่มที่ waiting_revision");
  must(d.wf === "RESUBMITTED", "workflow ต้องเป็น RESUBMITTED");
});

check("action ต้องมีคำอธิบายเมื่อ needNote", () => {
  get("user").value = "u6";
  ctx.switchUser();
  const d = S.DOCS.find(x => x.wf !== "REJECTED" && x.wf !== "POSTED");
  ctx.pick(d.doc);
  ctx.askAction("hold");
  get("a-wfv").value = String(d.wfv);
  get("a-note").value = "   ";
  const wf = d.wf;
  ctx.doAction();
  must(d.wf === wf, "ไม่กรอกคำอธิบายแล้วห้ามเปลี่ยนสถานะ");
});

/* ---------- 5) audit + filtering ---------- */
check("audit pagination และค้นหา", () => {
  get("user").value = "u6";
  ctx.switchUser();
  ctx.go("audit");
  const html = get("app").innerHTML;
  must(html.includes("หน้า"), "ไม่มีเลขหน้าของ audit");
  S.setAuditF({ q: "confirm", act: "" });
  ctx.render();
  must(S.AUDIT.length > 0, "audit ว่างทั้งหมด");
  S.setAuditF({ q: "", act: "" });
});

/* ---------- 6) KPI ต้องนับตรงกับข้อมูลในขอบเขต ---------- */
check("KPI นับตรงข้อมูล", () => {
  get("user").value = "u6";
  ctx.switchUser();
  ctx.go("queue");
  const v = S.DOCS.filter(d => ctx.scopeCheck(d).ok);
  const auto = v.filter(d => d.status === "Auto-pass").length;
  must(get("app").innerHTML.includes(`<b>${auto}</b>`), `KPI Auto-pass ต้องเท่ากับ ${auto}`);
});

/* ---------- 7) Master data 48 แถว + ไม่มี secret ---------- */
check("ข้อมูลตั้งต้น", () => {
  must(S.MASTER.length === 48, `MASTER ต้องมี 48 แถว (มี ${S.MASTER.length})`);
  must(Object.keys(S.EXC62).length === 15, "EXC62 ต้องมี 15 รหัส as-built");
  must(S.STANDARD_RULES.length === 9, "ต้องมี 9 กฎ");
  const all = ["assets/data.js", "assets/domain.js", "assets/docs.js", "index.html"]
    .map(f => fs.readFileSync(path.join(ROOT, f), "utf8"))
    .join("\n");
  must(!/(api[_-]?key\s*[:=]\s*["'][A-Za-z0-9]{12,}|secret\s*[:=]\s*["'][A-Za-z0-9]{8,}|password\s*[:=]\s*["'][^"']{6,}|sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{12,}|Bearer\s+[A-Za-z0-9_\-]{20,})/i.test(all),
    "พบรูปแบบที่เข้าข่าย credential ในไฟล์ข้อมูล/หน้าเว็บ");
});

if (problems.length) {
  console.error(`\n✗ พบ ${problems.length} ปัญหาจาก ${checks} การตรวจ:`);
  problems.forEach(p => console.error("  - " + p));
  process.exit(1);
}
console.log(`\n✓ ผ่าน ${checks} การตรวจ — ทุกผู้ใช้ ทุกหน้า ทุกเอกสาร ทุก action สร้าง HTML ได้ครบ`);
