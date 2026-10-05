/**
 * engine/rules.js — สำเนา as-built ของ rules engine (Standard 6.2) สำหรับ "สร้างข้อมูลตัวอย่าง + ตรวจทดสอบ"
 *
 * ⚠️ ห้าม import โมดูลนี้จาก runtime ของ Portal เดียวกันนี้
 *    Portal เก็บ/แสดง snapshot ที่ต้นทางส่งมา และห้ามคำนวณ matching ใหม่ (core-domain.md §1 ข้อ 7)
 *    โมดูลนี้ถูกใช้โดย `tools/build-fixtures.mjs` และ `tools/smoke-test.mjs` เท่านั้น
 *    และมีเทสต์ `no-engine-in-runtime` เฝ้าไว้
 *
 * mirrored from: OCR service/n8n/app/core/rules.py (N4–N11)
 */

import { dec, dAdd, dSub, dMul, dAbs, dCmp, dEq, dDiff, dWithin, dIsZero, dNormalize, dRound } from "../domain/money.js";
import {
  MASTER_ENTITIES,
  STANDARD_RULES,
  EXCEPTION_CODES_AS_BUILT as VALID_EXCEPTION_CODES,
  USER_TASK_CODES,
} from "../data/master-data.js";

export const TOLERANCE = {
  lineMath: "0.50", // V-02
  docSum: "0.50", // V-03 sum(lines) vs subtotal
  vat: "1.00", // V-03 VAT 7%
  grand: "0.50", // V-03 subtotal+VAT vs grand total
  receiptTotal: "0.50", // V-09
  pricePct: 0.01, // V-07 E29 ≤ 1%
  priceAbs: "200", // V-07 E29 ≤ 200 บาท
  receiptSafetyCap: 50, // V-04 MANUAL เมื่อ SQL คืนแถว ≥ 50
};

export const RULE_STEP = {
  "V-01": 1, "V-02": 1, "V-03": 1, "V-06": 1,
  "V-04": 2, "V-05": 2,
  "V-07": 3, "V-08": 3, "V-09": 3,
};

const PASS = "PASS";
const FAIL = "FAIL";
const MANUAL = "MANUAL";
const NOT_EVALUATED = "not_evaluated";

export const ENTITY_BY_ORG = new Map(MASTER_ENTITIES.map((e) => [e.orgId, e]));

/* ------------------------------------------------------------------ *
 * N4: Normalize (as-built helpers)
 * ------------------------------------------------------------------ */

export function cleanTaxId(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.length === 13 ? digits : null;
}

export function cleanPoNumber(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  return digits.length >= 8 ? digits.slice(-8) : digits;
}

const UOM_MAP = {
  PCS: "PCS", PIECE: "PCS", PIECES: "PCS", "ชิ้น": "PCS",
  KGS: "KG", KG: "KG", KILOGRAM: "KG", "ก.ก.": "KG", "กก.": "KG",
  SHEET: "SHT", SHT: "SHT", "แผ่น": "SHT",
  JOB: "JOB", "งาน": "JOB",
  CYL: "CYL",
  TRIP: "TRIP", TP: "TRIP",
};

export function cleanUom(value) {
  if (!value) return "UNKNOWN";
  const u = String(value).trim().toUpperCase();
  if (UOM_MAP[u]) return UOM_MAP[u];
  if (u.includes("TRIP")) return "TRIP";
  return u;
}

export function cleanDate(value) {
  if (!value) return null;
  const m = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/.exec(String(value));
  if (!m) return String(value).trim();
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (y > 2400) y -= 543;
  return `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}/${y}`;
}

const squeeze = (s, sep = "") => String(s ?? "").replace(/\s+/g, sep).trim();

/** N4: normalize input case → เอกสารที่ engine ตรวจ */
export function normalizeDocument(input) {
  const inv = input.invoice;
  return {
    invoice: {
      invoice_num: squeeze(inv.invoice_num).toUpperCase(),
      invoice_date: cleanDate(inv.invoice_date),
      supplier_name: squeeze(inv.supplier_name, " "),
      supplier_tax_id: cleanTaxId(inv.supplier_tax_id),
      customer_name: squeeze(inv.customer_name, " "),
      customer_address: String(inv.customer_address ?? "").trim(),
      customer_tax_id: cleanTaxId(inv.customer_tax_id),
      po_number: cleanPoNumber(inv.po_number),
      release_num: inv.release_num ?? null,
      currency: String(inv.currency ?? "THB").trim().toUpperCase(),
      sub_total: dec(inv.sub_total),
      vat: dec(inv.vat),
      grand_total: dec(inv.grand_total),
    },
    lines: (input.lines ?? []).map((l, i) => ({
      line_no: l.line_no ?? i + 1,
      item_code: l.item_code ?? null,
      description: squeeze(l.description ?? "", " ").toLowerCase(),
      qty: dec(l.qty),
      uom: cleanUom(l.uom),
      unit_price: dec(l.unit_price),
      amount: dec(l.amount),
    })),
    signatures: {
      supplier_or_deliverer: {
        present: input.signatures?.supplier_or_deliverer?.present === true,
        page: input.signatures?.supplier_or_deliverer?.page ?? null,
      },
      receiver: {
        present: input.signatures?.receiver?.present === true,
        page: input.signatures?.receiver?.page ?? null,
      },
    },
    pages_complete: input.pages_complete !== false,
    po_type: input.po_type ?? "Purchase Order",
  };
}

/* ------------------------------------------------------------------ *
 * result helpers
 * ------------------------------------------------------------------ */

const rule = (rule_id, result, { code = null, severity = null, details = "", page = null, haltedBy = null } = {}) => ({
  rule_id,
  result,
  code,
  severity,
  details,
  page,
  halted_by: haltedBy,
});

const exc = (code, rule_id, severity, message, page = null) => ({
  code,
  rule_id,
  severity: severity ?? VALID_EXCEPTION_CODES[code]?.severity ?? "High",
  message,
  page,
});

const money = (a) => (a === null ? "—" : dNormalize(a));

/* ------------------------------------------------------------------ *
 * STEP 1 — V-01, V-02, V-03, V-06
 * ------------------------------------------------------------------ */

export function evaluateStep1(doc) {
  const rules = [];
  const exceptions = [];
  const inv = doc.invoice;
  const lines = doc.lines;

  // V-01 ความครบถ้วนของ header/lines/pages → E13 Medium (engine รวมทุกฟิลด์เป็นรหัสเดียว)
  const missing = [];
  if (!inv.supplier_name) missing.push("supplier_name");
  if (!inv.supplier_tax_id) missing.push("supplier_tax_id");
  if (!inv.customer_name) missing.push("customer_name");
  if (!inv.customer_tax_id) missing.push("customer_tax_id");
  if (!inv.invoice_num) missing.push("invoice_num");
  if (!inv.invoice_date) missing.push("invoice_date");
  if (!inv.po_number) missing.push("po_number");
  if (lines.length === 0) missing.push("lines");
  if (!doc.pages_complete) missing.push("pages_incomplete");

  if (missing.length) {
    rules.push(rule("V-01", FAIL, { code: "E13", severity: "Medium", details: `Missing: ${missing.join(", ")}`, page: 1 }));
    exceptions.push(exc("E13", "V-01", "Medium", `ฟิลด์ไม่ครบ: ${missing.join(", ")}`, 1));
  } else {
    rules.push(rule("V-01", PASS));
  }

  // V-02 |qty × unit_price − amount| ≤ 0.50 ทุกบรรทัด · พลาด = หยุดก่อนเรียก Oracle
  const badLines = [];
  for (const l of lines) {
    const calc = dMul(l.qty, l.unit_price);
    const diff = dDiff(calc, l.amount);
    if (dCmp(diff, dec(TOLERANCE.lineMath)) > 0) {
      badLines.push({ line_no: l.line_no, calc: dRound(calc, 2), amount: dRound(l.amount, 2), diff: dRound(diff, 2) });
    }
  }
  const hasE28 = badLines.length > 0;
  if (hasE28) {
    rules.push(rule("V-02", FAIL, {
      code: "E28",
      severity: "High",
      page: 1,
      details: badLines.map((b) => `บรรทัด ${b.line_no}: ${b.calc} ≠ ${b.amount} (ต่าง ${b.diff})`).join(" · "),
    }));
    exceptions.push(exc("E28", "V-02", "High", "ผลคูณจำนวน×ราคาต่อหน่วยไม่ตรงกับยอดเงิน → Bypass การเรียก Oracle ทั้งหมด", 1));
  } else {
    rules.push(rule("V-02", PASS));
  }

  // V-03 คณิตศาสตร์ทั้งเอกสาร
  let sumLines = dec(0);
  for (const l of lines) sumLines = dAdd(sumLines, l.amount);
  const diffSub = dDiff(sumLines, inv.sub_total);
  const expectedVat = dAbs(dMul(inv.sub_total, dec("0.07")));
  const diffVat = dDiff(expectedVat, inv.vat);
  const expectedGrand = dAdd(inv.sub_total, inv.vat);
  const diffGrand = dDiff(expectedGrand, inv.grand_total);

  const overTol =
    dCmp(diffSub, dec(TOLERANCE.docSum)) > 0 ||
    dCmp(diffVat, dec(TOLERANCE.vat)) > 0 ||
    dCmp(diffGrand, dec(TOLERANCE.grand)) > 0;
  const anyDiff = !(dIsZero(diffSub) && dIsZero(diffVat) && dIsZero(diffGrand));

  const diffMsg = `sum(lines)=${money(sumLines)} vs subtotal=${money(inv.sub_total)} (ต่าง ${dRound(diffSub, 4)}) · VAT คาด=${money(expectedVat)} ได้=${money(inv.vat)} (ต่าง ${dRound(diffVat, 4)}) · grand คาด=${money(expectedGrand)} ได้=${money(inv.grand_total)} (ต่าง ${dRound(diffGrand, 4)})`;

  if (overTol) {
    rules.push(rule("V-03", FAIL, { code: "E31", severity: "High", page: 1, details: diffMsg }));
    exceptions.push(exc("E31", "V-03", "High", "ยอดรวมในเอกสารคำนวณไม่ถูกต้องเกินกรอบที่กำหนด", 1));
  } else if (anyDiff) {
    rules.push(rule("V-03", PASS, { code: "E16", severity: "Low", page: 1, details: diffMsg }));
    exceptions.push(exc("E16", "V-03", "Low", "มีผลต่างเศษสตางค์จากการคำนวณ (อยู่ในเกณฑ์ยอมรับ)", 1));
  } else {
    rules.push(rule("V-03", PASS));
  }

  // V-06 ลายเซ็น (หน้าไม่ครบถูกจัดการที่ V-01 แล้ว)
  const sig = doc.signatures;
  if (!doc.pages_complete) {
    rules.push(rule("V-06", PASS, { details: "หน้าที่ไม่ครบถูกตัดสินที่ V-01 (E13)" }));
  } else if (!sig.receiver.present) {
    rules.push(rule("V-06", FAIL, { code: "E26", severity: "High", page: 1, details: "ไม่พบลายเซ็น/ตราประทับในช่องผู้รับของ" }));
    exceptions.push(exc("E26", "V-06", "High", "ไม่พบลายเซ็นผู้รับของบนเอกสาร", 1));
  } else if (!sig.supplier_or_deliverer.present) {
    rules.push(rule("V-06", FAIL, { code: "E26", severity: "Medium", page: 1, details: "ไม่พบลายเซ็นผู้ส่งของ/ผู้ขาย" }));
    exceptions.push(exc("E26", "V-06", "Medium", "ไม่พบลายเซ็นผู้ส่งของบนเอกสาร", 1));
  } else {
    rules.push(rule("V-06", PASS, { details: `พบผู้ส่งของหน้า ${sig.supplier_or_deliverer.page ?? "-"} · ผู้รับของหน้า ${sig.receiver.page ?? "-"}` }));
  }

  return { rules, exceptions, haltedBy: hasE28 ? "V-02" : null, hasE28 };
}

/* ------------------------------------------------------------------ *
 * STEP 2 — V-04, V-05 (ต้องการแถวใบรับจาก Oracle)
 * ------------------------------------------------------------------ */

export function evaluateStep2(doc, rows) {
  const rules = [];
  const exceptions = [];
  let manualReview = false;

  const activeRows = rows.filter((r) => dCmp(dec(r.QUANTITY_RECEIVED), dec(0)) > 0);
  const distinctReceipts = [...new Set(activeRows.map((r) => r.RECEIPT_NUM))];

  // V-04 พบใบรับที่มีจำนวนรับ > 0
  if (activeRows.length === 0) {
    rules.push(rule("V-04", FAIL, {
      code: "E17",
      severity: "High",
      page: 1,
      details: `SQL ไม่คืนแถวที่ QTY_RECEIVED > 0 (PO ${doc.invoice.po_number ?? "—"}) — ผู้รับของ/ใบรับจึงยังไม่ปรากฏใน Portal`,
    }));
    exceptions.push(exc("E17", "V-04", "High", "ไม่พบใบรับสินค้า หรือจำนวนรับเป็น 0 ในระบบ ERP", 1));
  } else if (distinctReceipts.length > 1) {
    const msg = `พบหลายใบรับในบิลเดียว: ${distinctReceipts.join(", ")}`;
    rules.push(rule("V-04", FAIL, { code: "E35", severity: "High", page: 1, details: msg }));
    exceptions.push(exc("E35", "V-04", "High", msg, 1));
  } else if (rows.length >= TOLERANCE.receiptSafetyCap) {
    rules.push(rule("V-04", MANUAL, { severity: "Medium", page: 1, details: `SQL คืนค่า ${rows.length} แถว ชนเพดาน safety cap ${TOLERANCE.receiptSafetyCap} แถว` }));
    manualReview = true;
  } else {
    rules.push(rule("V-04", PASS, { details: `ใบรับ ${distinctReceipts[0]} · ${activeRows.length} แถวที่จำนวนรับ > 0` }));
  }

  // V-05 นิติบุคคลลูกค้า ↔ Master (ORG_ID จากแถวใบรับแถวแรก)
  const inv = doc.invoice;
  const orgId = rows.length ? rows[0].ORG_ID : null;
  const entity = orgId !== null && orgId !== undefined ? ENTITY_BY_ORG.get(orgId) : undefined;
  let addressMatched = null;

  if (rows.length === 0) {
    rules.push(rule("V-05", NOT_EVALUATED, { details: "ไม่มีแถวใบรับ จึงไม่มี ORG_ID ให้เทียบ master" }));
  } else if (!entity || entity.status !== "ACTIVE") {
    const status = entity ? entity.status : "NOT_FOUND";
    rules.push(rule("V-05", MANUAL, { severity: "Medium", page: 1, details: `ORG_ID ${orgId} → สถานะ ${status} ใน master snapshot (fail-safe: ห้าม Auto-pass)` }));
    manualReview = true;
  } else {
    const invTax = inv.customer_tax_id;
    if (invTax !== entity.taxId) {
      rules.push(rule("V-05", FAIL, {
        code: "E09",
        severity: "High",
        page: 1,
        details: `Tax ID ลูกค้าไม่ตรง master — master: ${entity.taxId || "(ว่าง)"} · เอกสาร: ${invTax || "(ว่าง/ไม่ครบ 13 หลัก)"}`,
      }));
      exceptions.push(exc("E09", "V-05", "High", "เลขประจำตัวผู้เสียภาษีลูกค้าไม่ตรงกับ master นิติบุคคล", 1));
    } else {
      const addr = inv.customer_address || "";
      const hitBranch = entity.branches.find((b) => b && addr.includes(b));
      if (addr.includes(entity.postal) || hitBranch) {
        addressMatched = hitBranch && hitBranch !== entity.postal ? `branch ${hitBranch}` : `HQ/สาขา (${entity.postal})`;
        rules.push(rule("V-05", PASS, { page: 1, details: `ตรงนิติบุคคล ${entity.nameTh} · ตรวจที่อยู่แบบ substring → ${addressMatched}` }));
      } else {
        rules.push(rule("V-05", FAIL, {
          code: "E09",
          severity: "Medium",
          page: 1,
          details: `ที่อยู่ลูกค้าบนเอกสารไม่พบรหัสไปรษณีย์/สาขา (${[entity.postal, ...entity.branches].join(" | ")}) ใน address`,
        }));
        exceptions.push(exc("E09", "V-05", "Medium", "ที่อยู่ลูกค้าไม่ตรงกับข้อมูลจดทะเบียนสำนักงานใหญ่/สาขา", 1));
      }
    }
  }

  const intercompany = MASTER_ENTITIES.some((e) => e.taxId && e.taxId === inv.supplier_tax_id);
  return { rules, exceptions, activeRows, addressMatched, intercompany, manualReview };
}

/* ------------------------------------------------------------------ *
 * STEP 3 — V-07 ladder (M1–M4), V-08 quantity, V-09 receipt total
 * ------------------------------------------------------------------ */

/** บันไดจับคู่รายบรรทัดตามที่ code ทำจริง — M4 = fallback which may pair wrong */
export function matchLine(line, activeRows) {
  const desc = (line.description || "").toUpperCase();
  const byItem = activeRows.find((r) => r.ITEM_NUMBER && desc.includes(String(r.ITEM_NUMBER).toUpperCase()));
  if (byItem) return { row: byItem, level: "M1", note: "พบ item code ใน description" };

  const byLine = activeRows.find((r) => r.LINE_NUM === line.line_no);
  if (byLine) return { row: byLine, level: "M2", note: "จับคู่ด้วยเลขบรรทัด (line number)" };

  const byDesc = activeRows.find((r) =>
    (r.ITEM_DESCRIPTION || "")
      .toUpperCase()
      .split(/\s+/)
      .some((w) => w.length > 4 && desc.includes(w)),
  );
  if (byDesc) return { row: byDesc, level: "M3", note: "จับคู่ด้วย token ใน description (เสี่ยงกำกวม)" };

  if (activeRows.length) return { row: activeRows[0], level: "M4", note: "fallback → แถวแรกที่ยัง active (อาจจับคู่ผิด + ใช้แถวซ้ำ)" };

  return { row: null, level: null, note: "ไม่พบบรรทัดในใบรับ" };
}

export function evaluateStep3(doc, activeRows) {
  const rules = [];
  const exceptions = [];
  const matches = [];
  let v07Fail = false;
  let v08Fail = false;

  for (const l of doc.lines) {
    const { row, level, note } = matchLine(l, activeRows);
    if (!row) {
      v07Fail = true;
      exceptions.push(exc("E30", "V-07", "High", `บรรทัด ${l.line_no} ไม่พบบรรทัดที่ตรงในใบรับ`, 1));
      matches.push({ line_no: l.line_no, match_level: null, note, receipt_line: null, receipt_qty: null, receipt_price: null });
      continue;
    }

    const rcvPrice = dec(row.UNIT_PRICE);
    const priceDiff = dDiff(l.unit_price, rcvPrice);
    let priceFlag = null;
    if (!dIsZero(priceDiff)) {
      const pct = dCmp(rcvPrice, dec(0)) > 0 ? dToNumberSafe(dAbs(dMul(dDivApprox(priceDiff, rcvPrice), dec("100")))) : 0;
      if (dCmp(priceDiff, dec(TOLERANCE.priceAbs)) <= 0 && pct <= TOLERANCE.pricePct * 100) {
        exceptions.push(exc("E29", "V-07", "Low", `บรรทัด ${l.line_no}: ราคา ${money(l.unit_price)} vs ใบรับ ${money(rcvPrice)} ต่าง ${dRound(priceDiff, 4)} (${pct.toFixed(2)}%) ในกรอบยอมรับ`, 1));
        priceFlag = "E29";
      } else {
        v07Fail = true;
        exceptions.push(exc("E05", "V-07", "High", `บรรทัด ${l.line_no}: ราคา ${money(l.unit_price)} vs ใบรับ ${money(rcvPrice)} ต่าง ${dRound(priceDiff, 2)} (${pct.toFixed(2)}%) เกินกรอบยอมรับ`, 1));
        priceFlag = "E05";
      }
    }

    let uomFlag = null;
    const rcvUomRaw = row.UNIT_MEAS_LOOKUP_CODE;
    if (l.uom !== rcvUomRaw && l.uom !== cleanUom(rcvUomRaw)) {
      exceptions.push(exc("E12", "V-07", "Medium", `บรรทัด ${l.line_no}: หน่วยนับไม่ตรง (บิล ${l.uom} · ใบรับ ${rcvUomRaw ?? "—"})`, 1));
      uomFlag = "E12";
    }

    const rcvQty = dec(row.QUANTITY_RECEIVED);
    let qtyFlag = null;
    if (dCmp(l.qty, rcvQty) > 0) {
      v08Fail = true;
      exceptions.push(exc("E06", "V-08", "High", `บรรทัด ${l.line_no}: วางบิล ${dNormalize(l.qty)} > รับจริง ${dNormalize(rcvQty)}`, 1));
      qtyFlag = "E06";
    } else if (dCmp(l.qty, rcvQty) < 0) {
      exceptions.push(exc("E34", "V-08", "Medium", `บรรทัด ${l.line_no}: วางบิลบางส่วน ${dNormalize(l.qty)} จากที่รับจริง ${dNormalize(rcvQty)}`, 1));
      qtyFlag = "E34";
    }

    matches.push({
      line_no: l.line_no,
      match_level: level,
      match_note: note,
      receipt_line: row.LINE_NUM,
      receipt_num: row.RECEIPT_NUM,
      receipt_qty: dNormalize(rcvQty),
      receipt_price: dNormalize(rcvPrice),
      receipt_uom: rcvUomRaw,
      price_flag: priceFlag,
      uom_flag: uomFlag,
      qty_flag: qtyFlag,
    });
  }

  rules.push(
    v07Fail
      ? rule("V-07", FAIL, { code: "E05", severity: "High", page: 1, details: "พบบรรทัดที่ไม่อาจจับคู่ได้ หรือราคาต่างเกินกรอบยอมรับ" })
      : rule("V-07", PASS, { details: `จับคู่ครบทุกบรรทัด · วิธีที่ใช้: ${[...new Set(matches.map((m) => m.match_level).filter(Boolean))].join(", ") || "—"}` }),
  );
  rules.push(
    v08Fail
      ? rule("V-08", FAIL, { code: "E06", severity: "High", page: 1, details: "มีบรรทัดที่จำนวนวางบิลเกินจำนวนรับจริง" })
      : rule("V-08", PASS, { details: "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด" }),
  );

  let rcvTotal = dec(0);
  for (const r of activeRows) rcvTotal = dAdd(rcvTotal, dMul(dec(r.QUANTITY_RECEIVED), dec(r.UNIT_PRICE)));
  const diff = dDiff(doc.invoice.sub_total, rcvTotal);
  if (dCmp(diff, dec(TOLERANCE.receiptTotal)) > 0) {
    rules.push(rule("V-09", FAIL, {
      code: "E31",
      severity: "High",
      page: 1,
      details: `subtotal บิล ${money(doc.invoice.sub_total)} vs Σ(รับจริง × ราคาใบรับ) ${money(rcvTotal)} ต่าง ${dRound(diff, 2)}`,
    }));
    exceptions.push(exc("E31", "V-09", "High", "ยอดรวมมูลค่าสินค้าไม่ตรงกับยอดรวมใบรับสินค้า", 1));
  } else {
    rules.push(rule("V-09", PASS, { details: `Σ(รับจริง × ราคาใบรับ) = ${money(rcvTotal)} ต่างจาก subtotal ${dRound(diff, 4)} (ในกรอบ ${TOLERANCE.receiptTotal})` }));
  }

  return { rules, exceptions, matches, receiptTotal: rcvTotal };
}

/** อัตราส่วนแบบไม่ใช้ float: ทอนเป็นทศนิยม 8 ตำแหน่งก่อนคูณ 100 (พอสำหรับ % tolerance) */
function dDivApprox(a, b, scale = 8) {
  if (dIsZero(b)) return dec("0");
  // a/b × 10^scale = (a.v × 10^(b.s + scale)) / (b.v × 10^a.s)
  const num = a.v * 10n ** BigInt(b.s + scale);
  const den = b.v * 10n ** BigInt(a.s);
  const q = num / den;
  return { v: q, s: scale };
}

function dToNumberSafe(d) {
  return Number(dNormalize(d));
}

/* ------------------------------------------------------------------ *
 * STEP 4 — decision matrix
 * ------------------------------------------------------------------ */

export function decide({ exceptions, manualReview }) {
  const hasHigh = exceptions.some((e) => e.severity === "High");
  const hasMedium = exceptions.some((e) => e.severity === "Medium");
  if (manualReview) return "Manual Review";
  if (hasHigh) return "Hold";
  if (hasMedium) return "Review";
  return "Auto-pass";
}

export function assignTo({ status, exceptions }) {
  if (status === "Auto-pass") return null;
  return exceptions.some((e) => USER_TASK_CODES.includes(e.code)) ? "user" : "accounting";
}

/**
 * รันครบ pipeline N4→N11 สำหรับ 1 snapshot
 * @param {object} input case input (ดู tools/cases.mjs)
 * @returns {{doc: object, rules: object[], exceptions: object[], decision: object, matches: object[], receiptRows: object[], receiptTotal: string|null, info: object}}
 */
export function evaluate(input) {
  const doc = normalizeDocument(input);
  const rows = (input.oracle?.rows ?? []).map((r) => ({ ...r }));
  const step1 = evaluateStep1(doc);
  const halted = step1.hasE28;

  let rules = [...step1.rules];
  let exceptions = [...step1.exceptions];
  let matches = [];
  let addressMatched = null;
  let intercompany = false;
  let manualReview = false;
  let activeRows = [];
  let receiptTotal = null;

  if (!halted) {
    const step2 = evaluateStep2(doc, rows);
    rules = [...rules, ...step2.rules];
    exceptions = [...exceptions, ...step2.exceptions];
    activeRows = step2.activeRows;
    addressMatched = step2.addressMatched;
    intercompany = step2.intercompany;
    manualReview = step2.manualReview;

    if (!manualReview) {
      const step3 = evaluateStep3(doc, activeRows);
      rules = [...rules, ...step3.rules];
      exceptions = [...exceptions, ...step3.exceptions];
      matches = step3.matches;
      receiptTotal = dNormalize(step3.receiptTotal);
    } else {
      rules.push(
        rule("V-07", NOT_EVALUATED, { details: "ยังไม่จับคู่รายบรรทัด เพราะต้องยืนยันสถานะ master/gainting ก่อน (fail-safe)" , haltedBy: "V-04/V-05" }),
        rule("V-08", NOT_EVALUATED, { haltedBy: "V-04/V-05" }),
        rule("V-09", NOT_EVALUATED, { haltedBy: "V-04/V-05" }),
      );
    }
  } else {
    for (const id of ["V-04", "V-05", "V-07", "V-08", "V-09"]) {
      rules.push(rule(id, NOT_EVALUATED, { haltedBy: "V-02", details: id === "V-04" ? "Bypass ไม่เรียก Oracle ตามกติกา E28" : "ถูกข้ามเพราะ V-02 พบ E28" }));
    }
  }

  // N10: ต้องมีครบ 9 กฎ
  const have = new Set(rules.map((r) => r.rule_id));
  for (const id of STANDARD_RULES) {
    if (!have.has(id)) rules.push(rule(id, NOT_EVALUATED));
  }
  rules.sort((a, b) => a.rule_id.localeCompare(b.rule_id));

  const status = decide({ exceptions, manualReview });
  const decision = {
    status,
    assigned_to: assignTo({ status, exceptions }),
    halted_by: step1.haltedBy,
    manual_review: manualReview,
  };

  return {
    doc,
    rules,
    exceptions,
    decision,
    matches,
    receiptRows: rows,
    activeRowCount: activeRows.length,
    receiptTotal,
    info: { addressMatched, intercompany, standardVersion: "6.2" },
  };
}

export { PASS, FAIL, MANUAL, NOT_EVALUATED, dEq, dAbs, dDiff, dWithin };
