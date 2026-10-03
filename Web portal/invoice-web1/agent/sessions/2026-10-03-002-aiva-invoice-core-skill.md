# Session `2026-10-03-002` — AIVA Invoice Core Skill

- Started: `2026-10-03T08:29:53+07:00`
- Completed: `2026-10-03T08:33:34+07:00`
- Task: `TASK-20261003-002`
- Status: `completed`

## Goal

สร้าง repository-local skill ที่สรุปแก่นของระบบ AIVA Invoice Matching สำหรับใช้พัฒนาต่อ โดยเน้น field, validation rules และ requirement สำคัญ ไม่ผูกกับโครงสร้าง implementation ละเอียดเกินจำเป็น

## Sources reviewed

- `Web portal/AIVA-Web-Portal-Mockup-v4.4-Release.html`
- `OCR service/n8n/app/core/models.py`, `rules.py`, `master_data.py`
- `OCR service/n8n/app/services/vision_extractor.py`
- Portal document/workflow schemas และ receiving/gap documents
- `docs/matching-rules-standard-v6.2.md` และเอกสารระบบที่เกี่ยวข้อง

## Changes

- เพิ่ม `.agents/skills/aiva-invoice-core/SKILL.md`
- เพิ่ม `.agents/skills/aiva-invoice-core/references/core-domain.md`
- เพิ่ม `.agents/skills/aiva-invoice-core/agents/openai.yaml`
- บันทึก field catalog, V-01–V-09, decision/routing, workflow/audit requirements, production gates และความขัดแย้งของ version/code

## Verification

- `PYTHONUTF8=1 python .../quick_validate.py .agents/skills/aiva-invoice-core` — passed (`Skill is valid!`)
- ตรวจ reference link ภายใน skill และ source paths ที่อ้างถึง — พบครบ
- ไม่ได้รัน application tests เพราะไม่มีการเปลี่ยน runtime code

## Notes

- Skill ใช้ executable schema/code เป็นแหล่งอธิบายพฤติกรรมปัจจุบัน แต่ไม่ยก implementation ปัจจุบันเป็นมาตรฐานบัญชีที่รับรองแล้ว
- Exception code ต้องแปลร่วมกับ standard/rule version และ rule ID เสมอ
