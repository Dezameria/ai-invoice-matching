/**
 * domain/audit.js — audit trail (append-only)
 *
 * portal จำลอง audit เป็น append-only list ใน localStorage
 * ของจริงต้องไปผูกกับ store ที่แก้ไม่ได้ (append-only + hash chain) — ดู docs/05 §7
 */

export const AUDIT_KIND = {
  WORKFLOW: "เปลี่ยนสถานะงาน",
  DECISION: "ยืนยัน/ปฏิเสธโดยผู้อนุมัติ",
  INGEST: "รับ snapshot ใหม่จาก producer",
  INGEST_REJECT: "ปฏิเสธ snapshot ที่ขอบเขต",
  DEDUP: "พบ event_id ซ้ำ (ไม่บันทึกซ้ำ)",
  DEMO: "การกระทำในโหมดเดโม",
  SYSTEM: "ระบบ",
};

/** เรียงจากใหม่ → เก่า */
export function newest(entries = []) {
  return [...entries].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
}

export function makeEntry({ at, actor, doc, action, kind = "WORKFLOW", from = null, to = null, version = null, note = "", detail = null }) {
  return {
    ts: at,
    actor_id: actor?.id ?? "system",
    actor_name: actor?.name ?? "system",
    actor_role: actor?.role ?? "SYSTEM",
    document_id: doc?.document_id ?? null,
    revision: doc?.current?.revision ?? null,
    action,
    kind,
    from,
    to,
    workflow_version: version,
    note: note ?? "",
    detail,
  };
}

export function forDocument(entries = [], documentId) {
  return newest(entries.filter((e) => e.document_id === documentId));
}

export function filterEntries(entries = [], { actorId = null, kind = null, documentId = null, q = "" } = {}) {
  const needle = String(q).trim().toLowerCase();
  return newest(
    entries.filter((e) => {
      if (actorId && e.actor_id !== actorId) return false;
      if (kind && e.kind !== kind) return false;
      if (documentId && e.document_id !== documentId) return false;
      if (needle) {
        const hay = `${e.document_id} ${e.action} ${e.note} ${e.actor_name} ${e.kind}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    }),
  );
}

export function auditSummary(entries = []) {
  const byKind = {};
  const byActor = {};
  for (const e of entries) {
    byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
    byActor[e.actor_name] = (byActor[e.actor_name] ?? 0) + 1;
  }
  return { n: entries.length, byKind, byActor };
}
