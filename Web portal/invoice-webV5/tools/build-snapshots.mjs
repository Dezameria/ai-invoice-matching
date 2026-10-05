/**
 * build-snapshots.mjs — สร้าง snapshot ที่ Portal แสดง (fixtures) ให้ V5
 *
 * ขั้นตอน: case input → as-built engine (src/engine/rules.js) → snapshot ตาม receiving contract v1.0
 *          → ตรวจด้วย domain/schema.js → เปรียบเทียบกับ expect (golden) → เขียน src/data/snapshots.js
 *
 * ผลพลอยได้: ถ้า expect ของเคสไหนไม่ตรงกับที่ engine ทำจริง build จะ fail
 * → นี่คือเทสต์ว่า "Portal แสดงผลตามที่ engine เป็นจริง" ไม่ใช่ตามที่เอกสารเขียนไว้
 *
 * ใช้งาน: node tools/build-snapshots.mjs [--check]
 *   --check ไม่เขียนไฟล์ (ใช้ตรวจตอน CI/diff)
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { CASES } from "./cases.mjs";
import { evaluate, TOLERANCE } from "../src/engine/rules.js";
import { validateSnapshot, rulesCompleteness, CONTRACT_VERSION } from "../src/domain/schema.js";
import { resolveCompany } from "../src/domain/company.js";
import { dNormalize, dIsZero, dCmp, dec } from "../src/domain/money.js";
import { STANDARD_RULES } from "../src/data/master-data.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT = resolve(ROOT, "src/data/snapshots.js");
const CHECK_ONLY = process.argv.includes("--check");

const ENGINE_VERSION = "as-built mirror of n8n/app/core/rules.py (Standard 6.2)";
const RULE_CATALOG = "6.2-asbuilt-1";
const SOURCE_SYSTEM = "AIVA-OCR-N8N";

/** Dec|string|null → decimal string — กคอบคุ้นต้องไม่ไปผ่าน float */
const s = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && "v" in v && "s" in v) return dNormalize(v);
  return String(v);
};

const AMOUNTS = ["sub_total", "vat", "grand_total"];

function envelope(caseDef, round, revision, receivedAt) {
  return {
    schema_version: CONTRACT_VERSION,
    event_id: `EVT-${caseDef.id.slice(-4)}-${revision}`,
    source_system: SOURCE_SYSTEM,
    external_id: caseDef.dms,
    document_id: caseDef.id,
    revision,
    standard_version: "6.2",
    engine_version: ENGINE_VERSION,
    rule_catalog_version: RULE_CATALOG,
    received_at: receivedAt ?? round.receivedAt,
  };
}

function invoiceBlock(inv) {
  const out = { ...inv };
  for (const f of AMOUNTS) out[f] = s(inv[f]);
  return out;
}

function linesBlock(lines) {
  return lines.map((l) => ({
    line_no: l.line_no,
    item_code: l.item_code ?? null,
    description: l.description,
    qty: s(l.qty),
    uom: l.uom,
    unit_price: s(l.unit_price),
    amount: s(l.amount),
  }));
}

/** แถวใบรับ: คงชื่อ field UPPERCASE ตาม SQL ที่ engine เรียก + เพิ่มค่าที่ engine ใช้ตัดสิน */
function receiptBlock(result, round) {
  const rows = (round.oracle?.rows ?? []).map((r) => ({ ...r }));
  const orgId = rows.length ? rows[0].ORG_ID ?? null : null;
  const company = resolveCompany(orgId, { source: rows.length ? "RECEIPT_ORG" : "NO_ROWS" });
  return {
    sql_id: "RCV-V01",
    bypassed: Boolean(result.decision.halted_by),
    halted_by: result.decision.halted_by,
    org_id: orgId,
    org_name: company.orgName === "—" ? null : company.orgName,
    company: company.company,
    company_label: company.companyLabel,
    company_mapped: company.mapped,
    company_reason: company.reason,
    row_count: rows.length,
    active_row_count: result.activeRowCount,
    rows,
    total_value: s(result.receiptTotal),
    receiver: caseReceiver(round),
  };
}

function caseReceiver(round) {
  return round.receiver ?? null;
}

function buildFromEngine(caseDef, round, revision) {
  const input = {
    invoice: round.invoice,
    lines: round.lines,
    signatures: round.signatures,
    pages_complete: round.pages_complete !== false,
    po_type: round.po_type ?? "Purchase Order",
    oracle: { rows: round.oracle?.rows ?? [] },
  };
  const result = evaluate(input);
  const snap = {
    ...envelope(caseDef, round, revision),
    status: result.decision.status,
    document: {
      source: "DMS",
      doc_id: caseDef.dms,
      pages: round.pages ?? null,
      pages_complete: input.pages_complete,
      uploaded_by: caseDef.actor?.uploadedBy ?? null,
      po_type: input.po_type,
    },
    invoice: invoiceBlock(result.doc.invoice),
    receipt: receiptBlock(result, round),
    lines: linesBlock(result.doc.lines),
    rules: result.rules.map((r) => ({ ...r, details: r.details ?? "" })),
    exceptions: result.exceptions.map((e) => ({ ...e })),
    matches: result.matches.map((m) => ({ ...m })),
    signatures: {
      supplier_or_deliverer: { ...result.doc.signatures.supplier_or_deliverer },
      receiver: { ...result.doc.signatures.receiver },
    },
    decision: { ...result.decision },
    note: round.note ?? caseDef.title,
    provenance: {
      kind: "engine-derived",
      generated_by: "tools/build-snapshots.mjs",
      engine_version: ENGINE_VERSION,
      hand_authored: false,
    },
  };
  return { snap, result };
}

function buildFromOverride(caseDef, round, revision) {
  const ov = caseDef.snapshotOverride;
  const snap = {
    ...envelope(caseDef, round, revision),
    status: ov.status,
    document: {
      source: "DMS",
      doc_id: caseDef.dms,
      pages: ov.pages ?? null,
      pages_complete: ov.pages_complete !== false,
      uploaded_by: caseDef.actor?.uploadedBy ?? null,
      po_type: "Purchase Order",
    },
    invoice: ov.invoice,
    receipt: ov.receipt,
    lines: ov.lines,
    rules: ov.rules,
    exceptions: ov.exceptions ?? [],
    matches: ov.matches ?? [],
    signatures: ov.signatures,
    decision: ov.decision,
    note: ov.note ?? caseDef.title,
    provenance: {
      kind: "hand-authored-snapshot",
      generated_by: "tools/cases-*.mjs (snapshotOverride)",
      engine_version: null,
      hand_authored: true,
      reason: caseDef.handAuthoredReason ?? "ไม่มี producer ใน repo ที่สร้างกรณีนี้ได้",
    },
  };
  return { snap, result: null };
}

/* ------------------------------------------------------------------ *
 * golden check — expect ต้องตรงกับที่ engine ทำจริง
 * ------------------------------------------------------------------ */

const uniq = (xs) => [...new Set(xs)];
const normCodes = (excs) => uniq(excs.map((e) => e.code)).sort();

function goldenFailures(caseDef, snap) {
  const fails = [];
  const exp = caseDef.expect ?? {};
  if (exp.status && snap.status !== exp.status) fails.push(`status คาด ${exp.status} ได้ ${snap.status}`);
  if (exp.codes) {
    const got = normCodes(snap.exceptions ?? []);
    const want = [...exp.codes].sort();
    if (got.join(",") !== want.join(",")) fails.push(`codes คาด ${want.join(",")} ได้ ${got.join(",")}`);
  }
  if ("assigned" in exp && (snap.decision?.assigned_to ?? null) !== exp.assigned) {
    fails.push(`assigned_to คาด ${JSON.stringify(exp.assigned)} ได้ ${JSON.stringify(snap.decision?.assigned_to ?? null)}`);
  }
  if (exp.matchLevels) {
    const got = uniq(snap.matches.map((m) => m.match_level).filter(Boolean)).sort();
    const want = [...exp.matchLevels].sort();
    if (got.join(",") !== want.join(",")) fails.push(`match level คาด ${want.join(",")} ได้ ${got.join(",")}`);
  }
  if (exp.haltedBy && snap.decision?.halted_by !== exp.haltedBy) {
    fails.push(`halted_by คาด ${exp.haltedBy} ได้ ${JSON.stringify(snap.decision?.halted_by)}`);
  }
  return fails;
}

function revisionFailures(caseDef, snaps) {
  if (!caseDef.expectRevisions) return [];
  const fails = [];
  caseDef.expectRevisions.forEach((exp, i) => {
    const snap = snaps[i];
    if (!snap) return fails.push(`revision ${i + 1} ไม่มีในผลลัพธ์`);
    const got = normCodes(snap.exceptions ?? []);
    const want = [...(exp.codes ?? [])].sort();
    if (snap.status !== exp.status) fails.push(`revision ${i + 1} status คาด ${exp.status} ได้ ${snap.status}`);
    if (got.join(",") !== want.join(",")) fails.push(`revision ${i + 1} codes คาด ${want.join(",")} ได้ ${got.join(",")}`);
  });
  return fails;
}

/* ------------------------------------------------------------------ *
 * main
 * ------------------------------------------------------------------ */

const documents = [];
/**
 * ข้อมูลไฟล์แนบ (PDF) ของแต่ละ revision — เป็น metadata ไม่ใช่ตัวไฟล์ (ในโฟลเดอร์นี้ห้ามมี PDF จริง)
 * - ถ้า case กำหนด `pdf` มาเอง → ใช้ตามนั้น (รวม `null` = เดโม "ไม่มีหลักฐาน")
 * - ถ้าเป็นเคสเขียนมือ (handAuthored) → ไม่มีไฟล์ ( pipeline ล้มทั้งตัว)
 * - ไม่งั้นสังเคราะห์ให้ครบทุก revision เพื่อเป็น "หลักฐานปัจจุบัน" ของเคสทั่วไป
 */
function docPdf(caseDef, snaps) {
  if (caseDef.pdf !== undefined) return { map: caseDef.pdf, synth: false };
  if (caseDef.handAuthored) return { map: null, synth: false };
  const map = {};
  for (const s of snaps) {
    map[s.revision] = {
      file_name: `${caseDef.dms}_r${s.revision}.pdf`,
      pages: s.document?.pages ?? null,
      uploaded_at: caseDef.rounds?.[s.revision - 1]?.receivedAt ?? null,
      size_kb: 380 + s.revision * 17,
    };
  }
  return { map, synth: true };
}

const problems = [];

for (const caseDef of CASES) {
  const snaps = [];
  caseDef.rounds.forEach((round, i) => {
    const revision = i + 1;
    const { snap, result } = caseDef.snapshotOverride && i === 0
      ? buildFromOverride(caseDef, round, revision)
      : buildFromEngine(caseDef, round, revision);
    if (result && caseDef.actor?.receiver) snap.receipt.receiver = caseDef.actor.receiver;
    snaps.push(snap);

    const v = validateSnapshot(snap);
    if (!v.ok) problems.push(...v.errors.map((e) => `${caseDef.id} r${revision} ${e.path}: ${e.message}`));
    for (const w of v.warnings) problems.push(`WARN ${caseDef.id} r${revision} ${w.path}: ${w.message}`);

    const comp = rulesCompleteness(snap.rules);
    if (!comp.usable && !caseDef.snapshotOverride) {
      problems.push(`${caseDef.id} r${revision}: engine ไม่คืนผลกฎเลย (ไม่ควรมีกรณีนี้)`);
    }
    // `expect` ใช้กับ revision ล่าสุด ( revision เก่าดูใน expectRevisions)
    if (revision === caseDef.rounds.length) {
      for (const f of goldenFailures(caseDef, snap)) problems.push(`${caseDef.id} r${revision} GOLDEN: ${f}`);
    }
  });

  for (const f of revisionFailures(caseDef, snaps)) problems.push(`${caseDef.id} GOLDEN: ${f}`);

  // revision ล่าสุด = snapshot ที่ portal ใช้แสดงปัจจุบัน
  const latest = snaps.at(-1);
  const dupKey = (snap) => `${snap.invoice.supplier_name}||${snap.invoice.invoice_num}`;

  let pendingSnapshot = null;  if (caseDef.pendingRound) {
    const { snap } = buildFromEngine(caseDef, caseDef.pendingRound, snaps.length + 1);
    const v = validateSnapshot(snap);
    if (!v.ok) problems.push(...v.errors.map((e) => `${caseDef.id} pending ${e.path}: ${e.message}`));
    pendingSnapshot = snap;
  }

  const metaPdf = docPdf(caseDef, snaps);
  documents.push({
    document_id: caseDef.id,
    dms_id: caseDef.dms,
    title: caseDef.title,
    actor: caseDef.actor ?? {},
    pdf: metaPdf.map,
    pdf_synth: metaPdf.synth,
    seed_workflow: caseDef.workflow ?? null,
    outbox: caseDef.outbox ?? [],
    expect: caseDef.expect ?? {},
    dup_key: dupKey(latest),
    hand_authored: Boolean(caseDef.snapshotOverride),
    snapshots: snaps,
    pending_snapshot: pendingSnapshot,
  });
}

/* คู่ซ้ำ (portal-side duplicate check) — คำนวณตอน build เพื่อให้เห็นว่าซ้ำคู่อะไร */
for (const doc of documents) {
  doc.duplicate_of = documents
    .filter((o) => o !== doc && o.dup_key === doc.dup_key)
    .map((o) => o.document_id);
}

const errors = problems.filter((p) => !p.startsWith("WARN"));
const warnings = problems.filter((p) => p.startsWith("WARN"));

const bundle = {
  built_at: new Date().toISOString(),
  generator: "tools/build-snapshots.mjs",
  contract_version: CONTRACT_VERSION,
  standard_version: "6.2",
  engine_version: ENGINE_VERSION,
  tolerance: TOLERANCE,
  document_count: documents.length,
  snapshot_count: documents.reduce((n, d) => n + d.snapshots.length, 0),
  hand_authored_snapshots: documents.filter((d) => d.hand_authored).map((d) => d.document_id),
  documents,
};

const banner = [
  "/* =============================================================",
  " * GENERATED FILE — ห้ามแก้ไขด้วยมือ (do not hand-edit)",
  " * Source : tools/cases-*.mjs (ข้อมูลสังเคราะห์) ผ่าน src/engine/rules.js (as-built mirror)",
  " * Tool   : tools/build-snapshots.mjs",
  " * Run    : node tools/build-snapshots.mjs",
  " * ⚠️ สถานะ/ข้อยกเว้นทั้งหมดในไฟล์นี้มาจากการรัน engine จริง ไม่ใช่คนพิมพ์",
  " *    Portal ห้ามคำนวณ matching ใหม่อีกครั้ง — อ่าน snapshot อย่างเดียว",
  " * ============================================================= */",
].join("\n");

const body = `${banner}\n\nexport const SNAPSHOT_BUNDLE = ${JSON.stringify(bundle, null, 2)};\n\nexport const DOC_INDEX = SNAPSHOT_BUNDLE.documents.map((d) => d.document_id);\n`;

if (!CHECK_ONLY) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, body, "utf8");
} else if (existsSync(OUT)) {
  // โหมด check: ต้องไม่มี drift ระหว่าง src/data/snapshots.js กับ case+engine (ข้าม timestamp)
  const strip = (s) => s.replace(/"built_at": "[^"]*"/, '"built_at": "-"');
  const onDisk = strip(readFileSync(OUT, "utf8"));
  if (onDisk !== strip(body)) {
    errors.push("DRIFT: src/data/snapshots.js ไม่ตรงกับที่ generate จาก cases + engine mirror — รัน `node tools/build-snapshots.mjs` แล้ว commit ใหม่");
  }
}

const label = CHECK_ONLY ? "(check only ไม่ได้เขียนไฟล์)" : OUT;
console.log(`เคส ${documents.length} · snapshot ${bundle.snapshot_count} · ความผิดพลาด ${errors.length} · คำเตือน ${warnings.length} ${label}`);
for (const line of errors) console.log("  ✗ " + line);
for (const line of warnings) console.log("  ! " + line);
if (errors.length) {
  console.log("\nbuild ล้มเหลว — แก้ case/expect หรือ engine mirror ให้ตรงกันก่อน");
  process.exit(1);
}
