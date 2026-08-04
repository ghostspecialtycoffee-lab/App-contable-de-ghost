# Ghost ERP — Deploy a Firebase (Windows PowerShell)
# Ejecutar desde la raiz del repo despues de crear apps/web/.env.local

$ErrorActionPreference = "Stop"

Write-Host "=== Paso 1: Preparar proyecto ===" -ForegroundColor Cyan
pnpm run deploy:setup
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== Paso 2: Login Firebase (se abre el navegador) ===" -ForegroundColor Cyan
npx firebase login
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== Paso 3: Seleccionar proyecto ghost-contable ===" -ForegroundColor Cyan
npx firebase use ghost-contable
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== Paso 4: Deploy backend (rules + functions) ===" -ForegroundColor Cyan
pnpm firebase:deploy:backend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== Paso 5: Deploy hosting (app web) ===" -ForegroundColor Cyan
pnpm firebase:deploy:hosting
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Listo! Abre https://ghost-contable.web.app" -ForegroundColor Green
