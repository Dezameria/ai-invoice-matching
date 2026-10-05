/**
 * tools/browser-check.mjs — เปิด portal ใน Microsoft Edge แล้วตรวจว่า render ได้จริง + ไม่มี JS error
 *
 *   node tools/browser-check.mjs                # เปิด server เอง แล้วเปิด report ในเบราว์เซอร์
 *   node tools/browser-check.mjs --no-browser-report   # ไม่เปิดหน้า report (ดูผลใน terminal อย่างเดียว)
 *
 * ใช้ Microsoft Edge ที่ติดตั้งอยู่แล้ว + CDP (Chrome DevTools Protocol) — ไม่มี dependency
 * สิ่งที่พักจากหน้าเว็บจริง:
 *   · console error / uncaught exception (รวม error ตอน load module)
 *   · ทุก route ต้อง mount สำเร็จและมีเนื้อหาที่ควรจะมี
 *   · switch user → คิวเหลือเฉพาะงานของตน
 *   · เปิดเอกสาร → กรอกเหตุผล → Hold → กลับหน้างานแล้วป้าย ON_HOLD อยู่จริง + audit เพิ่ม
 */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;

const findEdge = () => {
  const c = [
    process.env.PROGRAMFILES + "\\Microsoft\\Edge\\Application\\msedge.exe",
    (process.env["PROGRAMFILES(X86)"] || "") + "\\Microsoft\\Edge\\Application\\msedge.exe",
    (process.env.LOCALAPPDATA || "") + "\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
  return c.find((p) => existsSync(p));
};

const EDGE = findEdge();
if (!EDGE) {
  console.error("ไม่พบ Microsoft Edge — ข้ามการตรวจในเบราว์เซอร์ (ใช้ `node tools/smoke-test.mjs` แทน)");
  process.exit(0);
}

/* ---------- 1) static server ---------- */
const server = spawn("python", [path.join(ROOT, "tools", "serve.py"), "--port", String(PORT)], { stdio: ["ignore", "pipe", "inherit"] });
const waitForServer = async () => {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(BASE + "/index.html");
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 125));
  }
  throw new Error("server ไม่ตอบที่ " + BASE);
};

/* ---------- 2) CDP helper ---------- */
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.handlers = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
        this.handlers.forEach((h) => h(msg));
      }
    };
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    });
  }
  on(h) {
    this.handlers.push(h);
  }
  static async connect(url) {
    const ws = await new Promise((resolve, reject) => {
      const w = new WebSocket(url);
      w.onopen = () => resolve(w);
      w.onerror = () => reject(new Error("websocket ไปที่ Edge ไม่ได้"));
    });
    return new CDP(ws);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail: String(detail).slice(0, 400) });
  console.log(`  ${ok ? "+" : "x"} ${name}${ok ? "" : " — " + detail}`);
};

/* ---------- 3) run ---------- */
const profile = mkdtempSync(path.join(tmpdir(), "aiva-v5-edge-"));
if (!existsSync(path.join(ROOT, "tmp"))) mkdirSync(path.join(ROOT, "tmp"), { recursive: true });
const edge = spawn(EDGE, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], {
  stdio: ["ignore", "ignore", "pipe"],
});

let wsUrl = null;
const grabWsFromStderr = () =>
  new Promise((resolve) => {
    let buf = "";
    const onData = (d) => {
      buf += d.toString();
      const full = buf.match(/ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[0-9a-f-]+/);
      const loose = buf.match(/ws:\/\/127\.0\.0\.1:(\d+)\/devtools\//);
      if (full) {
        wsUrl = full[0];
        resolve();
      } else if (loose && !wsUrl) {
        wsUrl = `http://127.0.0.1:${loose[1]}/json/version`; // แล้วไปดึง webSocketDebuggerUrl อีกที
        resolve();
      }
    };
    edge.stderr.on("data", onData);
    setTimeout(resolve, 12000);
  });
await grabWsFromStderr();

if (!wsUrl) {
  console.error("ไม่เจอ ws endpoint ของ Edge (headless version อาจไม่รองรับ) — ข้าม browser-check");
  edge.kill();
  server.kill();
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
  process.exit(0);
}

try {
  await waitForServer();
  if (wsUrl.startsWith("http")) {
    const info = await (await fetch(wsUrl)).json();
    wsUrl = info.webSocketDebuggerUrl;
  }
  const cdp = await CDP.connect(wsUrl);
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

  const errors = [];
  cdp.on((e) => {
    if (e.sessionId !== sessionId) return;
    if (e.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(e.params.type)) {
      errors.push(`[console.${e.params.type}] ` + e.params.args.map((a) => a.description ?? a.value ?? a.type).join(" "));
    }
    if (e.method === "Runtime.exceptionThrown") {
      const d = e.params.exceptionDetails;
      errors.push("[exception] " + (d.exception?.description ?? d.text ?? "unknown"));
    }
    if (e.method === "Log.entryAdded" && ["error", "warning"].includes(e.params.entry.level)) {
      errors.push(`[log.${e.params.entry.level}] ${e.params.entry.text}`);
    }
  });

  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Log.enable", {}, sessionId);
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Network.enable", {}, sessionId);

  const failedRequests = [];
  cdp.on((e) => {
    if (e.sessionId !== sessionId) return;
    if (e.method === "Network.loadingFailed") failedRequests.push(`${e.params.type} ${e.params.errorText}`);
    if (e.method === "Network.responseReceived" && e.params.response.status >= 400) failedRequests.push(`HTTP ${e.params.response.status} ${e.params.response.url}`);
  });

  const evaluate = async (expr) => {
    const r = await cdp.send(
      "Runtime.evaluate",
      { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true },
      sessionId,
    );
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails.exception ?? r.exceptionDetails.text));
    return r.result.value;
  };
  const goto = async (hash) => {
    const here = await evaluate(`return location.pathname;`);
    if (here && here.endsWith("/index.html")) {
      // อยู่นอกเอกสารเดียวกันแล้ว: เปลี่ยน hash ตรง ๆ ให้ hashchange ของ app.js ทำงานแน่นอน
      await evaluate(`location.hash = ${JSON.stringify(hash)}; return true;`);
      await sleep(320);
      return;
    }
    await cdp.send("Page.navigate", { url: BASE + "/index.html" + hash }, sessionId);
    await sleep(520);
  };

  console.log("\nตรวจสอบใน Microsoft Edge (headless) ที่ " + BASE);

  await goto("#/");
  record("module โหลดครบ ไม่มี import ที่พัง (importmap-less ES modules)", (await evaluate(`return document.querySelectorAll("nav a").length;`)) >= 5);
  record("หน้างาน mount สำเร็จ มีตารางงาน", (await evaluate(`return document.querySelector("table") ? document.querySelectorAll("tbody tr").length : 0;`)) > 0, "ตารางงานว่างเปล่า");
  record("แถบ KPI มีตัวเลขจริง", (await evaluate(`return [...document.querySelectorAll(".kpi-v")].map(e=>e.textContent).join(",");`)).match(/\d/) !== null);
  record("ไม่มีการ print ออก console ตอน render ปกติ", errors.length === 0, errors.slice(0, 3).join(" ;; "));

  /* --- ทุก route ต้องมีเนื้อหา --- */
  /* ไล่ทุก route แล้วเช็คว่า “เปิดถูกแท็บ” + มีเนื้อหาที่ควรจะมี
     (ไม่ใช้ hex escape ไทย เพราะสะกดเพี้ยวง่าย → เทียบ label ที่เป็น ASCII/ตัวเลขแทน) */
  const routes = [
    { hash: "#/rules", tab: "V-01" },
    { hash: "#/rules?tab=exceptions", tab: "vs" },
    { hash: "#/rules?tab=decision", tab: "D1" },
    { hash: "#/rules?tab=master", tab: "Master data" },
    { hash: "#/manual", tab: "portal" },
    { hash: "#/manual?doc=rules-standard", tab: "Standard Specification" },
    { hash: "#/sources", text: /sha256/ },
    { hash: "#/audit", text: /append-only/ },
  ];
  for (const r of routes) {
    await goto(r.hash);
    const info = await evaluate(`return {
      hash: location.hash,
      active: [...document.querySelectorAll(".tab.on, [aria-selected=true]")].map((e) => e.textContent.trim()).join(" / "),
      txt: document.querySelector("main").innerText,
    };`);
    const okTab = !r.tab || info.active.includes(r.tab);
    const okTxt = !r.text || r.text.test(info.txt);
    record(
      `route ${r.hash} เปิดถูกแท็บ & มีเนื้อหา`,
      okTab && okTxt,
      `แท็บที่เปิด: ${info.active || "(หน้านี้ไม่มีแท็บ)"} · ต้องเจอ ${r.tab ? `label ที่มี “${r.tab}”` : String(r.text)}`,
    );
  }

  /* --- สลับผู้ใช้แล้วคิวต้องเปลี่ยน --- */
  await goto("#/");
  const before = await evaluate(`return document.querySelectorAll("tbody tr").length;`);
  await evaluate(`
    const sel = document.querySelector("[data-user]");
    sel.value = "u1"; sel.dispatchEvent(new Event("change", { bubbles: true }));
    return true;`);
  await sleep(300);
  const after = await evaluate(`return document.querySelectorAll("tbody tr").length;`);
  record("สลับผู้ใช้เป็น Receiver (u1) แล้วคิวเหลือเฉพาะงานของตน", after < before, `u6=${before} u1=${after}`);
  record("สลับผู้ใช้แล้วไม่มี error", errors.length === 0, errors.slice(0, 3).join(" ;; "));

  /* --- เปิดเอกสาร -> Hold -> ตรวจ overlay + audit --- */
  await evaluate(`
    const sel = document.querySelector("[data-user]");
    sel.value = "u4"; sel.dispatchEvent(new Event("change", { bubbles: true }));
    return true;`);
  await sleep(250);
  const openId = await evaluate(`
    const row = [...document.querySelectorAll("[data-open]")].find(el => {
      const href = "#/doc/" + el.getAttribute("data-open");
      return !href.includes("undefined");
    });
    if (!row) return null;
    const id = row.getAttribute("data-open");
    location.hash = "#/doc/" + id;
    return id;`);
  record("มีเอกสารให้เปิดจากคิว", openId, "ไม่พบ [data-open]");
  await sleep(450);
  record("สรุปงานมี link ไปแท็บงาน (ปุ่มทำงานอยู่ที่เดียว)", (await evaluate(`return !!document.querySelector('a[href*="tab=work"]');`)) === true, "ไม่พบ link ไป ?tab=work");
  await evaluate(`location.hash = location.hash.split("?")[0] + "?tab=work"; return true;`);
  await sleep(340);
  const acts = await evaluate(`return document.querySelectorAll("[data-act]").length;`);
  record("แท็บ “งาน & สถานะ” มีปุ่มงานครบทุก action", acts >= 6, `พบ ${acts} ปุ่ม`);
  record("ปุ่มที่ยังกดไม่ได้ต้องมีเหตุผลกำกับ", (await evaluate(`return document.querySelectorAll(".act .why").length;`)) > 0, "ปุ่ม is-disabled ไม่มีคำอธิบาย");
  record("หน้าเอกสารบอกที่มาข้อมูล (path + sha)", /master_data\.py/.test(await evaluate(`return document.querySelector("main").innerText;`)));

  const held = await evaluate(`
    const hold = document.querySelector('[data-act="hold"]');
    if (!hold || hold.disabled) return "no-hold";
    hold.click();
    const ta = document.querySelector(".modal-host textarea, .modal textarea");
    if (!ta) return "no-modal";
    ta.value = "ถือไว้เพื่อตรวจหลักฐานลายเซ็นกับต้นฉบับก่อนยืนยัน (ทดสอบ browser-check)";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    const okBtn = [...document.querySelectorAll(".modal-host button, .modal button")].find(b => /ยืนยัน|บันทึก|Hold|ส่ง/.test(b.textContent));
    if (!okBtn) return "no-confirm-button";
    okBtn.click();
    return "clicked";`);
  record("กรอกเหตุผลแล้วกดยืนยันการ Hold ได้ (modal ทำงาน)", ["clicked", "no-hold"].includes(held), "ค้างที่: " + held);
  if (held === "clicked") {
    await sleep(380);
    const wf = await evaluate(`return (document.body.innerText.match(/ON_HOLD|\\u0e01\\u0e31\\u0e01\\u0e07\\u0e32\u0e07/)||[])[0] ?? "";`);
    record("สถานะงานเปลี่ยนเป็น ON_HOLD บนหน้าจอจริง", wf !== "", "ไม่พบป้าย ON_HOLD");
    await goto("#/audit");
    record("audit แสดงเหตุการณ์ในหน้าประวัติการทำงาน", (await evaluate(`return document.querySelectorAll("tbody tr").length;`)) > 0, "ตาราง audit ว่างหลังทำ action");
  }

  /* --- ของเล่น: mock deliver + pdf viewer --- */
  await goto("#/");
  const deliver = await evaluate(`
    const b = document.querySelector('[data-demo="deliver"]');
    if (!b) return "no-button";
    b.click(); return "clicked";`);
  await sleep(420);
  record("ปุ่ม mock deliver เติม revision ใหม่ได้", deliver === "clicked" && errors.length === 0, deliver + " ;; " + errors.slice(-2).join(" ;; "));
  record("ตัวกรองบนหน้างานไม่ทำให้ตารางพังหลัง deliver", (await evaluate(`return document.querySelectorAll("tbody tr").length;`)) > 0);

  /* --- หลักฐาน PDF: portal ไม่มี viewer (repo รับได้แต่ .png จึงไม่มีไฟล์ PDF จริงให้เปิด)
       สิ่งที่ใช้ตรวจได้จริงคือ “สถานะหลักฐาน” ต้องขยับเมื่อเดโมแนบไฟล์เข้า revision ปัจจุบัน --- */
  await goto("#/");
  const evDoc = await evaluate(
    `const r = [...document.querySelectorAll("tr[data-ev]")].find((t) => t.getAttribute("data-ev") !== "current"); return r ? r.getAttribute("data-open") : "";`,
  );
  await goto(`#/doc/${evDoc || openId}?tab=evidence`);
  const beforeEv = await evaluate(`const e = document.querySelector("[data-evidence]"); return e ? e.getAttribute("data-evidence") : "(no marker)";`);
  const clicked = await evaluate(`const b = document.querySelector('[data-demo="pdf"]'); if (!b) return "no-button"; b.click(); return "clicked";`);
  await sleep(360);
  const afterEv = await evaluate(`const e = document.querySelector("[data-evidence]"); return e ? e.getAttribute("data-evidence") : "(no marker)";`);
  record(
    "เดโมแนบ PDF แล้วสถานะหลักฐานเป็น current",
    clicked === "clicked" && beforeEv !== "current" && afterEv === "current",
    `คลิก=${clicked} ก่อน=${beforeEv} หลัง=${afterEv}`,
  );
  record(
    "portal ไม่แกล้งทำ viewer PDF (ไม่มี iframe/embed ที่ไม่มีไฟล์จริง)",
    (await evaluate(`return document.querySelectorAll("object[type='application/pdf'], iframe[src*='pdf'], embed[type='application/pdf']").length;`)) === 0,
    "พบ element viewer โดยไม่มีไฟล์ PDF จริง",
  );
  await goto("#/");
  record("กลับมาหน้างานแล้วตารางยังอยู่ (router ไม่พัง)", (await evaluate(`return document.querySelectorAll("tbody tr").length;`)) > 0);

  record("ไม่มี 404 / request ที่ล้มเหลวระหว่างไล่ทุกหน้า", failedRequests.length === 0, failedRequests.slice(0, 4).join(" ;; "));
  record("ไม่มี console error / exception ตลอดรอบทดสอบ", errors.length === 0, errors.slice(0, 5).join(" ;; "));

  /* --- report --- */
  const failed = results.filter((r) => !r.ok);
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>browser-check report — invoice-webV5</title>
<style>body{font:15px/1.6 "Segoe UI", "IBM Plex Sans Thai", sans-serif;margin:30px;max-width:1050px;color:#17232f;background:#f4f6f8}
h1{margin:0 0 6px;font-size:22px}.sub{color:#5b6b7c;margin:0 0 14px}.sum{background:#fff;border:1px solid #dfe6ec;padding:12px 16px;margin:14px 0;border-radius:8px}
.pass{color:#0a7a3d}.fail{color:#c62828}ul{padding-left:20px}li{margin:5px 0}code{background:#eef2f6;padding:1px 5px;border-radius:3px;font:12.5px ui-monospace,Consolas,monospace}
pre{background:#0f1720;color:#d7e2ec;padding:12px;border-radius:8px;overflow:auto;font-size:12px}</style></head><body>
<h1>invoice-webV5 — browser-check report</h1>
<p class="sub">ตรวจผ่าน Microsoft Edge headless ผ่าน CDP ที่ ${BASE} · ${new Date().toISOString()}</p>
<div class="sum"><b>ผลรวม:</b> <span class="${failed.length ? "fail" : "pass"}">${failed.length ? "ไม่ผ่าน " + failed.length + " ข้อ" : "ผ่านทั้งหมด " + results.length + " ข้อ"}</span> · จำนวนข้อที่ตรวจทั้งหมด ${results.length} ข้อ</div>
${failed.length ? "<h2>ข้อที่ไม่ผ่าน</h2><ul>" + failed.map((r) => `<li class="fail">${r.name}<br><code>${r.detail}</code></li>`).join("") + "</ul>" : ""}
<h2>รายการที่ตรวจทั้งหมด</h2><ul>${results.map((r) => `<li class="${r.ok ? "pass" : "fail"}">${r.ok ? "ผ่าน" : "ไม่ผ่าน"}: ${r.name}${r.ok ? "" : ` — <code>${r.detail}</code>`}</li>`).join("")}</ul>
<h2>ข้อจำกัดของการตรวจนี้</h2>
<pre>· headless ไม่ตรวจการเลื่อนไหล/layout จริง — ยังต้องมองด้วยตา 1 รอบ
· ตรวจเฉพาะ route และ flow ที่เขียนไว้ในไฟล์นี้ ไม่ได้ทดสอบทุกเส้นทาง
· ข้อมูลที่เห็นเป็น mock ทั้งหมด ไม่ใช่ผลจาก OCR/DMS/AP จริง</pre>
</body></html>`;
  const reportPath = path.join(ROOT, "tmp", "browser-check-report.html");
  writeFileSync(reportPath, html);

  if (!process.argv.includes("--no-browser-report")) {
    const reportProfile = mkdtempSync(path.join(tmpdir(), "aiva-v5-report-"));
    const p2 = spawn(EDGE, ["--new-window", `--user-data-dir=${reportProfile}`, "--no-first-run", "--no-default-browser-check", "file:///" + reportPath.replace(/\\/g, "/")], { detached: true, stdio: "ignore" });
    p2.unref();
    await sleep(1000);
    rmSync(reportProfile, { recursive: true, force: true });
  }
  console.log(`\nreport: ${reportPath}`);
  console.log(results.length - failed.length + "/" + results.length + " ข้อที่ผ่านในเบราว์เซอร์");
} catch (err) {
  console.error("browser-check ล้มทั้งรัน:", err?.stack ?? err);
  process.exitCode = 2;
} finally {
  try {
    edge.kill();
  } catch {}
  try {
    server.kill();
  } catch {}
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
  } catch {}
}
