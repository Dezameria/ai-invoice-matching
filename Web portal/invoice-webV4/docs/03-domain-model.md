# 03 · Domain model (`src/domain`)

ทุกไฟล์ในชั้นนี้ **pure** (ไม่มี DOM, ไม่มี fetch, import ได้จาก node ตรง ๆ)
และ **ไม่ import `src/engine/`** — มีเทสต์เฝ้าไว้

ลำดับชั้น policy ก่อนที่ action จะเกิดผล:

```
access (ใคร) → workflow (สถานะงานอนุญาตไหม) → guards (หลักฐาน/สัญญาพอไหม)
```

---

## `money.js` — ทศนิยมบน BigInt

| API | ลายเซ็น | หมายเหตุ |
|-----|---------|----------|
| `dec(raw)` | `string\|number\|Dec → Dec\|null` | แปลงเป็น `{ s: BigInt, v: BigInt, scale: number }`; ไม่ valid → `null` |
| `dAdd dSub dMul` | `(Dec, Dec) → Dec\|null` | ต้องรับ `Dec` ที่ผ่าน `dec()` แล้ว (ไม่รับ string ตรง ๆ) |
| `dCmp dEq dIsZero dDiff` | `(Dec, Dec) → -1\|0\|1 / bool / Dec` | `dDiff` = ค่าสัมบูรณ์ของผลต่าง |
| `dWithin(a, b, tol)` | `(Dec, Dec, string\|number) → bool` | `tol` แปลงให้เอง |
| `dRound(a, dp=2)` / `dNormalize(a)` | `Dec → Dec` | half-up บน BigInt, ตัดศูนย์เกินจำเป็น |
| `dToNumber` / `dMulN` | `Dec → number` / `(Dec, number) → Dec` | ใช้กับจำนวนนับ (เช่น %) เท่านั้น ห้ามใช้กับเงิน |
| `fmtMoney(raw, opts)` / `fmtQty(raw, opts)` | แสดงผล (thousand separator, `—` เมื่อว่าง) | ปัดเป็น 2 ตำแหน่งโดยไม่ผ่าน float |
| `validateDecimalString(raw, {required,label})` | `{ok, message}` | contract ใช้: ≤ `MAX_FRACTION_DIGITS = 6`, ≤ `MAX_DECIMAL_DIGITS = 20` |

**ข้อผิดพลาดที่พบบ่อย (เคยเกิดจริง):** ส่ง string เข้า `dAdd` ตรง ๆ → `NaN` → `RangeError`
ตอนแปลง BigInt → ทุก call site ต้อง `dec(x)` ก่อน (ใน view มี helper `D(x)` null-safe ของ detail.js)

ตรวจสอบได้: `600 × 30.666667 = 18400.0002` ต้องไม่เหลือเศษ float — มีเทสต์คุมไว้

---

## `schema.js` — receiving contract

ดูรายละเอียด contract ใน [docs/02](02-data-contract.md)

| API | คืนค่า | ใช้ทำอะไร |
|-----|--------|-----------|
| `validateSnapshot(raw)` | `{ok, errors[], warnings[], contractVersion, extended[]}` | เรียกที่ขอบเขต (store.ingest, build-fixtures, หน้า JSON tester) |
| `rulesCompleteness(rules)` | `{present[], missing[], notEvaluated[], complete, usable}` | แยก "ไม่ผ่าน" ออกจาก "ไม่ได้ตรวจ" — `usable` = มีกฎอย่างน้อย 1 ข้อ, `complete` = ครบ 9 ข้อ |
| `schemaBadge(result)` | `{text, tone}` | badge บนคิวดาต้าเฮลท์/ดีเทล |
| `STATUSES / RULE_RESULTS / SEVERITIES / ASSIGNEES` | enum | ใช้เทียบค่าก่อนแสดงเสมอ |

---

## `company.js` — ORG_ID → นิติบุคคล/บริษัท

| API | หมายเหตุ |
|-----|----------|
| `COMPANY_BY_TAX` | config ฝั่ง portal: Tax ID → `{code,label}` (master ยังไม่มีคอลัมน์รหัสบริษัท) |
| `ENTITY_BY_ORG` | `Map<orgId, entity>` จาก master data (48 นิติบุคคล) |
| `resolveCompany(orgId, source)` | `{company, org_name, tax_id, master_status, mapped, reason}` — **ไม่เดา**: ไม่มี orgId / master ไม่ใช่ ACTIVE / Tax ID ไม่รู้จัก / Tax ID ว่าง → `UNMAPPED` + เหตุผล |
| `companyOptions(docs)` | ตัวเลือกกรอง "บริษัท" บนคิว |

ผลข้างเคียงที่ตั้งใจ: เอกสารที่ map ไม่ได้ **ต้องโผล่ในคิว** พร้อมป้ายเตือน (ไม่ให้หายจากทุกคิว)
และ guard จะบล็อก `confirm` จนกว่าจะแก้ mapping

---

## `exceptions.js` — การจัดกลุ่มข้อยกเว้น (presentation เท่านั้น)

| API | คืนค่า |
|-----|--------|
| `SEVERITY_RANK` / `SEVERITY_LABEL` | `High > Medium > Low` |
| `NEXT_STEP` | ข้อความ "ต้องทำอะไร" ต่อ severity/เจ้าของงาน |
| `codeMeta(code)` | `{label, severity, userTask, owner, ...}` จาก master (15 รหัส as-built) |
| `sortExceptions(list)` | เรียง High → Medium → Low แล้วตามรหัส |
| `summarize(exceptions)` | `{list, codes[], hasHigh, hasMedium, counts, userCodes[], accountCodes[]}` |
| `frequency(perDocList)` | ความถี่รหัสทั้งกระดาน (ใช้ทำ KPI + progress bar) |

รหัสงานผู้ใช้ (as-built): `E06 E12 E13 E17 E26 E34 E35` → `assigned_to = user` ที่เหลือ → บัญชี

---

## `access.js` — ชั้นที่ 1: ใครเห็น / ใครกดอะไรได้

| API | พฤติกรรม |
|-----|----------|
| `USERS` / `ROLE_LABEL` / `ACTION_LABEL` | ข้อมูลผู้ใช้ 7 คน 4 บทบาท (ดูตารางใน [docs/00](00-overview.md)) |
| `userById(id)` | คืน user หรือ fallback ADM |
| `canSee(user, doc)` | EU เห็นเฉพาะบริษัทในขอบเขต + งานที่ตัวเองเกี่ยวข้อง · ACC/APR/ADM เห็น 5 บริษัท |
| `visibleDocs(user, docs)` | กรองทั้งคิว (ทุกหน้าใช้ตัวนี้ — ห้ามกรองเอง) |
| `isMyTask(user, doc)` | `decision.assigned_to = user` และอยู่ในขอบเขต |
| `canAct(user, doc, action)` | `{ok, reasons[], action}` — เหตุผลเป็นข้อความไทยเต็ม (ไม่มีสิทธิ์ตามบทบาท / นอกขอบเขตบริษัท / SoD) |
| `actionMatrix(user, doc)` | ตารางสิทธิ์ (หน้า help แสดง per role × action) |

**Separation of duties:** `confirm`/`reject` ถูกบล็อกเมื่อ `doc.actor.uploadedBy === user.initials`
(สาธิตด้วย `AIVA-2609-0001` — APR `SOMCHAI.P` ยืนยันเอกสารที่ตัวเองแนบไม่ได้)

---

## `workflow.js` — ชั้นที่ 2: state เครื่องจักรของ "งาน" (ไม่ใช่ผลตรวจ)

`WF` = `PENDING_REVIEW · ON_HOLD · RESUBMITTED · CONFIRMED · REJECTED · POSTED`
`WF_TONE` ใช้แสดง badge แยกสีจากผลตรวจ engine

| action | จากสถานะ | ไป | ต้องมีหมายเหตุ |
|--------|----------|----|:--------------:|
| `hold` | PENDING_REVIEW, RESUBMITTED | ON_HOLD | ✅ |
| `release` | ON_HOLD | PENDING_REVIEW | ✅ |
| `resubmit` | PENDING_REVIEW, ON_HOLD, RESUBMITTED | RESUBMITTED | ✅ (สร้าง outbox event) |
| `confirm` | PENDING_REVIEW | CONFIRMED | ✅ |
| `reject` | PENDING_REVIEW, ON_HOLD, RESUBMITTED | REJECTED | ✅ |
| `post` | CONFIRMED | POSTED | ✅ (แต่ guard บล็อกทุกกรณี) |

| API | หมายเหตุ |
|-----|----------|
| `transitionFor(action)` | `{from[], to, needNote}` — ใช้ตอนสร้างฟอร์ม (ดู note จาก transition ไม่ใช่จากสถานะปัจจุบัน) |
| `canTransition(status, action)` | `{ok, reasons[], to?, needNote?}` — `needNote` มีค่าเฉพาะตอนเปลี่ยนได้ |
| `isTerminal(status)` | `REJECTED` เท่านั้น — `POSTED` ถูกกันอีกชั้นใน `canTransition` ส่วน `CONFIRMED` ไม่ terminal (ยังเหลือ action `post`) |
| `applyWorkflow(doc, action, {user, note, at, expectedVersion})` | `{ok, reasons[], next?}` — วน version +1, เก็อบหมายเหตุ, SoD ตรวจซ้ำ, ถ้า `resubmit` → แนบ `outboxEntry` |
| `makeOutboxEntry / closeOutbox` | outbox คือ "สั่ง pipeline ทำงานต่อ" — portal ทำ OCR เองไม่ได้ |
| `actionsAllowedByState(status)` | ใช้เปิด/ปิดปุ่มก่อนคุยกับ guards |

**Optimistic version:** `applyWorkflow` เทียบ `expectedVersion` กับ `workflow.version`
ถ้าไม่ตรง → `reasons` เต็มด้วยข้อความ "เวอร์ชันงานไม่ตรง (คุณเห็น v… ระบบเป็น v…)" (จำลองคนกดพร้อมกัน)

> บั๊กที่เคยเกิด: เก่าตรวจ `["resubmit"].includes(t.to)` (เทียบชื่อ **สถานะปลายทาง** `"RESUBMITTED"`)
> ทำให้ไม่มีวันสร้าง outbox → แก้เป็นเทียบ `action === "resubmit"` และมีเทสต์คุมแล้ว

---

## `guards.js` — ชั้นที่ 3: หลักฐาน ความเสี่ยง และสัญญา

| API | คืนค่า |
|-----|--------|
| `evidenceStatus(doc)` | `{state: current\|stale\|missing, rev, have, file_name, pages?, detail?}` — เทียบ revision ของไฟล์ PDF กับผลตรวจล่าสุด |
| `guards(doc)` | array ของ `G = {id, level: info\|warn\|block, title, detail, blocks[]}` ทุก guard ของเอกสารนั้น |
| `blockingFor(doc, action)` | เฉพาะ G ที่ `blocks` ครอบคลุม action นี้ (UI ใช้ปิดปุ่ม + เขียนเหตุผลลง audit) |
| `riskLevel(doc)` | `block \| warn \| ok` (badge ที่ list) |

รายการที่ guard ตรวจ (as-implemented): ไม่มี snapshot · contract ไม่ผ่าน · ไม่มีผลกฎ ·
กฎไม่ครบ · กฎถูก skip (`not_evaluated`) · หลักฐานหาย · หลักฐานค้างรุ่น (stale) · เอกสารซ้ำ ·
จับคู่ระดับ M3/M4 · หน้าไม่ครบ · สกุลเงินไม่ใช่ THB · map บริษัทไม่ได้ · งานค้างใน outbox ·
snapshot เขียนมือ · Auto-pass ยังต้องมีคนยืนยัน · `ap-contract` (บล็อก `post` เสมอ)

---

## `audit.js` — บันทึกแบบ append-only

`AUDIT_KIND`: `VIEW · ACTION · ACTION_BLOCKED · INGEST · INGEST_REJECTED · PDF_ATTACHED · OUTBOX · RESET · USER_SWITCH`

| API | หมายเหตุ |
|-----|----------|
| `makeEntry({at, actor, doc, action, kind, from, to, version, note, detail})` | สร้าง entry พร้อม id/time · ห้ามแก้อีเวนต์เก่า |
| `forDocument(entries, id)` | audit ของเอกสารเดียว |
| `filterEntries(entries, {actorId, kind, documentId, q})` | ใช้ในหน้า audit |
| `auditSummary(entries)` | นับตามชนิด/ผู้ใช้ (chip บนหัวหน้า) |
| `newest(entries)` | เรียงใหม่ก่อน (ทุกหน้าใช้ตัวนี้) |

ทุก action ที่ "กดไม่ได้" ก็ถูกบันทึกเป็น `ACTION_BLOCKED` พร้อมเหตุผล — เพื่อให้เห็นว่าคนพยายามทำอะไร

---

## `store.js` — จุดรวม state (อย่างเดียวที่แตะ `localStorage`)

```js
import { createStore } from "./src/domain/store.js";
const store = createStore({ storage: null });   // storage:null = ไม่ persist (ใช้ในระบบทดสอบ)
```

`STORAGE_KEY = "aiva.webv4.state.v2"` · `SEED = 2` (เพิ่มเมื่อโครง overlay เปลี่ยน) ·
ผู้ใช้เริ่มต้น `u6` (APR) · เก็บเฉพาะ overlay: `userId`, workflow รายเอกสาร, outbox,
pdf ที่แนบเพิ่ม, snapshot ที่ ingest เพิ่ม (`extra`), `pending_delivered`, audit, `seen`

| API | หน้าที่ |
|-----|---------|
| `bundle_meta` | built_at · engine_version · contract_version · tolerance · snapshot_count · hand-authored list |
| `list()` / `get(id)` | รายการเอกสาร (ผ่านสิทธิ์) / เอกสารเดียว |
| `audit()` / `auditOf(id)` / `seenEvents()` | audit ทั้งระบบ / ต่อเอกสาร / จำนวน event_id ที่เคยรับ |
| `user()` / `setUser(id)` | สลับผู้ใช้เดโม (บันทึก audit `USER_SWITCH`) |
| `act(id, action, {note, expectedVersion})` | ทางเดียวที่ทำให้สถานะงานเปลี่ยน (3 ชั้น + SoD + version) |
| `ingest(id, snapshot, opts)` | **จุดเข้าข้อมูลเดียว**: validate → ห้าม event_id ซ้ำ → revision ต้องเพิ่ม → ปิด outbox → workflow กลับ `PENDING_REVIEW` (ยกเว้น REJECTED/POSTED) → audit |
| `ingestRaw(id, text)` | JSON → `ingest` (ปุ่มทดสอบในหน้าดีเทล) |
| `deliverPending(id)` | เดโม: ส่ง snapshot รุ่นค้างเข้า `ingest` จริง |
| `attachPdf(id)` | เดโม: สร้าง metadata PDF ของรุ่นปัจจุบัน (ไม่เก็บไฟล์) |
| `stats()` | KPI ทั้งกระดาน + สถิติ contract/หลักฐาน/งานค้าง |
| `reset()` | ล้าง overlay กลับ seed |
| `_overlay()` | debug เท่านั้น (`window.__aiva.store._overlay()`) |

**รูปทรงเอกสารที่ store คืน** (`list()/get()`):

```
document_id, dms_id, title, actor{uploadedBy,...},
revisions[],                 // snapshot ทุกรุ่น (immutable + ที่ ingest เพิ่ม)
schema{revision → result},   // ผล validate รายรุ่น
completeness{...},           // rulesCompleteness ของรุ่นล่าสุดที่ผ่าน
current,                     // snapshot รุ่นล่าสุดที่ contract ผ่าน
workflow{status,version,heldBy,decidedBy,note,notes[]},
outbox[], pending_snapshot, pdf, pdf_synth, hand_authored,
duplicates[], company, company_label, provenance
```

> `doc.current` เป็นของ store-wrapped ไม่ใช่ snapshot ดิบ — โค้ดที่รับ bundle ตรง ๆ
> (เช่น tools) ต้องใช้ `d.snapshots.at(-1)` ไม่ใช่ `d.current` (เคยทำให้เทสต์พัง)

---

## `ruleCatalog.js` — คำอธิบายกฎสำหรับ UI

`RULE_CATALOG` (V-01…V-09) มี `step name checks codes asBuilt` ·
`STEP_LABEL` แบ่ง 3 ขั้น · `MATCH_LEVEL` M1–M4 · `ruleMeta(id)` fallback เมื่อ engine ส่ง id แปลกมา

⚠️ ไฟล์นี้ **ห้ามใช้เป็นเกณฑ์ตัดสิน** — เกณฑ์อยู่ใน engine และถูกตรึงใน snapshot แล้ว
ใช้เขียนคำอธิบาย/ช่อง asBuilt เท่านั้น (ดู [docs/06](06-as-built-gaps.md))
