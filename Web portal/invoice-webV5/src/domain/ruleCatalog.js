/**
 * domain/ruleCatalog.js — คำอธิบาย 9 กฎ (V-01…V-09) สำหรับ UI
 *
 * ห้ามใช้เป็นเกณฑ์ตัดสิน (เกณฑ์อยู่ใน engine และถูกตรึงไว้ใน snapshot แล้ว)
 * ข้อมูลนี้เขียนตาม as-built mirror (src/engine/rules.js) — ช่อง asBuilt คือจุดที่ต่างจากเอกสารมาตรฐาน 6.2
 */

export const VERDICT = {
  PASS: { label: "ผ่าน", tone: "ok" },
  FAIL: { label: "ไม่ผ่าน", tone: "bad" },
  MANUAL: { label: "ให้คนตัดสิน", tone: "info" },
  NOT_EVALUATED: { label: "ไม่ได้ตรวจ", tone: "muted" },
};

export const RULE_CATALOG = {
  "V-01": {
    step: 1,
    name: "ความครบถ้วนของเอกสาร",
    checks: "ฟิลด์บังคับของ header (เลขที่เอกสาร/วันที่/ผู้ขาย/Tax ID/ที่อยู่ลูกค้า/PO), จำนวนบรรทัด ≥ 1, จำนวนหน้าอ่านครบ",
    codes: ["E13"],
    asBuilt: "ทุกฟิลด์ที่ขาดรวมเป็นรหัสเดียว E13 (เอกสารมาตรฐานแยกรายฟิลด์) และจำนวนหน้าไม่ครบก็ออก E13 ที่นี่",
  },
  "V-02": {
    step: 1,
    name: "คณิตศาสตร์รายบรรทัด",
    checks: "|จำนวน × ราคาต่อหน่วย − มูลค่าบรรทัด| ≤ 0.50 ทุกบรรทัด",
    codes: ["E28"],
    asBuilt: "ถ้าไม่ผ่าน (E28) ระบบ “bypass” ไม่เรียก Oracle → V-04, V-05, V-07, V-08, V-09 กลายเป็นไม่ได้ตรวจทั้งหมด",
  },
  "V-03": {
    step: 1,
    name: "คณิตศาสตร์ทั้งเอกสาร",
    checks: "Σบรรทัด vs subtotal (±0.50) · VAT 7% (±1.00) · subtotal+VAT vs grand total (±0.50)",
    codes: ["E31"],
    asBuilt: "คาดหวัง VAT 7% เสมอ — เอกสารต่างประเทศ/ไม่มี VAT หรือสกุลเงินอื่นจึงถูก E31 ได้ทั้งที่ยอดถูกต้อง",
  },
  "V-06": {
    step: 1,
    name: "ลายเซ็น / ตราประทับ",
    checks: "พบลายเซ็นหรือตราประทับ “ผู้ส่งของ” และ “ผู้รับของ”",
    codes: ["E26"],
    asBuilt: "ขาดผู้รับของ = High (Hold), ขาดผู้ส่งของ = Medium (Review) · ถ้าหน้าไม่ครบจะข้ามการตรวจนี้ (ไปตัดสินที่ V-01)",
  },
  "V-04": {
    step: 2,
    name: "มีใบรับของใน ERP",
    checks: "SQL คืนแถวที่มีจำนวนรับ > 0 · ใบรับเดียว · ไม่เกินจำนวนแถวปลอดภัย",
    codes: ["E17", "E35", "E30"],
    asBuilt: "ไม่มีแถวที่จำนวนรับ > 0 → E17 High · หลายเลขใบรับในบิลเดียว → E35 High · แถว ≥ 50 → MANUAL (fail-safe ไม่เดา)",
  },
  "V-05": {
    step: 2,
    name: "นิติบุคคลลูกค้า ↔ master",
    checks: "Tax ID ลูกค้า (13 หลัก) ↔ ORG_ID จากแถวใบรับ + เปรียบเทียบที่อยู่",
    codes: ["E09"],
    asBuilt: "ใช้ ORG_ID ของแถวแรกเป็นตัวแทนทั้งใบรับ · สถานะนิติบุคคลไม่ใช่ ACTIVE → MANUAL · Tax ID ผู้ขายว่าง → E13 (V-01)",
  },
  "V-07": {
    step: 3,
    name: "จับคู่รายบรรทัด + ราคา + หน่วยนับ",
    checks: "bilinear 1-1: M1 item code → M2 ชื่อตรง → M3 token ในคำอธิบาย → M4 fallback · ราคาต่าง ≤1% และ ≤200 บาท · หน่วยนับตรง",
    codes: ["E30", "E05", "E29", "E12"],
    asBuilt: "M4 ใช้แถวใบรับแถวแรกแบบไม่กันซ้ำ → E30 (ไม่พบบรรทัดตรง) แทบไม่เกิดเมื่อมีแถว active · E29 (Low) กลายเป็น Hold ได้เมื่อ V-09 ต่อ E31 มาด้วย",
  },
  "V-08": {
    step: 3,
    name: "จำนวนที่วางบิล vs ที่รับจริง",
    checks: "วางบิล ≤ จำนวนรับต่อบรรทัด · วางบิลบางส่วนถือว่า Medium",
    codes: ["E06", "E34"],
    asBuilt: "E06 (วางเกิน) = High → Hold, E34 (วางบางส่วน) = Medium → Review",
  },
  "V-09": {
    step: 3,
    name: "ยอดรวม ↔ มูลค่ารับจริงทั้งใบรับ",
    checks: "|Σ(จำนวนรับ × ราคาใบรับ) − subtotal| ≤ 0.50",
    codes: ["E31"],
    asBuilt: "รวมทั้งใบรับ (ทุกบรรทัด) เทียบ subtotal ของบิล → วางบิลบางส่วน/หลายใบรับมักโดน E31 High ทั้งที่ V-08 บอก Medium",
  },
};

export const STEP_LABEL = {
  1: "ขั้นที่ 1 · อ่านเอกสารอย่างเดียว (ไม่แตะ ERP)",
  2: "ขั้นที่ 2 · เทียบกับข้อมูลรับของ/นิติบุคคล",
  3: "ขั้นที่ 3 · จับคู่รายบรรทัด + ยอดรวม",
};

export const ALL_RULE_IDS = ["V-01", "V-02", "V-03", "V-06", "V-04", "V-05", "V-07", "V-08", "V-09"];

export const MATCH_LEVEL = {
  M1: { label: "M1 · item code", tone: "ok", note: "รหัสตรงกับ ITEM_NUMBER/พบในคำอธิบาย — เชื่อถือสูงสุด" },
  M2: { label: "M2 · ชื่อตรง", tone: "ok", note: "คำอธิบายตรงทั้งข้อความ (normalize แล้ว)" },
  M3: { label: "M3 · token", tone: "warn", note: "ตรงกันจาก token ในคำอธิบาย — มีสิทธิ์กำกวม" },
  M4: { label: "M4 · fallback", tone: "bad", note: "ไม่มีเกณฑ์ตรง ใช้แถวแรกที่ยัง active — อาจผิดบรรทัด/ใช้ซ้ำ" },
};

export function ruleMeta(id) {
  return (
    RULE_CATALOG[id] ?? {
      step: 0,
      name: `กฎ ${id}`,
      checks: "(ไม่มีใน catalog ของ portal — engine ส่งรหัสที่ไม่รู้จัก)",
      codes: [],
      asBuilt: "ต้องตรวจสอบกับทีม OCR service",
    }
  );
}
