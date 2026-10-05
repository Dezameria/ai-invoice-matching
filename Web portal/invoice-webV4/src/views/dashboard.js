/**
 * views/dashboard.js — ภาพรวมระบบ: ผลตรวจ + สภาพข้อมูล + สัญญาที่ใช้
 * ทุกตัวเลขอ่านจาก store (snapshot + workflow) เท่านั้น
 */

import { esc, card, table, badge, progress, note } from "../ui/dom.js";
import { statusBadge, wfBadge, money, link, code, dt, pillList } from "../ui/format.js";
import { summarize } from "../domain/exceptions.js";
import { riskLevel, evidenceStatus } from "../domain/guards.js";
import { visibleDocs } from "../domain/access.js";
import { isMyTask } from "../domain/access.js";
import { CONTRACT_VERSION } from "../domain/schema.js";

const STATUS_ORDER = ["Auto-pass", "Review", "Hold", "Manual Review"];
const WF_ORDER = ["PENDING_REVIEW", "ON_HOLD", "RESUBMITTED", "CONFIRMED", "REJECTED", "POSTED"];

function kpi(label, value, sub = "", tone = "") {
  return `<div class="kpi ${tone}"><span class="kpi-v">${value}</span><span class="kpi-l">${esc(label)}</span>${sub ? `<span class="kpi-s">${sub}</span>` : ""}</div>`;
}

export function render(ctx) {
  const { store, user } = ctx;
  const docs = visibleDocs(user, store.list());
  const mine = docs.filter((d) => isMyTask(user, d));
  const stats = store.stats();

  const statusRows = STATUS_ORDER.map((s) => {
    const n = docs.filter((d) => d.current.status === s).length;
    const pct = docs.length ? (n / docs.length) * 100 : 0;
    return `<tr><td>${statusBadge(s)}</td><td class="num">${n}</td><td class="w-bar">${progress(pct, s === "Auto-pass" ? "ok" : s === "Hold" ? "bad" : "warn")}</td><td class="num muted">${Math.round(pct)}%</td></tr>`;
  }).join("");

  const wfRows = WF_ORDER.filter((w) => stats.byWorkflow[w]).map(
    (w) => `<tr><td>${wfBadge(w)}</td><td class="num">${stats.byWorkflow[w]}</td></tr>`,
  );

  const health = [];
  const invalid = docs.filter((d) => !d.schema[d.current.revision]?.ok);
  const partial = docs.filter((d) => !d.completeness.usable || d.completeness.missing.length);
  const stale = docs.filter((d) => evidenceStatus(d).state === "stale");
  const noEvidence = docs.filter((d) => evidenceStatus(d).state === "missing");
  const dup = docs.filter((d) => (d.duplicates ?? []).length);
  const pending = docs.filter((d) => (d.outbox ?? []).some((o) => o.status === "PENDING"));
  const unmapped = docs.filter((d) => d.current.receipt && d.current.receipt.company_mapped === false);
  const hand = docs.filter((d) => d.hand_authored);

  const healthRow = (label, list, why, target) =>
    `<tr><td>${label}</td><td class="num ${list.length ? "bad-text" : "ok-text"}">${list.length}</td><td class="muted">${esc(why)}</td>
      <td>${list.length ? `<a class="link" href="#/queue?focus=${target}">ดูรายการ</a>` : `<span class="muted">—</span>`}</td></tr>`;

  const codes = stats.codes.slice(0, 9).map((c) => {
    const meta = summarize([{ code: c.code, severity: c.severity ?? "Medium" }]).list[0];
    const max = stats.codes[0]?.n || 1;
    return `<tr>
      <td>${code(c.code, meta.userTask ? "user" : "acc")}</td>
      <td>${badge(meta.severity, meta.severity === "High" ? "bad" : meta.severity === "Medium" ? "warn" : "muted")}</td>
      <td class="w-bar">${progress((c.n / max) * 100, meta.severity === "High" ? "bad" : "warn")}</td>
      <td class="num">${c.n}</td>
      <td class="muted small">${esc(meta.label)}</td></tr>`;
  });

  const waiting = (mine.length ? mine : docs.filter((d) => ["Hold", "Manual Review"].includes(d.current.status)))
    .slice(0, 7)
    .map((d) => {
      const sum = summarize(d.current.exceptions);
      const ev = evidenceStatus(d);
      return `<tr>
        <td>${link(d.document_id, d.document_id.slice(-4))}<div class="sub">${esc(d.title)}</div></td>
        <td>${statusBadge(d.current.status)}</td>
        <td>${pillList(sum.codes.slice(0, 3), (c) => (c === "E31" || c === "E06" ? "bad" : ""))}</td>
        <td>${money(d.current.invoice?.grand_total)}</td>
        <td>${wfBadge(d.workflow.status)}</td>
        <td>${badge(ev.state === "current" ? "มีหลักฐาน" : ev.state === "stale" ? "หลักฐานเก่า" : "ไม่มีหลักฐาน", ev.state === "current" ? "ok" : ev.state === "stale" ? "bad" : "warn")}</td>
        <td>${riskLevel(d) === "block" ? badge("บล็อก", "bad") : riskLevel(d) === "warn" ? badge("เตือน", "warn") : badge("พร้อม", "ok")}</td>
      </tr>`;
    });

  const b = store.bundle_meta;

  return `
  <div class="grid-2">
    ${card({
      title: `สรุปผลการตรวจ ${docs.length} เอกสาร (${stats.snapshots} revision)`,
      sub: `ผลิตโดย engine as-built ${esc(b.engine_version)} · snapshot ณ ${esc(dt(b.built_at))} · <strong>Portal ไม่ได้ตรวจซ้ำ</strong>`,
      body: `<div class="kpis">
        ${kpi("เอกสาร", docs.length, `${b.snapshot_count} snapshot ในคลัง`)}
        ${kpi("Auto-pass", stats.byStatus["Auto-pass"] ?? 0, "ยังต้องอนุมัติ 1 ครั้ง", "ok")}
        ${kpi("Review", stats.byStatus["Review"] ?? 0, "Medium ต้องดู", "warn")}
        ${kpi("Hold", stats.byStatus["Hold"] ?? 0, "High ห้ามไปต่อ", "bad")}
        ${kpi("Manual Review", stats.byStatus["Manual Review"] ?? 0, "engine ตัดสินไม่ได้", "info")}
      </div>
      <table class="mini"><tbody>${statusRows}</tbody></table>`,
    })}

    ${card({
      title: "สภาพข้อมูล (data health)",
      sub: "fail-safe: ไม่มีข้อมูล ≠ ผ่าน — ตัวเลขเหล่านี้คือสาเหตุที่ Portal ห้ามบาง action",
      body: `<table class="mini"><thead><tr><th>เรื่อง</th><th class="num">เอกสาร</th><th>ผลต่อการทำงาน</th><th></th></tr></thead><tbody>
        ${healthRow("snapshot ไม่ผ่าน contract", invalid, "ห้ามยืนยัน/ตั้งหนี้ (show, don’t trust)", "schema")}
        ${healthRow("ผลตรวจ 9 กฎไม่ครบ", partial, "แสดงเป็น “ไม่มีข้อมูล” และปิดกั้น confirm", "rules")}
        ${healthRow("ไฟล์หลักฐานเป็น revision เก่า", stale, "ห้ามกดยืนยันจนกว่าจะได้ PDF ของ revision ปัจจุบัน", "evidence")}
        ${healthRow("ไม่มีไฟล์หลักฐาน", noEvidence, "ต้องแนบ PDF ก่อน (เดโม: กดปุ่มในหน้าเอกสาร)", "evidence")}
        ${healthRow("เข้าคู่ซ้ำ (คู่กันจริง)", dup, "ห้ามตั้งหนี้ซ้ำสองฉบับ", "dup")}
        ${healthRow("มีงานค้างใน outbox", pending, "ผลการตรวจปัจจุบันยังไม่ใช่รอบใหม่", "outbox")}
        ${healthRow("map บริษัทไม่ได้", unmapped, "ไม่รู้ว่าตั้งหนี้ให้บริษัทไหน", "company")}
        ${healthRow("snapshot เขียนมือ (ไม่ใช่ engine)", hand, "ไว้เดโม pipeline ล้ม — ห้ามถือเป็นผลจริง", "hand")}
      </tbody></table>
      ${stats.audit ? note(`มีเหตุการณ์ใน audit trail แล้ว <strong>${stats.audit}</strong> รายการ — <a class="link" href="#/audit">เปิดดู</a>`, "info") : ""}`,
    })}

    ${card({
      title: "รหัสข้อยกเว้นที่พบบ่อย",
      sub: "เจ้าของงานตาม as-built: E06 E12 E13 E17 E26 E34 E35 → ผู้ใช้ · ที่เหลือ → บัญชี",
      body: `<table class="mini"><thead><tr><th>รหัส</th><th>Severity</th><th>ความถี่</th><th class="num">ครั้ง</th><th>ความหมาย</th></tr></thead><tbody>${
        codes.join("") || `<tr><td class="muted">ไม่พบข้อยกเว้น</td><td></td><td></td><td></td><td></td></tr>`
      }</tbody></table>
      <p class="foot-note">รหัส E30/E29/E31 มีพฤติกรรมที่ต่างจากเอกสารมาตรฐาน — อ่าน <a class="link" href="#/help">บันทึกส่วนต่าง (gap log)</a></p>`,
    })}

    ${card({
      title: user?.role === "EU" ? "งานที่รอคุณ" : "งานหนักที่ต้องเคลียร์",
      sub: user?.role === "EU" ? `งานที่ engine มอบหมายให้ผู้ใช้ (assigned_to = user) และอยู่ในขอบเขตของคุณ` : "เรียงตามผล Hold / Manual Review",
      actions: `<a class="btn sm" href="#/queue">เปิดคิวทั้งหมด</a>`,
      body: table({
        head: ["เอกสาร", "ผลตรวจ", "ข้อยกเว้น", "ยอดรวม", "สถานะงาน", "หลักฐาน", "ความพร้อม"],
        rows: waiting,
        empty: "ไม่มีงานค้าง — เยี่ยม!",
      }),
    })}
  </div>

  ${card({
    title: "สัญญาและขอบเขตที่ portal ยึด",
    body: `<div class="contract-grid">
      <div><h3>รับเข้า</h3><ul>
        <li>receiving contract <strong>v${CONTRACT_VERSION}</strong> · ตรวจที่ขอบเขตทุกครั้ง (${code("domain/schema.js")})</li>
        <li>เลขทุกตัวเป็น <strong>decimal string</strong> → คำนวณด้วย BigInt (${code("domain/money.js")}) ห้ามใช้ float</li>
        <li>revision ต้องเพิ่มขึ้นเสมอ + กันซ้ำด้วย <strong>event_id</strong></li>
        <li>ไม่มีการรัน OCR/ไม่เรียก Oracle, Vision, ERP runtime</li>
      </ul></div>
      <div><h3>ทำงาน</h3><ul>
        <li>สถานะงาน (workflow) แยกจากผลการตรวจ (engine) คนละฟิลด์</li>
        <li>ทุก action ผ่าน 3 ชั้น: สิทธิ์ → state → หลักฐาน/ความเสี่ยง</li>
        <li>ต้องระบุเหตุผล ≥ 5 ตัวอักษร และ verify optimistic version</li>
        <li>Auto-pass ยังต้องมี human approval 1 ครั้ง</li>
      </ul></div>
      <div><h3>ยังไม่ได้ต่อ (บล็อกไว้)</h3><ul>
        <li>ส่งตั้งหนี้ที่ AP/Oracle — <strong>ยังไม่มีสัญญา</strong> ปุ่มนี้ปิดถาวร</li>
        <li>อ่าน/เขียน master องค์กร — โหลดจาก <code>master_data.py</code> แบบ read-only</li>
        <li>เรียก OCR service ตรง ๆ — สั่งงานผ่าน outbox เท่านั้น</li>
        <li>แสดงภาพ PDF จริง — มีเฉพาะ metadata (ไม่เก็บไฟล์ใน repo)</li>
      </ul></div>
      <div><h3>ข้อมูลชุดนี้</h3><ul>
        <li>สังเคราะห์ทั้งหมด 🧪 ไม่มีเอกสารจริง/Tax ID จริงของบุคคล</li>
        <li>${b.hand_authored_snapshots} snapshot เขียนมือ (เดโม pipeline ล้ม/กฎไม่ครบ) ที่เหลือผ่าน engine mirror</li>
        <li>engine_version ${code(b.engine_version)}</li>
        <li>tolerance as-built: ${Object.entries(b.tolerance ?? {})
          .map(([k, v]) => `${k.replace("V-", "").replace("_", " ")}=${typeof v === "string" ? v : v}`)
          .join(", ")}</li>
      </ul></div>
    </div>`,
  })}`;
}
