/**
 * views/manual.js — คู่มือระบบ (-render เอกสารของ repo ภายในแอป-)
 *
 * สิ่งที่แสดง:
 *  1) โปสเตอร์ "ใช้งาน portal นี้อย่างไร" (เขียนจากสถานะจริงของ store + เคสใน fixture)
 *  2) ต้นฉบับเอกสารใน repo (docs/*.md) แบบ render พร้อม provenance ต่อไฟล์
 *
 * เหตุผลที่ไม่ copy เนื้อหาเอกสารมาเขียนใน view: เอกสารใน repo แก้บ่อย
 * ถ้า copy มาวาง ข้อความบนจอจะเก่าทันที — หน้านี้อ่าน repo-docs.js ซึ่ง sync.py คัดมาสด ๆ
 */

import { esc, card, table, badge, note, kv, jsonBlock } from "../ui/dom.js";
import { code, dt, ago, link } from "../ui/format.js";
import { pageHead, tabs, sourceTag, chips, statLine } from "../ui/parts.js";
import { renderMarkdown } from "../ui/markdown.js";
import { docIndex, standardVersion, principles } from "../domain/reference.js";
import { REPO_DOCS } from "../data/repo-docs.js";
import { SOURCE_REGISTRY } from "../data/sources.js";
import { SNAPSHOT_BUNDLE } from "../data/snapshots.js";
import { USERS, ROLE_LABEL } from "../domain/access.js";
import { CONTRACT_VERSION } from "../domain/schema.js";

const PORTAL_TAB = "portal";

export function render(ctx) {
  const docs = docIndex();
  const wanted = ctx.route.params.doc ?? ctx.route.params.tab ?? PORTAL_TAB;
  const active = docs.find((d) => d.id === wanted);
  /* id ที่ไม่มีจริง (link เก่า/พิมพ์ผิด) ต้องไม่ทำให้หน้า “ไม่มีแท็บใดถูกเลือก” */
  const tab = active ? wanted : PORTAL_TAB;

  const items = [[PORTAL_TAB, "ใช้งาน portal นี้อย่างไร"], ...docs.map((d) => [d.id, d.title])];
  const body = active ? docView(active, ctx) : portalGuide(ctx);

  return [
    pageHead({
      title: "คู่มือระบบ",
      sub: `เอกสารทั้งหมดใน <code>docs/</code> ของ repo ถูก sync เข้ามาแสดงตรงนี้ (${docs.length} ไฟล์ · ${docs.reduce(
        (n, d) => n + d.lines,
        0,
      )} บรรทัด) — portal ไม่เขียนเนื้อหาเกณฑ์ซ้ำ`,
      actions: `<a class="btn sm ghost" href="#/rules">ไปหน้า กฎ & ข้อยกเว้น</a>`,
    }),
    tabs({ base: "#/manual", value: tab, items }),
    `<div class="stack">${body}</div>`,
    sourceTag(["docs-index", "architecture", "rules-standard", "api-reference", "integrations"]),
  ].join("");
}

/* ------------------------------------------------------------------ *
 * 1) คู่มือการใช้งาน portal (ข้อมูลจริงจาก store + fixture)
 * ------------------------------------------------------------------ */
function portalGuide(ctx) {
  const st = ctx.store.stats();
  const cases = SNAPSHOT_BUNDLE.documents
    .filter((d) => d.expect)
    .map((d) => {
      const live = ctx.store.get(d.document_id);
      return `<tr>
        <td>${link(d.document_id, d.document_id.replace("AIVA-2609-", ""))}<div class="sub muted">${esc(d.title.slice(0, 34))}…</div></td>
        <td>${badge(d.expect.status, STATUS_TONE[d.expect.status] ?? "muted")}</td>
        <td>${chips(d.expect.codes ?? [], (c) => (c === "E28" || c === "E17" || c === "E31" ? "bad" : "warn"))}</td>
        <td>${d.expect.assigned === "user" ? badge("ผู้ใช้", "user") : d.expect.assigned === "accounting" ? badge("บัญชี", "info") : badge("อัตโนมัติ", "ok")}</td>
        <td class="small">${esc(CASE_NOTE[d.document_id.slice(-4)] ?? "ดูหมายเหตุใน snapshot")}</td>
        <td>${live?.workflow ? badge(live.workflow.status, "muted") : ""}</td>
      </tr>`;
    })
    .join("");

  const pr = principles();

  return [
    card({
      title: "หน้านี้คืออะไร และไม่ใช่อะไร",
      sub: `mockup v4.4 → portal v5 · ข้อมูลเดโม ${st.docs} เอกสาร / ${st.snapshots} revision · contract v${CONTRACT_VERSION}`,
      body:
        statLine([
          ["ผลตรวจทั้งหมดในระบบ", `${Object.keys(st.byStatus).length} สถานะ`, ""],
          ["snapshot ที่ contract ไม่ผ่าน", st.schemaInvalid, st.schemaInvalid ? "bad" : "ok"],
          ["หลักฐานไม่ตรงกับ revision", st.staleEvidence, st.staleEvidence ? "warn" : "ok"],
          ["คำขอค้างใน outbox", st.outboxPending, st.outboxPending ? "warn" : "ok"],
        ]) +
        `<div class="two-col">
          <div>
            <h4>portal นี้ทำ</h4>
            <ul class="ticks">
              <li>แสดง snapshot ที่ OCR service ส่งมา พร้อมตรวจ receiving contract ที่ขอบเขต</li>
              <li>จัดการสถานะงาน (กัก/ปล่อย/resubmit/ยืนยัน/ปฏิเสธ) พร้อมเหตุผลและ audit</li>
              <li>บอกว่า “งานถัดไปอยู่ที่ใคร” ตามผัง owner ใน master_data.py</li>
              <li>เปิดให้ดูหลักฐาน provenance: ตัวเลข/ข้อความนี้มาจากไฟล์ไหน ของ repo</li>
            </ul>
          </div>
          <div>
            <h4>portal นี้ไม่ทำ (โดยตั้งใจ)</h4>
            <ul class="ticks">
              <li>ไม่รัน OCR ไม่เรียก Vision — รับเฉพาะ snapshot</li>
              <li>ไม่เรียก Oracle SQL — ข้อมูลรับของมากับ snapshot เท่านั้น</li>
              <li>ไม่คำนวณการจับคู่/ผลต่าง/ผลลัพธ์สุดท้ายเอง — มีเทสต์ <code>no-engine-in-runtime</code> เฝ้าอยู่</li>
              <li>ไม่ตั้งหนี้จริง — action “ส่งตั้งหนี้” ถูกปิดทุกบทบาทจนกว่าจะมีสัญญา AP</li>
              <li>ไม่เขียนข้อมูลกลับ master — read-only</li>
            </ul>
          </div>
        </div>`,
    }),
    card({
      title: "เดินเดโมให้ครบทุกกรณี",
      sub: "ตารางนี้สร้างจากฟิลด์ <code>expect</code> ใน fixture (<code>tools/cases-*.mjs</code>) — ไม่ใช่ข้อความที่พิมพ์มืออีกชั้น",
      actions: `<span class="muted small">สลับผู้ใช้ที่มุมขวาบนเพื่อทดสอบสิทธิ์/Separation of duties</span>`,
      body:
        table({
          head: ["เอกสาร", "ผลตรวจที่ควรได้", "ข้อยกเว้น", "งานของ", "เรื่องที่สาธิต", "สถานะงานตอนนี้"],
          rows: cases,
        }) +
        note(
          `ผู้ใช้เดโม 7 คน (สมมติ): ${USERS.map((u) => `${code(u.initials)} ${esc(ROLE_LABEL[u.role].split(" (")[0])}`).join(" · ")}
           · ผู้ที่ <em>แนบเอกสารเอง</em> ยืนยัน/ปฏิเสธเอกสารตัวเองไม่ได้ (Separation of duties)`,
          "muted",
        ),
    }),
    card({
      title: "หลักการที่ portal ยึด (เอกสารมาตรฐาน D1–D6 + กติกาที่ทีมวางไว้)",
      sub: "คอลัมน์ซ้ายคือตัวอักษรจาก <code>docs/matching-rules-standard-v6.2.md</code> · คอลัมน์ขวาคือสิ่งที่โค้ด portal ทำจริง",
      body: table({
        head: ["หลักการ", "ตามเอกสาร", "portal ทำอย่างไร"],
        rows: pr
          .map((p) => `<tr><td>${code(p.id)}</td><td class="small">${esc(p.detail)}</td><td class="small">${esc(PORTAL_FOLLOW[p.id] ?? "—")}</td></tr>`)
          .join(""),
      }),
    }),
    card({
      title: "สิ่งที่ยังไม่ได้ต่อ (ปิดไว้เป็นนโยบาย ไม่ใช่ของหลุด)",
      body: `<ul class="ticks">
        <li><strong>ส่งตั้งหนี้ที่ AP/Oracle</strong> — ยังไม่มีสัญญา API → action “post” ปิดทุกบทบาท (กดแล้วเห็นเหตุผลใต้ปุ่ม)</li>
        <li><strong>Viewer แสดง PDF จริง</strong> — repo รับได้เฉพาะ .png → แสดง metadata + ตรวจว่าหลักฐานตรงกับ revision</li>
        <li><strong>เรียก OCR service ตรง ๆ</strong> — สั่งผ่าน outbox (event) เท่านั้น เพื่อให้ retry/audit อยู่ฝั่ง producer</li>
        <li><strong>SSO/ผู้ใช้จริง</strong> — ผู้ใช้ 7 คนอยู่ใน <code>domain/access.js</code> เป็นข้อมูลสมมติ</li>
        <li><strong>Backend + DB</strong> — งาน/audit อยู่ใน localStorage (F5 ได้ แต่ไม่ใช่ system of record)</li>
      </ul>
      ${note("ก่อนขึ้น production ต้องมี: audit ฝั่ง server, snapshot store แบบ immutable + hash, contract v1.1 (ฟิลด์ส่วนขยาย), e2e กับ UAT ของ OCR service, นโยบาย PDPA ของภาพเอกสาร — รายละเอียดใน <code>docs/PORTAL-plan.md</code>", "info")}`,
    }),
  ].join("");
}

const STATUS_TONE = { "Auto-pass": "ok", Review: "warn", Hold: "bad", "Manual Review": "info" };
const PORTAL_FOLLOW = {
  D1: "ไม่ import <code>src/engine/</code> ตอน runtime เลย (มีเทสต์ตรวจ)",
  D2: "ไม่มี SQL/Oracle client ในโค้ด portal · อ่าน snapshot อย่างเดียว",
  D3: "resubmit = event ใน outbox + waiting_revision · portal ไม่เรียกซ้ำเอง",
  D4: "<code>tools/sync.py</code> ลอก master จาก <code>master_data.py</code> ทั้งก้อน map ไม่ได้ = UNMAPPED + เหตุผล",
  D5: "ตาราง 9 กฎแสดงเสมอ กฎขาดจาก snapshot → เตือน “ไม่มีข้อมูล ≠ ผ่าน” + บล็อกยืนยัน",
  D6: "ทุก action บังคับเหตุผล ≥5 ตัวอักษร · audit append-only · ทุกหน้ามี <code>sourceTag</code> บอกที่มา + sha256",
};
const CASE_NOTE = {
  "0001": "Auto-pass ครบ 9 กฎ แต่ผู้แนบ = ผู้อนุมัติคนเดียวกัน → ปุ่มยืนยันปิดด้วย SoD",
  "0002": "ขาดลายเซ็นผู้รับของ (E26) → งานตกที่ผู้ใช้ ต้องแนบหลักฐาน",
  "0004": "E28 คณิตบรรทัดผิด → engine bypass ไม่เรียก Oracle กฎขั้น 2–3 ไม่ได้ตรวจ",
  "0006": "E17/E30/E31 + map บริษัทไม่ได้ → บล็อกการตั้งหนี้",
  "0007": "นิติบุคคลไม่อยู่ใน master → Manual Review ส่งบัญชี",
  "0008": "เอกสารซ้ำกับ 0009 ( supplier_name + invoice_num ) — engine ไม่กันซ้ำ portal เป็นคนจับ",
  "0012": "E16 เศษสตางค์ (Low) ยัง Auto-pass → ยืนยันได้ แล้วปุ่มตั้งหนี้ยังปิด",
  "0013": "2 revision (r1 Hold → r2 Review) + งาน On Hold ตั้งต้น ดู revision เก่าได้",
  "0014": "Vision อ่านไม่ครบ 9 หน้า → V-01 ออก E13 และเตือนว่าข้อมูลอาจไม่ครบฉบับ",
  "0015": "outbox ค้าง (retry 3/5) และ producer ยังไม่ส่ง r2 → กดปุ่มเดโมเพื่อ ingest จริง",
  "0016": "pipeline ล้ม snapshot เขียนมือ ไม่มีผลตรวจ 9 กฎ → บล็อกทุก action",
  "0018": "PDF เป็นของ r1 แต่ผลตรวจปัจจุบัน r2 → หลักฐานเก่า ห้ามยืนยัน",
  "0019": "บิลนำเข้า USD ไม่คิด VAT → engine คาดหวัง 7% เสมอ จึงออก E31+E13",
  "0020": "ส่งผลตรวจมาแค่ 5/9 กฎ → “ไม่มีข้อมูล ≠ ผ่าน” บล็อก confirm",
  "0022": "แถวใบรับ ≥ 50 → V-04 = MANUAL (fail-safe ไม่เดา)",
};

/* ------------------------------------------------------------------ *
 * 2) ตัว render เอกสาร repo
 * ------------------------------------------------------------------ */
function docView(doc, ctx) {
  const raw = REPO_DOCS.find((d) => d.id === doc.id)?.body ?? "";
  const { html, toc } = renderMarkdown(raw, { skipH1: true });
  const wantRaw = ctx.route.params.raw === "1";

  return [
    card({
      title: doc.title,
      sub: `<code>${esc(doc.path)}</code> · ${doc.lines} บรรทัด · ${doc.bytes.toLocaleString("th-TH")} bytes`,
      actions: `<a class="btn sm ghost" href="#/manual?doc=${esc(doc.id)}${wantRaw ? "" : "&raw=1"}">${wantRaw ? "แสดงแบบ render" : "ดู markdown ดิบ"}</a>`,
      body:
        kv(
          [
            ["sha256 (ตัดมา 16 ตัว)", `<code>${esc(doc.sha256.slice(0, 16))}…</code>`],
            ["แก้ไขล่าสุดใน repo", `${dt(doc.mtime)} (${esc(ago(doc.mtime))})`],
            ["sync เข้า portal", `${esc(SOURCE_REGISTRY.synced_at)} · <code>python tools/sync.py</code>`],
            ["ใช้แสดงที่", "หน้านี้ + หน้า <a class='link' href='#/rules'>กฎ & ข้อยกเว้น</a> (อ่านตารางจาก markdown เดียวกัน)"],
          ],
          2,
        ) +
        chips([`มาตรฐาน ${standardVersion() ?? "—"}`], () => "mono"),
    }),
    wantRaw
      ? jsonBlock(raw, "markdown ต้นฉบับ")
      : `<div class="md-layout">
          <nav class="md-toc">
            <p class="md-toc-h">สารบัญ</p>
            ${toc.map((t) => `<a href="#${t.id}" data-scroll="${esc(t.id)}">${esc(t.text)}</a>`).join("") || '<p class="muted">ไม่มีหัวข้อ</p>'}
          </nav>
          <article class="md-body">${html}</article>
        </div>`,
  ].join("");
}
