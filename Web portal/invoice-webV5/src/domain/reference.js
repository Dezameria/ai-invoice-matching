/**
 * domain/reference.js — อ่าน "มาตรฐาน 6.2" จากเอกสารใน repo แล้วเทียบกับ as-built
 *
 * หลักการ V5: คำอธิบายกฎ/รหัสข้อยกเว้นที่แสดงบนจอ ไม่ได้มีคนพิมพ์ซ้ำในโค้ด UI
 * แต่ถูก *อ่านออกมา* จาก docs/matching-rules-standard-v6.2.md (ผ่าน src/data/repo-docs.js)
 * และเทียบกับ master_data.py ที่ engine ใช้จริง → ความขัดแย้งระหว่างสองแหล่ง
 * ถูกแสดงให้ผู้ใช้เห็น แทนที่จะเลือกข้างใดข้างหนึ่งเงียบ ๆ
 *
 * module นี้ pure (ไม่มี DOM) → ทดสอบใน node ได้
 */

import { REPO_DOCS } from "../data/repo-docs.js";
import { MASTER_META, EXCEPTION_CODES_AS_BUILT, USER_TASK_CODES, STANDARD_RULES } from "../data/master-data.js";
import { findTable, section, stripMd, codesIn, rulesIn } from "./mdtext.js";

export const RULES_DOC_ID = "rules-standard";

export const docById = (id) => REPO_DOCS.find((d) => d.id === id) ?? null;
export const rulesDoc = () => docById(RULES_DOC_ID);

/** เวอร์ชันมาตรฐานที่เอกสารอ้าง (บรรทัด "> **มาตรฐานอ้างอิง:** `AH-IT-DOC-...`") */
export function standardVersion() {
  const m = /AH-IT-DOC-[A-Za-z0-9.\-]+/.exec(rulesDoc()?.body ?? "");
  return m ? m[0] : null;
}

/* ------------------------------------------------------------------ *
 * หลักการออกแบบ D1–D6
 * ------------------------------------------------------------------ */
export function principles() {
  const t = findTable(rulesDoc()?.body ?? "", ["หลักการ", "คำอธิบาย"]);
  if (!t) return [];
  return t.rows.map(([name, detail]) => ({
    id: stripMd(name).split(":")[0].trim(),
    title: stripMd(name).replace(/^D\d+\s*:?\s*/, ""),
    detail: stripMd(detail),
  }));
}

/* ------------------------------------------------------------------ *
 * กฎ V-01…V-09 ตามเอกสารมาตรฐาน (หัวข้อ + bullet ใต้หัวข้อ)
 * ------------------------------------------------------------------ */
const STEP_HEADING = {
  1: "STEP 1",
  2: "STEP 2",
  3: "STEP 3",
};

export function standardRules() {
  const body = rulesDoc()?.body ?? "";
  const out = new Map();
  for (const [step, marker] of Object.entries(STEP_HEADING)) {
    const block = section(body, marker);
    /* เอกสารเขียนแต่ละกฎเป็น bullet: "- **V-01: Header Completeness (...)**" ตามด้วย sub-bullet */
    for (const m of block.matchAll(/^- \*\*(V-\d{2}):\s*([^*]+)\*\*(.*)$/gm)) {
      const [, id, title, tail] = m;
      const after = body.slice(body.indexOf(m[0]) + m[0].length);
      const bullets = [];
      for (const line of after.split(/\r?\n/)) {
        if (/^\s{2,}[-*]\s+/.test(line)) bullets.push(stripMd(line.replace(/^\s*[-*]\s+/, "")));
        else if (line.trim() !== "" && !/^\s/.test(line)) break;
      }
      out.set(id, {
        id,
        step: Number(step),
        title: `${title.trim()}${tail ? ` — ${stripMd(tail)}` : ""}`,
        checks: bullets,
        codes: codesIn(bullets.join(" ")),
        source: `${docById(RULES_DOC_ID)?.path}`,
      });
    }
  }
  return STANDARD_RULES.map((id) => out.get(id) ?? null).filter(Boolean);
}

/* ------------------------------------------------------------------ *
 * Decision Matrix (จากเอกสารมาตรฐาน)
 * ------------------------------------------------------------------ */
export function decisionMatrix() {
  const t = findTable(rulesDoc()?.body ?? "", ["สถานะ", "ผู้รับผิดชอบ"]);
  if (!t) return [];
  return t.rows.map(([status, meaning, next, owner]) => ({
    status: stripMd(status),
    statusKey: stripMd(status).toLowerCase().replace(/[^a-z_]+/g, " ").trim(),
    meaning: stripMd(meaning),
    next: stripMd(next),
    owner: stripMd(owner),
  }));
}

/* ------------------------------------------------------------------ *
 * ตารางรหัส: มาตรฐาน (docs) ↔ as-built (master_data.py)
 * ------------------------------------------------------------------ */
const cell = (s) => stripMd(s ?? "");

/** ข้อความมาตรฐานของแต่ละรหัส จากตาราง "รหัส | หมวดหมู่ | ความหมาย | ความรุนแรง" */
export function standardExceptionTable() {
  const t = findTable(rulesDoc()?.body ?? "", ["รหัส", "ความหมาย", "ความรุนแรง"]) ?? findTable(rulesDoc()?.body ?? "", ["รหัส", "หมวดหมู่"]);
  if (!t) return new Map();
  const iCode = t.header.findIndex((h) => cell(h).toLowerCase().includes("รหัส"));
  const iCat = t.header.findIndex((h) => cell(h).includes("หมวด"));
  const iMean = t.header.findIndex((h) => cell(h).includes("ความหมาย"));
  const iSev = t.header.findIndex((h) => cell(h).includes("รุนแรง"));
  const map = new Map();
  for (const row of t.rows) {
    const code = cell(row[iCode]).match(/E\d{2}/)?.[0];
    if (!code) continue;
    map.set(code, {
      code,
      category: iCat >= 0 ? cell(row[iCat]) : "",
      meaning: iMean >= 0 ? cell(row[iMean]) : "",
      severity: iSev >= 0 ? cell(row[iSev]) : "",
      source: docById(RULES_DOC_ID)?.path,
    });
  }
  return map;
}

/**
 * เทียบรหัสทั้งสองแหล่ง — ผลคือ "ตรงกัน / ความรุนแรงต่างกัน / ความหมายต่างกัน / มีแหล่งเดียว"
 * สถานะ conflict ไม่ได้แปลว่าโค้ดผิด แต่แปลว่า *ต้องเลือกข้าง* ก่อนใช้จริง (skill: อย่าเดา)
 */
export function exceptionComparison() {
  const std = standardExceptionTable();
  const codes = new Set([...std.keys(), ...Object.keys(EXCEPTION_CODES_AS_BUILT)]);
  const SEV_RANK = { critical: 3, high: 3, medium: 2, low: 1 };
  return [...codes]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => {
      const s = std.get(code) ?? null;
      const a = EXCEPTION_CODES_AS_BUILT[code] ?? null;
      const state = !s && a ? "asbuilt-only" : s && !a ? "standard-only" : "both";
      const sevMatch =
        state !== "both" ? null : SEV_RANK[String(s.severity).toLowerCase()] === SEV_RANK[String(a.severity).toLowerCase()];
      return {
        code,
        state,
        standard: s,
        asBuilt: a ? { code, severity: a.severity, desc: a.desc } : null,
        severityMatch: sevMatch,
        meaningDiffers: state === "both" ? stripMd(s.meaning).toLowerCase() !== stripMd(a.desc).toLowerCase() : null,
        owner: USER_TASK_CODES.includes(code) ? "user" : a ? "accounting" : null,
        inDemoCount: null,
      };
    });
}

/** สรุปความขัดแย้ง (ใช้แสดงเป็น alert บนหน้ากฎ) */
export function conflictSummary() {
  const rows = exceptionComparison();
  const both = rows.filter((r) => r.state === "both");
  return {
    total: rows.length,
    both: both.length,
    standardOnly: rows.filter((r) => r.state === "standard-only").map((r) => r.code),
    asBuiltOnly: rows.filter((r) => r.state === "asbuilt-only").map((r) => r.code),
    severityClash: both.filter((r) => r.severityMatch === false).map((r) => r.code),
    wordingDiffers: both.filter((r) => r.meaningDiffers === true).map((r) => r.code),
  };
}

/* ------------------------------------------------------------------ *
 * กฎที่ engine คืนผลจริง (นับจาก snapshot ที่ portal มี) — ใส่เข้าไปได้ผลเป็นเลข
 * ------------------------------------------------------------------ */
export function ruleUsage(docs) {
  const seen = new Map();
  for (const d of docs) {
    for (const r of d.current?.rules ?? []) {
      const row = seen.get(r.rule_id) ?? { id: r.rule_id, pass: 0, fail: 0, manual: 0, skipped: 0, codes: new Set() };
      if (r.result === "PASS") row.pass += 1;
      else if (r.result === "FAIL") row.fail += 1;
      else if (r.result === "MANUAL") row.manual += 1;
      else row.skipped += 1;
      if (r.code) row.codes.add(r.code);
      seen.set(r.rule_id, row);
    }
  }
  return [...seen.values()]
    .map((r) => ({ ...r, codes: [...r.codes].sort() }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/* ------------------------------------------------------------------ *
 * ข้อมูลหลัก (นิติบุคคล) — อ่านจาก generated data ที่ sync มาจาก master_data.py
 * ------------------------------------------------------------------ */
export function masterMeta() {
  return MASTER_META;
}

/** เอกสารทุกไฟล์ใน corpus พร้อม field ที่ UI ใช้ (ไม่มี body เพื่อไม่ให้ list หนัก) */
export function docIndex() {
  return REPO_DOCS.map(({ body, ...rest }) => ({ ...rest, words: body.split(/\s+/).length }));
}

export { rulesIn, section };
