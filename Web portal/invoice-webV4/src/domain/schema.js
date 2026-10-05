/**
 * domain/schema.js — ตรวจ snapshot ที่ขอบเขต (receiving contract v1.0)
 *
 * หลักการ: "ข้อมูลไม่ครบ/ไม่ตรงรูปแบบ = ห้ามสรุป PASS" → ส่งกลับเป็น error list
 * ให้ UI แสดง ไม่ใช่พยายามแก้ข้อมูลให้ตรง (fail-safe ตาม core-domain.md §1)
 */

import { STANDARD_RULES, EXCEPTION_CODES_AS_BUILT } from "../data/master-data.js";
import { validateDecimalString } from "./money.js";

export const CONTRACT_VERSION = "1.0";

export const STATUSES = ["Auto-pass", "Review", "Hold", "Manual Review"];
export const RULE_RESULTS = ["PASS", "FAIL", "MANUAL", "not_evaluated"];
export const SEVERITIES = ["Low", "Medium", "High"];
export const ASSIGNEES = ["user", "accounting", "system"];

/** ฟิลด์ที่สัญญา v1.0 กำหนด */
export const CONTRACT_FIELDS = [
  "schema_version", "event_id", "source_system", "external_id", "document_id", "revision",
  "standard_version", "engine_version", "rule_catalog_version", "received_at", "status",
  "invoice", "receipt", "lines", "rules", "note",
];

/** ฟิลด์ที่ demo นี้เพิ่มจาก Table 9/PDF API เพื่อให้ UI แสดงได้ — production ต้อง map จากต้นทางจริง */
export const EXTENDED_FIELDS = ["document", "signatures", "exceptions", "matches", "decision", "pdf", "provenance"];

const AMOUNT_FIELDS = ["sub_total", "vat", "grand_total"];
const LINE_FIELDS = ["qty", "unit_price", "amount"];
const RECEIPT_ROW_AMOUNT = ["UNIT_PRICE", "LINE_TOTAL", "QUANTITY_RECEIVED"];

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const nonEmpty = (v) => typeof v === "string" && v.trim() !== "";
const intAtLeast1 = (v) => Number.isInteger(v) && v >= 1;

/**
 * @param {object} raw snapshot จาก producer
 * @returns {{ok:boolean, errors:{path:string,message:string}[], warnings:{path:string,message:string}[],
 *            contractVersion:string, extended:string[]}}
 */
export function validateSnapshot(raw) {
  const errors = [];
  const warnings = [];
  const err = (path, message) => errors.push({ path, message });
  const warn = (path, message) => warnings.push({ path, message });

  if (!isObj(raw)) return { ok: false, errors: [{ path: "$", message: "snapshot ต้องเป็น object" }], warnings, contractVersion: "?", extended: [] };

  const version = String(raw.schema_version ?? "");
  if (version !== CONTRACT_VERSION) {
    err("$.schema_version", `รองรับ schema_version "${CONTRACT_VERSION}" เท่านั้น — ได้รับ "${version || "(ว่าง)"}" → Portal ปฏิเสธทั้ง snapshot`);
  }

  for (const f of ["event_id", "source_system", "external_id", "document_id", "standard_version", "received_at"]) {
    if (!nonEmpty(raw[f])) err(`$.${f}`, `${f} เป็น field บังคับตามสัญญา v1.0`);
  }
  if (!intAtLeast1(raw.revision)) err("$.revision", `revision ต้องเป็นจำนวนเต็ม ≥ 1 (ได้รับ ${JSON.stringify(raw.revision)})`);
  if (!STATUSES.includes(raw.status)) err("$.status", `status ต้องอยู่ใน ${STATUSES.join(" | ")} (ได้รับ ${JSON.stringify(raw.status)})`);
  if (nonEmpty(raw.engine_version) === false) warn("$.engine_version", "ไม่ส่ง engine_version มา — ตรวจย้อนหลังไม่ได้ว่าใช้ code ชุดไหน");
  if (!nonEmpty(raw.rule_catalog_version)) warn("$.rule_catalog_version", "ไม่ส่ง rule_catalog_version — mapping code → ข้อความอ้างอิงไม่ได้");

  /* ---- invoice ---- */
  const inv = raw.invoice;
  if (!isObj(inv)) {
    err("$.invoice", "invoice ต้องเป็น object");
  } else {
    for (const f of ["invoice_num", "supplier_name", "customer_name", "customer_address", "supplier_tax_id", "customer_tax_id", "po_number"]) {
      if (typeof inv[f] !== "string" && inv[f] !== null) err(`$.invoice.${f}`, "type ต้องเป็น string|null");
      else if (inv[f] === "") warn(`$.invoice.${f}`, "ค่าว่าง — ต้นทางต้องส่งข้อยกเว้นมาเอง (เช่น V-01 E13) Portal ห้ามเทียมผล");
    }
    for (const f of AMOUNT_FIELDS) {
      const r = validateDecimalString(inv[f], { required: true, label: `invoice.${f}` });
      if (!r.ok) err(`$.invoice.${f}`, r.message);
    }
    if (inv.invoice_date !== null && !nonEmpty(inv.invoice_date)) err("$.invoice.invoice_date", "ต้องเป็น string|null");
    if (inv.currency !== null && !nonEmpty(inv.currency)) err("$.invoice.currency", "ต้องเป็น string|null");
  }

  /* ---- lines ---- */
  if (!Array.isArray(raw.lines)) {
    err("$.lines", "lines ต้องเป็น array (อาจว่างได้ แต่ต้องส่งมา)");
  } else {
    raw.lines.forEach((l, i) => {
      if (!isObj(l)) return err(`$.lines[${i}]`, "แต่ละบรรทัดต้องเป็น object");
      if (!Number.isInteger(l.line_no)) err(`$.lines[${i}].line_no`, "line_no ต้องเป็นจำนวนเต็ม");
      if (!nonEmpty(l.description) && l.description !== "") warn(`$.lines[${i}].description`, "คำอธิบายบรรทัดว่าง");
      for (const f of LINE_FIELDS) {
        const r = validateDecimalString(l[f], { required: true, label: `lines[${i}].${f}` });
        if (!r.ok) err(`$.lines[${i}].${f}`, r.message);
      }
    });
  }

  /* ---- rules ---- */
  const seen = new Set();
  if (!Array.isArray(raw.rules)) {
    err("$.rules", "rules ต้องเป็น array ของผลตรวจ V-01…V-09");
  } else {
    raw.rules.forEach((r, i) => {
      if (!isObj(r)) return err(`$.rules[${i}]`, "แต่ละผลกฎต้องเป็น object");
      if (!STANDARD_RULES.includes(r.rule_id)) err(`$.rules[${i}].rule_id`, `rule_id ไม่รู้จัก: ${JSON.stringify(r.rule_id)}`);
      else if (seen.has(r.rule_id)) err(`$.rules[${i}].rule_id`, `${r.rule_id} ซ้ำใน snapshot เดียว`);
      seen.add(r.rule_id);
      if (!RULE_RESULTS.includes(r.result)) err(`$.rules[${i}].result`, `result ต้องอยู่ใน ${RULE_RESULTS.join(" | ")}`);
      if (r.code !== null && !EXCEPTION_CODES_AS_BUILT[r.code]) err(`$.rules[${i}].code`, `code ไม่อยู่ใน Standard 6.2: ${JSON.stringify(r.code)}`);
      if (r.severity !== null && !SEVERITIES.includes(r.severity)) err(`$.rules[${i}].severity`, `severity ต้องเป็น ${SEVERITIES.join(" | ")}`);
      if (r.result === "PASS" && r.code !== null && !["E16", "E29"].includes(r.code)) {
        warn(`$.rules[${i}].code`, `result=PASS แต่แนบ code ${r.code} มาด้วย (engine จริงแนบได้เฉพาะ E16/E29 แบบ info)`);
      }
    });
  }

  /* ---- exceptions ---- */
  if (raw.exceptions !== undefined) {
    if (!Array.isArray(raw.exceptions)) err("$.exceptions", "exceptions ต้องเป็น array");
    else
      raw.exceptions.forEach((x, i) => {
        if (!isObj(x)) return err(`$.exceptions[${i}]`, "แต่ละข้อยกเว้นต้องเป็น object");
        if (!EXCEPTION_CODES_AS_BUILT[x.code]) err(`$.exceptions[${i}].code`, `code ไม่อยู่ใน Standard 6.2: ${JSON.stringify(x.code)}`);
        if (!SEVERITIES.includes(x.severity)) err(`$.exceptions[${i}].severity`, `severity ต้องเป็น ${SEVERITIES.join(" | ")}`);
        else if (x.code && EXCEPTION_CODES_AS_BUILT[x.code] && EXCEPTION_CODES_AS_BUILT[x.code].severity !== x.severity) {
          warn(`$.exceptions[${i}].severity`, `${x.code} master ระบุ ${EXCEPTION_CODES_AS_BUILT[x.code].severity} แต่ snapshot ส่ง ${x.severity} มา — Portal จะยึด master เพื่อจัดคิว`);
        }
        if (!nonEmpty(x.message)) warn(`$.exceptions[${i}].message`, "ไม่มีข้อความอธิบาย ผู้ใช้จะไม่เห็นเหตุผล");
      });
  }

  /* ---- receipt ---- */
  if (!isObj(raw.receipt)) {
    err("$.receipt", "receipt ต้องเป็น object (org + แถวใบรับที่ engine ใช้ตรวจ)");
  } else {
    if (raw.receipt.org_id !== null && !Number.isInteger(raw.receipt.org_id)) err("$.receipt.org_id", "org_id ต้องเป็น integer|null");
    if (!Array.isArray(raw.receipt.rows)) err("$.receipt.rows", "rows ต้องเป็น array (ว่างได้เมื่อไม่มีการเรียก Oracle)");
    else
      raw.receipt.rows.forEach((r, i) => {
        if (!isObj(r)) return err(`$.receipt.rows[${i}]`, "แต่ละแถวต้องเป็น object (โครง SQL RCV-V01)");
        if (!nonEmpty(r.RECEIPT_NUM)) err(`$.receipt.rows[${i}].RECEIPT_NUM`, "ขาด RECEIPT_NUM");
        for (const f of RECEIPT_ROW_AMOUNT) {
          const res = validateDecimalString(r[f], { required: true, label: `receipt.rows[${i}].${f}` });
          if (!res.ok) err(`$.receipt.rows[${i}].${f}`, res.message);
        }
      });
    if (raw.receipt.row_count !== undefined && Array.isArray(raw.receipt.rows) && raw.receipt.row_count !== raw.receipt.rows.length) {
      err("$.receipt.row_count", `row_count (${raw.receipt.row_count}) ไม่ตรงจำนวนแถวจริง (${raw.receipt.rows.length})`);
    }
    if (raw.receipt.total_value !== null && raw.receipt.total_value !== undefined) {
      const res = validateDecimalString(raw.receipt.total_value, { label: "receipt.total_value" });
      if (!res.ok) err("$.receipt.total_value", res.message);
    }
  }

  /* ---- decision (extended แต่จำเป็นต่อการจัดคิว) ---- */
  if (raw.decision !== undefined) {
    const d = raw.decision;
    if (!isObj(d)) err("$.decision", "decision ต้องเป็น object");
    else {
      if (!STATUSES.includes(d.status)) err("$.decision.status", `status ต้องอยู่ใน ${STATUSES.join(" | ")}`);
      else if (STATUSES.includes(raw.status) && d.status !== raw.status) {
        err("$.decision.status", `decision.status (${d.status}) ขัดกับ status ระดับ snapshot (${raw.status}) — Portal ไม่เลือกข้างอัตโนมัติ`);
      }
      if (d.assigned_to !== null && !ASSIGNEES.includes(d.assigned_to)) err("$.decision.assigned_to", `assigned_to ต้องเป็น ${ASSIGNEES.join(" | ")} หรือ null`);
    }
  }

  /* ---- signatures (extended) ---- */
  if (raw.signatures !== undefined) {
    if (!isObj(raw.signatures)) err("$.signatures", "signatures ต้องเป็น object");
    else
      for (const k of ["supplier_or_deliverer", "receiver"]) {
        const s = raw.signatures[k];
        if (!isObj(s)) err(`$.signatures.${k}`, "ต้องมี {present:boolean, page:number|null}");
        else if (typeof s.present !== "boolean") err(`$.signatures.${k}.present`, "present ต้องเป็น boolean");
      }
  }

  /* ---- ฟิลด์แปลกปลอม ---- */
  const extended = Object.keys(raw).filter((k) => EXTENDED_FIELDS.includes(k));
  for (const k of Object.keys(raw)) {
    if (!CONTRACT_FIELDS.includes(k) && !EXTENDED_FIELDS.includes(k)) {
      warn(`$.${k}`, `ฟิลด์ "${k}" ไม่อยู่ในสัญญา v1.0 — Portal จะไม่ใช้ field นี้ในการตัดสิน`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, contractVersion: version, extended };
}

/**
 * ความครบของผลตรวจ 9 กฎ — "ไม่ได้รับข้อมูล" ต้องแสดงเป็นไม่มีข้อมูล ไม่ใช่ PASS
 * @param {object[]} rules
 */
export function rulesCompleteness(rules) {
  const list = Array.isArray(rules) ? rules : [];
  const present = new Set(list.map((r) => r.rule_id));
  const missing = STANDARD_RULES.filter((id) => !present.has(id));
  const notEvaluated = list.filter((r) => r.result === "not_evaluated").map((r) => r.rule_id);
  return {
    present: [...present],
    missing,
    notEvaluated,
    complete: missing.length === 0,
    /** snapshot ที่ไม่มีผลกฎเลย = ใช้ตัดสินไม่ได้ */
    usable: list.length > 0,
  };
}

/** สรุป short label สำหรับ badge */
export function schemaBadge(result) {
  if (!result) return { text: "ยังไม่ตรวจ", tone: "muted" };
  if (result.ok && result.warnings.length === 0) return { text: `ผ่านสัญญา v${CONTRACT_VERSION}`, tone: "ok" };
  if (result.ok) return { text: `ผ่าน + ${result.warnings.length} เตือน`, tone: "warn" };
  return { text: `ปฏิเสธ (${result.errors.length} ผิดพลาด)`, tone: "bad" };
}
