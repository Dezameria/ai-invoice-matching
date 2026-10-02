# Database migrations

Local pilot ยังใช้ SQLite และสร้างตารางตอนเริ่มระบบ โฟลเดอร์นี้สงวนไว้สำหรับ Alembic เมื่อเลือก PostgreSQL และกำหนด deployment/rollback process แล้ว

ห้ามเพิ่ม migration เปล่าที่ทำให้เข้าใจว่าระบบรองรับ PostgreSQL production แล้ว
