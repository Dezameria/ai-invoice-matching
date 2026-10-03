$ErrorActionPreference = 'Stop'
$portalRoot = $PSScriptRoot
$portalPython = Join-Path $portalRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $portalPython)) { $portalPython = 'python' }
if (-not (Test-Path -LiteralPath (Join-Path $portalRoot 'frontend/dist/index.html'))) {
    throw 'Frontend build is missing. Run npm ci and npm run build in invoice-web/frontend first.'
}
Push-Location (Join-Path $portalRoot 'backend')
try {
    Write-Host 'AIVA Portal: http://127.0.0.1:8010 | API: http://127.0.0.1:8010/api/docs'
    & $portalPython -m uvicorn app.main:app --host 127.0.0.1 --port 8010
} finally { Pop-Location }
