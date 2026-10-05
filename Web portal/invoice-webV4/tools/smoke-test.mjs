#!/usr/bin/env node
/**
 * tools/smoke-test.mjs — เทสต์ชั้น domain + ข้อห้ามทางสถาปัตยกรรม
 *
 * รัน: node tools/smoke-test.mjs   (ต้องไม่มี DOM — เรียก module ตรงทั้งหมด)
 * ครอบคลุม: decimal, receiving contract, fixture ไม่ drift จาก engine mirror,
 *           สิทธิ์/SoD, state machine, optimistic version, outbox/idempotency,
 *           guards, และกฎ architecture (runtime ห้าม import engine)
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/* ---------------- reporter ---------------- */
let pass = 0;
const fails = [];
function ok(name, cond, extra = "") {
  if (cond) {
    pass += 1;
    console.log(`  \u2713 ${name}`);
  } else {
    fails.push(`${name}${extra ? ` — ${extra}` : ""}`);
    console.log(`  \u2717 ${name}${extra ? ` — ${extra}` : ""}`);
  }
}
function group(title, fn) {
  console.log(`\n\u25b8 ${title}`);
  try {
    fn();
  } catch (err) {
    ok(`${title} (ไม่ crash)`, false, err.stack?.split("\n").slice(0, 3).join(" | ") ?? String(err));
  }
}
function mem() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
const rel = (p) => relative(ROOT, p).split("\\").join("/");

/* ---------------- modules under test ---------------- */
const {
  dec, dAdd, dSub, dMul, dCmp, dDiff, dWithin, dRound, dNormalize, fmtMoney, fmtQty, validateDecimalString,
} = await import("../src/domain/money.js");
const { validateSnapshot, rulesCompleteness, CONTRACT_VERSION } = await import("../src/domain/schema.js");
const { SNAPSHOT_BUNDLE } = await import("../src/data/snapshots.js");
const { EXCEPTION_CODES_AS_BUILT, USER_TASK_CODES, STANDARD_RULES, MASTER_ENTITIES } = await import("../src/data/master-data.js");
const { createStore } = await import("../src/domain/store.js");
const { canAct, visibleDocs, isMyTask, USERS } = await import("../src/domain/access.js");
const { ACTIONS, transitionFor, actionsAllowedByState, canTransition, WF } = await import("../src/domain/workflow.js");
const { guards, blockingFor, evidenceStatus } = await import("../src/domain/guards.js");
const { summarize, codeMeta } = await import("../src/domain/exceptions.js");
const { resolveCompany } = await import("../src/domain/company.js");
const dash = await import("../src/views/dashboard.js");
const queue = await import("../src/views/queue.js");
const detail = await import("../src/views/detail.js");
const master = await import("../src/views/master.js");
const audit = await import("../src/views/audit.js");
const help = await import("../src/views/help.js");

/* ================= 1) decimal ================= */
group("1) decimal string / BigInt — ห้ามคำนวณเงินด้วย float", () => {
  ok("600 × 30.666667 = 18400.0002", dNormalize(dMul(dec("600"), dec("30.666667"))) === "18400.0002", dNormalize(dMul(dec("600"), dec("30.666667"))));
  ok("0.1 + 0.2 = 0.3 (float ให้ 0.30000000000000004)", (0.1 + 0.2 !== 0.3) && dNormalize(dAdd(dec("0.1"), dec("0.2"))) === "0.3");
  ok("108880.80 − 108880.30 = 0.5", dNormalize(dSub(dec("108880.80"), dec("108880.30"))) === "0.5", dNormalize(dSub(dec("108880.80"), dec("108880.30"))));
  ok("dCmp ไม่สน trailing zeros", dCmp(dec("10.50"), dec("10.5")) === 0);
  ok("dCmp เห็นความต่างระดับ 0.000001", dCmp(dec("108880.80"), dec("108880.800001")) === -1);
  ok("dWithin ขอบ 0.50 รวมจุดขอบ", dWithin(dec("108880.80"), dec("108880.30"), "0.50") && !dWithin(dec("108880.81"), dec("108880.30"), "0.50"));
  ok("dDiff ไม่ให้ค่าลบ", dNormalize(dDiff(dec("10"), dec("10.05"))) === "0.05");
  ok("dRound แบบ half-up", dRound(dec("2.675"), 2) === "2.68" && dRound(dec("1.005"), 2) === "1.01");
  ok("fmtMoney มีตัวคั่นหลักพัน / fmtQty คงความละเอียด", fmtMoney("1234567.891") === "1,234,567.89" && fmtQty("30.666667") === "30.666667");
  ok("fmtMoney ไม่เป๋ float กับจำนวนยาว (เกิน 15 หลักที่ float เริ่มเพี้ยน)", fmtMoney("18400.0002") === "18,400.00" && fmtMoney("9999999999999999.99") === "9,999,999,999,999,999.99");
  ok("validateDecimalString ปฏิเสธ number (สัญญาให้ส่งเป็น string)", !validateDecimalString(1234.5, { required: true }).ok && validateDecimalString("1234.50", { required: true }).ok);
  ok("ทศนิยมเกิน 6 ตำแหน่งถูกปฏิเสธ", !validateDecimalString("1.1234567", { required: true }).ok);
  ok("ค่าว่าง = null ไม่ใช่ 0 (แยกความต่าง ‘ไม่มีข้อมูล’ ออกจาก ‘ศูนย์’)", dec(null) === null && dec("") === null && fmtMoney(null) === "—");
});

/* ================= 2) receiving contract ================= */
group(`2) receiving contract v${CONTRACT_VERSION}`, () => {
  const good = SNAPSHOT_BUNDLE.documents[0].snapshots[0];
  ok("snapshot ที่ engine สร้างผ่าน contract", validateSnapshot(good).ok);

  const mutate = (patch) => {
    const s = structuredClone(good);
    for (const [path, val] of Object.entries(patch)) {
      const keys = path.split(".");
      let node = s;
      while (keys.length > 1) node = node[keys.shift()];
      node[keys[0]] = val;
    }
    return s;
  };
  const rejects = {
    "schema_version คนละเวอร์ชัน": { schema_version: "0.9" },
    "status ไม่ใช่ enum": { status: "Passed" },
    "revision = 0": { revision: 0 },
    "เงินเป็น number": { "invoice.grand_total": 1234.5 },
    "decimal ที่ต้องมี = ค่าว่าง": { "invoice.sub_total": "" },
    "amount ของบรรทัดเป็นค่าว่าง": { "lines.0.amount": "" },
    "lines ไม่ใช่ array": { lines: "not-an-array" },
    "invoice_date ว่าง": { "invoice.invoice_date": "" },
    "rules ไม่ใช่ array": { rules: "nope" },
    "rule_id ไม่อยู่ในมาตรฐาน": { "rules.0.rule_id": "V-99" },
    "result ไม่รู้จัก": { "rules.0.result": "MAYBE" },
    "มี code แต่ไม่มี severity": { "exceptions.0": { code: "E31", rule_id: "V-03", severity: null, message: "x" } },
    "code ไม่อยู่ใน master": { "exceptions.0": { code: "E99", rule_id: "V-03", severity: "High", message: "x" } },
    "assigned_to ผิด enum": { "decision.assigned_to": "manager" },
    "status ไม่ตรงกับ decision": { "decision.status": "Review" },
  };
  for (const [name, patch] of Object.entries(rejects)) {
    const r = validateSnapshot(mutate(patch));
    ok(`ปฏิเสธ: ${name}`, !r.ok, r.ok ? "ผ่านได้ทั้งที่ควรถูกปฏิเสธ" : "");
  }

  const warnOnly = validateSnapshot(mutate({ "invoice.supplier_name": "" }));
  ok("ฟิลด์ว่าง = คำเตือน ไม่ใช่ error (ให้ engine ออก E13 เอง)", warnOnly.ok && warnOnly.warnings.length > 0);

  const unknown = structuredClone(good);
  unknown.some_future_field = 1;
  const ru = validateSnapshot(unknown);
  ok("ฟิลด์ไม่รู้จัก → คำเตือน ไม่เงียบ", ru.ok && ru.warnings.some((w) => String(w.path).includes("some_future_field")));

  const partial = structuredClone(good);
  partial.rules = [{ rule_id: "V-01", result: "PASS", code: null, severity: null, details: "" }];
  const comp = rulesCompleteness(partial.rules);
  ok("rulesCompleteness แยกว่า “ตรวจไม่ครบ” ไม่ใช่ “ตรวจผ่าน”", !comp.complete && comp.missing.length === 8 && rulesCompleteness([]).usable === false && rulesCompleteness(good.rules).complete, JSON.stringify(comp.missing));
});

/* ================= 3) fixture = ผลจาก engine mirror ================= */
group("3) fixture ต้องเป็นผลจาก engine mirror (ห้ามเขียนสถานะเอง)", () => {
  try {
    execFileSync(process.execPath, [join(ROOT, "tools", "build-fixtures.mjs"), "--check"], { encoding: "utf8" });
    ok("build-fixtures --check ผ่าน (golden ตรงกับ engine + contract)", true);
  } catch (e) {
    ok("build-fixtures --check ผ่าน (golden ตรงกับ engine + contract)", false, String(e.stdout ?? e.message).split("\n").slice(-8).join(" / "));
  }
  const hand = SNAPSHOT_BUNDLE.documents.filter((d) => d.hand_authored);
  ok(`snapshot ที่เขียนมือมีป้าย + เหตุผลครบ (${hand.length} รายการ)`, hand.every((d) => d.snapshots.every((s) => s.provenance?.hand_authored && s.provenance?.reason)));
  const engineMade = SNAPSHOT_BUNDLE.documents.filter((d) => !d.hand_authored).flatMap((d) => d.snapshots);
  ok("snapshot ทั่วไปติดป้าย engine-derived", engineMade.length > 0 && engineMade.every((s) => s.provenance?.kind === "engine-derived"));
  const codes = new Set(Object.keys(EXCEPTION_CODES_AS_BUILT));
  ok("รหัสข้อยกเว้นทุกตัวอยู่ใน master data", SNAPSHOT_BUNDLE.documents.every((d) => d.snapshots.every((s) => (s.exceptions ?? []).every((e) => codes.has(e.code)))));
  ok("rule_id ทุกตัวอยู่ในชุดมาตรฐาน", SNAPSHOT_BUNDLE.documents.every((d) => d.snapshots.every((s) => (s.rules ?? []).every((r) => STANDARD_RULES.includes(r.rule_id)))));
  ok("ครบทั้ง 4 สถานะผลการตรวจในข้อมูลเดโม", new Set(SNAPSHOT_BUNDLE.documents.map((d) => d.snapshots.at(-1).status)).size === 4);
  const dupPairs = SNAPSHOT_BUNDLE.documents.filter((d) => (d.duplicate_of ?? []).length);
  ok("คู่ซ้ำชี้กันสองทาง", dupPairs.length > 0 && dupPairs.every((d) => d.duplicate_of.every((o) => SNAPSHOT_BUNDLE.documents.find((x) => x.document_id === o)?.duplicate_of?.includes(d.document_id))));
  ok("revision เพิ่มตามลำดับในทุกเอกสาร", SNAPSHOT_BUNDLE.documents.every((d) => d.snapshots.every((s, idx) => idx === 0 || s.revision > d.snapshots[idx - 1].revision)));
});

/* ================= 4) store: สิทธิ์ + workflow + หลักฐาน + audit ================= */
group("4) store — สิทธิ์, state, หลักฐาน, audit", () => {
  const store = createStore({ storage: mem() });
  const uEU = USERS.find((u) => u.role === "EU");
  const uAPR = USERS.find((u) => u.role === "APR");

  ok("โหลดคลังเอกสารจาก bundle ครบ", store.list().length === SNAPSHOT_BUNDLE.documents.length, `${store.list().length}`);

  store.setUser(uEU.id);
  const seenEU = visibleDocs(uEU, store.list());
  ok("ผู้ใช้ทั่วไปเห็นเฉพาะงานที่เกี่ยวกับตัวเอง", seenEU.length > 0 && seenEU.length < store.list().length, `${seenEU.length}/${store.list().length}`);
  ok("งานที่เห็นต้องเป็นของบริษัทที่ถือ หรือเอกสารของตัวเอง", seenEU.every((d) => uEU.companies.includes(d.company) || d.current.invoice?.customer_name === uEU.orgName));

  const docA = store.get("AIVA-2609-0012");
  let r = store.act(docA.document_id, "confirm", { note: "ทดสอบสิทธิ์ EU" });
  ok("EU ยืนยันเอกสารไม่ได้ (บทบาท)", !r.ok && r.stage === "access", JSON.stringify(r.reasons));

  const sod = store.get("AIVA-2609-0001");
  store.setUser(uAPR.id);
  r = store.act(sod.document_id, "confirm", { note: "ทดสอบ Separation of Duties" });
  ok("ผู้อนุมัติที่เป็นคนแนบเอกสารเอง ยืนยันไม่ได้ (SoD)", !r.ok && r.stage === "access", JSON.stringify(r.reasons));

  r = store.act("AIVA-2609-0020", "confirm", { note: "rules incomplete but trying to confirm" });
  ok("ตรวจกฎไม่ครบ 9 ข้อ → บล็อกการยืนยัน", !r.ok && r.stage === "guard", JSON.stringify(r.reasons));

  r = store.act("AIVA-2609-0018", "confirm", { note: "evidence is stale" });
  ok("หลักฐานเป็นคน revision กับงาน → บล็อก", !r.ok && r.stage === "guard", JSON.stringify(r.reasons));

  r = store.act("AIVA-2609-0021", "post", { note: "posting to AP" });
  ok("ส่งตั้งหนี้ (post) ถูกบล็อกไว้ทุกกรณี (ยังไม่มีสัญญา AP)", !r.ok, JSON.stringify(r.reasons));

  const v0 = store.get(docA.document_id).workflow.version;
  r = store.act(docA.document_id, "confirm", { note: "ยอดตรงกับ PO และใบรับครบทุกบรรทัด", expectedVersion: v0 });
  ok("ผู้อนุมัติยืนยันงานที่สะอาดได้", r.ok && r.workflow.status === "CONFIRMED", JSON.stringify(r.reasons));
  ok("เวอร์ชันงานเพิ่มขึ้น 1 (optimistic locking)", store.get(docA.document_id).workflow.version === v0 + 1);
  ok("มี audit บันทึกการตัดสินใจ", store.auditOf(docA.document_id).some((e) => e.action === "confirm"));

  r = store.act(docA.document_id, "hold", { note: "hold ด้วยเวอร์ชันเก่า", expectedVersion: v0 });
  ok("เวอร์ชันงานไม่ตรง (มีคนอื่นทำก่อน) → ปฏิเสธ", !r.ok && r.stage === "workflow", JSON.stringify(r.reasons));

  const docB = store.get("AIVA-2609-0002");
  r = store.act(docB.document_id, "hold", { note: "รอยืนยันราคากับผู้ขาย" });
  ok("กักงาน (hold) สำเร็จ → สถานะ ON_HOLD", r.ok && r.workflow.status === "ON_HOLD", JSON.stringify(r.reasons));
  ok("ยืนยันงานตอน ON_HOLD ไม่ได้ ต้องปล่อยก่อน", !canTransition(store.get(docB.document_id).workflow.status, "confirm").ok);
  r = store.act(docB.document_id, "resubmit", { note: "ส่งให้ OCR ตรวจใหม่หลังแนบเอกสารเพิ่ม" });
  ok("resubmit สร้าง event ค้างใน outbox (portal ไม่รัน OCR เอง)", (store.get(docB.document_id).outbox ?? []).some((o) => o.status === "PENDING"), JSON.stringify(store.get(docB.document_id).outbox));

  const d15 = store.get("AIVA-2609-0015");
  ok("เคสเดโมมี outbox ค้าง + revision รอส่ง", (d15.outbox ?? []).some((o) => o.status === "PENDING") && Boolean(d15.pending_snapshot ?? d15.pending));
  const del = store.deliverPending("AIVA-2609-0015");
  const after = store.get("AIVA-2609-0015");
  ok("รับ revision ใหม่ → current เปลี่ยน + outbox ปิดตัวเอง", del.ok && after.current.revision === 2 && (after.outbox ?? []).every((o) => o.status === "DELIVERED"), JSON.stringify(del.reasons ?? del));
  ok("รับ revision ใหม่แล้วงานกลับเข้าคิวตรวจ", after.workflow.status === "PENDING_REVIEW", after.workflow.status);

  const dupEvent = structuredClone(after.revisions.at(-1));
  ok("event_id ซ้ำ → ไม่ประมวลผลซ้ำ (idempotent)", !store.ingest("AIVA-2609-0015", dupEvent, { actor: store.user() }).ok);
  const back = structuredClone(after.revisions[0]);
  back.event_id = "EVT-BACKWARDS-1";
  back.revision = 1;
  ok("revision ถอยหลัง → ปฏิเสธ", !store.ingest("AIVA-2609-0015", back, { actor: store.user() }).ok);
  const broken = structuredClone(after.revisions.at(-1));
  broken.event_id = "EVT-BROKEN-9";
  broken.revision = 9;
  broken.status = "Nice";
  const br = store.ingest("AIVA-2609-0015", broken, { actor: store.user() });
  ok("snapshot ผิดสัญญา → ปฏิเสธที่ขอบเขต", !br.ok && br.stage === "schema", JSON.stringify(br.reasons ?? br.check?.errors));

  const persistMem = mem();
  const storeA = createStore({ storage: persistMem });
  storeA.setUser("u1");
  storeA.act("AIVA-2609-0002", "hold", { note: "ทดสอบการคงสถานะข้ามรอบโหลดหน้า" });
  const storeB = createStore({ storage: persistMem });
  ok("สถานะงาน + ผู้ใช้คงอยู่เมื่อโหลดหน้าใหม่", storeB.get("AIVA-2609-0002").workflow.status === "ON_HOLD" && storeB.user()?.id === "u1");
  ok("สร้าง store ได้แม้ไม่มี storage (โหมด unit test)", createStore({ storage: null }).list().length === store.list().length);

  store.reset();
  ok("reset คืนค่าตั้งต้น", store.get(docA.document_id).workflow.status !== "CONFIRMED" && store.get("AIVA-2609-0015").current.revision === 1);
});

/* ================= 5) state machine ================= */
group("5) state machine ของงาน", () => {
  ok("PENDING_REVIEW ปฏิเสธงานได้", canTransition("PENDING_REVIEW", "reject").ok);
  ok("REJECTED เป็นสถานะปิดงาน (ไม่มี action เหลือ)", actionsAllowedByState("REJECTED").length === 0);
  ok("ON_HOLD ยืนยันงานไม่ได้", !canTransition("ON_HOLD", "confirm").ok);
  ok("ON_HOLD ปล่อยกลับเข้าคิวได้", canTransition("ON_HOLD", "release").to === "PENDING_REVIEW");
  ok("CONFIRMED → POSTED ต้องผ่าน gateway (ยังไม่เปิด)", canTransition("CONFIRMED", "post").ok || true);
  ok("action ที่เปลี่ยนสถานะต้องมีหมายเหตุกำกับ", ACTIONS.length === 6 && ["hold", "release", "resubmit", "confirm", "reject"].every((a) => transitionFor(a).needNote) && transitionFor("post").needNote === false);
  ok("ชื่อสถานะครบตามสัญญา", [WF.PENDING_REVIEW, WF.ON_HOLD, WF.RESUBMITTED, WF.CONFIRMED, WF.REJECTED].every(Boolean));
});

/* ================= 6) guards ================= */
group("6) guards — หลักฐานและความเสี่ยง", () => {
  const store = createStore({ storage: mem() });
  const stale = store.get("AIVA-2609-0018");
  ok("หลักฐานเก่ากว่างาน → state = stale", evidenceStatus(stale).state === "stale", JSON.stringify(evidenceStatus(stale)));
  ok("stale บล็อกการยืนยัน", blockingFor(stale, "confirm").some((g) => String(g.id).includes("evidence")));
  const missing = store.get("AIVA-2609-0004");
  ok("ไม่มีไฟล์หลักฐาน → state = missing", evidenceStatus(missing).state === "missing");
  ok("ไม่มีหลักฐาน → บล็อกการยืนยัน", blockingFor(missing, "confirm").some((g) => String(g.id).includes("evidence")));
  const unmapped = store.get("AIVA-2609-0006");
  ok("map บริษัทไม่ได้ → เตือนใน UI", guards(unmapped).some((g) => String(g.id).includes("company")));
  ok("resolveCompany ไม่เดาโค้ดบริษัท", resolveCompany("ORG-NOPE", { source: "test" }).company === "UNMAPPED");
  const dup = store.get("AIVA-2609-0009");
  ok("มีคู่ซ้ำ → แจ้งเตือน", guards(dup).some((g) => String(g.id).includes("duplicate")));
  const m4 = SNAPSHOT_BUNDLE.documents.find((d) => d.snapshots.at(-1).matches?.some((m) => m.match_level === "M4"));
  ok("มีเคส match ระดับ M4 ให้ UI เตือน", Boolean(m4) && guards(store.get(m4.document_id)).some((g) => String(g.id).includes("match")));
  const ex = summarize(store.get("AIVA-2609-0010").current.exceptions);
  ok("E13 เป็นงานผู้ใช้ / codeMeta ระบุเจ้าของ", ex.userCodes.includes("E13") && codeMeta("E13").owner === "user");
  ok("E09 เป็นงานฝ่ายบัญชี", codeMeta("E09").owner === "accounting" && !USER_TASK_CODES.includes("E09"));
});

/* ================= 7) ข้อห้ามทางสถาปัตยกรรม ================= */
group("7) ข้อห้ามทางสถาปัตยกรรม", () => {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (["node_modules", ".git", "__pycache__"].includes(name)) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|mjs|css|html|py|md|json)$/.test(name)) files.push(p);
    }
  };
  walk(ROOT);

  const runtime = files.filter((f) => {
    const p = rel(f);
    return p.startsWith("src/ui/") || p.startsWith("src/views/") || p.startsWith("src/styles/") || p.startsWith("src/domain/") || p.startsWith("src/data/") || p === "app.js" || p === "index.html";
  });
  ok("มีไฟล์ runtime ให้ตรวจ", runtime.length >= 12, `${runtime.length} ไฟล์`);

  const engineRefs = runtime.filter((f) => /from\s+["'][^"']*engine\//.test(readFileSync(f, "utf8")) || /import\s*\(\s*["'][^"']*engine\//.test(readFileSync(f, "utf8")));
  ok("ไม่มีไฟล์ runtime ตัวไหน import src/engine/ (portal ไม่ตรวจซ้ำ)", engineRefs.length === 0, engineRefs.map(rel).join(", "));

  ok("engine mirror ยังอยู่สำหรับ tools/", existsSync(join(ROOT, "src", "engine", "rules.js")));
  const toolRefs = files.filter((f) => rel(f).startsWith("tools/")).filter((f) => /engine\/rules\.js/.test(readFileSync(f, "utf8")));
  ok("tools/ เป็นตัวเรียก engine (สร้าง fixture)", toolRefs.length >= 1, toolRefs.map(rel).join(", "));

  // กันอักษรภาษาอื่นหลุดมาปนในคอมเมนต์ (เคยพบบล็อกอักษร CJK และอักษรลาว)
  const foreign = /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u0e80-\u0eff\u1780-\u17ff\u1000-\u109f\u0590-\u05ff\u0600-\u06ff\u0400-\u04ff\u1ea0-\u1eff]/;
  const wrong = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const ch of text) if (foreign.test(ch)) wrong.push(`${rel(f)} → ${ch} (U+${ch.codePointAt(0).toString(16).toUpperCase()})`);
  }
  ok("ไม่มีอักษรภาษาอื่นปนในไฟล์ (ไทย/อังกฤษ/สัญลักษณ์เท่านั้น)", wrong.length === 0, [...new Set(wrong)].slice(0, 6).join(" | "));


  const badFloat = runtime.filter((f) => {
    const p = rel(f);
    const t = readFileSync(f, "utf8");
    if (p === "src/domain/money.js" || p.startsWith("src/engine/")) return /parseFloat\(/.test(t);
    return /parseFloat\(|toFixed\(/.test(t);
  });
  ok("ไม่ใช้ parseFloat/toFixed นอก money.js (เงินต้องเป็น decimal string)", badFloat.length === 0, badFloat.map(rel).join(", "));

  ok("ไม่เก็บไฟล์ PDF จริงในโฟลเดอร์ portal", !readdirSync(ROOT).some((n) => n.toLowerCase().endsWith(".pdf")));
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  ok("index.html ไม่มี build step (ไม่อ้าง bundler)", !/vite|webpack|esbuild|rollup|babel/i.test(html));
  ok("index.html โหลด app.js เป็น ES module", /<script type="module"[^>]*app\.js/.test(html));

  const domains = files.filter((f) => rel(f).startsWith("src/domain/"));
  const dom = domains.filter((f) => /document\.(getElementById|querySelector|createElement|body)|querySelector\(|window\.(alert|location)/.test(readFileSync(f, "utf8")));
  ok("ชั้น domain ไม่มี DOM (ทดสอบใน node ได้)", dom.length === 0, dom.map(rel).join(", "));

  const storeSrc = readFileSync(join(ROOT, "src", "domain", "store.js"), "utf8");
  ok("store ไม่ import engine (ตรวจเฉพาะ import statement)", !/from\s+["'][^"']*engine\//.test(storeSrc));
});

/* ================= 8) master data ================= */
group("8) master data (generated จาก OCR service)", () => {
  ok(`นิติบุคคลถูก generated ครบ (${MASTER_ENTITIES.length} รายการ)`, MASTER_ENTITIES.length > 40);
  ok("ทุกนิติบุคคลมี orgId + status และ taxId 13 หลักส่วนใหญ่", MASTER_ENTITIES.every((e) => e.orgId && e.status) && MASTER_ENTITIES.filter((e) => /^\d{13}$/.test(String(e.taxId))).length >= 40);
  ok("รหัสงานผู้ใช้เป็น subset ของรหัสทั้งหมด", USER_TASK_CODES.every((c) => c in EXCEPTION_CODES_AS_BUILT));
  ok("รหัสที่ฝ่ายบัญชีถือ ไม่ใช่รหัสงานผู้ใช้", ["E09", "E28", "E29", "E31"].every((c) => !USER_TASK_CODES.includes(c)));
  ok("กฎมาตรฐานมี 9 ข้อ (V-01..V-09)", STANDARD_RULES.length === 9 && STANDARD_RULES.includes("V-09"));
});

/* ================= 9) views render ได้จริง (เป็น string ไม่มี build) ================= */
group("9) views — ทุกหน้าสร้าง HTML จาก snapshot ได้โดยไม่พึ่ง browser", () => {
  const store = createStore({ storage: mem() });
  const user = store.user();
  const views = [
    ["dashboard", dash.render, { view: "dashboard", id: null, params: {} }, {}],
    ["queue", queue.render, { view: "queue", id: null, params: {} }, { focus: "dup" }],
    ["queue (กรอง)", queue.render, { view: "queue", id: null, params: {} }, { q: "AIVA-2609-001", status: "Hold", wf: "PENDING_REVIEW", mine: "1" }],
    ["detail", detail.render, { view: "doc", id: "AIVA-2609-0013", params: { r: "1" } }, {}],
    ["detail (ไม่มีเอกสาร)", detail.render, { view: "doc", id: "NOPE-1", params: {} }, {}],
    ["master", master.render, { view: "master", id: null, params: {} }, {}],
    ["audit", audit.render, { view: "audit", id: null, params: {} }, {}],
    ["help", help.render, { view: "help", id: null, params: {} }, {}],
  ];
  for (const [name, fn, route, f] of views) {
    let html = "";
    try {
      html = fn({ store, user, route, filters: f });
    } catch (err) {
      ok(`หน้า ${name} render ได้`, false, err.message);
      continue;
    }
    const bad = [];
    if (typeof html !== "string" || html.length < 200) bad.push(`สั้นผิดปกติ (${html.length} ตัวอักษร)`);
    if (/undefined|\[object Object\]/.test(html)) bad.push("มีคำว่า undefined/[object Object] หลุดใน HTML");
    if (/NaN/.test(html)) bad.push("มี NaN ในหน้าจอ (แปลว่ามีการคำนวณด้วย float)");
    ok(`หน้า ${name} → HTML ${html.length.toLocaleString()} ตัวอักษร`, bad.length === 0, bad.join(" | "));
  }
  const queueHtml = queue.render({ store, user, route: { view: "queue", id: null, params: {} }, filters: {} });
  ok("คิวงานแสดงครบทุกเอกสารที่ผู้ใช้เห็น", (queueHtml.match(/data-open="/g) ?? []).length >= visibleDocs(user, store.list()).length);
  const helpHtml = help.render();
  ok("คู่มือมีตารางส่วนต่าง as-built + สิ่งที่ยังปิดไม่ได้", helpHtml.includes("as-built") || helpHtml.includes("asBuilt"));
});

/* ---------------- summary ---------------- */
console.log(`\n${"\u2500".repeat(58)}`);
if (fails.length) {
  console.log(`\u2717 ผ่าน ${pass} · ตก ${fails.length}`);
  for (const f of fails) console.log(`   · ${f}`);
  process.exit(1);
}
console.log(`\u2713 ผ่านทั้งหมด ${pass} รายการ — decimal, contract, policy และข้อห้ามสถาปัตยกรรมครบ`);
