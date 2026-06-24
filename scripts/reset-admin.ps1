# Reset admin login (local or Railway-linked database).
# Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env or Railway variables first.
#
# Local:  .\scripts\reset-admin.ps1
# Railway: railway run --service server npm run ensure-admin

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot ".." "server")

if (-not (Test-Path ".env") -and -not $env:DATABASE_URL) {
  Write-Host "No server/.env or DATABASE_URL — link Railway or create .env first." -ForegroundColor Red
  exit 1
}

Write-Host "Resetting admin account..." -ForegroundColor Cyan
npm run ensure-admin

Write-Host ""
Write-Host "Login at: https://www.wishtenter.com/admin" -ForegroundColor Green
Write-Host "Use ADMIN_EMAIL and ADMIN_PASSWORD from your .env / Railway variables." -ForegroundColor Yellow
