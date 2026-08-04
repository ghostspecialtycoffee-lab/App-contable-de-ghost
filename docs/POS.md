# POS, comandas y ventas — Ghost ERP

Módulo operativo para cafeterías y restaurantes **sin plan Blaze** (escritura directa en Firestore con reglas de seguridad).

## Rutas

| Ruta | Uso |
|------|-----|
| `/pos` | Punto de venta: carrito, cobro, IVA |
| `/pos/menu` | Catálogo de productos vendibles |
| `/kds` | Comandas en vivo (barra / cocina) |
| `/billing` | Historial de ventas y comprobantes |

## Flujo operativo

1. **Menú** — Crea productos con precio, categoría y estación (`counter`, `bar`, `kitchen`).
2. **POS** — Agrega productos al carrito y cobra (efectivo, tarjeta, transferencia).
3. **Comandas** — Productos de barra/cocina generan tickets en KDS automáticamente.
4. **Ventas** — Comprobante con subtotal, IVA y total (factura electrónica DIAN en fase posterior).

## Colecciones Firestore

- `organizations/{orgId}/menuProducts`
- `organizations/{orgId}/sales`
- `organizations/{orgId}/kitchenOrders`

## Próximos pasos

- Caja (apertura/cierre)
- Factura electrónica Colombia (DIAN)
- Recetas → descuento automático de inventario al vender
- Mesas y propinas
