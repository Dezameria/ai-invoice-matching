# Agent Records

ไดเรกทอรีนี้เป็นแหล่งข้อมูลกลางสำหรับส่งต่องานระหว่าง agent sessions โดยบันทึกเฉพาะรอบที่มีการแก้ไข Code หรือโครงสร้างโปรเจกต์

| ประเภท | Source of truth | หน้าที่ | รูปแบบการอัปเดต |
|---|---|---|---|
| Current State | `current-state.md` | ภาพรวมสถานะโปรเจกต์ สถาปัตยกรรม และข้อจำกัด | Replace snapshot (เมื่อโปรเจกต์เปลี่ยน) |
| Task และ Plan | `task-plan.md` | งานที่กำลังพัฒนาและแผนงาน | Mutable current task |
| Changelog และ Work Log | `changelog.md`, `work-log.md` | บันทึกสิ่งที่เปลี่ยนในโค้ด/ระบบ และการดำเนินงาน | Append-only (เฉพาะเมื่อแก้โค้ด/โครงสร้าง) |
| Error และ Solution | `errors-and-solutions.md` | บันทึกปัญหาสำคัญและวิธีป้องกัน | Append-only |
| Session History | `sessions/*.md` | สรุปผลการเปลี่ยนแปลงในรอบการพัฒนา | New file per dev session |

> **หมายเหตุ**: หากเป็นงานตอบคำถาม อธิบายโค้ด ตรวจสอบสถานะ หรือรันคำสั่งทั่วไประหว่างทาง ไม่ต้องสร้าง session file หรือบันทึก log ให้ซ้ำซ้อน
