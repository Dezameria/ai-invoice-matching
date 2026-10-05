/**
 * domain/workflow.js — state machine ของ "สถานะงาน" (แยกจาก "ผลการตรวจ" ของ engine)
 *
 * หลักการสำคัญ: ผลตรวจ (Auto-pass/Review/Hold/Manual Review) เป็นของ engine — แก้ไม่ได้
 * สถานะงาน (PENDING_REVIEW/ON_HOLD/...) เป็นของ portal — เปลี่ยนได้ด้วย action ที่ถูกกติกาเท่านั้น
 * ทุกรายการผ่าน optimistic version: ถ้า version ไม่ตรง = มีคนทำไปก่อน → ปฏิเสธแล้วให้ reload
 */

export const WF = {
  PENDING_REVIEW: "รอตรวจ",
  ON_HOLD: "กักไว้ (On Hold)",
  RESUBMITTED: "ส่งตรวจใหม่ (รอ revision)",
  CONFIRMED: "ยืนยันแล้ว",
  REJECTED: "ปฏิเสธแล้ว",
};

export const WF_TONE = {
  PENDING_REVIEW: "warn",
  ON_HOLD: "bad",
  RESUBMITTED: "info",
  CONFIRMED: "ok",
  REJECTED: "muted",
};

/** action → from[] → to */
const TRANSITION = {
  hold: { from: ["PENDING_REVIEW", "RESUBMITTED"], to: "ON_HOLD", needNote: true },
  release: { from: ["ON_HOLD"], to: "PENDING_REVIEW", needNote: true },
  resubmit: { from: ["PENDING_REVIEW", "ON_HOLD", "RESUBMITTED"], to: "RESUBMITTED", needNote: true },
  confirm: { from: ["PENDING_REVIEW"], to: "CONFIRMED", needNote: true },
  reject: { from: ["PENDING_REVIEW", "ON_HOLD", "RESUBMITTED"], to: "REJECTED", needNote: true },
  post: { from: ["CONFIRMED"], to: "POSTED", needNote: false },
};

export const ACTIONS = Object.keys(TRANSITION);

/** งานที่ "ปิดแล้ว" ไม่ให้ action ใดเหลืออยู่เลย (นอกจากดู audit) */
export function isTerminal(status) {
  return status === "REJECTED";
}

export function transitionFor(action) {
  return TRANSITION[action] ?? null;
}

export function canTransition(status, action) {
  const t = transitionFor(action);
  if (!t) return { ok: false, reasons: [`ไม่มีการย้ายสถานะสำหรับ action "${action}"`] };
  if (status === "POSTED") return { ok: false, reasons: ["เอกสารถูกส่งตั้งหนี้ไปแล้ว — ปิดงานถาวร"] };
  if (!t.from.includes(status)) {
    const from = t.from.map((s) => `${s} (${WF[s]})`).join(" หรือ ");
    return { ok: false, reasons: [`สถานะงานปัจจุบัน "${WF[status] ?? status}" ทำ action นี้ไม่ได้ — ต้องอยู่ใน ${from}`] };
  }
  return { ok: true, reasons: [], to: t.to, needNote: t.needNote };
}

/**
 * จำลองคำขอ resubmit ออกไปนอกระบบ (outbox) — portal ไม่รัน OCR เอง
 * waiting_revision คือ revision ถัดไปที่รอรับจาก producer
 */
export function makeOutboxEntry(doc, action, at, actorId) {
  const revision = doc.current?.revision ?? 1;
  return {
    event_id: `EVT-${String(doc.document_id).slice(-4)}-${action.toUpperCase()}-${revision + 1}`,
    event_type: action === "resubmit" ? "RESUBMIT_REQUEST" : "RERUN_REQUEST",
    document_id: doc.document_id,
    created_by: actorId,
    created_at: at,
    waiting_revision: revision + 1,
    status: "PENDING",
    attempts: 1,
    max_attempts: 5,
    last_error: null,
    queued_at: at,
  };
}

/** ปิด outbox เมื่อ revision ที่รอเข้ามาจริง */
export function closeOutbox(outbox = [], revision, at) {
  let closed = 0;
  const next = outbox.map((e) => {
    if (e.status === "PENDING" && e.waiting_revision === revision) {
      closed += 1;
      return { ...e, status: "DELIVERED", delivered_at: at, attempts: e.attempts };
    }
    return e;
  });
  return { outbox: next, closed };
}

/**
 * ตรวจ optimistic concurrency + ความสมบูรณ์ของ note
 * @returns {{ok:boolean, reasons:string[], next?:object}}
 */
export function applyWorkflow(doc, action, { user, note = "", expectedVersion, at }) {
  const reasons = [];
  const wf = doc.workflow ?? { status: "PENDING_REVIEW", version: 1 };
  if (Number.isInteger(expectedVersion) && expectedVersion !== wf.version) {
    reasons.push(`เวอร์ชันงานไม่ตรง (คุณเห็น v${expectedVersion} ระบบเป็น v${wf.version}) — มีผู้อื่นจัดการไปแล้ว กรุณารีเฟรช`);
  }
  const t = canTransition(wf.status, action);
  reasons.push(...t.reasons);
  const trimmed = String(note ?? "").trim();
  if (t.ok && t.needNote && trimmed.length < 5) {
    reasons.push("action นี้ต้องระบุเหตุผล ≥ 5 ตัวอักษร (จะบันทึกใน audit trail)");
  }

  if (reasons.length) return { ok: false, reasons };

  const next = {
    ...wf,
    status: t.to,
    version: wf.version + 1,
    heldBy: t.to === "ON_HOLD" ? user?.id ?? null : null,
    decidedBy: ["CONFIRMED", "REJECTED"].includes(t.to) ? user?.id ?? null : wf.decidedBy ?? null,
    note: trimmed || wf.note || null,
    updatedAt: at,
    updatedBy: user?.id ?? null,
    notes: [...(wf.notes ?? []), { ts: at, by: user?.id ?? null, action, text: trimmed || ACTION_FALLBACK[action] }],
  };
  if (t.to === "CONFIRMED") next.confirmedAt = at;
  const out = { ok: true, workflow: next, to: t.to, from: wf.status, action };
  if (action === "resubmit") out.outboxEntry = makeOutboxEntry(doc, action, at, user?.id ?? null);
  return out;
}

const ACTION_FALLBACK = {
  hold: "กักงานโดยไม่มีหมายเหตุ",
  release: "ปล่อยงานกลับเข้าคิว",
  resubmit: "ส่งตรวจใหม่",
  confirm: "ยืนยันเอกสาร",
  reject: "ปฏิเสธเอกสาร",
  post: "ส่งตั้งหนี้",
};

/** ปุ่มไหนควรถูก "เปิด" ตาม state อย่างเดียว (ไม่สนสิทธิ์) — ใช้ตรวจความสอดคล้องในเทสต์ */
export function actionsAllowedByState(status) {
  return ACTIONS.filter((a) => TRANSITION[a].from.includes(status) && status !== "POSTED");
}
