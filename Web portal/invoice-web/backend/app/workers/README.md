# Workers boundary

งานรับ JSON และแนบ PDF ปัจจุบันเป็น synchronous request ที่สั้น จึงยังไม่มี Celery/Redis worker

ถ้าเพิ่ม OCR, DMS transfer หรือ AP submission ให้สร้าง job ledger และ adapter ใน boundary นี้ พร้อม idempotency, retry และ reconciliation ตาม `docs/01-tech-stack-and-architecture.md` ห้ามวางงานยาวไว้ใน API route
