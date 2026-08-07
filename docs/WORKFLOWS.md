# Workflow Engine v1 + WhatsApp

> Roadmap plataforma #10. Ver [PLATFORM_VISION.md](PLATFORM_VISION.md) y [EVENTS.md](EVENTS.md).

## Flujo

```
Evento de dominio (venta, compra)
        │
        ▼
evaluateWorkflowsForEvent()  →  workflowOutbox
        │
        ▼
Panel / Automatizaciones  →  enlace wa.me listo
```

## Workflows integrados

| ID | Disparador | Acción |
|----|------------|--------|
| `sale-receipt-whatsapp` | `sale.recorded` | Comprobante WhatsApp tras cada venta |
| `sale-high-value-whatsapp` | `sale.recorded` | Alerta si total ≥ umbral (tel. operativo) |
| `purchase-confirmed-whatsapp` | `purchase.confirmed` | Resumen de compra (opcional) |

## Configuración

`organizations/{id}.workflowSettings`:

- `enabledWorkflowIds` — workflows activos
- `staffWhatsAppPhone` — teléfono para alertas (ej. `573001234567`)
- `highValueSaleThresholdCop` — umbral venta alta (default 200.000)

UI: `/settings/automations`

## Colección Firestore

`organizations/{id}/workflowOutbox/{entryId}`

| Campo | Descripción |
|-------|-------------|
| `workflowId` | Workflow que generó la entrada |
| `channel` | `whatsapp` |
| `message` | Texto del mensaje |
| `actionUrl` | Enlace `wa.me` |
| `domainEventId` | Idempotencia por evento |
| `status` | `ready` (v1) |

## Código

| Capa | Ruta |
|------|------|
| Dominio | `packages/domain/src/workflows/` |
| Publicar (web) | `apps/web/src/lib/workflows/` |
| Procesar (Functions) | `apps/functions/src/workflows/enqueue.ts` |

## WhatsApp API

v1 usa enlaces `wa.me` (sin API Business). La integración con Meta Cloud API quedará en fase 2.
