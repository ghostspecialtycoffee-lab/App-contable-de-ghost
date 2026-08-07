# Trazabilidad lote → venta

Cadena de trazabilidad desde la compra hasta el comprobante de venta, usando lotes FIFO en inventario.

## Flujo

```
Compra confirmada
  → entrada con lotCode (LOT-{factura}-{insumo})
  → inventoryLots.quantityRemaining += cantidad

Venta cobrada
  → receta calcula consumo por insumo
  → allocateLotsFifo (más antiguo primero)
  → salidas de kardex con lotCode
  → sale.lotConsumptions[] guardado en el comprobante
```

## Colecciones

| Colección | Rol |
|-----------|-----|
| `inventoryLots` | Stock remanente por lote |
| `inventoryMovements` | Kardex con `lotCode` en cada movimiento |
| `sales` | `lotConsumptions[]` congelado al cobrar |

## Código de lote

Generado en compras con `generatePurchaseLotCode()`:

- Ejemplo: `LOT-FC00123-CATURA-1`
- Stock histórico sin lote usa `SIN-LOTE` al vender

## Dónde verlo

- **Registros / Billing** — panel «Trazabilidad lote → venta» en el comprobante seleccionado
- Cada línea muestra insumo, lote, cantidad y factura de compra origen (`sourceReference`)

## Dominio

- `packages/domain/src/inventory/lot.ts` — tipos
- `packages/domain/src/inventory/lot-allocation.ts` — FIFO y generación de código

## Cliente web

- `inventory-lots-client.ts` — consulta lotes abiertos
- `sale-inventory-consumption.ts` — `planSaleInventoryConsumption` + `applySaleInventoryConsumption`
- `inventory-client.ts` — actualiza lotes en la misma transacción del movimiento

## Evolución

- UI de consulta inversa (lote → todas las ventas)
- Integración con event bus `inventory.movement.registered`
- Lotes manuales en ajustes de inventario
