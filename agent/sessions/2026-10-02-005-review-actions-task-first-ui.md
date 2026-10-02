# SESSION-20261002-005 — Review actions and task-first UI

- Started: `2026-10-02T09:54:42+07:00`
- Completed: `2026-10-02T10:10:57+07:00`
- Task: `TASK-20261002-005`
- Status: completed

## User direction
ตรวจ mockup v4.4 อีกครั้งเพราะระบบยังไม่มีแก้ไข/ส่งตรวจซ้ำ/reject/pass และปรับ UI โดยวิเคราะห์ลำดับข้อมูลกับ user journey ก่อนพัฒนา

## Analysis and decision
- Mockup มี explain, resubmit, rerun, return, reject, hold, confirm และ post พร้อม reason/note/new receipt และ role/status guards
- `doAct` ของ mockup เปลี่ยน rule เป็น PASS และ Posted ใน browser จึงใช้เป็น UX reference เท่านั้น
- ระบบจริงแยก immutable source result ออกจาก Portal workflow; action ที่ต้องให้ upstream ทำงานใช้ persistent outbox และรอ revision ใหม่
- AP post ยังไม่เปิด เพราะไม่มี AP acknowledgement และ identity สำหรับ separation of duties

## Delivered
- Persistent workflow/action request models, server-side state transitions, reason validation, High-severity note requirement, optimistic concurrency and idempotency
- Producer endpoints for pending action requests and accepted/failed acknowledgements
- Automatic request completion and workflow restart when a newer source revision arrives
- Task-first queue/detail UI, action modal, blocking reasons, workflow badges, integrated history and action outbox integration guide
- Five focused tabs with technical ownership/source/JSON grouped under additional information
- `docs/08-task-first-review-ux.md` and updated receiving API, implementation status and mockup parity records

## Verification
- Backend unittest: 15 passed
- TypeScript + Vite production build: passed
- Playwright on Edge: 6 passed, including persistent resubmit/outbox/new revision flow
- Desktop/mobile screenshots visually inspected; mobile root overflow check passed
- Local preview on port 8010 restarted and verified with the existing two-revision synthetic document

## Remaining boundary
Entra/RBAC and actor identity are required before role-specific authorization. OCR/Oracle execution remains upstream. AP post remains unavailable until a real acknowledgement contract and separation of duties are enforced.
