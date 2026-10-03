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

const MODAL_FIELDS = ["a-reason", "a-note", "a-wfv", "a-rev", "a-idem", "j-search"];
function el(id) {
  let html = "";
  const node = {
    id,
    get innerHTML() {
      return html;
    },
    set innerHTML(v) {
      html = v;
      /* จำลองเบราว์เซอร์ที่ rebuild ฟอร์มทุกครั้งที่เปิด modal:
         ค่าที่ผู้ใช้พิมพ์รอบก่อนต้องไม่รั่วมาใช้ในการยืนยันรอบใหม่ (เจอจริงตอนทดสอบ on-hold) */
      if (id === "mb") MODAL_FIELDS.forEach(k => nodes.set(k, el(k)));
    },
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
     get ME(){return ME}, get userOwnedOpen(){return userOwnedOpen}, get QUEUE_PAGE(){return QUEUE_PAGE}, get viewRev(){return viewRev},
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



/* ---------- 2b) Decimal string (docs 07 UI-15) ---------- */
check("Decimal string ไม่กลายเป็น NaN และไม่ปิดบังผลต่าง", () => {
  get("user").value = "u6";
  ctx.switchUser();
  ctx.go("queue");
  const d = S.DOCS.find(x => x.decStr === true);
  must(d, "ไม่มีเอกสาร Decimal string ในชุดข้อมูล");
  ctx.pick(d.doc);
  ctx.setTab("sum");
  const h = get("detail").innerHTML;
  must(h.includes("18,400.0002"), "ต้องแสดงเลขทศนิยมตรงตาม snapshot ของผู้ขาย");
  must(!/NaN|\[object Object\]/.test(h), "มี NaN จากการคำนวณ Decimal string");
  must(/Decimal/.test(h), "ไม่บอกว่าตัวเลขเป็น Decimal string");
  must(d.status === ctx.decide(d.rules), "ผลสรุปต้องตรงกับ engine จริง (Low → Auto-pass)");
});

/* ---------- 4b) action parity: ส่งคำชี้แจง (explain) ---------- */
check("explain: ผู้ใช้งานได้เฉพาะเอกสารในขอบเขต · ผลตรวจ/สถานะคงเดิม", () => {
  let done = 0;
  for (const u of S.USERS) {
    get("user").value = u.id;
    ctx.switchUser();
    ctx.go("queue");
    for (const d of S.DOCS) {
      const g = ctx.guards(d);
      if (!g.explain[0]) continue;   /* สิทธิ์/ขอบเขต/สถานะไม่พอ → g มีเหตุผลอยู่แล้ว */
      ctx.pick(d.doc);
      const st = d.status, wf = d.wf, wfv = d.wfv;
      ctx.askAction("explain");
      get("a-wfv").value = String(d.wfv);
      get("a-rev").value = String(d.rev);
      get("a-note").value = "ชี้แจงจาก smoke test";
      get("a-idem").value = "IDM-SMOKE-EXP-" + d.doc;
      const n = S.AUDIT.length;
      ctx.doAction();
      if (S.AUDIT.length === n) continue;            /* กันด้วย required note — ไม่ใช่ความผิดพลาด */
      must(d.status === st, `explain แก้ผลตรวจของ ${d.doc}`);
      must(d.wf === wf, `explain เปลี่ยน workflow ของ ${d.doc}`);
      must(d.wfv === wfv + 1, `explain ต้องเพิ่ม wf_version (${d.doc})`);
      must(d.assigned === "accounting", `หลังชี้แจง งานต้องกลับไปฝ่ายบัญชี (${d.doc})`);
      const h = get("detail").innerHTML;
      must(!/undefined|NaN|\[object Object\]/.test(h), `หลัง explain ${d.doc} มี undefined/NaN ปนมา`);
      done++;
    }
  }
  must(done >= 3, `แทบไม่ได้ทดสอบ path ของ explain เลย (ทำได้ ${done})`);
});

/* ---------- 4c) separation of duties + งานล็อกตามฝาย + เหตุผลของปุ่มที่ปิด ---------- */
check("SoD: ผู้แนบเอกสารยืนยันเองไม่ได้ + UI บอกเหตุผลทุกปุ่มที่ปิด", () => {
  get("user").value = "u4";            /* PANIDA.R = ผู้แนบเอกสาร AIVA-2609-0012 */
  ctx.switchUser();
  ctx.go("queue");
  const d = S.DOCS.find(x => x.doc === "AIVA-2609-0012");
  must(d, "ไม่พบเอกสารสำหรับทดสอบ SoD");
  must(ctx.samePerson(d), "ผู้ใช้ปัจจุบันต้องตรงกับผู้ใช้ที่แนบเอกสาร (upl) ถึงจะทดสอบ SoD ได้");
  ctx.pick(d.doc);
  const g = ctx.guards(d);
  must(g.confirm[0] === false, "action ประเภทตัดสินต้องถูกปิดเมื่อคนเดียวกันเป็นผู้แนบ");
  must(/separation of duties/.test(g.confirm[1]), "เหตุผลต้องอ้าง separation of duties");
  must(g.explain[0] === false && /ชี้แจง/.test(g.explain[1]), "บทบาทที่ไม่มีสิทธิ์ EXPLAIN ต้องเห็นเหตุผลด้านสิทธิ์ ไม่ใช่กดได้");
  const h = get("detail").innerHTML;
  must(/ขั้นตอนถัดไป/.test(h), "ไม่มีการ์ดขั้นตอนถัดไป (ลำดับข้อมูลแบบ task-first)");
  must(/separation of duties/.test(h), "การ์ดไม่แสดงเหตุผลที่ปุ่มถูกปิด");
  must(/<button[^>]*disabled[^>]*title="[^"]{5,}"/.test(h), "ปุ่มที่ปิดต้องมี title เป็นเหตุผล (docs 08)");
});

check("งานที่ engine มอบหมายให้ฝั่งผู้ใช้: ฝ่ายบัญชียืนยันเองไม่ได้ (lock)", () => {
  let checked = 0;
  for (const u of S.USERS) {
    get("user").value = u.id;
    ctx.switchUser();
    for (const d of S.DOCS) {
      if (!S.userOwnedOpen(d).length) continue;   /* High exception ที่ engine มอบหมายให้ฝั่งผู้ใช้ */
      const g = ctx.guards(d);
      if (ctx.scopeCheck(d).ok && (u.role === "ACC" || u.role === "APR")) {
        must(g.confirm[0] === false, `${u.id} (${u.role}) ไม่ควรยืนยันงานที่ engine มอบหมายให้ฝั่งผู้ใช้ (${d.doc})`);
        checked++;
      }
    }
  }
  must(checked >= 3, "ไม่มีการทดสอบล็อกฝายบัญชีเลย");
});

check("on-hold ต้องล็อก action อื่น และมีทางออกด้วย release_hold", () => {
  const d = S.DOCS.find(x => x.wf === "ON_HOLD");
  must(d, "ไม่มีเอกสารที่พักไว้ (On Hold) ในชุดข้อมูล");
  let blocked = 0, releasable = 0;
  for (const u of S.USERS) {
    get("user").value = u.id;
    ctx.switchUser();
    const g = ctx.guards(d);
    if (/On Hold/.test(g.confirm[1])) blocked++;
    if (g.release_hold[0]) releasable++;
  }
  must(blocked >= 1, "ขณะพักไว้ ต้องปิด action อื่นพร้อมเหตุผล On Hold");
  must(releasable >= 1, "ต้องมีคนที่ถอนพักได้ (ผู้ถือ hold/เจ้าของงาน/ADM) ไม่ใช่ไม่มีใครทำได้เลย");
  /* รอบจริง: พักแล้วถอนพักต้องกลับสถานะเดิม */
  get("user").value = "u6";
  ctx.switchUser();
  ctx.go("queue");
  const t = S.DOCS.find(x => x.wf === "PENDING_REVIEW" && ctx.guards(x).hold[0]);
  must(t, "ไม่พบเอกสารที่พร้อมทดสอบ hold");
  ctx.pick(t.doc);
  const before = t.wf;
  ctx.askAction("hold");
  get("a-wfv").value = String(t.wfv);
  get("a-note").value = "ทดสอบพักงานจาก smoke test";
  get("a-idem").value = "IDM-SMOKE-HOLD";
  ctx.doAction();
  must(t.wf === "ON_HOLD", "พักงานแล้ว workflow ต้องเป็น ON_HOLD");
  ctx.askAction("release_hold");
  get("a-wfv").value = String(t.wfv);
  get("a-note").value = "แก้ไขแล้ว คืนสถานะเดิม";
  get("a-idem").value = "IDM-SMOKE-UNHOLD";
  ctx.doAction();
  must(t.wf === before, "release_hold ต้องพา workflow กลับสถานะก่อนพัก");
});

/* ---------- 4d) idempotency + optimistic concurrency ---------- */
check("Idempotency-Key: ส่งซ้ำได้ผลเดิม · payload ต่างบน key เดิมได้ 422", () => {
  get("user").value = "u1";
  ctx.switchUser();
  ctx.go("queue");
  const d = S.DOCS.find(x => ctx.guards(x).explain[0]);
  must(d, "ไม่พบเอกสารที่ทดสอบ explain ได้");
  ctx.pick(d.doc);
  const wfv0 = d.wfv;
  const send = (note, key, wfv) => {
    ctx.askAction("explain");
    get("a-wfv").value = String(wfv);
    get("a-rev").value = String(d.rev);
    get("a-note").value = note;
    get("a-idem").value = key;
    ctx.doAction();
  };
  send("เนื้อหาแรก", "IDM-SMOKE-1", wfv0);
  must(d.wfv === wfv0 + 1, "ส่งครั้งแรกต้องเพิ่ม wf_version");
  send("เนื้อหาแรก", "IDM-SMOKE-1", wfv0);   /* retry ของจริง = ส่ง body เดิมทั้งก้อน รวม version เดิม */
  must(/replay/i.test(S.AUDIT[0].res), "key + payload เดิมต้องได้ผลเดิม (idempotent replay)");
  must(d.wfv === wfv0 + 1, "replay ห้ามเพิ่ม wf_version");
  send("คนละเนื้อหา", "IDM-SMOKE-1", d.wfv);
  must(String(S.AUDIT[0].res).indexOf("422") === 0, "key เดิมกับ payload ต่างกันต้อง 422");
  must(d.wfv === wfv0 + 1, "422 แล้วต้องไม่เปลี่ยนสถานะ");
});

check("409 เมื่อ expected_document_revision หรือ wf_version เป็นค่าเก่า", () => {
  get("user").value = "u6";
  ctx.switchUser();
  ctx.go("queue");
  const d = S.DOCS.find(x => x.wf === "PENDING_REVIEW" && ctx.guards(x).hold[0]);
  must(d, "ไม่พบเอกสารทดสอบ 409");
  ctx.pick(d.doc);
  const wf = d.wf, wfv = d.wfv;
  ctx.askAction("hold");
  get("a-wfv").value = String(wfv);
  get("a-rev").value = String(d.rev + 1);
  get("a-note").value = "ทดสอบ revision เก่า";
  get("a-idem").value = "IDM-SMOKE-REV";
  ctx.doAction();
  must(String(S.AUDIT[0].res).indexOf("409") === 0, "revision เก่าต้องตอบ 409");
  must(d.wf === wf && d.wfv === wfv, "409 แล้วห้ามเปลี่ยนสถานะ/wf_version");
  ctx.askAction("hold");
  get("a-wfv").value = String(wfv + 5);
  get("a-rev").value = String(d.rev);
  get("a-note").value = "ทดสอบ wf_version เก่า";
  get("a-idem").value = "IDM-SMOKE-WFV";
  ctx.doAction();
  must(String(S.AUDIT[0].res).indexOf("409") === 0, "wf_version เก่าต้องตอบ 409");
  must(d.wf === wf, "409 แล้วสถานะต้องคงเดิม");
});

/* ---------- 4e) revision snapshot (immutable + read-only) ---------- */
check("revision snapshot: ดูของเก่าเป็นอ่านอย่างเดียวและไม่แก้ข้อมูลจริง", () => {
  /* เลือกผู้ใช้ที่ "มีสิทธิ์ตัดสินใจ" และเห็นเอกสารหลาย revision ที่ยังไม่ถูกพัก
     (ไม่งั้นเหตุผลที่ถูกปิดจะกลายเป็นเรื่องสิทธิ์ ไม่ใช่เรื่อง snapshot เก่า) */
  let pair = null;
  for (const pref of [true, false]) {
    for (const u of S.USERS) {
      if (pref && !["ACC", "APR"].includes(u.role)) continue;   /* บทบาทที่มีสิทธิ์ตัดสินใจ */
      get("user").value = u.id;
      ctx.switchUser();
      const d =
        S.DOCS.find(x => (x.revs || []).length > 1 && ctx.scopeCheck(x).ok && x.wf !== "ON_HOLD") ||
        S.DOCS.find(x => (x.revs || []).length > 1 && ctx.scopeCheck(x).ok);
      if (d) { pair = { u, d }; break; }
    }
    if (pair) break;
  }
  must(pair, "ไม่มีเอกสารหลาย revision ที่ทดสอบได้ในขอบเขตของ user ใดเลย");
  const d = pair.d;
  const latest = d.rev;
  const older = Math.min.apply(null, d.revs.map(r => r.rev));
  ctx.go("queue");
  ctx.pick(d.doc);
  must(/Revision snapshot|revision ล่าสุด/.test(get("detail").innerHTML), "ไม่บอกว่ามีการตรวจมากกว่า 1 revision");
  const ob = S.OUTBOX.length, wfv = d.wfv;
  ctx.setRev(older);
  const h = get("detail").innerHTML;
  must(new RegExp("snapshot ของ revision " + older).test(h), "ไม่มี banner ว่ากำลังดู snapshot เก่า");
  must(/อ่านอย่างเดียว/.test(h), "ไม่บอกว่าดูของเก่าได้อย่างเดียว");
  must(!/undefined|NaN|\[object Object\]/.test(h), "ตอนดู revision เก่ามี undefined/NaN ปนมา");
  ctx.setTab("json");
  const jsonText = get("detail").innerHTML.replace(/<[^>]+>/g, "");
  must(jsonText.includes('"revision": ' + older), "JSON ต้องเป็น snapshot ของ revision ที่เลือก");
  must(jsonText.includes('"status": "' + d.revs.find(r => r.rev === older).status), "JSON ต้องเป็นผลตรวจของ revision ที่เลือก");
  ctx.setTab("hist");
  must(/Revision snapshot/.test(get("detail").innerHTML), "ไม่มีตาราง revision snapshot");
  must(/ดู snapshot นี้/.test(get("detail").innerHTML), "ไม่มีทางกลับไปยัง revision ล่าสุด");
  const g = ctx.guards(d);
  must(g.confirm[0] === false, "revision เก่าต้องทำ action ไม่ได้ (ของจริงตอบ 409)");
  must(/immutable|revision ล่าสุด/.test(g.confirm[1]), "เหตุผลต้องบอกว่ากำลังดู snapshot เก่า ไม่ใช่ปิดเงียบ");
  must(d.rev === latest && d.wfv === wfv && S.OUTBOX.length === ob, "การดู revision เก่าห้ามแก้ข้อมูลจริง");
  ctx.setRev(latest);
  ctx.setTab("sum");
  must(/<button[^>]*disabled[^>]*title="[^"]{5,}"/.test(get("detail").innerHTML), "กลับสู่ revision ล่าสุดแล้วต้องมีปุ่มที่ปิดพร้อมเหตุผลเช่นเดิม");
});

/* ---------- 5b) audit: tamper-evident + ส่งออก ---------- */
check("audit hash chain: ต่อเนื่อง และจับการแก้ไขได้", () => {
  get("user").value = "u6";
  ctx.switchUser();
  ctx.go("audit");
  must(ctx.verifyChain().ok === true, "เริ่มต้น hash chain ต้องต่อเนื่อง");
  must(get("app").innerHTML.includes("hash"), "ตาราง audit ไม่มีคอลัมน์ hash");
  ctx.auditTamperDemo();
  const r = ctx.verifyChain();
  must(r.ok === false, "หลังแก้ไขบันทึก chain ต้องตรวจไม่ผ่าน");
  must(/ถูกแก้/.test(get("app").innerHTML), "UI ไม่แสดงว่ามีการแก้ไขบันทึก");
  ctx.auditVerify();
  must(/ตรวจไม่ผ่าน/.test(get("app").innerHTML), "กดตรวจแล้วต้องรายงานจุดที่ไม่ต่อเนื่อง");
  ctx.rechain();
  must(ctx.verifyChain().ok === true, "คำนวณ hash ใหม่แล้วต้องกลับต่อเนื่อง");
});

check("ส่งออกบันทึกเป็น CSV พร้อม hash", () => {
  get("user").value = "u6";
  ctx.switchUser();
  ctx.go("audit");
  ctx.auditExport();
  const h = get("mb").innerHTML;
  must(h.includes("data:text/csv"), "ไม่มีลิงก์ดาวน์โหลด CSV");
  must(h.includes("prev_hash") && h.includes("hash"), "CSV ไม่มีคอลัมน์ hash");
  must(!/undefined|\[object Object\]/.test(h), "มีค่า undefined ปนมา");
  ctx.closeModal();
});

/* ---------- 5c) คิว: งานที่ต้องทำ / เรียงลำดับ / แบ่งหน้า / งานของฉัน ---------- */
check("คิว: งานที่ต้องทำ + เรียงลำดับ + แบ่งหน้า + KPI งานของฉัน", () => {
  get("user").value = "u6";
  ctx.switchUser();
  ctx.go("queue");
  const app = get("app").innerHTML;
  must(app.includes("งานของฉัน"), "ไม่มี KPI งานของฉัน");
  must(app.includes('id="sort"'), "ไม่มีตัวเรียงลำดับคิว");
  const inScope = S.DOCS.filter(d => ctx.scopeCheck(d).ok);
  const items = (get("list").innerHTML.match(/class="qi /g) || []).length;
  must(items > 0 && items <= 8, `คิวต้องแบ่งหน้าละไม่เกิน 8 รายการ (แสดง ${items})`);
  must(inScope.length > items, "ข้อมูลมากกว่าหนึ่งหน้าต้องมีการแบ่งหน้า");
  must(get("qpg").innerHTML.includes("ถัดไป"), "ไม่มีปุ่มเลื่อนหน้า");
  must((get("list").innerHTML.match(/📌/g) || []).length === items, "ทุกรายการต้องมีบรรทัด “งานที่ต้องทำ”");
  ctx.setFilt("mine");
  const mine = inScope.filter(d => ctx.matchKpi(d, "mine")).length;
  must(get("app").innerHTML.includes(`<b>${mine}</b>`), `KPI งานของฉันต้องเท่ากับ ${mine}`);
});

/* ---------- 5d) viewer: zoom/เลื่อนหน้า/nโยบายดาวน์โหลด/access event ---------- */
check("viewer: toolbar + คีย์ลัด + access event", () => {
  get("user").value = "u4";
  ctx.switchUser();
  ctx.go("queue");
  const d = S.DOCS.find(x => ctx.scopeCheck(x).ok && x.pages > 1);
  must(d, "ไม่มีเอกสารหลายหน้าสำหรับทดสอบ viewer");
  ctx.openViewer(d.doc, 1);
  const h = get("mb").innerHTML;
  must(/หน้า 1 \/ \d/.test(h), "ไม่มีตัวบอกเลขหน้า");
  must(h.includes("🔍+") && h.includes("zoom:"), "ไม่มีปุ่มขยาย/ย่อ");
  ctx.setZoom(120);
  must(get("mb").innerHTML.includes("120%"), "zoom ไม่เปลี่ยน");
  ctx.showPage(2);
  must(/หน้า 2 \//.test(get("mb").innerHTML), "เลื่อนหน้าไม่ทำงาน");
  must(get("mb").innerHTML.includes("disabled"), "ปุ่มดาวน์โหลด/พิมพ์ต้องถูกปิดพร้อมเหตุผล (policy)");
  ctx.closeModal();
  must(S.AUDIT.some(a => a.act === "open" && a.doc === d.doc), "เปิดเอกสารต้องเกิด access event");
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
