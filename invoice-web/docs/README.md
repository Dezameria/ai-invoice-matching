# AIVA Invoice Portal — แผนพัฒนาระบบเต็มรูปแบบ

> **สถานะล่าสุด 2026-10-02:** พัฒนา receiving portal แล้ว — รับ JSON/PDF, เปิดย้อนหลังตาม revision และเก็บ review actions ผ่าน persistent outbox อ่าน [คู่มือใช้งาน](../README.md), [Receiving API](04-receiving-api.md), [สถานะ implementation](05-implementation-status.md) และ [Task-first UX](08-task-first-review-ux.md) ก่อน แผน 01–03 ด้าน end-to-end OCR/AP เป็นข้อเสนอเดิม ไม่ใช่ความสามารถที่เปิดใช้ในรุ่นนี้

จัดทำ: 2026-10-01T16:40:53+07:00  
สถานะเอกสารฉบับ 2026-10-01: ข้อเสนอเดิมก่อนเริ่มพัฒนา; ดูสถานะล่าสุดด้านบน

## ข้อเสนอหลัก

ใช้ **React + TypeScript + Vite** สำหรับหน้าเว็บ, **FastAPI** สำหรับ Portal API, **PostgreSQL** สำหรับข้อมูล workflow และ audit, **Microsoft Entra ID** สำหรับเข้าสู่ระบบ และใช้ **OCR service เดิม** เป็นฐานของเครื่องมือตรวจเอกสาร โดยเพิ่ม contract และความทนทานก่อนใช้งานจริง

ยึด [mockup v4.4](../../Web%20portal/AIVA-Web-Portal-Mockup-v4.4-Release.html) เป็นหลักด้านหน้าตา ข้อมูล สิทธิ์ และ workflow ส่วนเอกสารและโค้ดเดิมใช้ระบุความสามารถที่มีอยู่จริง ห้ามถือว่า mockup หรือคำว่า production ใน README แปลว่าระบบรองรับงานนั้นแล้ว

## อ่านตามลำดับ

1. [Tech stack และสถาปัตยกรรม](01-tech-stack-and-architecture.md) — เลือกเทคโนโลยี เหตุผล ขอบเขตแต่ละบริการ และโครงสร้างเป้าหมาย
2. [ข้อกำหนดจาก mockup และช่องว่างระบบ](02-mockup-requirements-and-gaps.md) — หน้าจอ RBAC การเปลี่ยนสถานะ และความต่างของมาตรฐาน
3. [ข้อมูล API และแผนส่งมอบ](03-data-api-and-delivery-plan.md) — แบบจำลองข้อมูล API ที่ต้องเพิ่ม ลำดับพัฒนาและเกณฑ์ตรวจรับ
4. [Receiving API ที่ใช้งานจริง](04-receiving-api.md) — contract ของ JSON/PDF และ read APIs ในรุ่นปัจจุบัน
5. [สถานะ implementation](05-implementation-status.md) — สิ่งที่ทำแล้ว ข้อจำกัด และลำดับงานถัดไป
6. [โครงสร้างโปรเจกต์สำหรับพัฒนาต่อ](06-project-structure.md) — ตำแหน่งไฟล์ dependency direction และแนวทางเพิ่ม feature
7. [Mockup v4.4 feature parity](07-mockup-feature-parity.md) — ผลตรวจ UI-01–15 สิ่งที่พร้อมใช้ บางส่วน และรอ dependency
8. [Task-first review UX](08-task-first-review-ux.md) — ลำดับข้อมูล user journey และ action flow ที่พัฒนาจาก mockup

## ประเด็นที่ต้องตกลงก่อนเปิดใช้ข้อมูลจริง

- Mockup ระบุ Standard **6.6 / schema 1.5** แต่ core OCR ระบุ **6.2** และ SSE แปลงผลเป็น **schema 1.1**; รหัสเดียวกันอาจหมายถึงคนละข้อผิดพลาด
- เอกสาร `docs` บางส่วนไม่ตรงกับโค้ด เช่นรูปแบบ response, SSE events และกฎราคา/จำนวน ต้องทำ contract tests และยืนยันกฎกับเจ้าของระบบ
- ยังไม่พบ Portal database, server-side RBAC, Entra login, durable job queue หรือ AP write adapter ใน source ที่ตรวจ
- ข้อมูล Receiver/Employee ID, หลักฐานรายหน้า และผลจับคู่รายบรรทัดยังต้องขยายจาก OCR/Oracle ให้ครบก่อนใช้ควบคุมสิทธิ์จริง

รอบ 2026-10-01 เพิ่มเฉพาะเอกสารแผนจึงไม่สร้าง development session ส่วนรอบพัฒนา 2026-10-02 บันทึก canonical records ตาม AGENTS.md แล้ว

## แหล่งอ้างอิงใน repository

| แหล่ง | ใช้สำหรับ |
|---|---|
| [Portal mockup](../../Web%20portal/AIVA-Web-Portal-Mockup-v4.4-Release.html) | UI และ workflow เป้าหมาย; ฟังก์ชันอ้างอิงระบุในเอกสารข้อกำหนด |
| [Architecture เดิม](../../docs/system-architecture.md) | ภาพรวม OCR, Oracle, Paperless, LiteLLM |
| [Rules เดิม](../../docs/matching-rules-standard-v6.2.md) | ข้อกำหนดที่ต้องตรวจทานเทียบ engine |
| [API เดิม](../../docs/api-reference.md) | รายการ integration; ตัวอย่างไม่ใช่ contract ที่ยืนยันแล้ว |
| [Integrations](../../docs/integrations.md) | ขอบเขตบริการภายนอก |
| [OCR README](../../OCR%20service/n8n/README.md) | วิธีใช้งานบริการปัจจุบัน |
| [Core models](../../OCR%20service/n8n/app/core/models.py) | รูปแบบข้อมูลที่ประกาศจริง |
| [Rules engine](../../OCR%20service/n8n/app/core/rules.py) | พฤติกรรมการตรวจที่ implement ปัจจุบัน |
| [Frontend routes](../../OCR%20service/n8n/app/api/frontend_routes.py) | SSE และการแปลงข้อมูลให้ UI เดิม |
| [Pipeline](../../OCR%20service/n8n/app/services/pipeline.py) | การประสานงาน OCR และ matching |

การตรวจครั้งนี้เป็นการอ่านเอกสารและโค้ด ไม่ได้รัน live integration tests และไม่ได้ยืนยันผลทดสอบย้อนหลังที่ README ระบุ
