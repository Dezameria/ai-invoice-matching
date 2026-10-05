/**
 * cases.mjs — รวมเคสตัวอย่างทั้งหมดจาก cases-a…d.mjs
 * ลำดับในอาร์เรย์ = ลำดับที่ Portal แสดง (คงที่เพื่อ snapshot test)
 */
import { CASES_A } from "./cases-a.mjs";
import { CASES_B } from "./cases-b.mjs";
import { CASES_C } from "./cases-c.mjs";
import { CASES_D } from "./cases-d.mjs";

export const CASES = [...CASES_A, ...CASES_B, ...CASES_C, ...CASES_D];

const ids = CASES.map((c) => c.id);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dup.length) throw new Error(`cases.mjs มี document_id ซ้ำ: ${dup.join(", ")}`);
