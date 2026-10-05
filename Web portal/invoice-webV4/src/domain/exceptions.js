/**
 * domain/exceptions.js — รหัสข้อยกเว้น + severity + สิทธิ์เจ้าของงาน (อ่านอย่างเดียว)
 *
 * source of truth = master-data.js (generated จาก master_data.py) → ไฟล์นี้มีแต่ "การนำเสนอ/จัดกลุ่ม"
 * ห้ามใส่เกณฑ์ตัดสินใหม่ลงตรงนี้
 */

import { EXCEPTION_CODES_AS_BUILT, USER_TASK_CODES } from "../data/master-data.js";

export const SEVERITY_RANK = { High: 3, Medium: 2, Low: 1 };
export const SEVERITY_LABEL = { High: "High (Hold)", Medium: "Medium (Review)", Low: "Low (บันทึกไว้)" };

/** สิ่งที่ผู้ใช้/บัญชีควรทำต่อ — ข้อความ guidance ไม่ใช่เกณฑ์ตัดสิน */
export const NEXT_STEP = {
  E05: "ยืนยันราคากับฝ่ายจัดซื้อ (PO/ใบเสนอราคา) แล้ว resubmit หรือปรับราคาใน ERP",
  E06: "จำนวนที่วางบิลเกินที่รับของ — ให้ผู้ขายออกใบลดหนี้ หรือตรวจการรับของซ้ำใน ERP",
  E09: "ตรวจ Tax ID/ที่อยู่ลูกค้ากับ master นิติบุคคล (อาจออกใบผิดบริษัท)",
  E12: "เทียบหน่วยนับกับใบรับจริง ถ้ายอมรับได้ให้ยืนยันด้วยมือ พร้อมบันทึกเหตุผล",
  E13: "ขอเอกสาร/ข้อมูลส่วนที่ขาดจากผู้ขาย หรือ resubmit หลัง OCR อ่านซ้ำ",
  E16: "เศษสตางค์ในกรอบยอมรับ — ไม่ต้องทำอะไร ระบบยัง Auto-pass",
  E17: "ยังไม่มีการรับของใน ERP — ให้ Receiver รับของก่อน แล้ว rescan/resubmit",
  E25: "ตรวจวันที่เอกสาร (engine แปลง พ.ศ. → ค.ศ. ให้อัตโนมัติ)",
  E26: "ต้องพบลายเซ็น/ตราประทับในเอกสาร ถ้าเป็นเอกสาร e-tax ให้แนบหลักฐานกำกับ",
  E28: "ยอดบรรทัดคำนวณไม่ตรงจำนวน×ราคา — ห้ามส่ง Oracle ต้องเคลียร์ก่อน",
  E29: "ราคาต่างในกรอบ ≤1% และ ≤200 บาท — แต่ V-09 มักทำให้ E31 มาด้วย (ดู Known gaps)",
  E30: "ไม่พบบรรทัดในใบรับ — ตรวจว่าวางบิลข้าม PO/ข้ามใบรับหรือไม่",
  E31: "ยอดรวมเอกสาร/ใบรับไม่ตรงกัน — ตรวจ subtotal, VAT, และจำนวนรับทั้งหมด",
  E34: "วางบิลบางส่วน (partial billing) — ยืนยันว่ารอบนี้วางแค่นี้จริง",
  E35: "บิลเดียวครอบคลุมหลายใบรับ — ต้องตรวจว่ายอดรวมครอบคลุมทุกใบรับจริง",
};

/** @returns {{code:string, severity:string, label:string, owner:string, userTask:boolean, next:string}} */
export function codeMeta(code) {
  const info = EXCEPTION_CODES_AS_BUILT[code] ?? { severity: "High", desc: "(รหัสไม่อยู่ใน master)" };
  const userTask = USER_TASK_CODES.includes(code);
  return {
    code,
    severity: info.severity,
    label: info.desc,
    userTask,
    owner: userTask ? "user" : "accounting",
    next: NEXT_STEP[code] ?? "ส่งต่อฝ่ายบัญชีเพื่อพิจารณา",
  };
}

/** เรียงตาม severity → code */
export function sortExceptions(exceptions = []) {
  return [...exceptions].sort(
    (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0) || a.code.localeCompare(b.code),
  );
}

export function summarize(exceptions = []) {
  const list = sortExceptions(exceptions);
  return {
    list,
    codes: list.map((e) => e.code),
    hasHigh: list.some((e) => e.severity === "High"),
    hasMedium: list.some((e) => e.severity === "Medium"),
    counts: list.reduce((acc, e) => ({ ...acc, [e.severity]: (acc[e.severity] ?? 0) + 1 }), {}),
    /** code ที่สร้างงานให้ผู้ใช้ (Receiver) ตาม USER_TASK_CODES as-built */
    userCodes: list.filter((e) => USER_TASK_CODES.includes(e.code)).map((e) => e.code),
    accountCodes: list.filter((e) => !USER_TASK_CODES.includes(e.code)).map((e) => e.code),
  };
}

/** นับความถี่รหัสทั้งระบบ (ใช้ในหน้า Dashboard/Master) */
export function frequency(exceptionsPerDoc = []) {
  const map = new Map();
  for (const list of exceptionsPerDoc) {
    for (const e of list ?? []) {
      const cur = map.get(e.code) ?? { code: e.code, n: 0, severity: e.severity };
      cur.n += 1;
      map.set(e.code, cur);
    }
  }
  return [...map.values()].sort(
    (a, b) => b.n - a.n || (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0) || a.code.localeCompare(b.code),
  );
}
