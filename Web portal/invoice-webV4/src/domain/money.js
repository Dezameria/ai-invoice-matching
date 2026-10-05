/**
 * money.js — เลขทศนิยมExact (BigInt) สำหรับ boundary การเงินของ Portal
 *
 * เหตุผล: receiving contract เก็บจำนวนเงินเป็น **decimal string** (≤ 20 หลักรวม, ทศนิยม ≤ 6 ตำแหน่ง)
 * และ contract ห้าม NaN/Infinity — ถ้า portal แปลงเป็น float แล้วคำนวณต่อ ผลต่างเศษสตางค์
 * อาจหายไปหรือเกินขึ้นมาเอง (ดูเคส 600 × 30.666667 = 18,400.0002)
 *
 * โมดูลนี้ไม่มี DOM/Node dependency → ใช้ได้ทั้งในเบราว์เซอร์และใน tools/smoke-test.mjs
 */

export const MAX_DECIMAL_DIGITS = 20; // จำนวนเลขนัยรวมตาม receiving contract
export const MAX_FRACTION_DIGITS = 6; // ทศนิยมสูงสุดตาม contract
const WORK_SCALE = 12; // พื้นที่สำหรับผลคูณของทศนิยม 6 × 6 ตำแหน่ง

/** @typedef {{v: bigint, s: number}} Dec */

class DecimalError extends Error {
  constructor(message, raw) {
    super(`${message}${raw === undefined ? "" : ` (ค่าที่ได้: ${JSON.stringify(String(raw))})`}`);
    this.name = "DecimalError";
    this.raw = raw;
  }
}

const NUM_RE = /^([+-]?)(\d+)?(?:\.(\d+))?$/;

/**
 * แปลงค่า (string / number / Dec) → Dec แบบไม่ผ่าน float
 * @param {string|number|Dec|null|undefined} raw
 * @returns {Dec|null} null เมื่อค่าว่างตาม contract (null/undefined/"")
 */
export function dec(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object" && "v" in raw && "s" in raw) return { v: raw.v, s: raw.s };
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) throw new DecimalError("รับเฉพาะจำนวนจำกัด (ไม่รับ NaN/Infinity)", raw);
    return dec(numberToDecimalString(raw));
  }
  const text = String(raw).trim();
  if (text === "") return null;
  const m = NUM_RE.exec(text);
  if (!m) throw new DecimalError("ไม่ใช่ decimal string", raw);
  const [, sign, intPart = "", fracPart = ""] = m;
  if (fracPart.length > MAX_FRACTION_DIGITS) {
    throw new DecimalError(`ทศนิยมเกิน ${MAX_FRACTION_DIGITS} ตำแหน่ง`, raw);
  }
  const digits = (intPart || "") + fracPart;
  if (digits.length > MAX_DECIMAL_DIGITS) {
    throw new DecimalError(`จำนวนเลขนัยเกิน ${MAX_DECIMAL_DIGITS} หลัก`, raw);
  }
  const value = BigInt(digits || "0");
  return { v: sign === "-" ? -value : value, s: fracPart.length };
}

/** number → decimal string ที่ "อ่านเหมือนคน" (เลี่ยง exponential notation) */
function numberToDecimalString(n) {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(MAX_FRACTION_DIGITS).replace(/0+$/, "").replace(/\.$/, "");
  return s === "" ? "0" : s;
}

/** ปรับ scale ของ a ให้เท่ากับ scale เป้าหมาย (เพิ่มได้อย่างเดียวเพื่อไม่เสียความละเอียด) */
function rescale(a, s) {
  if (a.s === s) return a;
  if (a.s > s) throw new DecimalError("ลด scale จะทำให้ความละเอียดหาย");
  return { v: a.v * 10n ** BigInt(s - a.s), s };
}

/** ตัดศูนย์ที่ปลายทิ้งเก็บไว้ในตัวกลาง (ไม่เปลี่ยนค่า ทำให้ BigInt ไม่โตเกินจำเป็น) */
function norm(a) {
  let { v, s } = a;
  if (v === 0n) return { v: 0n, s: 0 };
  while (s > 0 && v % 10n === 0n) {
    v /= 10n;
    s -= 1;
  }
  return { v, s };
}

export function dAdd(a, b) {
  const s = Math.max(a.s, b.s);
  return norm({ v: rescale(a, s).v + rescale(b, s).v, s });
}

export function dSub(a, b) {
  const s = Math.max(a.s, b.s);
  return norm({ v: rescale(a, s).v - rescale(b, s).v, s });
}

export function dMul(a, b) {
  return norm({ v: a.v * b.v, s: a.s + b.s });
}

export function dNeg(a) {
  return { v: -a.v, s: a.s };
}

export function dAbs(a) {
  return { v: a.v < 0n ? -a.v : a.v, s: a.s };
}

/** @returns {number} -1 | 0 | 1 */
export function dCmp(a, b) {
  const s = Math.max(a.s, b.s);
  const x = rescale(a, s).v;
  const y = rescale(b, s).v;
  return x < y ? -1 : x > y ? 1 : 0;
}

export function dEq(a, b) {
  return a !== null && b !== null && dCmp(a, b) === 0;
}

export function dIsZero(a) {
  return a !== null && a.v === 0n;
}

/** |a - b| */
export function dDiff(a, b) {
  return dAbs(dSub(a, b));
}

/** |a - b| <= tol */
export function dWithin(a, b, tol) {
  return dCmp(dDiff(a, b), dec(tol)) <= 0;
}

/** ตัดทศนิยมแบบ half-up กลับเป็น decimal string (ใช้ในรายงานเท่านั้น ไม่ใช้ตรวจกฎ) */
export function dRound(a, dp = 2) {
  if (a === null) return null;
  const x = a;
  if (x.s <= dp) return dNormalize(a);
  const factor = 10n ** BigInt(x.s - dp);
  let q = x.v / factor;
  const r = x.v % factor;
  if (r !== 0n && (r < 0n ? -r : r) * 2n >= factor) q += x.v < 0n ? -1n : 1n;
  const sign = q < 0n ? "-" : "";
  const digits = (q < 0n ? -q : q).toString().padStart(dp + 1, "0");
  const intPart = digits.slice(0, digits.length - dp) || "0";
  const fracPart = dp > 0 ? "." + digits.slice(digits.length - dp) : "";
  return `${sign}${intPart}${fracPart}`;
}

/** decimal string แบบ canonical (ตัดศูนย์ท้ายเกินออก แต่คง 0.x) */
export function dNormalize(a) {
  if (a === null) return null;
  let { v, s } = a;
  while (s > 0 && v % 10n === 0n) {
    v /= 10n;
    s -= 1;
  }
  const sign = v < 0n ? "-" : "";
  const digits = (v < 0n ? -v : v).toString();
  if (s === 0) return `${sign}${digits}`;
  const padded = digits.padStart(s + 1, "0");
  return `${sign}${padded.slice(0, padded.length - s)}.${padded.slice(padded.length - s)}`;
}

/** ค่าสำหรับคำนวณต่อ (กราฟ/เปอร์เซ็นต์) — ห้ามใช้เทียบความเท่ากันทางการเงิน */
export function dToNumber(a) {
  if (a === null) return null;
  return Number(dNormalize(a));
}

export function dMulN(a, b) {
  return dMul(a, dec(b));
}

/**
 * จัดรูปแบบเงินแบบมีตัวคั่นหลัก — แสดงผลอย่างเดียว
 * @param {string|number|Dec|null} raw
 * @param {{dp?: number, dashWhenNull?: string}} [opts]
 */
export function fmtMoney(raw, opts = {}) {
  const dp = opts.dp ?? 2;
  const a = dec(raw);
  if (a === null) return opts.dashWhenNull ?? "—";
  const fixed = dRound(a, dp);
  const [signAndInt, frac = ""] = fixed.split(".");
  const negative = signAndInt.startsWith("-");
  const intDigits = negative ? signAndInt.slice(1) : signAndInt;
  const grouped = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}${dp > 0 ? "." + frac : ""}`;
}

/** จำนวนชิ้น/น้ำหนัก — แสดงตามที่ส่งมาจริง ไม่บังคับ 2 ตำแหน่ง */
export function fmtQty(raw, opts = {}) {
  const a = dec(raw);
  if (a === null) return opts.dashWhenNull ?? "—";
  const canonical = dNormalize(a);
  const negative = canonical.startsWith("-");
  const [intPart, frac = ""] = (negative ? canonical.slice(1) : canonical).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}${frac ? "." + frac : ""}`;
}

/** ตรวจว่า string ที่ส่งมาเข้า contract หรือไม่ (ใช้ที่ boundary ไม่ใช่แสดงผล) */
export function validateDecimalString(raw, { required = false, label = "value" } = {}) {
  if (raw === null || raw === undefined || raw === "") {
    return required ? { ok: false, message: `${label}: ห้ามเป็นค่าว่าง` } : { ok: true, value: null };
  }
  if (typeof raw === "number") {
    return { ok: false, message: `${label}: ควรส่งเป็น decimal string ไม่ใช่ number (float ทำให้ผลต่างเพี้ยน)` };
  }
  try {
    const a = dec(raw);
    if (a === null) return { ok: false, message: `${label}: ค่าว่างทั้งที่ contract ต้องการ` };
    return { ok: true, value: dNormalize(a) };
  } catch (err) {
    return { ok: false, message: `${label}: ${err.message}` };
  }
}

export { WORK_SCALE, DecimalError };
