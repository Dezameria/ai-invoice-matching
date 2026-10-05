/** cases-c.mjs — เคส 0013–0017 (หลาย revision / fallback / outbox / ทศนิยม) */
import { row, ln, sig, ORG } from "./cases-shared.mjs";

const STEEL = (over = {}) => ({
  invoice_num: "TTS-2609-0777",
  invoice_date: "01/10/2026",
  supplier_name: "Tong Tong Steel Co., Ltd.",
  supplier_tax_id: "0105535041122",
  customer_name: "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
  customer_address: "99 Moo 1 Hitech Industrial Estate Banlane Ladbu Lao Ayutthaya 13160",
  customer_tax_id: "0107545000213",
  po_number: "40100399",
  release_num: "5",
  currency: "THB",
  sub_total: "34800.00",
  vat: "2436.00",
  grand_total: "37236.00",
  ...over,
});

export const CASES_C = [
  {
    id: "AIVA-2609-0013",
    dms: "DMS-2026-000192",
    title: "2 revision: แก้ลายเซ็นแล้วแต่หน่วยนับยังต่าง (Hold → Review) และอยู่ระหว่าง On Hold",
    expect: { status: "Review", codes: ["E12"], assigned: "user", revisions: 2 },
    expectRevisions: [
      { status: "Hold", codes: ["E26"] },
      { status: "Review", codes: ["E12"] },
    ],
    actor: { uploadedBy: "SOMSAK.J", receiver: "SOMSAK JAIDEE" },
    workflow: {
      status: "ON_HOLD",
      heldBy: "u6",
      decidedBy: null,
      version: 3,
      note: "รอบรอผู้ขายออกใบลดหนี้ส่วนต่างหน่วยนับ — ACC กด On Hold ไว้กันงานหลุด",
    },
    rounds: [
      {
        receivedAt: "2026-10-01T09:30:00+07:00",
        pages: 2,
        invoice: STEEL(),
        lines: [ln(1, "ชุด CLAMP 24 MM ยึดแท่นจับ", 24, "SET", 1450, 34800)],
        signatures: sig({ present: true, page: 2 }, { present: false, page: null }),
        oracle: {
          rows: [
            row({ po: "40100399", receipt: "530340400", line: 1, desc: "CLAMP SET 24 MM FIXTURE", qty: 24, uom: "SET", price: 1450, org: ORG.AH_PLANT }),
          ],
        },
      },
      {
        receivedAt: "2026-10-03T08:12:00+07:00",
        pages: 2,
        invoice: STEEL({ invoice_date: "03/10/2026" }),
        lines: [ln(1, "ชุด CLAMP 24 MM ยึดแท่นจับ", 24, "SET", 1450, 34800)],
        signatures: sig({ present: true, page: 2 }, { present: true, page: 1 }),
        oracle: {
          // revision ของใบรับถูกแก้ใน ERP → หน่วยนับจริงคือ LOT
          rows: [
            row({ po: "40100399", receipt: "530340412", line: 1, desc: "CLAMP SET 24 MM FIXTURE", qty: 24, uom: "LOT", price: 1450, org: ORG.AH_PLANT }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0014",
    dms: "DMS-2026-000196",
    title: "M4 fallback (ไม่มี item/line/token ตรง) + หน้าเอกสารไม่ครบ (Vision อ่านได้ 8/9) → Review",
    expect: { status: "Review", codes: ["E13"], assigned: "user", matchLevels: ["M4"] },
    actor: { uploadedBy: "THANAKORN.M", receiver: "THANAKORN MANKONG" },
    rounds: [
      {
        receivedAt: "2026-10-02T11:05:00+07:00",
        pages: 9,
        pages_complete: false, // Vision อ่านได้ 8 หน้า → V-01 E13
        invoice: {
          invoice_num: "FAB-2610-0007",
          invoice_date: "02/10/2026",
          supplier_name: "Bangkok Metal Works Co., Ltd.",
          supplier_tax_id: "0105547005566",
          customer_name: "บริษัท เอเบิล มอเตอร์ส จำกัด",
          customer_address: "14/9 MOO 14 PHAHOLYOTHIN ROAD LAKSI 12120",
          customer_tax_id: "0135546008643",
          po_number: "45008901",
          currency: "THB",
          sub_total: "12000.00",
          vat: "840.00",
          grand_total: "12840.00",
        },
        lines: [ln(1, "MISC FABRICATION WORK BAY 3", 1, "JOB", 12000, 12000)],
        signatures: sig(),
        oracle: {
          rows: [
            // ไม่มี ITEM_NUMBER · LINE_NUM 9 ≠ 1 · token ใน description ไม่ทับกัน → ตกถึง M4
            row({ po: "45008901", receipt: "560020501", line: 9, desc: "STEEL PLATFORM MODIFICATION", qty: 1, uom: "JOB", price: 12000, org: ORG.AM }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0015",
    dms: "DMS-2026-000198",
    title: "Resubmit แล้วแต่ producer ยังไม่ส่ง revision ใหม่ (outbox ค้าง · retry 3 ครั้ง)",
    expect: { status: "Hold", codes: ["E17", "E30", "E31"], assigned: "user", outboxPending: true },
    actor: { uploadedBy: "WILAIWAN.S", receiver: "WILAIWAN SRISUK" },
    workflow: {
      status: "RESUBMITTED",
      heldBy: null,
      decidedBy: "u5",
      version: 4,
      note: "Receiver กดรับของใน ERP แล้ว · ฝ่ายบัญชีส่ง resubmit ไป OCR แล้ว (รอ revision 2)",
    },
    outbox: [
      {
        event_id: "EVT-RERUN-0015",
        event_type: "RERUN_REQUEST",
        waiting_revision: 2,
        status: "PENDING",
        attempts: 3,
        max_attempts: 5,
        last_error: "HTTP 502 จาก receiving endpoint",
        queued_at: "2026-10-02T15:40:00+07:00",
      },
    ],
    rounds: [
      {
        receivedAt: "2026-10-02T14:05:00+07:00",
        pages: 1,
        invoice: {
          invoice_num: "SP-2610-0044",
          invoice_date: "02/10/2026",
          supplier_name: "Siam Pipe Fitting Co., Ltd.",
          supplier_tax_id: "0105544007788",
          customer_name: "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0107545000213",
          po_number: "40100455",
          currency: "THB",
          sub_total: "8400.00",
          vat: "588.00",
          grand_total: "8988.00",
        },
        lines: [ln(1, "หน้าแปลน ST37 4 นิ้ว 150LB", 40, "PCS", 210, 8400, "FLG-ST37-4")],
        signatures: sig(),
        oracle: { rows: [] },
      },
    ],
    // revision ที่ 2 — ผู้ใช้กด "รับ revision ใหม่" เพื่อสาธิต outbox ปิดตัวเอง
    pendingRound: {
      receivedAt: "2026-10-02T16:20:00+07:00",
      pages: 1,
      invoice: {
        invoice_num: "SP-2610-0044",
        invoice_date: "02/10/2026",
        supplier_name: "Siam Pipe Fitting Co., Ltd.",
        supplier_tax_id: "0105544007788",
        customer_name: "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
        customer_address: "99 Moo 1 Hitech Industrial Estate Banlane 13160",
        customer_tax_id: "0107545000213",
        po_number: "40100455",
        currency: "THB",
        sub_total: "8400.00",
        vat: "588.00",
        grand_total: "8988.00",
      },
      lines: [ln(1, "หน้าแปลน ST37 4 นิ้ว 150LB", 40, "PCS", 210, 8400, "FLG-ST37-4")],
      signatures: sig(),
      oracle: {
        rows: [
          row({ po: "40100455", receipt: "530340500", line: 1, item: "FLG-ST37-4", desc: "FLANGE ST37 4 INCH 150LB", qty: 40, price: 210, org: ORG.AH_PLANT }),
        ],
      },
    },
  },

  {
    id: "AIVA-2609-0016",
    dms: "DMS-2026-000201",
    title: "pipeline ล้มก่อนเขียน Table 9 (LiteLLM timeout) → producer ส่ง snapshot แบบ fail-safe",
    expect: { status: "Manual Review", codes: [], assigned: "accounting", handAuthored: true },
    handAuthoredReason:
      "ไม่มี in-repo producer ที่สร้างกรณี pipeline ล้มได้ — snapshot นี้เขียนมือเพื่อทดสอบว่า Portal ไม่สรุป PASS เมื่อไม่มีผลกฎ",
    actor: { uploadedBy: "SYSTEM", receiver: null },
    pdf: null, // ไฟล์ PDF ยังไม่ถูกอัปโหลดเข้า object store
    snapshotOverride: {
      note: "Vision worker ล่มที่ retry ที่ 3 (LiteLLM timeout) — ไม่มีการตรวจ matching",
      status: "Manual Review",
      rules: ["V-01", "V-02", "V-03", "V-04", "V-05", "V-06", "V-07", "V-08", "V-09"].map((id) => ({
        rule_id: id,
        result: "not_evaluated",
        code: null,
        severity: null,
        details: "ไม่มีการตรวจข้อนี้ เพราะ pipeline จบก่อนเขียน Table 9",
        page: null,
        halted_by: null,
      })),
      exceptions: [],
      decision: { status: "Manual Review", assigned_to: "accounting", halted_by: null, manual_review: true },
      invoice: {
        invoice_num: "PP-2610-0303",
        invoice_date: null,
        supplier_name: "",
        supplier_tax_id: null,
        customer_name: "",
        customer_address: "",
        customer_tax_id: null,
        po_number: null,
        release_num: null,
        currency: "THB",
        sub_total: "0",
        vat: "0",
        grand_total: "0",
      },
      lines: [],
      signatures: { supplier_or_deliverer: { present: false, page: null }, receiver: { present: false, page: null } },
      receipt: { org_id: null, org_name: null, company: "UNMAPPED", rows: [], row_count: 0, total_value: null },
      matches: [],
      pages: null,
      pages_complete: false,
    },
    rounds: [
      {
        receivedAt: "2026-10-03T02:15:40+07:00",
        pages: null,
        invoice: {
          invoice_num: "PP-2610-0303",
          invoice_date: null,
          supplier_name: "",
          supplier_tax_id: "",
          customer_name: "",
          customer_address: "",
          customer_tax_id: "",
          po_number: "",
          currency: "THB",
          sub_total: "0",
          vat: "0",
          grand_total: "0",
        },
        lines: [],
        signatures: sig({ present: false, page: null }, { present: false, page: null }),
        oracle: { rows: [] },
      },
    ],
  },

  {
    id: "AIVA-2609-0017",
    dms: "DMS-2026-000205",
    title: "ทศนิยม 6 ตำแหน่ง (600 × 30.666667) — Decimal string ไม่แตะ float → E16 Low ยัง Auto-pass",
    expect: { status: "Auto-pass", codes: ["E16"], assigned: null },
    actor: { uploadedBy: "NARONG.P", receiver: "NARONG PHOLSRI" },
    rounds: [
      {
        receivedAt: "2026-10-03T10:40:00+07:00",
        pages: 1,
        invoice: {
          invoice_num: "MET-2610-0110",
          invoice_date: "03/10/2026",
          supplier_name: "Metro Fasteners (Thailand) Ltd.",
          supplier_tax_id: "0105549003311",
          customer_name: "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0107545000213",
          po_number: "40100512",
          currency: "THB",
          sub_total: "18400.0002",
          vat: "1288.00",
          grand_total: "19688.00",
        },
        lines: [ln(1, "สตัด M12 x 80 เกรด 8.8", 600, "PCS", 30.666667, 18400.0002, "STUD-M12-80")],
        signatures: sig(),
        oracle: {
          rows: [
            row({ po: "40100512", receipt: "530340600", line: 1, item: "STUD-M12-80", desc: "STUD M12 X 80 GRADE 8.8", qty: 600, price: 30.666667, org: ORG.AH_PLANT }),
          ],
        },
      },
    ],
  },
];
