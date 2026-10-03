/* ---------------------------------------------------------------------------
 * tools/browser-check.js — ตรวจ mockup v3 ด้วย Chromium จริง (ไม่ใช่ DOM ปลอม)
 *
 *   node tools/browser-check.js
 *   BASE_URL=http://127.0.0.1:5190/ node tools/browser-check.js   (ตรวจตอนเปิดผ่าน server)
 *   PLAYWRIGHT_PATH=/path/to/playwright node tools/browser-check.js
 *
 * ต่างจาก smoke-test.js: ตัวนี้ใช้ browser จริง จึงจับสิ่งที่ DOM ปลอมจับไม่ได้
 *   - console error / uncaught exception ระหว่างเปลี่ยนหน้าจอ
 *   - ค่า undefined / NaN / [object Object] ที่โผล่มาจริงบนหน้าจอ
 *   - ปุ่ม disabled + title, คีย์ลัด, layout ที่ 390px (horizontal overflow)
 *   - ผลรวมของ state จริง (audit chain ยังต่อเนื่องหลังเปิด viewer/หลัง tamper demo)
 *
 * ต้องมี playwright ติดตั้งอยู่ (ไม่บังคับ) — ถ้าหาไม่เจอจะ exit 0 พร้อมบอกว่าข้าม
 * จุดที่หา playwright: ตัวแปรแวดล้อม PLAYWRIGHT_PATH > โฟลเดอร์ข้างเคียงของ repo
 * --------------------------------------------------------------------------- */
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const URL_BASE = process.env.BASE_URL || pathToFileURL(path.join(ROOT, "index.html")).href;

/* ---- หา playwright โดยไม่ผูกโฟลเดอร์นี้เข้ากับ node_modules ของโปรเจกต์อื่น ---- */
function loadPlaywright() {
  const cands = [];
  if (process.env.PLAYWRIGHT_PATH) cands.push(process.env.PLAYWRIGHT_PATH);
  cands.push(
    "playwright",
    path.join(ROOT, "../invoice-web-9054076/frontend/node_modules/playwright"),
    path.join(ROOT, "../../Web portal/invoice-web-9054076/frontend/node_modules/playwright")
  );
  for (const c of cands) {
    try { return require(c); } catch (_) { /* ลองตัวถัดไป */ }
  }
  return null;
}

const PW = loadPlaywright();
if (!PW) {
  console.log("ข้าม browser-check: ไม่พบ playwright (ติดตั้งแล้วชี้ด้วย PLAYWRIGHT_PATH หรือใช้ invoice-web-9054076/frontend)");
  process.exit(0);
}
const { chromium } = PW;

/* ----------------------------- เครื่องมือช่วย ----------------------------- */
let checks = 0;
const problems = [];
const notes = [];
const say = (m) => { notes.push(m); console.log("  · " + m); };
function chk(name, fn) {
  checks++;
  return fn()
    .catch((e) => problems.push(`${name}: ${String(e && e.message ? e.message : e).split("\n")[0]}`))
    .then(() => console.log((problems.length ? "  … " : "  ✓ ") + name));
}
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
const bad = (h) => /undefined|NaN|\[object Object\]/.test(h);
/* คลิกด้วย DOM จริงผ่าน evaluate — กันปัญหา strict selector/timezone ของ locale ไทย */
async function clickText(p, txt) {
  const done = await p.evaluate((t) => {
    const el = [...document.querySelectorAll("#app button, #mb button, #app .dmsl, #app a")]
      .find((x) => (x.innerText || "").trim().includes(t));
    if (!el) return false;
    el.click();
    return true;
  }, txt);
  ok(done, `ไม่พบปุ่ม/ลิงก์ "${txt}" บนหน้าจอ`);
}

(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  p.setDefaultTimeout(10000);
  const errs = [];
  p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));

  await p.goto(URL_BASE);
  await p.waitForTimeout(300);

  const users = await p.$$eval("#user option", (os) => os.map((o) => o.value));
  /* หน้าแต่ละผู้ใช้เข้าถึงได้จริงเท่าที่ nav เปิดให้ (nav ถูก RBAC ปิดตามสิทธิ์) */
  const pagesOf = () =>
    p.$$eval("#nav a", (as) =>
      as.map((a) => (a.getAttribute("onclick") || "").match(/go\(['"]([^'"]+)['"]\)/)).filter(Boolean).map((m) => m[1])
    );
  say(`${users.length} ผู้ใช้ · ${URL_BASE.startsWith("http") ? "http" : "file://"}`);

  /* ---------- 1) ความสะอาดของการเรนเดอร์ + ขอบเขตที่ nav เปิดให้ ---------- */
  await chk("ทุกผู้ใช้ × ทุกหน้าที่ nav เปิดให้ ไม่มี undefined/NaN/[object Object]", async () => {
    const hit = [];
    const reach = {};
    let seen = 0;
    for (const u of users) {
      await p.selectOption("#user", u);
      const g = await pagesOf();
      const role = await p.evaluate(() => ME.role);
      reach[role] = `${g.length} (${g.join(",")})`;
      for (const k of g) {
        await p.evaluate((x) => go(x), k);
        await p.waitForTimeout(30);
        seen++;
        const h = await p.$eval("#app", (e) => e.innerHTML);
        ok(h.length > 200, `หน้า ${k} ของ ${u} เกลี้ยงผิดปกติ (${h.length} ตัวอักษร)`);
        if (bad(h)) hit.push(`${u}/${k}`);
      }
    }
    Object.entries(reach).forEach(([r, v]) => say(`nav ของ ${r}: ${v} หน้า`));
    say(`รวม ${seen} จอที่ผู้ใช้กดได้ถึง`);
    ok(seen >= 18, `ไล่หน้าที่เข้าถึงได้น้อยเกิน (${seen} จอ)`);
    ok(Object.keys(reach).length >= 4, "ไม่พบบทบาทที่ nav ต่างกันพอจะสรุป RBAC");
    ok(hit.length === 0, "พบค่าเพี้ยนที่ " + hit.join(", "));
  });

  await chk("ทุกเอกสาร × ทุกแท็บ เรนเดอร์ครบไม่มีค่าเพี้ยน", async () => {
    await p.selectOption("#user", "u6");
    await p.evaluate(() => go("queue"));
    const docs = await p.evaluate(() => DOCS.map((d) => d.doc));
    const hit = [];
    for (const d of docs) {
      await p.evaluate((x) => pick(x), d);
      for (const t of ["sum", "lines", "rules", "evid", "hist", "json"]) {
        await p.evaluate((x) => setTab(x), t);
        await p.waitForTimeout(10);
        if (bad(await p.$eval("#detail", (e) => e.innerHTML))) hit.push(`${d}/${t}`);
      }
    }
    say(`ไล่ ${docs.length} ฉบับ × 6 แท็บ = ${docs.length * 6} จอ`);
    ok(hit.length === 0, "พบค่าเพี้ยนที่ " + hit.join(", "));
  });

  /* ---------- 2) task-first: การ์ดขั้นตอนถัดไป + เหตุผลของปุ่มที่ปิด ---------- */
  await chk("การ์ดขั้นตอนถัดไปบอกงาน/ผู้รับผิดชอบ/หลักฐาน และปุ่มที่ปิดมีเหตุผล", async () => {
    await p.selectOption("#user", "u4");
    await p.waitForTimeout(60);
    await p.evaluate(() => pick("AIVA-2609-0012"));
    await p.waitForTimeout(80);
    const txt = await p.$eval("#detail", (e) => e.innerText);
    ok(/ขั้นตอนถัดไป/.test(txt), "ไม่มีการ์ดขั้นตอนถัดไป");
    ok(/งานที่ต้องทำ/.test(txt), "การ์ดไม่บอกว่างานคืออะไร");
    ok(/separation of duties/.test(txt), "เอกสารที่ผู้แนบมีสิทธิ์ยืนยันเอง ต้องShows เหตุผล separation of duties");
    const closed = await p.$$eval(".bar button[disabled]", (bs) => bs.map((b) => b.title || ""));
    ok(closed.length >= 3, `ควรมีปุ่มที่ปิดอย่างน้อย 3 ปุ่ม (มี ${closed.length})`);
    ok(closed.every((t) => t.length >= 10), "มีปุ่มที่ disabled แต่ไม่มี title อธิบาย");
    say(`ปุ่มที่ปิดพร้อมเหตุผล ${closed.length} ปุ่ม · ตัวอย่าง: ${closed[0].slice(0, 60)}…`);
  });

  await chk("ADM (ผู้ดูแลระบบ) ตัดสินเองไม่ได้ แต่เห็นเหตุผลด้านสิทธิ์", async () => {
    await p.selectOption("#user", "u7");
    await p.waitForTimeout(60);
    await p.evaluate(() => pick("AIVA-2609-0008"));
    await p.waitForTimeout(60);
    const g = await p.evaluate(() => {
      const r = guards(DOCS.find((d) => d.doc === sel));
      return [r.confirm[0], r.confirm[1], r.post[0]];
    });
    ok(g[0] === false, "ADM ไม่มีสิทธิ์ CONFIRM แต่ guard อนุญาต");
    ok(/ไม่มีสิทธิ์/.test(g[1]), `เหตุผลต้องเป็นด้านสิทธิ์ ไม่ใช่ปล่อยเงียบ (${g[1]})`);
    ok(g[2] === false, "post ต้องปิดใน pilot นี้");
  });

  /* ---------- 3) revision snapshot ---------- */
  await chk("revision selector: ดูของเก่าเป็นอ่านอย่างเดียว และ JSON/PDF ตรงรุ่น", async () => {
    await p.selectOption("#user", "u5");
    await p.waitForTimeout(60);
    await p.evaluate(() => { go("queue"); pick("AIVA-2609-0015"); });
    await p.waitForTimeout(80);
    ok(!!(await p.$("select.revsel")), "ไม่มี selector เลือก revision");
    await p.selectOption("select.revsel", "1");
    await p.waitForTimeout(80);
    const txt = await p.$eval("#detail", (e) => e.innerText);
    ok(/snapshot ของ revision 1/.test(txt), "ไม่มี banner ระบุว่าดู snapshot เก่า");
    ok(/อ่านอย่างเดียว/.test(txt), "ไม่บอกว่าโหมดนี้เป็นอ่านอย่างเดียว");
    ok(!bad(txt), "ตอนดู revision เก่ามีค่าเพี้ยน");
    const hint = await p.$eval(".bar .hint", (e) => e.innerText);
    ok(/snapshot/.test(hint), "action bar ไม่เปลี่ยนเป็นโหมดอ่านอย่างเดียว");
    await p.evaluate(() => setTab("json"));
    const j = await p.$eval("#detail", (e) => e.innerText);
    ok(/"revision":\s*1/.test(j), "JSON snapshot ไม่ยอมเป็น revision ที่เลือก");
    ok(/"status":\s*"Review"/.test(j), "JSON ต้องเป็นผลตรวจของ revision นั้น");
    const back = await p.evaluate(() => {
      setRev("2");
      return { viewRev, rev: DOCS.find((d) => d.doc === sel).rev };
    });
    ok(back.viewRev === null && back.rev === 2, "กดกลับ revision ล่าสุดแล้วต้องคืนโหมดแก้ไข");
    say("revision เก่า: immutable + read-only · กลับล่าสุดได้");
  });

  /* ---------- 4) คิว: งานที่ต้องทำ / เรียง / แบ่งหน้า / งานของฉัน ---------- */
  await chk("คิว: งานที่ต้องทำครบทุกแถว + เรียงลำดับ + แบ่งหน้า", async () => {
    await p.selectOption("#user", "u6");
    await p.evaluate(() => go("queue"));
    await p.waitForTimeout(80);
    const before = await p.$$eval("#list .qi .inv", (es) => es.map((e) => e.innerText));
    const shown = await p.$$eval("#list .qi", (es) => es.length);
    ok(shown > 0 && shown <= 8, `คิวต้องแบ่งหน้าละไม่เกิน 8 (แสดง ${shown})`);
    const todos = await p.$$eval("#list .qi", (es) => es.filter((e) => e.querySelector(".todo")).length);
    ok(todos === shown, `ทุกรายการต้องมี “งานที่ต้องทำ” (${todos}/${shown})`);
    await p.selectOption("#sort", "amount");
    await p.waitForTimeout(60);
    const after = await p.$$eval("#list .qi .inv", (es) => es.map((e) => e.innerText));
    ok(before.join() !== after.join(), "เปลี่ยนตัวเรียงลำดับแล้วลำดับไม่เปลี่ยน");
    const pg = await p.$eval("#qpg", (e) => e.innerText.replace(/\s+/g, " ").trim());
    ok(/ถัดไป/.test(pg), "ไม่มีปุ่มเลื่อนหน้า: " + pg);
    say("pagination: " + pg);
    await clickText(p, "ถัดไป");
    await p.waitForTimeout(60);
    const page2 = await p.$$eval("#list .qi .inv", (es) => es.map((e) => e.innerText));
    ok(page2[0] !== after[0], "เลื่อนหน้าแล้วรายการต้องเปลี่ยน");
    await clickText(p, "ก่อนหน้า");
    await p.waitForTimeout(60);
  });

  await chk("KPI “งานของฉัน” ตรงกับจำนวนที่คิวแสดง", async () => {
    const r = await p.evaluate(() => {
      setFilt("mine");
      return {
        calc: DOCS.filter((d) => scopeCheck(d).ok && matchKpi(d, "mine")).length,
        shown: document.querySelectorAll("#list .qi").length,
      };
    });
    ok(r.calc === r.shown, `KPI = ${r.calc} แต่คิวแสดง ${r.shown}`);
    say(`งานของฉัน ${r.calc} ฉบับ`);
    await p.evaluate(() => setFilt("all"));
  });

  /* ---------- 5) audit: tamper-evident + export + deep link ---------- */
  await chk("audit chain ต่อเนื่อง และจับการแก้ไขบันทึกได้", async () => {
    await p.evaluate(() => go("audit"));
    await p.waitForTimeout(80);
    const cells = await p.$$eval(".hashc", (e) => e.length);
    ok(cells > 0, "ตาราง audit ไม่มีคอลัมน์ hash");
    ok(await p.evaluate(() => verifyChain().ok === true), "เริ่มต้น chain ต้องต่อเนื่อง");
    await clickText(p, "จำลองการแก้ไขบันทึก");
    await p.waitForTimeout(60);
    ok(await p.evaluate(() => verifyChain().ok === false), "หลังแก้บันทึก chain ต้องตรวจไม่ผ่าน");
    await clickText(p, "ตรวจความต่อเนื่องของบันทึก");
    await p.waitForTimeout(80);
    ok(/ตรวจไม่ผ่าน|ถูกแก้/.test(await p.$eval("#app", (e) => e.innerText)), "UI ไม่รายงานว่าการบันทึกถูกแก้");
    await p.evaluate(() => rechain());
    await clickText(p, "ตรวจความต่อเนื่องของบันทึก");
    await p.waitForTimeout(80);
    ok(/ต่อเนื่อง/.test(await p.$eval("#app", (e) => e.innerText)), "แก้กลับแล้ว chain ยังไม่รายงานต่อเนื่อง");
    say(`คอลัมน์ hash ${cells} เซลล์ · จำลองแก้ → จับได้ → กู้คืนแล้วต่อเนื่อง`);
  });

  await chk("ส่งออก CSV มีคอลัมน์ hash และดาวน์โหลดได้จริง", async () => {
    await clickText(p, "ส่งออก CSV");
    await p.waitForTimeout(150);
    const href = await p.$eval("#mb a[download]", (a) => a.getAttribute("href"));
    ok(/^data:text\/csv/.test(href), "ลิงก์ดาวน์โหลดไม่ใช่ data URL ของ CSV");
    const csv = decodeURIComponent(href.split(",")[1] || "");
    ok(/prev_hash/.test(csv) && /hash/.test(csv), "CSV ไม่มีคอลัมน์ hash");
    ok(!/undefined|\[object Object\]/.test(csv), "CSV มีค่า undefined ปนมา");
    say("CSV " + csv.split("\n").length + " บรรทัด (รวมหัวตาราง)");
    await p.keyboard.press("Escape");
    await p.waitForTimeout(60);
  });

  await chk("คลิกบันทึก audit แล้วเปิดเอกสารที่ถูกอ้างถึง", async () => {
    await p.evaluate(() => go("audit"));
    await p.waitForTimeout(80);
    const want = await p.evaluate(() => {
      const a = AUDIT.find((x) => DOCS.some((d) => d.doc === x.doc) && scopeCheck(x.doc ? DOCS.find((d) => d.doc === x.doc) : null).ok);
      auditOpen(a.doc);
      return { doc: a.doc, sel, page };
    });
    ok(want.sel === want.doc, `deep link ไม่เปิดเอกสารที่อ้าง (${want.sel} ≠ ${want.doc})`);
    say("deep link → " + want.sel);
  });

  /* ---------- 6) viewer ---------- */
  await chk("viewer: เล่มหน้า/ซูม/คีย์ลัด + นโยบายดาวน์โหลดปิด + access event", async () => {
    await p.evaluate(() => { go("queue"); pick("AIVA-2609-0013"); });
    await p.waitForTimeout(60);
    await p.evaluate(() => openViewer("AIVA-2609-0013", 1));
    await p.waitForTimeout(150);
    ok(/หน้า 1 \/ \d/.test(await p.$eval("#mb .vbar", (e) => e.innerText)), "ไม่มีตัวบอกเลขหน้า");
    await clickText(p, "🔍+");
    await p.waitForTimeout(60);
    ok(/1[0-9]{2}%/.test(await p.$eval("#mb .vbar", (e) => e.innerText)), "กดซูมแล้วเปอร์เซ็นต์ไม่เปลี่ยน");
    await p.keyboard.press("ArrowRight");
    await p.waitForTimeout(80);
    ok(/หน้า 2 \//.test(await p.$eval("#mb .vbar .pill", (e) => e.innerText)), "คีย์ลัด → ไม่เปลี่ยนหน้า");
    const dis = await p.$$eval("#mb .vbar button[disabled]", (bs) => bs.map((b) => b.title || ""));
    ok(dis.length >= 1 && dis[0].length > 10, "ปุ่มดาวน์โหลด/พิมพ์ต้องปิดพร้อมเหตุผลนโยบาย");
    say("policy: " + dis[0].slice(0, 60) + "…");
    await p.keyboard.press("Escape");
    await p.waitForTimeout(60);
    ok(await p.evaluate(() => AUDIT.some((a) => a.act === "open" && a.doc === "AIVA-2609-0013")), "เปิดเอกสารแล้วไม่มี access event");
    ok(await p.evaluate(() => verifyChain().ok === true), "access event ทำให้ chain ขาด");
  });

  /* ---------- 7) responsive + first paint ---------- */
  await chk("มือถือ 390px ไม่มี horizontal overflow", async () => {
    await p.setViewportSize({ width: 390, height: 780 });
    await p.waitForTimeout(180);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(over === 0, `มี overflow แนวนอน ${over}px`);
    await p.setViewportSize({ width: 1440, height: 950 });
  });

  await chk("โหลดครั้งแรกเปิดด้วยเอกสารในขอบเขตของผู้ใช้ที่ตั้งไว้ และไฮไลต์ในคิว", async () => {
    await p.reload();
    await p.waitForTimeout(250);
    const r = await p.evaluate(() => ({
      me: ME.email,
      sel,
      inScope: scopeCheck(DOCS.find((d) => d.doc === sel)).ok,
      hi: (document.querySelector("#list .qi.on .inv") || {}).innerText || "-",
    }));
    ok(r.inScope, `เอกสารตั้งต้น ${r.sel} อยู่นอกขอบเขตของ ${r.me}`);
    ok(r.hi !== "-", "คิวไม่ไฮไลต์เอกสารที่เปิดอยู่");
    say(`${r.me} → ${r.sel} (${r.hi})`);
  });

  await chk("ไม่มี console error / uncaught exception ตลอดการไล่หน้าจอ", async () => {
    ok(errs.length === 0, errs.slice(0, 5).join(" | "));
  });

  await browser.close();

  if (problems.length) {
    console.error(`\n✗ พบ ${problems.length} ปัญหาจาก ${checks} การตรวจ:`);
    problems.forEach((x) => console.error("  - " + x));
    process.exit(1);
  }
  console.log(`\n✓ ผ่าน ${checks} การตรวจด้วย Chromium จริง (${notes.length} ข้อสังเกต)`);
})().catch((e) => {
  console.error("✗ browser-check ล้มทั้งรัน: " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
