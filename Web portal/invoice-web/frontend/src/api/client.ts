export const BASE = '/api/portal/v1'
let accessKey = ''
export function setAccessKey(key: string) { accessKey = key }
export async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (accessKey) headers.set('Authorization', `Bearer ${accessKey}`)
  const response = await fetch(BASE + path, {...init, headers})
  if (!response.ok) {
    const error = await response.json().catch(() => ({detail: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์'}))
    const message = Array.isArray(error.detail) ? error.detail.map((e: {loc: string[]; msg: string}) => `${e.loc.slice(1).join('.')}: ${e.msg}`).join('\n') : error.detail
    throw new Error(message || `เกิดข้อผิดพลาด (${response.status})`)
  }
  return response
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> { return (await request(path, init)).json() }
export function post<T>(path: string, data: unknown) { return api<T>(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)}) }
export async function uploadPdf(id: string, revision: number, file: File) {
  if (file.size > 20 * 1024 * 1024) throw new Error('ไฟล์ PDF ต้องไม่เกิน 20 MB')
  const body = new FormData(); body.append('file', file)
  return api(`/documents/${id}/pdf?revision=${revision}`, {method: 'POST', body})
}
