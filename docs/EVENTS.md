# Event Bus — Ghost Platform

> Base de la arquitectura por eventos (ADR-007). Ver [PLATFORM_VISION.md](PLATFORM_VISION.md).

## Flujo

```
Operación (venta, compra, movimiento)
        │
        ▼
publishDomainEventSafe()  →  domainEventOutbox  (Firestore)
        │
        ▼ (trigger Blaze)
onDomainEventOutboxCreate  →  processDomainEventOutboxEntry()
        │
        ├── auditLogs
        ├── analyticsDaily/{YYYY-MM-DD}
        └── (futuro) notificaciones, IA proactiva, rules engine
```

## Tipos de evento (v1)

| Tipo | Disparador | Payload clave |
|------|------------|---------------|
| `sale.recorded` | `createSaleClient` | saleNumber, total, soldOn |
| `purchase.confirmed` | `confirmPurchaseInvoiceClient` | supplierName, total, movements |
| `inventory.movement.registered` | `registerInventoryMovementClient` | itemId, type, balanceAfter |

## Colecciones Firestore

| Colección | Escritura cliente | Escritura servidor |
|-----------|-------------------|-------------------|
| `domainEventOutbox` | append (pending) | update status |
| `analyticsDaily` | no | increment vía trigger |
| `auditLogs` | no | vía trigger |

## Código

| Capa | Ruta |
|------|------|
| Tipos y side effects | `packages/domain/src/events/` |
| Publicar (web) | `apps/web/src/lib/events/domain-events-client.ts` |
| Procesar (Functions) | `apps/functions/src/events/` |

## Agregar un evento nuevo

1. Añadir tipo en `packages/domain/src/events/types.ts`
2. Factory en `domain-event.ts` + side effects (audit, analytics)
3. Test en `domain-event.test.ts`
4. `publishDomainEventSafe` en el client de aplicación correspondiente
5. (Opcional) handler adicional en `processDomainEvent.ts`

## Reglas

- La operación principal **no debe fallar** si el outbox falla (`publishDomainEventSafe`)
- Toda lógica de reacción vive en `resolveDomainEventSideEffects` (domain puro)
- Ghost usa `actorSource: 'ghost-ai'` cuando se integre en acciones
