#!/usr/bin/env bash
# Ghost ERP — Deploy a Firebase (Mac/Linux)
# Ejecutar desde la raíz del repo después de crear apps/web/.env.local

set -euo pipefail

echo "=== Paso 1: Preparar proyecto ==="
pnpm run deploy:setup

echo ""
echo "=== Paso 2: Login Firebase (se abre el navegador) ==="
npx firebase login

echo ""
echo "=== Paso 3: Seleccionar proyecto ghost-contable ==="
npx firebase use ghost-contable

echo ""
echo "=== Paso 4: Deploy backend (rules + functions) ==="
pnpm firebase:deploy:backend

echo ""
echo "=== Paso 5: Deploy hosting (app web) ==="
pnpm firebase:deploy:hosting

echo ""
echo "Listo! Abre https://ghost-contable.web.app"
