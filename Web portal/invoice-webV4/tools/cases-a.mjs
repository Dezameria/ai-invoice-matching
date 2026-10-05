/** cases-a.mjs — เคส 0001–0006 */
import { row, ln, sig, ORG } from "./cases-shared.mjs";

export const CASES_A = [
  {
    id: "AIVA-2609-0001",
    dms: "DMS-2026-000123",
    title: "ผ่านครบ 9 กฎ · จับคู่รายบรรทัดด้วย item code (M1) ทุกบรรทัด",
    expect: { status: "Auto-pass", codes: [], assigned: null, matchLevels: ["M1"] },
    actor: { uploadedBy: "SOMCHAI.P", receiver: "SOMSAK JAIDEE" },
    rounds: [
      {
        receivedAt: "2026-09-24T08:04:10+07:00",
        pages: 2,
        invoice: {
          invoice_num: "IV6909245",
          invoice_date: "24/09/2026",
          supplier_name: "ABC Supply Co., Ltd.",
          supplier_tax_id: "0105542091823",
          customer_name: "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane Ladbu Lao Ayutthaya 13160",
          customer_tax_id: "0107545000213",
          po_number: "42052823",
          release_num: null,
          currency: "THB",
          sub_total: "2910.00",
          vat: "203.70",
          grand_total: "3113.70",
        },
        lines: [
          ln(1, 'HSS-A225 CENTRE DRILL A225 BS4 5/16"', 3, "PCS", 130, 390, "HSS-A225"),
          ln(2, "CW-3F CASTER WHEEL URETHANE 3 INCH FIXED", 4, "PCS", 310, 1240, "CW-3F"),
          ln(3, "CW-3S CASTER WHEEL URETHANE 3 INCH SWIVEL", 4, "PCS", 320, 1280, "CW-3S"),
        ],
        signatures: sig(),
        oracle: {
          rows: [
            row({ po: "42052823", receipt: "530340001", line: 1, item: "HSS-A225", desc: "CENTRE DRILL HSS A225", qty: 3, price: 130, org: ORG.AH_PLANT }),
            row({ po: "42052823", receipt: "530340001", line: 2, item: "CW-3F", desc: "CASTER WHEEL URETHANE FIXED", qty: 4, price: 310, org: ORG.AH_PLANT }),
            row({ po: "42052823", receipt: "530340001", line: 3, item: "CW-3S", desc: "CASTER WHEEL URETHANE SWIVEL", qty: 4, price: 320, org: ORG.AH_PLANT }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0002",
    dms: "DMS-2026-000131",
    title: "ยอดและจำนวนตรงใบรับทุกประการ แต่ขาดลายเซ็นผู้รับของ → E26 High",
    expect: { status: "Hold", codes: ["E26"], assigned: "user" },
    actor: { uploadedBy: "SOMSAK.J", receiver: "SOMSAK JAIDEE" },
    rounds: [
      {
        receivedAt: "2026-09-26T09:12:44+07:00",
        pages: 2,
        invoice: {
          invoice_num: "A631577",
          invoice_date: "26/09/2569", // พ.ศ. → engine แปลงเป็น 26/09/2026 (clean_date as-built)
          supplier_name: "Thai Steel Service Co., Ltd.",
          supplier_tax_id: "0105538012244",
          customer_name: "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane Ladbu Lao Ayutthaya 13160",
          customer_tax_id: "0107545000213",
          po_number: "PO-40100303", // clean_po_number → 8 หลักท้าย
          release_num: "3",
          currency: "THB",
          sub_total: "18054.00",
          vat: "1263.78",
          grand_total: "19317.78",
        },
        lines: [ln(1, "SPH270C-OD 2.0 x 225 x COIL", 590, "KG", 30.6, 18054, "SPH270C")],
        signatures: sig({ present: true, page: 1 }, { present: false, page: null }),
        oracle: {
          rows: [
            row({ po: "40100303", receipt: "530340112", line: 1, item: "SPH270C", desc: "STEEL PLATE SPH270C 2.0 MM COIL", qty: 590, uom: "KG", price: 30.6, org: ORG.AH_PLANT }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0003",
    dms: "DMS-2026-000140",
    title: "วางบิลเกินจำนวนรับจริง → E06 High + E31 High (V-09)",
    expect: { status: "Hold", codes: ["E06", "E31"], assigned: "user" },
    actor: { uploadedBy: "WILAIWAN.S", receiver: "WILAIWAN SRISUK" },
    rounds: [
      {
        receivedAt: "2026-09-25T10:31:02+07:00",
        pages: 1,
        invoice: {
          invoice_num: "INV-2609-0088",
          invoice_date: "25/09/2026",
          supplier_name: "Precision Tools (Thailand) Co., Ltd.",
          supplier_tax_id: "0105550017788",
          customer_name: "บริษัท อาปิโก ไฮเทค ทูลลิ่ง จำกัด",
          customer_address: "99/1 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0145548001557",
          po_number: "40121082",
          currency: "THB",
          sub_total: "11040.00",
          vat: "772.80",
          grand_total: "11812.80",
        },
        lines: [ln(1, "Carbide End Mill D10 x 75L", 12, "PCS", 920, 11040, "CEM-D10")],
        signatures: sig(),
        oracle: {
          rows: [
            row({ po: "40121082", receipt: "540112231", line: 1, item: "CEM-D10", desc: "CARBIDE END MILL D10 75L", qty: 10, price: 920, org: ORG.AHT }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0004",
    dms: "DMS-2026-000152",
    pdf: null,
    title: "E28 (line math) → bypass ไม่เรียก Oracle: V-04/V-05/V-07/V-08/V-09 = not_evaluated",
    expect: { status: "Hold", codes: ["E28"], assigned: "accounting", haltedBy: "V-02" },
    actor: { uploadedBy: "SOMSAK.J", receiver: null },
    rounds: [
      {
        receivedAt: "2026-09-27T08:20:15+07:00",
        pages: 1,
        invoice: {
          invoice_num: "SR6909-1142",
          invoice_date: "27/09/2026",
          supplier_name: "S R Y Engineering & Trading",
          supplier_tax_id: "0105560013399",
          customer_name: "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
          customer_address: "99 Moo 1 Hitech Industrial Estate Banlane Ladbu Lao 13160",
          customer_tax_id: "0107545000213",
          po_number: "40120973",
          currency: "THB",
          sub_total: "520.00",
          vat: "36.40",
          grand_total: "556.40",
        },
        // 2 × 280.00 = 560.00 แต่บรรทัดระบุ 520.00 → ต่าง 40.00 > 0.50
        lines: [ln(1, "ก๊าซ CO2 ขนาด 25 กก. ค้างสต๊อก", 2, "CYL", 280, 520)],
        signatures: sig(),
        oracle: { rows: [] },
      },
    ],
  },

  {
    id: "AIVA-2609-0005",
    dms: "DMS-2026-000158",
    title: "จับคู่ด้วย description token (M3) + หน่วยนับไม่ตรง → E12 Medium",
    expect: { status: "Review", codes: ["E12"], assigned: "user", matchLevels: ["M3"] },
    actor: { uploadedBy: "THANAKORN.M", receiver: "THANAKORN MANKONG" },
    rounds: [
      {
        receivedAt: "2026-09-27T13:05:39+07:00",
        pages: 2,
        invoice: {
          invoice_num: "AM-2609-0412",
          invoice_date: "27/09/2026",
          supplier_name: "Siam Auto Parts Co., Ltd.",
          supplier_tax_id: "0135546000210",
          customer_name: "บริษัท เอเบิล มอเตอร์ส จำกัด",
          customer_address: "14/9 MOO 14 PHAHOLYOTHIN ROAD LAKSI 12120",
          customer_tax_id: "0135546008643",
          po_number: "45008812",
          release_num: "12",
          currency: "THB",
          sub_total: "10000.00",
          vat: "700.00",
          grand_total: "10700.00",
        },
        lines: [ln(1, "HYDRAULIC HOSE ASSY R3 450MM", 8, "EA", 1250, 10000)],
        signatures: sig(),
        oracle: {
          rows: [
            // ไม่มี ITEM_NUMBER (M1 พลาด) · LINE_NUM 5 ≠ 1 (M2 พลาด) → M3 จาก token "HYDRAULIC"
            row({ po: "45008812", receipt: "560020415", line: 5, desc: "HOSE ASSY HYDRAULIC R3", qty: 8, uom: "PC", price: 1250, org: ORG.AM }),
          ],
        },
      },
    ],
  },

  {
    id: "AIVA-2609-0006",
    dms: "DMS-2026-000161",
    title: "ไม่พบการรับของใน ERP → E17 High · เอกสารไม่มี Receiver งานจริงจึงตกที่ฝ่ายบัญชี",
    expect: { status: "Hold", codes: ["E17", "E30", "E31"], assigned: "user" },
    actor: { uploadedBy: "WILAIWAN.S", receiver: null },
    rounds: [
      {
        receivedAt: "2026-09-28T08:44:21+07:00",
        pages: 1,
        invoice: {
          invoice_num: "TK-2609-0120",
          invoice_date: "28/09/2026",
          supplier_name: "Sanwa Precision Tools Co., Ltd.",
          supplier_tax_id: "0145548002210",
          customer_name: "บริษัท อาปิโก ไฮเทค ทูลลิ่ง จำกัด",
          customer_address: "99/1 Moo 1 Hitech Industrial Estate Banlane 13160",
          customer_tax_id: "0145548001557",
          po_number: "40121210",
          currency: "THB",
          sub_total: "560.00",
          vat: "39.20",
          grand_total: "599.20",
        },
        lines: [ln(1, "Carbide Drill D8 45L", 2, "PCS", 280, 560, "CD-D8")],
        signatures: sig(),
        oracle: { rows: [] },
      },
    ],
  },
];
