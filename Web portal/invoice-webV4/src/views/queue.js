/**
 * views/queue.js — คิวงาน + ตัวกรอง
 * ตารางนี้แสดง "ผลตรวจจาก snapshot" + "สถานะงานใน portal" พร้อมกัน แต่ไม่ปนกัน
 */

import { esc, card, table, badge, note } from "../ui/dom.js";
import { statusBadge, wfBadge, money, link, code, dt, pillList } from "../ui/format.js";
import { summarize } from "../domain/exceptions.js";
import { riskLevel, evidenceStatus } from "../domain/guards.js";
import { visibleDocs, isMyTask } from "../domain/access.js";
import { dCmp, dec } from "../domain/money.js";
import { WF } from "../domain/workflow.js";
import { EXCEPTION_CODES_AS_BUILT, USER_TASK_CODES } from "../data/master-data.js";

const STATUS = ["Auto-pass", "Review", "Hold", "Manual Review"];

function select({ name, value, options, label }) {
  return `<label class="filter"><span>${esc(label)}</span>
    <select data-filter="${esc(name)}">
      ${options.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value ?? "") ? "selected" : ""}>${esc(t)}</option>`).join("")}
    </select></label>`;
}

export function render(ctx) {
  const { store, user, filters } = ctx;
  const f = { q: "", status: "", wf: "", company: "", assignee: "", code: "", focus: "", mine: "", sort: "risk", ...filters };

  const scope = visibleDocs(user, store.list());
  const companies = [...new Set(scope.map((d) => d.company))].sort();

  let rows = scope.filter((d) => {
    const snap = d.current;
    if (f.mine === "1" && !isMyTask(user, d)) return false;
    if (f.status && snap.status !== f.status) return false;
    if (f.wf && d.workflow.status !== f.wf) return false;
    if (f.company && d.company !== f.company) return false;
    if (f.assignee && (snap.decision?.assigned_to ?? "none") !== f.assignee) return false;
    if (f.code && !(snap.exceptions ?? []).some((e) => e.code === f.code)) return false;
    if (f.focus) {
      const ev = evidenceStatus(d);
      const hit =
        (f.focus === "schema" && !d.schema[snap.revision]?.ok) ||
        (f.focus === "rules" && (!d.completeness.usable || d.completeness.missing.length)) ||
        (f.focus === "evidence" && ev.state !== "current") ||
        (f.focus === "dup" && (d.duplicates ?? []).length > 0) ||
        (f.focus === "outbox" && (d.outbox ?? []).some((o) => o.status === "PENDING")) ||
        (f.focus === "company" && snap.receipt && snap.receipt.company_mapped === false) ||
        (f.focus === "hand" && d.hand_authored);
      if (!hit) return false;
    }
    if (f.q) {
      const hay = `${d.document_id} ${d.dms_id} ${d.title} ${snap.invoice?.invoice_num ?? ""} ${snap.invoice?.supplier_name ?? ""} ${snap.receipt?.po_number ?? ""} ${summarize(snap.exceptions).codes.join(" ")}`.toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    return true;
  });

  const RISK_RANK = { block: 0, warn: 1, ok: 2 };
  const STS_RANK = { Hold: 0, "Manual Review": 1, Review: 2, "Auto-pass": 3 };
  const rank = (d) =>
    f.sort === "risk"
      ? `${RISK_RANK[riskLevel(d)]}${STS_RANK[d.current.status] ?? 9}`
      : f.sort === "amount"
        ? d.current.invoice?.grand_total ?? "0"
        : f.sort === "updated"
          ? d.workflow.updatedAt ?? "0000"
          : d.document_id;
  rows = rows.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (f.sort === "amount") return dCmp(dec(rb), dec(ra));
    return ra > rb ? 1 : ra < rb ? -1 : 0;
  });

  const body = rows.map((d) => {
    const snap = d.current;
    const sum = summarize(snap.exceptions);
    const ev = evidenceStatus(d);
    const rl = riskLevel(d);
    const dec = snap.decision;
    return `<tr class="row-click" data-open="${esc(d.document_id)}">
      <td>
        <div class="doc-id">${link(d.document_id, d.document_id)} <span class="muted small">${esc(d.dms_id)}</span> ${d.hand_authored ? badge("เขียนมือ", "info") : ""}</div>
        <div class="sub">${esc(d.title)}</div>
      </td>
      <td>${badge(d.company, d.company === "UNMAPPED" ? "bad" : "muted")}<div class="sub muted">${esc(snap.receipt?.org_id ?? "ไม่มี ORG_ID")}</div></td>
      <td>${statusBadge(snap.status)}<div class="sub">${pillList(sum.codes, (c) => (EXCEPTION_CODES_AS_BUILT[c]?.severity === "High" ? "bad" : "warn"))}</div></td>
      <td class="num">${money(snap.invoice?.grand_total)}<div class="sub muted">${esc(snap.invoice?.currency ?? "")}</div></td>
      <td>${wfBadge(d.workflow.status)} <span class="muted small">v${d.workflow.version}</span></td>
      <td>${dec?.assigned_to === "user" ? badge("ผู้ใช้", "warn") : dec?.assigned_to === "accounting" ? badge("บัญชี", "info") : badge("อัตโนมัติ", "ok")}
          ${isMyTask(user, d) ? badge("งานของคุณ", "user") : ""}</td>
      <td class="num">${snap.revision}/${d.revisions.length}${d.pending_snapshot ? badge("มี revision ใหม่", "info") : ""}</td>
      <td>${badge(ev.state === "current" ? "ปัจจุบัน" : ev.state === "stale" ? `เก่า (r${ev.have})` : "ไม่มีไฟล์", ev.state === "current" ? "ok" : ev.state === "stale" ? "bad" : "warn")}</td>
      <td>${rl === "block" ? badge("บล็อก", "bad") : rl === "warn" ? badge("เตือน", "warn") : badge("พร้อมเคลียร์", "ok")}</td>
      <td class="row-act">
        <button class="btn sm" data-act="hold" data-doc="${esc(d.document_id)}" data-v="${d.workflow.version}">On Hold</button>
        <button class="btn sm ghost" data-act="resubmit" data-doc="${esc(d.document_id)}" data-v="${d.workflow.version}">Resubmit</button>
      </td>
    </tr>`;
  });

  const focusNote = {
    schema: "กำลังกรอง: snapshot ที่ไม่ผ่าน receiving contract — Portal แสดงข้อมูลได้ แต่ห้ามกดยืนยัน",
    rules: "กำลังกรอง: ผลตรวจ 9 กฎไม่ครบ — “ไม่มีข้อมูล” ไม่ใช่ “ผ่าน”",
    evidence: "กำลังกรอง: ไฟล์หลักฐานไม่ตรงกับ revision ปัจจุบัน (เก่าหรือไม่มีไฟล์)",
    dup: "กำลังกรอง: เอกสารที่เข้าคู่ซ้ำด้วย supplier_name + invoice_num",
    outbox: "กำลังกรอง: มีคำขอ Resubmit/Rerun ค้างอยู่ใน outbox",
    company: "กำลังกรอง: map บริษัทไม่ได้จาก master (ห้ามตั้งหนี้)",
    hand: "กำลังกรอง: snapshot ที่เขียนมือ ไม่ผ่าน engine — ใช้เดโมเท่านั้น",
  }[f.focus];

  return card({
    title: "คิวงาน",
    sub: `${rows.length} / ${scope.length} เอกสารที่ผู้ใช้คนนี้เห็น · เรียงตาม ${
      { risk: "ความเสี่ยง", amount: "ยอดเงิน", updated: "เวลาแก้ล่าสุด", id: "รหัสเอกสาร" }[f.sort]
    }`,
    actions: `<a class="btn sm ghost" href="#/dashboard">กลับภาพรวม</a>`,
    body: `
      <div class="filters">
        <label class="filter grow"><span>ค้นหา</span>
          <input data-filter="q" value="${esc(f.q)}" placeholder="เลขที่ใบแจ้งหนี้ / ผู้ขาย / PO / เอกสาร / รหัส E"></label>
        ${select({ name: "status", value: f.status, label: "ผลตรวจ (engine)", options: [["", "ทั้งหมด"], ...STATUS.map((s) => [s, s])] })}
        ${select({ name: "wf", value: f.wf, label: "สถานะงาน (portal)", options: [["", "ทั้งหมด"], ...Object.keys(WF).map((w) => [w, WF[w]])] })}
        ${select({ name: "assignee", value: f.assignee, label: "ผู้รับผิดชอบ", options: [["", "ทั้งหมด"], ["user", "ผู้ใช้"], ["accounting", "บัญชี"], ["none", "อัตโนมัติ"]] })}
        ${select({ name: "company", value: f.company, label: "บริษัท", options: [["", "ทั้งหมด"], ...companies.map((c) => [c, c])] })}
        ${select({ name: "code", value: f.code, label: "รหัสข้อยกเว้น", options: [["", "ทั้งหมด"], ...Object.keys(EXCEPTION_CODES_AS_BUILT).map((c) => [c, `${c}${USER_TASK_CODES.includes(c) ? " (ผู้ใช้)" : ""}`])] })}
        ${select({ name: "sort", value: f.sort, label: "เรียง", options: [["risk", "ความเสี่ยงก่อน"], ["amount", "ยอดเงินมากก่อน"], ["updated", "แก้ล่าสุด"], ["id", "รหัสเอกสาร"]] })}
        <label class="filter check"><span>&nbsp;</span><label class="switch"><input type="checkbox" data-filter="mine" value="1" ${f.mine === "1" ? "checked" : ""}><span>งานของฉันเท่านั้น</span></label></label>
        <label class="filter check"><span>&nbsp;</span><label class="switch"><input type="checkbox" data-filter="focus" value="" ${f.focus ? "checked disabled" : ""}><span>โฟกัสจากหน้าภาพรวม ${f.focus ? `(${esc(f.focus)})` : ""}</span></label></label>
        ${f.focus ? `<button class="btn sm warn" data-clear-focus="1">ล้างโฟกัส</button>` : ""}
        <button class="btn sm ghost" data-clear-filters="1">ล้างตัวกรอง</button>
      </div>
      ${focusNote ? note(esc(focusNote), "warn") : ""}
      ${table({
        head: ["เอกสาร", "บริษัท", "ผลตรวจ + ข้อยกเว้น", "ยอดรวม", "สถานะงาน", "ผู้รับผิดชอบ", "rev", "หลักฐาน", "ความพร้อม", "ทำทันที"],
        rows: body,
        empty: "ไม่พบเอกสารที่ตรงกับเงื่อนไข — ลองล้างตัวกรอง",
      })}`,
  });
}
