# แผนการย้าย Web Portal → v5 (repo-reference portal)

เอกสารนี้อธิบาย *เหตุผล* และ *แผนที่ใช้จริง* ตอนย้าย portal จาก v4 มาเป็น v5
ส่วนรายละเอียดทางเทคนิคของสิ่งที่สร้างเสร็จแล้วอยู่ใน `as-built-v5.md`

---

## 1. ปัญหาของ v4 ที่ทำให้ต้องทำ v5

v4 เป็น portal ที่ "ใช้งานได้" แต่ข้างในคือการ **คัดลอก** ของจาก repo มาไว้ในโค้ด UI

| สิ่งที่ v4 copy มาไว้ | ต้นฉบับจริง | ผลที่เกิด |
| --- | --- | --- |
| `src/engine/rules.js` (กฎ V-01…V-09) | `OCR service/n8n/app/core/rules.py` | portal คำนวณผลตรวจเอง ซ้อนกับ engine จริง → ผลไม่ตรงกันได้โดยไม่มีใครรู้ |
| `src/data/master-data.js` (นิติบุคคล/รหัสข้อยกเว้น) | `app/core/master_data.py` | แก้ใน repo แล้ว portal ไม่ขยับ ยังแสดงชื่อ/สถานะเก่า |
| ข้อความเกณฑ์ใน `src/views/help.js` | `docs/matching-rules-standard-v6.2.md` | คนอ่าน portal เห็น personละ version กับคนที่อ่าน docs |
| ค่าสี/ฟอนต์ hardcode ใน CSS | `AIVA-Web-Portal-Mockup-v4.4-Release.html` | ธีมหลุดจาก mockup ทีละนิด |
| หน้า `dashboard.js` + `queue.js` + `master.js` ซ้ำกัน | — | 3 หน้าตอบคำถามเดียวกัน ผู้ใช้ต้องเดาเองว่าข้อมูลอยู่หน้าไหน |

v4 ไม่มีทางรู้เลยว่า "ต้นฉบับเปลี่ยนไปหรือยัง" — ไม่มี sha, ไม่มี path, ไม่มีคำสั่งตรวจ

## 2. เป้าหมายของ v5 (และสิ่งที่ *ไม่* ทำ)

**ทำให้ได้**

1. portal เป็น **ชั้นแสดงผลลัพธ์ (view layer)** ของ engine ไม่ใช่ engine ตัวที่สอง
2. ข้อมูลอ้างอิงทุกชนิด (master data, รหัสข้อยกเว้น, ตัวเลข tolerance, ตัวอักษรมาตรฐาน, สี)
   ต้องมาจากไฟล์ใน repo ผ่าน **ไฟล์ generated ที่มีที่มา** (path + sha256 + bytes + lines + mtime)
3. ความต่างระหว่าง "เอกสารมาตรฐาน" กับ "โค้ด as-built" ต้อง **แสดงบนหน้าจอ** ไม่ใช่เก็บไว้รู้กันเอง
4. no-build: เปิดด้วย `tools/serve.py` แล้วใช้ได้ทันที (ES modules ล้วน ไม่มี bundler ไม่มี npm dependency)
5. ทุกหน้าตอบคำถามเดียวของผู้ใช้ก่อนเสมอ: "ตอนนี้ฉันต้องกดอะไร ต่อจากใคร"

**ไม่ทำ (ปิดไว้เป็นนโยบาย ไม่ใช่ของหลุด)**

- ไม่ส่งตั้งหนี้จริง (Posting Gateway / AP contract v1 ยังไม่มี) — ยืนยันแล้วหยุดที่ `CONFIRMED`
- ไม่ render ตัวไฟล์ PDF (repo ต้นทางรับได้แค่ `.png` → ไม่มี bytes จริงให้เปิด) portal แสดง metadata + สถานะหลักฐาน
- ไม่เรียก API จริง, ไม่มี backend, ไม่มี storage ถาวร (state อยู่ที่ `localStorage` ของ browser เท่านั้น)

## 3. ทิศทางข้อมูล (data flow) ที่ยอมรับทางเดียว

```
repo (ต้นฉบับจริง)
  OCR service/n8n/app/core/master_data.py ─┐
  OCR service/n8n/app/core/rules.py        │  python tools/sync.py  (อ่านอย่างเดียว)
  docs/*.md                                │
  AIVA-Web-Portal-Mockup-v4.4-Release.html ─┘
        ↓ generated พร้อม provenance
  src/data/{master-data,sources,repo-docs,design-tokens}.js
        ↓ domain/reference.js (แปลเป็นมุมมอง "มาตรฐาน vs as-built")
  src/views/*.js  ← ห้าม import src/engine/rules.js (มี test เฝ้า)

src/engine/rules.js (mirror ของ rules.py ใช้ตอน build เท่านั้น)
        ↓ node tools/build-snapshots.mjs (รัน fixtures 22 ฉบับ)
  src/data/snapshots.js  (snapshot + ผล expect + schema/warning ของจริง)
        ↓ src/domain/store.js
  src/views/*.js (render เป็น HTML string) → app.js (router + รับ event)
```

**กฎเหล็ก:** ลูกศรไหลลงทางเดียว ไฟล์ `src/data/*` ห้ามแก้ด้วยมือ และ `src/views/*` ห้ามคำนวณผลตรวจเอง

## 4. ตารางย้ายไฟล์ v4 → v5

| v4 | v5 | วิธีย้าย |
| --- | --- | --- |
| `src/domain/{money,workflow,access,guards,audit,schema,exceptions,company,store,ruleCatalog}.js` | เหมือนเดิม (ไฟล์เดิม) | copy ตรง + ปรับ store ให้กิน `snapshots.js` ของ v5 และกัน `post` ที่ชั้น guard |
| `src/engine/rules.js` | `src/engine/rules.js` | copy ไว้ใช้ **ตอน build snapshot เท่านั้น** + เพิ่ม test กัน import จาก views |
| `src/ui/{dom,format}.js` | เหมือนเดิม + `ui/markdown.js` | เพิ่ม renderer markdown แบบไม่พึ่ง library |
| `src/data/master-data.js` (เขียนมือ) | `src/data/master-data.js` (generated) | แทนที่ด้วย `tools/sync.py` ที่ parse จาก `master_data.py` |
| `tools/build-fixtures.mjs` | `tools/build-snapshots.mjs` | เปลี่ยนจาก "สร้าง fixture" เป็น "รัน engine แล้วเก็บ snapshot + ผลตรวจ contract" |
| — (v4 ไม่มี) | `tools/sync.py`, `src/domain/{reference,mdtext}.js`, `src/ui/parts.js`, `src/views/{rules,manual,sources}.js`, `tools/smoke-test.mjs` | ของใหม่ทั้งหมด |
| `src/views/{dashboard,queue,master,help}.js` | ยุบเป็น `work.js` (คิว+dashboard), `rules.js` (master+เกณฑ์), `manual.js` (help) | รวมหน้าที่ตอบคำถามซ้ำ |
| `docs/0*.md` (อธิบาย portal) | `docs/PORTAL-plan.md`, `docs/as-built-v5.md` | เขียนใหม่ให้ตรงกับของจริงปัจจุบัน |
| `tools/browser-check.mjs` (v4) | `tools/browser-check.mjs` (v5) | เขียนใหม่: Edge headless + CDP, ไม่พึ่ง npm |

## 5. รอบการทำงานปกติ (ทำทุกครั้งก่อนส่งงาน)

```bash
python tools/sync.py --check                 # ต้นฉบับขยับไหม (exit 1 ถ้าขยับ)
python tools/sync.py                          # ถ้าขยับ → generate ใหม่ แล้ว commit ทั้ง repo และไฟล์นี้
node tools/build-snapshots.mjs                # รัน engine → snapshots + ผลตรวจ contract
node tools/smoke-test.mjs                     # 31 ข้อ: สถาปัตยกรรม + domain + render ทุกหน้า
node tools/browser-check.mjs                  # 29 ข้อ: เปิด Edge จริง ไล่ทุก route + ไหวจริงของปุ่ม
python tools/serve.py                         # เปิดดูเอง (มี --open)
```

## 6. เกณฑ์รับงาน (acceptance) ของ v5

1. `sync.py --check` ผ่าน และไฟล์ generated ทุกไฟล์บอก path + sha256 ของต้นฉบับ
2. ไม่มี import จาก `src/views/*` หรือ `app.js` ไปยัง `src/engine/rules.js` (test enforcing)
3. ตัวเลขทุกตัวเป็น decimal string ผ่าน `domain/money.js` — ห้าม float, ห้าม `Number()` กับเงิน
4. เปิดเอกสารทุกฉบับต้องเห็น "ที่มา" (path + sha สั้น) ของข้อมูลหลักบนหน้าจอ
5. ความขัดแย้ง docs vs code แสดงในหน้า `#/rules` พร้อมนับจำนวนแยกประเภท
6. ปุ่มที่ถูกปิดต้องมีเหตุผลกำกับเสมอ (สามชั้น: สิทธิ์ → สถานะ → guard)
7. smoke-test + browser-check ผ่าน 100% ไม่มี console error / ไม่มี request ที่ล้มเหลว

## 7. สิ่งที่ยังไม่ทำ และเงื่อนไขก่อนจะทำ

| งาน | ทำไมยังไม่ทำ | เงื่อนไขที่ควรทำ |
| --- | --- | --- |
| ส่งตั้งหนี้จริง (post) | สัญญา API ฝั่ง AP/Oracle ยังไม่ถูกสร้าง | มี contract v1 + sandbox → เปิด `post` ที่ guard เท่านั้น (logic พร้อมแล้ว) |
| เปิดไฟล์ PDF จริง | ต้นทางส่งได้แค่ `.png` | producer แนบไฟล์จริงพร้อม path ที่ fetch ได้ → แทน metadata ด้วย `<object>` |
| อ่าน snapshot จาก API แทน `snapshots.js` | ยังไม่มี endpoint | มี API + schema เดิม → เพิ่ม adapter ใน `store.js` โดยไม่แตะ views |
| test แบบ visual regression | ยังไม่จำเป็น | เมื่อธีมถูกออกแบบรอบใหญ่ ให้เทียบ screenshot จาก mockup v4.4 |
| multiple company scope ต่อ user | ข้อมูลเดโมกำหนดตายตัว | ต่อ master data จริงจาก `sync.py` |

## 8. ข้อควรระวัง (อ่านก่อนแก้โค้ด)

- **ห้าม** แก้ไฟล์ใน `src/data/` ด้วยมือ — ให้แก้ต้นฉบับใน repo แล้วรัน `sync.py`
- **ห้าม** เพิ่มตรรกะคำนวณผลจับคู่ใน view — ถ้าข้อมูลไม่พอแสดงว่า snapshot ต้องถูกสร้างใหม่
- **ห้าม** ใช้ `\u` escape เขียนภาษาไทยในโค้ด/สคริปต์ตรวจ (เคยเพี้ยนเป็นอักษรจีน/สระผิด) — เขียนไทยตรง ๆ ผ่าน editor tool แล้วให้ test เป็นตัวตรวจ
- test ที่ตรวจสอบ *ข้อความภาษาไทย* บนหน้าจอ ให้อ้างอิง token ที่เป็น ASCII/ตัวเลข (เช่น `V-01`, `Master data`, `sha256`, `tab=work`) เพราะ escape ไทยสะกดเพี้ยวง่าย
- ถ้าเพิ่มปุ่มใหม่ ต้องมี `data-*` hook ให้ browser-check จับได้ และต้องไม่ duplicate ที่เดิมในหน้าอื่น
