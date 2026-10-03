---
name: aiva-invoice-core
description: Use the AIVA invoice-matching domain contract when designing, implementing, reviewing, or documenting OCR extraction, PO/receipt matching, validation rules, Portal snapshots, review workflow, or audit behavior in this repository. Do not use it as an approved accounting standard or production authorization policy.
---

# AIVA Invoice Core

ใช้ skill นี้เพื่อรักษาความหมายของข้อมูลและกติกาหลักให้ตรงกันระหว่าง OCR service, Web Portal และเอกสารอ้างอิง โดยไม่บังคับโครงสร้างโค้ดหรือเทคโนโลยีเฉพาะ

ก่อนแก้ schema, matching, status, workflow หรือหน้าจอที่แสดงผลตรวจ ให้อ่าน [references/core-domain.md](references/core-domain.md)

## หลักตัดสินใจ

1. แยกขอบเขตเป็น `source document -> extraction -> deterministic validation/matching -> immutable result snapshot -> human workflow` เสมอ
2. AI/Vision มีหน้าที่สกัดข้อมูลและหลักฐานเท่านั้น ห้ามให้ AI คำนวณ ตัดสิน PASS/FAIL หรืออนุมัติรายการ
3. รักษาเลขรุ่นแยกกัน: `portal schema version`, `source standard version`, `engine/rule catalog version` และ `document revision` ห้ามใช้แทนกัน
4. เมื่อแหล่งข้อมูลขัดกัน ให้ใช้ลำดับนี้สำหรับพฤติกรรมปัจจุบัน: executable schema/tests > implementation code > current Portal receiving contract > architecture docs > HTML mockup. สำหรับนโยบายบัญชี production ต้องขอการรับรองจากเจ้าของมาตรฐาน ไม่ถือว่า code ปัจจุบันถูกต้องเชิงธุรกิจโดยอัตโนมัติ
5. ห้ามแปล exception จาก code อย่างเดียว ต้องพิจารณาอย่างน้อย `standard_version + rule_id + exception_code`
6. ข้อมูลที่ไม่มีให้เป็น `null`, ว่างตาม contract หรือ `not_evaluated`; ห้ามสร้าง receipt, receiver, ORG_ID, evidence หรือ PASS สมมติ
7. Portal เก็บและแสดง snapshot จากระบบต้นทาง ไม่คำนวณผล matching ใหม่ และ human action ต้องไม่แก้หลักฐานหรือเปลี่ยนผล OCR เดิมเป็น PASS
8. การเปลี่ยน contract ต้องระบุ source of truth, compatibility/migration, validation และ test case ที่ครอบคลุมผลลัพธ์ observable

## วิธีใช้ระหว่างพัฒนา

- เริ่มจากระบุ stage และ version ที่กำลังเปลี่ยน
- เลือกเฉพาะ field และ invariant ที่จำเป็นจาก core reference; ไม่จำเป็นต้องคัดลอกทุก field ไปทุก boundary
- ถ้าเปลี่ยนกฎ ให้บันทึก input, tolerance, output, severity, routing, halt/bypass behavior และ evidence ที่ตรวจสอบย้อนกลับได้
- ถ้าเปลี่ยน workflow ให้แยก `verification status`, `workflow status` และ `processing/job status`
- ถ้ายังไม่มี policy ที่รับรอง ให้คงผลเดิม ส่ง Manual Review/Hold แบบ fail-safe และเขียนข้อสมมติให้ชัด

## เกณฑ์ขั้นต่ำก่อนถือว่าพร้อมใช้งานจริง

- schema validation, deterministic rule tests และ golden cases ผ่าน
- idempotency, revision conflict และ retry behavior ชัดเจน
- authorization บังคับที่ backend ทุกช่องทางอ่าน/เขียน รวม PDF, history และ audit
- audit ระบุตัวตนจริงและไม่บันทึก secret หรือ invoice payload เกินจำเป็น
- ไม่มีการ Auto-pass เมื่อ dependency ล้มเหลว ข้อมูลไม่ครบ รุ่นกฎไม่เข้ากัน หรือผลจับคู่กำกวม

