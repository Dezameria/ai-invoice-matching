/* =============================================================
 * AIVA Invoice Portal v3 mockup — domain reference (hand-written)
 * Sources: docs/matching-rules-standard-v6.2.md,
 *          OCR service/n8n/app/core/rules.py,
 *          Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html,
 *          Web portal/.agents/skills/aiva-invoice-core/references/core-domain.md
 * ค่าในไฟล์นี้เป็น "as-built" ของ rules engine ไม่ใช่มาตรฐานที่รับรองแล้ว
 * ============================================================= */

/* shorthands สำหรับค่าที่ซ้ำกันบ่อย */
const P = "pass", F = "fail", N = "not_evaluated", M = "manual_review";

/* ขั้นตอนการตรวจ 3 STEP ตาม engine (RSTEP ใน mockup v4.4) */
const STEP_NAMES = [
  "STEP 1 สกัดและตรวจเอกสารในตัวเอง",
  "STEP 2 ค้นใบรับและนิติบุคคล (Oracle + Master)",
  "STEP 3 เทียบรายบรรทัด จำนวน และยอดรวม",
];

/* กฎ V-01..V-09 ตามโค้ดจริง (ไม่ใช้คำอธิบายใน docs ที่ยังขัดแย้งกัน) */
const RULES = [
  { id: "V-01", step: 1, name: "ฟิลด์บังคับครบถ้วน",
    check: "ต้องมี invoice_num, invoice_date, supplier_name+tax_id, customer name/tax_id, po_number, line items และหน้าเอกสารครบ",
    codes: ["E13"], src: "rules.py:225" },
  { id: "V-02", step: 1, name: "เลขคณิตรายบรรทัด",
    check: "abs(qty × unit_price − amount) ≤ 0.50 ทุกบรรทัด · พบกินกรอบ = Critical และ Bypass การเรียก Oracle ทั้งหมด (หลัก D3)",
    codes: ["E28"], src: "rules.py:245" },
  { id: "V-03", step: 1, name: "เลขคณิตทั้งเอกสาร",
    check: "sum(lines) vs subtotal ≤ 0.50 · VAT 7% ต่าง ≤ 1.00 · subtotal+VAT vs grand ≤ 0.50 · เกินกรอบ = E31, ต่างในกรอบ = E16 (Low)",
    codes: ["E31", "E16"], src: "rules.py:260" },
  { id: "V-06", step: 1, name: "ลายเซ็นผู้ส่ง/ผู้รับ",
    check: "ไม่พบลายเซ็นผู้รับของ = E26 High · ไม่พบลายเซ็นผู้ส่งของ = E26 Medium · หน้าไม่ครบถูกจัดการที่ V-01",
    codes: ["E26"], src: "rules.py:273" },
  { id: "V-04", step: 2, name: "พบใบรับใน Oracle ERP",
    check: "ต้องมี receipt ที่ qty > 0 · ไม่พบ = E17 High · พบหลาย receipt number = E35 High ·แถว ≥ 50 = MANUAL",
    codes: ["E17", "E35"], src: "rules.py:311" },
  { id: "V-05", step: 2, name: "นิติบุคคลลูกค้าตรงกับ Master",
    check: "map ORG_ID → entity ที่ ACTIVE, Tax ID ตรง 100%, รหัสไปรษณีย์/สาขาอยู่ใน address · ไม่ตรง = E09 · master ไม่พร้อม/กำกวม = Manual Review",
    codes: ["E09"], src: "rules.py:340" },
  { id: "V-07", step: 3, name: "จับคู่รายบรรทัด + ราคา + UOM",
    check: "บันได M1 item code ใน description → M2 line number → M3 description token → M4 fallback แถวแรกของ receipt · ไม่พบคู่ = E30 · ราคาเกินกรอบ = E05 · UOM ต่าง = E12 · ราคาต่างในกรอบ (≤1% และ ≤200) = E29 Low",
    codes: ["E30", "E05", "E12", "E29"], src: "rules.py:388",
    warn: "M4 fallback อาจจับคู่ผิดและใช้ receipt row ซ้ำ — ต้องมี ambiguity/one-to-one policy ก่อน production" },
  { id: "V-08", step: 3, name: "จำนวนที่วางบิล vs รับจริง",
    check: "qty ในบิล > จำนวนรับจริง = E06 High · น้อยกว่า = E34 Medium (partial billing)",
    codes: ["E06", "E34"], src: "rules.py:437" },
  { id: "V-09", step: 3, name: "ยอดรวมเทียบใบรับ",
    check: "abs(invoice subtotal − Σ(received qty × receipt unit price)) ≤ 0.50 · เกินกรอบ = E31 High",
    codes: ["E31"], src: "rules.py:470" },
];
const RSTEP = Object.fromEntries(RULES.map(r => [r.id, r.step]));
const RULE_NAME = Object.fromEntries(RULES.map(r => [r.id, r.name]));

/* ลำดับ decision ของ engine (core-domain.md §4) */
function decide(rules) {
  if (rules.some(r => r.result === M || r.manual_review)) return "Manual Review";
  if (rules.some(r => r.result === F && r.severity === "High")) return "Hold";
  if (rules.some(r => r.result === F && r.severity === "Medium")) return "Review";
  return "Auto-pass";
}
/* engine มอบหมายงาน: code เหล่านี้ไป user (Receiver), นอกนั้น accounting */
function ownerOf(codes) {
  return codes.some(c => USER_TASK_CODES.includes(c)) ? "user" : "accounting";
}

/* helper สร้าง rules array ครบ 9 กฎ โดย default = pass (Table 9 ต้องครบ 9 ข้อ) */
const R = o => STANDARD_RULES.map(id => Object.assign({ rule_id: id, result: P, code: null, severity: null, evidence: "", page: null }, o[id] || {}));

/* สิทธิ์และบทบาท (อ้างจาก mockup v4.4 — ฝั่ง backend ยังไม่ได้บังคับใช้จริง) */
const PERM = {
  VIEW_OWN: "ดูเอกสารที่ตนเป็น Receiver",
  VIEW_CO: "ดูเอกสารทั้งบริษัทที่ได้รับมอบหมาย",
  DMS: "เปิดเอกสารต้นทางจาก DMS",
  RERUN: "สั่ง AIVA ตรวจซ้ำ (เอกสารไม่มี Receiver)",
  RESUBMIT: "แก้ไขและส่งตรวจซ้ำ",
  EXPLAIN: "ชี้แจงข้อสังเกต",
  CONFIRM: "ยืนยัน / Hold / ปฏิเสธ / ส่งกลับ",
  POST: "ส่งเข้า AP Interface",
  MAP: "จัดการการเชื่อมบัญชีและสิทธิ์",
  AUDIT: "ดูบันทึกการเข้าถึง",
};
const ROLES = {
  EU:  { n: "ผู้ใช้งาน (Receiver)",       c: "#C2410C", bg: "#FFF1E3", p: ["VIEW_OWN", "DMS", "RESUBMIT", "EXPLAIN"], scope: "receiver" },
  ACC: { n: "เจ้าหน้าที่บัญชี",            c: "#1E8A5F", bg: "#E3F4E8", p: ["VIEW_CO", "DMS", "CONFIRM", "RERUN"],      scope: "company" },
  APR: { n: "หัวหน้าฝ่ายบัญชี",           c: "#1E6FB2", bg: "#E8F1FB", p: ["VIEW_CO", "DMS", "CONFIRM", "RERUN", "POST", "AUDIT"], scope: "company" },
  ADM: { n: "ผู้ดูแลระบบ (IT)",           c: "#7A4A9E", bg: "#F2E9F8", p: ["MAP", "AUDIT"], scope: "none" },
};
/* Portal user ↔ Entra ID ↔ RECEIVER ใน Oracle (RCV_VRC_HDS_V จาก EMPLOYEE_ID) ↔ บริษัท */
const USERS = [
  { id: "u1", n: "สมศักดิ์ ใจดี",     email: "somsak.j@aapico.com",  role: "EU",  rcv: "SOMSAK JAIDEE",     emp: 10231, co: ["AH"],            unit: "คลังวัตถุดิบ" },
  { id: "u2", n: "วิไลวรรณ ศรีสุข",   email: "wilaiwan.s@aapico.com", role: "EU",  rcv: "WILAIWAN SRISUK",   emp: 20417, co: ["AHT"],           unit: "ฝ่ายซ่อมบำรุง" },
  { id: "u3", n: "ธนากร มั่นคง",       email: "thanakorn.m@aapico.com", role: "EU", rcv: "THANAKORN MANKONG", emp: 30552, co: ["AM", "MGP"],     unit: "คลังอะไหล่" },
  { id: "u4", n: "ปณิดา รักงาน",       email: "panida.r@aapico.com",  role: "ACC", rcv: "—",                 emp: 11020, co: ["AH", "AHT"],     unit: "ฝ่ายบัญชี AH/AHT" },
  { id: "u5", n: "กมลวรรณ ใจงาม",      email: "kamonwan.j@aapico.com", role: "ACC", rcv: "—",                emp: 31005, co: ["AM", "AHP", "MGP"], unit: "ฝ่ายบัญชี AM/AHP/MGP" },
  { id: "u6", n: "สมชาย วงศ์ทอง",      email: "somchai.w@aapico.com", role: "APR", rcv: "—",                 emp: 11001, co: ["AH", "AHT", "AHP", "AM", "MGP"], unit: "หัวหน้าฝ่ายบัญชี" },
  { id: "u7", n: "อนุชา ไอที",          email: "anucha.i@aapico.com",  role: "ADM", rcv: "—",                 emp: null,  co: [],                unit: "IT" },
];

/* Action ของ workflow ตาม receiving contract */
const ACTIONS = {
  explain:  { n: "ชี้แจง",            perm: "EXPLAIN",  needNote: true,  opensOutbox: false, cls: "bg" },
  resubmit: { n: "ส่งตรวจซ้ำ",        perm: "RESUBMIT", needNote: true,  opensOutbox: true,  cls: "bt" },
  rerun:    { n: "ให้ AIVA ตรวจใหม่",  perm: "RERUN",    needNote: true,  opensOutbox: true,  cls: "bt" },
  return:   { n: "ส่งกลับผู้ขาย",      perm: "CONFIRM",  needNote: true,  opensOutbox: false, cls: "bw" },
  hold:     { n: "ระงับ",              perm: "CONFIRM",  needNote: true,  opensOutbox: false, cls: "bw" },
  reject:   { n: "ปฏิเสธ",             perm: "CONFIRM",  needNote: true,  opensOutbox: false, cls: "br" },
  confirm:  { n: "ยืนยันและส่ง AP",     perm: "CONFIRM",  needNote: false, opensOutbox: false, cls: "bp" },
};
const REASON_CODES = [
  "RCV_WRONG_ORG", "RCV_NOT_FOUND", "RCV_QTY_PARTIAL", "PRICE_NOT_UPDATED",
  "SIG_MISSING_ON_SCAN", "PO_AMEND_REQUIRED", "DUPLICATE_BILLING", "OCR_MISREAD", "OTHER",
];

/* รหัสในเอกสารมาตรฐาน v6.2 ฉบับ docs (คนละชุดกับ as-built) — เก็บไว้แสดงช่องขัดแย้งเท่านั้น */
const EXC_DOCS = {
  E05: "ไม่พบเลขที่ใบกำกับภาษี / ใบแจ้งหนี้ (Critical)",
  E06: "ไม่พบเลขที่ใบสั่งซื้อ PO Number (High)",
  E07: "ไม่พบวันที่เอกสาร (Medium)",
  E08: "ไม่พบเลขผู้เสียภาษีของผู้ขาย (Critical)",
  E09: "ไม่พบเลขผู้เสียภาษีของผู้ซื้อ (Critical)",
  E15: "Tax ID ผู้ซื้อไม่ตรงกับ Master 27 บริษัท (Critical)",
  E16: "ที่อยู่/สาขาผู้ซื้อไม่ตรงกับทะเบียน (Medium)",
  E17: "ไม่พบ Goods Receipt ใน Oracle EBS (Critical)",
  E19: "รหัส/คำอธิบายสินค้าไม่ตรงกับใบรับ (High)",
  E21: "จำนวนในบิลเกินจำนวนรับจริง (Critical)",
  E22: "ราคาต่อหน่วยสูงกว่า PO/Receipt (Critical)",
  E26: "ขาดลายเซ็นผู้รับ/ผู้ส่ง (Medium)",
  E27: "VAT 7% หรือยอด VAT ไม่ถูกต้อง (High)",
  E28: "Line Math Error — Bypass ERP (Critical)",
  E29: "Subtotal + VAT ≠ Grand Total (Critical)",
  E35: "พบใบรับซ้ำซ้อน/ไม่สอดคล้องงวดบิล (High)",
};

/* ตารางรหัส 6.2 as-built เทียบกับที่ docs/mockup ระบุ — ห้าม relabel ข้อมูลเก่าเป็นรุ่นใหม่ */
const CODE_MAP = [
  { topic: "V-01 ฟิลด์บังคับขาด", docs: "แจก E05–E09 ตามฟิลด์", asBuilt: "รวมเป็น E13 Medium", owner: "user" },
  { topic: "V-03 ยอดรวมเอกสารผิด", docs: "E27 / E29",            asBuilt: "E31 High + E16 Low (เศษปัดเศษ)", owner: "accounting" },
  { topic: "V-05 นิติบุคคลไม่ตรง", docs: "E15 / E16",             asBuilt: "E09 (High ถ้า Tax ID ไม่ตรง, Medium ถ้าที่อยู่ไม่ตรง)", owner: "accounting" },
  { topic: "V-07 จับคู่/ราคา",       docs: "E19 Item mismatch",    asBuilt: "E30 ไม่พบบรรทัด / E05 ราคาเกินกรอบ / E12 UOM / E29 ในกรอบ", owner: "ผสม" },
  { topic: "V-08 จำนวน",             docs: "E21 Over-billed",      asBuilt: "E06 High เกินรับจริง / E34 Medium วางบิลบางส่วน", owner: "user" },
  { topic: "V-09 ยอดรวมเทียบใบรับ",  docs: "E22 ราคา (V-09 = ราคา)", asBuilt: "E31 High (V-09 = เทียบ subtotal ใบรับ)", owner: "accounting" },
  { topic: "เลขมาตรฐาน",             docs: "mockup ใช้ v6.6 / schema 1.5", asBuilt: "engine 6.2 · Portal schema 1.0", owner: "—" },
];

/* ความขัดแย้งของ “ข้อมูลจริง” ที่ตรวจพบระหว่างแหล่ง — portal ต้องไม่เดาแทนผู้ใช้ */
const DATA_CONFLICTS = [
  {
    k: "Tax ID ของบริษัท อาปิโก ไฮเทค",
    a: "Mockup v4.4 (ตารางที่ 4): 0107545000179",
    b: "Master data ใน rules engine: 0107545000213 (org 101/102/103/104)",
    act: "ต้องให้ฝ่ายบัญชี/MDG ยืนยันเลขที่ถูกต้องก่อนเปิด V-05 แบบ production",
  },
  {
    k: "ORG_ID 222 (mockup เขียนว่า AHR ภายใต้ AH)",
    a: "Mockup v4.4 ระบุ orgs ของ AH = [103, 222]",
    b: "ไม่มี ORG 222 ใน Master (มี 223/224 “เอ แมคชั่น” สถานะ UNKNOWN)",
    act: "V-05 ต้อง fail-safe เป็น Manual Review ไม่ใช่ Auto-pass",
  },
  {
    k: "ORG_ID 196 (mockup เขียนว่า AHT)",
    a: "Mockup v4.4 ระบุ orgs ของ AHT = [352, 196]",
    b: "ไม่มี ORG 196 ใน Master (OU ของทูลลิ่งคือ 195, inventory org คือ 352)",
    act: "แก้ mapping หรือเพิ่ม master ก่อนใช้จริง",
  },
  {
    k: "ORG_ID 556",
    a: "Mockup v4.4 แสดงเป็น “ไม่ระบุบริษัท / Tax ID —”",
    b: "Master ระบุ 556 = เอ็มจี เอเบิล มอเตอร์ส, Tax 0135564010484, ACTIVE, OU 555",
    act: "ให้ portal อ่าน Master Data ชุดเดียว แล้วสร้าง versioned mapping table",
  },
  {
    k: "จำนวนหน้าที่ Vision อ่านได้",
    a: "Portal รับ PDF สูงสุด 500 หน้า",
    b: "Vision extractor แปลงสูงสุด 4 หน้า",
    act: "เอกสารที่อ่านไม่ครบต้องไม่ Auto-pass (ต้องนิยาม pages_complete)",
  },
  {
    k: "เลขทศนิยม",
    a: "Portal ใช้ Decimal",
    b: "OCR core ใช้ float",
    act: "กำหนด rounding/precision ที่ boundary ก่อนส่งงานการเงินจริง",
  },
];

/* แหล่งที่มาของข้อมูลแต่ละชุดใน mockup นี้ */
const PROVENANCE = [
  ["MASTER (นิติบุคคล 48 แถว / OU)", "OCR service/n8n/app/core/master_data.py — สร้างด้วย tools/build-domain-data.py"],
  ["EXC62 + USER_TASK_CODES", "master_data.py: VALID_EXCEPTION_CODES, USER_TASK_CODES"],
  ["เกณฑ์ V-01..V-09", "OCR service/n8n/app/core/rules.py (as-built)"],
  ["บทบาท/สิทธิ์/ผู้ใช้", "Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html"],
  ["เลขเอกสาร ผู้ขาย PO ใบรับ", "Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html (ข้อมูลสังเคราะห์)"],
  ["ชื่อ field JSON / workflow", "Web portal/invoice-web-9054076/docs/04-receiving-api.md, invoice-webV2 mock types"],
  ["ตารางขัดแย้งมาตรฐาน", "Web portal/.agents/skills/aiva-invoice-core/references/core-domain.md §6"],
];
