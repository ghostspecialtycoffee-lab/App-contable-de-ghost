# DWH Foundation v1

Capa analítica operativa ligera para Ghost Platform. Agrega métricas diarias en Firestore y las expone en el dashboard sin requerir Blaze ni Cloud Functions.

## Arquitectura

```
Ventas / Compras / Movimientos (cliente)
        ↓ increment
analyticsDaily/{YYYY-MM-DD}   ← DWH operativo
        ↓
useDailyAnalytics → AnalyticsInsightsPanel (dashboard)
        ↓
Informes (detalle por periodo)
```

Compatible con el event bus futuro (PR #87): los mismos campos y deltas que `resolveDomainEventSideEffects`.

## Colección `analyticsDaily`

| Campo | Descripción |
|-------|-------------|
| `salesCount` / `salesTotal` | Ventas pagadas del día |
| `purchasesCount` / `purchasesTotal` | Compras confirmadas |
| `inventoryMovements` | Movimientos de kardex |

Documento id = fecha (`2026-08-07`).

## Dominio

`packages/domain/src/analytics/`

- `applyAnalyticsDelta` — lógica pura de incremento
- `rollupDailyAnalyticsFromSources` — reconstrucción desde ventas/compras (fallback)
- `buildAnalyticsPeriodSummary` — resumen + tendencia 7 días

## Cliente web

- `analytics-client.ts` — `applyAnalyticsDeltaClient`, `recordSaleAnalyticsSafe`, etc.
- Escritura con `increment()` de Firestore (merge atómico)
- Fallos no bloquean operaciones principales

## UI

- **Dashboard** → panel «Analítica (7 días)» con barras ventas vs compras y flujo neto
- Si no hay datos en DWH, calcula en cliente desde hooks existentes

## Evolución

| Fase | Alcance |
|------|---------|
| **v1 (este PR)** | `analyticsDaily` + panel dashboard + escritura en venta/compra/movimiento |
| **v2** | Event bus + Functions procesan outbox → mismo DWH |
| **v3** | Export BI, métricas por producto/proveedor, cohortes |
| **v4** | BigQuery / Looker sync |

## Relación con briefing y rules engine

El briefing proactivo y el rules engine pueden consumir `analyticsDaily` para detectar tendencias sin recalcular desde cero en cada consulta.
