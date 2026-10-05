/**
 * views/sources.js — "ที่มาข้อมูล": ทุกสิ่งที่ portal แสดง ชี้กลับไปที่ไฟล์ใน repo
 *
 * หน้านี้คือเหตุผลที่มี portal เวอร์ชันนี้: ผู้ใช้/ผู้ตรวจงานไม่ต้องถามว่า
 * "เลขนี้/ข้อความนี้เอามาจากไหน" — มี path + sha256 + เวลา sync + คำสั่ง re-sync แสดงครบ
 */

import { esc, card, table, badge, note, kv } from "../ui/dom.js";
import { code, dt, ago } from "../ui/format.js";
import { pageHead, tabs, sourceTag, statLine, chips } from "../ui/parts.js";
import { SOURCE_REGISTRY, SOURCES } from "../data/sources.js";
import { DESIGN_TOKENS } from "../data/design-tokens.js";
import { MASTER_META, EXCEPTION_CODES_AS_BUILT, USER_TASK_CODES, STANDARD_RULES } from "../data/master-data.js";
import { REPO_DOCS_INDEX } from "../data/repo-docs.js";
import { SNAPSHOT_BUNDLE } from "../data/snapshots.js";
import { CONTRACT_FIELDS, EXTENDED_FIELDS, CONTRACT_VERSION } from "../domain/schema.js";

const TABS = [
  ["", "ทะเบียนแหล่งข้อมูล"],
  ["howto", "วิธี generate & ตรวจ drift"],
  ["contract", "สัญญาข้อมูล & design token"],
];

export function render(ctx) {
  const tab = ctx.route.params.tab ?? "";
  const body = { "": registryTab(ctx), howto: howtoTab(), contract: contractTab() }[tab] ?? registryTab(ctx);
  return [
    pageHead({
      title: "ที่มาข้อมูล",
      sub: `portal เป็น read-only: ไม่มี path ใดในโค้ดที่เขียนกลับเข้า repo · sync ครั้งล่าสุด ${esc(SOURCE_REGISTRY.synced_at)}`,
      actions: `<span class="muted small">${SOURCES.length} แหล่ง → ${SOURCE_REGISTRY.generated.length} ไฟล์ generated</span>`,
    }),
    tabs({ base: "#/sources", value: tab, items: TABS }),
    `<div class="stack">${body}</div>`,
    sourceTag(["master-data", "rules-engine", "mockup"]),
  ].join("");
}

/* ------------------------------------------------------------------ */
function registryTab(ctx) {
  const rows = SOURCES.map(
    (s) => `<tr>
      <td>${code(s.id)}<div class="sub muted">${esc(s.role)}</div></td>
      <td><code>${esc(s.path)}</code>${s.note ? `<div class="sub muted">${esc(s.note)}</div>` : ""}</td>
      <td class="num">${s.lines}<div class="sub muted">${s.bytes.toLocaleString("th-TH")} bytes</div></td>
      <td><code title="${esc(s.sha256)}">${esc(s.sha256.slice(0, 12))}…</code></td>
      <td>${dt(s.mtime)}<div class="sub muted">${esc(ago(s.mtime))}</div></td>
      <td class="small">${chips(s.feeds, (f) => (f.startsWith("src/") ? "muted" : "teal"))}</td>
    </tr>`,
  );
  const gen = table({
    head: ["ไฟล์ generated", "มาจาก", "แล้วไปโผล่ที่"],
    rows: SOURCE_REGISTRY.generated.map((g) => {
      const hits = SOURCES.filter((s) => s.feeds.includes(g));
      const src = hits.map((s) => code(s.path));
      const where = [...new Set(hits.flatMap((s) => s.feeds))].filter((f) => !f.startsWith("src/"));
      return `<tr><td><code>${esc(g)}</code></td><td class="small">${src.join(" ") || `<span class="muted">สร้างโดย tools/build-snapshots.mjs</span>`}</td>
        <td class="small">${chips(where, () => "teal") || `<span class="muted">หน้าจอทั่วไป</span>`}</td></tr>`;
    }),
  });

  return [
    card({
      title: `แหล่งข้อมูลใน repo ที่ portal นี้อ่าน (${SOURCES.length} ไฟล์)`,
      sub: "sha256 เต็ม = tooltip บนค่าที่แสดง · ถ้าไฟล์ใน repo เปลี่ยน ค่านี้จะต่างจากในไฟล์ generated ทันที",
      actions: `<a class="btn sm ghost" href="#/sources?tab=howto">วิธีตรวจ drift</a>`,
      body: table({ head: ["id", "path ใน repo", "ขนาด", "sha256", "แก้ล่าสุดใน repo", "ป้อนให้"], rows }),
    }),
    card({
      title: "ไฟล์ generated ใน portal (ห้ามแก้ด้วยมือ)",
      sub: "ทุกไฟล์มี banner บอก tool + เวลา sync + path ต้นทางอยู่หัวไฟล์",
      body:
        gen +
        note(
          "ถ้าแก้ไฟล์ generated ด้วยมือ ครั้งหน้ารัน sync.py จะเขียนทับ — และเทสต์ <code>generated-drift</code> จะแจ้งก่อนใช้งาน",
          "warn",
        ),
    }),
    card({
      title: "กติกา sync ของ portal นี้",
      body: `<ul class="ticks">${SOURCE_REGISTRY.portal_rules.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`,
    }),
  ].join("");
}

/* ------------------------------------------------------------------ */
function howtoTab() {
  return [
    card({
      title: "คำสั่งที่ใช้สร้างข้อมูลทุกก้อนใน portal",
      sub: "รันจากโฟลเดอร์ <code>Web portal/invoice-webV5/</code> — ไม่มี build step, ไม่มี npm install",
      body: `<pre class="flow"># 1) ดึง master data + เอกสาร repo + design token เข้า src/data/ (read-only จาก repo)
python tools/sync.py

# 2) สร้าง snapshot ที่ portal แสดง = รัน engine mirror กับเคสสังเคราะห์ 22 เคส
node tools/build-snapshots.mjs

# 3) เทสต์ domain + สัญญา + ข้อห้ามทางสถาปัตยกรรม (รวมตรวจว่า generated ไฟล์ไม่เก่า)
node tools/smoke-test.mjs

# 4) เปิด portal (file:// ใช้ ES modules ไม่ได้ ต้องผ่าน http)
python tools/serve.py           # → http://127.0.0.1:8080

# 5) ตรวจอย่างเดียว (ใช้ก่อน commit — exit 1 เมื่อ source ใน repo ใหม่กว่าไฟล์ generated)
python tools/sync.py --check
node tools/build-snapshots.mjs --check</pre>
      ${note("ลำดับสำคัญ: <code>sync.py</code> ก่อน <code>build-snapshots.mjs</code> เสมอ เพราะเคสสังเคราะห์อ่าน exception catalog จาก master ที่ sync มา", "info")}`,
    }),
    card({
      title: "เมื่อไรต้อง re-sync",
      sub: "อาการที่บอกชัด ๆ + วิธีตรวจ",
      body: table({
        head: ["เมื่อ …", "ต้องรัน", "เพราะ"],
        rows: [
          ["<code>master_data.py</code> เปลี่ยน (นิติบุคคล/รหัส exception/ผัง owner)", "<code>python tools/sync.py</code>", "ตาราง master และคำอธิบายรหัสใน portal ล้าทันที"],
          ["<code>docs/*.md</code> เปลี่ยน (เกณฑ์/ตารางรหัส/decision matrix)", "<code>python tools/sync.py</code>", "หน้า คู่มือ + กฎ อ่านจาก markdown ที่คัดเข้ามา"],
          ["mockup เปลี่ยนชุดสี", "<code>python tools/sync.py</code>", "token ที่ app.css ใช้ถูกลอกมาจาก <code>:root</code> ของ mockup"],
          ["<code>rules.py</code> เปลี่ยน", "<code>node tools/build-snapshots.mjs</code> + mirror ใน <code>src/engine/rules.js</code>", "snapshot ทั้งหมดต้องถูก generate ใหม่ ผลตรวจใน portal ถึงจะตรงกับ engine"],
          ["เคสทดสอบเปลี่ยน (<code>tools/cases-*.mjs</code>)", "<code>node tools/build-snapshots.mjs</code>", "ตาราง “เดินเดโม” ในหน้าคู่มือสร้างจาก <code>expect</code> ของเคส"],
          ["ข้อมูลใน localStorage เพี้ยน", "ปุ่ม <em>รีเซ็ตเดโม</em> มุมขวาบน", "overlay งาน/audit อยู่ในเครื่องผู้ใช้ ไม่ใช่ system of record"],
        ].map(([a, b, c]) => `<tr><td class="small">${a}</td><td>${b}</td><td class="small">${esc(c)}</td></tr>`),
      }),
    }),
    card({
      title: "สิ่งที่ portal *ไม่* sync (และเหตุผล)",
      body: `<ul class="ticks">
        <li><strong>ไฟล์ PDF/JPG ต้นฉบับเอกสาร</strong> — repo นี้รับได้เฉพาะ .png และเอกสารจริงมีข้อมูลส่วนบุคคล → portal แสดงเฉพาะ metadata</li>
        <li><strong>ค่า threshold/tolerance จาก <code>rules.py</code></strong> — portal แสดงค่าที่มากับ snapshot metadata เท่านั้น ไม่ copy มาตั้งเอง (กันสองค่าไม่ตรงกัน)</li>
        <li><strong>log/สถานะจริงของ n8n</strong> — portal เป็นเดโม ไม่มี pipeline เชื่อมต่อ</li>
        <li><strong>ข้อมูลผู้ใช้จริง</strong> — ผู้ใช้ 7 คนเป็นสมมติ (ของจริงต้อง SSO/AD)</li>
      </ul>`,
    }),
  ].join("");
}

/* ------------------------------------------------------------------ */
function contractTab() {
  const bundle = SNAPSHOT_BUNDLE;
  const tokens = Object.entries(DESIGN_TOKENS.tokens);
  return [
    card({
      title: `receiving contract v${CONTRACT_VERSION}`,
      sub: "ตรวจที่ขอบเขตด้วย <code>src/domain/schema.js</code> — ไม่ผ่าน = แสดงได้แต่ห้ามใช้ตัดสินใจ",
      body:
        statLine([
          ["เอกสาร / snapshot", `${bundle.document_count} / ${bundle.snapshot_count}`, ""],
          ["snapshot ที่เขียนมือ", bundle.hand_authored_snapshots, bundle.hand_authored_snapshots ? "warn" : "ok"],
          ["มาตรฐาน / engine", `${bundle.standard_version} / mirror`, ""],
          ["contract", bundle.contract_version, "muted"],
        ]) +
        `<div class="two-col">
          <div><h4>ฟิลด์บังคับตามสัญญา v1.0 (${CONTRACT_FIELDS.length} ฟิลด์)</h4>
            <p class="small">${CONTRACT_FIELDS.map((f) => `<code>${esc(f)}</code>`).join(" ")}</p>
            <p class="muted small">เงินทุกฟิลด์เป็น decimal string · revision ต้องเพิ่มขึ้นเสมอ · status ได้ 4 ค่าเท่านั้น</p></div>
          <div><h4>ฟิลด์ส่วนขยาย (${EXTENDED_FIELDS.length} ฟิลด์ — portal ใช้ แต่สัญญายังไม่รองรับ)</h4>
            <p class="small">${EXTENDED_FIELDS.map((f) => `<code>${esc(f)}</code>`).join(" ")}</p>
            ${note("เรื่องค้างกับทีม OCR service: ทำให้ฟิลด์เหล่านี้อยู่ในสัญญา v1.1 หรือ portal ต้องมี UI ย่อส่วน", "warn")}</div>
        </div>`,
    }),
    card({
      title: "tolerance ที่ engine ใช้ (จาก snapshot metadata)",
      sub: "portal แสดงค่าเหล่านี้เท่าที่ snapshot ส่งมา — ไม่มีตัวเลขเกณฑ์ hardcode ใน UI",
      body: kv(Object.entries(bundle.tolerance).map(([k, v]) => [k, `<code>${esc(String(v))}</code>`]), 2),
    }),
    card({
      title: "design token — ลอกมาจาก mockup v4.4",
      sub: `<code>Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html</code> · :root ${tokens.length} ตัวแปร · smoke-test ตรวจว่า app.css ใช้ค่าตรงกัน`,
      body: `<div class="swatches">${tokens
        .filter(([k]) => /#[0-9a-fA-F]{3,8}|rgba?\(/.test(String(DESIGN_TOKENS.tokens[k])) && k.startsWith("--"))
        .map(([k, v]) => `<span class="swatch" title="${esc(k)}"><i style="background:${esc(v)}"></i><code>${esc(k)}</code><span class="muted">${esc(v)}</span></span>`)
        .join("")}</div>
        <p class="muted small">ฟอนต์ที่ mockup ใช้: ${chips(DESIGN_TOKENS.fonts, () => "mono")}</p>`,
    }),
    card({
      title: "master ที่ portal ฝังไว้ (as-built snapshot)",
      body: kv(
        [
          ["นิติบุคคล", `${MASTER_META.entities} (ACTIVE ${MASTER_META.active} · UNKNOWN ${MASTER_META.unknown} · REVOKED ${MASTER_META.revoked})`],
          ["Tax ID ไม่ซ้ำ", `${MASTER_META.taxIds} ค่า`],
          ["รหัส exception", `${MASTER_META.exceptionCodes} รหัส · เป็นงานของ user ${USER_TASK_CODES.length} รหัส`],
          ["กฎที่ engine ลงทะเบียน", STANDARD_RULES.map((r) => code(r)).join(" ")],
          ["ที่มา", `<code>${esc(MASTER_META.source)}</code> · sha ${esc(MASTER_META.sourceSha256)}…`],
          ["หมายเหตุของ master", esc(MASTER_META.docstring || "—")],
        ],
        2,
      ),
    }),
  ].join("");
}

