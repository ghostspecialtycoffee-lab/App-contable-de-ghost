# POS, comandas y facturación — Ghost ERP

Sistema operativo para registrar ventas, emitir comprobantes y consultar informes **sin plan Blaze**.

## Rutas

| Ruta | Uso |
|------|-----|
| `/pos` | Cobrar venta (carrito + cliente opcional) |
| `/pos/menu` | Registrar productos o cargar menú de ejemplo |
| `/billing` | **Informes** + **Comprobantes** (hoy / 7 días / mes) |
| `/kds` | Comandas barra / cocina |
| `/dashboard` | Resumen del día y accesos rápidos |

## Flujo recomendado

1. **Productos** → `/pos/menu` → “Cargar menú de ejemplo” o agregar manualmente.
2. **Vender** → `/pos` → tocar productos → cobrar.
3. **Informes** → `/billing` → pestaña Informes (total, IVA, ticket promedio, ranking).
4. **Comprobante** → `/billing` → pestaña Comprobantes → imprimir.

## Informes disponibles

- Total vendido y cantidad de ventas
- Ticket promedio
- IVA recaudado
- Ventas por forma de pago (efectivo, tarjeta, etc.)
- Productos más vendidos

## Colecciones Firestore

- `menuProducts` — catálogo POS
- `sales` — ventas con `soldAt`, `soldOn`, IVA y líneas
- `kitchenOrders` — comandas

## Próximos pasos

- Factura electrónica DIAN
- Caja (apertura/cierre)
- Descuento automático de inventario por recetas
