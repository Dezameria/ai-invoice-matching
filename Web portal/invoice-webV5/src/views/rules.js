/**
 * views/rules.js — "กฎ & ข้อยกเว้น": เอกสารมาตรฐาน ⇄ สิ่งที่ engine ทำจริง
 *
 * หลักของ V5: ห้าม copy ข้อความมาตรฐานมาเขียนในโค้ด UI
 * ทุกบรรทัดบนหน้านี้ถูกอ่านออกมาจาก docs/matching-rules-standard-v6.2.md (ผ่าน repo-docs.js)
 * และจาก master_data.py (ผ่าน master-data.js) แล้ว *เทียบกันต่อหน้าผู้ใช้*
 * → ความขัดแย้งระหว่างเอกสารกับโค้ดถูกเปิดเผย ไม่ใช่เลือกข้างใดข้างหนึ่งเงียบ ๆ
 */

import { esc, card, table, badge, note, kv } from "../ui/dom.js";
import { code, sevBadge } from "../ui/format.js";
import { pageHead, tabs, sourceTag, filterBar, searchBox, selectBox, chips } from "../ui/parts.js";
import {
  standardRules,
  principles,
  decisionMatrix,
  exceptionComparison,
  conflictSummary,
  ruleUsage,
  standardVersion,
  docById,
} from "../domain/reference.js";
import { ruleMeta, STEP_LABEL, ALL_RULE_IDS, MATCH_LEVEL } from "../domain/ruleCatalog.js";
import { MASTER_ENTITIES } from "../data/master-data.js";
import { MASTER_META, EXCEPTION_CODES_AS_BUILT, USER_TASK_CODES } from "../data/master-data.js";
import { resolveCompany, COMPANY_BY_TAX } from "../domain/company.js";
import { frequency } from "../domain/exceptions.js";

const TABS = [
  ["rules", "กฎ V-01…V-09"],
  ["exceptions", "ข้อยกเว้น: เอกสาร vs โค้ด"],
  ["decision", " Decision Matrix & หลักการ D1–D6"],
  ["master", "Master data"],
];

export function render(ctx) {
  const tab = ctx.route.params.tab ?? "rules";
  const body = {
    rules: rulesTab(ctx),
    exceptions: exceptionsTab(ctx),
    decision: decisionTab(ctx),
    master: masterTab(ctx),
  }[tab];

  const c = conflictSummary();
  return [
    pageHead({
      title: "กฎ & ข้อยกเว้น",
      sub: `อ่านจากต้นฉบับใน repo: <code>${esc(docById("rules-standard").path)}</code> (${standardVersion() ?? "ไม่พบเลขที่เอกสาร"}) เทียบกับ <code>OCR service/n8n/app/core/master_data.py</code>`,
      actions: chips(ALL_RULE_IDS, () => "mono"),
    }),
    c.severityClash.length
      ? note(
          `พบ<strong>ส่วนต่างระหว่างเอกสารกับโค้ด</strong>: ความรุนแรงไม่ตรงกัน ${c.severityClash.length} รหัส (${c.severityClash
            .map((x) => code(x))
            .join(" ")}) · เอกสารมีแต่โค้ดไม่มี ${c.standardOnly.length} รหัส · โค้ดมีแต่เอกสารไม่มี ${c.asBuiltOnly.length} รหัส — portal แสดงทั้งสองด้าน ไม่แก้เกณฑ์แทนใคร`,
          "warn",
        )
      : "",
    tabs({ base: "#/rules", value: tab, items: TABS }),
    `<div class="stack">${body}</div>`,
    sourceTag(["rules-standard", "master-data", "rules-engine"]),
  ].join("");
}

/* ------------------------------------------------------------------ *
 * tab 1 — กฎ 9 ข้อ
 * ------------------------------------------------------------------ */
function rulesTab(ctx) {
  const usage = new Map(ruleUsage(ctx.store.list().map((d) => d.current)).map((u) => [u.id, u]));
  const std = standardRules();
  const blocks = std
    .map((r) => {
      const meta = ruleMeta(r.id);
      const u = usage.get(r.id);
      const counts = u
        ? `ในเดโม: ${[["pass", "PASS"], ["fail", "FAIL"], ["manual", "MANUAL"], ["skipped", "ไม่ได้ตรวจ"]]
            .filter(([k]) => u[k])
            .map(([k, t]) => `${t} ${u[k]}`)
            .join(" · ")}`
        : "ยังไม่มีในข้อมูลเดโม";
      return card({
        title: `${r.id} · ${esc(r.title)}`,
        sub: `${STEP_LABEL[r.step]} · as-built catalog: ${esc(meta.name)}`,
        body: `<div class="two-col">
          <div>
            <h4>มาตรฐาน 6.2 บอกอะไร (ตัวอักษรจาก repo)</h4>
            <ul class="ticks">${r.checks.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
            ${r.codes.length ? `<p class="muted small">รหัสที่มาตรฐานระบุไว้: ${chips(r.codes)}</p>` : ""}
          </div>
          <div>
            <h4>โค้ดจริงทำอย่างไร (as-built)</h4>
            <p>${esc(meta.asBuilt)}</p>
            <p class="muted small">สิ่งที่ engine ตรวจ: ${esc(meta.checks)}</p>
            <p class="small">รหัสที่ออกได้จริงในเดโม: ${u?.codes?.length ? chips(u.codes, (c) => (EXCEPTION_CODES_AS_BUILT[c]?.severity === "High" ? "bad" : "warn")) : "—"}
              <span class="muted"> · ${esc(counts)}</span></p>
          </div>
        </div>
        ${differs(r, meta) ? note("ข้อความเป็นคนละส่วนกับ as-built — ถ้าจะใช้งานจริงต้องเลือกข้างและแก้ที่ต้นทาง (engine หรือเอกสาร) ไม่ใช่แก้ที่ portal", "warn") : ""}`,
      });
    })
    .join("");
  return blocks;
}

/** กฎที่ "สิ่งที่โค้ดทำ" ต่างจาก "สิ่งที่เอกสารสั่ง" แบบชัด ๆ (ใช้ข้อความ as-built ของ catalog เป็นสัญญาณ) */
const differs = (stdRule, meta) =>
  /ต่าง|ไม่ตรง|จริง|bypass|M4|fail-safe|hardcode|เพิ่ม|ข้าม/.test(meta.asBuilt ?? "");

/* ------------------------------------------------------------------ *
 * tab 2 — ตารางเทียบข้อยกเว้น
 * ------------------------------------------------------------------ */
function exceptionsTab(ctx) {
  const f = { q: ctx.route.params.q ?? "", state: ctx.route.params.st ?? "" };
  const freq = new Map(frequency(ctx.store.list().map((d) => d.current.exceptions)).map((x) => [x.code, x.n]));
  const all = exceptionComparison();
  const rows = all
    .filter((r) => (f.state === "clash" ? r.severityMatch === false || r.state !== "both" : f.state === "both" ? r.state === "both" : true))
    .filter((r) => !f.q || `${r.code} ${r.standard?.meaning} ${r.asBuilt?.desc}`.toLowerCase().includes(f.q.toLowerCase()));

  const TONE = { both: "muted", "standard-only": "info", "asbuilt-only": "teal" };
  const STATE = { both: "ทั้งสองแหล่ง", "standard-only": "มีในเอกสารเท่านั้น", "asbuilt-only": "มีในโค้ดเท่านั้น" };

  return card({
    title: "รหัสข้อยกเว้น — เอกสารมาตรฐาน 6.2 ⇄ master_data.py",
    sub: `แถวเดียวกัน = รหัสเดียวกัน · ความรุนแรงไม่ตรง → ⚔️ · คนละความหมาย → ✎ (ไม่ได้แปลว่าผิด แต่แปลว่าสองแหล่งต้องคุยกัน)`,
    actions: `<span class="muted small">${all.length} รหัส · ตรงกันทุกคอลัมน์ ${
      all.filter((r) => r.state === "both" && r.severityMatch && !r.meaningDiffers).length
    }</span>`,
    body:
      filterBar([
        searchBox("q", f.q, "หารหัสหรือความหมาย", "rules"),
        selectBox(
          "st",
          f.state,
          "แสดง",
          [["", "ทุกรหัส"], ["both", "ที่มีทั้งสองแหล่ง"], ["clash", "ที่มีส่วนต่าง"]],
          "rules",
        ),
      ]) +
      table({
        head: ["รหัส", "เจ้าของงาน", "เอกสาร 6.2 (ความรุนแรง)", "master_data.py (ความรุนแรง)", "ความหมายตามเอกสาร", "คำอธิบาย as-built", "ใช้จริงในเดโม"],
        rows: rows.map((r) => {
          const clash = r.severityMatch === false;
          return `<tr class="${clash ? "row-warn" : ""}">
            <td>${code(r.code)} ${badge(STATE[r.state], TONE[r.state])}</td>
            <td>${r.owner === "user" ? badge("ผู้ใช้ (user)", "user") : r.owner === "accounting" ? badge("บัญชี", "info") : `<span class="muted">ยังไม่ผูกในโค้ด</span>`}</td>
            <td>${r.standard ? sevBadge(r.standard.severity) : `<span class="muted">—</span>`}${
              clash ? ` ${badge(`⚔️ ${r.asBuilt.severity}`, "bad")}` : ""
            }</td>
            <td>${r.asBuilt ? sevBadge(r.asBuilt.severity) : `<span class="muted">engine ยังไม่ออกรหัสนี้</span>`}</td>
            <td class="small">${esc(r.standard?.meaning ?? "—")}</td>
            <td class="small">${esc(r.asBuilt?.desc ?? "—")}${r.meaningDiffers ? ` ${badge("✎ ข้อความต่าง", "muted")}` : ""}</td>
            <td class="num">${freq.get(r.code) ?? 0}${(freq.get(r.code) ?? 0) === 0 ? `<div class="sub muted">ไม่พบใน 24 snapshot</div>` : ""}</td>
          </tr>`;
        }),
        empty: "ไม่พบรหัสที่ตรงเงื่อนไข",
      }) +
      note(
        `รหัสที่เอกสารระบุแต่ engine ยังไม่ออก: ${all.filter((r) => r.state === "standard-only").map((r) => code(r.code)).join(" ") || "—"} ·
         รหัสที่ engine ออกแต่ไม่มีในตารางเอกสาร: ${all.filter((r) => r.state === "asbuilt-only").map((r) => code(r.code)).join(" ") || "—"}
         · งานที่เป็นของผู้ใช้ (USER_TASK_CODES): ${USER_TASK_CODES.map((c) => code(c)).join(" ")}`,
        "muted",
      ),
  });
}

/* ------------------------------------------------------------------ *
 * tab 3 — decision matrix + หลักการ + tolerance
 * ------------------------------------------------------------------ */
function decisionTab(ctx) {
  const dm = decisionMatrix();
  const pr = principles();
  const tol = ctx.meta.tolerance ?? {};
  const WF_DOC = {
    PENDING_REVIEW: "งานอยู่ในคิว รอคนตรวจ (portal)",
    ON_HOLD: "มีคนกักงานไว้ พร้อมเหตุผล",
    RESUBMITTED: "ส่งคำขอ resubmit/rerun ไปที่ OCR แล้ว รอ revision ใหม่",
    CONFIRMED: "มนุษย์อนุมัติแล้ว (ยังไม่ได้ตั้งหนี้)",
    REJECTED: "ปฏิเสธแล้ว — ปิดงาน",
  };
  return [
    card({
      title: "เมทริกซ์การตัดสินผล (ตัวอักษรจากเอกสารมาตรฐาน)",
      sub: "engine เป็นผู้ตัดสิน 4 ค่านี้ · portal แสดงผล แล้วกำหนด “ใครทำงานต่อ” จากค่านั้นเท่านั้น",
      body:
        table({
          head: ["สถานะ", "ความหมาย", "สิ่งที่จะต้องทำต่อ", "ผู้รับผิดชอบตามเอกสาร"],
          rows: dm.map((r) => `<tr><td>${code(r.status)}</td><td class="small">${esc(r.meaning)}</td><td class="small">${esc(r.next)}</td><td>${esc(r.owner)}</td></tr>`),
        }) +
        `<h4>สิ่งที่มีใน portal แต่ไม่มีในเอกสาร (สถานะงานคนละชุดกับผลการตรวจ)</h4>
         ${table({
           head: ["สถานะงาน (portal)", "หมายความว่า"],
           rows: Object.entries(WF_DOC).map(([k, v]) => `<tr><td>${code(k)}</td><td class="small">${esc(v)}</td></tr>`),
         })}`,
    }),
    card({
      title: "หลักการออกแบบ D1–D6 (จากเอกสารมาตรฐาน)",
      sub: "portal ยึดหลักการเดียวกันนี้ — มีเทสต์ใน <code>tools/smoke-test.mjs</code> เฝ้าข้อ D1/D2/D3/D5",
      body: table({
        head: ["หลักการ", "คำอธิบาย", "portal ทำตามอย่างไร"],
        rows: pr
          .map((p) => `<tr><td>${code(p.id)}</td><td class="small">${esc(p.detail)}</td><td class="small">${esc(FOLLOW[p.id] ?? "—")}</td></tr>`)
          .join(""),
      }),
    }),
    card({
      title: "เกณฑ์ตัวเลขที่ engine ใช้ (as-built)",
      sub: "ค่าเหล่านี้มาจาก <code>rules.py</code> ผ่าน snapshot metadata — portal ห้ามตั้งค่าใหม่เอง",
      body:
        kv(
          Object.entries(tol).map(([k, v]) => [TOL_LABEL[k] ?? k, `<code>${esc(String(v))}</code>${k === "pricePct" ? " (สัดส่วน)" : k === "receiptSafetyCap" ? " (แถว)" : " (บาท)"} <span class="muted small">${esc(TOL_NOTE[k] ?? "")}</span>`]),
          2,
        ) +
        `<h4>ระดับการจับคู่รายบรรทัด</h4>
         ${table({
           head: ["ระดับ", "เงื่อนไข", "หมายเหตุ"],
           rows: Object.entries(MATCH_LEVEL).map(([k, v]) => `<tr><td>${badge(v.label, v.tone)}</td><td class="small">${esc(v.note)}</td><td class="small">${esc(MATCH_NOTE[k] ?? "")}</td></tr>`),
         })}`,
    }),
  ].join("");
}

const FOLLOW = {
  D1: "portal ไม่แตะ OCR/Vision เลย — รับเฉพาะ snapshot",
  D2: "portal ไม่เรียก Oracle เอง — ข้อมูลรับของอยู่ใน snapshot ที่ engine ดึงไว้แล้ว",
  D3: "การ resubmit เป็น event ใน outbox ให้ producer ตัดสินใจเรียก SQL ซ้ำ",
  D4: "นิติบุคคลทั้งหมดถูก sync จาก <code>master_data.py</code> — ไม่ map เอง ถ้า map ไม่ได้ขึ้น UNMAPPED",
  D5: "แสดงให้ครบ 9 กฎเสมอ กฎที่ขาดจาก snapshot = “ไม่มีข้อมูล” + บล็อกการยืนยัน",
  D6: "ทุก action ต้องมีเหตุผล ≥5 ตัวอักษร + audit append-only + provenance ติดทุกหน้าจอ",
};
const TOL_LABEL = {
  lineMath: "V-02 ผลต่างคำนวณรายบรรทัด",
  docSum: "V-03 รวมเอกสาร",
  vat: "V-03 VAT (7%)",
  grand: "V-03 grand total",
  receiptTotal: "V-09 เทียบยอดรับจริง",
  pricePct: "V-05 ราคาต่าง (สัดส่วน)",
  priceAbs: "V-05 ราคาต่าง (จำนวนเงิน)",
  receiptSafetyCap: "V-04 fail-safe จำนวนแถว",
};
const TOL_NOTE = {
  lineMath: "ถ้าเกิน → E28 และ bypass ไม่เรียก Oracle",
  vat: "engine คาดหวัง 7% เสมอ (บิลต่างประเทศจึงโดน E31)",
  pricePct: "≤1% และ ≤200 → E29 (Low)",
  receiptSafetyCap: "SQL คืนแถว ≥ ค่านี้ → MANUAL ไม่เดา",
};
const MATCH_NOTE = {
  M1: "เชื่อถือได้สูงสุด — ถ้าไม่พบ item code มักลงเอย E05",
  M2: "ใช้กับชื่อไทย/อังกฤษที่มีคำพิเศษ",
  M3: "token overlap — as-built อาจจับผิดคูถ้าคำทั่วไปซ้ำ",
  M4: "fallback ที่ทำให้ E30 แทบไม่เกิด (ส่วนต่างจากเอกสาร)",
};

/* ------------------------------------------------------------------ *
 * tab 4 — master data
 * ------------------------------------------------------------------ */
function masterTab(ctx) {
  const f = { q: ctx.route.params.q ?? "", status: ctx.route.params.ms ?? "" };
  const freq = frequency(ctx.store.list().map((d) => d.current.exceptions));
  const rows = MASTER_ENTITIES.filter(
    (e) =>
      (!f.status || e.status === f.status) &&
      (!f.q || `${e.orgId} ${e.ouId} ${e.nameTh} ${e.taxId}`.toLowerCase().includes(f.q.toLowerCase())),
  )
    .sort((a, b) => (a.status === "ACTIVE" ? -1 : 1) - (b.status === "ACTIVE" ? -1 : 1) || a.nameTh.localeCompare(b.nameTh))
    .map((e) => {
      const r = resolveCompany(e.orgId);
      return `<tr class="${e.status === "ACTIVE" ? "" : "row-warn"}">
        <td class="num">${esc(e.orgId)}<div class="sub muted">OU ${esc(e.ouId)}</div></td>
        <td><strong>${esc(e.nameTh)}</strong><div class="sub muted">ไปรษณีย์ ${esc(e.postal || "—")} · สาขา ${esc(String((e.branches ?? []).length || 0))}</div></td>
        <td>${esc(e.taxId || "—")}</td>
        <td>${badge(e.status, e.status === "ACTIVE" ? "ok" : e.status === "UNKNOWN" ? "warn" : "bad")}</td>
        <td>${r.mapped ? badge(r.company, "muted") : badge("UNMAPPED", "bad")}<div class="sub muted">${esc(r.mapped ? r.companyLabel : r.reason)}</div></td>
      </tr>`;
    });

  return [
    card({
      title: `นิติบุคคล ${MASTER_ENTITIES.length} รายการ (จาก master_data.py)`,
      sub: `${MASTER_META.active} ACTIVE · ${MASTER_META.unknown} UNKNOWN · ${MASTER_META.revoked} REVOKED · Tax ID ไม่ซ้ำ ${MASTER_META.taxIds} ค่า · sync ${esc(
        MASTER_META.syncedAt,
      )}`,
      actions: `<span class="muted small">ตารางรหัสบริษัท (AH/AHT/AM…) เป็น config ฝั่ง portal — master ไม่มี column นี้</span>`,
      body:
        filterBar([
          searchBox("q", f.q, "ชื่อ / ORG_ID / Tax ID", "rules"),
          selectBox("ms", f.status, "สถานะ", [["", "ทั้งหมด"], ["ACTIVE", "ACTIVE"], ["UNKNOWN", "UNKNOWN"], ["INACTIVE", "INACTIVE"], ["REVOKED", "REVOKED"]], "rules"),
        ]) +
        table({ head: ["ORG_ID", "ชื่อนิติบุคคล", "Tax ID", "สถานะใน master", "รหัสบริษัทใน portal"], rows }) +
        note(
          `engine map บริษัทจาก ORG_ID → Tax ID เท่านั้น ถ้าสถานะไม่ใช่ ACTIVE หรือ Tax ID ไม่มีในตาราง portal ผลคือ <code>manual_review</code>/<code>UNMAPPED</code> และบล็อกการตั้งหนี้ — ${
            Object.keys(COMPANY_BY_TAX).length
          } Tax ID ถูกผูกรหัสไว้แล้ว`,
          "muted",
        ),
    }),
    card({
      title: "ความถี่รหัสข้อยกเว้นในข้อมูลเดโม",
      sub: "นับจาก 24 snapshot (latest revision ของแต่ละเอกสาร) — บอกว่าควรเทสต์อะไรต่อ",
      body: table({
        head: ["รหัส", "severity (as-built)", "ความถี่", "งานของ"],
        rows: freq.map((x) => {
          const meta = { userTask: USER_TASK_CODES.includes(x.code) };
          return `<tr><td>${code(x.code)}</td><td>${sevBadge(x.severity)}</td><td class="num">${x.n}</td>
            <td>${meta.userTask ? badge("ผู้ใช้", "user") : badge("บัญชี", "info")} <span class="muted small">${esc(EXCEPTION_CODES_AS_BUILT[x.code]?.desc ?? "(ไม่มีใน master)")}</span></td></tr>`;
        }),
      }),
    }),
  ].join("");
}
