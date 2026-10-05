/**
 * views/work.js — หน้า "งาน": KPI + ตัวกรอง + ตารางเอกสาร (หน้าเดียวจบ)
 *
 * เทียบกับ v4: ตัดคอลัมน์ที่ข้อมูลซ้ำกันออก (ผลตรวจโผล่ 2 คอลัมน์) และย้ายปุ่ม action
 * ออกจากทุกแถว → ตารางอ่านจากซ้ายไปขวาได้ในครั้งเดียว ปุ่มไปอยู่ในหน้ารายละเอียดเท่านั้น
 *
 * ทุก cell อ่านจาก `doc.current` (snapshot ของ engine) + `doc.workflow` (สถานะของ portal)
 * สองก้อนนี้ไม่ปนกัน — คอลัมน์ "ผลตรวจ" เป็นของ engine, คอลัมน์ "สถานะงาน" เป็นของ portal
 */

import { esc, card, table, badge, note } from "../ui/dom.js";
import { statusBadge, wfBadge, money, code } from "../ui/format.js";
import { pageHead, kpiStrip, filterBar, selectBox, searchBox, checkBox, chips, sourceTag, emptyState } from "../ui/parts.js";
import { summarize, codeMeta } from "../domain/exceptions.js";
import { riskLevel, evidenceStatus } from "../domain/guards.js";
import { visibleDocs, isMyTask } from "../domain/access.js";
import { WF } from "../domain/workflow.js";
import { EXCEPTION_CODES_AS_BUILT, USER_TASK_CODES } from "../data/master-data.js";

export const DEFAULTS = { q: "", status: "", wf: "", assignee: "", company: "", code: "", sort: "risk", mine: "" };
const STATUSES = ["Hold", "Manual Review", "Review", "Auto-pass"];

export function filterFn(f) {
  return { ...DEFAULTS, ...f };
}

export function render(ctx) {
  const f = filterFn(ctx.filters);
  const scope = visibleDocs(ctx.user, ctx.store.list());
  const rows = pick(scope, f, ctx.user);
  const st = ctx.store.stats();

  const counts = {
    all: scope.length,
    mine: scope.filter((d) => isMyTask(ctx.user, d)).length,
    blocked: scope.filter((d) => riskLevel(d) === "block").length,
    review: scope.filter((d) => d.current.status === "Review" || d.current.status === "Manual Review").length,
    hold: scope.filter((d) => d.current.status === "Hold").length,
    pass: scope.filter((d) => d.current.status === "Auto-pass").length,
  };

  const html = [
    pageHead({
      title: "งาน",
      sub: "snapshot จาก matching engine เท่านั้น — portal แสดงผลและจัดการสถานะงาน ไม่คำนวณผลการจับคู่ใหม่",
      actions: `<span class="mono muted small">contract ${esc(ctx.meta.contract_version)} · engine ${esc(shortEngine(ctx.meta.engine_version))}</span>
        <span class="demo-tools">
          <button class="btn sm ghost" data-demo="deliver" title="เพิ่ม revision ใหม่เข้าเอกสารที่มี pending_snapshot (ทดสอบว่า portal ไม่ทับผล while on hold)">เดโม: รับ revision ใหม่</button>
          <button class="btn sm ghost" data-demo="pdf" title="จำลองการแนบ PDF ของ revision ปัจจุบัน (ต้นทางจริงยังไม่มี)">เดโม: แนบ PDF</button>
        </span>`,
    }),
    kpiStrip([
      { key: "clear", label: "งานที่ฉันเห็น", value: counts.all, hint: `${st.snapshots} snapshot ทั้งหมด`, active: isDefault(f) },
      { key: "mine", label: "ถึงคิวฉัน", value: counts.mine, tone: "teal", hint: "engine มอบงานให้ user", active: f.mine === "1" },
      { key: "status:Hold", label: "Hold", value: counts.hold, tone: "bad", hint: "ต้องเคลียร์ก่อนส่งต่อ", active: f.status === "Hold" },
      { key: "status:Review", label: "Review", value: counts.review, tone: "warn", hint: "รวม Manual Review", active: f.status === "Review" },
      { key: "focus:evidence", label: "หลักฐานไม่พร้อม", value: scope.filter((d) => evidenceStatus(d).state !== "current").length, tone: "info", hint: "ไฟล์เก่า/ไม่มีไฟล์", active: f.sort === "risk" && false },
      { key: "status:Auto-pass", label: "Auto-pass", value: counts.pass, tone: "ok", hint: "ยังต้องอนุมัติ 1 ครั้ง", active: f.status === "Auto-pass" },
    ]),
    filterBar([
      searchBox("q", f.q, "เลขที่ใบกำกับภาษี / ผู้ขาย / PO / ORG_ID / รหัส E"),
      selectBox("status", f.status, "ผลตรวจ (engine)", [["", "ทั้งหมด"], ...STATUSES.map((s) => [s, s])]),
      selectBox("wf", f.wf, "สถานะงาน (portal)", [["", "ทั้งหมด"], ...Object.keys(WF).map((w) => [w, WF[w]])]),
      selectBox("assignee", f.assignee, "งานถัดไป", [["", "ทั้งหมด"], ["user", "ผู้ใช้ (Receiver)"], ["accounting", "ฝ่ายบัญชี"], ["system", "อัตโนมัติ"]]),
      selectBox("company", f.company, "บริษัท", [["", "ทั้งหมด"], ...companyList(scope)]),
      selectBox("code", f.code, "รหัสข้อยกเว้น", [["", "ทั้งหมด"], ...Object.keys(EXCEPTION_CODES_AS_BUILT).map((c) => [c, `${c} ${USER_TASK_CODES.includes(c) ? "· user" : "· บัญชี"}`])]),
      checkBox("mine", "1", f.mine === "1", "ถึงคิวฉันเท่านั้น"),
      `<label class="fld"><span>เรียง</span><select data-filter="sort">
        ${[["risk", "ความเสี่ยงก่อน"], ["amount", "ยอดมากก่อน"], ["updated", "ขยับล่าสุด"], ["id", "รหัสเอกสาร"]]
          .map(([v, t]) => `<option value="${v}" ${f.sort === v ? "selected" : ""}>${t}</option>`)
          .join("")}</select></label>`,
    ]),
    card({
      title: `รายการเอกสาร`,
      sub: `${rows.length} จาก ${scope.length} ฉบับที่ ${ctx.user.name} มองเห็น · เรียงตาม${
        { risk: "ความเสี่ยง", amount: "ยอดเงิน", updated: "เวลาขยับล่าสุด", id: "รหัสเอกสาร" }[f.sort]
      } · คลิกแถวเพื่อเปิดรายละเอียด`,
      actions: `<button class="btn sm ghost" data-clear-filters="1">ล้างตัวกรอง</button>`,
      body: rows.length ? rowsTable(rows, ctx) : emptyState("ไม่พบเอกสารที่ตรงกับเงื่อนไข"),
    }),
    sourceTag(["master-data", "rules-engine", "rules-standard"], "คอลัมน์ “งานถัดไป” ใช้ผัง owner จาก <code>master_data.py:USER_TASK_CODES</code>"),
  ].join("");
  return html;
}

const shortEngine = (v) => String(v ?? "").split(" ").slice(0, 2).join(" ") + "…";
const isDefault = (f) => Object.entries(f).every(([k, v]) => k === "sort" || !v);
const companyList = (docs) => {
  const m = new Map();
  for (const d of docs) m.set(d.company, `${d.company} · ${d.company_label ?? d.companyLabel ?? "ไม่ทราบชื่อบริษัท"}`);
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};

/* ------------------------------------------------------------------ *
 * เลือก + เรียงแถว
 * ------------------------------------------------------------------ */
function pick(docs, f, user) {
  const RISK = { block: 0, warn: 1, ok: 2 };
  const STS = { Hold: 0, "Manual Review": 1, Review: 2, "Auto-pass": 3 };
  const key = (d) =>
    f.sort === "amount"
      ? d.current.invoice?.grand_total ?? "0"
      : f.sort === "updated"
        ? d.workflow.updatedAt ?? "0000"
        : f.sort === "id"
          ? d.document_id
          : `${RISK[riskLevel(d)]}${STS[d.current.status] ?? 9}${d.document_id}`;
  return docs
    .filter((d) => {
      const s = d.current;
      if (f.mine === "1" && !isMyTask(user, d)) return false;
      if (f.status && s.status !== f.status) return false;
      if (f.wf && d.workflow.status !== f.wf) return false;
      if (f.company && d.company !== f.company) return false;
      if (f.assignee && (s.decision?.assigned_to ?? "system") !== f.assignee) return false;
      if (f.code && !(s.exceptions ?? []).some((e) => e.code === f.code)) return false;
      if (f.q) {
        const hay = `${d.document_id} ${d.dms_id} ${d.title} ${s.invoice?.invoice_num ?? ""} ${s.invoice?.supplier_name ?? ""} ${s.receipt?.po_number ?? ""} ${s.receipt?.org_id ?? ""} ${summarize(s.exceptions).codes.join(" ")}`.toLowerCase();
        if (!hay.includes(f.q.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const [ka, kb] = [key(a), key(b)];
      if (f.sort === "amount") return Number(kb) - Number(ka);
      return ka > kb ? 1 : ka < kb ? -1 : 0;
    });
}

/* ------------------------------------------------------------------ *
 * ตาราง
 * ------------------------------------------------------------------ */
function rowsTable(docs, ctx) {
  const rows = docs.map((d) => {
    const s = d.current;
    const sum = summarize(s.exceptions);
    const ev = evidenceStatus(d);
    const rl = riskLevel(d);
    const assigned = s.decision?.assigned_to;
    return `<tr class="row-click" tabindex="0" data-open="${esc(d.document_id)}" data-ev="${esc(ev.state)}">
      <td>
        <div class="c-doc"><strong>${esc(d.document_id)}</strong><span class="muted small">${esc(d.dms_id)} · rev ${esc(s.revision)}/${d.revisions.length}</span></div>
        <div class="sub">${esc(d.title)}</div>
        <div class="sub muted">${esc(s.invoice?.supplier_name || "ไม่ระบุผู้ขาย")} · PO ${esc(s.receipt?.po_number || s.invoice?.po_number || "—")}</div>
      </td>
      <td>
        <div class="c-tags">${statusBadge(s.status)}${chips(sum.codes, (c) => (EXCEPTION_CODES_AS_BUILT[c]?.severity === "High" ? "bad" : "warn"))}</div>
        <div class="sub muted">${esc(s.decision?.status ?? "ไม่มีผลลัพธ์")} · ${esc(s.source_system)}</div>
      </td>
      <td class="num">
        ${money(s.invoice?.grand_total)}
        <div class="sub muted">${esc(s.invoice?.currency ?? "THB")} · ${badge(d.company, d.company === "UNMAPPED" ? "bad" : "muted")}</div>
      </td>
      <td>
        ${wfBadge(d.workflow.status)} <span class="muted small">v${esc(d.workflow.version)}</span>
        <div class="sub muted">${esc(d.workflow.note ?? "ยังไม่มีความเห็น")}</div>
      </td>
      <td>
        ${assigned === "user" ? badge("ถึงคิวผู้ใช้", "warn") : assigned === "accounting" ? badge("ฝ่ายบัญชี", "info") : badge("อัตโนมัติ", "ok")}
        ${isMyTask(ctx.user, d) ? badge("งานของคุณ", "teal") : ""}
        <div class="sub muted">${esc(nextHint(s))}</div>
      </td>
      <td>
        <div class="c-tags">${badge(
          ev.state === "current" ? `หลักฐาน r${ev.have}` : ev.state === "stale" ? `หลักฐานเก่า r${ev.have}` : "ไม่มีไฟล์",
          ev.state === "current" ? "ok" : ev.state === "stale" ? "bad" : "warn",
        )}${badge(rl === "block" ? "ปิดไม่ได้" : rl === "warn" ? "ต้องเพิ่มหลักฐาน" : "พร้อมเคลียร์", rl === "block" ? "bad" : rl === "warn" ? "warn" : "ok")}</div>
        <div class="sub muted">${d.schema[s.revision]?.ok ? "contract ผ่าน" : "contract ไม่ผ่าน"} · ${d.completeness.usable ? "9 กฎครบ" : `กฎขาด ${d.completeness.missing.join(",") || "?"}`}</div>
      </td>
    </tr>`;
  });
  return table({
    head: ["เอกสาร / ผู้ขาย", "ผลตรวจ + ข้อยกเว้น", "ยอดรวม (THB)", "สถานะงาน (portal)", "งานถัดไป", "หลักฐาน / ความพร้อม"],
    rows,
    empty: "ไม่พบเอกสาร",
  });
}

function nextHint(snap) {
  if (snap.decision?.halted_by) return `หยุดที่ ${snap.decision.halted_by} — แก้ต้นทางแล้ว resubmit`;
  const top = summarize(snap.exceptions).list[0];
  if (!top) return snap.status === "Auto-pass" ? "รออนุมัติ 1 ครั้ง → ส่งตั้งหนี้" : "รอผลตรวจเพิ่ม";
  return `${top.code}: ${codeMeta(top.code).next}`;
}
