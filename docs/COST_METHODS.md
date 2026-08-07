# Costeo multi-motor (v1)

Ghost soporta tres métodos de valoración de inventario al registrar ventas. El método se configura por organización y puede sobreescribirse por ítem.

## Métodos

| Método | Clave | Comportamiento |
|--------|-------|----------------|
| Promedio ponderado | `weighted_average` | Usa `averageCost` del ítem en salidas de bodega |
| FIFO | `fifo` | Usa el costo del lote consumido (más antiguo primero) |
| Costo estándar | `standard` | Usa `standardCost` del ítem; si falta, cae a promedio |

## Configuración

- **Organización:** `settings/costing` → campo `costingSettings.defaultMethod` en Firestore
- **Por ítem (opcional):** `inventoryItems/{id}.costMethod` y `standardCost`

## Ventas

Cada comprobante guarda `costSnapshot` inmutable:

- `method` — método aplicado
- `totalIngredientCost` — costo total de insumos
- `foodCostPct` — costo / venta
- `lines[]` — costo por producto vendido

También se conservan `recipeSnapshots` y `lotConsumptions` para trazabilidad.

## Código

- `packages/domain/src/inventory/cost-method.ts`
- `packages/domain/src/inventory/services/sale-cost-snapshot.ts`
- `apps/web/src/lib/inventory/sale-inventory-consumption.ts`
