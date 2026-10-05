/**
 * store.js — ชั้นสถานะของ Portal (อ่าน snapshot + เก็บเฉพาะ "งาน" ที่ portal ผลิตเอง)
 *
 * สิ่งที่อยู่ใน localStorage: workflow, outbox, audit, snapshot ที่มาใหม่หลัง ingest
 * สิ่งที่ไม่เก็บ: ผลตรวจ/ข้อยกเว้น/การจับคู่ → มาจาก snapshot เท่านั้น (ห้ามคำนวณซ้ำ)
 *
 * โมดูลนี้ import ได้เฉพาะ domain/ + data/ — ห้าม import engine/ (มีเทสต์เฝ้า)
 */

import { SNAPSHOT_BUNDLE } from "../data/snapshots.js";
import { validateSnapshot, rulesCompleteness } from "./schema.js";
import { blockingFor } from "./guards.js";
import { canAct, userById } from "./access.js";
import { applyWorkflow, closeOutbox } from "./workflow.js";
import { makeEntry, newest, forDocument } from "./audit.js";

const STORAGE_KEY = "aiva.webv5.state.v1";  // แยกคีย์จาก v4 เพื่อไม่ให้ overlay ของสองเวอร์ชันชนกัน
const SEED = 2;

const DEFAULT_WORKFLOW = () => ({
  status: "PENDING_REVIEW",
  version: 1,
  heldBy: null,
  decidedBy: null,
  note: null,
  notes: [],
});

const isoNow = () => new Date().toISOString();

/**
 * @param {{bundle?:object, storage?:{getItem:Function,setItem:Function,removeItem:Function}, now?:Function, currentUser?:string}} opts
 */
export function createStore(opts = {}) {
  const bundle = opts.bundle ?? SNAPSHOT_BUNDLE;
  const storage = opts.storage !== undefined ? opts.storage : globalThis.localStorage;
  const now = opts.now ?? isoNow;
  const defs = new Map(bundle.documents.map((d) => [d.document_id, d]));
  const def_of = (d) => defs.get(d.document_id);

  let overlay = load();
  let docs = rebuild();

  /* ---------------------------------------------------------------- */

  function load() {
    let raw = null;
    try {
      raw = storage?.getItem?.(STORAGE_KEY) ?? null;
    } catch {
      raw = null;
    }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.seed === SEED) {
          return {
            userId: parsed.userId ?? null,
            docs: parsed.docs ?? {},
            audit: parsed.audit ?? [],
            seen: parsed.seen ?? {},
          };
        }
      } catch {
        /* overlay เสีย → เริ่มใหม่จาก bundle (ไม่ crash) */
      }
    }
    return fresh();
  }

  function fresh() {
    return { userId: opts.currentUser ?? "u6", docs: {}, audit: [], seen: {} };
  }

  function save() {
    try {
      storage?.setItem?.(STORAGE_KEY, JSON.stringify({ seed: SEED, ...overlay }));
    } catch {
      /* โควตาเต็ม/โหมด private → ทำงานใน memory ต่อ */
    }
  }

  function ov(id) {
    if (!overlay.docs[id]) overlay.docs[id] = { workflow: null, outbox: null, pdf: null, extra: [] };
    return overlay.docs[id];
  }

  function rebuild() {
    const list = bundle.documents.map((def) => build(def));
    for (const d of list) {
      d.duplicates = (def_of(d).duplicate_of ?? []).map((oid) => {
        const other = list.find((x) => x.document_id === oid);
        return { document_id: oid, workflowStatus: other?.workflow?.status ?? null, invoice_num: d.current?.invoice?.invoice_num };
      });
    }
    return list;
  }

  function build(def) {
    const o = overlay.docs[def.document_id] ?? {};
    const revisions = [...def.snapshots, ...(o.extra ?? [])];
    const schema = {};
    for (const s of revisions) if (!schema[s.revision]) schema[s.revision] = validateSnapshot(s);
    const usable = revisions.filter((s) => schema[s.revision].ok);
    const current = usable.at(-1) ?? revisions.at(-1);
    const completeness = rulesCompleteness(current?.rules ?? []);
    const workflow = o.workflow ?? def.seed_workflow ?? DEFAULT_WORKFLOW();
    return {
      document_id: def.document_id,
      dms_id: def.dms_id,
      title: def.title,
      actor: def.actor ?? {},
      pdf: o.pdf ?? def.pdf ?? null,
      pdf_synth: o.pdf ? false : Boolean(def.pdf_synth),
      hand_authored: Boolean(def.hand_authored),
      revisions,
      schema,
      completeness,
      current,
      workflow: { ...DEFAULT_WORKFLOW(), ...workflow },
      outbox: o.outbox ?? def.outbox ?? [],
      pending_snapshot: o.pending_delivered ? null : def.pending_snapshot ?? null,
      duplicates: [],
      company: current?.receipt?.company ?? "UNMAPPED",
      company_label: current?.receipt?.company_label ?? "map ไม่ได้",
      provenance: current?.provenance ?? null,
    };
  }

  function rewrap(id) {
    const def = defs.get(id);
    if (!def) return null;
    const doc = build(def);
    const idx = docs.findIndex((d) => d.document_id === id);
    if (idx >= 0) docs[idx] = doc;
    // คำนวณคู่ซ้ำใหม่ให้กระดานล่าสุด
    for (const d of docs) {
      d.duplicates = (defs.get(d.document_id).duplicate_of ?? []).map((oid) => {
        const other = docs.find((x) => x.document_id === oid);
        return { document_id: oid, workflowStatus: other?.workflow?.status ?? null, invoice_num: d.current?.invoice?.invoice_num };
      });
    }
    return doc;
  }

  /* ---------------------------------------------------------------- *
   * query
   * ---------------------------------------------------------------- */

  const api = {
    bundle_meta: {
      built_at: bundle.built_at,
      engine_version: bundle.engine_version,
      contract_version: bundle.contract_version,
      tolerance: bundle.tolerance,
      snapshot_count: bundle.snapshot_count,
      hand_authored_snapshots: bundle.hand_authored_snapshots,
    },
    list: () => docs,
    get: (id) => docs.find((d) => d.document_id === id) ?? null,
    audit: () => newest(overlay.audit),
    auditOf: (id) => forDocument(overlay.audit, id),
    seenEvents: () => Object.keys(overlay.seen).length,

    user() {
      return userById(overlay.userId);
    },
    setUser(id) {
      overlay.userId = id;
      save();
      return api.user();
    },

    /** ทุก action ผ่าน 3 ชั้น: access → workflow → guards + optimistic version */
    act(id, action, { note = "", expectedVersion = null } = {}) {
      const doc = api.get(id);
      if (!doc) return { ok: false, reasons: ["ไม่พบเอกสารในระบบ"] };
      const user = api.user();

      const a = canAct(user, doc, action);
      if (!a.ok) return { ok: false, stage: "access", reasons: a.reasons };

      const blocked = blockingFor(doc, action);
      if (blocked.length) {
        return { ok: false, stage: "guard", reasons: blocked.map((g) => `${g.title} — ${g.detail}`) };
      }

      const res = applyWorkflow(doc, action, {
        user,
        note,
        expectedVersion: expectedVersion ?? doc.workflow.version,
        at: now(),
      });
      if (!res.ok) return { ok: false, stage: "workflow", reasons: res.reasons };

      const o = ov(id);
      o.workflow = res.workflow;
      if (res.outboxEntry) o.outbox = [...(o.outbox ?? doc.outbox), res.outboxEntry];
      overlay.audit.push(
        makeEntry({
          at: now(),
          actor: user,
          doc,
          action,
          kind: ["confirm", "reject"].includes(action) ? "DECISION" : "WORKFLOW",
          from: res.from,
          to: res.to,
          version: res.workflow.version,
          note,
        }),
      );
      if (res.outboxEntry) {
        overlay.audit.push(
          makeEntry({
            at: now(),
            actor: user,
            doc,
            action: "outbox_enqueue",
            kind: "SYSTEM",
            version: res.workflow.version,
            note: ` queued ${res.outboxEntry.event_id} รอ revision ${res.outboxEntry.waiting_revision}`,
          }),
        );
      }
      save();
      const next = rewrap(id);
      return { ok: true, doc: next, workflow: res.workflow, reasons: [] };
    },

    /**
     * รับ snapshot ใหม่ (จุดเข้าเดียวของข้อมูลผลตรวจ)
     * ตรวจ contract → กันซ้ำด้วย event_id → กัน revision ถอยหลัง → แล้วจึงใช้แทนของเก่า
     */
    ingest(id, snapshot, { actor = null, kind = "INGEST", note = "" } = {}) {
      const doc = api.get(id);
      if (!doc) return { ok: false, reasons: ["ไม่พบเอกสารปลายทาง"] };
      const check = validateSnapshot(snapshot);
      if (!check.ok) {
        overlay.audit.push(
          makeEntry({
            at: now(),
            actor,
            doc,
            action: "ingest",
            kind: "INGEST_REJECT",
            note: `ปฏิเสธที่ขอบเขต: ${check.errors.map((e) => e.path).join(", ")}`,
            detail: check.errors,
          }),
        );
        save();
        return { ok: false, stage: "schema", reasons: check.errors.map((e) => `${e.path} — ${e.message}`), check };
      }
      if (overlay.seen[snapshot.event_id]) {
        overlay.audit.push(
          makeEntry({ at: now(), actor, doc, action: "ingest", kind: "DEDUP", note: `event_id ${snapshot.event_id} เคยรับมาแล้ว (${overlay.seen[snapshot.event_id]})` }),
        );
        save();
        return { ok: false, stage: "dedupe", reasons: [`event_id ${snapshot.event_id} ถูกประมวลผลไปแล้ว — ไม่บันทึกซ้ำ`] };
      }
      if (snapshot.revision <= doc.current.revision) {
        overlay.audit.push(
          makeEntry({ at: now(), actor, doc, action: "ingest", kind: "INGEST_REJECT", note: `revision ${snapshot.revision} ≤ ปัจจุบัน ${doc.current.revision}` }),
        );
        save();
        return { ok: false, stage: "monotonic", reasons: [`revision ต้องเพิ่มขึ้นเสมอ (ปัจจุบัน ${doc.current.revision} ได้รับ ${snapshot.revision})`] };
      }

      const o = ov(id);
      o.extra = [...(o.extra ?? []), snapshot];
      overlay.seen[snapshot.event_id] = now();

      const closed = closeOutbox(o.outbox ?? doc.outbox, snapshot.revision, now());
      o.outbox = closed.outbox;

      if (doc.workflow.status !== "REJECTED" && doc.workflow.status !== "POSTED") {
        o.workflow = {
          ...doc.workflow,
          status: "PENDING_REVIEW",
          version: doc.workflow.version + 1,
          heldBy: null,
          note: `รับ revision ${snapshot.revision} จาก ${snapshot.source_system} → กลับเข้าคิวตรวจ`,
          notes: [...(doc.workflow.notes ?? []), { ts: now(), by: "system", action: "ingest", text: `revision ${snapshot.revision} (${snapshot.status})` }],
        };
      }
      overlay.audit.push(
        makeEntry({
          at: now(),
          actor,
          doc,
          action: "ingest",
          kind,
          to: snapshot.status,
          version: o.workflow?.version ?? doc.workflow.version,
          note: note || `revision ${snapshot.revision} · ${snapshot.status} · ปิด outbox ${closed.closed} รายการ`,
        }),
      );
      save();
      const next = rewrap(id);
      return { ok: true, doc: next, closed: closed.closed, reasons: [] };
    },

    /** เดโม: จำลองว่า producer ส่ง revision ที่ค้างอยู่ใน outbox มาแล้ว */
    deliverPending(id) {
      const doc = api.get(id);
      if (!doc?.pending_snapshot) return { ok: false, reasons: ["ไม่มี revision ที่รอส่งของเอกสารนี้"] };
      const res = api.ingest(id, doc.pending_snapshot, { actor: api.user(), kind: "DEMO", note: "เดโม: จำลอง producer ส่ง revision ใหม่" });
      if (res.ok) {
        const o = ov(id);
        o.pending_delivered = true;
        save();
        return { ok: true, doc: rewrap(id), reasons: [] };
      }
      return res;
    },

    /** เดโม: จำลองว่าไฟล์ PDF ของ revision ปัจจุบันถูกอัปโหลดเข้ามา */
    attachPdf(id) {
      const doc = api.get(id);
      if (!doc) return { ok: false, reasons: ["ไม่พบเอกสาร"] };
      const o = ov(id);
      const rev = doc.current.revision;
      o.pdf = { ...(o.pdf ?? def_of(doc).pdf ?? {}), [rev]: { file_name: `${doc.dms_id}_r${rev}.pdf`, pages: doc.current.document?.pages ?? null, uploaded_at: now(), size_kb: 388 } };
      overlay.audit.push(makeEntry({ at: now(), actor: api.user(), doc, action: "attach_pdf", kind: "DEMO", note: `แนบหลักฐาน revision ${rev} (เดโม)` }));
      save();
      return { ok: true, doc: rewrap(id), reasons: [] };
    },

    /** เพิ่ม snapshot ที่ผู้ใช้พิมพ์เข้ามา (ทดสอบ schema ที่ขอบเขต) */
    ingestRaw(id, text) {
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        return { ok: false, stage: "json", reasons: [`JSON อ่านไม่ออก: ${e.message}`] };
      }
      return api.ingest(id, parsed, { actor: api.user(), kind: "INGEST", note: "รับ snapshot จาก JSON ที่ผู้ใช้ป้อน" });
    },

    stats() {
      const byStatus = {};
      const byWorkflow = {};
      const byAssignee = { user: 0, accounting: 0, none: 0 };
      const codes = new Map();
      let outboxPending = 0;
      let schemaInvalid = 0;
      let staleEvidence = 0;
      for (const d of docs) {
        byStatus[d.current.status] = (byStatus[d.current.status] ?? 0) + 1;
        byWorkflow[d.workflow.status] = (byWorkflow[d.workflow.status] ?? 0) + 1;
        const a = d.current.decision?.assigned_to;
        byAssignee[a ?? "none"] += 1;
        for (const e of d.current.exceptions ?? []) codes.set(e.code, (codes.get(e.code) ?? 0) + 1);
        outboxPending += (d.outbox ?? []).filter((e) => e.status === "PENDING").length;
        if (!d.schema[d.current.revision]?.ok) schemaInvalid += 1;
        const pdfKeys = Object.keys(d.pdf ?? {}).map(Number);
        if (pdfKeys.length && !pdfKeys.includes(d.current.revision)) staleEvidence += 1;
      }
      return {
        docs: docs.length,
        snapshots: docs.reduce((n, d) => n + d.revisions.length, 0),
        byStatus,
        byWorkflow,
        byAssignee,
        codes: [...codes.entries()].map(([code, n]) => ({ code, n })).sort((a, b) => b.n - a.n),
        outboxPending,
        schemaInvalid,
        staleEvidence,
        audit: overlay.audit.length,
      };
    },

    reset() {
      overlay = fresh();
      try {
        storage?.removeItem?.(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      docs = rebuild();
      overlay.audit.push(
        makeEntry({ at: now(), actor: api.user(), doc: { document_id: null, current: null }, action: "reset", kind: "SYSTEM", note: "รีเซ็ตข้อมูลเดโมทั้งหมด (overlay ใน localStorage ถูกลบ)" }),
      );
      save();
      docs = rebuild();
      return { ok: true, reasons: [] };
    },

    _overlay: () => overlay,
  };

  /* เริ่มบันทึก event_id ของ snapshot ตั้งต้น เพื่อให้ ingest ซ้ำไม่ได้จริง */
  for (const def of bundle.documents) {
    for (const s of def.snapshots) {
      if (!overlay.seen[s.event_id]) overlay.seen[s.event_id] = `seed:${def.document_id}`;
    }
  }
  save();

  return api;
}
