# as-built v5 — สิ่งที่สร้างจริงใน `Web portal/invoice-webV5`

อ่านคู่กับ `PORTAL-plan.md` (แผน+เหตุผล) และ `README.md` (สรุปเร็ว)
เอกสารนี้บรรยายของที่ใช้ได้จริง ณ วันที่เขียน — ตัวเลขทั้งหมดอ่านซ้ำได้จากคำสั่งใน §2

---

## 1. หลักการที่บังคับด้วยโค้ด/เทสต์

| ข้อห้าม | ถูกบังคับอย่างไร |
| --- | --- |
| view/UI ห้าม import `src/engine/rules.js` | smoke-test สแกน import ทุกไฟล์ใน `src/views/`, `src/ui/`, `src/domain/`, `app.js` |
| ห้ามใช้ float กับตัวเลขเงิน | `domain/money.js` ใช้ BigInt (`Dec.v`) + `dec()` โยน error ถ้าเจอ exponential; test ไล่ `fmtMoney`/`dAdd`/`dRound` |
| ห้ามแก้ไฟล์ generated ด้วยมือ | test เทียบ sha256 ของต้นฉบับกับ sha ที่เก็บในไฟล์ (`sync.py --check` ใช้เกณฑ์เดียวกัน) |
| portal ห้ามคำนวณผลจับคู่ใหม่ | view รับแต่ `snapshots.js` ที่ build สำเร็จ; test assert ว่าผลบนจอ = ผลใน snapshot |
| ปุ่มที่กดไม่ได้ต้องมีเหตุผล | `actionMatrix` + `canTransition` + `blockingFor` รวมเหตุผลทุกชั้น; test assert ทุกปุ่มที่ `!ok` มี `reasons.length > 0` |
| portal ห้าม print ออก console ตอน render ปกติ | smoke-test patch console แล้ว render ทุกหน้า |

## 2. คำสั่ง

```bash
python tools/serve.py [--port 8787] [--host 127.0.0.1] [--open]   # static server ไม่มี build
python tools/sync.py            # repo → src/data/*.js (อ่าน repo อย่างเดียว ไม่เขียน repo)
python tools/sync.py --check    # ต้นฉบับขยับ = exit 1
node tools/build-snapshots.mjs  # fixtures + engine mirror → src/data/snapshots.js
node tools/smoke-test.mjs       # 31 ข้อ (สถาปัตยกรรม + domain + render ทุกหน้า ทุกบทบาท)
node tools/browser-check.mjs    # 29 ข้อใน Microsoft Edge headless + report HTML
node tools/browser-check.mjs --no-browser-report   # ไม่เขียน report
```

ผลล่าสุด: smoke **31/31** · browser **29/29** · ไม่มี console error · ไม่มี request ล้มเหลว
report: `tmp/browser-check-report.html`

## 3. โครงสร้างไฟล์

```
index.html            shell เดียว (header + nav + main + modal host)
app.js                router (hash), สลับผู้ใช้, event ของปุ่ม, modal, toast, localStorage
src/styles/app.css    ธีม (ตัวแปรสี generate จาก mockup ผ่าน <style> ที่ sources page แสดงได้)
src/domain/
  money.js            Decimal string (BigInt) + fmtMoney/qty/pct
  schema.js           receiving contract v1.0 (validate snapshot ทั้งก้อน)
  ruleCatalog.js      คำอธิบาย V-01…V-09, verdict, match level, step label
  exceptions.js       EXCEPTION_CODES (มาตรฐาน) + summarize() + codeMeta()
  company.js          ORG/OU → นิติบุคคล (จาก master-data generated) + UNMAPPED
  workflow.js         state machine + ACTIONS + actionsAllowedByState + outbox
  access.js           7 users, CAPABILITY, canAct, actionMatrix, isMyTask
  guards.js           14 guard id (ชั้นที่สามก่อนกดปุ่ม) + evidenceStatus + riskLevel
  store.js            state + act() 3 ชั้น + audit (append-only) + ingest/ingestRaw
  audit.js           的记录เหตุการณ์ -> ดู `logEvent` (append-only record)
  reference.js        ชั้น "มาตรฐาน vs as-built" (conflict summary, rule completeness)
  mdtext.js           อ่าน markdown + ดึง section/ตาราง
src/ui/               dom.js (HTML string helpers), format.js (badge/money/dt), parts.js (KPI/tabs/filter), markdown.js
src/views/            work · detail · rules · manual · sources · audit
src/data/             snapshots.js · master-data.js · sources.js · repo-docs.js · design-tokens.js  (generated ทั้งหมด)
src/engine/rules.js   mirror ของ rules.py — ใช้ตอน build snapshot เท่านั้น
tools/                serve.py · sync.py · build-snapshots.mjs · smoke-test.mjs · browser-check.mjs · cases-*.mjs
```

## 4. ไฟล์ generated + ที่มา (provenance)

ทุกไฟล์ generated มี header บอก *คำสั่งที่ generate*, *path ต้นฉบับ*, *sha256*, *bytes*, *lines*, *mtime*
และ `src/data/sources.js` เป็นทะเบียนรวม 9 แหล่ง (field: `id, path, role, feeds, bytes, lines, sha256, mtime, note`)

| id | ต้นฉบับ | ให้ อะไร |
| --- | --- | --- |
| `master-data` | `OCR service/n8n/app/core/master_data.py` | นิติบุคคล 48 (ACTIVE 45 / UNKNOWN 2 / REVOKED 1), 21 tax id, รหัสข้อยกเว้น as-built 15 (เป็นงานผู้ใช้ 7), กฎ 9 ข้อ |
| `rules-engine` | `OCR service/n8n/app/core/rules.py` | รหัสนิยาม/เกณฑ์ as-built ใช้เทียบเอกสารมาตรฐาน |
| `models` | `OCR service/n8n/app/core/models.py` | field names ของ snapshot |
| `mockup` | `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html` | design tokens: scale สี 22 ชุด × 7 ขั้น = 154 ค่า + font stack 3 ชุด |
| `architecture` `rules-standard` `api-reference` `integrations` `docs-index` | `docs/*.md` | 5 ไฟล์ 591 บรรทัด — หน้าคู่มือ render จาก body จริง ไม่ copy ข้อความ |

หน้า `#/sources` แสดง path + sha + จำนวนบรรทัด + คำสั่ง sync ต่อแหล่ง และ tab "contract" บอกว่าแต่ละฟิลด์ไปโผล่ที่ไหน

## 5. snapshot bundle (`src/data/snapshots.js`)

- generator: `tools/build-snapshots.mjs` รัน `src/engine/rules.js` กับ fixtures ใน `tools/cases-*.mjs`
- 22 เอกสาร / 24 revision · `contract_version 1.0` · schema invalid **0** · warning **3**
- hand-authored 2 ฉบับ (`AIVA-2609-0016`, `AIVA-2609-0020`) เพื่อทดสอบกรณี "ผลตรวจไม่ครบ 9 กฎ"
- tolerance ที่ engine ใช้ (ส่งต่อให้ UI แสดง ไม่ hardcode): `lineMath 0.50 · docSum 0.50 · vat 1.00 · grand 0.50 · receiptTotal 0.50 · pricePct 1% / 200 · receiptSafetyCap 50`
- แต่ละ snapshot มี `expect {status, codes, assigned, matchLevels}` — build-snapshots fail ทันทีถ้า engine ให้ผลต่างจากที่คาดหวัง
- snapshot ที่ตั้งใจให้ผิด contract (ยอด float, event_id ว่าง, revision 0, ไม่มี invoice) ถูก reject ตั้งแต่ build → portal ไม่มีทางเห็น

## 6. store API (`src/domain/store.js`)

```
list(filters?)  get(id)  stats()  audit(from?)  auditOf(id)  seenEvents()
user()  setUser(id)  bundle_meta
act(id, action, {user, reason, version})   → {ok, stage, reasons, doc}
ingest(snapshot)  ingestRaw(jsonText)      → ผ่าน schema ก่อน แล้วเข้าคิว outbox
```

`act()` ไล่สามชั้นและรายงาน `stage` ว่าติดชั้นไหน:

1. `access` — บทบาทนี้มีสิทธิ์ action นี้ไหม (EU / ACC / APR / ADM)
2. `workflow` — สถานะปัจจุบันอนุญาตไหม (`actionsAllowedByState`)
3. `guards` — เงื่อนไขธุรกิจ (ดู §7) + ตรวจ `version` แบบ optimistic (ชน = ไม่เขียน audit)

ถ้าไม่ผ่าน layer ใด **ไม่มีการเปลี่ยน state และไม่มี audit record**

## 7. state, บทบาท, guard

สถานะ: `PENDING_REVIEW · ON_HOLD · RESUBMITTED · CONFIRMED · REJECTED` (+ `POSTED` ถึงได้แค่ในสมมติ)

| สถานะ | action ที่ state อนุญาต |
| --- | --- |
| PENDING_REVIEW | hold, resubmit, confirm, reject |
| ON_HOLD | release, resubmit, reject |
| RESUBMITTED | hold, resubmit, reject |
| CONFIRMED | post |
| REJECTED | — (ปิดเคส) |

ผู้ใช้เดโม: `u1–u3` EU · `u4–u5` ACC · `u6` APR (Somchai.P) · `u7` ADM

guard id ที่โผล่จริงในข้อมูลเดโม: `ap-contract, auto-pass-approval, rules-skipped, rules-partial, evidence-missing, evidence-stale, company-unmapped, match-fuzzy, match-fallback, pages-incomplete, duplicate, outbox-pending, hand-authored, currency`

**จุดที่ต้องอธิบายเสมอ:** `post` ผ่านชั้น access (APR มี capability) และผ่านชั้น workflow (CONFIRMED → POSTED)
แต่ถูกบล็อกที่ guard `ap-contract` — "Posting Gateway v1 ยังไม่ถูกสร้าง" นี่คือเจตนา: portal หยุดที่ CONFIRMED

## 8. หน้า & route

| route | หน้า | เนื้อหาหลัก |
| --- | --- | --- |
| `#/` (=`#/work`) | งาน | KPI 6 ใบ, ตัวกรอง (scope/status/wf/assignee/company/code/q), ตาราง 6 คอลัมน์, ปุ่มเดโม producer |
| `#/doc/:id?r=N&tab=…` | เอกสาร | แท็บ `summary · lines · evidence · work`; แถบ "ต้องทำอะไรต่อ" อยู่แรก, เลือกดู revision เก่าได้ |
| `#/rules?tab=…` | กฎ & ข้อยกเว้น | `rules` (มาตรฐาน V-01…V-09 จาก markdown), `exceptions` (docs ↔ as-built), `decision` (D1–D6), `master` (นิติบุคคล + ความถี่รหัส) |
| `#/manual?doc=<id>` | คู่มือ | render `docs/*.md` ตรง ๆ + tab แรกเป็นคู่มือใช้ portal |
| `#/sources` | ที่มาข้อมูล | ทะเบียน 9 แหล่ง, design tokens, contract mapping |
| `#/audit` | ประวัติการทำงาน | append-only record จาก localStorage + เหตุการณ์จาก producer |

แท็บที่เลือกถูกทำเครื่องหมายด้วย class `tab on` (และ `aria-selected`) — id ที่ไม่รู้จักใน `#/manual` จะ fallback กลับ tab แรกอัตโนมัติ

## 9. Hook ที่ test based on DOM ใช้ (`data-*`)

| hook | อยู่ที่ไหน | ใช้ตรวจอะไร |
| --- | --- | --- |
| `tr[data-open][data-ev]` | ตารางงาน | เปิดเอกสาร / สถานะหลักฐานของแถว (เลือกฉบับที่ `data-ev != current`) |
| `[data-act][data-doc][data-v]` | แท็บงานของหน้าเอกสาร | ปุ่ม action (render ทุก action เสมอ ปิดด้วย class `is-disabled` + เหตุผลใน `.act .why`) |
| `[data-demo="deliver|pdf|json"]` | head หน้างาน / การด์หลักฐาน / แท็บงาน | producer simulator: รับ revision ใหม่, แนบ PDF, ทดสอบ ingestion |
| `[data-evidence][data-rev]` | การด์หลักฐาน | สถานะหลักฐานปัจจุบัน (`missing/stale/current`) |
| `[data-user]` `[data-kpi]` `[data-filter]` `[data-scope]` | header / KPI / ตัวกรอง | สลับบทบาท (คิวต้องเปลี่ยน), กรอง, ล้างกรอง |
| `[data-modal-open/close/ok]` `[data-toast-close]` | modal & toast | flow กรอกเหตุผลก่อนทำ action |

## 10. ความต่าง มาตรฐาน vs as-built (`#/rules`)

`domain/reference.js` เทียบรหัสจาก `docs/matching-rules-standard-v6.2.md` กับ `master_data.py`

| กลุ่ม | จำนวน | รหัส |
| --- | --- | --- |
| ตรงกันทั้งสองฝั่ง | 9 | — |
| เอกสารมี แต่โค้ดไม่มี | 7 | E07 E08 E15 E19 E21 E22 E27 |
| โค้ดมี แต่เอกสารไม่มี | 6 | E12 E13 E25 E30 E31 E34 |
| ความรุนแรงไม่ตรงกัน | 4 | E16 E26 E28 E29 |
| รวมส่วนต่างทั้งหมด | 22 | แสดงบนหน้าจอทุกกลุ่ม พร้อม link ไปต้นฉบับทั้งสองฝั่ง |

ความครบถ้วนของผลตรวจต่อเอกสาร (`rulesCompleteness`): `usable` = มีผลกฎอย่างน้อย 1 ข้อ, `complete` = ครบ 9 ข้อ
ตัวอย่างจริง: `AIVA-2609-0020` (hand-authored) → usable = ใช่, complete = ไม่ใช่ (ขาด V-06…V-09) → portal โชว์ badge "ผลตรวจไม่ครบ" และ guard `rules-partial` ปิดปุ่มยืนยัน

## 11. การทดสอบ

**smoke-test (31 ข้อ, Node ล้วน ไม่ต้องมี browser)** — กลุ่ม: hygiene (ข้อห้ามสถาปัตยกรรม), money, schema/contract, workflow/access/guards, store + ingest + audit, reference/conflict, markdown/mdtext, render ทุกหน้าทุกบทบาท (ตรวจ tag ไม่ปิดครบ, ห้ามมี `undefined`/`NaN`/`[object Object]` บนจอ)

**browser-check (29 ข้อ, Edge headless + CDP, ไม่มี dependency)** — module โหลดครบ, ทุก route เปิดถูกแท็บ, สลับผู้ใช้แล้วคิวต้องยุบ, flow Hold ต้อง modal + audit ต้องโต, เดโม deliver ต้องเพิ่ม revision, เดโมแนบ PDF ต้องทำให้ `data-evidence` เป็น `current`, portal ต้อง *ไม่มี* fake PDF viewer, และทั้งรอบต้องไม่มี console error / 404

บทเรียนที่จดไว้จากการเทสต์: **ห้ามเขียนภาษาไทยด้วย `\u` escape** ในไฟล์ test (เคยได้ "นิติบุคล", "ทีเนปงาน", "คู่" ผิดวรรณยุกต์) — ตรวจด้วย token ASCII เช่น `V-01`, `Master data`, `sha256`, `tab=work`

## 12. ข้อจำกัดที่ต้องรู้ (ไม่ได้ซ่อน)

1. `post` ยังไม่ส่งจริง — ถูกบล็อกที่ guard (ดู §7)
2. ไม่มีไฟล์ PDF ให้เปิด — แสดง metadata + สถานะหลักฐานแทน (มี test ยืนยันว่าไม่มี fake viewer)
3. ข้อมูลเดโม fix ไว้ใน snapshot — ตัวเลขไม่เปลี่ยนตามต้นทางจริงจนกว่าจะต่อ API
4. audit/store เก็บใน `localStorage` (`aiva.webv5.state.v1`) — รีเซ็ตได้จากปุ่มรีเซ็ตเดโมใน header
5. browser-check ใช้ Microsoft Edge (Windows) — ถ้าไม่มี Edge จะ skip ทั้งกลุ่มพร้อมข้อความบอก
