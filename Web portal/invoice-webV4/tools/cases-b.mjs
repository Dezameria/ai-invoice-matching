/** cases-b.mjs — เคส 0007–0012 */
import { row, ln, sig, ORG } from "./cases-shared.mjs";

export const CASES_B = [
  {
    id: "AIVA-2609-0007",
    dms: "DMS-2026-000170",
    title: "ORG_ID 223 สถานะ UNKNOWN ใน master → V-05 = manual_review (fail-safe ห้าม Auto-pass)",
    expect: { status: "Manual Review", codes: [], assigned: "accounting" },
    actor: { uploadedBy: "NARONG.P", receiver: "NARONG PHOLSRI" },
    rounds: [
      {
        receivedAt: "2026-09-29T09:02:00+07:00",
        pages: 1,
        invoice: {
          invoice_num: "MG-2609-0009",
          invoice_date: "29/09/2026",
          supplier_name: "Metro Supply Co., Ltd.",
          supplier_tax_id: "0105557004411",
          customer_name: "บริษัท เอ แมคชั่น จำกัด",
          customer_address: "99 Moo 1 Hi-tech Industrial Estate 13160",
          customer_tax_id: "0107547000354",
          po_number: "48000121",
          currency: "THB",
          sub_total: "1000.00",
          vat: "70.00",
          grand_total: "1070.00",
        },
        lines: [ln(1, "Service Kit ชุดบำรุงรักษา", 5, "SET", 200, 1000, "SVC-KIT")],
        signatures: sig(),
        oracle: {
          rows: [
            row({ po: "48000121", receipt: "580001120", line: 1, item: "SVC-KIT", desc: "SERVICE KIT MAINTENANCE", qty: 5, uom: "SET", price: 200, org: ORG.AMOTION }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0008",
    dms: "DMS-2026-000163",
    title: "ฉบับตั้งหนี้จริง (คู่ซ้ำกับ 0009 — ผู้ขาย + เลขที่ใบแจ้งหนี้เดียวกัน)",
    expect: { status: "Auto-pass", codes: [], assigned: null },
    actor: { uploadedBy: "PRAPHAN.K", receiver: "PRAPHAN KAEWKLA" },
    rounds: [
      {
        receivedAt: "2026-09-28T11:15:00+07:00",
        pages: 3,
        invoice: {
          invoice_num: "PL-2609-0055",
          invoice_date: "28/09/2026",
          supplier_name: "NX Shoji (Thailand) Co., Ltd.",
          supplier_tax_id: "0105559003322",
          customer_name: "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0107545000213",
          po_number: "43042811",
          currency: "THB",
          sub_total: "31000.00",
          vat: "2170.00",
          grand_total: "33170.00",
        },
        lines: [ln(1, "PLASTIC PALLET 1100x1100 REINFORCED", 50, "PCS", 620, 31000, "PLT-1111")],
        signatures: sig(),
        oracle: {
          rows: [
            row({ po: "43042811", receipt: "530340201", line: 1, item: "PLT-1111", desc: "PLASTIC PALLET 1100 X 1100", qty: 50, price: 620, org: ORG.AH_PLANT }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0009",
    dms: "DMS-2026-000163-A",
    title: "สำเนาซ้ำของ PL-2609-0055 — ถูกปฏิเสธแล้ว (workflow REJECTED ปิด action อื่นทั้งหมด)",
    expect: { status: "Auto-pass", codes: [], assigned: null, duplicateWith: "AIVA-2609-0008" },
    actor: { uploadedBy: "PRAPHAN.K", receiver: "PRAPHAN KAEWKLA" },
    workflow: {
      status: "REJECTED",
      heldBy: null,
      decidedBy: "u6",
      version: 2,
      note: "เอกสารซ้ำ — เลือกฉบับ AIVA-2609-0008 เป็นฉบับตั้งหนี้",
    },
    rounds: [
      {
        receivedAt: "2026-09-28T11:17:40+07:00",
        pages: 3,
        invoice: {
          invoice_num: "PL-2609-0055",
          invoice_date: "28/09/2026",
          supplier_name: "NX Shoji (Thailand) Co., Ltd.",
          supplier_tax_id: "0105559003322",
          customer_name: "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0107545000213",
          po_number: "43042811",
          currency: "THB",
          sub_total: "31000.00",
          vat: "2170.00",
          grand_total: "33170.00",
        },
        lines: [ln(1, "PLASTIC PALLET 1100x1100 REINFORCED", 50, "PCS", 620, 31000, "PLT-1111")],
        signatures: sig(),
        oracle: {
          rows: [
            row({ po: "43042811", receipt: "530340201", line: 1, item: "PLT-1111", desc: "PLASTIC PALLET 1100 X 1100", qty: 50, price: 620, org: ORG.AH_PLANT }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0010",
    dms: "DMS-2026-000177",
    title: "ไม่มีเลข PO + Tax ID ผู้ขายว่าง → V-01 = E13 Medium (จับคู่ด้วย line number M2)",
    expect: { status: "Review", codes: ["E13"], assigned: "user", matchLevels: ["M2"] },
    actor: { uploadedBy: "WILAIWAN.S", receiver: "WILAIWAN SRISUK" },
    rounds: [
      {
        receivedAt: "2026-09-29T14:20:00+07:00",
        pages: 2,
        invoice: {
          invoice_num: "QT2609017",
          invoice_date: "29/09/2026",
          supplier_name: "Quality Tool Traders",
          supplier_tax_id: "", // เอกสารไม่ระบุ / OCR อ่านไม่พบ
          customer_name: "บริษัท อาปิโก ไฮเทค ทูลลิ่ง จำกัด",
          customer_address: "99/1 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0145548001557",
          po_number: "", // เอกสารไม่ระบุ PO → clean_po_number = None
          currency: "THB",
          sub_total: "4400.00",
          vat: "308.00",
          grand_total: "4708.00",
        },
        lines: [ln(1, "แบรนช์ทองแดง 8 MM ทองแดง", 20, "PCS", 220, 4400)],
        signatures: sig(),
        oracle: {
          rows: [
            row({ po: "40121455", receipt: "540112305", line: 1, desc: "INSERTS BRANCH COPPER 8MM", qty: 20, price: 220, org: ORG.AHT }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0011",
    dms: "DMS-2026-000181",
    title: "หลายใบรับในบิลเดียว (E35) + วางบิลเกิน (E06) + วางบิลบางส่วน (E34)",
    expect: { status: "Hold", codes: ["E35", "E06", "E34"], assigned: "user" },
    actor: { uploadedBy: "THANAKORN.M", receiver: "THANAKORN MANKONG" },
    rounds: [
      {
        receivedAt: "2026-09-30T08:10:00+07:00",
        pages: 2,
        invoice: {
          invoice_num: "MGP-2609-0032",
          invoice_date: "30/09/2026",
          supplier_name: "Central Parts Distribution Co., Ltd.",
          supplier_tax_id: "0125562039001",
          customer_name: "บริษัท เอ็มจี เอเบิล มอเตอร์ส จำกัด",
          customer_address: "88 Moo 5 Bang Bua Thong Pathum Thani 12000",
          customer_tax_id: "0135564010484",
          po_number: "49001007",
          currency: "THB",
          sub_total: "1600.00",
          vat: "112.00",
          grand_total: "1712.00",
        },
        lines: [
          ln(1, "BRKF-PAD ชุดเบรกหน้า", 12, "SET", 100, 1200, "BRKF-PAD"),
          ln(2, "BRKR-PAD ชุดเบรกหลัง", 4, "SET", 100, 400, "BRKR-PAD"),
        ],
        signatures: sig(),
        oracle: {
          rows: [
            row({ po: "49001007", receipt: "556000111", line: 1, item: "BRKF-PAD", desc: "BRAKE PAD FRONT SET", qty: 10, uom: "SET", price: 100, org: ORG.MGP }),
            row({ po: "49001007", receipt: "556000112", line: 2, item: "BRKR-PAD", desc: "BRAKE PAD REAR SET", qty: 6, uom: "SET", price: 100, org: ORG.MGP }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0012",
    dms: "DMS-2026-000185",
    title: "E16 Low → ยัง Auto-pass แต่ผู้แนบเอกสาร (PANIDA.R) เป็นบัญชีที่มีสิทธิ์ยืนยันเอง",
    expect: { status: "Auto-pass", codes: ["E16"], assigned: null },
    actor: { uploadedBy: "PANIDA.R", receiver: "SOMSAK JAIDEE" },
    rounds: [
      {
        receivedAt: "2026-09-30T10:00:00+07:00",
        pages: 1,
        invoice: {
          invoice_num: "FAB-2609-0101",
          invoice_date: "30/09/2026",
          supplier_name: "Siam Fabrication Service",
          supplier_tax_id: "0105558002299",
          customer_name: "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0107545000213",
          po_number: "42052900",
          currency: "THB",
          sub_total: "1000.00",
          vat: "69.99", // เศษสตางค์ในกรอบ 1.00 → E16 Low
          grand_total: "1069.99",
        },
        lines: [ln(1, "งานเชื่อมประกอบแท่นรองรับ", 7, "JOB", 142.857, 1000)],
        signatures: sig(),
        oracle: {
          rows: [
            row({ po: "42052900", receipt: "530340300", line: 1, desc: "WELDED SUPPORT BRACKET", qty: 7, uom: "JOB", price: 142.857, org: ORG.AH_PLANT }),
          ],
        },
      },
    ],
  },
];
