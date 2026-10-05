/**
 * cases-shared.mjs — helper สำหรับเขียนเคสตัวอย่าง (ดู cases-a.mjs / cases-b.mjs)
 *
 * 🧪 ข้อมูลสังเคราะห์ 100% (เลขเอกสาร ผู้ขาย PO ใบรับ ยอดเงิน ชื่อบุคลากร)
 * สถานะ/ผลกฎไม่ได้ใส่ด้วยมือ — เกิดจากการรัน as-built engine (src/engine/rules.js)
 * ยกเว้นเคสที่มี `snapshotOverride` ซึ่งจำลอง snapshot ที่ producer ส่งมาไม่ครบ (ติดป้ายใน UI)
 */

/** แถวใบรับจาก Oracle (โครง SQL RCV-V01 ที่ mockup v4.4 อ้างถึง) */
export const row = ({ po, receipt, line, item = null, desc, qty, uom = "PCS", price, org, ou = null }) => ({
  PO_NUMBER: po,
  RECEIPT_NUM: receipt,
  LINE_NUM: line,
  ITEM_NUMBER: item,
  ITEM_DESCRIPTION: desc,
  QUANTITY_RECEIVED: String(qty),
  UNIT_MEAS_LOOKUP_CODE: uom,
  UNIT_PRICE: String(price),
  LINE_TOTAL: String(Number(qty) * Number(price)),
  ORG_ID: org,
  OU_ORG_ID: ou,
});

/** บรรทัดบนใบแจ้งหนี้ (ทุกจำนวนเป็น string เพื่อไม่ให้แตะ float) */
export const ln = (line_no, description, qty, uom, unit_price, amount, item_code = null) => ({
  line_no,
  description,
  qty: String(qty),
  uom,
  unit_price: String(unit_price),
  amount: String(amount),
  item_code,
});

export const sig = (
  supplier = { present: true, page: 1 },
  receiver = { present: true, page: 1 },
) => ({ supplier_or_deliverer: supplier, receiver });

/** ORG_ID ที่ใช้ในเคสต่าง ๆ — ค่าจริงจาก master snapshot (master_data.py) */
export const ORG = {
  AH_HQ: 101, // อาปิโก ไฮเทค HQ · 0107545000213 · ACTIVE
  AH_PLANT: 103, // อาปิโก ไฮเทค (โรงงานอยุธยา)
  AHT: 352, // อาปิโก ไฮเทค ทูลลิ่ง · 0145548001557
  AHP: 175, // อาปิโก ไฮเทค พาร์ท · 0145548001549
  AM: 376, // เอเบิล มอเตอร์ส · 0135546008643
  MGP: 556, // เอ็มจี เอเบิล มอเตอร์ส · 0135564010484
  AMOTION: 223, // เอ แมคชั่น · tax ว่าง · status UNKNOWN
  UNKNOWN_222: 222, // ไม่มีใน master 48 แถว (mockup v4.4 อ้างถึง)
};
