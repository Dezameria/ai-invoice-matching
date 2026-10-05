/**
 * views/audit.js — ประวัติการทำงานทั้งหมด (append-only ที่ portal ผลิตเอง)
 *
 * สำคัญ: สิ่งที่ถูก "ตรวจ" โดย engine ไม่อยู่ใน log นี้ — log นี้บันทึกเฉพาะการกระทำของมนุษย์
 * (hold/release/resubmit/confirm/reject/post) + เหตุการณ์ระบบ (ingest/dedup/รับ revision)
 * ของจริงต้องอยู่ server-side แก้ย้อนหลังไม่ได้ และ export ให้ผู้ตรวจงานได้
 */

import { esc, card, table, badge, note } from "../ui/dom.js";
import { code, dt, ago } from "../ui/format.js";
import { pageHead, filterBar, searchBox, selectBox, statLine, emptyState } from "../ui/parts.js";
import { filterEntries, auditSummary, AUDIT_KIND } from "../domain/audit.js";
import { USERS, ROLE_LABEL } from "../domain/access.js";

export function render(ctx) {
  const f = { q: ctx.route.params.q ?? "", kind: ctx.route.params.k ?? "", who: ctx.route.params.u ?? "" };
  const all = ctx.store.audit();
  const rows = filterEntries(all, { q: f.q, kind: f.kind || null, actorId: f.who || null });
  const sum = auditSummary(all);

  const table_ = table({
    head: ["เวลา", "ผู้ทำ", "action", "ชนิด", "เอกสาร", "สถานะ", "v", "เหตุผล/หมายเหตุ"],
    rows: rows.map((e) => `<tr class="${["INGEST_REJECT", "DEDUP"].includes(e.kind) ? "row-warn" : ""}">
      <td>${dt(e.ts)}<div class="sub muted">${esc(ago(e.ts))}</div></td>
      <td>${esc(e.actor_name ?? "system")}<div class="sub muted">${esc(e.actor_role ?? "")}</div></td>
      <td>${code(e.action)}</td>
      <td>${badge(AUDIT_KIND[e.kind] ?? e.kind, tone(e.kind))}</td>
      <td>${e.document_id ? `<a class="link" href="#/doc/${esc(e.document_id)}">${esc(e.document_id)}</a>` : `<span class="muted">ทั้งระบบ</span>`}</td>
      <td>${e.from ? `${code(e.from)} → ` : ""}${e.to ? code(e.to) : ""}</td>
      <td class="num">${e.workflow_version ?? "—"}</td>
      <td class="small">${esc(e.note ?? "—")}${e.detail?.length ? `<div class="sub muted">${e.detail.length} ข้อผิดพลาดที่ขอบเขต</div>` : ""}</td>
    </tr>`),
    empty: "ยังไม่มีเหตุการณ์ใน session นี้",
  });

  return [
    pageHead({
      title: "ประวัติการทำงาน",
      sub: "ทุก action ต้องมีเหตุผล ≥ 5 ตัวอักษร และบันทึกแบบ append-only — ในเดโมเก็บใน localStorage ของเครื่องนี้",
      actions: `<a class="btn sm ghost" href="${csvHref(rows)}" download="aiva-audit-trail.csv">export CSV</a>`,
    }),
    statLine([
      ["เหตุการณ์ทั้งหมด", sum.n, ""],
      ["ประเภทที่เกิด", Object.keys(sum.byKind).length, "muted"],
      ["ผู้ที่ใช้ระบบนี้", Object.keys(sum.byActor).length, "muted"],
      ["ระบบปฏิเสธที่ขอบเขต", countKind(all, "INGEST_REJECT") + countKind(all, "DEDUP"), "warn"],
    ]),
    card({
      title: "รายการเหตุการณ์",
      sub: `${rows.length} จาก ${all.length} เหตุการณ์ · เรียงล่าสุดขึ้นก่อน`,
      body:
        filterBar([
          searchBox("q", f.q, "หาเอกสาร / เหตุผล / action", "audit"),
          selectBox("k", f.kind, "ชนิด", [["", "ทุกชนิด"], ...Object.entries(AUDIT_KIND).map(([k, v]) => [k, v])], "audit"),
          selectBox("u", f.who, "ผู้ทำ", [["", "ทุกคน"], ...USERS.map((u) => [u.id, `${u.name} · ${ROLE_LABEL[u.role].split(" (")[0]}`])], "audit"),
        ]) +
        (all.length === 0
          ? emptyState("ยังไม่มีเหตุการณ์ — ไปที่หน้า งาน → เปิดเอกสาร → กักงาน/ยืนยัน พร้อมกรอกเหตุผล แล้วกลับมาหน้านี้")
          : table_) +
        note("เหตุการณ์ <code>INGEST_REJECT</code> / <code>DEDUP</code> คือครั้งที่ระบบปฏิเสธข้อมูลที่ขอบเขต (schema ไม่ผ่าน / event_id ซ้ำ / revision ถอยหลัง) — เป็นการป้องกัน ไม่ใช่ความผิดพลาดของผู้ใช้", "muted"),
    }),
  ].join("");
}

const tone = (kind) =>
  ["INGEST_REJECT", "DEDUP"].includes(kind) ? "bad" : kind === "DECISION" ? "ok" : kind === "INGEST" ? "teal" : kind === "DEMO" ? "info" : "muted";

const countKind = (entries, kind) => entries.filter((e) => e.kind === kind).length;

function csvHref(rows) {
  const head = ["ts", "actor", "role", "action", "kind", "document_id", "from", "to", "version", "note"];
  const body = rows.map((e) =>
    [e.ts, e.actor_name, e.actor_role, e.action, e.kind, e.document_id, e.from, e.to, e.workflow_version, (e.note ?? "").replace(/[\r\n]+/g, " ")]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  return `data:text/csv;charset=utf-8,${encodeURIComponent("\uFEFF" + [head.join(","), ...body].join("\n"))}`;
}
