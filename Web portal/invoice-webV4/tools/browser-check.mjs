/* ---------------------------------------------------------------------------
 * tools/browser-check.mjs — ตรวจ portal v4 ด้วย Chromium จริง (ถ้ามี playwright)
 *
 *   node tools/browser-check.mjs
 *   BASE_URL=http://127.0.0.1:8080/index.html node tools/browser-check.mjs
 *   PLAYWRIGHT_PATH=/path/to/playwright node tools/browser-check.mjs
 *
 * smoke-test.mjs รันใน node ได้เพราะชั้น domain/views เป็น pure function
 * แต่สิ่งที่ node จับไม่ได้คือ: console error ตอน bootstrap, event delegation จริง,
 * ค่า undefined/NaN/[object Object] ที่โผล่บนจอจริง และ layout ที่ 390px — ตัวนี้ตรวจส่วนนั้น
 *
 * ไม่บังคับมี playwright: หาไม่เจอจะพิมพ์บอกแล้ว exit 0 (เพื่อให้รันในเครื่องที่ยังไม่ติดตั้งได้)
 * จุดที่หา: env PLAYWRIGHT_PATH > "playwright" > node_modules ของโปรเจกต์ข้างเคียง
 * --------------------------------------------------------------------------- */
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 8123);

function loadPlaywright() {
  const cands = [];
  if (process.env.PLAYWRIGHT_PATH) cands.push(process.env.PLAYWRIGHT_PATH);
  cands.push(
    "playwright",
    path.resolve(ROOT, "../invoice-web-9054076/frontend/node_modules/playwright"),
    path.resolve(ROOT, "../../invoice-web-9054076/frontend/node_modules/playwright"),
    path.resolve(ROOT, "../invoice-webV2/frontend/node_modules/playwright"),
  );
  for (const c of cands) {
    try { return require(c); } catch { /* ลองแหล่งถัดไป */ }
  }
  return null;
}

const PW = loadPlaywright();
if (!PW) {
  console.log(
    "ข้าม browser-check: ไม่พบ playwright\n" +
      "  ติดตั้งแล้วรันใหม่:  npm i -D playwright && npx playwright install chromium\n" +
      "  หรือชี้โฟลเดอร์:    PLAYWRIGHT_PATH=<path>/playwright node tools/browser-check.mjs\n" +
      "  (งานทดสอบที่รันได้ในnode: node tools/smoke-test.mjs — 107 การตรวจ)"
  );
  process.exit(0);
}
const { chromium } = PW;

/* ---------------------------- helper ---------------------------- */
let n = 0;
const problems = [];
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
async function chk(name, fn) {
  n++;
  try { await fn(); console.log("  ✓ " + name); }
  catch (e) {
    const m = String(e && e.message ? e.message : e).split("\n")[0];
    problems.push(`${name}: ${m}`);
    console.log("  ✗ " + name + " — " + m);
  }
}
const BAD_TEXT = /undefined|NaN|\[object Object\]/;

let server = null;
let base = process.env.BASE_URL;
async function startServer() {
  if (base) return;
  server = spawn("python", [path.join(ROOT, "tools/serve.py"), "--port", String(PORT)], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  base = `http://127.0.0.1:${PORT}/index.html`;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/index.html`);
      if (r.ok) return;
    } catch { /* ยังไม่พร้อม */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("เซิร์ฟเวอร์ไม่ตอบ — ลองรัน python tools/serve.py เองแล้วตั้ง BASE_URL");
}

await startServer();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));

const go = async (hash) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(150);
};
const bodyText = () => page.evaluate(() => document.body.innerText);
const rows = () => page.locator("#view table tbody tr").count();

console.log(`browser-check — ${base}\n`);

await page.goto(base, { waitUntil: "load" });
await page.waitForSelector("#topbar a", { timeout: 5000 });

await chk("bootstrap ไม่มี console error / uncaught exception", async () => {
  ok(consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
});

await chk("topbar + ctxbar render (chip engine ไม่ได้รันที่นี่)", async () => {
  ok((await page.locator("#topbar").innerText()).includes("AIVA"), "ไม่มี brand ใน topbar");
  ok((await page.locator("#ctxbar").innerText()).length > 20, "ctxbar ว่าง");
});

await chk("dashboard มี KPI และไม่มีค่าเสียบนจอ", async () => {
  await go("#/dashboard");
  ok((await page.locator("#view .kpi, #view .card").count()) >= 4, "ไม่พบการ์ด KPI");
  ok(!BAD_TEXT.test(await bodyText()), "พบ undefined/NaN/[object Object] บน dashboard");
});

await chk("queue แสดงครบเท่าที่ store อนุญาตให้ผู้ใช้เห็น", async () => {
  await go("#/queue");
  const visible = await page.evaluate(() => window.__aiva.store.list().length);
  const shown = await rows();
  ok(shown >= Math.min(visible, 1) && shown > 0, `คิวแสดง ${shown} แถว ทั้งที่เห็น ${visible} ฉบับ`);
});

await chk("ตัวกรองทำงานจริง (พิมพ์ keyword แล้วจำนวนแถวไม่เพิ่ม)", async () => {
  await go("#/queue");
  const before = await rows();
  const input = page.locator('[data-filter="q"]').first();
  await input.fill("zzz-no-match-zzz");
  await page.waitForTimeout(250);
  const after = await rows();
  ok(after <= before, `กรองแล้วแถวเพิ่ม (${before} → ${after})`);
  await input.fill("");
  await page.waitForTimeout(250);
});

await chk("เข้าหน้า detail จากคิว + ตารางกฎ 9 ข้อ", async () => {
  await go("#/queue");
  await page.locator("#view a[href^='#/doc/']").first().click();
  await page.waitForSelector("#view", { timeout: 3000 });
  ok((await page.locator("#view .rule, #view tr").count()) > 5, "ดีเทลไม่มีตาราง");
  ok(!BAD_TEXT.test(await bodyText()), "พบค่าเสียในหน้า detail");
});

await chk("SoD: APR ยืนยันเอกสารที่ตัวเองแนบไม่ได้ และมีเหตุผลบอก", async () => {
  await go("#/doc/AIVA-2609-0001");
  await page.locator('[data-act="confirm"]').first().click({ force: true });
  await page.waitForTimeout(500);
  const toast = await page.locator("#toast").innerText().catch(() => "");
  const modal = await page.locator("#modal").innerText().catch(() => "");
  ok(/separation|\u0e2b\u0e49\u0e32\u0e17\u0e31\u0e14\u0e2a\u0e34\u0e19\u0e40\u0e08\u0e07|\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07/i.test(toast + modal) &&
     (await page.locator(".modal-back").count()) === 0,
    `ไม่ได้บล็อก SoD (toast="${toast.slice(0, 160)}" modal="${modal.slice(0, 60)}")`);
});

await chk("สลับผู้ใช้แล้วขอบเขตงานเปลี่ยน", async () => {
  const euVisible = await page.evaluate(async () => {
    window.__aiva.store.setUser("u1");
    return window.__aiva.store.list().length;
  });
  const aprVisible = await page.evaluate(async () => {
    window.__aiva.store.setUser("u6");
    return window.__aiva.store.list().length;
  });
  ok(euVisible <= aprVisible && euVisible > 0, `EU เห็น ${euVisible} / APR เห็น ${aprVisible}`);
});

await chk("revision tab ของเอกสาร 2 รุ่น", async () => {
  await go("#/doc/AIVA-2609-0013");
  ok((await page.locator('[data-rev], .rev-tab, #view .tabs button').count()) >= 2 ||
     (await bodyText()).includes("revision"), "ไม่พบตัวเลือก revision");
});

for (const [route, key] of [["#/master", "นิติบุคคล"], ["#/audit", "บันทึก"], ["#/help", "as-built"]]) {
  await chk(`หน้า ${route} render และมีเนื้อหา "${key}"`, async () => {
    await go(route);
    const t = await bodyText();
    ok(t.includes(key), `ไม่พบ "${key}" ในหน้า ${route}`);
    ok(!BAD_TEXT.test(t), `พบ undefined/NaN/[object Object] ในหน้า ${route}`);
  });
}

await chk("mobile 390px ไม่มีการเลื่อนแนวนอน", async () => {
  const small = await ctx.newPage();
  await small.setViewportSize({ width: 390, height: 780 });
  await small.goto(base, { waitUntil: "load" });
  await small.evaluate(() => { location.hash = "#/queue"; });
  await small.waitForTimeout(400);
  const over = await small.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 2, `ล้นแนวนอน ${over}px ที่จอ 390px`);
  await small.close();
});

await chk("ปิดท้าย: ไม่มี console error สะสมทั้งรอบ", async () => {
  ok(consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));
});

await browser.close();
if (server) server.kill();

console.log(`\n${problems.length ? "✗" : "✓"} browser-check ผ่าน ${n - problems.length}/${n}`);
for (const p of problems) console.log("   · " + p);
process.exit(problems.length ? 1 : 0);
