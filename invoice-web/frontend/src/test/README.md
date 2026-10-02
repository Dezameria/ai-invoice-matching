# Frontend test support

- `fixtures/` เก็บข้อมูลสังเคราะห์ที่ UI ใช้ใน local demo และ automated tests
- Browser tests อยู่ที่ `frontend/tests/` เพราะ Playwright รันจากภายนอก application bundle
- ห้ามใส่ invoice จริง ข้อมูลส่วนบุคคล หรือ credential ใน fixture
