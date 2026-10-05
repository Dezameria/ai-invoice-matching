/* =============================================================
 * GENERATED FILE — ห้ามแก้ไขด้วยมือ (do not hand-edit)
 * Source : tools/cases-*.mjs (ข้อมูลสังเคราะห์) ผ่าน src/engine/rules.js (as-built mirror)
 * Tool   : tools/build-snapshots.mjs
 * Run    : node tools/build-snapshots.mjs
 * ⚠️ สถานะ/ข้อยกเว้นทั้งหมดในไฟล์นี้มาจากการรัน engine จริง ไม่ใช่คนพิมพ์
 *    Portal ห้ามคำนวณ matching ใหม่อีกครั้ง — อ่าน snapshot อย่างเดียว
 * ============================================================= */

export const SNAPSHOT_BUNDLE = {
  "built_at": "2026-10-03T09:58:31.170Z",
  "generator": "tools/build-snapshots.mjs",
  "contract_version": "1.0",
  "standard_version": "6.2",
  "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
  "tolerance": {
    "lineMath": "0.50",
    "docSum": "0.50",
    "vat": "1.00",
    "grand": "0.50",
    "receiptTotal": "0.50",
    "pricePct": 0.01,
    "priceAbs": "200",
    "receiptSafetyCap": 50
  },
  "document_count": 22,
  "snapshot_count": 24,
  "hand_authored_snapshots": [
    "AIVA-2609-0016",
    "AIVA-2609-0020"
  ],
  "documents": [
    {
      "document_id": "AIVA-2609-0001",
      "dms_id": "DMS-2026-000123",
      "title": "ผ่านครบ 9 กฎ · จับคู่รายบรรทัดด้วย item code (M1) ทุกบรรทัด",
      "actor": {
        "uploadedBy": "SOMCHAI.P",
        "receiver": "SOMSAK JAIDEE"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000123_r1.pdf",
          "pages": 2,
          "uploaded_at": "2026-09-24T08:04:10+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Auto-pass",
        "codes": [],
        "assigned": null,
        "matchLevels": [
          "M1"
        ]
      },
      "dup_key": "ABC Supply Co., Ltd.||IV6909245",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0001-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000123",
          "document_id": "AIVA-2609-0001",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-09-24T08:04:10+07:00",
          "status": "Auto-pass",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000123",
            "pages": 2,
            "pages_complete": true,
            "uploaded_by": "SOMCHAI.P",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "IV6909245",
            "invoice_date": "24/09/2026",
            "supplier_name": "ABC Supply Co., Ltd.",
            "supplier_tax_id": "0105542091823",
            "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane Ladbu Lao Ayutthaya 13160",
            "customer_tax_id": "0107545000213",
            "po_number": "42052823",
            "release_num": null,
            "currency": "THB",
            "sub_total": "2910",
            "vat": "203.7",
            "grand_total": "3113.7"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 103,
            "org_name": "อาปิโก ไฮเทค (โรงงานอยุธยา)",
            "company": "AH",
            "company_label": "อาปิโก ไฮเทค",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 3,
            "active_row_count": 3,
            "rows": [
              {
                "PO_NUMBER": "42052823",
                "RECEIPT_NUM": "530340001",
                "LINE_NUM": 1,
                "ITEM_NUMBER": "HSS-A225",
                "ITEM_DESCRIPTION": "CENTRE DRILL HSS A225",
                "QUANTITY_RECEIVED": "3",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "130",
                "LINE_TOTAL": "390",
                "ORG_ID": 103,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "42052823",
                "RECEIPT_NUM": "530340001",
                "LINE_NUM": 2,
                "ITEM_NUMBER": "CW-3F",
                "ITEM_DESCRIPTION": "CASTER WHEEL URETHANE FIXED",
                "QUANTITY_RECEIVED": "4",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "310",
                "LINE_TOTAL": "1240",
                "ORG_ID": 103,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "42052823",
                "RECEIPT_NUM": "530340001",
                "LINE_NUM": 3,
                "ITEM_NUMBER": "CW-3S",
                "ITEM_DESCRIPTION": "CASTER WHEEL URETHANE SWIVEL",
                "QUANTITY_RECEIVED": "4",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "320",
                "LINE_TOTAL": "1280",
                "ORG_ID": 103,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "2910",
            "receiver": "SOMSAK JAIDEE"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "HSS-A225",
              "description": "hss-a225 centre drill a225 bs4 5/16\"",
              "qty": "3",
              "uom": "PCS",
              "unit_price": "130",
              "amount": "390"
            },
            {
              "line_no": 2,
              "item_code": "CW-3F",
              "description": "cw-3f caster wheel urethane 3 inch fixed",
              "qty": "4",
              "uom": "PCS",
              "unit_price": "310",
              "amount": "1240"
            },
            {
              "line_no": 3,
              "item_code": "CW-3S",
              "description": "cw-3s caster wheel urethane 3 inch swivel",
              "qty": "4",
              "uom": "PCS",
              "unit_price": "320",
              "amount": "1280"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 530340001 · 3 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค (โรงงานอยุธยา) · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 2910 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M1",
              "match_note": "พบ item code ใน description",
              "receipt_line": 1,
              "receipt_num": "530340001",
              "receipt_qty": "3",
              "receipt_price": "130",
              "receipt_uom": "PCS",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            },
            {
              "line_no": 2,
              "match_level": "M1",
              "match_note": "พบ item code ใน description",
              "receipt_line": 2,
              "receipt_num": "530340001",
              "receipt_qty": "4",
              "receipt_price": "310",
              "receipt_uom": "PCS",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            },
            {
              "line_no": 3,
              "match_level": "M1",
              "match_note": "พบ item code ใน description",
              "receipt_line": 3,
              "receipt_num": "530340001",
              "receipt_qty": "4",
              "receipt_price": "320",
              "receipt_uom": "PCS",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Auto-pass",
            "assigned_to": null,
            "halted_by": null,
            "manual_review": false
          },
          "note": "ผ่านครบ 9 กฎ · จับคู่รายบรรทัดด้วย item code (M1) ทุกบรรทัด",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0002",
      "dms_id": "DMS-2026-000131",
      "title": "ยอดและจำนวนตรงใบรับทุกประการ แต่ขาดลายเซ็นผู้รับของ → E26 High",
      "actor": {
        "uploadedBy": "SOMSAK.J",
        "receiver": "SOMSAK JAIDEE"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000131_r1.pdf",
          "pages": 2,
          "uploaded_at": "2026-09-26T09:12:44+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Hold",
        "codes": [
          "E26"
        ],
        "assigned": "user"
      },
      "dup_key": "Thai Steel Service Co., Ltd.||A631577",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0002-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000131",
          "document_id": "AIVA-2609-0002",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-09-26T09:12:44+07:00",
          "status": "Hold",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000131",
            "pages": 2,
            "pages_complete": true,
            "uploaded_by": "SOMSAK.J",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "A631577",
            "invoice_date": "26/09/2026",
            "supplier_name": "Thai Steel Service Co., Ltd.",
            "supplier_tax_id": "0105538012244",
            "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane Ladbu Lao Ayutthaya 13160",
            "customer_tax_id": "0107545000213",
            "po_number": "40100303",
            "release_num": "3",
            "currency": "THB",
            "sub_total": "18054",
            "vat": "1263.78",
            "grand_total": "19317.78"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 103,
            "org_name": "อาปิโก ไฮเทค (โรงงานอยุธยา)",
            "company": "AH",
            "company_label": "อาปิโก ไฮเทค",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "40100303",
                "RECEIPT_NUM": "530340112",
                "LINE_NUM": 1,
                "ITEM_NUMBER": "SPH270C",
                "ITEM_DESCRIPTION": "STEEL PLATE SPH270C 2.0 MM COIL",
                "QUANTITY_RECEIVED": "590",
                "UNIT_MEAS_LOOKUP_CODE": "KG",
                "UNIT_PRICE": "30.6",
                "LINE_TOTAL": "18054",
                "ORG_ID": 103,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "18054",
            "receiver": "SOMSAK JAIDEE"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "SPH270C",
              "description": "sph270c-od 2.0 x 225 x coil",
              "qty": "590",
              "uom": "KG",
              "unit_price": "30.6",
              "amount": "18054"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 530340112 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค (โรงงานอยุธยา) · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "FAIL",
              "code": "E26",
              "severity": "High",
              "details": "ไม่พบลายเซ็น/ตราประทับในช่องผู้รับของ",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 18054 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E26",
              "rule_id": "V-06",
              "severity": "High",
              "message": "ไม่พบลายเซ็นผู้รับของบนเอกสาร",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M1",
              "match_note": "พบ item code ใน description",
              "receipt_line": 1,
              "receipt_num": "530340112",
              "receipt_qty": "590",
              "receipt_price": "30.6",
              "receipt_uom": "KG",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": false,
              "page": null
            }
          },
          "decision": {
            "status": "Hold",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "ยอดและจำนวนตรงใบรับทุกประการ แต่ขาดลายเซ็นผู้รับของ → E26 High",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0003",
      "dms_id": "DMS-2026-000140",
      "title": "วางบิลเกินจำนวนรับจริง → E06 High + E31 High (V-09)",
      "actor": {
        "uploadedBy": "WILAIWAN.S",
        "receiver": "WILAIWAN SRISUK"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000140_r1.pdf",
          "pages": 1,
          "uploaded_at": "2026-09-25T10:31:02+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Hold",
        "codes": [
          "E06",
          "E31"
        ],
        "assigned": "user"
      },
      "dup_key": "Precision Tools (Thailand) Co., Ltd.||INV-2609-0088",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0003-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000140",
          "document_id": "AIVA-2609-0003",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-09-25T10:31:02+07:00",
          "status": "Hold",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000140",
            "pages": 1,
            "pages_complete": true,
            "uploaded_by": "WILAIWAN.S",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "INV-2609-0088",
            "invoice_date": "25/09/2026",
            "supplier_name": "Precision Tools (Thailand) Co., Ltd.",
            "supplier_tax_id": "0105550017788",
            "customer_name": "บริษัท อาปิโก ไฮเทค ทูลลิ่ง จำกัด",
            "customer_address": "99/1 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0145548001557",
            "po_number": "40121082",
            "release_num": null,
            "currency": "THB",
            "sub_total": "11040",
            "vat": "772.8",
            "grand_total": "11812.8"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 352,
            "org_name": "อาปิโก ไฮเทค ทูลลิ่ง",
            "company": "AHT",
            "company_label": "อาปิโก ไฮเทค ทูลลิ่ง",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "40121082",
                "RECEIPT_NUM": "540112231",
                "LINE_NUM": 1,
                "ITEM_NUMBER": "CEM-D10",
                "ITEM_DESCRIPTION": "CARBIDE END MILL D10 75L",
                "QUANTITY_RECEIVED": "10",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "920",
                "LINE_TOTAL": "9200",
                "ORG_ID": 352,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "9200",
            "receiver": "WILAIWAN SRISUK"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "CEM-D10",
              "description": "carbide end mill d10 x 75l",
              "qty": "12",
              "uom": "PCS",
              "unit_price": "920",
              "amount": "11040"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 540112231 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค ทูลลิ่ง · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "FAIL",
              "code": "E06",
              "severity": "High",
              "details": "มีบรรทัดที่จำนวนวางบิลเกินจำนวนรับจริง",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "FAIL",
              "code": "E31",
              "severity": "High",
              "details": "subtotal บิล 11040 vs Σ(รับจริง × ราคาใบรับ) 9200 ต่าง 1840",
              "page": 1,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E06",
              "rule_id": "V-08",
              "severity": "High",
              "message": "บรรทัด 1: วางบิล 12 > รับจริง 10",
              "page": 1
            },
            {
              "code": "E31",
              "rule_id": "V-09",
              "severity": "High",
              "message": "ยอดรวมมูลค่าสินค้าไม่ตรงกับยอดรวมใบรับสินค้า",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M2",
              "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
              "receipt_line": 1,
              "receipt_num": "540112231",
              "receipt_qty": "10",
              "receipt_price": "920",
              "receipt_uom": "PCS",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": "E06"
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Hold",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "วางบิลเกินจำนวนรับจริง → E06 High + E31 High (V-09)",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0004",
      "dms_id": "DMS-2026-000152",
      "title": "E28 (line math) → bypass ไม่เรียก Oracle: V-04/V-05/V-07/V-08/V-09 = not_evaluated",
      "actor": {
        "uploadedBy": "SOMSAK.J",
        "receiver": null
      },
      "pdf": null,
      "pdf_synth": false,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Hold",
        "codes": [
          "E28"
        ],
        "assigned": "accounting",
        "haltedBy": "V-02"
      },
      "dup_key": "S R Y Engineering & Trading||SR6909-1142",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0004-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000152",
          "document_id": "AIVA-2609-0004",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-09-27T08:20:15+07:00",
          "status": "Hold",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000152",
            "pages": 1,
            "pages_complete": true,
            "uploaded_by": "SOMSAK.J",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "SR6909-1142",
            "invoice_date": "27/09/2026",
            "supplier_name": "S R Y Engineering & Trading",
            "supplier_tax_id": "0105560013399",
            "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane Ladbu Lao 13160",
            "customer_tax_id": "0107545000213",
            "po_number": "40120973",
            "release_num": null,
            "currency": "THB",
            "sub_total": "520",
            "vat": "36.4",
            "grand_total": "556.4"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": true,
            "halted_by": "V-02",
            "org_id": null,
            "org_name": null,
            "company": "UNMAPPED",
            "company_label": "map ไม่ได้",
            "company_mapped": false,
            "company_reason": "ไม่มี ORG_ID (ไม่มีการเรียก Oracle หรือ snapshot ไม่ส่งแถวใบรับ)",
            "row_count": 0,
            "active_row_count": 0,
            "rows": [],
            "total_value": null,
            "receiver": null
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": null,
              "description": "ก๊าซ co2 ขนาด 25 กก. ค้างสต๊อก",
              "qty": "2",
              "uom": "CYL",
              "unit_price": "280",
              "amount": "520"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "FAIL",
              "code": "E28",
              "severity": "High",
              "details": "บรรทัด 1: 560 ≠ 520 (ต่าง 40)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "Bypass ไม่เรียก Oracle ตามกติกา E28",
              "page": null,
              "halted_by": "V-02"
            },
            {
              "rule_id": "V-05",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ถูกข้ามเพราะ V-02 พบ E28",
              "page": null,
              "halted_by": "V-02"
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ถูกข้ามเพราะ V-02 พบ E28",
              "page": null,
              "halted_by": "V-02"
            },
            {
              "rule_id": "V-08",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ถูกข้ามเพราะ V-02 พบ E28",
              "page": null,
              "halted_by": "V-02"
            },
            {
              "rule_id": "V-09",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ถูกข้ามเพราะ V-02 พบ E28",
              "page": null,
              "halted_by": "V-02"
            }
          ],
          "exceptions": [
            {
              "code": "E28",
              "rule_id": "V-02",
              "severity": "High",
              "message": "ผลคูณจำนวน×ราคาต่อหน่วยไม่ตรงกับยอดเงิน → Bypass การเรียก Oracle ทั้งหมด",
              "page": 1
            }
          ],
          "matches": [],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Hold",
            "assigned_to": "accounting",
            "halted_by": "V-02",
            "manual_review": false
          },
          "note": "E28 (line math) → bypass ไม่เรียก Oracle: V-04/V-05/V-07/V-08/V-09 = not_evaluated",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0005",
      "dms_id": "DMS-2026-000158",
      "title": "จับคู่ด้วย description token (M3) + หน่วยนับไม่ตรง → E12 Medium",
      "actor": {
        "uploadedBy": "THANAKORN.M",
        "receiver": "THANAKORN MANKONG"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000158_r1.pdf",
          "pages": 2,
          "uploaded_at": "2026-09-27T13:05:39+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Review",
        "codes": [
          "E12"
        ],
        "assigned": "user",
        "matchLevels": [
          "M3"
        ]
      },
      "dup_key": "Siam Auto Parts Co., Ltd.||AM-2609-0412",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0005-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000158",
          "document_id": "AIVA-2609-0005",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-09-27T13:05:39+07:00",
          "status": "Review",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000158",
            "pages": 2,
            "pages_complete": true,
            "uploaded_by": "THANAKORN.M",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "AM-2609-0412",
            "invoice_date": "27/09/2026",
            "supplier_name": "Siam Auto Parts Co., Ltd.",
            "supplier_tax_id": "0135546000210",
            "customer_name": "บริษัท เอเบิล มอเตอร์ส จำกัด",
            "customer_address": "14/9 MOO 14 PHAHOLYOTHIN ROAD LAKSI 12120",
            "customer_tax_id": "0135546008643",
            "po_number": "45008812",
            "release_num": "12",
            "currency": "THB",
            "sub_total": "10000",
            "vat": "700",
            "grand_total": "10700"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 376,
            "org_name": "เอเบิล มอเตอร์ส",
            "company": "AM",
            "company_label": "เอเบิล มอเตอร์ส",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "45008812",
                "RECEIPT_NUM": "560020415",
                "LINE_NUM": 5,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "HOSE ASSY HYDRAULIC R3",
                "QUANTITY_RECEIVED": "8",
                "UNIT_MEAS_LOOKUP_CODE": "PC",
                "UNIT_PRICE": "1250",
                "LINE_TOTAL": "10000",
                "ORG_ID": 376,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "10000",
            "receiver": "THANAKORN MANKONG"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": null,
              "description": "hydraulic hose assy r3 450mm",
              "qty": "8",
              "uom": "EA",
              "unit_price": "1250",
              "amount": "10000"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 560020415 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล เอเบิล มอเตอร์ส · ตรวจที่อยู่แบบ substring → HQ/สาขา (12120)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M3",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 10000 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E12",
              "rule_id": "V-07",
              "severity": "Medium",
              "message": "บรรทัด 1: หน่วยนับไม่ตรง (บิล EA · ใบรับ PC)",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M3",
              "match_note": "จับคู่ด้วย token ใน description (เสี่ยงกำกวม)",
              "receipt_line": 5,
              "receipt_num": "560020415",
              "receipt_qty": "8",
              "receipt_price": "1250",
              "receipt_uom": "PC",
              "price_flag": null,
              "uom_flag": "E12",
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Review",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "จับคู่ด้วย description token (M3) + หน่วยนับไม่ตรง → E12 Medium",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0006",
      "dms_id": "DMS-2026-000161",
      "title": "ไม่พบการรับของใน ERP → E17 High · เอกสารไม่มี Receiver งานจริงจึงตกที่ฝ่ายบัญชี",
      "actor": {
        "uploadedBy": "WILAIWAN.S",
        "receiver": null
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000161_r1.pdf",
          "pages": 1,
          "uploaded_at": "2026-09-28T08:44:21+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Hold",
        "codes": [
          "E17",
          "E30",
          "E31"
        ],
        "assigned": "user"
      },
      "dup_key": "Sanwa Precision Tools Co., Ltd.||TK-2609-0120",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0006-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000161",
          "document_id": "AIVA-2609-0006",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-09-28T08:44:21+07:00",
          "status": "Hold",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000161",
            "pages": 1,
            "pages_complete": true,
            "uploaded_by": "WILAIWAN.S",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "TK-2609-0120",
            "invoice_date": "28/09/2026",
            "supplier_name": "Sanwa Precision Tools Co., Ltd.",
            "supplier_tax_id": "0145548002210",
            "customer_name": "บริษัท อาปิโก ไฮเทค ทูลลิ่ง จำกัด",
            "customer_address": "99/1 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0145548001557",
            "po_number": "40121210",
            "release_num": null,
            "currency": "THB",
            "sub_total": "560",
            "vat": "39.2",
            "grand_total": "599.2"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": null,
            "org_name": null,
            "company": "UNMAPPED",
            "company_label": "map ไม่ได้",
            "company_mapped": false,
            "company_reason": "ไม่มี ORG_ID (ไม่มีการเรียก Oracle หรือ snapshot ไม่ส่งแถวใบรับ)",
            "row_count": 0,
            "active_row_count": 0,
            "rows": [],
            "total_value": "0",
            "receiver": null
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "CD-D8",
              "description": "carbide drill d8 45l",
              "qty": "2",
              "uom": "PCS",
              "unit_price": "280",
              "amount": "560"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "FAIL",
              "code": "E17",
              "severity": "High",
              "details": "SQL ไม่คืนแถวที่ QTY_RECEIVED > 0 (PO 40121210) — ผู้รับของ/ใบรับจึงยังไม่ปรากฏใน Portal",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ไม่มีแถวใบรับ จึงไม่มี ORG_ID ให้เทียบ master",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "FAIL",
              "code": "E05",
              "severity": "High",
              "details": "พบบรรทัดที่ไม่อาจจับคู่ได้ หรือราคาต่างเกินกรอบยอมรับ",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "FAIL",
              "code": "E31",
              "severity": "High",
              "details": "subtotal บิล 560 vs Σ(รับจริง × ราคาใบรับ) 0 ต่าง 560",
              "page": 1,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E17",
              "rule_id": "V-04",
              "severity": "High",
              "message": "ไม่พบใบรับสินค้า หรือจำนวนรับเป็น 0 ในระบบ ERP",
              "page": 1
            },
            {
              "code": "E30",
              "rule_id": "V-07",
              "severity": "High",
              "message": "บรรทัด 1 ไม่พบบรรทัดที่ตรงในใบรับ",
              "page": 1
            },
            {
              "code": "E31",
              "rule_id": "V-09",
              "severity": "High",
              "message": "ยอดรวมมูลค่าสินค้าไม่ตรงกับยอดรวมใบรับสินค้า",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": null,
              "note": "ไม่พบบรรทัดในใบรับ",
              "receipt_line": null,
              "receipt_qty": null,
              "receipt_price": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Hold",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "ไม่พบการรับของใน ERP → E17 High · เอกสารไม่มี Receiver งานจริงจึงตกที่ฝ่ายบัญชี",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0007",
      "dms_id": "DMS-2026-000170",
      "title": "ORG_ID 223 สถานะ UNKNOWN ใน master → V-05 = manual_review (fail-safe ห้าม Auto-pass)",
      "actor": {
        "uploadedBy": "NARONG.P",
        "receiver": "NARONG PHOLSRI"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000170_r1.pdf",
          "pages": 1,
          "uploaded_at": "2026-09-29T09:02:00+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Manual Review",
        "codes": [],
        "assigned": "accounting"
      },
      "dup_key": "Metro Supply Co., Ltd.||MG-2609-0009",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0007-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000170",
          "document_id": "AIVA-2609-0007",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-09-29T09:02:00+07:00",
          "status": "Manual Review",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000170",
            "pages": 1,
            "pages_complete": true,
            "uploaded_by": "NARONG.P",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "MG-2609-0009",
            "invoice_date": "29/09/2026",
            "supplier_name": "Metro Supply Co., Ltd.",
            "supplier_tax_id": "0105557004411",
            "customer_name": "บริษัท เอ แมคชั่น จำกัด",
            "customer_address": "99 Moo 1 Hi-tech Industrial Estate 13160",
            "customer_tax_id": "0107547000354",
            "po_number": "48000121",
            "release_num": null,
            "currency": "THB",
            "sub_total": "1000",
            "vat": "70",
            "grand_total": "1070"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 223,
            "org_name": "เอ แมคชั่น",
            "company": "UNMAPPED",
            "company_label": "map ไม่ได้",
            "company_mapped": false,
            "company_reason": "ORG_ID 223 สถานะ UNKNOWN ใน master (engine ให้ผล manual_review)",
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "48000121",
                "RECEIPT_NUM": "580001120",
                "LINE_NUM": 1,
                "ITEM_NUMBER": "SVC-KIT",
                "ITEM_DESCRIPTION": "SERVICE KIT MAINTENANCE",
                "QUANTITY_RECEIVED": "5",
                "UNIT_MEAS_LOOKUP_CODE": "SET",
                "UNIT_PRICE": "200",
                "LINE_TOTAL": "1000",
                "ORG_ID": 223,
                "OU_ORG_ID": null
              }
            ],
            "total_value": null,
            "receiver": "NARONG PHOLSRI"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "SVC-KIT",
              "description": "service kit ชุดบำรุงรักษา",
              "qty": "5",
              "uom": "SET",
              "unit_price": "200",
              "amount": "1000"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 580001120 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "MANUAL",
              "code": null,
              "severity": "Medium",
              "details": "ORG_ID 223 → สถานะ UNKNOWN ใน master snapshot (fail-safe: ห้าม Auto-pass)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ยังไม่จับคู่รายบรรทัด เพราะต้องยืนยันสถานะ master/gainting ก่อน (fail-safe)",
              "page": null,
              "halted_by": "V-04/V-05"
            },
            {
              "rule_id": "V-08",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": "V-04/V-05"
            },
            {
              "rule_id": "V-09",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": "V-04/V-05"
            }
          ],
          "exceptions": [],
          "matches": [],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Manual Review",
            "assigned_to": "accounting",
            "halted_by": null,
            "manual_review": true
          },
          "note": "ORG_ID 223 สถานะ UNKNOWN ใน master → V-05 = manual_review (fail-safe ห้าม Auto-pass)",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0008",
      "dms_id": "DMS-2026-000163",
      "title": "ฉบับตั้งหนี้จริง (คู่ซ้ำกับ 0009 — ผู้ขาย + เลขที่ใบแจ้งหนี้เดียวกัน)",
      "actor": {
        "uploadedBy": "PRAPHAN.K",
        "receiver": "PRAPHAN KAEWKLA"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000163_r1.pdf",
          "pages": 3,
          "uploaded_at": "2026-09-28T11:15:00+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Auto-pass",
        "codes": [],
        "assigned": null
      },
      "dup_key": "NX Shoji (Thailand) Co., Ltd.||PL-2609-0055",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0008-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000163",
          "document_id": "AIVA-2609-0008",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-09-28T11:15:00+07:00",
          "status": "Auto-pass",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000163",
            "pages": 3,
            "pages_complete": true,
            "uploaded_by": "PRAPHAN.K",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "PL-2609-0055",
            "invoice_date": "28/09/2026",
            "supplier_name": "NX Shoji (Thailand) Co., Ltd.",
            "supplier_tax_id": "0105559003322",
            "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0107545000213",
            "po_number": "43042811",
            "release_num": null,
            "currency": "THB",
            "sub_total": "31000",
            "vat": "2170",
            "grand_total": "33170"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 103,
            "org_name": "อาปิโก ไฮเทค (โรงงานอยุธยา)",
            "company": "AH",
            "company_label": "อาปิโก ไฮเทค",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "43042811",
                "RECEIPT_NUM": "530340201",
                "LINE_NUM": 1,
                "ITEM_NUMBER": "PLT-1111",
                "ITEM_DESCRIPTION": "PLASTIC PALLET 1100 X 1100",
                "QUANTITY_RECEIVED": "50",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "620",
                "LINE_TOTAL": "31000",
                "ORG_ID": 103,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "31000",
            "receiver": "PRAPHAN KAEWKLA"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "PLT-1111",
              "description": "plastic pallet 1100x1100 reinforced",
              "qty": "50",
              "uom": "PCS",
              "unit_price": "620",
              "amount": "31000"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 530340201 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค (โรงงานอยุธยา) · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 31000 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M2",
              "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
              "receipt_line": 1,
              "receipt_num": "530340201",
              "receipt_qty": "50",
              "receipt_price": "620",
              "receipt_uom": "PCS",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Auto-pass",
            "assigned_to": null,
            "halted_by": null,
            "manual_review": false
          },
          "note": "ฉบับตั้งหนี้จริง (คู่ซ้ำกับ 0009 — ผู้ขาย + เลขที่ใบแจ้งหนี้เดียวกัน)",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": [
        "AIVA-2609-0009"
      ]
    },
    {
      "document_id": "AIVA-2609-0009",
      "dms_id": "DMS-2026-000163-A",
      "title": "สำเนาซ้ำของ PL-2609-0055 — ถูกปฏิเสธแล้ว (workflow REJECTED ปิด action อื่นทั้งหมด)",
      "actor": {
        "uploadedBy": "PRAPHAN.K",
        "receiver": "PRAPHAN KAEWKLA"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000163-A_r1.pdf",
          "pages": 3,
          "uploaded_at": "2026-09-28T11:17:40+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": {
        "status": "REJECTED",
        "heldBy": null,
        "decidedBy": "u6",
        "version": 2,
        "note": "เอกสารซ้ำ — เลือกฉบับ AIVA-2609-0008 เป็นฉบับตั้งหนี้"
      },
      "outbox": [],
      "expect": {
        "status": "Auto-pass",
        "codes": [],
        "assigned": null,
        "duplicateWith": "AIVA-2609-0008"
      },
      "dup_key": "NX Shoji (Thailand) Co., Ltd.||PL-2609-0055",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0009-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000163-A",
          "document_id": "AIVA-2609-0009",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-09-28T11:17:40+07:00",
          "status": "Auto-pass",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000163-A",
            "pages": 3,
            "pages_complete": true,
            "uploaded_by": "PRAPHAN.K",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "PL-2609-0055",
            "invoice_date": "28/09/2026",
            "supplier_name": "NX Shoji (Thailand) Co., Ltd.",
            "supplier_tax_id": "0105559003322",
            "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0107545000213",
            "po_number": "43042811",
            "release_num": null,
            "currency": "THB",
            "sub_total": "31000",
            "vat": "2170",
            "grand_total": "33170"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 103,
            "org_name": "อาปิโก ไฮเทค (โรงงานอยุธยา)",
            "company": "AH",
            "company_label": "อาปิโก ไฮเทค",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "43042811",
                "RECEIPT_NUM": "530340201",
                "LINE_NUM": 1,
                "ITEM_NUMBER": "PLT-1111",
                "ITEM_DESCRIPTION": "PLASTIC PALLET 1100 X 1100",
                "QUANTITY_RECEIVED": "50",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "620",
                "LINE_TOTAL": "31000",
                "ORG_ID": 103,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "31000",
            "receiver": "PRAPHAN KAEWKLA"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "PLT-1111",
              "description": "plastic pallet 1100x1100 reinforced",
              "qty": "50",
              "uom": "PCS",
              "unit_price": "620",
              "amount": "31000"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 530340201 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค (โรงงานอยุธยา) · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 31000 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M2",
              "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
              "receipt_line": 1,
              "receipt_num": "530340201",
              "receipt_qty": "50",
              "receipt_price": "620",
              "receipt_uom": "PCS",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Auto-pass",
            "assigned_to": null,
            "halted_by": null,
            "manual_review": false
          },
          "note": "สำเนาซ้ำของ PL-2609-0055 — ถูกปฏิเสธแล้ว (workflow REJECTED ปิด action อื่นทั้งหมด)",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": [
        "AIVA-2609-0008"
      ]
    },
    {
      "document_id": "AIVA-2609-0010",
      "dms_id": "DMS-2026-000177",
      "title": "ไม่มีเลข PO + Tax ID ผู้ขายว่าง → V-01 = E13 Medium (จับคู่ด้วย line number M2)",
      "actor": {
        "uploadedBy": "WILAIWAN.S",
        "receiver": "WILAIWAN SRISUK"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000177_r1.pdf",
          "pages": 2,
          "uploaded_at": "2026-09-29T14:20:00+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Review",
        "codes": [
          "E13"
        ],
        "assigned": "user",
        "matchLevels": [
          "M2"
        ]
      },
      "dup_key": "Quality Tool Traders||QT2609017",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0010-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000177",
          "document_id": "AIVA-2609-0010",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-09-29T14:20:00+07:00",
          "status": "Review",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000177",
            "pages": 2,
            "pages_complete": true,
            "uploaded_by": "WILAIWAN.S",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "QT2609017",
            "invoice_date": "29/09/2026",
            "supplier_name": "Quality Tool Traders",
            "supplier_tax_id": null,
            "customer_name": "บริษัท อาปิโก ไฮเทค ทูลลิ่ง จำกัด",
            "customer_address": "99/1 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0145548001557",
            "po_number": null,
            "release_num": null,
            "currency": "THB",
            "sub_total": "4400",
            "vat": "308",
            "grand_total": "4708"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 352,
            "org_name": "อาปิโก ไฮเทค ทูลลิ่ง",
            "company": "AHT",
            "company_label": "อาปิโก ไฮเทค ทูลลิ่ง",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "40121455",
                "RECEIPT_NUM": "540112305",
                "LINE_NUM": 1,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "INSERTS BRANCH COPPER 8MM",
                "QUANTITY_RECEIVED": "20",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "220",
                "LINE_TOTAL": "4400",
                "ORG_ID": 352,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "4400",
            "receiver": "WILAIWAN SRISUK"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": null,
              "description": "แบรนช์ทองแดง 8 mm ทองแดง",
              "qty": "20",
              "uom": "PCS",
              "unit_price": "220",
              "amount": "4400"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "FAIL",
              "code": "E13",
              "severity": "Medium",
              "details": "Missing: supplier_tax_id, po_number",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 540112305 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค ทูลลิ่ง · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 4400 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E13",
              "rule_id": "V-01",
              "severity": "Medium",
              "message": "ฟิลด์ไม่ครบ: supplier_tax_id, po_number",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M2",
              "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
              "receipt_line": 1,
              "receipt_num": "540112305",
              "receipt_qty": "20",
              "receipt_price": "220",
              "receipt_uom": "PCS",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Review",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "ไม่มีเลข PO + Tax ID ผู้ขายว่าง → V-01 = E13 Medium (จับคู่ด้วย line number M2)",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0011",
      "dms_id": "DMS-2026-000181",
      "title": "หลายใบรับในบิลเดียว (E35) + วางบิลเกิน (E06) + วางบิลบางส่วน (E34)",
      "actor": {
        "uploadedBy": "THANAKORN.M",
        "receiver": "THANAKORN MANKONG"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000181_r1.pdf",
          "pages": 2,
          "uploaded_at": "2026-09-30T08:10:00+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Hold",
        "codes": [
          "E35",
          "E06",
          "E34"
        ],
        "assigned": "user"
      },
      "dup_key": "Central Parts Distribution Co., Ltd.||MGP-2609-0032",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0011-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000181",
          "document_id": "AIVA-2609-0011",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-09-30T08:10:00+07:00",
          "status": "Hold",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000181",
            "pages": 2,
            "pages_complete": true,
            "uploaded_by": "THANAKORN.M",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "MGP-2609-0032",
            "invoice_date": "30/09/2026",
            "supplier_name": "Central Parts Distribution Co., Ltd.",
            "supplier_tax_id": "0125562039001",
            "customer_name": "บริษัท เอ็มจี เอเบิล มอเตอร์ส จำกัด",
            "customer_address": "88 Moo 5 Bang Bua Thong Pathum Thani 12000",
            "customer_tax_id": "0135564010484",
            "po_number": "49001007",
            "release_num": null,
            "currency": "THB",
            "sub_total": "1600",
            "vat": "112",
            "grand_total": "1712"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 556,
            "org_name": "เอ็มจี เอเบิล มอเตอร์ส",
            "company": "MGP",
            "company_label": "เอ็มจี เอเบิล มอเตอร์ส",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 2,
            "active_row_count": 2,
            "rows": [
              {
                "PO_NUMBER": "49001007",
                "RECEIPT_NUM": "556000111",
                "LINE_NUM": 1,
                "ITEM_NUMBER": "BRKF-PAD",
                "ITEM_DESCRIPTION": "BRAKE PAD FRONT SET",
                "QUANTITY_RECEIVED": "10",
                "UNIT_MEAS_LOOKUP_CODE": "SET",
                "UNIT_PRICE": "100",
                "LINE_TOTAL": "1000",
                "ORG_ID": 556,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "49001007",
                "RECEIPT_NUM": "556000112",
                "LINE_NUM": 2,
                "ITEM_NUMBER": "BRKR-PAD",
                "ITEM_DESCRIPTION": "BRAKE PAD REAR SET",
                "QUANTITY_RECEIVED": "6",
                "UNIT_MEAS_LOOKUP_CODE": "SET",
                "UNIT_PRICE": "100",
                "LINE_TOTAL": "600",
                "ORG_ID": 556,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "1600",
            "receiver": "THANAKORN MANKONG"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "BRKF-PAD",
              "description": "brkf-pad ชุดเบรกหน้า",
              "qty": "12",
              "uom": "SET",
              "unit_price": "100",
              "amount": "1200"
            },
            {
              "line_no": 2,
              "item_code": "BRKR-PAD",
              "description": "brkr-pad ชุดเบรกหลัง",
              "qty": "4",
              "uom": "SET",
              "unit_price": "100",
              "amount": "400"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "FAIL",
              "code": "E35",
              "severity": "High",
              "details": "พบหลายใบรับในบิลเดียว: 556000111, 556000112",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล เอ็มจี เอเบิล มอเตอร์ส · ตรวจที่อยู่แบบ substring → HQ/สาขา (12000)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "FAIL",
              "code": "E06",
              "severity": "High",
              "details": "มีบรรทัดที่จำนวนวางบิลเกินจำนวนรับจริง",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 1600 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E35",
              "rule_id": "V-04",
              "severity": "High",
              "message": "พบหลายใบรับในบิลเดียว: 556000111, 556000112",
              "page": 1
            },
            {
              "code": "E06",
              "rule_id": "V-08",
              "severity": "High",
              "message": "บรรทัด 1: วางบิล 12 > รับจริง 10",
              "page": 1
            },
            {
              "code": "E34",
              "rule_id": "V-08",
              "severity": "Medium",
              "message": "บรรทัด 2: วางบิลบางส่วน 4 จากที่รับจริง 6",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M1",
              "match_note": "พบ item code ใน description",
              "receipt_line": 1,
              "receipt_num": "556000111",
              "receipt_qty": "10",
              "receipt_price": "100",
              "receipt_uom": "SET",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": "E06"
            },
            {
              "line_no": 2,
              "match_level": "M1",
              "match_note": "พบ item code ใน description",
              "receipt_line": 2,
              "receipt_num": "556000112",
              "receipt_qty": "6",
              "receipt_price": "100",
              "receipt_uom": "SET",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": "E34"
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Hold",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "หลายใบรับในบิลเดียว (E35) + วางบิลเกิน (E06) + วางบิลบางส่วน (E34)",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0012",
      "dms_id": "DMS-2026-000185",
      "title": "E16 Low → ยัง Auto-pass แต่ผู้แนบเอกสาร (PANIDA.R) เป็นบัญชีที่มีสิทธิ์ยืนยันเอง",
      "actor": {
        "uploadedBy": "PANIDA.R",
        "receiver": "SOMSAK JAIDEE"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000185_r1.pdf",
          "pages": 1,
          "uploaded_at": "2026-09-30T10:00:00+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Auto-pass",
        "codes": [
          "E16"
        ],
        "assigned": null
      },
      "dup_key": "Siam Fabrication Service||FAB-2609-0101",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0012-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000185",
          "document_id": "AIVA-2609-0012",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-09-30T10:00:00+07:00",
          "status": "Auto-pass",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000185",
            "pages": 1,
            "pages_complete": true,
            "uploaded_by": "PANIDA.R",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "FAB-2609-0101",
            "invoice_date": "30/09/2026",
            "supplier_name": "Siam Fabrication Service",
            "supplier_tax_id": "0105558002299",
            "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0107545000213",
            "po_number": "42052900",
            "release_num": null,
            "currency": "THB",
            "sub_total": "1000",
            "vat": "69.99",
            "grand_total": "1069.99"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 103,
            "org_name": "อาปิโก ไฮเทค (โรงงานอยุธยา)",
            "company": "AH",
            "company_label": "อาปิโก ไฮเทค",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "42052900",
                "RECEIPT_NUM": "530340300",
                "LINE_NUM": 1,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "WELDED SUPPORT BRACKET",
                "QUANTITY_RECEIVED": "7",
                "UNIT_MEAS_LOOKUP_CODE": "JOB",
                "UNIT_PRICE": "142.857",
                "LINE_TOTAL": "999.999",
                "ORG_ID": 103,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "999.999",
            "receiver": "SOMSAK JAIDEE"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": null,
              "description": "งานเชื่อมประกอบแท่นรองรับ",
              "qty": "7",
              "uom": "JOB",
              "unit_price": "142.857",
              "amount": "1000"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": "E16",
              "severity": "Low",
              "details": "sum(lines)=1000 vs subtotal=1000 (ต่าง 0) · VAT คาด=70 ได้=69.99 (ต่าง 0.01) · grand คาด=1069.99 ได้=1069.99 (ต่าง 0)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 530340300 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค (โรงงานอยุธยา) · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 999.999 ต่างจาก subtotal 0.001 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E16",
              "rule_id": "V-03",
              "severity": "Low",
              "message": "มีผลต่างเศษสตางค์จากการคำนวณ (อยู่ในเกณฑ์ยอมรับ)",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M2",
              "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
              "receipt_line": 1,
              "receipt_num": "530340300",
              "receipt_qty": "7",
              "receipt_price": "142.857",
              "receipt_uom": "JOB",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Auto-pass",
            "assigned_to": null,
            "halted_by": null,
            "manual_review": false
          },
          "note": "E16 Low → ยัง Auto-pass แต่ผู้แนบเอกสาร (PANIDA.R) เป็นบัญชีที่มีสิทธิ์ยืนยันเอง",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0013",
      "dms_id": "DMS-2026-000192",
      "title": "2 revision: แก้ลายเซ็นแล้วแต่หน่วยนับยังต่าง (Hold → Review) และอยู่ระหว่าง On Hold",
      "actor": {
        "uploadedBy": "SOMSAK.J",
        "receiver": "SOMSAK JAIDEE"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000192_r1.pdf",
          "pages": 2,
          "uploaded_at": "2026-10-01T09:30:00+07:00",
          "size_kb": 397
        },
        "2": {
          "file_name": "DMS-2026-000192_r2.pdf",
          "pages": 2,
          "uploaded_at": "2026-10-03T08:12:00+07:00",
          "size_kb": 414
        }
      },
      "pdf_synth": true,
      "seed_workflow": {
        "status": "ON_HOLD",
        "heldBy": "u6",
        "decidedBy": null,
        "version": 3,
        "note": "รอบรอผู้ขายออกใบลดหนี้ส่วนต่างหน่วยนับ — ACC กด On Hold ไว้กันงานหลุด"
      },
      "outbox": [],
      "expect": {
        "status": "Review",
        "codes": [
          "E12"
        ],
        "assigned": "user",
        "revisions": 2
      },
      "dup_key": "Tong Tong Steel Co., Ltd.||TTS-2609-0777",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0013-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000192",
          "document_id": "AIVA-2609-0013",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-10-01T09:30:00+07:00",
          "status": "Hold",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000192",
            "pages": 2,
            "pages_complete": true,
            "uploaded_by": "SOMSAK.J",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "TTS-2609-0777",
            "invoice_date": "01/10/2026",
            "supplier_name": "Tong Tong Steel Co., Ltd.",
            "supplier_tax_id": "0105535041122",
            "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane Ladbu Lao Ayutthaya 13160",
            "customer_tax_id": "0107545000213",
            "po_number": "40100399",
            "release_num": "5",
            "currency": "THB",
            "sub_total": "34800",
            "vat": "2436",
            "grand_total": "37236"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 103,
            "org_name": "อาปิโก ไฮเทค (โรงงานอยุธยา)",
            "company": "AH",
            "company_label": "อาปิโก ไฮเทค",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "40100399",
                "RECEIPT_NUM": "530340400",
                "LINE_NUM": 1,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "CLAMP SET 24 MM FIXTURE",
                "QUANTITY_RECEIVED": "24",
                "UNIT_MEAS_LOOKUP_CODE": "SET",
                "UNIT_PRICE": "1450",
                "LINE_TOTAL": "34800",
                "ORG_ID": 103,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "34800",
            "receiver": "SOMSAK JAIDEE"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": null,
              "description": "ชุด clamp 24 mm ยึดแท่นจับ",
              "qty": "24",
              "uom": "SET",
              "unit_price": "1450",
              "amount": "34800"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 530340400 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค (โรงงานอยุธยา) · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "FAIL",
              "code": "E26",
              "severity": "High",
              "details": "ไม่พบลายเซ็น/ตราประทับในช่องผู้รับของ",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 34800 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E26",
              "rule_id": "V-06",
              "severity": "High",
              "message": "ไม่พบลายเซ็นผู้รับของบนเอกสาร",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M2",
              "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
              "receipt_line": 1,
              "receipt_num": "530340400",
              "receipt_qty": "24",
              "receipt_price": "1450",
              "receipt_uom": "SET",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 2
            },
            "receiver": {
              "present": false,
              "page": null
            }
          },
          "decision": {
            "status": "Hold",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "2 revision: แก้ลายเซ็นแล้วแต่หน่วยนับยังต่าง (Hold → Review) และอยู่ระหว่าง On Hold",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        },
        {
          "schema_version": "1.0",
          "event_id": "EVT-0013-2",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000192",
          "document_id": "AIVA-2609-0013",
          "revision": 2,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-10-03T08:12:00+07:00",
          "status": "Review",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000192",
            "pages": 2,
            "pages_complete": true,
            "uploaded_by": "SOMSAK.J",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "TTS-2609-0777",
            "invoice_date": "03/10/2026",
            "supplier_name": "Tong Tong Steel Co., Ltd.",
            "supplier_tax_id": "0105535041122",
            "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane Ladbu Lao Ayutthaya 13160",
            "customer_tax_id": "0107545000213",
            "po_number": "40100399",
            "release_num": "5",
            "currency": "THB",
            "sub_total": "34800",
            "vat": "2436",
            "grand_total": "37236"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 103,
            "org_name": "อาปิโก ไฮเทค (โรงงานอยุธยา)",
            "company": "AH",
            "company_label": "อาปิโก ไฮเทค",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "40100399",
                "RECEIPT_NUM": "530340412",
                "LINE_NUM": 1,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "CLAMP SET 24 MM FIXTURE",
                "QUANTITY_RECEIVED": "24",
                "UNIT_MEAS_LOOKUP_CODE": "LOT",
                "UNIT_PRICE": "1450",
                "LINE_TOTAL": "34800",
                "ORG_ID": 103,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "34800",
            "receiver": "SOMSAK JAIDEE"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": null,
              "description": "ชุด clamp 24 mm ยึดแท่นจับ",
              "qty": "24",
              "uom": "SET",
              "unit_price": "1450",
              "amount": "34800"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 530340412 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค (โรงงานอยุธยา) · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 2 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 34800 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E12",
              "rule_id": "V-07",
              "severity": "Medium",
              "message": "บรรทัด 1: หน่วยนับไม่ตรง (บิล SET · ใบรับ LOT)",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M2",
              "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
              "receipt_line": 1,
              "receipt_num": "530340412",
              "receipt_qty": "24",
              "receipt_price": "1450",
              "receipt_uom": "LOT",
              "price_flag": null,
              "uom_flag": "E12",
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 2
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Review",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "2 revision: แก้ลายเซ็นแล้วแต่หน่วยนับยังต่าง (Hold → Review) และอยู่ระหว่าง On Hold",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0014",
      "dms_id": "DMS-2026-000196",
      "title": "M4 fallback (ไม่มี item/line/token ตรง) + หน้าเอกสารไม่ครบ (Vision อ่านได้ 8/9) → Review",
      "actor": {
        "uploadedBy": "THANAKORN.M",
        "receiver": "THANAKORN MANKONG"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000196_r1.pdf",
          "pages": 9,
          "uploaded_at": "2026-10-02T11:05:00+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Review",
        "codes": [
          "E13"
        ],
        "assigned": "user",
        "matchLevels": [
          "M4"
        ]
      },
      "dup_key": "Bangkok Metal Works Co., Ltd.||FAB-2610-0007",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0014-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000196",
          "document_id": "AIVA-2609-0014",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-10-02T11:05:00+07:00",
          "status": "Review",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000196",
            "pages": 9,
            "pages_complete": false,
            "uploaded_by": "THANAKORN.M",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "FAB-2610-0007",
            "invoice_date": "02/10/2026",
            "supplier_name": "Bangkok Metal Works Co., Ltd.",
            "supplier_tax_id": "0105547005566",
            "customer_name": "บริษัท เอเบิล มอเตอร์ส จำกัด",
            "customer_address": "14/9 MOO 14 PHAHOLYOTHIN ROAD LAKSI 12120",
            "customer_tax_id": "0135546008643",
            "po_number": "45008901",
            "release_num": null,
            "currency": "THB",
            "sub_total": "12000",
            "vat": "840",
            "grand_total": "12840"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 376,
            "org_name": "เอเบิล มอเตอร์ส",
            "company": "AM",
            "company_label": "เอเบิล มอเตอร์ส",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "45008901",
                "RECEIPT_NUM": "560020501",
                "LINE_NUM": 9,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "STEEL PLATFORM MODIFICATION",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "JOB",
                "UNIT_PRICE": "12000",
                "LINE_TOTAL": "12000",
                "ORG_ID": 376,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "12000",
            "receiver": "THANAKORN MANKONG"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": null,
              "description": "misc fabrication work bay 3",
              "qty": "1",
              "uom": "JOB",
              "unit_price": "12000",
              "amount": "12000"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "FAIL",
              "code": "E13",
              "severity": "Medium",
              "details": "Missing: pages_incomplete",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 560020501 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล เอเบิล มอเตอร์ส · ตรวจที่อยู่แบบ substring → HQ/สาขา (12120)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "หน้าที่ไม่ครบถูกตัดสินที่ V-01 (E13)",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M4",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 12000 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E13",
              "rule_id": "V-01",
              "severity": "Medium",
              "message": "ฟิลด์ไม่ครบ: pages_incomplete",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M4",
              "match_note": "fallback → แถวแรกที่ยัง active (อาจจับคู่ผิด + ใช้แถวซ้ำ)",
              "receipt_line": 9,
              "receipt_num": "560020501",
              "receipt_qty": "1",
              "receipt_price": "12000",
              "receipt_uom": "JOB",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Review",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "M4 fallback (ไม่มี item/line/token ตรง) + หน้าเอกสารไม่ครบ (Vision อ่านได้ 8/9) → Review",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0015",
      "dms_id": "DMS-2026-000198",
      "title": "Resubmit แล้วแต่ producer ยังไม่ส่ง revision ใหม่ (outbox ค้าง · retry 3 ครั้ง)",
      "actor": {
        "uploadedBy": "WILAIWAN.S",
        "receiver": "WILAIWAN SRISUK"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000198_r1.pdf",
          "pages": 1,
          "uploaded_at": "2026-10-02T14:05:00+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": {
        "status": "RESUBMITTED",
        "heldBy": null,
        "decidedBy": "u5",
        "version": 4,
        "note": "Receiver กดรับของใน ERP แล้ว · ฝ่ายบัญชีส่ง resubmit ไป OCR แล้ว (รอ revision 2)"
      },
      "outbox": [
        {
          "event_id": "EVT-RERUN-0015",
          "event_type": "RERUN_REQUEST",
          "waiting_revision": 2,
          "status": "PENDING",
          "attempts": 3,
          "max_attempts": 5,
          "last_error": "HTTP 502 จาก receiving endpoint",
          "queued_at": "2026-10-02T15:40:00+07:00"
        }
      ],
      "expect": {
        "status": "Hold",
        "codes": [
          "E17",
          "E30",
          "E31"
        ],
        "assigned": "user",
        "outboxPending": true
      },
      "dup_key": "Siam Pipe Fitting Co., Ltd.||SP-2610-0044",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0015-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000198",
          "document_id": "AIVA-2609-0015",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-10-02T14:05:00+07:00",
          "status": "Hold",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000198",
            "pages": 1,
            "pages_complete": true,
            "uploaded_by": "WILAIWAN.S",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "SP-2610-0044",
            "invoice_date": "02/10/2026",
            "supplier_name": "Siam Pipe Fitting Co., Ltd.",
            "supplier_tax_id": "0105544007788",
            "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0107545000213",
            "po_number": "40100455",
            "release_num": null,
            "currency": "THB",
            "sub_total": "8400",
            "vat": "588",
            "grand_total": "8988"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": null,
            "org_name": null,
            "company": "UNMAPPED",
            "company_label": "map ไม่ได้",
            "company_mapped": false,
            "company_reason": "ไม่มี ORG_ID (ไม่มีการเรียก Oracle หรือ snapshot ไม่ส่งแถวใบรับ)",
            "row_count": 0,
            "active_row_count": 0,
            "rows": [],
            "total_value": "0",
            "receiver": "WILAIWAN SRISUK"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "FLG-ST37-4",
              "description": "หน้าแปลน st37 4 นิ้ว 150lb",
              "qty": "40",
              "uom": "PCS",
              "unit_price": "210",
              "amount": "8400"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "FAIL",
              "code": "E17",
              "severity": "High",
              "details": "SQL ไม่คืนแถวที่ QTY_RECEIVED > 0 (PO 40100455) — ผู้รับของ/ใบรับจึงยังไม่ปรากฏใน Portal",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ไม่มีแถวใบรับ จึงไม่มี ORG_ID ให้เทียบ master",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "FAIL",
              "code": "E05",
              "severity": "High",
              "details": "พบบรรทัดที่ไม่อาจจับคู่ได้ หรือราคาต่างเกินกรอบยอมรับ",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "FAIL",
              "code": "E31",
              "severity": "High",
              "details": "subtotal บิล 8400 vs Σ(รับจริง × ราคาใบรับ) 0 ต่าง 8400",
              "page": 1,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E17",
              "rule_id": "V-04",
              "severity": "High",
              "message": "ไม่พบใบรับสินค้า หรือจำนวนรับเป็น 0 ในระบบ ERP",
              "page": 1
            },
            {
              "code": "E30",
              "rule_id": "V-07",
              "severity": "High",
              "message": "บรรทัด 1 ไม่พบบรรทัดที่ตรงในใบรับ",
              "page": 1
            },
            {
              "code": "E31",
              "rule_id": "V-09",
              "severity": "High",
              "message": "ยอดรวมมูลค่าสินค้าไม่ตรงกับยอดรวมใบรับสินค้า",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": null,
              "note": "ไม่พบบรรทัดในใบรับ",
              "receipt_line": null,
              "receipt_qty": null,
              "receipt_price": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Hold",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "Resubmit แล้วแต่ producer ยังไม่ส่ง revision ใหม่ (outbox ค้าง · retry 3 ครั้ง)",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": {
        "schema_version": "1.0",
        "event_id": "EVT-0015-2",
        "source_system": "AIVA-OCR-N8N",
        "external_id": "DMS-2026-000198",
        "document_id": "AIVA-2609-0015",
        "revision": 2,
        "standard_version": "6.2",
        "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
        "rule_catalog_version": "6.2-asbuilt-1",
        "received_at": "2026-10-02T16:20:00+07:00",
        "status": "Auto-pass",
        "document": {
          "source": "DMS",
          "doc_id": "DMS-2026-000198",
          "pages": 1,
          "pages_complete": true,
          "uploaded_by": "WILAIWAN.S",
          "po_type": "Purchase Order"
        },
        "invoice": {
          "invoice_num": "SP-2610-0044",
          "invoice_date": "02/10/2026",
          "supplier_name": "Siam Pipe Fitting Co., Ltd.",
          "supplier_tax_id": "0105544007788",
          "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
          "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane 13160",
          "customer_tax_id": "0107545000213",
          "po_number": "40100455",
          "release_num": null,
          "currency": "THB",
          "sub_total": "8400",
          "vat": "588",
          "grand_total": "8988"
        },
        "receipt": {
          "sql_id": "RCV-V01",
          "bypassed": false,
          "halted_by": null,
          "org_id": 103,
          "org_name": "อาปิโก ไฮเทค (โรงงานอยุธยา)",
          "company": "AH",
          "company_label": "อาปิโก ไฮเทค",
          "company_mapped": true,
          "company_reason": null,
          "row_count": 1,
          "active_row_count": 1,
          "rows": [
            {
              "PO_NUMBER": "40100455",
              "RECEIPT_NUM": "530340500",
              "LINE_NUM": 1,
              "ITEM_NUMBER": "FLG-ST37-4",
              "ITEM_DESCRIPTION": "FLANGE ST37 4 INCH 150LB",
              "QUANTITY_RECEIVED": "40",
              "UNIT_MEAS_LOOKUP_CODE": "PCS",
              "UNIT_PRICE": "210",
              "LINE_TOTAL": "8400",
              "ORG_ID": 103,
              "OU_ORG_ID": null
            }
          ],
          "total_value": "8400",
          "receiver": null
        },
        "lines": [
          {
            "line_no": 1,
            "item_code": "FLG-ST37-4",
            "description": "หน้าแปลน st37 4 นิ้ว 150lb",
            "qty": "40",
            "uom": "PCS",
            "unit_price": "210",
            "amount": "8400"
          }
        ],
        "rules": [
          {
            "rule_id": "V-01",
            "result": "PASS",
            "code": null,
            "severity": null,
            "details": "",
            "page": null,
            "halted_by": null
          },
          {
            "rule_id": "V-02",
            "result": "PASS",
            "code": null,
            "severity": null,
            "details": "",
            "page": null,
            "halted_by": null
          },
          {
            "rule_id": "V-03",
            "result": "PASS",
            "code": null,
            "severity": null,
            "details": "",
            "page": null,
            "halted_by": null
          },
          {
            "rule_id": "V-04",
            "result": "PASS",
            "code": null,
            "severity": null,
            "details": "ใบรับ 530340500 · 1 แถวที่จำนวนรับ > 0",
            "page": null,
            "halted_by": null
          },
          {
            "rule_id": "V-05",
            "result": "PASS",
            "code": null,
            "severity": null,
            "details": "ตรงนิติบุคคล อาปิโก ไฮเทค (โรงงานอยุธยา) · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
            "page": 1,
            "halted_by": null
          },
          {
            "rule_id": "V-06",
            "result": "PASS",
            "code": null,
            "severity": null,
            "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
            "page": null,
            "halted_by": null
          },
          {
            "rule_id": "V-07",
            "result": "PASS",
            "code": null,
            "severity": null,
            "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
            "page": null,
            "halted_by": null
          },
          {
            "rule_id": "V-08",
            "result": "PASS",
            "code": null,
            "severity": null,
            "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
            "page": null,
            "halted_by": null
          },
          {
            "rule_id": "V-09",
            "result": "PASS",
            "code": null,
            "severity": null,
            "details": "Σ(รับจริง × ราคาใบรับ) = 8400 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
            "page": null,
            "halted_by": null
          }
        ],
        "exceptions": [],
        "matches": [
          {
            "line_no": 1,
            "match_level": "M2",
            "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
            "receipt_line": 1,
            "receipt_num": "530340500",
            "receipt_qty": "40",
            "receipt_price": "210",
            "receipt_uom": "PCS",
            "price_flag": null,
            "uom_flag": null,
            "qty_flag": null
          }
        ],
        "signatures": {
          "supplier_or_deliverer": {
            "present": true,
            "page": 1
          },
          "receiver": {
            "present": true,
            "page": 1
          }
        },
        "decision": {
          "status": "Auto-pass",
          "assigned_to": null,
          "halted_by": null,
          "manual_review": false
        },
        "note": "Resubmit แล้วแต่ producer ยังไม่ส่ง revision ใหม่ (outbox ค้าง · retry 3 ครั้ง)",
        "provenance": {
          "kind": "engine-derived",
          "generated_by": "tools/build-snapshots.mjs",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "hand_authored": false
        }
      },
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0016",
      "dms_id": "DMS-2026-000201",
      "title": "pipeline ล้มก่อนเขียน Table 9 (LiteLLM timeout) → producer ส่ง snapshot แบบ fail-safe",
      "actor": {
        "uploadedBy": "SYSTEM",
        "receiver": null
      },
      "pdf": null,
      "pdf_synth": false,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Manual Review",
        "codes": [],
        "assigned": "accounting",
        "handAuthored": true
      },
      "dup_key": "||PP-2610-0303",
      "hand_authored": true,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0016-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000201",
          "document_id": "AIVA-2609-0016",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-10-03T02:15:40+07:00",
          "status": "Manual Review",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000201",
            "pages": null,
            "pages_complete": false,
            "uploaded_by": "SYSTEM",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "PP-2610-0303",
            "invoice_date": null,
            "supplier_name": "",
            "supplier_tax_id": null,
            "customer_name": "",
            "customer_address": "",
            "customer_tax_id": null,
            "po_number": null,
            "release_num": null,
            "currency": "THB",
            "sub_total": "0",
            "vat": "0",
            "grand_total": "0"
          },
          "receipt": {
            "org_id": null,
            "org_name": null,
            "company": "UNMAPPED",
            "rows": [],
            "row_count": 0,
            "total_value": null
          },
          "lines": [],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ไม่มีการตรวจข้อนี้ เพราะ pipeline จบก่อนเขียน Table 9",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ไม่มีการตรวจข้อนี้ เพราะ pipeline จบก่อนเขียน Table 9",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ไม่มีการตรวจข้อนี้ เพราะ pipeline จบก่อนเขียน Table 9",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ไม่มีการตรวจข้อนี้ เพราะ pipeline จบก่อนเขียน Table 9",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ไม่มีการตรวจข้อนี้ เพราะ pipeline จบก่อนเขียน Table 9",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ไม่มีการตรวจข้อนี้ เพราะ pipeline จบก่อนเขียน Table 9",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ไม่มีการตรวจข้อนี้ เพราะ pipeline จบก่อนเขียน Table 9",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ไม่มีการตรวจข้อนี้ เพราะ pipeline จบก่อนเขียน Table 9",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ไม่มีการตรวจข้อนี้ เพราะ pipeline จบก่อนเขียน Table 9",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [],
          "matches": [],
          "signatures": {
            "supplier_or_deliverer": {
              "present": false,
              "page": null
            },
            "receiver": {
              "present": false,
              "page": null
            }
          },
          "decision": {
            "status": "Manual Review",
            "assigned_to": "accounting",
            "halted_by": null,
            "manual_review": true
          },
          "note": "Vision worker ล่มที่ retry ที่ 3 (LiteLLM timeout) — ไม่มีการตรวจ matching",
          "provenance": {
            "kind": "hand-authored-snapshot",
            "generated_by": "tools/cases-*.mjs (snapshotOverride)",
            "engine_version": null,
            "hand_authored": true,
            "reason": "ไม่มี in-repo producer ที่สร้างกรณี pipeline ล้มได้ — snapshot นี้เขียนมือเพื่อทดสอบว่า Portal ไม่สรุป PASS เมื่อไม่มีผลกฎ"
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0017",
      "dms_id": "DMS-2026-000205",
      "title": "ทศนิยม 6 ตำแหน่ง (600 × 30.666667) — Decimal string ไม่แตะ float → E16 Low ยัง Auto-pass",
      "actor": {
        "uploadedBy": "NARONG.P",
        "receiver": "NARONG PHOLSRI"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000205_r1.pdf",
          "pages": 1,
          "uploaded_at": "2026-10-03T10:40:00+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Auto-pass",
        "codes": [
          "E16"
        ],
        "assigned": null
      },
      "dup_key": "Metro Fasteners (Thailand) Ltd.||MET-2610-0110",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0017-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000205",
          "document_id": "AIVA-2609-0017",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-10-03T10:40:00+07:00",
          "status": "Auto-pass",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000205",
            "pages": 1,
            "pages_complete": true,
            "uploaded_by": "NARONG.P",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "MET-2610-0110",
            "invoice_date": "03/10/2026",
            "supplier_name": "Metro Fasteners (Thailand) Ltd.",
            "supplier_tax_id": "0105549003311",
            "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0107545000213",
            "po_number": "40100512",
            "release_num": null,
            "currency": "THB",
            "sub_total": "18400.0002",
            "vat": "1288",
            "grand_total": "19688"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 103,
            "org_name": "อาปิโก ไฮเทค (โรงงานอยุธยา)",
            "company": "AH",
            "company_label": "อาปิโก ไฮเทค",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "40100512",
                "RECEIPT_NUM": "530340600",
                "LINE_NUM": 1,
                "ITEM_NUMBER": "STUD-M12-80",
                "ITEM_DESCRIPTION": "STUD M12 X 80 GRADE 8.8",
                "QUANTITY_RECEIVED": "600",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "30.666667",
                "LINE_TOTAL": "18400.0002",
                "ORG_ID": 103,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "18400.0002",
            "receiver": "NARONG PHOLSRI"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "STUD-M12-80",
              "description": "สตัด m12 x 80 เกรด 8.8",
              "qty": "600",
              "uom": "PCS",
              "unit_price": "30.666667",
              "amount": "18400.0002"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": "E16",
              "severity": "Low",
              "details": "sum(lines)=18400.0002 vs subtotal=18400.0002 (ต่าง 0) · VAT คาด=1288.000014 ได้=1288 (ต่าง 0.0000) · grand คาด=19688.0002 ได้=19688 (ต่าง 0.0002)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 530340600 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค (โรงงานอยุธยา) · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 18400.0002 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E16",
              "rule_id": "V-03",
              "severity": "Low",
              "message": "มีผลต่างเศษสตางค์จากการคำนวณ (อยู่ในเกณฑ์ยอมรับ)",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M2",
              "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
              "receipt_line": 1,
              "receipt_num": "530340600",
              "receipt_qty": "600",
              "receipt_price": "30.666667",
              "receipt_uom": "PCS",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Auto-pass",
            "assigned_to": null,
            "halted_by": null,
            "manual_review": false
          },
          "note": "ทศนิยม 6 ตำแหน่ง (600 × 30.666667) — Decimal string ไม่แตะ float → E16 Low ยัง Auto-pass",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0018",
      "dms_id": "DMS-2026-000208",
      "title": "revision 2 มาแล้วแต่ PDF ที่แนบยังเป็นของ revision 1 → Auto-pass พร้อมป้าย “หลักฐานเก่า”",
      "actor": {
        "uploadedBy": "SOMSAK.J",
        "receiver": "PRAPHAN KAEWKLA"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000208_r1.pdf",
          "uploaded_at": "2026-10-04T09:05:00+07:00",
          "pages": 2,
          "size_kb": 412
        }
      },
      "pdf_synth": false,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Auto-pass",
        "codes": [],
        "assigned": null,
        "stalePdf": true,
        "revisions": 2
      },
      "dup_key": "Honda Parts Logistics Co., Ltd.||HP-2610-0125",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0018-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000208",
          "document_id": "AIVA-2609-0018",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-10-04T09:00:00+07:00",
          "status": "Hold",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000208",
            "pages": 2,
            "pages_complete": true,
            "uploaded_by": "SOMSAK.J",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "HP-2610-0125",
            "invoice_date": "04/10/2026",
            "supplier_name": "Honda Parts Logistics Co., Ltd.",
            "supplier_tax_id": "0105552006677",
            "customer_name": "บริษัท อาปิโก ไฮเทค พาร์ท จำกัด",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0145548001549",
            "po_number": "44009020",
            "release_num": "7",
            "currency": "THB",
            "sub_total": "26400",
            "vat": "1848",
            "grand_total": "28248"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 175,
            "org_name": "อาปิโก ไฮเทค พาร์ท",
            "company": "AHP",
            "company_label": "อาปิโก ไฮเทค พาร์ท",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "44009020",
                "RECEIPT_NUM": "175000910",
                "LINE_NUM": 1,
                "ITEM_NUMBER": "WH-RH-02",
                "ITEM_DESCRIPTION": "WIRING HARNESS REAR",
                "QUANTITY_RECEIVED": "12",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "2200",
                "LINE_TOTAL": "26400",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "26400",
            "receiver": "PRAPHAN KAEWKLA"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "WH-RH-02",
              "description": "ชุดสายไฟ rear harness",
              "qty": "12",
              "uom": "PCS",
              "unit_price": "2200",
              "amount": "26400"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 175000910 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค พาร์ท · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "FAIL",
              "code": "E26",
              "severity": "High",
              "details": "ไม่พบลายเซ็น/ตราประทับในช่องผู้รับของ",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 26400 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E26",
              "rule_id": "V-06",
              "severity": "High",
              "message": "ไม่พบลายเซ็นผู้รับของบนเอกสาร",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M2",
              "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
              "receipt_line": 1,
              "receipt_num": "175000910",
              "receipt_qty": "12",
              "receipt_price": "2200",
              "receipt_uom": "PCS",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": false,
              "page": null
            }
          },
          "decision": {
            "status": "Hold",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "revision 2 มาแล้วแต่ PDF ที่แนบยังเป็นของ revision 1 → Auto-pass พร้อมป้าย “หลักฐานเก่า”",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        },
        {
          "schema_version": "1.0",
          "event_id": "EVT-0018-2",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000208",
          "document_id": "AIVA-2609-0018",
          "revision": 2,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-10-05T08:30:00+07:00",
          "status": "Auto-pass",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000208",
            "pages": 2,
            "pages_complete": true,
            "uploaded_by": "SOMSAK.J",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "HP-2610-0125",
            "invoice_date": "05/10/2026",
            "supplier_name": "Honda Parts Logistics Co., Ltd.",
            "supplier_tax_id": "0105552006677",
            "customer_name": "บริษัท อาปิโก ไฮเทค พาร์ท จำกัด",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0145548001549",
            "po_number": "44009020",
            "release_num": "7",
            "currency": "THB",
            "sub_total": "26400",
            "vat": "1848",
            "grand_total": "28248"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 175,
            "org_name": "อาปิโก ไฮเทค พาร์ท",
            "company": "AHP",
            "company_label": "อาปิโก ไฮเทค พาร์ท",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "44009020",
                "RECEIPT_NUM": "175000910",
                "LINE_NUM": 1,
                "ITEM_NUMBER": "WH-RH-02",
                "ITEM_DESCRIPTION": "WIRING HARNESS REAR",
                "QUANTITY_RECEIVED": "12",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "2200",
                "LINE_TOTAL": "26400",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "26400",
            "receiver": "PRAPHAN KAEWKLA"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "WH-RH-02",
              "description": "ชุดสายไฟ rear harness",
              "qty": "12",
              "uom": "PCS",
              "unit_price": "2200",
              "amount": "26400"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 175000910 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค พาร์ท · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 26400 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M2",
              "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
              "receipt_line": 1,
              "receipt_num": "175000910",
              "receipt_qty": "12",
              "receipt_price": "2200",
              "receipt_uom": "PCS",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 2
            }
          },
          "decision": {
            "status": "Auto-pass",
            "assigned_to": null,
            "halted_by": null,
            "manual_review": false
          },
          "note": "revision 2 มาแล้วแต่ PDF ที่แนบยังเป็นของ revision 1 → Auto-pass พร้อมป้าย “หลักฐานเก่า”",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0019",
      "dms_id": "DMS-2026-000212",
      "title": "บิลนำเข้า USD ไม่คิด VAT 7% → as-built engine คาดหวัง VAT เสมอ จึงออก E31 High (+ E13 ตาม Tax ID ผู้ขายต่างประเท็สว่าง)",
      "actor": {
        "uploadedBy": "PANIDA.R",
        "receiver": "SOMSAK JAIDEE"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000212_r1.pdf",
          "pages": 4,
          "uploaded_at": "2026-10-05T13:20:00+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Hold",
        "codes": [
          "E13",
          "E31"
        ],
        "assigned": "user",
        "currencyNote": true
      },
      "dup_key": "Nippon Tooling Systems K.K.||IMP-2610-0007",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0019-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000212",
          "document_id": "AIVA-2609-0019",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-10-05T13:20:00+07:00",
          "status": "Hold",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000212",
            "pages": 4,
            "pages_complete": true,
            "uploaded_by": "PANIDA.R",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "IMP-2610-0007",
            "invoice_date": "05/10/2026",
            "supplier_name": "Nippon Tooling Systems K.K.",
            "supplier_tax_id": null,
            "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0107545000213",
            "po_number": "40100601",
            "release_num": null,
            "currency": "USD",
            "sub_total": "4200",
            "vat": "0",
            "grand_total": "4200"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 103,
            "org_name": "อาปิโก ไฮเทค (โรงงานอยุธยา)",
            "company": "AH",
            "company_label": "อาปิโก ไฮเทค",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "40100601",
                "RECEIPT_NUM": "530340700",
                "LINE_NUM": 1,
                "ITEM_NUMBER": "DIE-SET-A",
                "ITEM_DESCRIPTION": "DIE SET SPARE PART SET A",
                "QUANTITY_RECEIVED": "2",
                "UNIT_MEAS_LOOKUP_CODE": "SET",
                "UNIT_PRICE": "2100",
                "LINE_TOTAL": "4200",
                "ORG_ID": 103,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "4200",
            "receiver": "SOMSAK JAIDEE"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "DIE-SET-A",
              "description": "die set spare part set-a",
              "qty": "2",
              "uom": "SET",
              "unit_price": "2100",
              "amount": "4200"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "FAIL",
              "code": "E13",
              "severity": "Medium",
              "details": "Missing: supplier_tax_id",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "FAIL",
              "code": "E31",
              "severity": "High",
              "details": "sum(lines)=4200 vs subtotal=4200 (ต่าง 0) · VAT คาด=294 ได้=0 (ต่าง 294) · grand คาด=4200 ได้=4200 (ต่าง 0)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 530340700 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค (โรงงานอยุธยา) · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 4200 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E13",
              "rule_id": "V-01",
              "severity": "Medium",
              "message": "ฟิลด์ไม่ครบ: supplier_tax_id",
              "page": 1
            },
            {
              "code": "E31",
              "rule_id": "V-03",
              "severity": "High",
              "message": "ยอดรวมในเอกสารคำนวณไม่ถูกต้องเกินกรอบที่กำหนด",
              "page": 1
            }
          ],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M2",
              "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
              "receipt_line": 1,
              "receipt_num": "530340700",
              "receipt_qty": "2",
              "receipt_price": "2100",
              "receipt_uom": "SET",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Hold",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "บิลนำเข้า USD ไม่คิด VAT 7% → as-built engine คาดหวัง VAT เสมอ จึงออก E31 High (+ E13 ตาม Tax ID ผู้ขายต่างประเท็สว่าง)",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0020",
      "dms_id": "DMS-2026-000215",
      "title": "producer ส่ง snapshot มาไม่ครบ (มีแค่ V-01–V-05) → Portal แสดง “ไม่มีข้อมูล” ห้ามแก้เป็น PASS",
      "actor": {
        "uploadedBy": "SYSTEM",
        "receiver": "WILAIWAN SRISUK"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000215_r1.pdf",
          "pages": 2,
          "uploaded_at": "2026-10-06T09:10:00+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Review",
        "codes": [
          "E13"
        ],
        "assigned": "user",
        "partialRules": true,
        "handAuthored": true
      },
      "dup_key": "Quality Tool Traders||QT-2610-0091",
      "hand_authored": true,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0020-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000215",
          "document_id": "AIVA-2609-0020",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-10-06T09:10:00+07:00",
          "status": "Review",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000215",
            "pages": 2,
            "pages_complete": true,
            "uploaded_by": "SYSTEM",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "QT-2610-0091",
            "invoice_date": "06/10/2026",
            "supplier_name": "Quality Tool Traders",
            "supplier_tax_id": "0145548002210",
            "customer_name": "บริษัท อาปิโก ไฮเทค ทูลลิ่ง จำกัด",
            "customer_address": "99/1 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0145548001557",
            "po_number": "40121699",
            "release_num": null,
            "currency": "THB",
            "sub_total": "2600.00",
            "vat": "182.00",
            "grand_total": "2782.00"
          },
          "receipt": {
            "org_id": 352,
            "org_name": "อาปิโก ไฮเทค ทูลลิ่ง",
            "company": "AHT",
            "rows": [
              {
                "PO_NUMBER": "40121699",
                "RECEIPT_NUM": "540112400",
                "LINE_NUM": 1,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "PLATE STAINLESS 3.0MM THK",
                "QUANTITY_RECEIVED": "10",
                "UNIT_MEAS_LOOKUP_CODE": "SHT",
                "UNIT_PRICE": "260",
                "LINE_TOTAL": "2600",
                "ORG_ID": 352,
                "OU_ORG_ID": null
              }
            ],
            "row_count": 1,
            "total_value": "2600"
          },
          "lines": [
            {
              "line_no": 1,
              "description": "PLATE STAINLESS 3.0MM THK",
              "qty": "10",
              "uom": "SHT",
              "unit_price": "260",
              "amount": "2600",
              "item_code": null
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "FAIL",
              "code": "E13",
              "severity": "Medium",
              "details": "Missing: release_num",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 540112400 · 1 แถว",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค ทูลลิ่ง",
              "page": 1,
              "halted_by": null
            }
          ],
          "exceptions": [
            {
              "code": "E13",
              "rule_id": "V-01",
              "severity": "Medium",
              "message": "ฟิลด์ไม่ครบ: release_num",
              "page": 1
            }
          ],
          "matches": [],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Review",
            "assigned_to": "user",
            "halted_by": null,
            "manual_review": false
          },
          "note": "ผู้ส่งฝั่ง OCR ใช้ standard เก่า 6.1 → ไม่มี V-06–V-09 ใน payload",
          "provenance": {
            "kind": "hand-authored-snapshot",
            "generated_by": "tools/cases-*.mjs (snapshotOverride)",
            "engine_version": null,
            "hand_authored": true,
            "reason": "ไว้สาธิต schema/matrix completeness check ฝั่ง Portal — ไม่มี producer ใน repo นี้ที่ส่ง snapshot แบบไม่ครบตามธรรมชาติ"
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0021",
      "dms_id": "DMS-2026-000219",
      "title": "ยืนยันเอกสารแล้ว (workflow CONFIRMED) — ปุ่ม Post to AP ยังปิดเพราะสัญญาส่งต่ออยู่ AP",
      "actor": {
        "uploadedBy": "PRAPHAN.K",
        "receiver": "PRAPHAN KAEWKLA"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000219_r1.pdf",
          "pages": 2,
          "uploaded_at": "2026-10-06T14:10:00+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": {
        "status": "CONFIRMED",
        "heldBy": null,
        "decidedBy": "u6",
        "version": 2,
        "note": "หัวหน้างานกดยืนยันตามสัญญา Human Approval สำหรับ Auto-pass",
        "confirmedAt": "2026-10-06T15:00:00+07:00"
      },
      "outbox": [],
      "expect": {
        "status": "Auto-pass",
        "codes": [],
        "assigned": null,
        "confirmed": true
      },
      "dup_key": "ABC Supply Co., Ltd.||IV6910011",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0021-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000219",
          "document_id": "AIVA-2609-0021",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-10-06T14:10:00+07:00",
          "status": "Auto-pass",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000219",
            "pages": 2,
            "pages_complete": true,
            "uploaded_by": "PRAPHAN.K",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "IV6910011",
            "invoice_date": "06/10/2026",
            "supplier_name": "ABC Supply Co., Ltd.",
            "supplier_tax_id": "0105542091823",
            "customer_name": "บริษัท อาปิโก ไฮเทค จำกัด (มหาชน)",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0107545000213",
            "po_number": "42052999",
            "release_num": null,
            "currency": "THB",
            "sub_total": "5200",
            "vat": "364",
            "grand_total": "5564"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 103,
            "org_name": "อาปิโก ไฮเทค (โรงงานอยุธยา)",
            "company": "AH",
            "company_label": "อาปิโก ไฮเทค",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 1,
            "active_row_count": 1,
            "rows": [
              {
                "PO_NUMBER": "42052999",
                "RECEIPT_NUM": "530340800",
                "LINE_NUM": 1,
                "ITEM_NUMBER": "SHOES-42",
                "ITEM_DESCRIPTION": "SAFETY SHOES CLASSIC SIZE 42",
                "QUANTITY_RECEIVED": "20",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "260",
                "LINE_TOTAL": "5200",
                "ORG_ID": 103,
                "OU_ORG_ID": null
              }
            ],
            "total_value": "5200",
            "receiver": "PRAPHAN KAEWKLA"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": "SHOES-42",
              "description": "safety shoes classic 42",
              "qty": "20",
              "uom": "PCS",
              "unit_price": "260",
              "amount": "5200"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ใบรับ 530340800 · 1 แถวที่จำนวนรับ > 0",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค (โรงงานอยุธยา) · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จับคู่ครบทุกบรรทัด · วิธีที่ใช้: M2",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-08",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "จำนวนที่วางบิลไม่เกินจำนวนรับจริงทุกบรรทัด",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-09",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "Σ(รับจริง × ราคาใบรับ) = 5200 ต่างจาก subtotal 0 (ในกรอบ 0.50)",
              "page": null,
              "halted_by": null
            }
          ],
          "exceptions": [],
          "matches": [
            {
              "line_no": 1,
              "match_level": "M2",
              "match_note": "จับคู่ด้วยเลขบรรทัด (line number)",
              "receipt_line": 1,
              "receipt_num": "530340800",
              "receipt_qty": "20",
              "receipt_price": "260",
              "receipt_uom": "PCS",
              "price_flag": null,
              "uom_flag": null,
              "qty_flag": null
            }
          ],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Auto-pass",
            "assigned_to": null,
            "halted_by": null,
            "manual_review": false
          },
          "note": "ยืนยันเอกสารแล้ว (workflow CONFIRMED) — ปุ่ม Post to AP ยังปิดเพราะสัญญาส่งต่ออยู่ AP",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    },
    {
      "document_id": "AIVA-2609-0022",
      "dms_id": "DMS-2026-000223",
      "title": "SQL คืน 50 แถวชน safety cap → V-04 = MANUAL และห้ามจับคู่รายบรรทัด (fail-safe)",
      "actor": {
        "uploadedBy": "NARONG.P",
        "receiver": "NARONG PHOLSRI"
      },
      "pdf": {
        "1": {
          "file_name": "DMS-2026-000223_r1.pdf",
          "pages": 6,
          "uploaded_at": "2026-10-07T08:00:00+07:00",
          "size_kb": 397
        }
      },
      "pdf_synth": true,
      "seed_workflow": null,
      "outbox": [],
      "expect": {
        "status": "Manual Review",
        "codes": [],
        "assigned": "accounting",
        "safetyCap": true
      },
      "dup_key": "Fastener City Co., Ltd.||FAST-2610-0500",
      "hand_authored": false,
      "snapshots": [
        {
          "schema_version": "1.0",
          "event_id": "EVT-0022-1",
          "source_system": "AIVA-OCR-N8N",
          "external_id": "DMS-2026-000223",
          "document_id": "AIVA-2609-0022",
          "revision": 1,
          "standard_version": "6.2",
          "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
          "rule_catalog_version": "6.2-asbuilt-1",
          "received_at": "2026-10-07T08:00:00+07:00",
          "status": "Manual Review",
          "document": {
            "source": "DMS",
            "doc_id": "DMS-2026-000223",
            "pages": 6,
            "pages_complete": true,
            "uploaded_by": "NARONG.P",
            "po_type": "Purchase Order"
          },
          "invoice": {
            "invoice_num": "FAST-2610-0500",
            "invoice_date": "07/10/2026",
            "supplier_name": "Fastener City Co., Ltd.",
            "supplier_tax_id": "0105551008899",
            "customer_name": "บริษัท อาปิโก ไฮเทค พาร์ท จำกัด",
            "customer_address": "99 Moo 1 Hitech Industrial Estate Banlane 13160",
            "customer_tax_id": "0145548001549",
            "po_number": "47009001",
            "release_num": "1",
            "currency": "THB",
            "sub_total": "500",
            "vat": "35",
            "grand_total": "535"
          },
          "receipt": {
            "sql_id": "RCV-V01",
            "bypassed": false,
            "halted_by": null,
            "org_id": 175,
            "org_name": "อาปิโก ไฮเทค พาร์ท",
            "company": "AHP",
            "company_label": "อาปิโก ไฮเทค พาร์ท",
            "company_mapped": true,
            "company_reason": null,
            "row_count": 50,
            "active_row_count": 50,
            "rows": [
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 1,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 001",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 2,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 002",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 3,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 003",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 4,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 004",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 5,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 005",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 6,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 006",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 7,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 007",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 8,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 008",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 9,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 009",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 10,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 010",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 11,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 011",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 12,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 012",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 13,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 013",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 14,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 014",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 15,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 015",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 16,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 016",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 17,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 017",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 18,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 018",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 19,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 019",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 20,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 020",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 21,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 021",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 22,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 022",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 23,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 023",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 24,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 024",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 25,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 025",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 26,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 026",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 27,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 027",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 28,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 028",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 29,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 029",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 30,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 030",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 31,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 031",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 32,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 032",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 33,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 033",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 34,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 034",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 35,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 035",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 36,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 036",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 37,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 037",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 38,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 038",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 39,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 039",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 40,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 040",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 41,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 041",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 42,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 042",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 43,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 043",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 44,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 044",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 45,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 045",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 46,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 046",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 47,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 047",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 48,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 048",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 49,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 049",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              },
              {
                "PO_NUMBER": "47009001",
                "RECEIPT_NUM": "175001101",
                "LINE_NUM": 50,
                "ITEM_NUMBER": null,
                "ITEM_DESCRIPTION": "SCREW HEX SET 050",
                "QUANTITY_RECEIVED": "1",
                "UNIT_MEAS_LOOKUP_CODE": "PCS",
                "UNIT_PRICE": "10",
                "LINE_TOTAL": "10",
                "ORG_ID": 175,
                "OU_ORG_ID": null
              }
            ],
            "total_value": null,
            "receiver": "NARONG PHOLSRI"
          },
          "lines": [
            {
              "line_no": 1,
              "item_code": null,
              "description": "screw hex set รวม 50 รายการย่อย",
              "qty": "50",
              "uom": "PCS",
              "unit_price": "10",
              "amount": "500"
            }
          ],
          "rules": [
            {
              "rule_id": "V-01",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-02",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-03",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-04",
              "result": "MANUAL",
              "code": null,
              "severity": "Medium",
              "details": "SQL คืนค่า 50 แถว ชนเพดาน safety cap 50 แถว",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-05",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "ตรงนิติบุคคล อาปิโก ไฮเทค พาร์ท · ตรวจที่อยู่แบบ substring → HQ/สาขา (13160)",
              "page": 1,
              "halted_by": null
            },
            {
              "rule_id": "V-06",
              "result": "PASS",
              "code": null,
              "severity": null,
              "details": "พบผู้ส่งของหน้า 1 · ผู้รับของหน้า 1",
              "page": null,
              "halted_by": null
            },
            {
              "rule_id": "V-07",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "ยังไม่จับคู่รายบรรทัด เพราะต้องยืนยันสถานะ master/gainting ก่อน (fail-safe)",
              "page": null,
              "halted_by": "V-04/V-05"
            },
            {
              "rule_id": "V-08",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": "V-04/V-05"
            },
            {
              "rule_id": "V-09",
              "result": "not_evaluated",
              "code": null,
              "severity": null,
              "details": "",
              "page": null,
              "halted_by": "V-04/V-05"
            }
          ],
          "exceptions": [],
          "matches": [],
          "signatures": {
            "supplier_or_deliverer": {
              "present": true,
              "page": 1
            },
            "receiver": {
              "present": true,
              "page": 1
            }
          },
          "decision": {
            "status": "Manual Review",
            "assigned_to": "accounting",
            "halted_by": null,
            "manual_review": true
          },
          "note": "SQL คืน 50 แถวชน safety cap → V-04 = MANUAL และห้ามจับคู่รายบรรทัด (fail-safe)",
          "provenance": {
            "kind": "engine-derived",
            "generated_by": "tools/build-snapshots.mjs",
            "engine_version": "as-built mirror of n8n/app/core/rules.py (Standard 6.2)",
            "hand_authored": false
          }
        }
      ],
      "pending_snapshot": null,
      "duplicate_of": []
    }
  ]
};

export const DOC_INDEX = SNAPSHOT_BUNDLE.documents.map((d) => d.document_id);
