# Business Engine — Ghost ERP

> **Propósito:** Definir la arquitectura de negocio que gobierna toda la aplicación.  
> Cursor, el asistente Ghost y cualquier módulo nuevo deben consultar este documento antes de implementar lógica.

## Visión

Ghost ERP no es una colección de pantallas. Es un **ERP para cafeterías** donde:

1. Toda operación de negocio pasa por **motores de dominio** (servicios puros).
2. La **IA nunca escribe directamente** en Firestore ni en la base de datos.
3. Cada acción crítica genera **trazabilidad** (kardex, auditoría, historial de precios).
4. Los cambios de costo **propagan** automáticamente a recetas, márgenes y reportes.

```
Usuario / UI / Ghost IA
         │
         ▼
   Application Layer        apps/web/src/lib/*, apps/functions/src/*
         │                   (orquestación, permisos, transacciones)
         ▼
   Business Engine           packages/domain/src/*
         │
    ┌────┴────┬────────┬──────────┬─────────┬──────────┐
    ▼         ▼        ▼          ▼         ▼          ▼
 Costeo   Compras  Inventario  Producción  Ventas   Financiero
    │         │        │          │         │          │
    └─────────┴────────┴──────────┴─────────┴──────────┘
                         │
                         ▼
              Motor de Reportes + Eventos
                         │
                         ▼
                   Firestore (datos)
```

## Reglas inmutables

```text
1. Toda la aplicación está gobernada por el Business Engine (packages/domain).
2. Ningún módulo de UI modifica datos sin pasar por un servicio de aplicación.
3. La IA (Ghost) solo invoca APIs del Application Layer; nunca setDoc/updateDoc directo.
4. Cada venta, compra, producción o ajuste debe ser atómico y auditable.
5. Los cálculos (costo, impuesto, margen, stock) viven en domain; no en componentes React.
6. Cuando un costo cambia, los motores afectados deben recalcular (síncrono hoy; eventos en fase 2).
```

---

## Motores de negocio

### 1. Motor de Costeo

**Responsabilidad:** Traducir recetas + costos de insumos → costo por producto, food cost, márgenes.

| Regla | Estado | Ubicación |
|-------|--------|-----------|
| Costeo por receta (líneas + unidades) | ✅ | `packages/domain/src/production/services/recipe-cost.ts` |
| Conversión de unidades (g, ml, bolsa, kg) | ✅ | `packages/domain/src/inventory/unit-conversion.ts` |
| Costo promedio ponderado | ✅ | `packages/domain/src/inventory/services/inventory.ts` |
| Matriz de costos / food cost % | ✅ | `packages/domain/src/reports/cost-matrix-report.ts` |
| Panorama de costo por producto | ✅ | `packages/domain/src/reports/product-cost-panorama.ts` |
| Recetas con versiones | ⏳ | Hoy: una receta activa por producto |
| Merma / rendimiento por línea | ⏳ | Parcial en pastry/beverage setup |
| FIFO / LIFO / costo estándar | ⏳ | Solo promedio ponderado hoy |
| Propagación automática al cambiar costo | 🚧 | Recalcula al leer; no hay evento persistido |

**Flujo canónico (ej. "¿cuánto cuesta un Cappuccino?"):**

```
Ghost IA → brain-responses / ghost-conversation
         → calculateRecipeCost(recipe, inventoryProfiles)
         → resolveUnitCostPerBase por cada insumo
         → respuesta con desglose
```

**Datos por ingrediente (objetivo):**

| Campo | Hoy | Objetivo |
|-------|-----|----------|
| Costo compra | ✅ `lastCost` | ✅ |
| Unidad / presentación | ✅ | ✅ |
| Stock | ✅ balances | ✅ |
| Proveedor | ⏳ | Catálogo proveedores |
| Última compra | ✅ en facturas | ✅ |
| Costo promedio | ✅ `averageCost` | ✅ |
| FIFO / LIFO | ❌ | Fase 3 |
| Merma / rendimiento | ⏳ | Por línea de receta |

---

### 2. Motor de Compras

**Responsabilidad:** Registrar compras, actualizar costos, sugerir reabastecimiento.

| Regla | Estado | Ubicación |
|-------|--------|-----------|
| Registrar factura + líneas | ✅ | `packages/domain/src/purchases/services/invoice.ts` |
| Actualizar costo promedio al confirmar | ✅ | `inventory.ts` + client transaction |
| Entrada de inventario (kardex) | ✅ | `registerInventoryMovement` |
| Historial de precios por proveedor | ⏳ | |
| Sugerencia si stock < mínimo | 🚧 | Ghost responde consulta; no genera orden |
| Comparar proveedores / tiempos | ⏳ | |
| Predicción de quiebre ("en 2 días sin leche") | ⏳ | Requiere consumo histórico |

**Flujo canónico (cada compra):**

```
1. Validar proveedor y factura
2. Registrar factura (borrador → confirmada)
3. Por cada línea: actualizar costo promedio
4. Registrar movimiento kardex (entrada)
5. Registrar historial de precio          ← pendiente
6. Recalcular recetas afectadas           ← al consultar hoy
7. Registrar auditoría
```

---

### 3. Motor de Inventario

**Responsabilidad:** Stock, kardex, movimientos, reservas.

| Regla | Estado | Ubicación |
|-------|--------|-----------|
| Entrada (compra) | ✅ | movements `purchase` |
| Salida (venta) | ✅ | `sale-inventory-consumption.ts` |
| Ajuste / merma | ✅ | movements `adjustment`, `waste` |
| Transformación (producción) | ⏳ | Sin órdenes de producción |
| Balance desnormalizado | ✅ | ADR-005 |
| Historial completo (kardex) | ✅ | `inventoryMovements` |

**Flujo canónico (cada movimiento):**

```
1. Validar permiso y bodega
2. Verificar stock (si es salida)
3. Crear movimiento kardex
4. Actualizar balance en transacción
5. Auditoría
```

---

### 4. Motor de Producción

**Responsabilidad:** Transformar insumos en productos terminados con rendimiento.

| Regla | Estado | Ubicación |
|-------|--------|-----------|
| Recetas por producto | ✅ | `packages/domain/src/production/` |
| Rendimiento (yield) | ✅ | `recipe-yield.ts` |
| Costo por porción / botella | ✅ | `recipe-cost.ts` |
| Órdenes de producción (Cold Brew 45 botellas) | ⏳ | |
| Subrecetas | ⏳ | |
| Sustituciones de ingredientes | ⏳ | |

**Ejemplo objetivo (Cold Brew):**

```
Entrada: 2 kg café + 18 L agua + envases
Salida: 45 botellas
→ Motor calcula costo/botella automáticamente
→ Descuenta insumos, ingresa producto terminado
```

---

### 5. Motor de Ventas (POS)

**Responsabilidad:** Venta atómica con impacto en inventario, caja y reportes.

| Regla | Estado | Ubicación |
|-------|--------|-----------|
| Calcular totales + impuestos | ✅ | `packages/domain/src/pos/services/sale.ts` |
| Descontar inventario por receta | ✅ | `sale-inventory-consumption.ts` |
| Mesas / sesiones | ✅ | `table-session.ts` |
| Actualizar caja | ✅ | `cash-balance.ts` |
| Una transacción atómica | 🚧 | Cliente Firestore; ideal: Function |
| Reserva de stock previa | ⏳ | |

**Flujo canónico (cada venta):**

```
1. Validar stock disponible
2. (Opcional) Reservar inventario
3. Crear venta + líneas + impuestos
4. Descontar insumos según receta (kardex salida)
5. Calcular costo real y utilidad bruta
6. Actualizar sesión de caja
7. Auditoría + dashboard (lectura)
```

---

### 6. Motor Financiero

**Responsabilidad:** Gastos, rentabilidad, punto de equilibrio, flujo de caja.

| Regla | Estado | Ubicación |
|-------|--------|-----------|
| Gastos fijos | ✅ | `expenses/services/fixed-expense.ts` |
| Resumen financiero | ✅ | `reports/financial-summary.ts` |
| Impuestos Colombia | ✅ | `fiscal/colombia-tax.ts` |
| EBITDA / punto de equilibrio | ⏳ | |
| Separación fijo vs variable automática | 🚧 | Por categoría manual |
| Flujo de caja proyectado | ⏳ | |

---

### 7. Motor de Reportes

**Responsabilidad:** Agregar datos de todos los motores para dashboards y análisis.

| Reporte | Estado | Ubicación |
|---------|--------|-----------|
| Ventas por período | ✅ | `pos/services/reports.ts` |
| Compras | ✅ | `reports/purchases-report.ts` |
| Gastos anuales | ✅ | `reports/expenses-report.ts` |
| Matriz de costos | ✅ | `reports/cost-matrix-report.ts` |
| Productos más vendidos / horarios | ⏳ | Datos en ventas; análisis IA pendiente |

---

## IA integrada (Ghost)

Ghost es la **capa de orquestación conversacional**, no un motor de negocio.

```
Usuario: "¿Estoy ganando dinero?"
    ↓
Ghost (ghost-conversation + brain-responses)
    ↓ lee snapshots ya cargados (ventas, costos, compras, caja)
Motor de Reportes + Financiero (domain, funciones puras)
    ↓
Respuesta con análisis + recomendación (sin escribir datos)
```

### Lo que Ghost puede hacer hoy

- Consultar ventas, stock bajo, costos, mesas, catálogo
- Ejecutar acciones confirmadas: venta, compra, movimiento, gasto, mesa, producto menú
- Flujos guiados de costeo y operación diaria

### Lo que Ghost NO debe hacer

- `setDoc` / `updateDoc` / `deleteDoc` directo en Firestore
- Calcular impuestos o costos fuera de `packages/domain`
- Modificar precios o inventario sin confirmación del usuario

### Archivos clave

| Capa | Ruta |
|------|------|
| Clasificación / intents | `packages/domain/src/assistant/ghost-conversation.ts` |
| Skills de negocio | `packages/domain/src/assistant/ghost-brain.ts` |
| Respuestas analíticas | `packages/domain/src/assistant/brain-responses.ts` |
| Orquestación web | `apps/web/src/lib/assistant/ghost-chat-engine.ts` |
| Ejecución de acciones | `apps/web/src/lib/assistant/ghost-chat-actions.ts` |

---

## Eventos de dominio (fase 2 — DDD)

Hoy los efectos colaterales son **síncronos dentro de transacciones**. La evolución recomendada:

```
CompraConfirmada → actualizar costo, kardex, historial precio, invalidar cache costeo
VentaRegistrada → kardex, caja, métricas
CostoActualizado → recalcular recetas afectadas, alertas margen
StockBajo → notificación, sugerencia compra
```

Implementación futura:

1. `packages/domain/src/events/` — tipos de evento puros
2. `apps/functions/src/events/` — handlers + outbox (patrón ya usado en notificaciones)
3. Ghost **consume** eventos agregados para análisis predictivo

---

## Brecha actual vs objetivo

| Aspecto | Hoy | Objetivo |
|---------|-----|----------|
| Lógica de negocio | ✅ Centralizada en `packages/domain` | Mantener |
| Escrituras | 🚧 Mayoría desde cliente web (Spark) | Cloud Functions (ADR-002) |
| IA → datos | ✅ Vía `ghost-chat-actions` → lib clients | Mantener; prohibir acceso directo |
| Eventos | ❌ | Outbox + handlers |
| Proveedores / órdenes compra | ⏳ | Módulo compras fase 2 |
| Producción (órdenes) | ⏳ | Módulo producción |
| FIFO/LIFO | ❌ | Fase 3 si se requiere |

---

## Cómo implementar un cambio (checklist Cursor)

Al agregar o modificar funcionalidad:

1. **¿Qué motor afecta?** (costeo, compras, inventario, etc.)
2. **¿La lógica va en `packages/domain`?** Si es cálculo o regla de negocio → sí.
3. **¿Ghost necesita acceso?** Agregar skill en `ghost-brain.ts` + intent en `ghost-conversation.ts` + acción en `ghost-chat-actions.ts` que llame al **mismo** lib client que la UI.
4. **¿Hay efectos colaterales?** Documentar en este archivo y en `docs/{MODULO}.md`.
5. **Tests** en domain para toda regla nueva.
6. **No duplicar** fórmulas en React components.

---

## Roadmap de motores (orden sugerido)

| Prioridad | Motor | Siguiente entrega |
|-----------|-------|-------------------|
| 1 | Costeo | Versiones de receta, merma por línea |
| 2 | Compras | Proveedores + historial de precios + alertas |
| 3 | Inventario | Predicción de quiebre por consumo |
| 4 | Ventas | Transacción atómica vía Functions |
| 5 | Producción | Órdenes de producción (Cold Brew, batch) |
| 6 | Financiero | Punto de equilibrio, EBITDA |
| 7 | Eventos | Outbox de dominio para propagación |
| 8 | IA | Análisis predictivo sobre eventos |

---

## Referencias

- [ARCHITECTURE.md](../ARCHITECTURE.md) — capas técnicas
- [DECISIONS.md](DECISIONS.md) — ADRs
- [DATABASE.md](../DATABASE.md) — esquema Firestore
- [INVENTORY.md](INVENTORY.md), [POS.md](POS.md) — módulos operativos
- [.cursor/skills/ghost-erp-autonomous/SKILL.md](../.cursor/skills/ghost-erp-autonomous/SKILL.md) — modo autónomo
