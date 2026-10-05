/**
 * domain/access.js — ใครเห็นอะไร และใครกดอะไรได้ (policy ชั้นที่ 1 จาก 3)
 *
 * ลำชั้น: access (สิทธิ์บทบาท) → workflow (state เครื่องจักร) → guards (หลักฐาน/ความเสี่ยง)
 * ทุกชั้นคืน reasons แบบอ่านได้ ให้ UI แสดง "เพราะอะไรปุ่มนี้ถึงปิด" เสมอ (ห้ามปิดเงียบ)
 *
 * 🧪 ผู้ใช้ทั้งหมดเป็นข้อมูลสมมติ ใช้ชื่อ-สกุลตาม mockup v4.4 แต่ปรับบทบาทให้ตรงกับนโยบายที่ตกลง
 */

export const ROLE_LABEL = {
  EU: "ผู้ใช้คำขอ (Receiver / ผู้แนบเอกสาร)",
  ACC: "ฝ่ายบัญชี (ปฎิบัติการ)",
  APR: "หัวหน้างาน (ผู้อนุมัติ)",
  ADM: "ผู้ดูแลระบบ (เดโม)",
};

/** initials ใช้เทียบว่า "ใครแนบเอกสารนี้" ( separation of duties ) */
export const USERS = [
  { id: "u1", name: "SOMSAK JAIDEE", initials: "SOMSAK.J", role: "EU", companies: ["AH"], receiverName: "SOMSAK JAIDEE", team: "คลังวัตถุดิบ อยุธยา" },
  { id: "u2", name: "WILAIWAN SRISUK", initials: "WILAIWAN.S", role: "EU", companies: ["AHT"], receiverName: "WILAIWAN SRISUK", team: "คลัง Tooling" },
  { id: "u3", name: "THANAKORN MANKONG", initials: "THANAKORN.M", role: "EU", companies: ["AM", "MGP"], receiverName: "THANAKORN MANKONG", team: "คลัง เอเบิล / MGP" },
  { id: "u4", name: "PANIDA RATTANASIRI", initials: "PANIDA.R", role: "ACC", companies: ["AH", "AHT", "AHP", "AM", "MGP"], receiverName: null, team: "AP Officer" },
  { id: "u5", name: "KAMONWAN SUWANNAKUN", initials: "KAMONWAN.S", role: "ACC", companies: ["AH", "AHT", "AHP", "AM", "MGP"], receiverName: null, team: "AP Officer" },
  { id: "u6", name: "SOMCHAI PHUAPRAPAKORN", initials: "SOMCHAI.P", role: "APR", companies: ["AH", "AHT", "AHP", "AM", "MGP"], receiverName: null, team: "Assistant Manager, Accounting" },
  { id: "u7", name: "SYSTEM ADMINISTRATOR", initials: "ADMIN", role: "ADM", companies: ["AH", "AHT", "AHP", "AM", "MGP"], receiverName: null, team: "IT (เดโม)" },
];

export const ACTION_LABEL = {
  hold: "กักงาน (On Hold)",
  release: "ปล่อยกลับเข้าคิว",
  resubmit: "Resubmit ให้ OCR ตรวจใหม่",
  confirm: "ยืนยันเอกสาร",
  reject: "ปฏิเสธเอกสาร",
  post: "ส่งตั้งหนี้ที่ AP",
};

/** สิทธิ์ตามบทบาท — หมายเหตุ: 'post' ไม่มีบทบาทไหนทำได้จริง (สัญญาส่งต่อ AP ยังไม่สร้าง) */
const CAPABILITY = {
  EU: ["hold", "release", "resubmit"],
  ACC: ["hold", "release", "resubmit"],
  APR: ["hold", "release", "resubmit", "confirm", "reject", "post"],
  ADM: [],
};

const DECIDE_ACTIONS = ["confirm", "reject"];

export function userById(id) {
  return USERS.find((u) => u.id === id) ?? null;
}

/** EU เห็นเฉพาะงานของตัวเอง/บริษัทที่ถือ — ACC/APR/ADM เห็นหมด */
export function canSee(user, doc) {
  if (!user) return false;
  if (user.role !== "EU") return true;
  const receiver = doc.current?.receipt?.receiver ?? null;
  if (receiver && user.receiverName) return receiver === user.receiverName;
  // ไม่มี Receiver (เช่น E17) → ให้ EU ของบริษัทนั้นเห็นเพื่อให้ข้อมูลเพิ่มได้
  const assigned = doc.current?.decision?.assigned_to;
  return assigned === "user" && Boolean(doc.company) && user.companies.includes(doc.company);
}

export function visibleDocs(user, docs) {
  return docs.filter((d) => canSee(user, d));
}

/** คิว "งานของฉัน" = งานที่ engine มอบหมายให้ user + EU เป็นคนถือ */
export function isMyTask(user, doc) {
  if (!user || user.role === "EU") {
    return canSee(user, doc) && doc.current?.decision?.assigned_to === "user";
  }
  return false;
}

/**
 * @returns {{ok:boolean, reasons:string[], action:string}}
 */
export function canAct(user, doc, action) {
  const reasons = [];
  if (!user) reasons.push("ยังไม่เลือกผู้ใช้ที่ใช้งานอยู่");
  if (!ACTION_LABEL[action]) reasons.push(`ไม่รู้จัก action "${action}"`);
  if (user && !canSee(user, doc)) reasons.push(`เอกสารอยู่นอกขอบเขตที่เกี่ยวข้องกับคุณ (บริษัท ${doc.company})`);
  if (user && !CAPABILITY[user.role].includes(action)) {
    const need = Object.entries(CAPABILITY).find(([, list]) => list.includes(action))?.[0] ?? "APR";
    reasons.push(`บทบาท ${ROLE_LABEL[user.role]} ไม่มีสิทธิ์ "${ACTION_LABEL[action] ?? action}" — ต้องเป็น ${ROLE_LABEL[need]}`);
  }
  if (user && DECIDE_ACTIONS.includes(action) && doc.actor?.uploadedBy && doc.actor.uploadedBy === user.initials) {
    reasons.push(`Separation of duties: คุณ (${user.initials}) เป็นผู้แนบเอกสารนี้ ห้ามตัดสินเอง`);
  }
  return { ok: reasons.length === 0, reasons, action };
}

/** สรุปสิทธิ์ทุก action ของ doc หนึ่ง (UI ใช้ render ทั้งก้อน) */
export function actionMatrix(user, doc) {
  return Object.keys(ACTION_LABEL).map((action) => ({ action, label: ACTION_LABEL[action], ...canAct(user, doc, action) }));
}
