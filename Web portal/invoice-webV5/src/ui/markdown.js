/**
 * ui/markdown.js — แปลง markdown ของ repo ให้เป็น HTML ที่ portal แสดง
 *
 * ทำไมต้องมีไฟล์นี้: V5 ไม่ copy ข้อความมาตรฐานไปเขียนเป็น string ในโค้ด UI
 * ตัว render อ่าน markdown ต้นฉบับ (จาก src/data/repo-docs.js ซึ่ง sync.py คัดมา
 * จาก docs/*.md ของ repo) แล้วแสดงผล → ข้อความบนจอจึงตรงกับเอกสารใน repo ทุกตัวอักษร
 *
 * รองรับเฉพาะ syntax ที่ใช้ใน docs/ จริง: หัวข้อ · ตาราง · ลิสต์ · โคดบล็อก ·
 * inline code · ตัวหนา · ลิงก์ · blockquote · mermaid (แสดงเป็นโค้ด + ข้อความบอก)
 *
 * ความปลอดภัย: escape ทุกตัวอักษรก่อนวางลง HTML — markdown ใน repo ไม่ใช่ trusted input
 */

/* ตัวอ่าน markdown (parseTables/section/splitRow) อยู่ที่ domain/mdtext.js — ใช้ร่วมกันทั้ง domain และ ui */
import { splitRow, isDivider } from "../domain/mdtext.js";

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC_MAP[c]);

/* ------------------------------------------------------------------ *
 * inline
 * ------------------------------------------------------------------ */
function inline(text) {
  let s = escapeHtml(text);
  // `\|` ในตาราง = หลีกเลี่ยงการตัดเซลล์ → แสดงเป็น | ธรรมดา
  s = s.replace(/\\\|/g, "|");
  // โค้ดก่อน (กัน *และ* ในชื่อไฟล์ถูกแปลงเป็นตัวหนา)
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // [text](target) → portal เป็น static server ที่ข้ามโฟลเดอร์ repo ไม่ได้ จึงแสดงเป็น path อ้างอิง
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, target) => {
    const path = target.replace(/^file:\/\/\/c:[^ ]*?ai-invoice-matching[\\/]/i, "").replace(/^\.\.\/\.\.\/\.\.\//, "");
    return `<span class="ref" title="ต้นทางใน repo: ${escapeHtml(path)}">${label} <span class="ref-path">${escapeHtml(path)}</span></span>`;
  });
  // สูตรคณิตในมาตรฐาน (markdown เขียน $...$) → แสดงเป็น mono อ่านง่าย
  s = s.replace(/\$([^$\n]+)\$/g, '<span class="formula">$1</span>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
  return s.replace(/&lt;br\s*\/?&gt;/g, "<br>");
}

/* ------------------------------------------------------------------ *
 * slug สำหรับ anchor ในสารบัญ
 * ------------------------------------------------------------------ */
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^\w\u0e00-\u0e7f\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

/* ------------------------------------------------------------------ *
 * renderer
 * ------------------------------------------------------------------ */
/**
 * @param {string} markdown
 * @param {{headingIds?:boolean, skipH1?:boolean}} [opts]
 * @returns {{html:string, toc:{level:number,text:string,id:string}[]}}
 */
export function renderMarkdown(markdown, opts = {}) {
  const { skipH1 = false } = opts;
  const lines = String(markdown ?? "").split(/\r?\n/);
  const toc = [];
  const html = [];
  let i = 0;
  let para = [];
  let list = null; // {type:'ul'|'ol', items:string[]}

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (!list) return;
    const tag = list.type;
    html.push(`<${tag}>${list.items.map((it) => `<li>${inline(it)}</li>`).join("")}</${tag}>`);
    list = null;
  };
  const flushAll = () => {
    flushPara();
    flushList();
  };

  while (i < lines.length) {
    const line = lines[i];

    /* fenced code */
    if (/^```/.test(line)) {
      flushAll();
      const lang = line.slice(3).trim();
      const buf = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i += 1;
      const caption = lang === "mermaid" ? '<p class="code-note">diagram ต้นฉบับเป็น mermaid — แสดงเป็นโค้ด (แปลใน repo ได้)</p>' : "";
      html.push(`${caption}<pre class="code" data-lang="${escapeHtml(lang || "text")}"><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    /* table */
    if (line.includes("|") && i + 1 < lines.length && isDivider(lines[i + 1])) {
      flushAll();
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") rows.push(splitRow(lines[i++]));
      html.push(
        `<div class="md-table"><table><thead><tr>${header
          .map((h) => `<th>${inline(h)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr>${header.map((_h, c) => `<td>${inline(r[c] ?? "")}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`,
      );
      continue;
    }

    /* heading */
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushAll();
      const level = h[1].length;
      const text = h[2].trim();
      if (!(skipH1 && level === 1)) {
        const id = `md-${slug(text)}`;
        if (level >= 2 && level <= 3) toc.push({ level, text, id });
        html.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      }
      i += 1;
      continue;
    }

    /* hr / blockquote */
    if (/^\s*([-*_]){3,}\s*$/.test(line)) {
      flushAll();
      html.push("<hr>");
      i += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushAll();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      html.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    /* list */
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const type = ul ? "ul" : "ol";
      if (!list || list.type !== type) flushList();
      list = list ?? { type, items: [] };
      list.items.push((ul ?? ol)[1]);
      i += 1;
      continue;
    }

    /* blank / paragraph */
    if (line.trim() === "") {
      flushAll();
      i += 1;
      continue;
    }
    flushList();
    para.push(line.trim());
    i += 1;
  }
  flushAll();
  return { html: html.join("\n"), toc };
}

/** สารบัญย่อสำหรับ sidebar ของหน้าคู่มือ */
export function tocOf(markdown) {
  return renderMarkdown(markdown, { skipH1: true }).toc.filter((t) => t.level === 2);
}
