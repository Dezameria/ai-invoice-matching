/**
 * domain/mdtext.js — เครื่องมืออ่านข้อความ markdown (pure text ไม่มี DOM)
 *
 * แยกจาก ui/markdown.js เพราะ layer อื่น (domain/reference.js) ต้อง *อ่านค่า* จากตาราง
 * markdown ของ repo เพื่อเอา "มาตรฐาน 6.2" มาเทียบกับ as-built — การอ่านไม่ใช่การ render
 */

/** ตัดเซลล์ของแถวตาราง โดยเคารพ `\|` ที่ escape ไว้ในเนื้อหาสูตรคณิต */
export function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());
}

export function isDivider(line) {
  return /^\s*\|?[\s:|-]{3,}\|?\s*$/.test(line) && line.includes("-");
}

/**
 * อ่านตาราง markdown ทั้งหมดของเอกสาร
 * @param {string} markdown
 * @returns {Array<{header:string[], rows:string[][], after:number}>}
 */
export function parseTables(markdown) {
  const lines = String(markdown ?? "").split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (!lines[i].includes("|") || !isDivider(lines[i + 1])) continue;
    const header = splitRow(lines[i]);
    const rows = [];
    let j = i + 2;
    for (; j < lines.length; j += 1) {
      if (!lines[j].includes("|") || lines[j].trim() === "") break;
      rows.push(splitRow(lines[j]));
    }
    out.push({ header, rows, line: i + 1 });
    i = j;
  }
  return out;
}

/**
 * หาตารางที่ "มีคอลัมน์ตรงกับ head" ในเอกสาร (ไม่ใช้ index ตายตัว — เอกสารจะเรียงหัวข้อใหม่ก็ได้)
 * @param {string} markdown
 * @param {string[]} head คีย์ของคอลัมน์ที่ต้องการ (substring, case-insensitive)
 */
export function findTable(markdown, head) {
  const want = head.map((h) => h.toLowerCase());
  return (
    parseTables(markdown).find((t) =>
      want.every((k) => t.header.some((h) => stripMd(h).toLowerCase().includes(k))),
    ) ?? null
  );
}

/** ข้อความใต้หัวข้อที่มี `heading` (กินถึงหัวข้อระดับเดียวกัน/สูงกว่าถัดไป) */
export function section(markdown, heading) {
  const lines = String(markdown ?? "").split(/\r?\n/);
  const want = heading.toLowerCase();
  let level = 0;
  const body = [];
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      if (body.length && m[1].length <= level) break;
      if (!body.length && m[2].toLowerCase().includes(want)) {
        level = m[1].length;
        continue;
      }
      continue;
    }
    if (level) body.push(line);
  }
  return body.join("\n").trim();
}

/** ถอด markup markdown ให้เหลือแต่ข้อความ (ใช้เทียบค่า/ค้นหา) */
export function stripMd(text) {
  return String(text ?? "")
    .replace(/<br\s*\/?>/g, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\([|_*])/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** ดึงรหัส E05/E34 และรหัสกฎ V-01 จากข้อความ */
export const codesIn = (text) => [...new Set(String(text ?? "").match(/\bE\d{2}\b/g) ?? [])];
export const rulesIn = (text) => [...new Set(String(text ?? "").match(/\bV-\d{2}\b/g) ?? [])];
