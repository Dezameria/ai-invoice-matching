# 01 · สถาปัตยกรรม

## หลักคิดหนึ่งประโยค

> **Engine ตัดสิน · Portal แสดงผลและเก็บงาน** — ถ้า portal คำนวณอะไรเองได้เกี่ยวกับ "ถูก/ผิด"
> สิ่งนั้นคือบั๊ก ไม่ใช่ฟีเจอร์

## ผังชั้นและทิศทางการพึ่งพา (ลูกศร = import)

```
                    ┌──────────────────────────────────────────────┐
  browser           │  index.html  →  app.js (bootstrap + router)  │
                    └───────┬───────────────┬──────────────────────┘
                            │               │
                    ┌───────▼──────┐   ┌────▼─────────────────────┐
                    │  src/views/* │   │  src/ui (dom, format)    │
                    │  (HTML string)│   │  esc/badge/card/table/…  │
                    └───────┬──────┘   └────▲─────────────────────┘
                            │               │ (views ใช้ format helpers)
                    ┌───────▼───────────────┴──────────┐
                    │        src/domain/store.js        │  ← จุดเดียวที่แตะ localStorage
                    │  snapshot (immutable) + overlay   │
                    └──┬────┬────┬────┬────┬────┬───────┘
                       │    │    │    │    │    │
       ┌───────────────┘    │    │    │    │    └────────────────┐
       ▼          ▼         ▼    ▼    ▼    ▼                     
  schema.js  company.js  access.js workflow.js guards.js audit.js  exceptions.js
       │          │                                                    
       └──── money.js ──── ruleCatalog.js ──── src/data/* ─────────┘

  ⚠️ ห้ามมีลูกศรใด ๆ จาก src/domain, src/views, src/ui, app.js → src/engine/
     src/engine/rules.js ถูก import โดย tools/ เท่านั้น
```

## ข้อมูลไหลอย่างไร (หนึ่งรอบชีวิตเอกสาร)

```
 OCR + matching engine (n8n)            tools/build-fixtures.mjs           Portal
 ─────────────────────────              ────────────────────────           ───────
 input: invoice/lines/receipt  ──run──▶ src/engine/rules.js (as-built mirror)
                                              │ สร้าง snapshot v1.0
                                              ▼
                                     validateSnapshot() ── error ─▶ fail build (exit 1)
                                              │ ผ่าน
                                              ▼
                                     golden check (expect/expectRevisions)
                                              │ ตรง
                                              ▼
                                     src/data/snapshots.js  ──import──▶ store.createStore()
                                                                              │ list()/get()
                                                                              ▼
                                                                       views → HTML
                                                                              │ user กด action
                                                                              ▼
                                                            access → workflow → guards
                                                                              │ ผ่าน
                                                                              ▼
                                                            overlay + audit (+ outbox) → localStorage
```

จุดเข้าข้อมูล *ใหม่* ตอน runtime คือ `store.ingest(snapshot)` / `store.ingestRaw(json)`
ซึ่งผ่าน `validateSnapshot()` เสมอ — ไม่มีทางอื่นที่ข้อมูลจะเข้า state ได้

## หน้าที่ของแต่ละชั้น

| ชั้น | ไฟล์ | หน้าที่ | ข้อห้าม |
|------|------|---------|---------|
| entry | `index.html` | shell, font, `#topbar #ctxbar #view #toast #modal` + fallback file:// | ห้ามมี bundler/build step |
| bootstrap | `app.js` | สร้าง store, hash router, delegated events, repaint, debug handle `window.__aiva` | ห้ามมี business rule (ตัดสิน/คำนวณเงิน) |
| views | `src/views/*.js` | `render(ctx) → html string` จาก state ที่คำนวณมาแล้ว | ห้าม `querySelector`, ห้าม fetch, ห้าม float math |
| ui | `src/ui/dom.js`, `format.js` | esc, badge, card, table, kv, note, jsonBlock, toast, modal, badge/status/money display | ห้ามรู้ business logic |
| domain | `src/domain/*.js` | contract, policy, state machine, guards, audit, decimal | ห้ามแตะ DOM, ห้าม import engine |
| data | `src/data/*.js` | generated snapshot + master | ห้ามแก้ด้วยมือ (โดน overwrite) |
| engine mirror | `src/engine/rules.js` | as-built V-01…V-09 สำหรับสร้าง fixture เท่านั้น | ห้าม import ตอน runtime |
| tools | `tools/*` | build master data, build/check fixtures, serve, smoke test | — |

## นโยบาย 3 ชั้นก่อนกดปุ่ม (ลำดับสำคัญ)

```
canAct(user, doc, action)      ← access.js      สิทธิ์บทบาท + ขอบเขตบริษัท + SoD
        ↓ allow?
canTransition(status, action)  ← workflow.js    state เครื่องจักร + needNote + ต้องตรงรุ่น (optimistic version)
        ↓ allow?
blockingFor(doc, action)       ← guards.js      หลักฐาน/contract/ความเสี่ยง
        ↓ empty?
openForm(...)  →  store.act()  →  applyWorkflow() + audit + (outbox)
```

ทุกชั้นคืน `{ allow: boolean, reasons: string[] }` — UI ต้องแสดง `reasons` เมื่อ `allow === false`
(ห้าม disable เงียบ ๆ) ตัวอย่างเหตุผล: `role`, `scope`, `sod`, `state`, `need-note`,
`version-conflict`, `schema`, `evidence-stale`, `rules-partial`, `ap-contract`

## กติกา decimal

- ทุกจำนวนใน snapshot เป็น **string** (`"18400.0002"`) และผ่าน `validateDecimalString`
  (ไม่เกิน 6 ตำแหน่งทศนิยม) ตอน validate
- การคำนวณทำผ่าน `dec()` → `{ s, v, scale }` บน BigInt เท่านั้น: `dAdd dSub dMul dCmp dDiff dWithin dRound dNormalize`
- `fmtMoney/fmtQty` ใช้แสดงเท่านั้น (ข้างใน round แบบ decimal ไม่ปัดผ่าน float)
- smoke test ห้าม `parseFloat(` และ `toFixed(` ปรากฏนอก `src/domain/money.js`
- ค่า `null` ใน snapshot = "engine ไม่ได้ให้ค่านี้มา" ไม่ใช่ 0 — view ต้องใช้ `D()` (null-safe dec)
  เฉพาะจุดที่สรุปยอดเพื่อแสดง และต้องไม่เอาไปตัดสินถูกผิด

## สถานะและการคงอยู่ (persistence)

| ส่วน | อยู่ที่ไหน | immutable? |
|-------|------------|------------|
| ผลตรวจ engine (snapshot) | `src/data/snapshots.js` | ✅ |
| master data | `src/data/master-data.js` (generated) | ✅ ตอน runtime |
| workflow / outbox / audit / pdf ที่แนบเพิ่ม / snapshot ที่ ingest เพิ่ม | `localStorage["aiva.webv4.state.v2"]` (SEED = 2) | ❌ |
| ผู้ใช้ที่เลือกอยู่ | overlay เดียวกัน | ❌ |

`reset()` ล้าง overlay ทั้งหมด → กลับเป็น seed ทันที (ปุ่ม **รีเซ็ตเดโม**)
snapshot ที่ ingest เข้ามาตอน runtime ถูกเก็บใน overlay (`extra`) ไม่แตะไฟล์ข้อมูลเดิม

## การป้องกันข้อห้าม (automated)

`tools/smoke-test.mjs` group 7 ตรวจจาก **ข้อความ import จริง** ไม่ใช่แค่มีคำว่า engine ในไฟล์:

- ไม่มีไฟล์ runtime ไหน `import ... "…/src/engine/…"` หรือ `import("../src/engine/…")`
- `src/engine/rules.js` ยังอยู่ และ `tools/build-fixtures.mjs` import มันจริง
- ไม่มี `parseFloat` / `toFixed` นอก `money.js`
- domain ไม่มี DOM (`document.` แบบ API, `window.`, `querySelector`, `addEventListener`)
  — ฟิลด์ `snap.document.pages` ของ snapshot ไม่นับเป็น DOM
- ไม่มีอักษรภาษาอื่นปน (CJK/Lao/Khmer/Hebrew/Arabic/Cyrillic/Vietnamese) — เคยมีอักษรจีนปนในคอมเมนต์ จึงต้องมีตรวจอัตโนมัติ
- `index.html` ไม่อ้าง bundler และโหลด `app.js` เป็น `type="module"`
- ไม่มีไฟล์ PDF จริงในโฟลเดอร์

## สิ่งที่ยังเป็นข้อจำกัดของสถาปัตยกรรมนี้

- ไม่มี backend → outbox เป็นแค่ pending list ในเครื่อง (เดโม “ส่งออก” ได้ 1 ครั้งต่อ 1 event)
- ไม่มี real-time → snapshot ใหม่เข้าด้วย JSON/ปุ่มเดโม ไม่ใช่ websocket/SSE
- optimistic version มีจริง (`expectedVersion`) แต่ไม่มี server คอยชน → การชนกันหลาย worker จำลองได้ไม่ครบ
- audit เป็น append-only ในเครื่อง ยังไม่มี hash chain / ลงฐานข้อมูล (v3 เคยทำ hash chain จำลองไว้)

รายละเอียด API: [docs/03-domain-model.md](03-domain-model.md) · contract: [docs/02-data-contract.md](02-data-contract.md)
