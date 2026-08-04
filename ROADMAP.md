# Roadmap — Ghost ERP

Orden de desarrollo **obligatorio** salvo dependencia técnica crítica.

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Completado (base) |
| 🚧 | En progreso |
| 🔜 | Siguiente |
| ⏳ | Planificado |

## Fases

| # | Módulo | Estado | Entregables clave |
|---|--------|--------|-------------------|
| 1 | Infraestructura | ✅ | Monorepo, Turborepo, CI local |
| 2 | Arquitectura | ✅ | Paquetes domain/shared/ui/infrastructure |
| 3 | Autenticación | ✅ | Login, registro, AuthGuard, providers |
| 4 | Base de datos | ✅ | Onboarding org, members, branches |
| 5 | Inventario | ✅ | Ítems, bodegas, kardex, costo promedio |
| 6 | Compras | 🔜 | Proveedores, órdenes, OCR facturas |
| 7 | Producción | ⏳ | Recetas, subrecetas, órdenes producción |
| 8 | Costeo | ⏳ | Escandallos, food cost, matrices |
| 9 | POS | ⏳ | Ventas táctil, mesas, pagos |
| 10 | Comandas (KDS) | ⏳ | Cocina, barra, estados, tiempos |
| 11 | Caja | ⏳ | Apertura, cierre, arqueo |
| 12 | Facturación | ⏳ | FE desacoplada, CxC, CxP |
| 13 | Contabilidad | ⏳ | Asientos, integración fiscal |
| 14 | Reportes | ⏳ | Dashboards operativos y financieros |
| 15 | CRM | ⏳ | Clientes, fidelización |
| 16 | RRHH | ⏳ | Turnos, asistencia |
| 17 | IA | ⏳ | Recomendaciones, predicciones |
| 18 | Integraciones | ⏳ | WhatsApp, pagos, impresoras |
| 19 | Optimización | ⏳ | Costos Firebase, performance |
| 20 | Auditoría final | ⏳ | Revisión seguridad y trazabilidad |

## Módulo 6 — Compras (siguiente)

1. Dominio: `Supplier`, `PurchaseOrder`, `PurchaseInvoice`
2. OCR: Google Vision → extracción → `registerInventoryMovement`
3. Alertas: variación de precios vs último costo
4. UI: upload factura, revisión, confirmación

## Criterios de “módulo completo”

- [ ] Dominio + tests
- [ ] Cloud Functions + permisos + audit log
- [ ] Reglas Firestore + índices
- [ ] UI mínima operativa
- [ ] docs/{modulo}.md actualizado
- [ ] CHANGELOG.md + TASKS.md
- [ ] `pnpm build && pnpm test` verdes
- [ ] PR draft creado

## Referencias

- [TASKS.md](TASKS.md) — tareas granulares
- [ARCHITECTURE.md](ARCHITECTURE.md) — estructura técnica
