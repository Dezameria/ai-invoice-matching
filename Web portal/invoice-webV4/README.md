# AIVA Invoice Review Portal — v4 (`invoice-webV4`)

web portal สำหรับรีวิวเอกสารวางบิล (invoice ↔ receipt matching) ที่ **แสดงผลจาก snapshot
ที่ engine ตรวจเสร็จแล้วเท่านั้น** — portal ไม่รันกฎ matching ใหม่เลย at runtime

เอกสารพัฒนาทั้งหมดอยู่ใน [`docs/`](docs/)

---

## เริ่มใช้งาน (no build step)

ต้องมี: Node `v26+` (ทดสอบด้วย v26.4.0) และ Python `3.11+` (ทดสอบด้วย 3.14.6) — ทั้งสองอย่างใช้
เฉพาะเครื่องมือสร้างข้อมูล/ทดสอบ ตัว portal เปิดด้วยเบราว์เซอร์ล้วน ๆ

```bash
# 1) เสิร์ฟโฟลเดอร์ portal (เบราว์เซอร์บล็อก ES module เมื่อเปิดด้วย file://)
python tools/serve.py --open              # → http://127.0.0.1:8080/index.html

# 2) ถ้าแก้ src/data/master-data.js หรือ src/engine/rules.js ให้ regenerate ข้อมูล
python tools/build-master-data.py         # อ่านจาก OCR service/n8n/app/core/master_data.py
node tools/build-fixtures.mjs             # รัน engine mirror → เขียน src/data/snapshots.js

# 3) ตรวจก่อน commit / ก่อนเดโม
node tools/build-fixtures.mjs --check     # fixture ไม่ drift จาก engine
node tools/smoke-test.mjs                 # 107 การตรวจใน node (decimal, contract, policy, สถาปัตยกรรม, views)
node tools/browser-check.mjs              # 14 การตรวจใน Chromium จริง (ข้ามตัวเองถ้าไม่มี playwright)
```

Reset ข้อมูลเดโมในเบราว์เซอร์: ปุ่ม **รีเซ็ตเดโม** ในหน้า Dashboard หรือ
`localStorage.removeItem("aiva.webv4.state.v2")` แล้ว refresh

---

## หลักการที่ไม่ยอมให้ละเมิด (hard rules)

| # | หลักการ | ที่บังคับใช้ |
|---|---------|--------------|
| 1 | Portal **ไม่คำนวณ/ไม่ตรวจ matching ซ้ำ** — UI อ่าน snapshot เท่านั้น | ผลห้าม `import` จาก `src/engine/` (smoke group 7 ตรวจ import จริง) |
| 2 | เงิน/จำนวน เป็น **decimal string** always — ห้ามนำไปคำนวณด้วย float | helper BigInt ใน `src/domain/money.js` ห้าม `parseFloat`/`toFixed` นอกไฟล์นั้น |
| 3 | ทุกอย่างเข้าระบบทางเดียวคือ **ingest + validate contract** | `validateSnapshot()` ที่ `store.ingest()` — snapshot ที่ไม่ผ่านถูกปฏิเสธพร้อม audit |
| 4 | สถานะงาน (workflow) แยกจาก **ผลตรวจของ engine** เด็ดขาด | `domain/workflow.js` เก็บเฉพาะ overlay ของ portal ผลตรวจเดิม immutable |
| 5 | ปุ่มที่กดไม่ได้ต้อง **อธิบายได้เสมอ** | 3 ชั้น policy: `access` → `workflow` → `guards` คืน `reasons` ให้ UI แสดง |
| 6 | ข้อมูล map ไม่ได้ / หลักฐานไม่ครบ / rules ไม่ครบ = **เตือน ไม่เดา** | `UNMAPPED`, `evidence missing/stale`, `rules partial` ขึ้นเป็น alert + บล็อก action |
| 7 | domain layer ต้องทดสอบใน node ได้ (ไม่มี DOM) | smoke test import ตรง ๆ ได้ทุก module โดยไม่ปลอม DOM |

---

## โครงสร้าง

```
invoice-webV4/
├── index.html                  # shell + fallback เมื่อเปิดด้วย file://
├── app.js                      # bootstrap + hash router + delegated events (layer เดียวที่แตะ DOM จริง)
├── src/
│   ├── domain/                 # business logic บริสุทธิ์ (ทดสอบใน node ได้)
│   │   ├── money.js            # Decimal บน BigInt + fmtMoney/fmtQty/validateDecimalString
│   │   ├── schema.js           # receiving contract v1.0 + validateSnapshot + rulesCompleteness
│   │   ├── company.js          # ORG_ID/Tax ID → นิติบุคคล (map ไม่ได้ = UNMAPPED + เหตุผล)
│   │   ├── exceptions.js       # การจัดกลุ่ม/ความถี่/เจ้าของงานของข้อยกเว้น (presentation เท่านั้น)
│   │   ├── access.js           # สิทธิ์บทบาท + ขอบเขตบริษัท + separation of duties
│   │   ├── workflow.js         # state machine ของงาน + optimistic version + outbox
│   │   ├── guards.js           # หลักฐาน/ความเสี่ยง/สัญญา AP → เหตุผลที่บล็อก action
│   │   ├── audit.js            # บันทึกแบบ append-only + สรุป
│   │   ├── store.js            # ชั้น state: snapshot (immutable) + overlay (portal) + persist
│   │   └── ruleCatalog.js      # คำอธิบาย V-01…V-09 + ช่อง asBuilt (ไม่ใช้ตัดสิน)
│   ├── data/                   # ข้อมูล generated (ห้ามแก้ด้วยมือ)
│   │   ├── master-data.js      # นิติบุคคล 48 แถว + exception 15 รหัส + tolerance
│   │   └── snapshots.js        # 22 เอกสาร / 24 snapshot จาก engine mirror
│   ├── engine/rules.js         # ⚠️ as-built mirror — ใช้เฉพาะ tools/ สร้าง fixture
│   ├── ui/                     # dom helpers + format helpers
│   ├── views/                  # dashboard / queue / detail / master / audit / help (return HTML string)
│   └── styles/app.css          # design tokens จาก mockup v4.4 (navy/teal/paper, Sarabun + JetBrains Mono)
├── tools/
│   ├── serve.py                # static server + no-store headers
│   ├── build-master-data.py    # master_data.py → src/data/master-data.js
│   ├── build-fixtures.mjs      # cases × engine mirror → snapshots.js (+ golden + --check)
│   ├── cases-*.mjs             # เคสสังเคราะห์ 22 เคส (แยกไฟล์เพื่อเลี่ยงปัญหาไฟล์ใหญ่)
│   ├── browser-check.mjs       # เปิด Chromium จริง: console error, ค่าเสียบนจอ, SoD, 390px
│   └── smoke-test.mjs          # 9 กลุ่ม 107 การตรวจ
└── docs/                       # เอกสารพัฒนา (00…07)
```

---

## เอกสาร

| ไฟล์ | เนื้อหา |
|------|---------|
| [docs/00-overview.md](docs/00-overview.md) | ปัญหาที่แก้ ขอบเขต สิ่งที่ไม่ทำ และคำศัพท์ |
| [docs/01-architecture.md](docs/01-architecture.md) | เลเยอร์ ทิศทางการพึ่งพา data flow และวิธีบังคับข้อห้าม |
| [docs/02-data-contract.md](docs/02-data-contract.md) | receiving contract v1.0 ฟิลด์ core/extended กฎ validation ตัวอย่าง JSON |
| [docs/03-domain-model.md](docs/03-domain-model.md) | API ของทุก module ใน `src/domain` + กติกาใช้งาน |
| [docs/04-ui-spec.md](docs/04-ui-spec.md) | route แต่ละหน้า องค์ประกอบ ตัวกรอง ปุ่ม watermark และ mode เดโม |
| [docs/05-build-and-test.md](docs/05-build-and-test.md) | pipeline สร้างข้อมูล การเพิ่มเคส การทดสอบ และ exit code |
| [docs/06-as-built-gaps.md](docs/06-as-built-gaps.md) | ส่วนต่าง engine as-built ↔ มาตรฐาน 6.2 + สิ่งที่ยังปิดไม่ได้ใน portal |
| [docs/07-demo-script.md](docs/07-demo-script.md) | บทเดโม 9 ฉาก + เคสข้อมูลทั้งหมดที่เตรียมไว้ |

---

## สถานะข้อมูลเดโมปัจจุบัน (ยืนยันแล้ว)

- เอกสาร **22 ฉบับ / snapshot 24 รุ่น** · contract error **0** · warning **3**
  (ทั้ง 3 รายการมาจาก `AIVA-2609-0016` — snapshot ที่เขียนมือเพื่อสาธิต pipeline ล่ม ฟิลด์ invoice ว่าง)
- ผลตรวจจาก engine: `Auto-pass 7` · `Review 5` · `Hold 7` · `Manual Review 3`
- workflow ตั้งต้น: `PENDING_REVIEW 18` · `REJECTED 1` · `ON_HOLD 1` · `RESUBMITTED 1` · `CONFIRMED 1`
- ผู้ใช้เดโม 7 คน 4 บทบาท (EU/ACC/APR/ADM) — ผู้ใช้เริ่มต้นคือ `u6 SOMCHAI.P` (APR)

รายละเอียดเคสแต่ละฉบับ: [docs/07-demo-script.md](docs/07-demo-script.md)
