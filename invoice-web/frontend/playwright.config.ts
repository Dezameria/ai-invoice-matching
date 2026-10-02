import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', workers: 1,
  webServer: {command: 'python -m uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port 8011', url: 'http://127.0.0.1:8011/api/portal/v1/health', reuseExistingServer: false, env: {PORTAL_DATA_DIR: '../data/browser-tests', PORTAL_API_KEY: '', PORTAL_INGEST_KEY: '', PORTAL_ENV: 'development'}},
  use: {baseURL: 'http://127.0.0.1:8011', channel: 'msedge', headless: true, viewport: {width: 1512, height: 982}}, reporter: 'list',
})
