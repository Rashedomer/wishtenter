# Deploy wishtenter.com frontend to the CORRECT Vercel account (oudzoneae-1210s-projects).
# Run once: npx vercel login   (use the oudzoneae / wishtenter.com Vercel email)
# Then:     .\scripts\deploy-oudzoneae.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Linking project (pick: oudzoneae-1210s-projects / wishtenter-system)..." -ForegroundColor Yellow
npx vercel link

Write-Host ""
Write-Host "Deploying to production (Vercel builds on server)..." -ForegroundColor Cyan
npx vercel deploy --prod --yes

Write-Host ""
Write-Host "Done. Test: https://www.wishtenter.com/creator-dashboard -> Copy Link" -ForegroundColor Green
