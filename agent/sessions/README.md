# Session History

Session History เป็นหลักฐานรายรอบและไม่ใช่ไฟล์สรุปสถานะล่าสุด

## Naming

- รูปแบบ: `YYYY-MM-DD-NNN-short-title.md`
- `NNN` เริ่มจาก `001` ต่อวันและต้องไม่ซ้ำ
- `short-title` ใช้ lowercase kebab-case ภาษาอังกฤษ
- ก่อนสร้างไฟล์ ให้ตรวจชื่อที่มีอยู่ในไดเรกทอรีนี้เสมอ

## Immutability

- ระหว่าง session เดียวกัน อัปเดตไฟล์ของ session นั้นได้
- เมื่อ `Status: closed` แล้ว ห้ามแก้ ลบ เปลี่ยนชื่อ หรือใช้ไฟล์เดิมซ้ำ
- หากข้อมูลเก่าผิด ให้สร้าง session ใหม่และเพิ่ม Correction ที่อ้างถึงชื่อไฟล์เดิม

## Required Template

```markdown
# Session: <title>

- Session ID: `SESSION-YYYYMMDD-NNN`
- Started: `<ISO 8601 timestamp>`
- Ended: `<ISO 8601 timestamp or None>`
- Status: `open` หรือ `closed`
- Task IDs: `<IDs or None>`

## Objective

<เป้าหมายของรอบ>

## Baseline

<branch, commit, working tree และข้อมูลตั้งต้นที่สำคัญ>

## Summary

<ผลลัพธ์ที่ทำได้>

## Files Changed

<paths และเหตุผล>

## Validation

<commands/checks และผลจริง>

## Decisions

<การตัดสินใจและเหตุผลแบบสรุป>

## Errors

<Error IDs หรือ None>

## Handoff

<งานถัดไป blocker และสิ่งที่ agent รอบต่อไปต้องรู้>
```

