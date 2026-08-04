# Inventario

> Esquema completo: [DATABASE.md](../DATABASE.md) · Estándares: [CODING_STANDARDS.md](../CODING_STANDARDS.md)

## Modelo de datos

```
organizations/{orgId}/
  inventoryItems/{itemId}     # Catálogo (SKU, tipo, unidad, costos)
  warehouses/{warehouseId}    # Bodegas por sucursal
  inventoryBalances/{wh_item} # Stock desnormalizado (lectura rápida)
  inventoryMovements/{movId}  # Kardex append-only (auditoría)
```

## Tipos de ítem

- `raw_material` — Materia prima
- `finished_product` — Producto terminado
- `supply` — Insumo
- `packaging` — Empaque

## Movimientos

| Tipo | Efecto |
|------|--------|
| `entry` | Entrada (+) |
| `exit` | Salida (-) |
| `adjustment` | Ajuste con signo |
| `transfer_out` / `transfer_in` | Transferencias |
| `waste` | Merma |

## Costeo

- **Costo promedio ponderado** recalculado en cada entrada (`registerInventoryMovement`)
- `averageCost` y `lastCost` en el ítem; balance guarda costo promedio por bodega

## Cloud Functions

| Función | Descripción |
|---------|-------------|
| `createInventoryItem` | Alta de ítem con validación de SKU |
| `createWarehouse` | Alta de bodega por sucursal |
| `registerInventoryMovement` | Transacción: movimiento + balance + costo |

## Seguridad

- Permisos vía `hasPermission` del dominio (rol `inventory` o superior)
- Escrituras solo en servidor; cliente lectura en tiempo real

## Decisión ADR-005

**Balances desnormalizados** en `inventoryBalances` para evitar sumar movimientos en cada consulta (menor costo Firestore, lectura O(1)).
