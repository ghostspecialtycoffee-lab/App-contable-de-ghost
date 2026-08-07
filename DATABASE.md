# Base de datos — Ghost ERP

Firestore (NoSQL) multi-tenant. **Todas las escrituras vía Cloud Functions.**

## Convenciones

| Regla | Detalle |
|-------|---------|
| Tenant root | `organizations/{orgId}/...` |
| IDs | Auto-generados Firestore salvo `{uid}` en members |
| Timestamps | `createdAt`, `updatedAt` — `FieldValue.serverTimestamp()` |
| Auditoría | `createdBy`, `updatedBy` — uid del actor |
| Denormalización | Solo cuando mejora lectura O(1) (ver ADR-005) |
| Paths | Centralizados en `@ghost/infrastructure` → `firestorePaths` |

## Colecciones globales

### `users/{userId}`

```typescript
{
  email: string
  displayName: string
  photoUrl?: string
  phone?: string
  status: "active" | "invited" | "blocked"
  memberships: Array<{
    organizationId: string
    branchIds: string[]
    roles: SystemRole[]
    isActive: boolean
  }>
  lastLoginAt?: string
  createdAt, updatedAt, createdBy, updatedBy
}
```

**Reglas:** lectura solo propio uid. Escritura: Functions.

## Colecciones por organización

### `organizations/{orgId}`

```typescript
{
  name: string
  slug: string          // único global, indexado
  status: "active" | "suspended" | "trial"
  settings: {
    currency: "COP" | "USD" | ...
    timezone: string
    locale: string
    taxRate: number
    fiscalCountry: string
  }
  createdAt, updatedAt, createdBy, updatedBy
}
```

### `organizations/{orgId}/members/{userId}`

Fuente de verdad permisos. Reglas usan `exists()` — **no escanear arrays.**

```typescript
{
  userId, organizationId
  roles: SystemRole[]
  branchIds: string[]
  isActive: boolean
  joinedAt: Timestamp
}
```

### `organizations/{orgId}/branches/{branchId}`

```typescript
{
  organizationId, name, code, status
  address: { line1, line2?, city, state?, country, postalCode? }
  phone?, isDefault: boolean
  createdAt, updatedAt, createdBy, updatedBy
}
```

### `organizations/{orgId}/auditLogs/{logId}`

Append-only vía Functions.

```typescript
{
  organizationId, actorUserId, action, entityType, entityId
  summary: string
  changes?: Record<string, { before, after }>
  occurredAt: Timestamp
}
```

## Inventario

### `inventoryItems/{itemId}`

```typescript
{
  organizationId, sku, name
  type: "raw_material" | "finished_product" | "supply" | "packaging"
  baseUnit: "g" | "kg" | "ml" | "l" | "unit" | "box" | "bag"
  category?, status: "active" | "inactive"
  minStock, maxStock?, averageCost, lastCost, trackLot
  createdAt, updatedAt, createdBy, updatedBy
}
```

**Índice:** `sku` (unicidad por org vía query + validación Function).

### `warehouses/{warehouseId}`

```typescript
{
  organizationId, branchId, name, code
  status, isDefault
  createdAt, updatedAt, createdBy, updatedBy
}
```

### `inventoryBalances/{warehouseId_itemId}`

Stock desnormalizado — **1 doc = 1 lectura.**

```typescript
{
  organizationId, branchId, warehouseId, itemId
  quantity: number
  averageCost: number
  updatedAt: Timestamp
}
```

### `inventoryLots/{lotId}`

Lotes abiertos por bodega e insumo (FIFO en ventas).

```typescript
{
  organizationId, branchId, warehouseId, itemId
  lotCode: string
  quantityRemaining: number
  unitCost: number
  sourceReference?: string   // factura de compra
  sourceMovementId?: string
  receivedAt: Timestamp
}
```

### `inventoryMovements/{movementId}`

Kardex append-only.

```typescript
{
  organizationId, branchId, warehouseId, itemId
  type: "entry" | "exit" | "adjustment" | "transfer_out" | "transfer_in" | "waste"
  quantity: number       // con signo
  unitCost, totalCost, balanceAfter
  reference?, notes?, lotCode?
  actorUserId, occurredAt
}
```

### `sales/{saleId}` — trazabilidad

Campo opcional `lotConsumptions[]` con los lotes consumidos al cobrar (enlaza compra → venta).

```typescript
lotConsumptions?: Array<{
  inventoryItemId, itemName, lotCode, lotId?, quantity, unitCost,
  sourceReference?  // factura origen del lote
}>
```

### Índices compuestos

Archivo: `firebase/firestore.indexes.json`

| Colección | Campos |
|-----------|--------|
| organizations | slug ASC |
| inventoryItems | status ASC, name ASC |
| inventoryMovements | itemId ASC, occurredAt DESC |
| auditLogs | organizationId ASC, occurredAt DESC |

## Storage

```
organizations/{orgId}/invoices/{fileId}
organizations/{orgId}/attachments/{fileId}
```

Reglas: miembro autenticado, max 10 MB por archivo.

## Costos Firestore (optimización)

1. Preferir `onSnapshot` solo en pantallas activas
2. Desnormalizar balances — no sumar movimientos en cliente
3. Paginar listados > 50 docs
4. Evitar listeners duplicados — un provider por tenant
5. Batch/transaction en Functions — una round-trip lógica

## Referencias

- Reglas: `firebase/firestore.rules`
- Paths TS: `packages/infrastructure/src/paths.ts`
- [SECURITY.md](SECURITY.md)
