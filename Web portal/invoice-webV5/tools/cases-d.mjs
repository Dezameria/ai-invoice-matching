/** cases-d.mjs — เคส 0018–0022 (PDF เก่า / บิลไม่มี VAT / snapshot ไม่ครบ / Confirmed / safety cap) */
import { row, ln, sig, ORG } from "./cases-shared.mjs";

const capRows = Array.from({ length: 50 }, (_, i) =>
  row({
    po: "47009001",
    receipt: "175001101",
    line: i + 1,
    desc: `SCREW HEX SET ${String(i + 1).padStart(3, "0")}`,
    qty: 1,
    price: 10,
    org: ORG.AHP,
  }),
);

export const CASES_D = [
  {
    id: "AIVA-2609-0018",
    dms: "DMS-2026-000208",
    title: "revision 2 มาแล้วแต่ PDF ที่แนบยังเป็นของ revision 1 → Auto-pass พร้อมป้าย “หลักฐานเก่า”",
    expect: { status: "Auto-pass", codes: [], assigned: null, stalePdf: true, revisions: 2 },
    expectRevisions: [
      { status: "Hold", codes: ["E26"] },
      { status: "Auto-pass", codes: [] },
    ],
    actor: { uploadedBy: "SOMSAK.J", receiver: "PRAPHAN KAEWKLA" },
    // PDF ถูกอัปโหลดแค่ revision แรก → Portal ต้องไม่ให้ยึดของเก่าเป็นหลักฐานของ revision ใหม่
    pdf: { 1: { file_name: "DMS-2026-000208_r1.pdf", uploaded_at: "2026-10-04T09:05:00+07:00", pages: 2, size_kb: 412 } },
    rounds: [
      {
        receivedAt: "2026-10-04T09:00:00+07:00",
        pages: 2,
        invoice: {
          invoice_num: "HP-2610-0125",
          invoice_date: "04/10/2026",
          supplier_name: "Honda Parts Logistics Co., Ltd.",
          supplier_tax_id: "0105552006677",
          customer_name: "บริษัท อาปิโก ไฮเทค พาร์ท จำกัด",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0145548001549",
          po_number: "44009020",
          release_num: "7",
          currency: "THB",
          sub_total: "26400.00",
          vat: "1848.00",
          grand_total: "28248.00",
        },
        lines: [ln(1, "ชุดสายไฟ REAR HARNESS", 12, "PCS", 2200, 26400, "WH-RH-02")],
        signatures: sig({ present: true, page: 1 }, { present: false, page: null }),
        oracle: {
          rows: [
            row({ po: "44009020", receipt: "175000910", line: 1, item: "WH-RH-02", desc: "WIRING HARNESS REAR", qty: 12, price: 2200, org: ORG.AHP }),
          ],
        },
      },
      {
        receivedAt: "2026-10-05T08:30:00+07:00",
        pages: 2,
        invoice: {
          invoice_num: "HP-2610-0125",
          invoice_date: "05/10/2026",
          supplier_name: "Honda Parts Logistics Co., Ltd.",
          supplier_tax_id: "0105552006677",
          customer_name: "บริษัท อาปิโก ไฮเทค พาร์ท จำกัด",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0145548001549",
          po_number: "44009020",
          release_num: "7",
          currency: "THB",
          sub_total: "26400.00",
          vat: "1848.00",
          grand_total: "28248.00",
        },
        lines: [ln(1, "ชุดสายไฟ REAR HARNESS", 12, "PCS", 2200, 26400, "WH-RH-02")],
        signatures: sig({ present: true, page: 1 }, { present: true, page: 2 }),
        oracle: {
          rows: [
            row({ po: "44009020", receipt: "175000910", line: 1, item: "WH-RH-02", desc: "WIRING HARNESS REAR", qty: 12, price: 2200, org: ORG.AHP }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0019",
    dms: "DMS-2026-000212",
    title: "บิลนำเข้า USD ไม่คิด VAT 7% → as-built engine คาดหวัง VAT เสมอ จึงออก E31 High (+ E13 ตาม Tax ID ผู้ขายต่างประเท็สว่าง)",
    expect: { status: "Hold", codes: ["E13", "E31"], assigned: "user", currencyNote: true },
    actor: { uploadedBy: "PANIDA.R", receiver: "SOMSAK JAIDEE" },
    rounds: [
      {
        receivedAt: "2026-10-05T13:20:00+07:00",
        pages: 4,
        invoice: {
          invoice_num: "IMP-2610-0007",
          invoice_date: "05/10/2026",
          supplier_name: "Nippon Tooling Systems K.K.",
          supplier_tax_id: "", // ผู้ขายต่างประเทศ ไม่มีเลข 13 หลัก
          customer_name: "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0107545000213",
          po_number: "40100601",
          currency: "USD",
          sub_total: "4200.00",
          vat: "0.00",
          grand_total: "4200.00",
        },
        lines: [ln(1, "DIE SET SPARE PART SET-A", 2, "SET", 2100, 4200, "DIE-SET-A")],
        signatures: sig(),
        oracle: {
          rows: [
            row({ po: "40100601", receipt: "530340700", line: 1, item: "DIE-SET-A", desc: "DIE SET SPARE PART SET A", qty: 2, uom: "SET", price: 2100, org: ORG.AH_PLANT }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0020",
    dms: "DMS-2026-000215",
    title: "producer ส่ง snapshot มาไม่ครบ (มีแค่ V-01–V-05) → Portal แสดง “ไม่มีข้อมูล” ห้ามแก้เป็น PASS",
    expect: { status: "Review", codes: ["E13"], assigned: "user", partialRules: true, handAuthored: true },
    handAuthoredReason:
      "ไว้สาธิต schema/matrix completeness check ฝั่ง Portal — ไม่มี producer ใน repo นี้ที่ส่ง snapshot แบบไม่ครบตามธรรมชาติ",
    actor: { uploadedBy: "SYSTEM", receiver: "WILAIWAN SRISUK" },
    snapshotOverride: {
      note: "ผู้ส่งฝั่ง OCR ใช้ standard เก่า 6.1 → ไม่มี V-06–V-09 ใน payload",
      status: "Review",
      rules: [
        { rule_id: "V-01", result: "FAIL", code: "E13", severity: "Medium", details: "Missing: release_num", page: 1, halted_by: null },
        { rule_id: "V-02", result: "PASS", code: null, severity: null, details: "", page: null, halted_by: null },
        { rule_id: "V-03", result: "PASS", code: null, severity: null, details: "", page: null, halted_by: null },
        { rule_id: "V-04", result: "PASS", code: null, severity: null, details: "ใบรับ 540112400 · 1 แถว", page: null, halted_by: null },
        { rule_id: "V-05", result: "PASS", code: null, severity: null, details: "ตรงนิติบุคคล อาปิโก ไฮเทค ทูลลิ่ง", page: 1, halted_by: null },
      ],
      exceptions: [
        { code: "E13", rule_id: "V-01", severity: "Medium", message: "ฟิลด์ไม่ครบ: release_num", page: 1 },
      ],
      decision: { status: "Review", assigned_to: "user", halted_by: null, manual_review: false },
      invoice: {
        invoice_num: "QT-2610-0091",
        invoice_date: "06/10/2026",
        supplier_name: "Quality Tool Traders",
        supplier_tax_id: "0145548002210",
        customer_name: "บริษัท อาปิโก ไฮเทค ทูลลิ่ง จำกัด",
        customer_address: "99/1 Moo 1 Hitech Industrial Estate Banlane 13160",
        customer_tax_id: "0145548001557",
        po_number: "40121699",
        release_num: null,
        currency: "THB",
        sub_total: "2600.00",
        vat: "182.00",
        grand_total: "2782.00",
      },
      lines: [ln(1, "PLATE STAINLESS 3.0MM THK", 10, "SHT", 260, 2600)],
      signatures: { supplier_or_deliverer: { present: true, page: 1 }, receiver: { present: true, page: 1 } },
      receipt: {
        org_id: ORG.AHT,
        org_name: "อาปิโก ไฮเทค ทูลลิ่ง",
        company: "AHT",
        rows: [
          row({ po: "40121699", receipt: "540112400", line: 1, desc: "PLATE STAINLESS 3.0MM THK", qty: 10, uom: "SHT", price: 260, org: ORG.AHT }),
        ],
        row_count: 1,
        total_value: "2600",
      },
      matches: [],
      pages: 2,
      pages_complete: true,
    },
    rounds: [
      {
        receivedAt: "2026-10-06T09:10:00+07:00",
        pages: 2,
        invoice: {
          invoice_num: "QT-2610-0091",
          invoice_date: "06/10/2026",
          supplier_name: "Quality Tool Traders",
          supplier_tax_id: "0145548002210",
          customer_name: "บริษัท อาปิโก ไฮเทค ทูลลิ่ง จำกัด",
          customer_address: "99/1 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0145548001557",
          po_number: "40121699",
          release_num: null,
          currency: "THB",
          sub_total: "2600.00",
          vat: "182.00",
          grand_total: "2782.00",
        },
        lines: [ln(1, "PLATE STAINLESS 3.0MM THK", 10, "SHT", 260, 2600)],
        signatures: sig(),
        oracle: {
          rows: [
            row({ po: "40121699", receipt: "540112400", line: 1, desc: "PLATE STAINLESS 3.0MM THK", qty: 10, uom: "SHT", price: 260, org: ORG.AHT }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0021",
    dms: "DMS-2026-000219",
    title: "ยืนยันเอกสารแล้ว (workflow CONFIRMED) — ปุ่ม Post to AP ยังปิดเพราะสัญญาส่งต่ออยู่ AP",
    expect: { status: "Auto-pass", codes: [], assigned: null, confirmed: true },
    actor: { uploadedBy: "PRAPHAN.K", receiver: "PRAPHAN KAEWKLA" },
    workflow: {
      status: "CONFIRMED",
      heldBy: null,
      decidedBy: "u6",
      version: 2,
      note: "หัวหน้างานกดยืนยันตามสัญญา Human Approval สำหรับ Auto-pass",
      confirmedAt: "2026-10-06T15:00:00+07:00",
    },
    rounds: [
      {
        receivedAt: "2026-10-06T14:10:00+07:00",
        pages: 2,
        invoice: {
          invoice_num: "IV6910011",
          invoice_date: "06/10/2026",
          supplier_name: "ABC Supply Co., Ltd.",
          supplier_tax_id: "0105542091823",
          customer_name: "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0107545000213",
          po_number: "42052999",
          currency: "THB",
          sub_total: "5200.00",
          vat: "364.00",
          grand_total: "5564.00",
        },
        lines: [ln(1, "SAFETY SHOES CLASSIC 42", 20, "PCS", 260, 5200, "SHOES-42")],
        signatures: sig(),
        oracle: {
          rows: [
            row({ po: "42052999", receipt: "530340800", line: 1, item: "SHOES-42", desc: "SAFETY SHOES CLASSIC SIZE 42", qty: 20, price: 260, org: ORG.AH_PLANT }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0022",
    dms: "DMS-2026-000223",
    title: "SQL คืน 50 แถวชน safety cap → V-04 = MANUAL และห้ามจับคู่รายบรรทัด (fail-safe)",
    expect: { status: "Manual Review", codes: [], assigned: "accounting", safetyCap: true },
    actor: { uploadedBy: "NARONG.P", receiver: "NARONG PHOLSRI" },
    rounds: [
      {
        receivedAt: "2026-10-07T08:00:00+07:00",
        pages: 6,
        invoice: {
          invoice_num: "FAST-2610-0500",
          invoice_date: "07/10/2026",
          supplier_name: "Fastener City Co., Ltd.",
          supplier_tax_id: "0105551008899",
          customer_name: "บริษัท อาปิโก ไฮเทค พาร์ท จำกัด",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0145548001549",
          po_number: "47009001",
          release_num: "1",
          currency: "THB",
          sub_total: "500.00",
          vat: "35.00",
          grand_total: "535.00",
        },
        lines: [ln(1, "SCREW HEX SET รวม 50 รายการย่อย", 50, "PCS", 10, 500)],
        signatures: sig(),
        oracle: { rows: capRows },
      },
    ],
  },
];
