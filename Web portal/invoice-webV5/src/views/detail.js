/**
 * views/detail.js — เอกสาร 1 ฉบับ (v5: ย่อจาก 7 การ์ดเหลือ "สรุปต้องทำอะไร" + 4 แท็บ)
 *
 * แยกชั้นข้อมูลชัดเจน:
 *   snapshot (ของ engine — อ่านอย่างเดียว)  → ผลตรวจ ข้อยกเว้น ยอดเงิน การจับคู่ หลักฐาน
 *   workflow (ของ portal — overlay)        → สถานะงาน เหตุผล ผู้กัก optimistic version outbox
 * ตัวเลขสรุปทั้งหมดคำนวณจาก decimal string ใน <code>domain/money.js</code> เพื่อ "แสดงการตรวจ"
 * ไม่ใช่ "ตัดสินใหม่" — ผลลัพธ์สุดท้ายยังอ่านจาก snapshot.status เสมอ
 */

import { esc, card, table, badge, kv, note, jsonBlock } from "../ui/dom.js";
import { statusBadge, wfBadge, sevBadge, money, qty, code, dt, ago, bool, pillList, link } from "../ui/format.js";
import { pageHead, tabs, sourceTag, emptyState, chips } from "../ui/parts.js";
import { summarize, codeMeta } from "../domain/exceptions.js";
import { guards, evidenceStatus, blockingFor } from "../domain/guards.js";
import { actionMatrix, userById, isMyTask } from "../domain/access.js";
import { canTransition } from "../domain/workflow.js";
import { ruleMeta, VERDICT, MATCH_LEVEL, STEP_LABEL, ALL_RULE_IDS } from "../domain/ruleCatalog.js";
import { dec, dAdd, dMul, dDiff, dCmp, dSub, fmtMoney } from "../domain/money.js";
import { CONTRACT_VERSION } from "../domain/schema.js";
import { standardRules } from "../domain/reference.js";

const D = (x) => dec(x ?? "0");
const ZERO = dec("0");
const TABS = [
  ["", "สรุป & ผลตรวจ"],
  ["lines", "การจับคู่รายบรรทัด"],
  ["evidence", "ต้นเอกสาร & หลักฐาน"],
  ["work", "งานของ portal & audit"],
];

export function render(ctx) {
  const doc = ctx.store.get(ctx.route.id);
  if (!doc)
    return card({
      title: "ไม่พบเอกสาร",
      body: note(`ไม่มีเอกสารรหัส <strong>${esc(ctx.route.id)}</strong> — <a class="link" href="#/">กลับหน้างาน</a>`, "bad"),
    });

  const want = Number(ctx.route.params.r ?? doc.current.revision);
  const snap = doc.revisions.find((s) => s.revision === want) ?? doc.current;
  const viewingOld = snap.revision !== doc.current.revision;
  const tab = ctx.route.params.tab ?? "";

  const body = {
    "": `${rulesCard(snap)}${exceptionsCard(snap)}`,
    lines: `${linesCard(snap)}${receiptCard(snap)}`,
    evidence: `${headerCard(snap)}${evidenceCard(doc)}${contractCard(doc, snap)}`,
    work: `${workflowCard(doc, ctx.user)}${auditCard(doc, ctx)}`,
  }[tab];

  return [
    pageHead({
      title: `${doc.document_id}`,
      sub: `${esc(doc.title)} · <a class="link" href="#/">← กลับหน้างาน</a>`,
      actions: `<div class="head-badges">${statusBadge(snap.status)}${wfBadge(doc.workflow.status)}${badge(
        doc.company,
        doc.company === "UNMAPPED" ? "bad" : "muted",
      )}${isMyTask(ctx.user, doc) ? badge("ถึงคิวคุณ", "teal") : ""}</div>`,
    }),
    taskBar(doc, snap, ctx),
    revBar(doc, snap, viewingOld, tab),
    tabs({ base: `#/doc/${doc.document_id}`, value: tab, items: TABS.map(([k, l]) => [k, l]), query: `r=${snap.revision}&` }),
    `<div class="stack">${body ?? emptyState("ไม่พบแท็บนี้")}</div>`,
    sourceTag(["rules-engine", "master-data"], `ผลตรวจทั้งก้อนมาจาก snapshot <code>${esc(snap.event_id)}</code> — portal ไม่รันกฎเอง`),
  ].join("");
}

/* ------------------------------------------------------------------ *
 * "ต้องทำอะไรต่อ" — การ์ดแรกที่ตอบคำถามเดียวของผู้ใช้
 * ------------------------------------------------------------------ */
function taskBar(doc, snap, ctx) {
  const sum = summarize(snap.exceptions);
  const gs = guards(doc);
  const blockers = gs.filter((g) => g.level === "block");
  const ready = actionMatrix(ctx.user, doc).filter((a) => {
    const t = canTransition(doc.workflow.status, a.action);
    return a.ok && t.ok && blockingFor(doc, a.action).length === 0;
  });
  const owner = snap.decision?.assigned_to;
  const top = sum.list[0];
  const m = totals(snap);

  const next = blockers.length
    ? { tone: "bad", k: "ยังปิดไม่ได้", v: blockers[0].title, why: blockers[0].detail }
    : snap.status === "Auto-pass"
      ? { tone: "ok", k: "รอมนุษย์อนุมัติ 1 ครั้ง", v: "Auto-pass ไม่ได้แปลว่าตั้งหนี้เอง", why: "นโยบาย: ต้องมี APR ที่ไม่ใช่ผู้แนบเอกสารกดยืนยัน" }
      : { tone: "warn", k: `งานอยู่ที่${owner === "user" ? "ผู้ใช้ (Receiver)" : owner === "accounting" ? "ฝ่ายบัญชี" : "ระบบ"}`, v: top ? `${top.code} — ${codeMeta(top.code).label}` : "ไม่มีข้อยกเว้น", why: (top ? codeMeta(top.code).next : "") || snap.note || "—" };

  return `<section class="task ${next.tone}">
    <div class="task-main">
      <p class="task-k">${esc(next.k)}</p>
      <p class="task-v">${esc(next.v)}</p>
      <p class="task-why">${esc(next.why)}</p>
      <p class="task-next">
        ปุ่มทำงานทั้งหมดอยู่ในแท็บ “งาน & สถานะ”
        <a class="link" href="#/doc/${esc(doc.document_id)}?r=${snap.revision}&tab=work">ไปที่แท็บงาน${ready.length ? ` (${ready.length} ปุ่มที่กดได้ตอนนี้)` : " (ยังไม่มีปุ่มที่กดได้)"}</a>
      </p>
      <p class="task-codes">${chips(sum.codes, (c) => (codeMeta(c).severity === "High" ? "bad" : "warn"))}${
        sum.codes.length ? "" : badge("ไม่มีข้อยกเว้น", "ok")
      } <span class="muted small">เจ้าของงานต่อรหัส: ผู้ใช้ ${sum.userCodes.join(", ") || "—"} · บัญชี ${sum.accountCodes.join(", ") || "—"}</span></p>
      ${blockers.length > 1 ? `<p class="task-more muted small">และ blockers อีก ${blockers.length - 1} ข้อ → <a class="link" href="#/doc/${esc(doc.document_id)}?tab=work">ดูที่แท็บงานของ portal</a></p>` : ""}
    </div>
    <div class="task-side">
      <table class="mini">
        <tbody>
          ${mRow("ยอดตามใบกำกับภาษี (grand)", money(snap.invoice?.grand_total))}
          ${mRow("มูลค่าสินค้า (subtotal)", money(snap.invoice?.sub_total))}
          ${mRow("VAT ที่แสดง", `${money(snap.invoice?.vat)} <span class="muted small">คาดหวัง 7% = ${esc(fmtMoney(m.expectVat))} · ต่าง ${esc(fmtMoney(m.vatDiff))}</span>`)}
          ${mRow("Σ ใบรับจริง (Oracle)", `${money(m.receiptTotal)} <span class="muted small">ต่างจาก subtotal ${esc(fmtMoney(m.receiptDiff))}</span>`)}
          ${mRow("ผลต่างรายบรรทัดสูงสุด", `<span class="num">${esc(fmtMoney(m.lineWorst))}</span> <span class="muted small">กรอบ ±0.50</span>`)}
        </tbody>
      </table>
      <p class="muted small">ตัวเลขทั้งหมดเป็น decimal string คำนวณใน <code>domain/money.js</code> · tolerance as-built ${toleranceChips(ctx.meta.tolerance)}</p>
    </div>
  </section>`;
}

const mRow = (k, v) => `<tr><td class="muted">${esc(k)}</td><td class="num"><strong>${v}</strong></td></tr>`;

function totals(snap) {
  const inv = snap.invoice ?? {};
  const lines = snap.lines ?? [];
  const expectVat = dMul(D(inv.sub_total), D("0.07"));
  const receiptTotal = (snap.receipt?.rows ?? []).reduce((a, r) => dAdd(a, dMul(D(r.QUANTITY_RECEIVED), D(r.UNIT_PRICE))), ZERO);
  return {
    expectVat,
    vatDiff: dSub(D(inv.vat), expectVat),
    receiptTotal,
    receiptDiff: dSub(D(inv.sub_total), receiptTotal),
    lineWorst: lines.map((l) => dDiff(dMul(D(l.qty), D(l.unit_price)), D(l.amount))).reduce((a, b) => (dCmp(a, b) >= 0 ? a : b), ZERO),
  };
}

function revBar(doc, snap, viewingOld, tab) {
  const href = (r) => `#/doc/${esc(doc.document_id)}?r=${r}${tab ? `&tab=${tab}` : ""}`;
  return `<div class="rev-bar">
    <span class="muted small">revision</span>
    ${doc.revisions
      .map(
        (s) =>
          `<a class="rev ${s.revision === snap.revision ? "on" : ""} ${doc.schema[s.revision]?.ok ? "" : "bad"}" href="${href(s.revision)}">r${s.revision} <span class="muted">${esc(s.status)}</span>${
            doc.schema[s.revision]?.ok ? "" : " ⚠"
          }</a>`,
      )
      .join("")}
    ${doc.pending_snapshot ? badge(`มี r${doc.pending_snapshot.revision} รอ producer ส่ง`, "info") : ""}
    ${viewingOld ? note(`กำลังดู <strong>r${snap.revision}</strong> (เก่า) — ทุก action ของ portal ทำงานกับ r${doc.current.revision} ปัจจุบันเท่านั้น`, "warn") : ""}
  </div>`;
}

/** tolerance from bundle metadata → ข้อความอ่านง่าย (ไม่ hardcode ใน UI) */
function toleranceChips(t = {}) {
  const label = {
    lineMath: "ผลต่างคำนวณรายบรรทัด",
    docSum: "รวมเอกสาร",
    vat: "VAT",
    grand: "grand total",
    receiptTotal: "เทียบยอดรับ",
    pricePct: "ราคาต่าง (สัดส่วน)",
    priceAbs: "ราคาต่าง (abs)",
    receiptSafetyCap: "แถวใบรับสูงสุดที่ engine กลัวเดา",
  };
  return Object.entries(t)
    .map(([k, v]) => `<span class="tol" title="${esc(label[k] ?? k)}"><code>${esc(k)}</code> ${esc(k === "pricePct" ? `${Number(v) * 100}%` : k === "receiptSafetyCap" ? `${v} แถว` : v)}</span>`)
    .join("");
}

/* ------------------------------------------------------------------ *
 * แท็บ 1: 9 กฎ + ข้อยกเว้น
 * ------------------------------------------------------------------ */
function rulesCard(snap) {
  const rules = snap.rules ?? [];
  const std = new Map(standardRules().map((r) => [r.id, r]));
  const missing = ALL_RULE_IDS.filter((id) => !rules.some((r) => r.rule_id === id));
  const byStep = { 1: [], 2: [], 3: [] };
  for (const r of rules) (byStep[ruleMeta(r.rule_id).step] ?? byStep[3]).push(r);

  const blocks = [1, 2, 3]
    .filter((s) => byStep[s].length)
    .map((s) => {
      const rows = byStep[s]
        .sort((a, b) => a.rule_id.localeCompare(b.rule_id))
        .map((r) => {
          const meta = ruleMeta(r.rule_id);
          const v = VERDICT[r.result] ?? { label: r.result, tone: "muted" };
          return `<tr class="${r.result === "FAIL" ? "row-fail" : ""}">
            <td>${code(r.rule_id)}<div class="sub muted">ขั้น ${meta.step}</div></td>
            <td><strong>${esc(meta.name)}</strong><div class="sub">${esc(std.get(r.rule_id)?.checks?.[0] ?? meta.checks)}</div></td>
            <td>${badge(v.label, v.tone)}${r.halted_by ? ` ${badge(`หยุดโดย ${r.halted_by}`, "muted")}` : ""}</td>
            <td>${r.code ? code(r.code, codeMeta(r.code).userTask ? "user" : "acc") : `<span class="muted">—</span>`}${
              r.severity ? ` ${sevBadge(r.severity)}` : ""
            }</td>
            <td class="small">${esc(r.details || "—")}${r.page != null ? ` <span class="muted">(หน้า ${r.page})</span>` : ""}</td>
          </tr>`;
        })
        .join("");
      return `<h4 class="step">${esc(STEP_LABEL[s])}</h4>${table({ head: ["กฎ", "สิ่งที่ตรวจ (ตามเอกสารมาตรฐาน)", "ผล", "รหัส", "รายละเอียดจาก engine"], rows })}`;
    })
    .join("");

  return card({
    title: `ผลตรวจ 9 กฎ — ${rules.length ? `รับจาก snapshot ${rules.length} รายการ` : "ไม่มีข้อมูลใน snapshot"}`,
    sub: `engine ${esc(snap.engine_version)} · catalog ${esc(snap.rule_catalog_version)} · คำอธิบายกฎอ่านจาก <code>docs/matching-rules-standard-v6.2.md</code> เท็กซ์จริง`,
    body:
      (rules.length ? blocks : note("snapshot นี้ไม่มีรายการใน rules — <strong>“ไม่มีข้อมูล” ไม่ใช่ “ผ่านทุกกฎ”</strong>", "bad")) +
      (missing.length ? note(`กฎที่หายไปจาก snapshot: ${missing.map((m) => code(m)).join(" ")} — ห้ามตีความว่าผ่าน`, "warn") : "") +
      `<details class="fold"><summary>พฤติกรรม as-built ที่ต่างจากเอกสารมาตรฐาน (9 ข้อ)</summary>
        <ul>${ALL_RULE_IDS.map((id) => `<li>${code(id)} — ${esc(ruleMeta(id).asBuilt)}</li>`).join("")}</ul>
        <p class="muted small">รายละเอียดเทียบทีละรหัส: <a class="link" href="#/rules?tab=exceptions">กฎ & ข้อยกเว้น</a></p></details>`,
  });
}

function exceptionsCard(snap) {
  const sum = summarize(snap.exceptions);
  if (!sum.list.length)
    return card({
      title: "ข้อยกเว้น",
      body: note("ไม่มีข้อยกเว้น — ผลคือ <strong>Auto-pass</strong> ซึ่งยังต้องมีการอนุมัติจากคน 1 ครั้งก่อนตั้งหนี้", "ok"),
    });
  const rows = sum.list.map((e) => {
    const meta = codeMeta(e.code);
    return `<tr>
      <td>${code(e.code, meta.userTask ? "user" : "acc")}<div class="sub muted">${esc(e.rule_id ?? "")}</div></td>
      <td>${sevBadge(e.severity)}</td>
      <td class="small">${esc(e.message ?? meta.label)}<div class="sub muted">as-built: ${esc(meta.label)}</div></td>
      <td>${meta.userTask ? badge("งานของผู้ใช้", "user") : badge("ฝ่ายบัญชี", "info")}<div class="sub">${esc(meta.next)}</div></td>
      <td class="num">${e.page ?? "—"}</td>
    </tr>`;
  });
  return card({
    title: `ข้อยกเว้น ${sum.list.length} รายการ`,
    sub: `High ${sum.counts.High ?? 0} · Medium ${sum.counts.Medium ?? 0} · Low ${sum.counts.Low ?? 0} · ความหมายรหัส = ตัวอักษรจาก <code>master_data.py</code> (ดูเทียบเอกสารได้ที่หน้ากฎ)`,
    body: table({ head: ["รหัส", "Severity", "สิ่งที่ engine พบ", "ต้องทำอะไรต่อ", "หน้า"], rows }),
  });
}

/* ------------------------------------------------------------------ *
 * แท็บ 2: บรรทัด + แถวใบรับ
 * ------------------------------------------------------------------ */
function linesCard(snap) {
  const lines = snap.lines ?? [];
  const matches = snap.matches ?? [];
  const rows = lines.map((l) => {
    const m = matches.find((x) => x.line_no === l.line_no) ?? null;
    const lvl = m?.match_level ? MATCH_LEVEL[m.match_level] : null;
    const calc = dMul(D(l.qty), D(l.unit_price));
    const diff = dDiff(calc, D(l.amount));
    const flags = [m?.qty_flag ? badge(m.qty_flag, "bad") : "", m?.price_flag ? badge(m.price_flag, m.price_flag === "E29" ? "muted" : "bad") : "", m?.uom_flag ? badge(m.uom_flag, "warn") : ""].join(" ");
    return `<tr>
      <td class="num">${l.line_no}</td>
      <td><strong>${esc(l.description)}</strong>${l.item_code ? `<div class="sub">${code(l.item_code)}</div>` : ""}</td>
      <td class="num">${qty(l.qty)}<div class="sub muted">${esc(l.uom ?? "")}</div></td>
      <td class="num">${money(l.unit_price)}</td>
      <td class="num">${money(l.amount)}${dCmp(diff, ZERO) ? `<div class="sub warn-text">qty×price = ${esc(fmtMoney(calc))}</div>` : ""}</td>
      <td>${lvl ? badge(lvl.label, lvl.tone) : badge("ไม่มีการจับคู่", "muted")}${m?.match_note ? `<div class="sub muted">${esc(m.match_note)}</div>` : ""}${
        m?.receipt_num ? `<div class="sub">ใบรับ ${esc(m.receipt_num)} · บรรทัด ${esc(m.receipt_line ?? "—")}</div>` : ""
      }</td>
      <td class="num">${m ? qty(m.receipt_qty) : `<span class="muted">—</span>`}</td>
      <td class="num">${m ? money(m.receipt_price) : `<span class="muted">—</span>`}</td>
      <td>${flags || `<span class="muted">—</span>`}</td>
    </tr>`;
  });
  const levels = [...new Set(matches.map((x) => x.match_level).filter(Boolean))];
  return card({
    title: `การจับคู่รายบรรทัด (${lines.length} บรรทัด · ${matches.length} คู่)`,
    sub: "bilinear 1-1 · M1 item code → M2 ชื่อตรงทั้งข้อความ → M3 token → M4 fallback (as-built: M4 ทำให้ E30 แทบไม่เกิด)",
    body:
      table({
        head: ["#", "รายการ", "จำนวน", "ราคา/หน่วย", "มูลค่า", "วิธีจับคู่", "รับจริง", "ราคาใบรับ", "ธง"],
        rows,
        empty: "snapshot ไม่มีบรรทัดสินค้า",
      }) +
      `<div class="legend">${levels
        .map((lv) => `<span>${badge(MATCH_LEVEL[lv]?.label ?? lv, MATCH_LEVEL[lv]?.tone ?? "muted")} ${esc(MATCH_LEVEL[lv]?.note ?? "")}</span>`)
        .join("")}</div>`,
  });
}

function receiptCard(snap) {
  const rcv = snap.receipt ?? {};
  const rows = (rcv.rows ?? []).map(
    (r) => `<tr class="${String(r.QUANTITY_RECEIVED) === "0" ? "row-dim" : ""}">
      <td>${code(r.PO_NUMBER ?? "—")}</td><td>${esc(r.RECEIPT_NUM ?? "—")}</td><td class="num">${r.LINE_NUM ?? "—"}</td>
      <td>${esc(r.ITEM_DESCRIPTION ?? "")}${r.ITEM_NUMBER ? `<div class="sub">${code(r.ITEM_NUMBER)}</div>` : ""}</td>
      <td class="num">${qty(r.QUANTITY_RECEIVED)}<div class="sub muted">${esc(r.UNIT_MEAS_LOOKUP_CODE ?? "")}</div></td>
      <td class="num">${money(r.UNIT_PRICE)}</td><td class="num">${money(r.LINE_TOTAL)}</td>
      <td class="num">${r.ORG_ID ?? "—"}${r.OU_ORG_ID != null ? `<div class="sub muted">OU ${r.OU_ORG_ID}</div>` : ""}</td>
    </tr>`,
  );
  return card({
    title: "แถวใบรับที่มากับ snapshot (ผลจาก Oracle SQL)",
    sub: rcv.sql_id
      ? `SQL ${esc(rcv.sql_id)} · PO ${esc(rcv.po_number ?? rcv.rows?.[0]?.PO_NUMBER ?? "—")} · ORG_ID ${rcv.org_id ?? "—"} (${esc(rcv.org_name ?? "ไม่ทราบบริษัท")})`
      : "ไม่มีข้อมูลใบรับ",
    body:
      table({ head: ["PO", "ใบรับ", "บรรทัด", "รายการ", "จำนวนรับ", "ราคา", "มูลค่า", "ORG"], rows, empty: "ไม่มีแถวใบรับ (V-04 → E17)" }) +
      kv(
        [
          ["นิติบุคคล (ORG_ID → master)", `${esc(rcv.company ?? "—")} · ${esc(rcv.company_label ?? "")} ${rcv.company_mapped === false ? badge("map ไม่ได้", "bad") : ""}`],
          ["เหตุผล mapping", esc(rcv.company_reason ?? "map จาก ORG_ID/Tax ID ปกติ")],
          ["มูลค่ารวมใบรับที่ engine เห็น", money(rcv.total_value)],
          ["ผู้รับของ (Receiver)", esc(rcv.receiver ?? "ไม่มีข้อมูล")],
        ],
        2,
      ) +
      (rcv.bypassed ? note(`engine ไม่เรียก Oracle SQL เพราะ ${esc(rcv.halted_by ?? "V-02 พบลูกค้า E28")} — กฎขั้น 2–3 จึง “ไม่ได้ตรวจ” ทั้งก้อน`, "bad") : ""),
  });
}

/* ------------------------------------------------------------------ *
 * แท็บ 3: ต้นเอกสาร + หลักฐาน + contract
 * ------------------------------------------------------------------ */
function headerCard(snap) {
  const d = snap.document ?? {};
  const sig = (s) => (d.pages_complete === false ? `<span class="muted">ข้าม (V-01 ไม่ตรวจหน้าไม่ครบ)</span>` : bool(s?.present, `พบหน้า ${s?.page ?? ""}`, "ไม่พบ"));
  return card({
    title: "ข้อมูลที่ OCR อ่านได้จากเอกสาร ( Vision output )",
    sub: `มาตรฐาน ${esc(snap.standard_version ?? "—")} · event ${code(snap.event_id)} · รับข้อมูล ${dt(snap.received_at)} (${esc(ago(snap.received_at))})`,
    body: kv(
      [
        ["เลขที่ใบกำกับภาษี", code(snap.invoice?.invoice_num ?? "")],
        ["วันที่เอกสาร", esc(snap.invoice?.invoice_date ?? "—")],
        ["ผู้ขาย", `${esc(snap.invoice?.supplier_name ?? "—")} · Tax ID ${esc(snap.invoice?.supplier_tax_id || "ว่าง")}`],
        ["ลูกค้า", `${esc(snap.invoice?.customer_name ?? "—")} · Tax ID ${esc(snap.invoice?.customer_tax_id || "ว่าง")}`],
        ["ที่อยู่ลูกค้า", esc(snap.invoice?.customer_address ?? "—")],
        ["เลข PO", code(snap.invoice?.po_number ?? "—")],
        ["Release #", esc(snap.invoice?.release_num ?? "—")],
        ["หน้า / อ่านครบ", `${d.pages ?? "—"} ${bool(d.pages_complete, "ครบทุกหน้า", "ไม่ครบ → V-01")}`],
        ["ชนิด PO", esc(d.po_type ?? "—")],
        ["ผู้แนบเอกสาร (ในไฟล์)", esc(d.uploaded_by ?? "—")],
        ["ลายเซ็นผู้ส่งของ", sig(snap.signatures?.supplier_or_deliverer)],
        ["ลายเซ็นผู้รับของ", sig(snap.signatures?.receiver)],
      ],
      2,
    ),
  });
}

function evidenceCard(doc) {
  const ev = evidenceStatus(doc);
  const tone = ev.state === "current" ? "ok" : ev.state === "stale" ? "bad" : "warn";
  return card({
    title: "หลักฐาน (ไฟล์ PDF ของ revision)",
    sub: "repo นี้รับได้เฉพาะ .png → portal แสดง metadata + ตรวจว่าหลักฐานตรงกับ revision ปัจจุบันหรือไม่",
    actions:
      ev.state === "current"
        ? ""
        : `<button class="btn sm ghost" data-demo="pdf" data-doc="${esc(doc.document_id)}" title="เดโม: จำลองว่า producer แนบ PDF ของ revision ปัจจุบันเข้ามา (ต้นทางจริงยังไม่มีช่องทางนี้)">เดโม: แนบ PDF ของ r${ev.rev}</button>`,
    body: `<div class="pdf ${tone}" data-evidence="${esc(ev.state)}" data-rev="${ev.rev}">
      <div class="pdf-box">${ev.state === "current" ? "📄" : "⚠️"}<span>${esc(ev.file_name ?? "ไม่มีไฟล์")}</span></div>
      ${kv(
        [
          ["สถานะ", badge(ev.state === "current" ? "ตรงกับ revision ปัจจุบัน" : ev.state === "stale" ? "เป็นของ revision เก่า" : "ยังไม่มีไฟล์", tone)],
          ["revision ที่ต้องเห็น", `r${ev.rev}`],
          ["revision ของไฟล์ที่มี", ev.have ? `r${ev.have}` : "—"],
          ["จำนวนหน้า", ev.pages ?? doc.current.document?.pages ?? "—"],
          ["เวลาแนบ", dt(ev.uploaded_at)],
          ["ที่มา", doc.pdf_synth ? badge("metadata สังเคราะห์ (เดโม)", "info") : badge("กำหนดใน fixture", "muted")],
        ],
        2,
      )}
    </div>`,
  });
}

function contractCard(doc, snap) {
  const v = doc.schema[snap.revision];
  const rows = doc.revisions.map((s) => {
    const x = doc.schema[s.revision];
    return `<tr class="${s.revision === snap.revision ? "row-active" : ""}">
      <td>${link(doc.document_id, `r${s.revision}`, `?r=${s.revision}`)}</td>
      <td>${dt(s.received_at)}<div class="sub muted">${esc(s.source_system)}</div></td>
      <td>${statusBadge(s.status)}</td>
      <td>${pillList((s.exceptions ?? []).map((e) => e.code))}</td>
      <td>${(s.rules ?? []).length ? `${(s.rules ?? []).length}/9` : badge("ไม่มีผลตรวจ", "bad")}</td>
      <td>${x?.ok ? badge("ผ่าน contract", "ok") : badge(`ไม่ผ่าน (${x?.errors.length ?? 0})`, "bad")}${
        x && !x.ok ? `<div class="sub err-list">${x.errors.slice(0, 3).map((e) => esc(`${e.path} — ${e.message}`)).join("<br>")}</div>` : ""
      }${x?.warnings?.length ? `<div class="sub muted">เตือน ${x.warnings.length} ข้อ</div>` : ""}</td>
    </tr>`;
  });
  return card({
    title: `receiving contract v${CONTRACT_VERSION} & provenance`,
    sub: "ทุก revision ถูกตรวจ schema ที่ขอบเขตก่อนเข้า store — ที่ไม่ผ่านยัง “แสดง” ได้ แต่ห้ามใช้ตัดสินใจ",
    body:
      table({ head: ["rev", "รับข้อมูล", "ผลตรวจ", "ข้อยกเว้น", "กฎ", "contract"], rows }) +
      (v?.ok
        ? note(`revision นี้ผ่าน contract (error 0 · warning ${v.warnings.length})`, "ok")
        : note(`revision นี้ไม่ผ่าน contract ${v.errors.length} ข้อ — บล็อกการยืนยัน/ตั้งหนี้`, "bad")) +
      `<p class="muted small">provenance: ${esc(snap.provenance?.kind ?? "ไม่ระบุ")} · สร้างโดย ${esc(snap.provenance?.generated_by ?? "—")} · engine ${esc(
        snap.provenance?.engine_version ?? snap.engine_version ?? "—",
      )}${snap.provenance?.hand_authored ? badge("เขียนมือ (เดโม)", "info") : ""}</p>` +
      jsonBlock(snap, `ดู snapshot JSON ดิบ (r${snap.revision})`),
  });
}

/* ------------------------------------------------------------------ *
 * แท็บ 4: งานของ portal
 * ------------------------------------------------------------------ */
function workflowCard(doc, user) {
  const wf = doc.workflow;
  const buttons = actionMatrix(user, doc)
    .map((a) => {
      const t = canTransition(wf.status, a.action);
      const reasons = [...a.reasons, ...t.reasons, ...blockingFor(doc, a.action).map((g) => `${g.title} — ${g.detail}`)];
      const ok = reasons.length === 0;
      return `<div class="act">
        <button class="btn ${a.action === "confirm" ? "primary" : ["reject", "post"].includes(a.action) ? "danger" : "ghost"} ${ok ? "" : "is-disabled"}"
          ${ok ? "" : 'aria-disabled="true"'} data-act="${esc(a.action)}" data-doc="${esc(doc.document_id)}" data-v="${wf.version}">${esc(a.label)}</button>
        ${ok ? "" : `<p class="why">${reasons.map((r) => esc(r)).join(" · ")}</p>`}
      </div>`;
    })
    .join("");

  const notes = (wf.notes ?? [])
    .slice(-8)
    .reverse()
    .map((n) => `<li><strong>${esc(n.action)}</strong> โดย ${esc(userById(n.by)?.name ?? n.by ?? "system")} · ${dt(n.ts)}${n.text ? `<div class="sub">${esc(n.text)}</div>` : ""}</li>`)
    .join("");

  const outbox = (doc.outbox ?? []).map(
    (o) => `<tr><td>${code(o.event_id)}</td><td>${esc(o.event_type)}</td><td class="num">${o.waiting_revision}</td>
      <td>${badge(o.status, o.status === "DELIVERED" ? "ok" : o.status === "PENDING" ? "warn" : "bad")}<div class="sub">${esc(ago(o.queued_at))}</div></td>
      <td class="num">${o.attempts}/${o.max_attempts}</td><td class="small">${esc(o.last_error ?? "—")}</td></tr>`,
  );

  const demo = [];
  if (doc.pending_snapshot) demo.push(`<button class="btn sm ghost" data-demo="deliver" data-doc="${esc(doc.document_id)}">เดโม: รับ r${doc.pending_snapshot.revision} จาก producer</button>`);
  demo.push(`<button class="btn sm ghost" data-demo="json" data-doc="${esc(doc.document_id)}">ทดสอบ ingestion ด้วย JSON</button>`);

  return card({
    title: "งานของ portal (สถานะ + การกระทำ)",
    sub: `สถานะงานเป็นของ portal (คนละฟิลด์กับผลตรวจของ engine) · optimistic version v${wf.version} · ตรวจ 3 ชั้น: สิทธิ์ → สถานะ → หลักฐาน/ความเสี่ยง`,
    body: `<div class="wf-top">${wfBadge(wf.status)}
      ${wf.heldBy ? badge(`กักโดย ${esc(userById(wf.heldBy)?.name ?? wf.heldBy)}`, "bad") : ""}
      ${wf.decidedBy ? badge(`ตัดสินโดย ${esc(userById(wf.decidedBy)?.name ?? wf.decidedBy)}`, "ok") : ""}
      <span class="muted small">ขยับล่าสุด ${dt(wf.updatedAt ?? doc.current.received_at)}</span></div>
      <div class="acts">${buttons}</div>
      <div class="two-col">
        <div><h4>หมายเหตุการทำงาน</h4><ul class="notes">${notes || `<li class="muted">ยังไม่มีความเห็นในรอบนี้</li>`}</ul></div>
        <div><h4>Outbox (คำขอกลับไปหา OCR service)</h4>${
          outbox.length ? table({ head: ["event", "ชนิด", "รอ rev", "สถานะ", "retry", "error"], rows: outbox }) : `<p class="muted">ไม่มีคำขอค้าง</p>`
        }</div>
      </div>
      <div class="demo-bar"><span class="demo-tag">เดโม</span>${demo.join(" ")}</div>`,
  });
}

function auditCard(doc, ctx) {
  const entries = ctx.store.auditOf(doc.document_id);
  const rows = entries.map(
    (e) => `<tr>
      <td>${dt(e.ts)}</td>
      <td>${esc(e.actor_name)} <span class="muted small">${esc(e.actor_role ?? "")}</span></td>
      <td>${code(e.action)} ${badge(e.kind, ["INGEST_REJECT", "DEDUP"].includes(e.kind) ? "bad" : "muted")}</td>
      <td>${e.from ? `${code(e.from)} → ` : ""}${e.to ? code(e.to) : ""}</td>
      <td class="num">${e.workflow_version ?? "—"}</td>
      <td class="small">${esc(e.note ?? "")}</td>
    </tr>`,
  );
  return card({
    title: "Audit trail ของเอกสารนี้",
    sub: `${entries.length} เหตุการณ์ · append-only ใน localStorage (ของจริงต้องอยู่ฝั่ง server แก้ย้อนหลังไม่ได้)`,
    body: table({ head: ["เวลา", "ผู้ใช้", "action", "สถานะ", "v", "เหตุผล"], rows, empty: "ยังไม่มีเหตุการณ์ — ลองกักงานหรือยืนยันเอกสาร" }),
  });
}
