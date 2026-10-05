/**
 * views/detail.js — หน้าเอกสาร 1 ฉบับ
 *
 * หลักการ: ทุกตัวเลขบนหน้านี้ lift มาจาก snapshot ที่เลือกดู เท่านั้น
 * ส่วน "สถานะงาน/หมายเหตุ/outbox" เป็นของ portal (overlay) — แสดงแยกส่วนชัดเจน
 */

import { esc, card, table, badge, kv, note, jsonBlock } from "../ui/dom.js";
import { statusBadge, wfBadge, sevBadge, money, qty, code, dt, ago, bool, pillList } from "../ui/format.js";
import { summarize, codeMeta } from "../domain/exceptions.js";
import { guards, evidenceStatus, blockingFor } from "../domain/guards.js";
import { actionMatrix, userById } from "../domain/access.js";
import { canTransition } from "../domain/workflow.js";
import { ruleMeta, VERDICT, MATCH_LEVEL, STEP_LABEL, ALL_RULE_IDS } from "../domain/ruleCatalog.js";
import { dec, dAdd, dMul, dSub, dDiff, dCmp, dWithin, fmtMoney, fmtQty } from "../domain/money.js";

/** dec แบบ null-safe (ค่าว่าง/null = 0) — ใช้เฉพาะการสรุปยอดบนหน้าจอ */
const D = (x) => dec(x ?? "0");
const D0 = dec("0");
import { CONTRACT_VERSION } from "../domain/schema.js";
import { forDocument } from "../domain/audit.js";

/* ------------------------------------------------------------------ *
 * ส่วนหัว
 * ------------------------------------------------------------------ */
function header(doc, snap, viewing) {
  const sum = summarize(snap.exceptions);
  const b = doc.schema[snap.revision];
  return `<div class="doc-head">
    <div>
      <div class="crumbs"><a class="link" href="#/queue">คิวงาน</a> / <span>${esc(doc.document_id)}</span></div>
      <h1>${esc(doc.document_id)} ${statusBadge(snap.status)} ${wfBadge(doc.workflow.status)}
        ${badge(doc.company, doc.company === "UNMAPPED" ? "bad" : "muted")}
        ${badge(`rev ${snap.revision}/${doc.revisions.length}`, "muted")}
        ${b?.ok ? badge("contract ✓", "ok") : badge(`contract ✗ (${b?.errors.length ?? 0})`, "bad")}</h1>
      <p class="doc-title">${esc(doc.title)}</p>
      <p class="doc-meta">DMS ${esc(doc.dms_id)} · แนบโดย ${esc(doc.actor.uploadedBy ?? "—")} · ผู้รับของ ${esc(snap.receipt?.receiver ?? "ไม่มีข้อมูล")}
        · รับข้อมูล ${dt(snap.received_at)} (${esc(ago(snap.received_at))}) · source ${code(snap.source_system)}</p>
    </div>
    <div class="doc-head-right">
      ${revTabs(doc, snap, viewing)}
    </div>
  </div>`;
}

function revTabs(doc, snap, viewing) {
  const tabs = doc.revisions
    .map((s) => {
      const ok = doc.schema[s.revision]?.ok;
      const active = s.revision === snap.revision;
      return `<a class="rev-tab ${active ? "active" : ""} ${ok ? "" : "invalid"}" href="#/doc/${esc(doc.document_id)}?r=${s.revision}">
        r${s.revision} ${statusBadge(s.status)} ${ok ? "" : "⚠"}</a>`;
    })
    .join("");
  return `<div class="rev-tabs">${tabs}${viewing ? "" : `<div class="sub warn-text">กำลังดู revision เก่า (r${snap.revision}) — การกระทำทั้งหมดใช้ข้อมูลของ r${doc.current.revision}</div>`}</div>`;
}

/* ------------------------------------------------------------------ *
 * alert stack
 * ------------------------------------------------------------------ */
function alerts(doc, snap) {
  const gs = guards(doc);
  if (!gs.length) return note("ไม่มีข้อกังวลด้านหลักฐาน/ความเสี่ยง — แต่ระบบยังต้องมีการอนุมัติจากคนก่อนตั้งหนี้", "ok");
  const order = { block: 0, warn: 1, info: 2 };
  return `<div class="alerts">${gs
    .sort((a, b) => order[a.level] - order[b.level])
    .map(
      (g) => `<div class="alert ${g.level}">
      <span class="alert-k">${g.level === "block" ? "ห้ามทำ" : g.level === "warn" ? "ต้องระวัง" : "แจ้งให้ทราบ"}</span>
      <div><strong>${esc(g.title)}</strong><p>${esc(g.detail)}</p>
      ${g.blocks?.length ? `<p class="muted small">บล็อก action: ${g.blocks.map((x) => code(x)).join(" ")}</p>` : ""}</div>
    </div>`,
    )
    .join("")}</div>`;
}

/* ------------------------------------------------------------------ *
 * money
 * ------------------------------------------------------------------ */
function moneyCard(doc, snap) {
  const inv = snap.invoice ?? {};
  const rcv = snap.receipt ?? {};
  const lines = snap.lines ?? [];
  const sumLines = lines.reduce((acc, l) => dAdd(acc, D(l.amount)), D0);
  const lineMathDiff = lines
    .map((l) => dDiff(dMul(D(l.qty), D(l.unit_price)), D(l.amount)))
    .reduce((a, b) => (dCmp(a, b) >= 0 ? a : b), D0);
  const expectVat = dMul(D(inv.sub_total), D("0.07"));
  const vatDiff = dSub(D(inv.vat), expectVat);
  const grandCheck = dSub(D(inv.grand_total), dAdd(D(inv.sub_total), D(inv.vat)));
  const rcvTotal = (rcv.rows ?? []).reduce((acc, r) => dAdd(acc, dMul(D(r.QUANTITY_RECEIVED), D(r.UNIT_PRICE))), D0);
  const rcvDiff = dSub(D(inv.sub_total), rcvTotal);

  const row = (label, value, noteTxt, flag) =>
    `<tr><td>${esc(label)}</td><td class="num">${value}</td><td class="muted small">${esc(noteTxt ?? "")}</td><td>${flag ?? ""}</td></tr>`;

  const okFlag = (diff, tol) =>
    dWithin(diff, dec(tol), "0") ? badge("ในกรอบ", "ok") : badge(`นอกกรอบ ${esc(tol)}`, "bad");

  return card({
    title: "ยอดเงิน (decimal string — ไม่ใช้ float)",
    sub: `tolerance as-built: บรรทัด/รวมเอกสาร/grand ±0.50 · VAT ±1.00 · ยอดรับจริง ±0.50 · ราคา ≤1% และ ≤200`,
    body: `<div class="two-col">
      <table class="mini"><thead><tr><th>รายการ</th><th class="num">มูลค่า</th><th></th><th></th></tr></thead><tbody>
        ${row("Σ มูลค่าบรรทัด", money(inv.sub_total), `คำนวณจาก ${lines.length} บรรทัด = ${fmtMoney(sumLines)}`, dCmp(sumLines, D(inv.sub_total)) === 0 ? badge("ตรง", "ok") : badge("ต่าง", "warn"))}
        ${row("ผลต่างสูงสุดรายบรรทัด (qty×price − amount)", `<span class="num">${esc(fmtMoney(lineMathDiff))}</span>`, "กรอบ ±0.50 (V-02)", okFlag(lineMathDiff, "0.50"))}
        ${row("VAT ที่แสดง", money(inv.vat), `คาดหวัง 7% = ${fmtMoney(expectVat)} · ต่าง ${fmtMoney(vatDiff)}`, okFlag(vatDiff, "1.00"))}
        ${row("grand − (subtotal+VAT)", `<span class="num">${esc(fmtMoney(grandCheck))}</span>`, "กรอบ ±0.50 (V-03)", okFlag(grandCheck, "0.50"))}
      </tbody></table>
      <table class="mini"><thead><tr><th>ฝั่งรับของ (Oracle SQL)</th><th class="num">มูลค่า</th><th></th><th></th></tr></thead><tbody>
        ${row("แถวใบรับทั้งหมด / ที่จำนวนรับ > 0", `<span class="num">${rcv.row_count ?? 0} / ${rcv.active_row_count ?? 0}</span>`, `ใบรับ ${esc([...new Set((rcv.rows ?? []).map((r) => r.RECEIPT_NUM))].join(", ")) || "—"}`)}
        ${row("Σ (จำนวนรับ × ราคาใบรับ)", `<span class="num">${esc(fmtMoney(rcvTotal))}</span>`, "V-09 ใช้ค่านี้เทียบ subtotal")}
        ${row("subtotal − ยอดรับจริง", `<span class="num">${esc(fmtMoney(rcvDiff))}</span>`, "กรอบ ±0.50 (V-09)", okFlag(rcvDiff, "0.50"))}
        ${row("สกุลเงิน", `<span class="num">${esc(inv.currency ?? "—")}</span>`, inv.currency && inv.currency !== "THB" ? "engine ไม่ได้แปลงสกุลเงิน" : "THB")}
      </tbody></table>
    </div>
    ${rcv.bypassed ? note(`Bypass: ไม่เรียก Oracle SQL เพราะ ${esc(rcv.halted_by ?? "V-02 พบลูกค้า E28")} — กฎขั้น 2–3 จึงไม่ได้ตรวจ`, "bad") : ""}`,
  });
}

/* ------------------------------------------------------------------ *
 * rules
 * ------------------------------------------------------------------ */
function rulesCard(snap) {
  const rules = snap.rules ?? [];
  const have = new Set(rules.map((r) => r.rule_id));
  const missing = ALL_RULE_IDS.filter((id) => !have.has(id));
  const order = { 1: [], 2: [], 3: [] };
  for (const r of rules) (order[ruleMeta(r.rule_id).step] ?? order[3]).push(r);

  const rowsFor = (list) =>
    list
      .sort((a, b) => a.rule_id.localeCompare(b.rule_id))
      .map((r) => {
        const meta = ruleMeta(r.rule_id);
        const v = VERDICT[r.result] ?? { label: r.result, tone: "muted" };
        return `<tr class="${r.result === "FAIL" ? "row-fail" : ""}">
          <td>${code(r.rule_id)}<div class="sub muted">ขั้น ${meta.step}</div></td>
          <td><strong>${esc(meta.name)}</strong><div class="sub">${esc(meta.checks)}</div></td>
          <td>${badge(v.label, v.tone)}${r.halted_by ? badge(`หยุดโดย ${r.halted_by}`, "muted") : ""}</td>
          <td>${r.code ? code(r.code, "user") : `<span class="muted">—</span>`}${r.severity ? ` ${sevBadge(r.severity)}` : ""}</td>
          <td class="small">${esc(r.details || "—")}${r.page != null ? ` <span class="muted">(หน้า ${r.page})</span>` : ""}</td>
        </tr>`;
      })
      .join("");

  const stepBlocks = [1, 2, 3]
    .map((s) => (order[s].length ? `<h4 class="step">${esc(STEP_LABEL[s])}</h4>${table({ head: ["กฎ", "สิ่งที่ตรวจ", "ผล", "รหัส", "รายละเอียด"], rows: rowsFor(order[s]) })}` : ""))
    .join("");

  return card({
    title: `ผลตรวจ 9 กฎ (มาตรฐาน 6.2) — ${rules.length ? "ได้รับจาก snapshot" : "ไม่มีข้อมูล"}`,
    sub: `engine ${esc(snap.engine_version)} · catalog ${esc(snap.rule_catalog_version)} · Portal แสดงผลเท่านั้น ไม่ตรวจซ้ำ`,
    body: `${rules.length ? stepBlocks : note("snapshot นี้ไม่มีรายการใน rules — แสดงว่าต้นทางไม่ได้ส่งผลตรวจมา (ไม่ใช่ “ผ่านทุกกฎ”)", "bad")}
      ${missing.length ? note(`กฎที่หายไปจาก snapshot: ${missing.map((m) => code(m)).join(" ")} — <strong>ไม่มีข้อมูล ≠ ผ่าน</strong>`, "warn") : ""}
      <details class="gap"><summary>พฤติกรรม as-built ที่ต่างจากเอกสารมาตรฐาน (คลิกดู)</summary>
        <ul>${ALL_RULE_IDS.map((id) => `<li>${code(id)} — ${esc(ruleMeta(id).asBuilt)}</li>`).join("")}</ul></details>`,
  });
}

/* ------------------------------------------------------------------ *
 * lines + matches
 * ------------------------------------------------------------------ */
function linesCard(snap) {
  const lines = snap.lines ?? [];
  const matches = snap.matches ?? [];
  const rows = lines.map((l) => {
    const m = matches.find((x) => x.line_no === l.line_no) ?? null;
    const lvl = m?.match_level ? MATCH_LEVEL[m.match_level] : null;
    const calc = dMul(D(l.qty), D(l.unit_price));
    const diff = dDiff(calc, D(l.amount));
    const flags = [
      m?.qty_flag ? badge(m.qty_flag, "bad") : "",
      m?.price_flag ? badge(m.price_flag, m.price_flag === "E29" ? "muted" : "bad") : "",
      m?.uom_flag ? badge(m.uom_flag, "warn") : "",
    ].join(" ");
    return `<tr>
      <td class="num">${l.line_no}</td>
      <td><strong>${esc(l.description)}</strong>${l.item_code ? `<div class="sub">${code(l.item_code)}</div>` : ""}</td>
      <td class="num">${qty(l.qty)}<div class="sub muted">${esc(l.uom ?? "")}</div></td>
      <td class="num">${money(l.unit_price)}</td>
      <td class="num">${money(l.amount)}${dCmp(diff, D0) ? `<div class="sub warn-text">คำนวณได้ ${esc(fmtMoney(calc))}</div>` : ""}</td>
      <td>${lvl ? badge(lvl.label, lvl.tone) : badge("ไม่มีการจับคู่", "muted")}${
        m?.match_note ? `<div class="sub muted">${esc(m.match_note)}</div>` : ""
      }${m?.receipt_num ? `<div class="sub">ใบรับ ${esc(m.receipt_num)} บรรทัด ${esc(m.receipt_line ?? "—")}</div>` : ""}</td>
      <td class="num">${m ? qty(m.receipt_qty) : `<span class="muted">—</span>`}<div class="sub muted">${esc(m?.receipt_uom ?? "")}</div></td>
      <td class="num">${m ? money(m.receipt_price) : `<span class="muted">—</span>`}</td>
      <td>${flags || `<span class="muted">—</span>`}</td>
    </tr>`;
  });

  const levels = [...new Set(matches.map((m) => m.match_level).filter(Boolean))];
  return card({
    title: `การจับคู่รายบรรทัด (${lines.length} บรรทัด · ${matches.length} คู่)`,
    sub: "bilinear 1-1: M1 item code → M2 ชื่อตรงทั้งข้อความ → M3 token → M4 fallback",
    body: table({
      head: ["#", "คำอธิบาย", "จำนวน", "ราคา/หน่วย", "มูลค่า", "วิธีจับคู่", "รับจริง", "ราคาใบรับ", "ธง"],
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
    title: "แถวใบรับจาก Oracle (ใน snapshot)",
    sub: rcv.sql_id
      ? `SQL ${esc(rcv.sql_id)} · PO ${esc(rcv.po_number ?? rcv.rows?.[0]?.PO_NUMBER ?? "—")} · ORG_ID ${rcv.org_id ?? "—"} (${esc(rcv.org_name ?? "ไม่ทราบบริษัท")})`
      : "ไม่มีข้อมูลใบรับ",
    body:
      table({
        head: ["PO", "ใบรับ", "บรรทัด", "รายการ", "จำนวนรับ", "ราคา", "มูลค่า", "ORG"],
        rows,
        empty: "ไม่มีแถวใบรับ (V-04 = E17)",
      }) +
      kv(
        [
          ["นิติบุคคล", `${esc(rcv.company ?? "—")} · ${esc(rcv.company_label ?? "")} ${rcv.company_mapped === false ? badge("map ไม่ได้", "bad") : ""}`],
          ["เหตุผล mapping", esc(rcv.company_reason ?? "map จาก ORG_ID/Tax ID ปกติ")],
          ["มูลค่ารวมใบรับ", money(rcv.total_value)],
          ["ผู้รับของ", esc(rcv.receiver ?? "ไม่มีข้อมูล")],
        ],
        2,
      ),
  });
}

/* ------------------------------------------------------------------ *
 * exceptions
 * ------------------------------------------------------------------ */
function exceptionsCard(snap) {
  const sum = summarize(snap.exceptions);
  if (!sum.list.length)
    return card({
      title: "ข้อยกเว้น",
      body: note("ไม่มีข้อยกเว้นทุกกฎ — ผลคือ <strong>Auto-pass</strong> ซึ่งยังต้องมีการอนุมัติจากคน 1 ครั้งก่อนตั้งหนี้", "ok"),
    });
  const rows = sum.list.map((e) => {
    const meta = codeMeta(e.code);
    return `<tr>
      <td>${code(e.code, meta.userTask ? "user" : "acc")}<div class="sub muted">${esc(e.rule_id ?? "")}</div></td>
      <td>${sevBadge(e.severity)}</td>
      <td class="small">${esc(e.message ?? meta.label)}</td>
      <td>${meta.userTask ? badge("งานของผู้ใช้", "user") : badge("ฝ่ายบัญชี", "info")}<div class="sub">${esc(meta.next)}</div></td>
      <td class="num">${e.page != null ? e.page : "—"}</td>
    </tr>`;
  });
  return card({
    title: `ข้อยกเว้น ${sum.list.length} รายการ`,
    sub: `High ${sum.counts.High ?? 0} · Medium ${sum.counts.Medium ?? 0} · Low ${sum.counts.Low ?? 0} · เจ้าของงาน: ผู้ใช้ ${sum.userCodes.join(", ") || "—"} · บัญชี ${sum.accountCodes.join(", ") || "—"}`,
    body: table({ head: ["รหัส", "Severity", "สิ่งที่พบ", "ต้องทำอะไรต่อ", "หน้า"], rows }),
  });
}

/* ------------------------------------------------------------------ *
 * workflow + actions
 * ------------------------------------------------------------------ */
function workflowCard(store, doc, user) {
  const wf = doc.workflow;
  const matrix = actionMatrix(user, doc);
  const buttons = matrix
    .map((a) => {
      const wfCheck = canTransition(wf.status, a.action);
      const blocked = blockingFor(doc, a.action);
      const reasons = [...a.reasons, ...wfCheck.reasons, ...blocked.map((g) => `${g.title} — ${g.detail}`)];
      const ok = reasons.length === 0;
      return `<div class="act">
        <button class="btn ${a.action === "confirm" ? "primary" : a.action === "reject" || a.action === "post" ? "danger" : ""} ${ok ? "" : "is-disabled"}"
          ${ok ? "" : "aria-disabled=true"} data-act="${esc(a.action)}" data-doc="${esc(doc.document_id)}" data-v="${wf.version}">${esc(a.label)}</button>
        ${ok ? "" : `<p class="why">${reasons.map((r) => esc(r)).join(" · ")}</p>`}
      </div>`;
    })
    .join("");

  const notes = (wf.notes ?? [])
    .slice(-6)
    .reverse()
    .map(
      (n) => `<li><strong>${esc(n.action)}</strong> โดย ${esc(userById(n.by)?.name ?? n.by ?? "system")} · ${dt(n.ts)}${n.text ? `<div class="sub">${esc(n.text)}</div>` : ""}</li>`,
    )
    .join("");

  const outbox = (doc.outbox ?? []).map(
    (o) => `<tr><td>${code(o.event_id)}</td><td>${esc(o.event_type)}</td><td class="num">${o.waiting_revision}</td>
      <td>${badge(o.status, o.status === "DELIVERED" ? "ok" : o.status === "PENDING" ? "warn" : "bad")}<div class="sub">${esc(ago(o.queued_at))}</div></td>
      <td class="num">${o.attempts}/${o.max_attempts}</td><td class="small">${esc(o.last_error ?? "—")}</td></tr>`,
  );

  const demo = [];
  if (doc.pending_snapshot)
    demo.push(
      `<button class="btn sm" data-demo="deliver" data-doc="${esc(doc.document_id)}">จำลอง: รับ revision r${doc.pending_snapshot.revision} จาก producer</button>`,
    );
  const ev = evidenceStatus(doc);
  if (ev.state !== "current")
    demo.push(`<button class="btn sm" data-demo="pdf" data-doc="${esc(doc.document_id)}">จำลอง: แนบ PDF ของ revision ปัจจุบัน</button>`);
  demo.push(`<button class="btn sm ghost" data-demo="json" data-doc="${esc(doc.document_id)}">ทดสอบ ingestion ด้วย JSON</button>`);

  return card({
    title: "งานของ portal (สถานะ + การกระทำ)",
    sub: `เวอร์ชันงาน v${wf.version} · ตรวจ optimistic version · ลำดับชั้นสิทธิ์: access → state → หลักฐาน/ความเสี่ยง`,
    body: `<div class="wf-top">${wfBadge(wf.status)} ${
      wf.heldBy ? badge(`กักโดย ${esc(userById(wf.heldBy)?.name ?? wf.heldBy)}`, "bad") : ""
    }${wf.decidedBy ? badge(`ตัดสินโดย ${esc(userById(wf.decidedBy)?.name ?? wf.decidedBy)}`, "ok") : ""}
      <span class="muted small">อัปเดตล่าสุด ${dt(wf.updatedAt ?? snapNote(doc))}</span></div>
      <div class="acts">${buttons}</div>
      ${
        doc.current.status === "Auto-pass" && wf.status === "PENDING_REVIEW"
          ? note("นโยบาย: Auto-pass <strong>ยังไม่ตั้งหนี้เอง</strong> — ต้องมีผู้อนุมัติ (APR) กดยืนยัน 1 ครั้ง และผู้อนุมัติต้องไม่ใช่คนแนบเอกสาร", "info")
          : ""
      }
      <div class="two-col">
        <div><h4>หมายเหตุการทำงาน</h4><ul class="notes">${notes || `<li class="muted">ยังไม่มีการทำงานในรอบนี้</li>`}</ul></div>
        <div><h4>Outbox (คำขอถึง OCR service)</h4>${
          outbox.length ? table({ head: ["event", "ชนิด", "รอ rev", "สถานะ", "retry", "error"], rows: outbox }) : `<p class="muted">ไม่มีคำขอค้าง</p>`
        }</div>
      </div>
      <div class="demo-bar"><span class="demo-tag">เดโม</span>${demo.join(" ")}</div>`,
  });
}

const snapNote = (doc) => doc.current?.received_at ?? null;

/* ------------------------------------------------------------------ *
 * evidence
 * ------------------------------------------------------------------ */
function evidenceCard(doc) {
  const ev = evidenceStatus(doc);
  const tone = ev.state === "current" ? "ok" : ev.state === "stale" ? "bad" : "warn";
  return card({
    title: "หลักฐาน (PDF)",
    tone: "",
    body: `<div class="pdf ${tone}">
      <div class="pdf-box">${ev.state === "current" ? "📄" : "⚠️"}<span>${esc(ev.file_name ?? "ไม่มีไฟล์")}</span></div>
      ${kv(
        [
          ["สถานะ", badge(ev.state === "current" ? "ตรงกับ revision ปัจจุบัน" : ev.state === "stale" ? "เป็นของ revision เก่า" : "ไม่มีไฟล์", tone)],
          ["revision ที่ต้องเห็น", `r${ev.rev}`],
          ["revision ของไฟล์", ev.have ? `r${ev.have}` : "—"],
          ["จำนวนหน้า", ev.pages ?? doc.current.document?.pages ?? "—"],
          ["เวลาแนบ", dt(ev.uploaded_at)],
          ["ที่มา", doc.pdf_synth ? badge("metadata สังเคราะห์ (เดโม)", "info") : badge("กำหนดใน fixture", "muted")],
        ],
        2,
      )}
    </div>
    ${note("โฟลเดอร์นี้<strong>ไม่เก็บไฟล์ PDF จริง</strong> (ใน repo มี PDF ได้เฉพาะ .png) — portal แสดงเฉพาะ metadata และการตรวจว่า “หลักฐานตรงกับ revision หรือไม่”", "muted")}`,
  });
}

function documentCard(snap) {
  const d = snap.document ?? {};
  return card({
    title: "ข้อมูลที่ OCR อ่านได้จากเอกสาร",
    sub: `มาตรฐาน ${esc(snap.standard_version ?? "—")} · event ${code(snap.event_id)}`,
    body: kv(
      [
        ["เลขที่ใบแจ้งหนี้", code(snap.invoice?.invoice_num ?? "")],
        ["วันที่เอกสาร", esc(snap.invoice?.invoice_date ?? "—")],
        ["ผู้ขาย", `${esc(snap.invoice?.supplier_name ?? "—")} · Tax ID ${esc(snap.invoice?.supplier_tax_id || "ว่าง")}`],
        ["ลูกค้า", `${esc(snap.invoice?.customer_name ?? "—")} · Tax ID ${esc(snap.invoice?.customer_tax_id || "ว่าง")}`],
        ["ที่อยู่ลูกค้า", esc(snap.invoice?.customer_address ?? "—")],
        ["เลข PO", code(snap.invoice?.po_number ?? "—")],
        ["Release", esc(snap.invoice?.release_num ?? "—")],
        ["จำนวนหน้า / อ่านครบ", `${d.pages ?? "—"} / ${bool(d.pages_complete)}`],
        ["ชนิดเอกสาร", esc(d.po_type ?? "—")],
        ["แนบโดย (ในเอกสาร)", esc(d.uploaded_by ?? "—")],
        ["ลายเซ็นผู้ส่งของ", d.pages_complete === false ? `<span class="muted">ข้าม (V-01)</span>` : bool(snap.signatures?.supplier_or_deliverer?.present, `พบหน้า ${snap.signatures?.supplier_or_deliverer?.page ?? ""}`, "ไม่พบ")],
        ["ลายเซ็นผู้รับของ", d.pages_complete === false ? `<span class="muted">ข้าม (V-01)</span>` : bool(snap.signatures?.receiver?.present, `พบหน้า ${snap.signatures?.receiver?.page ?? ""}`, "ไม่พบ")],
      ],
      2,
    ),
  });
}

/* ------------------------------------------------------------------ *
 * contract / snapshot
 * ------------------------------------------------------------------ */
function snapshotCard(doc, snap) {
  const revRows = doc.revisions.map((s) => {
    const v = doc.schema[s.revision];
    return `<tr class="${s.revision === snap.revision ? "row-active" : ""}">
      <td><a class="link" href="#/doc/${esc(doc.document_id)}?r=${s.revision}">r${s.revision}</a></td>
      <td>${dt(s.received_at)}</td>
      <td>${esc(s.source_system)}</td>
      <td>${statusBadge(s.status)}</td>
      <td>${pillList((s.exceptions ?? []).map((e) => e.code))}</td>
      <td>${v?.ok ? badge("ผ่าน contract", "ok") : badge(`ไม่ผ่าน (${v.errors.length})`, "bad")}${
        v && !v.ok ? `<div class="sub err-list">${v.errors.slice(0, 3).map((e) => esc(`${e.path} ${e.message}`)).join("<br>")}</div>` : ""
      }${v?.warnings?.length ? `<div class="sub muted">เตือน ${v.warnings.length} ข้อ</div>` : ""}</td>
      <td>${(s.rules ?? []).length ? `${(s.rules ?? []).length}/9` : badge("ไม่มีผลตรวจ", "bad")}</td>
    </tr>`;
  });

  const v = doc.schema[snap.revision];
  return card({
    title: "receiving contract v" + CONTRACT_VERSION + " · snapshot ที่ขอบเขต",
    sub: "ทุก revision ถูกตรวจ schema ก่อนเข้า store — ที่ไม่ผ่านจะถูกแสดงแต่ห้ามใช้ตัดสินใจ",
    body: table({
      head: ["rev", "รับข้อมูล", "source", "ผลตรวจ", "ข้อยกเว้น", "contract", "กฎ"],
      rows: revRows,
    }) +
      (v?.ok
        ? note(`ผ่าน contract: error 0 · warning ${v.warnings.length}${v.warnings.length ? ` (${v.warnings.slice(0, 2).map((w) => w.path).join(", ")}…)` : ""}`, "ok")
        : note(`ไม่ผ่าน contract ${v.errors.length} ข้อ — เอกสารนี้ถูกบล็อกการยืนยัน/ตั้งหนี้`, "bad")) +
      `<div class="sub muted mb">provenance: ${esc(snap.provenance?.kind ?? "ไม่ระบุ")} · สร้างโดย ${esc(snap.provenance?.generated_by ?? "—")} · engine ${esc(
        snap.provenance?.engine_version ?? snap.engine_version ?? "—",
      )}${snap.provenance?.hand_authored ? " · " + esc(snap.provenance?.reason ?? "") : ""}</div>` +
      jsonBlock(snap, `ดู snapshot JSON ดิบ (revision ${snap.revision})`),
  });
}

function auditCard(doc) {
  const entries = forDocument(store0.auditAll(), doc.document_id);
  const rows = entries.map(
    (e) => `<tr>
      <td>${dt(e.ts)}</td>
      <td>${esc(e.actor_name)} <span class="muted small">${esc(e.actor_role)}</span></td>
      <td>${code(e.action)} ${badge(e.kind, e.kind === "INGEST_REJECT" || e.kind === "DEDUP" ? "bad" : "muted")}</td>
      <td>${e.from ? `${code(e.from)} → ` : ""}${e.to ? code(e.to) : ""}</td>
      <td class="num">${e.workflow_version ?? "—"}</td>
      <td class="small">${esc(e.note ?? "")}</td>
    </tr>`,
  );
  return card({
    title: "Audit trail ของเอกสารนี้",
    sub: `${entries.length} เหตุการณ์ (append-only ใน localStorage · ของจริงต้องอยู่ฝั่ง server)`,
    body: table({ head: ["เวลา", "ผู้ใช้", "action", "สถานะ", "v", "เหตุผล"], rows, empty: "ยังไม่มีเหตุการณ์ — ลองกดยืนยันหรือกักงาน" }),
  });
}

/* store reference สำหรับ auditCard (ใส่ผ่าน setStoreRef เพื่อไม่ให้ view import store ตรง ๆ) */
let store0 = { auditAll: () => [] };
export function setStoreRef(s) {
  store0 = { auditAll: () => s.audit() };
}

/* ------------------------------------------------------------------ *
 * render
 * ------------------------------------------------------------------ */
export function render(ctx) {
  const { store, user, route } = ctx;
  setStoreRef(store);
  const doc = store.get(route.id);
  if (!doc)
    return card({
      title: "ไม่พบเอกสาร",
      body: note(`ไม่มีเอกสารรหัส <strong>${esc(route.id)}</strong> ในคลัง — <a class="link" href="#/queue">กลับคิวงาน</a>`, "bad"),
    });
  const want = Number(route.params.r ?? doc.current.revision);
  const snap = doc.revisions.find((s) => s.revision === want) ?? doc.current;

  return `${header(doc, snap, snap.revision === doc.current.revision)}
    ${alerts(doc, snap)}
    <div class="grid-main">
      <div class="col">${moneyCard(doc, snap)}${rulesCard(snap)}${linesCard(snap)}</div>
      <aside class="col side">${workflowCard(store, doc, user)}${evidenceCard(doc)}${exceptionsCard(snap)}${documentCard(snap)}</aside>
    </div>
    <div class="grid-2">${receiptCard(snap)}${snapshotCard(doc, snap)}</div>
    ${auditCard(doc)}`;
}
