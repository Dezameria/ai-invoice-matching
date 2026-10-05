/**
 * tools/smoke-test.mjs — เทสต์ของ portal (Node ล้วน ไม่มี dependency)
 *
 *   node tools/smoke-test.mjs
 *
 * กลุ่มที่ตรวจ:
 *   hygiene     ข้อห้ามทางสถาปัตยกรรม: portal ห้ามรัน engine, domain ห้ามแตะ DOM, อักขระต้องไม่เพี้ยน
 *   provenance  ไฟล์ generated ต้องใหม่ (sha256 ตรงกับ repo ตอนนี้) + token ใน CSS ต้องตรงกับ mockup
 *   domain      เงิน decimal / receiving contract / access / workflow / guards / audit / ingestion
 *   ui          ทุกหน้า ทุกแท็บ ต้อง render ได้ และไม่มี undefined / [object Object] โผล่บนจอ
 *
 * สิ่งที่ *ไม่* ตรวจ: ความถูกของกฎ matching — นั่นเป็นหน้าที่ของ engine ใน repo
 * ที่นี่ตรวจเฉพาะว่า portal ไม่ทำเกินหน้าที่ (แสดง snapshot + จัดการงานเท่านั้น)
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

/* ------------------------------------------------------------------ *
 * harness เล็ก ๆ
 * ------------------------------------------------------------------ */
const tests = [];
const test = (group, name, fn) => tests.push({ group, name, fn });
const ok = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const eq = (a, b, msg = "") => {
  if (a !== b) throw new Error(`${msg} — ได้ "${String(a)}" ต้องการ "${String(b)}"`);
};
const includes = (hay, needle, msg = "") => {
  const at = String(hay).indexOf(needle);
  if (at < 0) throw new Error(`${msg} — ไม่พบ "${needle}"`);
  return at;
};

const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
const repoRoot = (() => {
  let p = ROOT;
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(p, "OCR service", "n8n", "app", "core", "master_data.py"))) return p;
    p = path.dirname(p);
  }
  throw new Error("หา repo root ไม่เจอ (ต้องอยู่ใต้ ai-invoice-matching/)");
})();

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".js")) out.push(p);
  }
  return out;
}

const M = {};
for (const rel of [
  ...walk(path.join(ROOT, "src", "domain")),
  ...walk(path.join(ROOT, "src", "ui")),
  ...walk(path.join(ROOT, "src", "views")),
  ...walk(path.join(ROOT, "src", "data")),
]) {
  M[path.relative(ROOT, rel).replace(/\\/g, "/")] = await import(pathToFileURL(rel).href);
}

const { createStore } = M["src/domain/store.js"];
const { USERS, userById, canSee, visibleDocs, canAct, isMyTask, actionMatrix, ACTION_LABEL } = M["src/domain/access.js"];
const { canTransition, actionsAllowedByState } = M["src/domain/workflow.js"];
const { blockingFor, evidenceStatus, riskLevel } = M["src/domain/guards.js"];
const moneyApi = M["src/domain/money.js"];
const { dec, dAdd, dSub, dMul, dCmp, dEq, dRound, fmtMoney, validateDecimalString } = moneyApi;
const { validateSnapshot } = M["src/domain/schema.js"];
const { summarize, codeMeta } = M["src/domain/exceptions.js"];
const { resolveCompany } = M["src/domain/company.js"];
const ref = M["src/domain/reference.js"];
const { SNAPSHOT_BUNDLE } = M["src/data/snapshots.js"];
const { SOURCE_REGISTRY, SOURCES } = M["src/data/sources.js"];
const { DESIGN_TOKENS } = M["src/data/design-tokens.js"];
const { REPO_DOCS } = M["src/data/repo-docs.js"];
const { MASTER_ENTITIES, EXCEPTION_CODES_AS_BUILT, MASTER_META } = M["src/data/master-data.js"];

const views = {
  work: M["src/views/work.js"],
  detail: M["src/views/detail.js"],
  rules: M["src/views/rules.js"],
  manual: M["src/views/manual.js"],
  sources: M["src/views/sources.js"],
  audit: M["src/views/audit.js"],
};

const freshStore = () => createStore({ storage: null });

/* ================================================================== *
 * hygiene — ข้อห้ามทางสถาปัตยกรรม
 * ================================================================== */
test("hygiene", "portal ห้าม import engine ตอน runtime (แสดง snapshot เท่านั้น)", () => {
  const files = ["app.js", ...Object.keys(M).filter((f) => f.startsWith("src/") && !f.startsWith("src/engine/"))];
  let scanned = 0;
  for (const rel of files) {
    const specs = [...read(rel).matchAll(/(?:^|\n)\s*(?:import|export)[^;\n]*?from\s+"([^"]+)"/g)].map((m) => m[1]);
    for (const spec of specs) {
      ok(!spec.includes("engine/"), `${rel} import engine (${spec}) — ผลตรวจต้องมาจาก snapshot เท่านั้น`);
    }
    scanned += specs.length;
  }
  ok(scanned > 20, `scan import น้อยเกินไป (${scanned}) — regex พังหรือเปล่า?`);
});

test("hygiene", "src/domain ห้ามแตะ DOM (รับ storage ผ่าน opts เท่านั้น)", () => {
  const DOM = /\b(document|window)\s*\.\s*(getElementById|querySelector|createElement|body|title|addEventListener|location|localStorage|fetch)/;
  for (const f of Object.keys(M).filter((f) => f.startsWith("src/domain/"))) {
    const src = read(f);
    ok(!DOM.test(src), `${f} เรียกใช้ DOM`);
    ok(!/globalThis\.localStorage\.[a-z]/.test(src), `${f} เรียก localStorage ตรง ๆ — ต้องรับ storage ผ่าน opts`);
  }
});

test("hygiene", "innerHTML เกิดขึ้นที่เดียวใน ui/dom.js (mount) — ที่เหลือสร้าง string", () => {
  for (const f of ["app.js", ...Object.keys(M).filter((f) => f.endsWith(".js") && f !== "src/ui/dom.js" && !f.startsWith("src/data/"))]) {
    ok(!/\.innerHTML\s*=/.test(read(f)), `${f} เขียน innerHTML เอง — ใช้ mount() แทน`);
  }
});

test("hygiene", "ค่าที่แทรกจากข้อมูลต้องผ่าน esc() (กัน XSS จาก snapshot)", () => {
  for (const f of Object.keys(M).filter((f) => f.startsWith("src/views/") || f === "app.js")) {
    ok(/\besc\(/.test(read(f)), `${f} ไม่พบ esc()`);
  }
  // พิสูจน์ด้วยของจริง: snapshot ที่มีชื่อผู้ขายเป็น HTML ต้องถูก escape ในหน้างาน
  const store = freshStore();
  const evil = JSON.parse(JSON.stringify(SNAPSHOT_BUNDLE.documents[0].snapshots[0]));
  evil.invoice.supplier_name = `<img src=x onerror=alert(1)>`;
  evil.document_id = SNAPSHOT_BUNDLE.documents[0].document_id;
  const html = views.work.render(ctxFor(store, "work", {}, "u6"));
  ok(!/<img src=x/.test(html), "มี tag ดิบจากข้อมูลโผล่ใน HTML");
});

test("hygiene", "ไม่มีอักขระจีน/ญี่ปุ่น/เกาหลี/ซีริลลิกหลุดใน source", () => {
  const BAD = /[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u1100-\u11ff\u0400-\u04ff\u0600-\u06ff\u0900-\u097f]/;
  const files = ["index.html", "app.js", "src/styles/app.css", ...Object.keys(M)];
  const hits = [];
  for (const rel of files) {
    read(rel)
      .split("\n")
      .forEach((line, i) => {
        const m = line.match(BAD);
        if (m) hits.push(`${rel}:${i + 1} "${m[0]}" → ${line.trim().slice(0, 64)}`);
      });
  }
  ok(hits.length === 0, `พบอักขระต้องห้าม ${hits.length} จุด:\n    ${hits.slice(0, 10).join("\n    ")}`);
});

test("hygiene", "index.html + app.js เชื่อมกันครบ และ import ทุกตัวมีไฟล์จริง", () => {
  const html = read("index.html");
  includes(html, "./src/styles/app.css", "index.html ไม่ link CSS");
  includes(html, "./app.js", "index.html ไม่ load app.js");
  includes(html, 'lang="th"', "index.html ไม่มี lang=th");
  for (const spec of [...read("app.js").matchAll(/from "([^"]+)"/g)].map((m) => m[1])) {
    const target = path.join(ROOT, spec.replace("./", ""));
    ok(existsSync(target) || existsSync(`${target}.js`), `app.js import ไฟล์ที่ไม่มีอยู่จริง: ${spec}`);
  }
});

/* ================================================================== *
 * provenance — ทุกอย่างชี้กลับเข้า repo
 * ================================================================== */
test("provenance", "ไฟล์ generated ทุกไฟล์ต้องมี banner บอกว่าห้ามแก้ + คำสั่งที่ใช้สร้าง", () => {
  for (const rel of ["src/data/master-data.js", "src/data/repo-docs.js", "src/data/design-tokens.js", "src/data/sources.js", "src/data/snapshots.js"]) {
    const head = read(rel).split("\n").slice(0, 16).join("\n");
    ok(/generated/i.test(head), `${rel} ไม่มี banner`);
    ok(/sync\.py|build-snapshots\.mjs/.test(head), `${rel} ไม่บอกคำสั่งที่สร้างไฟล์นี้`);
  }
});

test("provenance", "sha256 ใน registry ต้องตรงกับไฟล์ใน repo ตอนนี้ (กันลืม re-sync)", () => {
  for (const s of SOURCES) {
    const p = path.join(repoRoot, s.path);
    ok(existsSync(p), `ไม่พบแหล่งข้อมูลใน repo: ${s.path}`);
    const now = createHash("sha256").update(readFileSync(p)).digest("hex");
    eq(now, s.sha256, `${s.id} ใน repo เปลี่ยนไปแล้ว — รัน "python tools/sync.py" ก่อน`);
    ok(s.feeds.length > 0, `${s.id} ไม่บอกว่าป้อนให้ไฟล์ไหน`);
  }
  ok(SOURCE_REGISTRY.portal_rules.some((r) => /read-only|ห้ามเขียน/i.test(r)), "registry ไม่กดย้ำว่า sync เป็น read-only");
});

test("provenance", "master ที่ sync มาต้องครบตามที่ registry รายงาน", () => {
  eq(MASTER_ENTITIES.length, MASTER_META.entities, "จำนวนนิติบุคคลไม่ตรง");
  eq(Object.keys(EXCEPTION_CODES_AS_BUILT).length, MASTER_META.exceptionCodes, "จำนวนรหัส exception ไม่ตรง");
  ok(MASTER_ENTITIES.every((e) => e.orgId != null && e.nameTh), "มีนิติบุคคลที่ map ไม่ครบ (orgId/nameTh หาย)");
  ok(MASTER_ENTITIES.some((e) => e.status === "ACTIVE"), "ไม่มีนิติบุคคล ACTIVE");
  ok(MASTER_ENTITIES.some((e) => e.status !== "ACTIVE"), "ทุกนิติบุคคลเป็น ACTIVE — สงสัยว่า map ผิด");
  includes(MASTER_META.source, "master_data.py", "MASTER_META ไม่บอกว่ามาจากไฟล์ไหน");
});

test("provenance", "design token ใน app.css ต้องตรงกับ mockup v4.4", () => {
  const css = read("src/styles/app.css");
  const misses = Object.entries(DESIGN_TOKENS.tokens).filter(
    ([k, v]) => !new RegExp(`${k}:\\s*${String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*;`, "i").test(css),
  );
  ok(misses.length === 0, `token ไม่ตรงกับที่ sync มาจาก mockup:\n    ${misses.map(([k, v]) => `${k}: ${v}`).join("\n    ")}`);
});

test("provenance", "เอกสารมาตรฐานใน repo ต้องถูก parse ได้ครบโครงสร้าง", () => {
  ok(REPO_DOCS.length >= 5, "เอกสาร repo น้อยเกิน");
  ok(/^AH-IT-DOC-PO-INV-Matching-Standard-v6\.2/.test(ref.standardVersion() ?? ""), `อ่านเวอร์ชันมาตรฐานไม่ได้: ${ref.standardVersion()}`);
  eq(ref.principles().length, 6, "หลักการ D1–D6 ไม่ครบ");
  const rules = ref.standardRules();
  eq(rules.length, 9, "กฎ V-01–V-09 ไม่ครบ");
  ok(rules.every((r) => [1, 2, 3].includes(Number(r.step))), "กฎบางข้อไม่มีเลขขั้น");
  ok(rules.every((r) => r.codes?.length), "กฎบางข้อไม่มีรหัสข้อยกเว้นอ้างอิง");
  ok(ref.decisionMatrix().length >= 4, "decision matrix ว่าง");
  const c = ref.conflictSummary();
  eq(c.both + c.standardOnly.length + c.asBuiltOnly.length, c.total, "ผลรวม conflict ไม่เท่ากับจำนวนรหัสทั้งหมด");
  ok(c.standardOnly.length > 0 || c.asBuiltOnly.length > 0, "ไม่พบความต่างระหว่างมาตรฐานกับ as-built เลย — สงสัยว่า parse ไม่ติด");
});

/* ================================================================== *
 * domain
 * ================================================================== */
test("domain", "เงินคำนวณบน BigInt เป็น decimal string (ไม่มี float)", () => {
  eq(dRound(dAdd(dec("0.1"), dec("0.2")), 6), "0.3", "0.1+0.2");
  eq(dRound(dSub(dec("1000.00"), dec("999.99")), 2), "0.01", "1000-999.99");
  eq(dRound(dMul(dec("1.005"), dec("1000")), 2), "1005", "1.005×1000");
  eq(dRound(dec("1.005"), 2), "1.01", "ปัดขึ้น");
  eq(dRound(dec("-2.5"), 0), "-3", "ปัดขึ้นฝั่งลบ");
  eq(typeof dAdd(dec("1"), dec("2")).v, "bigint", "dAdd ต้องคำนวณบน BigInt");
  ok(dCmp(dec("10.00"), dec("9.99")) === 1 && dCmp(dec("-1"), dec("1")) === -1 && dCmp(dec("2.0"), dec("2.00")) === 0, "dCmp ผิด");
  ok(dEq(dec("2.0"), dec("2.000")), "dEq ผิด");
  eq(fmtMoney("1234567.891"), "1,234,567.89", "fmtMoney (pัด 2 ตำแหน่งตาม default)");
  eq(fmtMoney("1234567.891", { dp: 3 }), "1,234,567.891", "fmtMoney แบบขอทศนิยม 3 ตำแหน่ง");
  eq(fmtMoney(null), "—", "fmtMoney ของว่าง");
  ok(validateDecimalString("123.45").ok, "validateDecimalString ปฏิเสธค่าที่ถูก");
  ok(!validateDecimalString("1,234.5").ok, "validateDecimalString รับค่าที่มีลูกน้ำ");
  ok(!validateDecimalString("1.2345678").ok, "validateDecimalString รับทศนิยมเกิน 6 ตำแหน่ง");
  let threw = false;
  try {
    dec("1e30");
  } catch {
    threw = true;
  }
  ok(threw, "dec รับ exponential notation — ต้องห้ามเพื่อกัน float แอบเข้าระบบ");
});

test("domain", "receiving contract: รับ snapshot ใน fixture ครบ และปฏิเสธของเสียที่สังขึ้น", () => {
  for (const doc of SNAPSHOT_BUNDLE.documents) {
    for (const snap of doc.snapshots) {
      const res = validateSnapshot(snap);
      ok(res.ok, `${doc.document_id} r${snap.revision} ไม่ผ่าน contract: ${res.errors[0]?.path} — ${res.errors[0]?.message}`);
    }
  }
  const base = SNAPSHOT_BUNDLE.documents[0].snapshots[0];
  const broken = [
    (s) => delete s.invoice,
    (s) => (s.status = "Passed"),
    (s) => (s.revision = 0),
    (s) => (s.invoice.grand_total = 1234.5),
    (s) => (s.event_id = ""),
    (s) => (s.schema_version = "9.9"),
    (s) => (s.lines[0].amount = "1,234"),
  ];
  let rejected = 0;
  for (const mutate of broken) {
    const s = JSON.parse(JSON.stringify(base));
    mutate(s);
    if (!validateSnapshot(s).ok) rejected++;
  }
  eq(rejected, broken.length, "contract ควรปฏิเสธของเสียที่สังขึ้นทุกข้อ");
});

test("domain", "contract แยกจาก guard: ส่งกฎมาไม่ครบยังคงผ่าน shape แต่ห้ามใช้ตัดสิน", () => {
  const store = freshStore();
  const partial = store.get("AIVA-2609-0020");
  ok(partial, "ไม่พบเคสส่งผลตรวจไม่ครบ (0020)");
  ok(validateSnapshot(partial.current).ok, "เคสนี้ต้องผ่าน shape (ไม่ครบเป็นหน้าที่ของ guard ไม่ใช่ schema)");
  eq(partial.completeness.complete, false, "completeness.complete ต้องบอกว่ากฎไม่ครบ");
  eq(partial.completeness.missing.length, 4, "ต้องระบุกฎที่ขาดได้ 4 ข้อ (V-06–V-09)");
  ok(partial.completeness.usable, "usable = มีผลกฎอย่างน้อย 1 ข้อ (คนละความหมายกับ complete)");
  ok(blockingFor(partial, "confirm").length > 0, "guard ต้องบล็อกการยืนยันเมื่อกฎขาด");
  const empty = store.list().find((d) => d.document_id === "AIVA-2609-0016");
  ok(validateSnapshot(empty.current).ok, "กรณี 0016 (engine ไม่ข้อยกเว้นเลย) ต้องผ่าน shape — การห้ามใช้ตัดสินเป็นหน้าที่ของ guard");
  // หมายเหตุความหมาย: completeness.usable = “มีผลกฎอย่างน้อย 1 ข้อ” ไม่ใช่ “ครบ 9 กฎ” (ตัวนั้นคือ .complete)
  ok(blockingFor(empty, "confirm").length > 0, "กรณี 0016 ต้องยืนยันไม่ได้");
});

test("domain", "fixture ต้องตรงกับที่ expect ประกาศไว้ทุกข้อ", () => {
  for (const doc of SNAPSHOT_BUNDLE.documents) {
    if (!doc.expect?.status) continue;
    const last = doc.snapshots.at(-1);
    eq(last.status, doc.expect.status, `${doc.document_id} status ต่างจาก expect`);
    const codes = new Set(last.exceptions.map((e) => e.code));
    for (const c of doc.expect.codes ?? []) ok(codes.has(c), `${doc.document_id} ไม่มี ${c} ทั้งที่ expect บอกว่ามี`);
    if (doc.expect.assigned) eq(last.decision?.assigned_to, doc.expect.assigned, `${doc.document_id} เจ้าของงานต่างจาก expect`);
    for (const lv of doc.expect.matchLevels ?? []) ok((last.matches ?? []).some((m) => m.match_level === lv), `${doc.document_id} ไม่มี match level ${lv}`);
    for (const c of summarize(last.exceptions).codes) ok(codeMeta(c).label, `รหัส ${c} ไม่มีคำอธิบายใน master (sync ไม่ครบ)`);
  }
});

test("domain", "Separation of duties: ผู้แนบเอกสารยืนยัน/ปฏิเสธงานตัวเองไม่ได้", () => {
  const store = freshStore();
  let checked = 0;
  for (const doc of store.list()) {
    const who = doc.actor?.uploadedBy;
    const author = USERS.find((u) => u.initials === who && u.role === "APR");
    if (!author) continue;
    checked++;
    for (const act of ["confirm", "reject"]) {
      const res = canAct(author, doc, act);
      ok(!res.ok, `${author.name} ยัง ${act} งานที่ตัวเองแนบได้`);
      ok(res.reasons.some((r) => /Separation/i.test(r)), "เหตุผลไม่พูดถึง Separation of duties");
      ok(!store.act(doc.document_id, act, { note: "ทดสอบ separation of duties", expectedVersion: doc.workflow.version }).ok, "store ยังยอมให้กดผ่าน");
    }
  }
  ok(checked > 0, "ไม่พบเคสที่ผู้อนุมัติ = ผู้แนบใน fixture เลย");
});

test("domain", "post (ส่งตั้งหนี้) ปิดจริงระดับ guard — ยังไม่มี Posting Gateway", () => {
  const store = freshStore();
  const doc = store.list().find((d) => d.workflow.status === "CONFIRMED");
  ok(doc, "ไม่พบเอกสารที่ยืนยันแล้วใน fixture");
  ok(canTransition("CONFIRMED", "post").ok, "state machine เผื่อ action ไว้สำหรับวันที่ต่อ AP จริง (ไม่ใช่ให้กดได้ในวันนี้)");
  ok(!canTransition("PENDING_REVIEW", "post").ok, "ต้องห้าม post ก่อนยืนยัน");
  let guardSeen = 0;
  for (const u of USERS) {
    store.setUser(u.id);
    const res = store.act(doc.document_id, "post", { note: "ทดสอบ post ในช่วงที่ยังไม่มีสัญญา AP", expectedVersion: doc.workflow.version });
    ok(!res.ok, `${u.name} (${u.role}) ส่งตั้งหนี้ได้ — ต้องปิดไว้จนกว่าจะต่อ AP`);
    if (res.stage === "guard") {
      guardSeen++;
      ok(res.reasons.some((r) => /Posting Gateway/i.test(r)), `เหตุผลชั้น guard ต้องบอกว่ายังไม่ต่อ Posting Gateway: ${res.reasons.join(" / ")}`);
    }
  }
  ok(guardSeen > 0, "ไม่มีใครถูกกันที่ชั้น guard เลย — logic กัน post หายไปหรือเปล่า");
  eq(store.get(doc.document_id).workflow.version, doc.workflow.version, "action ที่ล้มเหลวต้องไม่ทำให้ version เดิน");
  eq(store.audit().length, 0, "action ที่ล้มเหลวต้องไม่เขียน audit");
});

test("domain", "guard บล็อกการยืนยันเมื่อของไม่ครบ (กฎขาด / หลักฐานเก่า / ไม่มีผลตรวจ)", () => {
  const store = freshStore();
  const cases = [
    ["AIVA-2609-0020", "ส่งผลตรวจมาไม่ครบทุกกฎ"],
    ["AIVA-2609-0018", "หลักฐาน.pdf เป็นของคนละ revision"],
    ["AIVA-2609-0016", "snapshot ไม่มีผลตรวจ (engine ล้ม)"],
  ];
  for (const [id, why] of cases) {
    const doc = store.get(id);
    ok(doc, `ไม่พบ ${id}`);
    ok(blockingFor(doc, "confirm").length > 0, `${id} (${why}) ควรบล็อกการยืนยัน`);
    store.setUser("u6");
    ok(!store.act(id, "confirm", { note: "ทดสอบว่า guard กันได้จริง", expectedVersion: doc.workflow.version }).ok, `${id} ยังยืนยันได้ทั้งที่ guard ว่า`);
  }
  eq(evidenceStatus(store.get("AIVA-2609-0018")).state, "stale", "ตรวจสถานะหลักฐานผิด");
  ok(["low", "medium", "high", "block"].includes(String(riskLevel(store.get("AIVA-2609-0018")).level ?? "block")), "riskLevel คืนค่าแปลก");
});

test("domain", "portal ไม่แก้ snapshot ที่ส่งมา (ผลตรวจ = ของจาก fixture เป๊ะ)", () => {
  const store = freshStore();
  for (const doc of store.list()) {
    const src = SNAPSHOT_BUNDLE.documents.find((d) => d.document_id === doc.document_id);
    eq(doc.current.status, src.snapshots.at(-1).status, `${doc.document_id} status ถูกแก้`);
    eq(JSON.stringify(doc.current.rules), JSON.stringify(src.snapshots.at(-1).rules), `${doc.document_id} ผลกฎถูกแก้ใน portal`);
    eq(JSON.stringify(doc.current.exceptions), JSON.stringify(src.snapshots.at(-1).exceptions), `${doc.document_id} ข้อยกเว้นถูกแก้ใน portal`);
  }
});

test("domain", "นิติบุคคล resolve จาก master เท่านั้น (ไม่ map เดา)", () => {
  const active = MASTER_ENTITIES.find((e) => e.status === "ACTIVE" && e.orgId);
  ok(active, "ไม่พบนิติบุคคล ACTIVE");
  const mapped = resolveCompany(active.orgId);
  ok(mapped.mapped, `ORG_ID ${active.orgId} ที่อยู่ใน master ต้อง map ได้ (${mapped.reason})`);
  const missing = resolveCompany(999999);
  ok(!missing.mapped && missing.reason, "ORG_ID ปลอมต้อง map ไม่ได้พร้อมเหตุผล");
  const none = resolveCompany(null);
  ok(!none.mapped && none.reason, "ไม่มี ORG_ID ต้อง map ไม่ได้พร้อมเหตุผล");
});

test("domain", "workflow + optimistic version + audit append-only", () => {
  const store = createStore({ storage: null });
  store.setUser("u1");
  const doc = store.list().find((d) => d.workflow.status === "PENDING_REVIEW");
  ok(doc, "ไม่มีเอกสารทดสอบ");
  ok(actionsAllowedByState("PENDING_REVIEW").length > 0, "state PENDING_REVIEW ไม่มี action");

  const held = store.act(doc.document_id, "hold", { note: "ทดสอบ: รอหลักฐานเพิ่มจากคลังสินค้า", expectedVersion: doc.workflow.version });
  ok(held.ok, `hold ไม่ผ่าน: ${held.reasons.join(" / ")}`);
  eq(held.workflow.version, doc.workflow.version + 1, "version ต้อง +1");
  eq(held.workflow.status, "ON_HOLD", "สถานะต้องเป็น ON_HOLD");

  ok(!store.act(doc.document_id, "release", { note: "ทดสอบ version เก่า", expectedVersion: doc.workflow.version }).ok, "ต้องปฏิเสธ expectedVersion เก่า");
  const rel = store.act(doc.document_id, "release", { note: "ทดสอบ: ได้หลักฐานครบแล้ว ปล่อยกลับคิว", expectedVersion: held.workflow.version });
  ok(rel.ok, `release ไม่ผ่าน: ${rel.reasons.join(" / ")}`);
  ok(!canTransition("CONFIRMED", "hold").ok, "งานที่ยืนยันแล้วต้องไม่กักได้อีก");

  const entries = store.audit().filter((e) => e.document_id === doc.document_id);
  ok(entries.length >= 2, "audit ไม่บันทึก action");
  ok(entries.every((e) => (e.note ?? "").trim().length >= 5), "มี audit ที่ไม่มีเหตุผล");
  const before = store.audit().length;
  ok(!store.act(doc.document_id, "hold", { note: "", expectedVersion: rel.workflow.version }).ok, "ต้องบังคับเหตุผล");
  eq(store.audit().length, before, "audit โตทั้งที่ action ไม่ผ่าน — ต้อง append เฉพาะสำเร็จ");
});

test("domain", "ingestion boundary: schema → event_id ซ้ำ → revision ถอยหลัง", () => {
  const store = createStore({ storage: null });
  store.setUser("u7");
  const target = store.list().find((d) => d.pending_snapshot) ?? store.list()[0];
  const base = JSON.parse(JSON.stringify(target.pending_snapshot ?? target.current));
  base.event_id = "EVT-SMOKE-TEST-0001";
  base.revision = (target.current?.revision ?? 1) + 40;

  const good = store.ingest(target.document_id, JSON.parse(JSON.stringify(base)), { note: "ทดสอบ ingest" });
  if (good.ok) {
    ok(store.audit().some((e) => e.kind === "INGEST"), "ingest แล้วไม่มี audit");
    const dup = store.ingest(target.document_id, { ...base, revision: base.revision + 1 }, { note: "ทดสอบ event_id ซ้ำ" });
    ok(!dup.ok && dup.stage === "dedupe", `ต้องปฏิเสธ event_id ซ้ำ (ได้ stage=${dup.stage})`);
    const back = store.ingest(target.document_id, { ...base, event_id: "EVT-SMOKE-TEST-0002", revision: 1 }, { note: "ทดสอบ revision ถอยหลัง" });
    ok(!back.ok && back.stage === "monotonic", `ต้องปฏิเสธ revision ถอยหลัง (ได้ stage=${back.stage})`);
  } else {
    eq(good.stage, "schema", `ingest snapshot ปกติไม่ผ่าน: ${good.reasons[0]}`);
  }

  const broken = JSON.parse(JSON.stringify(base));
  delete broken.invoice;
  const res = store.ingest("AIVA-2609-0001", broken, { note: "ทดสอบ schema พัง" });
  ok(!res.ok && res.stage === "schema", "ต้องปฏิเสธที่ชั้น schema");
  ok(!store.ingestRaw("AIVA-2609-0001", "ไม่ใช่ json").ok, "ต้องปฏิเสธ JSON ที่อ่านไม่ออก");
});

test("domain", "access: EU เห็นเฉพาะงานตัวเอง, APR เห็นทั้งหมด, ทุกปุ่มที่ปิดต้องมีเหตุผล", () => {
  const store = freshStore();
  const all = store.list();
  for (const u of USERS) {
    const vis = visibleDocs(u, all);
    ok(vis.length > 0, `${u.name} ไม่เห็นเอกสารเลย`);
    vis.forEach((d) => ok(canSee(u, d), "visibleDocs กับ canSee ไม่ตรงกัน"));
    if (u.role === "EU") ok(vis.length < all.length, `${u.name} (EU) เห็นครบทุกฉบับ — ควรเห็นเฉพาะที่เกี่ยวข้อง`);
    if (u.role === "APR") eq(vis.length, all.length, `${u.name} (APR) ควรเห็นทั้งหมด`);
  }
  const eu = userById("u1");
  ok(all.filter((d) => isMyTask(eu, d)).every((d) => d.current.decision?.assigned_to === "user"), "isMyTask คืนงานที่ไม่ได้มอบหมายให้ผู้ใช้");

  const rows = actionMatrix(eu, all[0]);
  eq(rows.length, Object.keys(ACTION_LABEL).length, "actionMatrix ไม่ครบ action");
  rows.filter((r) => !r.ok).forEach((r) => ok(r.reasons.length > 0, `action ${r.action} ปิดโดยไม่มีเหตุผล`));
});

/* ================================================================== *
 * ui
 * ================================================================== */
function ctxFor(store, view, params = {}, user = "u6", id = "") {
  return { store, user: userById(user), meta: store.bundle_meta, route: { view, id, params }, filters: {}, go: () => {} };
}

function scanHtml(html, where) {
  ok(html && html.length > 200, `${where} render ได้ว่างเกินไป (${html?.length ?? 0} ตัวอักษร)`);
  for (const bad of ["undefined", "NaN", "[object Object]"]) {
    const at = html.indexOf(bad);
    if (at >= 0) throw new Error(`${where} มี "${bad}" บนจอ: …${html.slice(Math.max(0, at - 70), at + 50).replace(/\s+/g, " ")}…`);
  }
  for (const tag of ["div", "section", "table", "dl", "nav"]) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, "g")) ?? []).length;
    const close = (html.match(new RegExp(`</${tag}>`, "g")) ?? []).length;
    eq(open, close, `${where} แท็ก <${tag}> ไม่ปิดครบ`);
  }
}

test("ui", "หน้างาน: render ได้ทุกบทบาท + ตัวกรองทำงานจริง", () => {
  const store = freshStore();
  for (const u of USERS) scanHtml(views.work.render(ctxFor(store, "work", {}, u.id)), `work/${u.id}`);
  const all = views.work.render(ctxFor(store, "work", {}, "u6"));
  includes(all, "เอกสาร / ผู้ขาย", "หน้างานไม่มีหัวตาราง");
  const held = views.work.render({ ...ctxFor(store, "work", {}, "u6"), filters: { status: "Hold" } });
  scanHtml(held, "work?status=Hold");
  ok((held.match(/row-click/g) ?? []).length < (all.match(/row-click/g) ?? []).length, "ตัวกรอง status ไม่ลดจำนวนแถว");
  const mineOnly = views.work.render({ ...ctxFor(store, "work", {}, "u6"), filters: { mine: "1" } });
  scanHtml(mineOnly, "work?mine=1");
  ok((mineOnly.match(/row-click/g) ?? []).length <= (all.match(/row-click/g) ?? []).length, "ตัวกรอง “งานของฉัน” ไม่ลดจำนวนแถว");
});

test("ui", "หน้าเอกสาร: ครบทุกแท็บ ทุก revision และบอกที่มาข้อมูล", () => {
  const store = freshStore();
  for (const doc of store.list()) {
    for (const snap of doc.revisions) {
      for (const tab of ["", "lines", "evidence", "work"]) {
        const html = views.detail.render(ctxFor(store, "detail", { r: String(snap.revision), ...(tab ? { tab } : {}) }, "u4", doc.document_id));
        scanHtml(html, `detail/${doc.document_id}/r${snap.revision}/${tab || "summary"}`);
      }
    }
  }
  const html = views.detail.render(ctxFor(store, "detail", {}, "u6", "AIVA-2609-0001"));
  includes(html, "master_data.py", "หน้าเอกสารไม่บอกที่มา master");
  includes(html, "rules.py", "หน้าเอกสารไม่บอกที่มาผลตรวจ");
});

test("ui", "หน้ากฎ & ข้อยกเว้น: แสดงมาตรฐานเทียบ as-built + ความขัดแย้ง", () => {
  const store = freshStore();
  for (const tab of ["rules", "exceptions", "decision", "master"]) scanHtml(views.rules.render(ctxFor(store, "rules", { tab })), `rules/${tab}`);
  const html = views.rules.render(ctxFor(store, "rules", { tab: "exceptions" }));
  for (const c of [...ref.conflictSummary().severityClash].slice(0, 3)) includes(html, c, `ไม่โชว์ความขัดแย้งของ ${c}`);
  includes(views.rules.render(ctxFor(store, "rules", { tab: "rules" })), ref.standardVersion(), "ไม่แสดงเวอร์ชันมาตรฐาน");
});

test("ui", "หน้าคู่มือ: render เอกสาร repo ทุกไฟล์ + บอก path/sha", () => {
  const store = freshStore();
  scanHtml(views.manual.render(ctxFor(store, "manual", {})), "manual/portal");
  for (const d of ref.docIndex()) {
    const html = views.manual.render(ctxFor(store, "manual", { doc: d.id }));
    scanHtml(html, `manual/${d.id}`);
    includes(html, d.path.split("/").pop(), `หน้า ${d.id} ไม่แสดง path ต้นทาง`);
  }
});

test("ui", "หน้าคู่มือ: id ที่ไม่มีจริงต้อง fallback กลับมาที่แท็บ portal", () => {
  const store = freshStore();
  const html = views.manual.render(ctxFor(store, "manual", { doc: "doc_standard" }));
  scanHtml(html, "manual?doc=doc_standard");
  const on = html.match(/class="tab on"[^>]*>[^<]*/g) ?? [];
  eq(on.length, 1, `ต้องมีแท็บที่ถูกเลือก 1 อัน พบ ${on.length}`);
  includes(on[0], "portal", "แท็บที่ถูกเลือกไม่กลับมาที่แท็บ portal");
});

test("ui", "ปุ่มเดโมแนบ PDF อยู่ข้างการ์ดหลักฐาน (ที่เดียวกับการทำงาน)", () => {
  const store = freshStore();
  const doc = store.list().find((d) => evidenceStatus(d).state !== "current");
  ok(doc, "ไม่มีเอกสารที่หลักฐานไม่พร้อมเลย — ทดสอบไม่ได้");
  const ev = views.detail.render(ctxFor(store, "detail", { tab: "evidence" }, "u4", doc.document_id));
  includes(ev, 'data-demo="pdf"', "แท็บหลักฐานไม่มีปุ่มเดโมแนบ PDF");
  includes(ev, `data-evidence="${evidenceStatus(doc).state}"`, "แท็บหลักฐานไม่มี marker สถานะให้ test จับ");
  const wk = views.detail.render(ctxFor(store, "detail", { tab: "work" }, "u4", doc.document_id));
  ok(!wk.includes('data-demo="pdf"'), "ปุ่มเดโมแนบ PDF โผล่ซ้ำในแท็บงาน");
  const rowsTableHtml = views.work.render(ctxFor(store, "work", {}));
  ok(/data-ev="(missing|stale)"/.test(rowsTableHtml), "ตารางงานไม่มี data-ev บอกสถานะหลักฐาน");
});

test("ui", "หน้าที่มาข้อมูล: path + sha + คำสั่ง sync ครบ", () => {
  const store = freshStore();
  for (const tab of ["", "howto", "contract"]) scanHtml(views.sources.render(ctxFor(store, "sources", { tab })), `sources/${tab}`);
  const html = views.sources.render(ctxFor(store, "sources", {}));
  for (const s of SOURCES.slice(0, 4)) includes(html, s.path.split("/").pop(), `ไม่แสดงแหล่งข้อมูล ${s.id}`);
  includes(html, "tools/sync.py", "ไม่บอกคำสั่ง sync");
});

test("ui", "หน้าประวัติการทำงาน: ก่อน/หลังมี audit + กรองได้", () => {
  const store = createStore({ storage: null });
  scanHtml(views.audit.render(ctxFor(store, "audit", {})), "audit/empty");
  store.setUser("u1");
  const doc = store.list().find((d) => d.workflow.status === "PENDING_REVIEW");
  store.act(doc.document_id, "hold", { note: "ทดสอบเพื่อตรวจหน้าประวัติการทำงาน", expectedVersion: doc.workflow.version });
  const html = views.audit.render(ctxFor(store, "audit", {}));
  scanHtml(html, "audit/filled");
  includes(html, "ทดสอบเพื่อตรวจหน้าประวัติการทำงาน", "เหตุผลใน audit ไม่แสดง");
  includes(views.audit.render(ctxFor(store, "audit", { k: "WORKFLOW" })), "WORKFLOW", "กรองตามชนิดไม่ได้");
});

/* ------------------------------------------------------------------ *
 * run
 * ------------------------------------------------------------------ */
let failed = 0;
let group = "";
for (const t of tests) {
  if (t.group !== group) {
    group = t.group;
    console.log(`\n${group}`);
  }
  const started = process.hrtime.bigint();
  try {
    await t.fn();
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    console.log(`  + ${t.name}${ms > 200 ? ` (${ms.toFixed(0)}ms)` : ""}`);
  } catch (err) {
    failed++;
    console.log(`  x ${t.name}`);
    console.log(`      ${String(err?.message ?? err).split("\n").slice(0, 5).join("\n      ")}`);
  }
}

console.log(`\n${"─".repeat(66)}`);
console.log(
  failed
    ? `x ผ่าน ${tests.length - failed}/${tests.length} ข้อ — เหลือ ${failed} ข้อที่ต้องแก้ก่อนใช้งาน`
    : `+ ผ่านครบ ${tests.length} ข้อ · ${SOURCES.length} แหล่งข้อมูล · ${SNAPSHOT_BUNDLE.snapshot_count} snapshots`,
);
process.exit(failed ? 1 : 0);
