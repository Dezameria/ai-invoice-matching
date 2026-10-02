import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

test('import JSON, attach PDF, view pages, filters, history and mobile layout', async ({page}) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  const example = JSON.parse(fs.readFileSync(path.resolve('../examples/invoice.json'), 'utf8'))
  const unique = Date.now().toString()
  example.external_id = 'E2E-' + unique
  example.event_id = 'E2E-' + unique
  example.invoice.invoice_num = 'E2E-' + unique
  example.invoice.supplier_name = 'Synthetic Browser Test'
  await page.goto('/')
  await page.getByRole('button', {name: 'นำเข้าเอกสาร', exact: true}).click()
  await page.getByLabel('ข้อมูลเอกสาร').fill(JSON.stringify(example))
  await page.locator('dialog input[type=file][accept="application/pdf"]').setInputFiles('../examples/invoice.pdf')
  await page.locator('dialog').getByRole('button', {name: 'นำเข้าเอกสาร', exact: true}).click()
  await expect(page.getByRole('heading', {name: new RegExp(example.invoice.invoice_num)})).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible({timeout: 20000})
  await page.getByRole('button', {name: 'หน้าถัดไป', exact: true}).click()
  await expect(page.getByText('หน้า 2 / 2', {exact: true})).toBeVisible()
  await page.getByRole('tab', {name: 'รายการสินค้า'}).click()
  await expect(page.getByText('Mounting bracket (synthetic)', {exact: true})).toBeVisible()
  await page.getByRole('tab', {name: 'กฎการตรวจ'}).click()
  await expect(page.getByText('Synthetic missing signature')).toBeVisible()
  await expect(page.getByText('STEP 1', {exact: true}).first()).toBeVisible()
  await page.getByRole('tab', {name: 'ประวัติ'}).click()
  await expect(page.getByText('แนบเอกสาร PDF', {exact: true})).toBeVisible()
  await page.getByRole('tab', {name: 'สรุปและดำเนินการ'}).click()
  await page.getByRole('button', {name: 'เปิดหลักฐานหน้า 2'}).click()
  await expect(page.getByText('หน้า 2 / 2', {exact: true})).toBeVisible()
  await page.getByRole('button', {name: 'หน้าก่อนหน้า', exact: true}).click()
  await expect(page.getByText('หน้า 1 / 2', {exact: true})).toBeVisible()
  await page.getByRole('button', {name: 'เปิดหลักฐานหน้า 2'}).click()
  await expect(page.getByText('หน้า 2 / 2', {exact: true})).toBeVisible()
  await page.screenshot({path: 'test-results/detail-desktop.png', fullPage: true})
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible({timeout: 20000})
  await page.getByRole('button', {name: 'กลับไปเอกสารทั้งหมด'}).click()
  await page.getByLabel('ค้นหาเอกสาร').fill(example.invoice.invoice_num)
  await expect(page.getByRole('button', {name: example.invoice.invoice_num, exact: true})).toBeVisible()
  await page.screenshot({path: 'test-results/queue-desktop.png', fullPage: true})
  await page.setViewportSize({width: 390, height: 844})
  await page.screenshot({path: 'test-results/queue-mobile.png', fullPage: true})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.getByRole('button', {name: example.invoice.invoice_num, exact: true}).click()
  await expect(page.locator('canvas')).toBeVisible({timeout: 20000})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  expect(await page.locator('.pdf-stage').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBeTruthy()
  await page.screenshot({path: 'test-results/detail-mobile.png', fullPage: true})
  expect(errors).toEqual([])
})

test('invalid JSON is rejected without closing import dialog', async ({page}) => {
  await page.goto('/')
  await page.getByRole('button', {name: 'นำเข้าเอกสาร', exact: true}).click()
  await page.getByLabel('ข้อมูลเอกสาร').fill('{ invalid }')
  await page.locator('dialog').getByRole('button', {name: 'นำเข้าเอกสาร', exact: true}).click()
  await expect(page.getByRole('alert')).toContainText('JSON ไม่ถูกต้อง')
  await page.getByRole('button', {name: 'ยกเลิก', exact: true}).click()
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('large decimal amounts are displayed without floating-point precision loss', async ({page, request}) => {
  const example = JSON.parse(fs.readFileSync(path.resolve('../examples/invoice.json'), 'utf8'))
  example.event_id = example.external_id = 'precision-' + Date.now()
  example.invoice.grand_total = '99999999999999.994999'
  const response = await request.post('/api/portal/v1/ingest', {data: example})
  expect(response.ok(), await response.text()).toBeTruthy()
  const result = await response.json()
  await page.goto('/#page=documents&document=' + result.id)
  await expect(page.locator('.total-number')).toContainText('99,999,999,999,999.99')
})

test('revision deep links open the matching JSON and archived PDF', async ({page, request}) => {
  const first = JSON.parse(fs.readFileSync(path.resolve('../examples/invoice.json'), 'utf8'))
  const marker = Date.now().toString()
  first.external_id = `REVISION-${marker}`
  first.event_id = `REVISION-${marker}-r1`
  first.invoice.invoice_num = `REVISION-${marker}`
  first.invoice.supplier_name = 'Supplier revision one'
  const created = await request.post('/api/portal/v1/ingest', {data: first})
  expect(created.ok(), await created.text()).toBeTruthy()
  const {id} = await created.json()
  const pdfBuffer = fs.readFileSync(path.resolve('../examples/invoice.pdf'))
  let attached = await request.post(`/api/portal/v1/documents/${id}/pdf?revision=1`, {multipart: {file: {name: 'r1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer}}})
  expect(attached.ok(), await attached.text()).toBeTruthy()

  const second = structuredClone(first)
  second.revision = 2
  second.event_id = `REVISION-${marker}-r2`
  second.status = 'Hold'
  second.invoice.supplier_name = 'Supplier revision two'
  const updated = await request.post('/api/portal/v1/ingest', {data: second})
  expect(updated.ok(), await updated.text()).toBeTruthy()
  attached = await request.post(`/api/portal/v1/documents/${id}/pdf?revision=2`, {multipart: {file: {name: 'r2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer}}})
  expect(attached.ok(), await attached.text()).toBeTruthy()

  await page.goto(`/#page=documents&document=${id}`)
  await expect(page.getByText('Supplier revision two', {exact: true})).toBeVisible()
  await page.getByLabel('รุ่นข้อมูล').selectOption('1')
  await expect(page).toHaveURL(/revision=1/)
  await expect(page.getByText('Supplier revision one', {exact: true})).toBeVisible()
  await expect(page.getByText('กำลังดูข้อมูลย้อนหลังรุ่น 1 · รุ่นล่าสุดคือ 2')).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible({timeout: 20000})
  await page.reload()
  await expect(page.getByLabel('รุ่นข้อมูล')).toHaveValue('1')
  await page.getByRole('tab', {name: 'ข้อมูลเพิ่มเติม'}).click()
  await expect(page.getByText('2 รุ่น')).toBeVisible()
  await expect(page.getByText('PDF · 2 หน้า')).toHaveCount(2)
  await page.screenshot({path: 'test-results/revision-history-desktop.png', fullPage: true})
  await page.setViewportSize({width: 390, height: 844})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({path: 'test-results/revision-history-mobile.png', fullPage: true})
  await page.getByRole('button', {name: 'กลับไปรุ่นล่าสุด'}).click()
  await expect(page).not.toHaveURL(/revision=/)
  await expect(page.getByText('Supplier revision two', {exact: true})).toBeVisible()
})

test('access capabilities and persistent audit are usable from navigation', async ({page, request}) => {
  const example = JSON.parse(fs.readFileSync(path.resolve('../examples/invoice.json'), 'utf8'))
  const marker = `AUDIT-${Date.now()}`
  example.external_id = marker
  example.event_id = `${marker}-r1`
  example.invoice.invoice_num = marker
  const created = await request.post('/api/portal/v1/ingest', {data: example})
  expect(created.ok(), await created.text()).toBeTruthy()

  await page.goto('/')
  await page.getByRole('button', {name: 'สิทธิ์และการเข้าถึง'}).click()
  await expect(page.getByRole('heading', {name: 'สิทธิ์และการเข้าถึง'})).toBeVisible()
  await expect(page.getByText('พร้อมใช้ใน pilot')).toBeVisible()
  await expect(page.getByText('ยังไม่มี Entra/RBAC รายบุคคล')).toBeVisible()
  await page.screenshot({path: 'test-results/access-desktop.png', fullPage: true})
  await page.getByRole('button', {name: 'บันทึกการเข้าถึง'}).click()
  await page.getByLabel('ค้นหาบันทึก').fill(marker)
  await expect(page.getByRole('button', {name: marker, exact: true})).toBeVisible()
  await page.getByLabel('ประเภทเหตุการณ์').selectOption('received')
  await expect(page.locator('.audit-kind.kind-received').first()).toBeVisible()
  await expect(page.locator('.audit-table tbody tr')).toHaveCount(1)
  await page.screenshot({path: 'test-results/audit-desktop.png', fullPage: true})
  await page.setViewportSize({width: 390, height: 844})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({path: 'test-results/audit-mobile.png', fullPage: true})
  await page.getByRole('button', {name: marker, exact: true}).click()
  await expect(page.getByRole('heading', {name: new RegExp(marker)})).toBeVisible()
  await expect(page.locator('.document-meta').getByText('RCV-DEMO-001', {exact: true})).toBeVisible()
  await page.getByRole('tab', {name: 'ข้อมูลเพิ่มเติม'}).click()
  await expect(page.getByText('Example Receiver', {exact: true})).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
})

test('review action is persisted and waits for a new upstream revision', async ({page, request}) => {
  const example = JSON.parse(fs.readFileSync(path.resolve('../examples/invoice.json'), 'utf8'))
  const marker = `ACTION-${Date.now()}`
  example.external_id = marker
  example.event_id = `${marker}-r1`
  example.invoice.invoice_num = marker
  const created = await request.post('/api/portal/v1/ingest', {data: example})
  expect(created.ok(), await created.text()).toBeTruthy()
  const {id} = await created.json()

  await page.goto(`/#page=documents&document=${id}`)
  await expect(page.getByRole('heading', {name: 'รอผู้ใช้งานแก้ไข'})).toBeVisible()
  await page.getByRole('button', {name: 'แก้ไขแล้ว ส่งตรวจซ้ำ', exact: true}).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', {name: 'แก้ไขแล้ว ส่งตรวจซ้ำ'})).toBeVisible()
  await dialog.getByRole('textbox', {name: 'หมายเหตุ'}).fill('แก้ไขเอกสารทดสอบแล้ว')
  await dialog.getByRole('button', {name: 'แก้ไขแล้ว ส่งตรวจซ้ำ', exact: true}).click()
  await expect(page.getByRole('heading', {name: 'รอผลตรวจรอบใหม่'})).toBeVisible()
  await expect(page.getByText('ส่งคำขอแล้ว กำลังรอระบบต้นทาง')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', {name: 'รอผลตรวจรอบใหม่'})).toBeVisible()
  await page.screenshot({path: 'test-results/action-waiting-desktop.png', fullPage: true})

  const outbox = await request.get(`/api/portal/v1/action-requests?source_system=${encodeURIComponent(example.source_system)}`)
  expect(outbox.ok(), await outbox.text()).toBeTruthy()
  expect((await outbox.json()).items.some((item: {document_id: string}) => item.document_id === id)).toBeTruthy()
  const next = structuredClone(example)
  next.revision = 2
  next.event_id = `${marker}-r2`
  next.status = 'Auto-pass'
  next.rules = next.rules.map((rule: {rule_id: string}) => ({...rule, result: 'pass', exception_code: null, severity: null}))
  const updated = await request.post('/api/portal/v1/ingest', {data: next})
  expect(updated.ok(), await updated.text()).toBeTruthy()
  await page.reload()
  await expect(page.getByRole('heading', {name: 'รอฝ่ายบัญชีตรวจ'})).toBeVisible()
  await page.getByRole('tab', {name: 'ประวัติ'}).click()
  await expect(page.getByText('ได้รับผลตรวจรอบใหม่', {exact: true})).toBeVisible()
  await page.setViewportSize({width: 390, height: 844})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({path: 'test-results/action-mobile.png', fullPage: true})
})
