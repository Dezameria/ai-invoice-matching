/**
 * domain/company.js — แปลง ORG_ID → นิติบุคคล/บริษัท (portal config)
 *
 * master_data.py มีแค่ ORG_ID/OU_ID/ชื่อ/Tax ID/status ไม่มี "รหัสบริษัท"
 * → ตารางนี้คือ config ฝั่ง portal (ย่อชื่อจาก master) ใช้กรองงานตามบริษัท
 * ⚠️ ค่าที่ยังไม่มีใน master ให้ผลเป็น UNMAPPED + เหตุผล — ห้ามเดาต่อ
 *    เมื่อ master จริงมี column บริษัท ให้ย้ายตารางนี้ไปเกิดจาก build-master-data.py
 */

import { MASTER_ENTITIES } from "../data/master-data.js";

/** Tax ID → รหัสบริษัท (ย่อตามที่ทีมบัญชีใช้อยู่) */
export const COMPANY_BY_TAX = {
  "0107545000213": { code: "AH", label: "อาปิโก ไฮเทค" },
  "0145548001557": { code: "AHT", label: "อาปิโก ไฮเทค ทูลลิ่ง" },
  "0145548001549": { code: "AHP", label: "อาปิโก ไฮเทค พาร์ท" },
  "0145563000434": { code: "AHA", label: "อาปิโก ไฮเทค ออโตเมชั่น" },
  "0107547000354": { code: "AFJ", label: "อาปิโก ฟอร์จจิ้ง" },
  "0145556001111": { code: "ALT", label: "อาปิโก ลีดเทค" },
  "0107537000131": { code: "APL", label: "อาปิโก พลาสติก" },
  "0205551028176": { code: "ASP", label: "อาปิโก สตรัคเจอรัล โปรดักส์" },
  "0105535001499": { code: "AAT", label: "อาปิโก อมตะ" },
  "0145549002085": { code: "AMK", label: "อาปิโก มิตซุยเกะ" },
  "0135547003157": { code: "AITS", label: "อาปิโก ไอทีเอส" },
  "0205557018563": { code: "APRC", label: "อาปิโก พรีซิชั่น" },
  "0145553001829": { code: "ABIKE", label: "อาปิโก ไบค์" },
  "200301017448(619868-V)": { code: "AAVE", label: "อาปิโก เอวีอี (มาเลเซีย)" },
  "0145556001391": { code: "EUA", label: "เอ็ดชา อาปิโก ออโตโมทีฟ" },
  "0135546008643": { code: "AM", label: "เอเบิล มอเตอร์ส" },
  "0135562027568": { code: "AMPT", label: "เอเบิล มอเตอร์ส ปทุมธานี" },
  "0125562036711": { code: "AMPG", label: "เอเบิล มอเตอร์ส ปากเกร็ด" },
  "0135566030351": { code: "AEV", label: "เอเบิล อีวี" },
  "0135564010484": { code: "MGP", label: "เอ็มจี เอเบิล มอเตอร์ส" },
  "0105553018446": { code: "AERP", label: "เอ อีอาร์พี" },
};

export const ENTITY_BY_ORG = new Map(MASTER_ENTITIES.map((e) => [e.orgId, e]));

/**
 * @param {number|string|null} orgId
 * @returns {{company:string, companyLabel:string, orgId:number|null, orgName:string, taxId:string,
 *            masterStatus:string, mapped:boolean, reason:string|null, source:string}}
 */
export function resolveCompany(orgId, { source = "RECEIPT_ORG" } = {}) {
  const blank = {
    company: "UNMAPPED",
    companyLabel: "map ไม่ได้",
    orgId: orgId ?? null,
    orgName: "—",
    taxId: "",
    masterStatus: "NO_DATA",
    mapped: false,
    reason: null,
    source,
  };
  if (orgId === null || orgId === undefined || orgId === "") {
    return { ...blank, reason: "ไม่มี ORG_ID (ไม่มีการเรียก Oracle หรือ snapshot ไม่ส่งแถวใบรับ)" };
  }
  const id = Number(orgId);
  const entity = ENTITY_BY_ORG.get(id);
  if (!entity) {
    return { ...blank, reason: `ORG_ID ${orgId} ไม่มีใน master snapshot (${MASTER_ENTITIES.length} นิติบุคคล)` };
  }
  if (entity.status !== "ACTIVE") {
    return {
      ...blank,
      orgName: entity.nameTh,
      taxId: entity.taxId,
      masterStatus: entity.status,
      reason: `ORG_ID ${orgId} สถานะ ${entity.status} ใน master (engine ให้ผล manual_review)`,
    };
  }
  const hit = COMPANY_BY_TAX[entity.taxId];
  if (!hit) {
    return {
      ...blank,
      orgName: entity.nameTh,
      taxId: entity.taxId,
      masterStatus: entity.status,
      reason: `Tax ID ${entity.taxId || "(ว่าง)"} ยังไม่มีในตารางรหัสบริษัทของ portal`,
    };
  }
  return {
    company: hit.code,
    companyLabel: hit.label,
    orgId: id,
    orgName: entity.nameTh,
    taxId: entity.taxId,
    masterStatus: entity.status,
    ouId: entity.ouId,
    mapped: true,
    reason: null,
    source,
  };
}

/** รายการบริษัทที่ใช้กรองได้ (เรียงตามรหัส) */
export function companyOptions(docs) {
  const set = new Map();
  for (const d of docs) set.set(d.company, d.companyLabel || d.company);
  return [...set.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, label]) => ({ code, label }));
}
