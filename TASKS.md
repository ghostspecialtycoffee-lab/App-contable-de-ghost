# Tareas — Ghost ERP

Backlog técnico activo. Actualizar al completar o iniciar trabajo.

## En progreso

_Ninguna tarea marcada in_progress en repo — agente debe tomar la siguiente del backlog._

## Backlog inmediato (prioridad alta)

### Compras + OCR (Módulo 6)

- [ ] `packages/domain/src/purchases/` — Supplier, PurchaseInvoice, line items
- [ ] `apps/functions/src/purchases/` — createSupplier, processInvoiceOcr (stub Vision)
- [ ] Integrar OCR → `registerInventoryMovement` automático
- [ ] UI `/purchases/invoices` — upload + preview + confirm
- [ ] Detección delta precio vs `lastCost`
- [ ] docs/PURCHASES.md
- [ ] Tests dominio + índices Firestore

### Inventario — completar UI pendiente

- [ ] UI `/inventory/warehouses` — listado + alta bodega
- [ ] UI `/inventory/movements` — registrar entrada/salida
- [ ] Hook `useInventoryBalances`
- [ ] Alertas stock < minStock en dashboard

## Backlog medio plazo

- [ ] Producción: recetas anidadas, explosión BOM
- [ ] Costeo: escandallo automático desde recetas
- [ ] POS: grid productos, carrito, pagos
- [ ] KDS: realtime orders, estados
- [ ] Caja: sesión, arqueo, PDF
- [ ] Facturación electrónica: adapter interface

## Deuda técnica

- [ ] `@ghost/infrastructure` — mappers completos inventario
- [ ] E2E con emuladores Firebase en CI
- [ ] Paginación en listados grandes
- [ ] i18n formal (actualmente es-CO hardcoded)

## Completado reciente

- [x] Fundación monorepo (#1)
- [x] Auth + onboarding multi-tenant
- [x] Inventario base (ítems, functions kardex)
- [x] Documentación raíz + skills permanentes

## Convención de tareas

Al cerrar una tarea:

1. Marcar `[x]` aquí
2. Entrada en [CHANGELOG.md](CHANGELOG.md)
3. Actualizar tabla estado en [README.md](README.md) si aplica
4. Commit con prefijo `feat:` / `fix:` / `docs:`
