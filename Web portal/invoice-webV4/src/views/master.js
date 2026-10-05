/**
 * views/master.js — ข้อมูลหลักที่ portal ใช้ (read-only) + catalog กฎ + tolerance as-built
 */

import { esc, card, table, badge, note } from "../ui/dom.js";
import { sevBadge, dt, code } from "../ui/format.js";
import { MASTER_ENTITIES, MASTER_META, EXCEPTION_CODES_AS_BUILT, USER_TASK_CODES, STANDARD_RULES } from "../data/master-data.js";
import { COMPANY_BY_TAX } from "../domain/company.js";
import { RULE_CATALOG, ALL_RULE_IDS } from "../domain/ruleCatalog.js";

export function render(ctx) {
  const { store, filters } = ctx;
  const f = { q: "", onlyActive: "", onlyMapped: "", ...(filters ?? {}) };
  const b = store.bundle_meta;

  const taxToCompany = new Map(Object.entries(COMPANY_BY_TAX).map(([t, c]) => [t, c]));
  const usedOrgs = new Map(store.list().map((d) => [String(d.current.receipt?.org_id ?? "-"), d.company]));

  const entRows = MASTER_ENTITIES.filter((e) => {
    if (f.onlyActive === "1" && e.status !== "ACTIVE") return false;
    const mapped = taxToCompany.get(e.taxId);
    if (f.onlyMapped === "1" && !mapped) return false;
    if (f.q) {
      const hay = `${e.orgId} ${e.ouId} ${e.nameTh} ${e.taxId} ${e.postal} ${e.addressLine}`.toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    return true;
  })
    .slice(0, 60)
    .map((e) => {
      const comp = taxToCompany.get(e.taxId);
      return `<tr>
        <td class="num">${e.orgId}<div class="sub muted">OU ${e.ouId}</div></td>
        <td>${esc(e.nameTh)}</td>
        <td>${code(e.taxId)}</td>
        <td>${e.status === "ACTIVE" ? badge("ACTIVE", "ok") : badge(e.status, "bad")}</td>
        <td>${comp ? badge(comp.code, "muted") : `<span class="muted">ไม่ใช้ในเดโม</span>`}<div class="sub muted">${esc(comp?.name ?? "")}</div></td>
        <td>${usedOrgs.get(String(e.orgId)) ? badge("มีในงานเดโม", "info") : `<span class="muted">—</span>`}</td>
        <td class="small muted">${esc(e.addressLine ?? "")} · ${esc(e.postal ?? "")}</td>
      </tr>`;
    });

  const xRows = Object.entries(EXCEPTION_CODES_AS_BUILT).map(([c, v]) => {
    const isUser = USER_TASK_CODES.includes(c);
    const n = store.stats().codes.find((x) => x.code === c)?.n ?? 0;
    return `<tr>
      <td>${code(c, isUser ? "user" : "acc")}<div class="num muted">${n} ครั้ง</div></td>
      <td>${sevBadge(v.severity)}</td>
      <td class="small">${esc(v.desc)}</td>
      <td>${isUser ? badge("ผู้ใช้ (Receiver) ทำเอง", "user") : badge("ฝ่ายบัญชี", "info")}</td>
    </tr>`;
  });

  const tolRows = Object.entries(b.tolerance ?? {}).map(([k, v]) => {
    const label = {
      lineMath: "V-02 ผลต่างคณิตศาสตร์รายบรรทัด",
      docSum: "V-03 Σบรรทัด vs subtotal",
      vat: "V-03 VAT 7%",
      grand: "V-03 subtotal+VAT vs grand total",
      receiptTotal: "V-09 ยอดรวมใบรับ vs subtotal",
      pricePct: "V-07 ราคาต่าง (% ของราคาใบรับ)",
      priceAbs: "V-07 ราคาต่าง (บาท)",
      receiptSafetyCap: "V-04 จำนวนแถว SQL ปลอดภัย (เกิน = MANUAL)",
    }[k] ?? k;
    return `<tr><td>${esc(label)}</td><td class="num">${typeof v === "number" ? v : esc(v)}</td><td class="small muted">${
      {
        lineMath: "เกิน = E28 High แล้ว bypass ไม่เรียก Oracle",
        vat: "engine คาดหวัง 7% เสมอ — บิลไม่มี VAT จะโดน E31",
        pricePct: "E29 Low ถ้าอยู่ในกรอบทั้งสองข้อ",
        receiptSafetyCap: "fail-safe: ไม่เดา เมื่อแถวมากเกินไป",
      }[k] ?? ""
    }</td></tr>`;
  });

  const ruleRows = ALL_RULE_IDS.map((id) => {
    const m = RULE_CATALOG[id];
    return `<tr>
      <td>${code(id)}<div class="sub muted">ขั้น ${m.step}</div></td>
      <td><strong>${esc(m.name)}</strong><div class="sub">${esc(m.checks)}</div></td>
      <td>${m.codes.map((c) => code(c)).join(" ")}</td>
      <td class="small">${esc(m.asBuilt)}</td>
      <td>${STANDARD_RULES.includes(id) ? badge("อยู่ในมาตรฐาน", "ok") : badge("นอกมาตรฐาน", "warn")}</td>
    </tr>`;
  });

  return `
  ${card({
    title: `Master นิติบุคคล ${MASTER_META.entities} รายการ (ACTIVE ${MASTER_META.active})`,
    sub: `อ่านจาก <code>${esc(MASTER_META.source)}</code> ผ่าน tools/build-master-data.py — portal เขียนกลับไม่ได้`,
    actions: `<a class="btn sm ghost" href="#/dashboard">กลับ</a>`,
    body: `<div class="filters">
        <label class="filter grow"><span>ค้นหา</span><input data-filter="q" data-scope="master" value="${esc(f.q)}" placeholder="ชื่อบริษัท / ORG_ID / Tax_ID / รหัสไปรษณีย์"></label>
        <label class="switch"><input type="checkbox" data-filter="onlyActive" data-scope="master" value="1" ${f.onlyActive === "1" ? "checked" : ""}><span>เฉพาะ ACTIVE</span></label>
        <label class="switch"><input type="checkbox" data-filter="onlyMapped" data-scope="master" value="1" ${f.onlyMapped === "1" ? "checked" : ""}><span>เฉพาะที่ใช้ในเดโม</span></label>
      </div>
      ${note("การ map ใช้ <strong>Tax ID 13 หลัก</strong> จากแถวใบรับ → company code (AH/AHT/AHP/AM/MGP) · ถ้า ORG_ID หาย/ไม่ใช่ ACTIVE/Tax ID ไม่ตรง → <code>UNMAPPED</code> และ Portal จะห้ามตั้งหนี้", "info")}
      ${table({ head: ["ORG / OU", "ชื่อนิติบุคคล", "Tax ID", "สถานะ", "บริษัทในเดโม", "ใช้งาน", "ที่อยู่"], rows: entRows, empty: "ไม่พบรายการ" })}
      <p class="foot-note muted">แสดงสูงสุด 60 รายการ · ข้อมูลชุดนี้จำลองจากโครงสร้าง master จริง แต่ชื่อ/Tax ID เป็นข้อมูลสังเคราะห์ 🧪</p>`,
  })}

  <div class="grid-2">
    ${card({
      title: "รหัสข้อยกเว้น (as-built)",
      sub: `${Object.keys(EXCEPTION_CODES_AS_BUILT).length} รหัส · ${USER_TASK_CODES.length} รหัสที่เป็นงานของผู้ใช้: ${USER_TASK_CODES.join(", ")}`,
      body: table({ head: ["รหัส", "Severity", "ความหมาย", "เจ้าของงาน"], rows: xRows }),
    })}

    ${card({
      title: "Tolerance ที่ engine ใช้จริง",
      sub: `ส่งมากับ snapshot bundle · สร้าง ณ ${esc(dt(b.built_at))}`,
      body: table({ head: ["เกณฑ์", "ค่า", "ผลเมื่อเกิน"], rows: tolRows }),
    })}
  </div>

  ${card({
    title: "catalog 9 กฎ — สิ่งที่ตรวจ vs พฤติกรรม as-built",
    body: table({ head: ["กฎ", "สิ่งที่ตรวจ", "รหัสที่เป็นไปได้", "พฤติกรรมจริง (as-built)", "มาตรฐาน 6.2"], rows: ruleRows }),
  })}`;
}
