/**
 * domain/guards.js — ตรวจ "หลักฐาน + ความเสี่ยง" ก่อน action (policy ชั้นที่ 3)
 *
 * principle: fail-safe — ถ้าข้อมูลไม่ครบ/หลักฐานเก่า/snapshot ผิดสัญญา = ห้ามไปต่อ
 * ทุก guard ต้องมีข้อความอธิบายติดไปด้วย (UI แสดงเหตุผลใต้ปุ่มที่ปิด)
 */

import { CONTRACT_VERSION } from "./schema.js";

/** @typedef {{id:string, level:'block'|'warn'|'info', title:string, detail:string, blocks:string[]}} Guard */

const ALL_DECIDE = ["confirm", "reject", "post"];
const POST_ONLY = ["post"];
const CONFIRM_LIKE = ["confirm", "post"];

/**
 * เอกสารแนบ (PDF) ของ revision ปัจจุบันมีไหม / เป็นของ revision ไหน
 */
export function evidenceStatus(doc) {
  const rev = doc.current?.revision ?? 1;
  const pdfMap = doc.pdf ?? null;
  if (!pdfMap) return { state: "missing", rev, have: null, file_name: null, detail: "ไม่มีการแนบไฟล์ PDF เข้ามาเลย" };
  const keys = Object.keys(pdfMap).map(Number).sort((a, b) => b - a);
  if (keys.length === 0) return { state: "missing", rev, have: null, file_name: null, detail: "ไม่มีการแนบไฟล์ PDF เข้ามาเลย" };
  if (pdfMap[rev] || pdfMap[String(rev)]) {
    const meta = pdfMap[rev] ?? pdfMap[String(rev)];
    return { state: "current", rev, have: rev, file_name: meta.file_name, pages: meta.pages, uploaded_at: meta.uploaded_at };
  }
  const newest = keys[0];
  return {
    state: "stale",
    rev,
    have: newest,
    file_name: pdfMap[newest].file_name,
    uploaded_at: pdfMap[newest].uploaded_at,
    detail: `ไฟล์ที่แนบเป็นของ revision ${newest} แต่ผลการตรวจปัจจุบันคือ revision ${rev}`,
  };
}

/**
 * @param {object} doc record จาก store (มี current/schema/completeness/pdf/outbox/duplicates)
 * @returns {Guard[]}
 */
export function guards(doc) {
  const out = [];
  const snap = doc.current;
  if (!snap) {
    return [
      {
        id: "no-snapshot",
        level: "block",
        title: "ยังไม่มีการตรวจ",
        detail: "Portal ไม่เคยได้รับ snapshot ของเอกสารนี้ — ห้ามสรุปผลใด ๆ",
        blocks: ALL_DECIDE,
      },
    ];
  }

  const check = doc.schema?.[snap.revision] ?? null;
  if (check && !check.ok) {
    out.push({
      id: "schema-invalid",
      level: "block",
      title: `snapshot ไม่ผ่าน receiving contract v${CONTRACT_VERSION}`,
      detail: `${check.errors.length} ข้อผิดพลาด — ${check.errors.slice(0, 2).map((e) => `${e.path} ${e.message}`).join(" · ")}`,
      blocks: ALL_DECIDE,
    });
  }

  const comp = doc.completeness ?? { missing: [], notEvaluated: [], usable: true };
  if (!comp.usable) {
    out.push({
      id: "rules-absent",
      level: "block",
      title: "ไม่ได้รับผลตรวจ 9 กฎเลย",
      detail: "snapshot ไม่มีรายการใน rules — Portal แสดงเป็น “ไม่มีข้อมูล” และห้ามยืนยัน/ตั้งหนี้",
      blocks: ALL_DECIDE,
    });
  } else if (comp.missing.length) {
    out.push({
      id: "rules-partial",
      level: "block",
      title: `ผลตรวจไม่ครบ 9 กฎ (ขาด ${comp.missing.join(", ")})`,
      detail: "ไม่มีข้อมูล = ไม่ใช่ PASS — ต้องให้ต้นทางส่ง snapshot ใหม่ที่ครบ standard 6.2",
      blocks: CONFIRM_LIKE,
    });
  }
  if (comp.notEvaluated.length) {
    out.push({
      id: "rules-skipped",
      level: "warn",
      title: `บางกฎไม่ได้ถูกตรวจ: ${comp.notEvaluated.join(", ")}`,
      detail: "engine ข้ามบางข้อตามกติกา (เช่น bypass เมื่อพบ E28 หรือ fail-safe ของ V-04/V-05) — อ่านเหตุผลในแต่ละแถว",
      blocks: [],
    });
  }

  const ev = evidenceStatus(doc);
  if (ev.state === "missing") {
    out.push({
      id: "evidence-missing",
      level: "block",
      title: "ไม่มีไฟล์หลักฐาน (PDF) ของ revision นี้",
      detail: "การยืนยันต้องเห็นตัวเอกสารจริง — Portal ไม่ให้ยืนยันจากตัวเลขอย่างเดียว",
      blocks: CONFIRM_LIKE,
    });
  } else if (ev.state === "stale") {
    out.push({
      id: "evidence-stale",
      level: "block",
      title: "ไฟล์หลักฐานเป็นของ revision เก่า",
      detail: ev.detail,
      blocks: CONFIRM_LIKE,
    });
  }

  if ((doc.duplicates ?? []).length) {
    const dupConfirmed = doc.duplicates.filter((d) => d.workflowStatus === "CONFIRMED" || d.workflowStatus === "POSTED");
    out.push({
      id: "duplicate",
      level: dupConfirmed.length ? "block" : "warn",
      title: `เข้าคู่ซ้ำกับ ${doc.duplicates.map((d) => d.document_id).join(", ")}`,
      detail: dupConfirmed.length
        ? `คู่ซ้ำถูกยืนยันไปแล้ว (${dupConfirmed.map((d) => d.document_id).join(", ")}) — ห้ามตั้งหนี้ซ้ำสองครั้ง`
        : "ตรวจซ้ำฝั่ง Portal ด้วย supplier_name + invoice_num (engine ไม่ได้กันซ้ำให้) — ต้องเลือกฉบับตั้งหนี้เพียงฉบับเดียว",
      blocks: dupConfirmed.length ? CONFIRM_LIKE : [],
    });
  }

  const levels = (snap.matches ?? []).map((m) => m.match_level).filter(Boolean);
  if (levels.includes("M4")) {
    out.push({
      id: "match-fallback",
      level: "warn",
      title: "มีบรรทัดที่จับคู่ด้วย fallback (M4)",
      detail: "engine ใช้แถวแรกที่ active ให้ ซึ่งอาจผิดบรรทัด/ใช้แถวซ้ำได้ — ห้ามเชื่อ auto-pass โดยไม่มีคนตรวจ",
      blocks: [],
    });
  } else if (levels.includes("M3")) {
    out.push({
      id: "match-fuzzy",
      level: "info",
      title: "จับคู่ด้วย token ใน description (M3)",
      detail: "ความเสี่ยงกำกวมสูงกว่า M1/M2 — ควรเทียบกับภาพเอกสารก่อนยืนยัน",
      blocks: [],
    });
  }

  if (snap.document && snap.document.pages_complete === false) {
    out.push({
      id: "pages-incomplete",
      level: "warn",
      title: `อ่านเอกสารไม่ครบทุกหน้า (${snap.document.pages ?? "? "} หน้า)`,
      detail: "Vision อ่านได้บางส่วน — ตัวเลขที่แสดงอาจไม่ครบทั้งฉบับ",
      blocks: [],
    });
  }

  if (snap.invoice?.currency && snap.invoice.currency !== "THB") {
    out.push({
      id: "currency",
      level: "warn",
      title: `สกุลเงิน ${snap.invoice.currency} ไม่ใช่ THB`,
      detail: "engine ตรวจ VAT 7% และกรอบ 200 บาทกับค่าเดิมโดยไม่แปลงสกุลเงิน — ต้องเทียบอัตราที่ต้นทาง",
      blocks: [],
    });
  }

  if (snap.receipt && snap.receipt.company_mapped === false) {
    out.push({
      id: "company-unmapped",
      level: "warn",
      title: `map บริษัทไม่ได้ (${snap.receipt.company})`,
      detail: snap.receipt.company_reason ?? "ไม่มี ORG_ID/Tax ID ที่ตรงกับ master",
      blocks: POST_ONLY,
    });
  }

  const pending = (doc.outbox ?? []).filter((e) => e.status === "PENDING");
  if (pending.length) {
    out.push({
      id: "outbox-pending",
      level: "warn",
      title: `มีคำขอตรวจค้างอยู่ ${pending.length} รายการ (outbox)`,
      detail: pending.map((e) => `${e.event_id} รอ revision ${e.waiting_revision} · retry ${e.attempts}/${e.max_attempts}${e.last_error ? ` · ${e.last_error}` : ""}`).join(" · "),
      blocks: ["confirm"],
    });
  }

  out.push({
    id: "ap-contract",
    level: "block",
    title: "ยังไม่มีการเชื่อมต่อส่งตั้งหนี้ (Posting Gateway v1)",
    detail: "สัญญา API ฝั่ง AP/Oracle ยังไม่ถูกสร้าง — Portal หยุดที่ “ยืนยันแล้ว” เท่านั้น ไม่กดตั้งหนี้เอง",
    blocks: ["post"],
  });

  if (snap.provenance?.hand_authored) {
    out.push({
      id: "hand-authored",
      level: "info",
      title: "snapshot นี้เขียนมือ (ไม่ผ่าน engine)",
      detail: snap.provenance.reason ?? "",
      blocks: [],
    });
  }

  if (snap.status === "Auto-pass") {
    out.push({
      id: "auto-pass-approval",
      level: "info",
      title: "Auto-pass ยังต้องมี human approval 1 ครั้ง",
      detail: "ตามนโยบายที่ตกลง: ระบบไม่ตั้งหนี้อัตโนมัติแม้ engine จะ Auto-pass — ต้องมี APR กดยืนยันก่อน",
      blocks: [],
    });
  }

  return out;
}

/** guard ที่ "บล็อก" action นี้จริง ๆ */
export function blockingFor(doc, action) {
  return guards(doc).filter((g) => g.level === "block" && (g.blocks ?? []).includes(action));
}

/** ระดับความเสี่ยงรวม (ใช้ทำ badge ที่ list) */
export function riskLevel(doc) {
  const gs = guards(doc);
  if (gs.some((g) => g.level === "block")) return "block";
  if (gs.some((g) => g.level === "warn")) return "warn";
  return "ok";
}
