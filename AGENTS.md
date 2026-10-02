# Agent Operating Protocol

คำสั่งนี้ครอบคลุมทั้ง repository และมีไว้เพื่อให้ agent ทุก session ใช้ข้อมูลชุดเดียวกัน

## Core Principle: Scope การบันทึก Log

> **บันทึกเฉพาะรอบการทำงานที่มีการแก้ไข Code หรือโครงสร้าง Project เท่านั้น**
> - งานประเภทตอบคำถาม, อธิบายโค้ด, ตรวจสอบสถานะ (read-only), หรือรันคำสั่งทั่วไประหว่างทางที่ยังไม่มีการแก้โค้ดหรือโครงสร้างโปรเจกต์ **ไม่ต้องสร้าง session file หรือบันทึก log**
> - เมื่อมีการแก้ไข source code, เพิ่ม/ลบโมดูล หรือปรับโครงสร้างโปรเจกต์ ให้บันทึกผลการเปลี่ยนแปลงตามประเภท records ด้านล่าง

## Canonical Records

ข้อมูลการทำงานของ agent แบ่งเป็น 5 ประเภท โดยเก็บใน `agent/`:

1. **Current State** — `agent/current-state.md`
   - ภาพ snapshot ล่าสุดของโปรเจกต์ สถาปัตยกรรม สถานะที่ตรวจยืนยันแล้ว และข้อจำกัดปัจจุบัน
   - แก้ไขทับได้ เมื่อสถานะหรือโครงสร้างโปรเจกต์มีการเปลี่ยนแปลง
2. **Task และ Plan** — `agent/task-plan.md`
   - งานที่กำลังทำ เป้าหมาย ขอบเขต แผน ขั้นตอน และ acceptance criteria
   - แก้ไขสถานะของงานปัจจุบันได้เมื่อมีงานพัฒนา (Development Task)
3. **Changelog และ Work Log** — `agent/changelog.md` และ `agent/work-log.md`
   - Changelog บันทึกผลเปลี่ยนแปลงถาวรต่อระบบ/โค้ด (เช่น เพิ่มฟีเจอร์, แก้บั๊ก)
   - Work Log บันทึกสิ่งสำคัญที่ agent ลงมือทำและผลการตรวจสอบ
   - ทั้งสองไฟล์เป็น append-only; บันทึกเฉพาะเมื่อมีการแก้ไขโค้ดหรือโครงสร้างโปรเจกต์
4. **Error และ Solution** — `agent/errors-and-solutions.md`
   - บันทึกเฉพาะข้อผิดพลาดสำคัญที่มีโอกาสเกิดซ้ำ พร้อมสาเหตุ วิธีแก้ และวิธีป้องกัน (append-only)
5. **Session History** — `agent/sessions/`
   - เก็บประวัติเฉพาะรอบที่มีการแก้ไข code หรือโครงสร้างโปรเจกต์ โดยใช้ชื่อ `YYYY-MM-DD-NNN-short-title.md`

`agent/README.md` เป็นสารบัญและนิยาม ไม่ใช่ record ประเภทที่หก

## Development Workflow (เมื่อมีการแก้ Code หรือโครงสร้างโปรเจกต์)

เมื่อเริ่มงานพัฒนาที่มีการแก้ code หรือโครงสร้าง:

1. อ่าน `agent/current-state.md`, `agent/task-plan.md`, และ `agent/errors-and-solutions.md`
2. อัปเดตเป้าหมายใน `agent/task-plan.md`
3. ดำเนินการแก้ไข source code / โครงสร้างโปรเจกต์ และทดสอบความถูกต้อง

เมื่อเสร็จสิ้นงานพัฒนารอบนั้น:

1. รันการตรวจสอบหรือ test และบันทึกผลจริง
2. อัปเดต `agent/current-state.md` ให้สะท้อนสถานะล่าสุด
3. เพิ่มรายการใน `agent/changelog.md` และ `agent/work-log.md`
4. สร้าง session file สรุปการแก้ไขใน `agent/sessions/`
5. ปิดสถานะใน `agent/task-plan.md`

## Record Rules

- ใช้เวลา ISO 8601 พร้อม timezone เช่น `2026-10-01T15:30:00+07:00`
- ใช้วันที่และ sequence เพื่อสร้าง ID เช่น `ERR-20261001-001`
- ห้ามใส่ข้อมูลลับ token, password, invoice payload หรือข้อมูลส่วนบุคคลลงใน record
