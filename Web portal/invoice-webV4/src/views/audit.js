/**
 * views/audit.js — audit trail รวมของ portal (เดโม: เก็บใน localStorage)
 */

import { esc, card, table, badge, note } from "../ui/dom.js";
import { dt, ago, link, code } from "../ui/format.js";
import { AUDIT_KIND, auditSummary } from "../domain/audit.js";
import { USERS } from "../domain/access.js";

export function render(ctx) {
  const { store, filters } = ctx;
  const f = { q: "", kind: "", actorId: "", ...(filters ?? {}) };
  const all = store.audit();
  const rowsList = all.filter((e) => {
    if (f.kind && e.kind !== f.kind) return false;
    if (f.actorId && e.actor_id !== f.actorId) return false;
    if (f.q) {
      const hay = `${e.document_id} ${e.action} ${e.note} ${e.actor_name}`.toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    return true;
  });

  const sum = auditSummary(all);
  const rows = rowsList.slice(0, 300).map(
    (e) => `<tr>
      <td>${dt(e.ts)}<div class="sub muted">${esc(ago(e.ts))}</div></td>
      <td>${esc(e.actor_name)}<div class="sub muted">${esc(e.actor_role)}</div></td>
      <td>${e.document_id ? link(e.document_id, e.document_id.slice(-4)) : `<span class="muted">—</span>`}</td>
      <td>${code(e.action)} ${badge(e.kind, ["INGEST_REJECT", "DEDUP"].includes(e.kind) ? "bad" : e.kind === "DECISION" ? "ok" : "muted")}</td>
      <td>${e.from ? code(e.from) : `<span class="muted">—</span>`}</td>
      <td>${e.to ? code(e.to) : `<span class="muted">—</span>`}</td>
      <td class="num">${e.revision ?? "—"} / v${e.workflow_version ?? "—"}</td>
      <td class="small">${esc(e.note ?? "")}</td>
    </tr>`,
  );

  return `
  ${card({
    title: "Audit trail",
    sub: `${sum.n} เหตุการณ์ · append-only (เดโมเก็บใน localStorage · ระบบจริงต้องอยู่ server และแก้ย้อนหลังไม่ได้)`,
    actions: `<button class="btn sm danger" data-demo="reset">รีเซ็ตข้อมูลเดโม</button>`,
    body: `<div class="filters">
      <label class="filter grow"><span>ค้นหา</span><input data-filter="q" data-scope="audit" value="${esc(f.q)}" placeholder="เอกสาร / action / เหตุผล / ชื่อผู้ใช้"></label>
      <label class="filter"><span>ชนิดเหตุการณ์</span><select data-filter="kind" data-scope="audit">
        <option value="">ทั้งหมด</option>
        ${Object.entries(AUDIT_KIND).map(([k, v]) => `<option value="${esc(k)}" ${f.kind === k ? "selected" : ""}>${esc(v)}</option>`).join("")}
      </select></label>
      <label class="filter"><span>ผู้ใช้</span><select data-filter="actorId" data-scope="audit">
        <option value="">ทั้งหมด</option>
        ${USERS.map((u) => `<option value="${esc(u.id)}" ${f.actorId === u.id ? "selected" : ""}>${esc(u.name)}</option>`).join("")}
      </select></label>
      <button class="btn sm ghost" data-clear-filters="1">ล้างตัวกรอง</button>
    </div>
    <div class="chips-line">${Object.entries(sum.byKind)
      .map(([k, n]) => `${badge(`${AUDIT_KIND[k] ?? k} · ${n}`, ["INGEST_REJECT", "DEDUP"].includes(k) ? "bad" : "muted")}`)
      .join(" ")}</div>
    ${table({ head: ["เวลา", "ผู้ใช้", "เอกสาร", "action", "จาก", "ไป", "rev/v", "เหตุผล"], rows, empty: "ยังไม่มีเหตุการณ์ — ไปกด action ในหน้าเอกสารก่อน" })}
    ${note("สิ่งที่ถูกบันทึก: ผู้ใช้ · เวลา · เอกสาร/revision · action · สถานะก่อน→หลัง · เวอร์ชันงาน · เหตุผลที่พิมพ์ — <strong>ไม่บันทึกผลตรวจ</strong> เพราะผลตรวจมาจาก snapshot และเป็นของ engine (แก้ไม่ได้)", "info")}`,
  })}`;
}
