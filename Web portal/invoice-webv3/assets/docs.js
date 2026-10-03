/* =============================================================
 * AIVA Invoice Portal v3 mockup — ข้อมูลเอกสารตัวอย่าง (SYNTHETIC)
 * ตัวเลข/เลขเอกสาร/ชื่อผู้ขายเป็นข้อมูลสังเคราะห์สำหรับโชว์ UI
 * โครงสร้าง field อ้างตาม Table 9 + receiving contract (schema 1.0)
 * บรรทัดสินค้า: [รายการ, qty, uom, unit_price, amount, receipt_line, receipt_qty, receipt_price, match_method]
 * ============================================================= */

/* รหัสย่อของบริษัท ↔ Tax ID (deriving จาก MASTER ไม่ hardcode ชื่อนิติบุคคล) */
const CO = {
  AH:  { tax: "0107545000213", name: "อาปิโก ไฮเทค" },
  AHT: { tax: "0145548001557", name: "อาปิโก ไฮเทค ทูลลิ่ง" },
  AHP: { tax: "0145548001549", name: "อาปิโก ไฮเทค พาร์ท" },
  AM:  { tax: "0135546008643", name: "เอเบิล มอเตอร์ส" },
  MGP: { tax: "0135564010484", name: "เอ็มจี เอเบิล มอเตอร์ส" },
  AMG: { tax: "", name: "เอ แมคชั่น (สถานะ UNKNOWN)" },
};
const ORG_SHORT = { 103: "APD", 352: "AHD", 175: "AHP", 376: "AM", 556: "MGP", 223: "AMG", 101: "AP-HQ" };

const DOCS = [
  {
    doc: "AIVA-2609-0001", ext: "DMS-2026-000123", inv: "IV6909245", po: "42052823", release: null,
    vendor: "ABC Supply Co., Ltd.", vtax: "0105542091823", org: 103, date: "2026-09-24",
    cur: "THB", sub: 2910, vat: 203.70, total: 3113.70, pages: 2, sigS: 1, sigR: 1, pc: true,
    rcv: "530340001", rcvs: ["530340001"], receiver: "SOMSAK JAIDEE", upl: "SOMSAK.J",
    lines: [
      ['HSS CENTRE DRILL A225 BS4 5/16"', 3, "PCS", 130, 390, 1, 3, 130, "M1"],
      ["CASTER WHEEL URETHANE-3\" (FIXED)", 4, "PCS", 310, 1240, 2, 4, 310, "M1"],
      ["CASTER WHEEL URETHANE-3\" (SWIVEL)", 4, "PCS", 320, 1280, 3, 4, 320, "M1"],
    ],
    rtotal: 2910, rules: R({}), codes: [], status: "Auto-pass", wf: "PENDING_REVIEW", proc: "Completed",
    round: 1, rev: 1, wfv: 0, dup: null,
    note: "ผ่านครบ 9 กฎ · จับคู่รายบรรทัดด้วย Item Code ทั้งหมด (M1)",
  },
  {
    doc: "AIVA-2609-0002", ext: "DMS-2026-000131", inv: "A631577", po: "40100303", release: "3",
    vendor: "Thai Steel Service Co., Ltd.", vtax: "0105538012244", org: 103, date: "2026-09-26",
    cur: "THB", sub: 18054, vat: 1263.78, total: 19317.78, pages: 2, sigS: 1, sigR: 0, pc: true,
    rcv: "530340112", rcvs: ["530340112"], receiver: "SOMSAK JAIDEE", upl: "SOMSAK.J",
    lines: [["SPH270C-OD 2.0 x 225 x COIL", 590, "KG", 30.6, 18054, 1, 590, 30.6, "M1"]],
    rtotal: 18054,
    rules: R({ "V-06": { result: F, code: "E26", severity: "High", page: 1, evidence: "ไม่พบลายเซ็นหรือตราประทับในช่องผู้รับของ (หน้า 1 ช่อง ผู้รับ)" } }),
    codes: ["E26"], status: "Hold", wf: "PENDING_REVIEW", proc: "Completed",
    round: 1, rev: 1, wfv: 0, dup: null,
    note: "ยอดเงินและจำนวนตรงใบรับทุกประการ · ติดเฉพาะลายเซ็นผู้รับของ",
  },
  {
    doc: "AIVA-2609-0003", ext: "DMS-2026-000140", inv: "INV-2609-0088", po: "40121082", release: null,
    vendor: "Precision Tools (Thailand) Co., Ltd.", vtax: "0105550017788", org: 352, date: "2026-09-25",
    cur: "THB", sub: 11040, vat: 772.80, total: 11812.80, pages: 1, sigS: 1, sigR: 1, pc: true,
    rcv: "540112231", rcvs: ["540112231"], receiver: "WILAIWAN SRISUK", upl: "WILAIWAN.S",
    lines: [["Carbide End Mill D10 x 75L", 12, "PCS", 920, 11040, 1, 10, 920, "M1"]],
    rtotal: 9200,
    rules: R({
      "V-08": { result: F, code: "E06", severity: "High", page: 1, evidence: "บรรทัด 1 วางบิล 12 PCS > รับจริง 10 PCS (ต่าง 2 PCS)" },
      "V-09": { result: F, code: "E31", severity: "High", page: 1, evidence: "subtotal บิล 11,040.00 vs Σ(รับจริง × ราคาใบรับ) 9,200.00" },
    }),
    codes: ["E06", "E31"], status: "Hold", wf: "PENDING_REVIEW", proc: "Completed",
    round: 1, rev: 1, wfv: 0, dup: null,
    note: "วางบิลเกินจำนวนรับจริง — ต้องให้ Receiver ยืนยันหรือวางบิลส่วนต่างรอบถัดไป",
  },
  {
    doc: "AIVA-2609-0004", ext: "DMS-2026-000152", inv: "SR6909-1142", po: "40120973", release: null,
    vendor: "S R Y Engineering & Trading", vtax: "0105556019902", org: null, date: "2026-09-27",
    cur: "THB", sub: 560, vat: 39.20, total: 599.20, pages: 1, sigS: 1, sigR: 1, pc: true,
    rcv: null, rcvs: [], receiver: null, upl: "SOMSAK.J",
    lines: [["ก๊าซ CO2 ขนาด 25 กก.", 2, "CYL", 280, 520, null, null, null, "—"]],
    rtotal: null, halted: "V-02",
    rules: R({
      "V-02": { result: F, code: "E28", severity: "High", page: 1, evidence: "บรรทัด 1: 2 × 280.00 = 560.00 แต่ระบุยอดเงิน 520.00 (ต่าง 40.00)" },
      "V-04": { result: N, halted_by: "V-02" }, "V-05": { result: N, halted_by: "V-02" },
      "V-07": { result: N, halted_by: "V-02" }, "V-08": { result: N, halted_by: "V-02" },
      "V-09": { result: N, halted_by: "V-02" },
    }),
    codes: ["E28"], status: "Hold", wf: "PENDING_REVIEW", proc: "Completed",
    round: 1, rev: 1, wfv: 0, dup: null,
    note: "E28 = Critical → ตามหลัก D3 ไม่เรียก Oracle ERP (Bypass) จึงไม่ได้ตรวจ V-04 ถึง V-09",
  },
  {
    doc: "AIVA-2609-0005", ext: "DMS-2026-000158", inv: "AM-2609-0412", po: "45008812", release: "12",
    vendor: "Siam Auto Parts Co., Ltd.", vtax: "0105547023311", org: 376, date: "2026-09-27",
    cur: "THB", sub: 42600, vat: 2982, total: 45582, pages: 2, sigS: 1, sigR: 1, pc: true,
    rcv: "560020415", rcvs: ["560020415"], receiver: "THANAKORN MANKONG", upl: "THANAKORN.M",
    lines: [["Brake Pad Set Front", 60, "SET", 710, 42600, 1, 60, 712.5, "M3"]],
    rtotal: 42750,
    rules: R({
      "V-07": {
        result: F, code: "E12", severity: "Medium", page: 1,
        evidence: "UOM ในบิล SET ≠ PCS ในใบรับ · ราคา 710.00 vs 712.50 ต่าง 0.35% (ในกรอบ ≤1% และ ≤200)",
      },
      "V-09": { result: F, code: "E29", severity: "Low", page: 1, evidence: "ราคาต่อหน่วยต่าง 2.50/หน่วย รวม 150.00 บาท อยู่ในกรอบยอมรับ" },
    }),
    codes: ["E12", "E29"], status: "Review", wf: "PENDING_REVIEW", proc: "Completed",
    round: 1, rev: 1, wfv: 0, dup: null,
    note: "ไม่มี High → ไม่ Hold · มี Medium (E12 UOM) → Review",
  },
  {
    doc: "AIVA-2609-0006", ext: "DMS-2026-000161", inv: "TK-2609-0120", po: "40121210", release: null,
    vendor: "Sanwa Precision Tools Co., Ltd.", vtax: "0105551008877", org: 352, date: "2026-09-28",
    cur: "THB", sub: 18400, vat: 1288, total: 19688, pages: 1, sigS: 1, sigR: 1, pc: true,
    rcv: null, rcvs: [], receiver: null, upl: "WILAIWAN.S",
    lines: [["Carbide Drill D8", 20, "PCS", 920, 18400, null, null, null, "—"]],
    rtotal: null, halted: "V-04",
    rules: R({
      "V-04": { result: F, code: "E17", severity: "High", page: 1, evidence: "Oracle MCP ไม่คืนแถว: query ด้วย Tax ID ผู้ขาย + TK-2609-0120 แล้ว fallback ด้วย PO 40121210" },
      "V-05": { result: N, halted_by: "V-04" }, "V-07": { result: N, halted_by: "V-04" },
      "V-08": { result: N, halted_by: "V-04" }, "V-09": { result: N, halted_by: "V-04" },
    }),
    codes: ["E17"], status: "Hold", wf: "PENDING_REVIEW", proc: "Completed",
    round: 1, rev: 1, wfv: 0, dup: null,
    note: "ยังไม่พบการรับของใน ERP — เอกสารไม่มี Receiver ระบบจึงมอบหมายบัญชี (RERUN ได้)",
  },
  {
    doc: "AIVA-2609-0007", ext: "DMS-2026-000170", inv: "MG-2609-0009", po: "48000121", release: null,
    vendor: "Metro Supply Co., Ltd.", vtax: "0105553024466", org: 223, date: "2026-09-29",
    cur: "THB", sub: 5400, vat: 378, total: 5778, pages: 1, sigS: 1, sigR: 1, pc: true,
    rcv: "580001120", rcvs: ["580001120"], receiver: "NARONG PHOLSRI", upl: "NARONG.P",
    lines: [["Service Kit", 3, "SET", 1800, 5400, 1, 3, 1800, "M1"]],
    rtotal: 5400,
    rules: R({
      "V-05": { result: M, manual_review: true, page: 1, evidence: "ORG_ID 223 (เอ แมคชั่น) มีสถานะ UNKNOWN และ Tax ID ว่างใน Master — ไม่สามารถตัดสินแบบ exact match ได้" },
    }),
    codes: [], status: "Manual Review", wf: "PENDING_REVIEW", proc: "Completed",
    round: 1, rev: 1, wfv: 0, dup: null,
    note: "fail-safe ตามหลัก D6: master ไม่พร้อม ห้าม Auto-pass → ส่งตรวจด้วยคน 100%",
  },
  {
    doc: "AIVA-2609-0008", ext: "DMS-2026-000163", inv: "PL-2609-0055", po: "43042811", release: null,
    vendor: "NX Shoji (Thailand) Co., Ltd.", vtax: "0105549030055", org: 103, date: "2026-09-28",
    cur: "THB", sub: 31000, vat: 2170, total: 33170, pages: 3, sigS: 1, sigR: 1, pc: true,
    rcv: "530340201", rcvs: ["530340201"], receiver: "PRAPHAN KAEWKLA", upl: "PRAPHAN.K",
    lines: [["Plastic Pallet 1100x1100", 50, "PCS", 620, 31000, 1, 50, 620, "M1"]],
    rtotal: 31000, rules: R({}), codes: [], status: "Auto-pass", wf: "PENDING_REVIEW", proc: "Completed",
    round: 1, rev: 1, wfv: 0, dup: "AIVA-2609-0009",
    note: "ผู้ขาย + เลขที่ใบแจ้งหนี้ซ้ำกับ AIVA-2609-0009 · Portal คุมไว้ก่อนแม้ผลตรวจจะ Auto-pass",
  },
  {
    doc: "AIVA-2609-0009", ext: "DMS-2026-000164", inv: "PL-2609-0055", po: "43042811", release: null,
    vendor: "NX Shoji (Thailand) Co., Ltd.", vtax: "0105549030055", org: 103, date: "2026-09-28",
    cur: "THB", sub: 31000, vat: 2170, total: 33170, pages: 3, sigS: 1, sigR: 1, pc: true,
    rcv: "530340201", rcvs: ["530340201"], receiver: "PRAPHAN KAEWKLA", upl: "PRAPHAN.K",
    lines: [["Plastic Pallet 1100x1100", 50, "PCS", 620, 31000, 1, 50, 620, "M1"]],
    rtotal: 31000, rules: R({}), codes: [], status: "Auto-pass", wf: "REJECTED", proc: "Completed",
    round: 1, rev: 1, wfv: 2, dup: "AIVA-2609-0008",
    note: "ถูกปฏิเสธด้วยเหตุผล DUPLICATE_BILLING · ปิดเอกสารแล้ว (immutable snapshot)",
  },
  {
    doc: "AIVA-2609-0010", ext: "DMS-2026-000177", inv: "ST-2609-0301", po: null, release: null,
    vendor: "Siam Tool & Hardware Co., Ltd.", vtax: "", org: 175, date: "2026-09-30",
    cur: "THB", sub: 7350, vat: 514.50, total: 7864.50, pages: 1, sigS: 1, sigR: 1, pc: true,
    rcv: "570030055", rcvs: ["570030055"], receiver: "SOMSAK JAIDEE", upl: "SOMSAK.J",
    lines: [["Grinding Wheel WA60-KV 250x25x50", 15, "PCS", 490, 7350, 1, 15, 490, "M2"]],
    rtotal: 7350,
    rules: R({
      "V-01": { result: F, code: "E13", severity: "Medium", page: 1, evidence: "ขาด po_number และ supplier_tax_id (Vision อ่านไม่พบในเอกสาร)", matched: "PO มาจากการค้นใบรับย้อนหลัง" },
      "V-07": { result: F, code: "E29", severity: "Low", page: 1, evidence: "บรรทัด 1 จับคู่ด้วย M2 (เลขบรรทัด) เพราะไม่มี item code ใน description" },
    }),
    codes: ["E13", "E29"], status: "Review", wf: "PENDING_REVIEW", proc: "Completed",
    round: 1, rev: 1, wfv: 0, dup: null,
    note: "E13 เป็น code ที่ engine มอบให้ user ทำ (ต้องส่ง PO ที่ถูกต้องแล้ว resubmit)",
  },
  {
    doc: "AIVA-2609-0011", ext: "DMS-2026-000181", inv: "MGP-2609-0044", po: "48000301", release: "2",
    vendor: "Bangkok Rubber Industry Co., Ltd.", vtax: "0105544015522", org: 556, date: "2026-10-01",
    cur: "THB", sub: 24000, vat: 1680, total: 25680, pages: 2, sigS: 1, sigR: 1, pc: true,
    rcv: "580001220", rcvs: ["580001220", "580001221"], receiver: "THANAKORN MANKONG", upl: "THANAKORN.M",
    lines: [
      ["Seal Ring NBR 70 ID32", 200, "PCS", 60, 12000, 1, 120, 60, "M1"],
      ["O-Ring FKM 25x2.5", 100, "PCS", 120, 12000, 2, 80, 120, "M1"],
    ],
    rtotal: 19200,
    rules: R({
      "V-04": { result: F, code: "E35", severity: "High", page: 1, evidence: "พบ 2 receipt number (580001220, 580001221) ในบิลเดียวกัน" },
      "V-08": { result: F, code: "E06", severity: "High", page: 1, evidence: "บรรทัด 1 วางบิล 200 PCS > รับจริง 120 PCS" },
      "V-09": { result: F, code: "E31", severity: "High", page: 1, evidence: "subtotal บิล 24,000.00 vs ยอดรับ 19,200.00 (ต่าง 4,800.00)" },
    }),
    codes: ["E35", "E06", "E31"], status: "Hold", wf: "PENDING_REVIEW", proc: "Completed",
    round: 1, rev: 1, wfv: 0, dup: null,
    note: "หลายใบรับ + วางบิลเกิน · E35/E06 มอบให้ user, E31 มอบให้บัญชี",
  },
  {
    doc: "AIVA-2609-0012", ext: "DMS-2026-000184", inv: "AP-2609-0207", po: "40121500", release: null,
    vendor: "Hi-Tech Consumables Co., Ltd.", vtax: "0105552018899", org: 103, date: "2026-10-01",
    cur: "THB", sub: 14285.72, vat: 1000.00, total: 15285.72, pages: 1, sigS: 1, sigR: 1, pc: true,
    rcv: "530340330", rcvs: ["530340330"], receiver: "SOMSAK JAIDEE", upl: "SOMSAK.J",
    lines: [
      ["Nitrile Glove Size L (กล่อง 100)", 120, "BOX", 95.2133, 11425.60, 1, 120, 95.2133, "M1"],
      ["Isopropyl Alcohol 99% 4L", 40, "CAN", 71.503, 2860.12, 2, 40, 71.503, "M1"],
    ],
    rtotal: 14285.72,
    rules: R({
      "V-03": { result: P, code: "E16", severity: "Low", page: 1, evidence: "VAT คำนวณได้ 1,000.0004 ปัดเป็น 1,000.00 (ต่าง 0.0004 ≤ 1.00)" },
    }),
    codes: ["E16"], status: "Auto-pass", wf: "PENDING_REVIEW", proc: "Completed",
    round: 1, rev: 1, wfv: 0, dup: null,
    note: "E16 = Low → ยัง Auto-pass ตามลำดับ decision ของ engine",
  },
  {
    doc: "AIVA-2609-0013", ext: "DMS-2026-000186", inv: "PT-2609-0512", po: "40121622", release: "7",
    vendor: "Precision Parts Sourcing Co., Ltd.", vtax: "0105557021133", org: 175, date: "2026-10-02",
    cur: "THB", sub: 96000, vat: 6720, total: 102720, pages: 4, sigS: 1, sigR: 1, pc: true,
    rcv: "570030210", rcvs: ["570030210"], receiver: "WILAIWAN SRISUK", upl: "WILAIWAN.S",
    lines: [
      ["Bracket Assy RH 52100-1C030", 40, "PCS", 1500, 60000, 1, 40, 1500, "M1"],
      ["Bracket Assy LH 52100-1C040", 24, "PCS", 1500, 36000, 2, 40, 1500, "M1"],
    ],
    rtotal: 96000,
    rules: R({
      "V-08": { result: F, code: "E34", severity: "Medium", page: 2, evidence: "บรรทัด 2 วางบิล 24 PCS < รับจริง 40 PCS → วางบิลบางส่วน (รอบนี้ส่วนที่เหลือ 16 PCS)" },
    }),
    codes: ["E34"], status: "Review", wf: "ON_HOLD", proc: "Completed",
    round: 2, rev: 2, wfv: 3, dup: null,
    note: "รอบที่ 2 หลัง resubmit · รอบ 1 ติด E30 (จับคู่บรรทัดไม่ได้) ผู้ขายแก้ description แล้ว",
    prevRev: { rev: 1, round: 1, status: "Hold", codes: ["E30"], closed: "resubmit · RC=OCR_MISREAD · ส่งตรวจซ้ำเมื่อ 02/10 09:12" },
  },
  {
    doc: "AIVA-2609-0014", ext: "DMS-2026-000188", inv: "EM-2609-0021", po: "40121700", release: null,
    vendor: "Eastern Metal Works Co., Ltd.", vtax: "0105558012200", org: 103, date: "2026-10-02",
    cur: "THB", sub: 1523400, vat: 106638, total: 1630038, pages: 9, sigS: 1, sigR: 1, pc: true,
    rcv: "530340400", rcvs: ["530340400"], receiver: "SOMSAK JAIDEE", upl: "SOMSAK.J",
    lines: [["ชิ้นงาน Sheet Metal หลายรายการ (64 บรรทัด)", 64, "JOB", 23803.125, 1523400, "1-64", 64, 23803.125, "M4"]],
    rtotal: 1523400,
    rules: R({
      "V-04": { result: M, manual_review: true, page: 1, evidence: "ใบรับมี 64 แถว ≥ 50 แถว → engine ส่ง Manual Review ตาม policy" },
      "V-07": { result: M, manual_review: true, page: 1, evidence: "มีการจับคู่แบบ M4 (fallback แถวแรกของ receipt) ซึ่งอาจจับคู่ผิด — ต้องตรวจด้วยคน" },
    }),
    codes: [], status: "Manual Review", wf: "PENDING_REVIEW", proc: "Completed",
    round: 1, rev: 1, wfv: 0, dup: null,
    note: "ข้อจำกัดที่รู้ของ V-07 M4 fallback: ใช้ receipt row ซ้ำได้ ต้องมี one-to-one policy",
  },
  {
    doc: "AIVA-2609-0015", ext: "DMS-2026-000190", inv: "AB-2609-0333", po: "45008900", release: "1",
    vendor: "Auto Brush & Fastener Co., Ltd.", vtax: "0105546030011", org: 376, date: "2026-10-02",
    cur: "THB", sub: 8400, vat: 588, total: 8988, pages: 1, sigS: 1, sigR: 1, pc: false,
    rcv: "560020500", rcvs: ["560020500"], receiver: "THANAKORN MANKONG", upl: "THANAKORN.M",
    lines: [["Carbon Brush CB-45", 30, "PCS", 280, 8400, 1, 30, 280, "M1"]],
    rtotal: 8400,
    rules: R({
      "V-01": { result: F, code: "E13", severity: "Medium", page: 1, evidence: "Vision อ่านได้เพียงหน้า 1 ของ 2 หน้า (pages_complete = false) → ห้ามสรุปว่าครบ" },
    }),
    codes: ["E13"], status: "Review", wf: "RESUBMITTED", proc: "Running",
    round: 2, rev: 2, wfv: 1, dup: null,
    note: "รอ snapshot รอบใหม่จาก producer (action outbox ยัง not completed) · ผลที่แสดงคือ snapshot ล่าสุด",
    prevRev: { rev: 1, round: 1, status: "Review", codes: ["E13"], closed: "rerun โดย ปณิดาฯ · ยังไม่ได้รับ revision ใหม่" },
  },
  {
    doc: "AIVA-2609-0016", ext: "DMS-2026-000192", inv: "SV-2610-0007", po: "40121808", release: null,
    vendor: "Saha Vendorn Co., Ltd.", vtax: "0105559017744", org: 352, date: "2026-10-03",
    cur: "THB", sub: 1200, vat: 84, total: 1284, pages: 1, sigS: 1, sigR: 1, pc: true,
    rcv: "540112400", rcvs: ["540112400"], receiver: "WILAIWAN SRISUK", upl: "WILAIWAN.S",
    lines: [["บริการล้างเครื่อง CNC", 1, "JOB", 1200, 1200, 1, 1, 1200, "M3"]],
    rtotal: 1200,
    rules: R({ "V-01": { result: N }, "V-02": { result: N }, "V-03": { result: N }, "V-04": { result: N }, "V-05": { result: N }, "V-06": { result: N }, "V-07": { result: N }, "V-08": { result: N }, "V-09": { result: N } }),
    codes: [], status: "Manual Review", wf: "PENDING_REVIEW", proc: "Failed",
    round: 1, rev: 1, wfv: 0, dup: null, error: "aiva-error",
    note: "pipeline ล้มก่อนออก Table 9 (LiteLLM timeout) → fail-safe ตามหลัก D6 ห้าม Auto-pass",
  },
];

/* สถานะ workflow ที่ portal รองรับ (คนละแกนกับผลตรวจของ engine) */
const WF_LABEL = {
  PENDING_REVIEW: "รอตรวจสอบ", CONFIRMED: "ยืนยันแล้ว", REJECTED: "ปฏิเสธแล้ว",
  ON_HOLD: "ระงับ", RESUBMITTED: "ส่งตรวจซ้ำแล้ว", POSTED: "ตั้งหนี้แล้ว",
};

/* เหตุการณ์ audit เริ่มต้น (immutable ในระบบจริง — ที่นี่เป็นตัวอย่างโชว์) */
const AUDIT0 = [
  { t: "2026-10-03 08:41:02", who: "panida.r@aapico.com", role: "เจ้าหน้าที่บัญชี", act: "rerun", doc: "AIVA-2609-0015", res: "202 Accepted · outbox REQ-8842 รอ revision ใหม่", wf: 0 },
  { t: "2026-10-03 08:12:55", who: "kamonwan.j@aapico.com", role: "เจ้าหน้าที่บัญชี", act: "confirm", doc: "AIVA-2609-0012", res: "409 Conflict · expected_workflow_version เก่า → โหลดสถานะใหม่", wf: 0 },
  { t: "2026-10-02 16:05:19", who: "somchai.w@aapico.com", role: "หัวหน้าฝ่ายบัญชี", act: "reject", doc: "AIVA-2609-0009", res: "200 OK · reason DUPLICATE_BILLING · wf_version 1→2", wf: 1 },
  { t: "2026-10-02 09:12:40", who: "wilaiwan.s@aapico.com", role: "ผู้ใช้งาน (Receiver)", act: "resubmit", doc: "AIVA-2609-0013", res: "202 Accepted · revision 1→2 · ตรวจรอบ 2 ผ่านเป็น Review", wf: 2 },
  { t: "2026-10-01 11:03:07", who: "system@aapico.com", role: "ระบบ", act: "ingest", doc: "AIVA-2609-0011", res: "201 Created · event_id EV-20261001-11 · idempotent hit = false", wf: 0 },
];

/* คำขอ action ที่ยังไม่ปิด (action outbox) */
const OUTBOX0 = [
  { req: "REQ-8842", doc: "AIVA-2609-0015", action: "rerun", by: "panida.r@aapico.com", at: "2026-10-03 08:41:02", state: "waiting_revision", note: "ขอ scan ใหม่ครบ 2 หน้า", reason: "OCR_MISREAD", exp_rev: 2 },
  { req: "REQ-8836", doc: "AIVA-2609-0013", action: "resubmit", by: "wilaiwan.s@aapico.com", at: "2026-10-02 09:12:40", state: "completed", note: "ผู้ขายแก้ description ให้มี part number", reason: "RCV_NOT_FOUND", exp_rev: 2 },
];

/* ค่าตั้งต้นของ screen เมื่อเปิดไฟล์ครั้งแรก */
const BOOT = { user: "u4", page: "queue", doc: "AIVA-2609-0003" };
