/**
 * views/help.js — เอกสารประกอบการใช้งาน/ตัดสินใจ (อยู่ในแอป ไม่ต้องเปิดไฟล์ .md)
 */

import { card, table, note, esc } from "../ui/dom.js";
import { link, code } from "../ui/format.js";
import { ROLE_LABEL, USERS } from "../domain/access.js";
import { CONTRACT_VERSION } from "../domain/schema.js";

const CONTRACT_CORE = [
  ["schema_version", "ต้องเป็น \"1.0\" — ไม่ตรง = ปฏิเสธที่ขอบเขต"],
  ["event_id", "identity ของเหตุการณ์ ใช้กันประมวลผลซ้ำ (idempotent)"],
  ["document_id · revision", "revision ต้องเพิ่มขึ้นเสมอ · ไม่รับเลขเท่าเดิม/ถอยหลัง"],
  ["status", "Auto-pass | Review | Hold | Manual Review เท่านั้น"],
  ["invoice.*", "เงินทุกฟิลด์เป็น decimal string (ทศนิยม ≤ 6 ตำแหน่ง) ห้ามเป็น number"],
  ["rules[]", "rule_id + result (PASS/FAIL/MANUAL/NOT_EVALUATED) + code + severity + details"],
  ["lines[]", "line_no, description, qty, uom, unit_price, amount — decimal string"],
  ["receipt.org_id · po_number", "ต้องใช้ map บริษัทจริงจาก master (ห้าม hardcode)"],
  ["decision.assigned_to", "null | user | accounting — portal ใช้กำหนด“ใครต้องทำอะไร”"],
];

const CONTRACT_EXT = [
  ["document", "จำนวนหน้า + ความครบถ้วนของหน้า (pages_complete) — ใช้เตือน/บล็อกหลักฐาน"],
  ["signatures", "ผลตรวจลายเซ็น 2 ฝั่ง — ใช้แสดงคู่กับ V-06"],
  ["exceptions[]", "รายการข้อยกเว้น (code/severity/message/page) — แสดงพร้อม next step"],
  ["matches[]", "วิธีจับคู่รายบรรทัด (M1–M4) + ค่าที่จับคู่ได้ + ธง E05/E06/E12/E29"],
  ["pdf (doc-level)", "metadata ไฟล์แนบราย revision — ใช้ตัดสินว่า “หลักฐานปัจจุบัน” หรือไม่"],
  ["provenance", "ที่มาของ snapshot (engine-derived / hand-authored) — ติดป้ายเดโมเสมอ"],
];

const ROLE_TABLE = [
  ["EU · ผู้ใช้คำขอ", "เอกสารที่ตนเป็น Receiver หรืองาน assigned_to=user ในบริษัทที่ถือ", "On Hold · ปล่อยงาน · Resubmit", "ยืนยัน · ปฏิเสธ · ตั้งหนี้"],
  ["ACC · ฝ่ายบัญชี", "ทุกเอกสาร ทุกบริษัท", "On Hold · ปล่อยงาน · Resubmit", "ยืนยัน · ปฏิเสธ · ตั้งหนี้"],
  ["APR · หัวหน้างาน", "ทุกเอกสาร ทุกบริษัท", "ทั้งหมดของ ACC + <strong>ยืนยัน · ปฏิเสธ</strong>", "ตั้งหนี้ (ยังไม่มีสัญญา)"],
  ["ADM · ผู้ดูแล (เดโม)", "ทุกเอกสาร", "รีเซ็ตเดโม · ทดสอบ ingestion", "ยืนยัน · ปฏิเสธ (ไม่ให้ตัดสินงานธุรกิจ)"],
];

const SCENARIOS = [
  ["0001", "Auto-pass ทุกกฎ + จับคู่ M1 — แต่ผู้แนบเอกสารคือ APR คนเดียวกับการอนุมัติ → ปุ่ม “ยืนยันเอกสาร” ปิดด้วยเหตุผล Separation of duties (สลับผู้ใช้เป็น <em>KAMONWAN.S</em> แล้วกดยืนยันได้)"],
  ["0004", "E28 คณิตศาสตร์บรรทัดผิด → engine bypass ไม่เรียก Oracle: กฎขั้น 2–3 ขึ้น “ไม่ได้ตรวจ” ทั้งก้อน และเอกสารนี้ไม่มี PDF → ยืนยันไม่ได้ 2 เหตุผล"],
  ["0006", "E17/E30/E31 + map บริษัทไม่ได้ (ไม่มี ORG_ID) → คิวนี้ส่งต่อฝ่ายบัญชี และบล็อกการตั้งหนี้"],
  ["0007", "นิติบุคคลไม่อยู่ใน master → decision = Manual Review · assigned_to = accounting"],
  ["0008", "เอกสารซ้ำกับ 0009 (supplier_name + invoice_num) — engine ไม่ได้กันซ้ำให้ portal เป็นคนจับ"],
  ["0009", "คู่ซ้ำที่ถูก <strong>ปฏิเสธ</strong> ไว้เป็นสถานะตั้งต้น — ดู audit และเหตุผล"],
  ["0012", "E16 เศษสตางค์ (Low) ยัง Auto-pass → Flow ปกติ: APR กรอกเหตุผล → CONFIRMED (optimistic version v1→v2) แล้วปุ่ม “ส่งตั้งหนี้” ยังปิดเพราะยังไม่มีสัญญา AP"],
  ["0013", "2 revision (r1 Hold → r2 Review) + งานถูก On Hold ตั้งต้น — สลับดู revision เก่าได้ การกระทำทั้งหมดใช้ r ปัจจุบัน"],
  ["0014", "Vision อ่านไม่ครบทุกหน้า (9 หน้า) → V-01 ออก E13 และ portal เตือน “ข้อมูลอาจไม่ครบทั้งฉบับ”"],
  ["0015", "มี outbox PENDING (retry 3/5 + error ค้าง) และ producer ยังไม่ส่ง r2 → ปุ่ม “จำลอง: รับ revision r2” จะ ingest เข้า pipeline จริง (ปิด outbox + กลับเข้าคิว)"],
  ["0016", "pipeline ล้มทั้งเส้น: snapshot เขียนมือ ไม่มีผลตรวจ 9 กฎ → portal แสดงเป็น “ไม่มีข้อมูล” และบล็อกทุก action"],
  ["0018", "PDF เป็นของ r1 แต่ผลตรวจปัจจุบันคือ r2 → <strong>หลักฐานเก่า</strong> ห้ามกดยืนยัน (กดปุ่มจำลองแนบ PDF ถึงจะทำได้)"],
  ["0019", "บิลนำเข้า USD ไม่คิด VAT → engine คาดหวัง VAT 7% เสมอ จึงออก E31 High + E13 (Tax ID ผู้ขายต่างประเทศว่าง) ทั้งที่ยอดจริงถูกต้อง"],
  ["0020", "snapshot ส่งผลตรวจมาแค่ 5/9 กฎ → portal ขึ้น “ไม่มีข้อมูล ≠ ผ่าน” และบล็อก confirm"],
  ["0021", "งานที่ถูกยืนยันไว้แล้ว (seed) → ดู audit การอนุมัติ และปุ่มตั้งหนี้ที่ยังปิดถาวร"],
  ["0022", "SQL คืนแถว ≥ 50 → V-04 = MANUAL (fail-safe ไม่เดา) → Manual Review ให้คนดูทั้งฉบับ"],
];

export function render() {
  return `
  <div class="grid-2">
    ${card({
      title: "หลักการ 6 ข้อที่ portal นี้ยึด",
      body: `<ol class="rules-list">
        <li><strong>Portal ไม่ตรวจซ้ำ</strong> — ห้าม import <code>src/engine/</code> ตอน runtime · ทุกผลตรวจมาจาก snapshot ที่ producer สร้าง (มีเทสต์เฝ้า)</li>
        <li><strong>แสดง ≠ เชื่อ</strong> — snapshot ทุกตัวผ่าน receiving contract ก่อนเข้า store ที่ไม่ผ่านยัง “แสดง” ได้ แต่ห้ามใช้ตัดสินใจ</li>
        <li><strong>ไม่มีข้อมูล ≠ ผ่าน</strong> — กฎไม่ครบ/หลักฐานเก่า/document_id ว่าง ต้อง raise ไม่ใช่ปล่อยให้ผ่าน</li>
        <li><strong>เลขเป็น decimal string</strong> — คำนวณด้วย BigInt (<code>domain/money.js</code>) ห้าม float และห้าม hardcode เลข VAT/tolerance ใน UI</li>
        <li><strong>งานของคน ≠ งานของระบบ</strong> — สถานะงาน (workflow) แยกฟิลด์จากผลการตรวจ (engine) และมี optimistic version ทุกครั้ง</li>
        <li><strong>ทุก action มีเหตุผล + audit</strong> — พิมพ์เหตุผล ≥ 5 ตัวอักษร และบันทึก append-only เสมอ</li>
      </ol>`,
    })}

    ${card({
      title: "ใครทำอะไรได้ (นโยบายสิทธิ์)",
      sub: "ตรวจ 3 ชั้นก่อนกดปุ่ม: สิทธิ์บทบาท → สถานะงาน → หลักฐาน/ความเสี่ยง · ปุ่มที่ปิดจะแสดงเหตุผลเสมอ",
      body: table({
        head: ["บทบาท", "ขอบเขตที่เห็น", "กดได้", "กดไม่ได้ (และเพราะอะไร)"],
        rows: ROLE_TABLE.map((r) => `<tr><td>${r[0]}</td><td class="small">${esc(r[1])}</td><td class="small">${r[2]}</td><td class="small">${r[3]}</td></tr>`),
      }) +
        `<p class="foot-note">ผู้ใช้เดโม: ${USERS.map((u) => `${code(u.initials)} <span class="muted small">${esc(ROLE_LABEL[u.role])}</span>`).join(" · ")}</p>
        <p class="foot-note">Separation of duties: ผู้ที่ <em>แนบเอกสาร</em> (uploaded_by) จะยืนยัน/ปฏิเสธเอกสารตัวเองไม่ได้ แม้จะมีสิทธิ์ระดับหัวหน้างาน</p>`,
    })}
  </div>

  <div class="grid-2">
    ${card({
      title: `สัญญาที่รับเข้า — receiving contract v${CONTRACT_VERSION}`,
      sub: "ฟิลด์บังคับตามสัญญา (ตรวจที่ขอบเขตด้วย <code>domain/schema.js</code>)",
      body: table({
        head: ["ฟิลด์", "เงื่อนไข"],
        rows: CONTRACT_CORE.map(([f, t]) => `<tr><td>${code(f)}</td><td class="small">${esc(t)}</td></tr>`),
      }),
    })}

    ${card({
      title: "ฟิลด์ส่วนขยาย (portal กำหนดเพิ่ม)",
      sub: "ไม่อยู่ในสัญญา v1.0 — ฝั่งผู้ผลิต snapshot ต้องส่งมาด้วยถ้าอยากให้ UI ครบ (ติดป้าย “extended” ใน schema checker)",
      body: table({
        head: ["ฟิลด์", "ไว้ทำอะไร"],
        rows: CONTRACT_EXT.map(([f, t]) => `<tr><td>${code(f)}</td><td class="small">${esc(t)}</td></tr>`),
      }) +
        note("ของที่ต้องเคลียร์กับทีม OCR service: ทำให้ฟิลด์เหล่านี้อยู่ในสัญญาอย่างเป็นทางการ (v1.1) หรือ portal ต้องทำงานแบบ UI ย่อส่วน", "warn"),
    })}
  </div>

  ${card({
    title: "เดินเดโมให้ครบทุกกรณี (คลิกเลขเอกสาร)",
    sub: "ข้อมูล 22 เอกสาร · 24 revision ถูกออกแบบให้ชนเงื่อนไขจริงคนละแบบ — เริ่มจากสลับผู้ใช้ที่มุมขวาบน",
    body: table({
      head: ["เอกสาร", "เรื่องที่สาธิต"],
      rows: SCENARIOS.map(([id, text]) => {
        const short = `AIVA-2609-${id}`;
        return `<tr><td>${link(short, id)}</td><td class="small">${text}</td></tr>`;
      }),
    }),
  })}

  ${card({
    title: "บันทึกส่วนต่าง — พฤติกรรม as-built vs เอกสารมาตรฐาน 6.2",
    sub: "portal ไม่แก้เกณฑ์ (ห้าม mirror ให้ “ตรงเอกสาร”) แต่ต้อง<strong>เปิดเผย</strong>ให้ผู้ใช้งานรู้ว่ากำลังเห็นอะไร",
    body: `<ul class="gap-list">
      <li><strong>M4 fallback ทำให้ E30 แทบไม่เกิด</strong> — V-07 ไม่มีบรรทัดตรงยังจับแถวแรกที่ยัง active ให้ ผลคือไม่ออก E30 (ไม่พบบรรทัด) ทั้งที่ควรพบ และการใช้แถวซ้ำอาจทำให้ยอดผิดเงียบ ๆ</li>
      <li><strong>E29 (Low) กลายเป็น Hold ได้</strong> — ราคาต่างในกรอบถูกบันทึก Low แต่ V-09 เทียบยอดรวมทั้งใบรับแล้วต่อ E31 High ทำให้ผลรวมเป็น Hold</li>
      <li><strong>วางบิลบางส่วน</strong> — V-08 ออก E34 (Medium/Review) แต่ V-09 มักออก E31 (High/Hold) ซ้อนมา ผลลัพธ์จึงรุนแรงกว่าที่เอกสารอธิบาย</li>
      <li><strong>คาดหวัง VAT 7% เสมอ</strong> — บิลต่างประเทศ/ไม่มี VAT/สกุลเงินอื่นโดน E31 ทั้งที่ยอดถูก (ดูเอกสาร 0019)</li>
      <li><strong>V-05 ใช้ ORG_ID แถวแรก</strong> เป็นตัวแทนทั้งใบรับ — งานข้าม ORG (หลายบริษัทในใบรับเดียว) จะ map ผิดบริษัทได้</li>
      <li><strong>engine ไม่กันเอกสารซ้ำ</strong> — portal จับด้วย <code>supplier_name + invoice_num</code> และใช้ <code>event_id</code> กัน ingest ซ้ำ (ของจริงควรใช้ key เดียวกันทั้งระบบ)</li>
      <li><strong>V-04 fail-safe ที่ 50 แถว</strong> — SQL คืนแถวเกินกำหนด = MANUAL ทันที ไม่เดาว่าบรรทัดไหนถูกต้อง</li>
      <li><strong>OCR engine ยัง hardcode ค่า master ไว้ใน <code>master_data.py</code></strong> — portal อ่านทางเดียว ถ้า master เปลี่ยนต้องรัน <code>python tools/build-master-data.py</code> ใหม่</li>
    </ul>`,
  })}

  <div class="grid-2">
    ${card({
      title: "สิ่งที่ยังไม่ได้ต่อ (ปิดไว้เป็นนโยบาย ไม่ใช่ bug)",
      body: `<ul class="gap-list">
        <li><strong>ส่งตั้งหนี้ที่ AP/Oracle</strong> — ยังไม่มีสัญญา API → action “post” ถูกบล็อกทุกบทบาท (เห็นเหตุผลใต้ปุ่ม)</li>
        <li><strong>Viewer ภาพ PDF จริง</strong> — repo นี้เก็บได้เฉพาะ .png → แสดง metadata + การตรวจ revision ของหลักฐานแทน</li>
        <li><strong>เรียก OCR service ตรง ๆ</strong> — สั่งงานผ่าน outbox (event) เท่านั้น เพื่อให้ retry/audit อยู่ฝั่ง producer</li>
        <li><strong>SSO / แหล่งผู้ใช้จริง</strong> — ผู้ใช้ 7 คนเป็นข้อมูลสมมติใน <code>domain/access.js</code></li>
        <li><strong>การเขียนกลับ master</strong> — portal เป็น read-only โดยตั้งใจ</li>
        <li><strong>Backend + DB จริง</strong> — overlay งาน/audit อยู่ใน localStorage (F5 ได้ แต่ไม่ใช่ system of record)</li>
      </ul>`,
    })}

    ${card({
      title: "ทางเดินข้อมูล & คำสั่งที่ใช้สร้างข้อมูล",
      body: `<pre class="flow">OCR service (n8n + Vision + Oracle SQL)
        └─ engine as-built (app/core/rules.py) → 9 กฎ + ข้อยกเว้น + การจับคู่
             └─ snapshot (receiving contract v${CONTRACT_VERSION})
                  └─ <strong>Portal</strong>: validate → store → UI → workflow/audit
                       └─ outbox → RESUBMIT/RERUN กลับไปหา OCR service
                       └─ (ยังไม่ต่อ) AP posting gateway → Oracle</pre>
      <pre class="flow">python tools/build-master-data.py   # master_data.py → src/data/master-data.js
node tools/build-fixtures.mjs        # รัน engine mirror กับเคสสังเคราะห์ → src/data/snapshots.js
node tools/build-fixtures.mjs --check # ตรวจว่า fixture ไม่ drift จาก engine
node tools/smoke-test.mjs            # เทสต์ domain + สัญญา + ข้อห้ามทางสถาปัตยกรรม
python tools/serve.py                # เปิด http://127.0.0.1:8080</pre>
      ${note("โฟลเดอร์นี้ <strong>ไม่มี build step</strong> — เปิด <code>index.html</code> ผ่าน http:// ได้เลย (file:// ถูกเบราว์เซอร์บล็อก ES modules)", "info")}`,
    })}
  </div>

  ${card({
    title: "ก่อนขึ้น production ต้องมี (checklist)",
    body: `<div class="check-grid">
      ${[
        "รับ snapshot ผ่าน queue/Webhook จริง + เก็บ snapshot เป็น immutable store (พร้อม hash chain)",
        "audit trail ย้ายไป server, แก้ย้อนหลังไม่ได้, export ได้ (PDF/CSV)",
        "แหล่งผู้ใช้/บทบาทจริง (SSO/AD) + นโยบาย SoD ที่เจ้าของกระบวนการรับรองเป็นลายลักษณ์อักษร",
        "สัญญา Posting Gateway v1 (ฟิลด์/ข้อผิดพลาด/idempotency) แล้วจึงเปิด action “post”",
        "เอกสาร snapshot contract v1.1 รวมฟิลด์ส่วนขยาย + version negotiation ที่ปลอดภัย",
        "เก็บไฟล์ PDF จริงพร้อม permission รายเอกสาร + watermark + ล็อกการเข้าถึง",
        "e2e test กับ environment UAT ของ OCR service (ไม่ mirror engine ฝั่ง portal)",
        "load test: คิว 5,000 รายการ + virtualized table + server-side filter",
        "การแจ้งเตือน (email/Line) เมื่อมีงาน assigned_to=user และเมื่อ outbox ค้างเกิน n ครั้ง",
        "PDPA: ทบทวนข้อมูลส่วนบุคคลในภาพเอกสาร/Tax ID + กำหนดการเก็บรักษา/ทำลาย",
      ]
        .map((t) => `<label class="check"><input type="checkbox"><span>${t}</span></label>`)
        .join("")}
    </div>`,
  })}`;
}
