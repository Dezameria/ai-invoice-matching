# Task-first review UX

อัปเดต `2026-10-02T10:07:32+07:00`

## เป้าหมาย

หน้าจอออกแบบให้ผู้ใช้ตอบคำถามตามลำดับ: **เอกสารนี้ต้องทำอะไร → มีปัญหาอะไร → หลักฐานอยู่หน้าไหน → จะดำเนินการอย่างไร** แล้วจึงเปิดข้อมูลเทคนิคเมื่อจำเป็น

## ลำดับข้อมูลในหน้ารายละเอียด

1. Invoice, supplier และผลตรวจจากต้นทาง เพื่อยืนยันว่าเปิดเอกสารถูกฉบับ
2. Company, PO/Release, receipt และยอดรวม ซึ่งใช้ตัดสินใจบ่อย
3. การ์ด “ขั้นตอนถัดไป” แสดง workflow, ผู้รับผิดชอบ, action ที่ใช้ได้ และเหตุผลของ action ที่ยังใช้ไม่ได้
4. Summary แสดง STEP, exception, severity และลิงก์ไปหน้าหลักฐานใน PDF
5. Line/rule details สำหรับตรวจเจาะลึก
6. History แสดงทั้ง revision และ human action
7. Ownership, ORG_ID, source identifiers, revisions และ JSON รวมไว้ใน “ข้อมูลเพิ่มเติม”

PDF อยู่ด้านขวาบน desktop เพื่อเทียบหลักฐานกับผลตรวจโดยไม่เปลี่ยนหน้า บนจอแคบย้ายลงด้านล่างและคงปุ่มเปิด/ซ่อน PDF

## User journey

1. เปิดคิว แล้วดูคอลัมน์ **งานที่ต้องทำ** ก่อนผลตรวจจากต้นทาง
2. เปิดเอกสาร ระบบแสดงผู้รับผิดชอบและ action แนะนำ
3. อ่าน exception และกดหลักฐานเพื่อเปิด PDF หน้าที่เกี่ยวข้อง
4. เลือก action พร้อม reason; ระบบขอ note เมื่อยืนยันผล High severity
5. Portal บันทึก workflow version และ history ทันที
6. explain/return/hold/reject/confirm จบเป็น decision ใน Portal; resubmit/rerun เข้า outbox และแสดงสถานะรอระบบต้นทาง
7. เมื่อได้รับ revision ใหม่ Portal ปิดคำขอเดิมและเปิดรอบตรวจใหม่โดยรักษาหลักฐานของ revision เก่า

## Action parity กับ mockup

| Mockup action | พฤติกรรมปัจจุบัน |
|---|---|
| ชี้แจง | บันทึกเหตุผลแล้วส่ง workflow กลับฝ่ายบัญชี |
| แก้ไขแล้ว ส่งตรวจซ้ำ | สร้าง outbox request และรอ revision ใหม่ |
| สั่ง AIVA ตรวจซ้ำ | ใช้เมื่อไม่มี Receiver; สร้าง outbox request และรอ revision ใหม่ |
| ส่งกลับผู้ใช้งาน | ต้องมี Receiver; เปลี่ยนผู้รับผิดชอบเป็น End user |
| ปฏิเสธ | ปิด workflow พร้อมเหตุผล; action อื่นถูกบล็อก |
| Hold | พัก workflow โดยไม่แก้ผลตรวจจากต้นทาง |
| ยืนยัน | บันทึกการยอมรับ revision ปัจจุบัน; High severity ต้องมี note |
| ส่งเข้า AP Interface | ยังไม่เปิด ต้องมี AP acknowledgement และผู้ยืนยันคนละคนกับผู้ส่ง |

## หลักความถูกต้อง

- `snapshot.status/rules` เป็นข้อมูลจาก producer และ immutable ต่อ revision
- `workflow.status` เป็นสถานะงานของ Portal แยกจากผล OCR/matching
- ทุก action ส่ง expected document revision และ workflow version; หน้าจอเก่าตอบ 409 ให้โหลดใหม่
- request ID เดิมทำซ้ำได้เฉพาะ payload เดิม
- shared-key pilot ระบุ actor เป็น session กลาง จนกว่าจะเชื่อม Entra และ RBAC จริง
