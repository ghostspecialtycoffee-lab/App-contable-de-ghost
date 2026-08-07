# Ghost Platform — Visión AI-First

> **North star:** No es un ERP con pantallas y un chat. Es una **plataforma operativa para cafeterías** donde la IA es el orquestador del negocio.

Este documento define la dirección estratégica. Cursor, Ghost y cualquier nueva interfaz (web, móvil, WhatsApp, API) deben alinearse con esta visión.

---

## El cambio de enfoque

### ERP tradicional (lo que NO queremos ser)

```
Inventario → Compras → Ventas → Recetas → Reportes → Usuarios
                                    ↑
                              IA = chat que consulta módulos
```

### Ghost Platform (lo que SÍ construimos)

```
                    IA BUSINESS COPILOT
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
  Business Rules     Workflow Engine    Decision Engine
        │                  │                  │
 ┌──────┼──────┐      ┌────┼────┐      ┌──────┼──────┐
 │      │      │      │    │    │      │      │      │
Costeo Compras Ventas Inventario Producción Finanzas CRM
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    EVENT BUS (dominio)
                           │
              Base operativa → DWH → BI → IA proactiva
```

La IA **no complementa** el sistema: **orquesta** reglas, flujos y decisiones. Las pantallas son una interfaz más; no son el centro.

---

## Modelo de dominio conectado (no módulos aislados)

Todo el negocio es un grafo, no carpetas independientes:

```
Producto (menú)
    │
    ├── tiene → Receta (versionada)
    │              │
    │              └── consume → Ingredientes
    │                                │
    │                                └── pertenecen → Inventario
    │                                                      │
    │                                                      ├── movimientos → Kardex (trazabilidad)
    │                                                      │
    │                                                      └── comprados vía → Compras
    │                                                                              │
    │                                                                              └── proveedores
    │
    └── cada Venta queda ligada a → receta versión N + lotes consumidos
```

**Regla para desarrollo:** ninguna capacidad nueva se diseña “solo para una pantalla”. Se expone como **servicio de dominio** reutilizable por web, POS, Ghost, WhatsApp y API.

---

## Capacidades de la plataforma (no “módulos”)

| Capacidad | Responsabilidad | Estado actual |
|-----------|-----------------|---------------|
| **Costeo** | Recetas, métodos de costo, márgenes | 🚧 Promedio ponderado; falta FIFO/LIFO/estándar |
| **Compras** | Proveedores, facturas, historial precios, sugerencias | 🚧 PR #85 en camino |
| **Inventario** | Stock, kardex, lotes, trazabilidad | 🚧 Kardex sí; trazabilidad lote→venta pendiente |
| **Producción** | Batch, rendimiento, transformación | ⏳ Recetas sí; órdenes producción no |
| **Ventas** | POS, mesas, consumo por receta | ✅ Operativo (cliente) |
| **Finanzas** | Caja, gastos, rentabilidad | 🚧 Parcial |
| **CRM / Fidelización** | Clientes, puntos, WhatsApp | ⏳ |
| **Calidad** | Lotes, proveedor, trazabilidad completa | ⏳ |
| **Analítica** | DWH, BI, briefings IA | ⏳ |

---

## Motores de la plataforma

### 1. Business Engine (dominio puro)

**Ubicación:** `packages/domain/src/`

Funciones puras: validar, calcular, decidir. Sin Firebase, sin React.

Hoy existe en buena parte (costeo, inventario, ventas, compras, reportes). **Evolución:** unificar bajo capacidades con APIs estables, no bajo carpetas de pantalla.

### 2. Rules Engine (motor de reglas)

Reglas **configurables**, no hardcodeadas en componentes.

```
SI stock < mínimo
  ENTONCES alerta + sugerencia_compra + notificar_IA

SI costo_café sube > 8%
  ENTONCES recalcular_recetas + recalcular_márgenes + proponer_precio
```

| Fase | Implementación |
|------|----------------|
| **Ahora** | Reglas en TypeScript (`purchase-intelligence`, `unit-conversion`, triggers) |
| **Fase 2** | `packages/domain/src/rules/` — DSL o JSON de reglas por organización |
| **Fase 3** | UI de reglas + evaluación en Functions al procesar eventos |

### 3. Workflow / Automation Engine

Flujos tipo Zapier, disparados por eventos:

```
Evento: VentaRealizada
  → actualizar_stock
  → actualizar_caja
  → actualizar_dashboard
  → (futuro) WhatsApp cliente
  → (futuro) puntos fidelización
  → (futuro) sync BI
```

| Fase | Implementación |
|------|----------------|
| **Ahora** | Efectos síncronos en transacciones cliente |
| **Fase 2** | Outbox + handlers (patrón ya en `notificationOutbox`) |
| **Fase 3** | `workflows` collection + editor visual |

### 4. Decision Engine (IA de negocio)

Dos modos:

| Modo | Descripción | Estado |
|------|-------------|--------|
| **Reactivo** | Usuario pregunta → Ghost consulta motores → responde | ✅ |
| **Proactivo** | Cron diario analiza ventas/compras/inventario/caja → briefing automático | ⏳ |

Briefing objetivo (sin que el usuario pregunte):

> Buenos días. Hoy encontré 7 novedades:
> - El café aumentó 6%.
> - El margen bajó 3%.
> - Riesgo de quedarse sin leche.
> - …

**Implementación futura:** `apps/functions/src/ai/dailyBriefing.ts` + eventos agregados en DWH.

### 5. Event Bus

```
Venta realizada → evento `SaleRecorded`
    ├── Inventario escucha → descuenta insumos
    ├── Caja escucha → actualiza sesión
    ├── Finanzas escucha → utilidad
    ├── IA escucha → detecta anomalías
    ├── Dashboard escucha → métricas
    └── Auditoría escucha → log inmutable
```

**Tipos de evento (objetivo):**

- `SaleRecorded`, `PurchaseConfirmed`, `InventoryMovementRegistered`
- `RecipeVersionPublished`, `CostMethodChanged`
- `StockBelowMinimum`, `SupplierPriceChanged`

**Hoy:** triggers Firestore puntuales (stock bajo, caja). **Siguiente paso:** outbox unificado en `packages/domain/src/events/`.

---

## Costeo multi-motor

El usuario elige el método por organización o por categoría de insumo:

| Método | Uso típico | Estado |
|--------|------------|--------|
| Promedio ponderado | Default operativo | ✅ |
| FIFO | Perecederos, lotes | ⏳ |
| LIFO | Contabilidad específica | ⏳ |
| Costo estándar | Presupuesto / variance | ⏳ |
| Costo reposición | Decisiones de compra | ⏳ |
| Costo objetivo (target) | Food cost % meta | 🚧 Matriz costos |

**Regla:** toda venta guarda el método y el costo unitario usado en ese momento (inmutable).

---

## Recetas versionadas

Nunca eliminar recetas; publicar versiones:

```
Latte v1 → v2 → v3 (activa)
```

Cada venta referencia `recipeId` + `recipeVersion`.

| Campo venta (objetivo) | Propósito |
|------------------------|-----------|
| `recipeVersion` | Costo histórico correcto |
| `costSnapshot` | Costo por línea al momento de venta |
| `consumptionTrace` | Lotes/insumos consumidos |

**Hoy:** una receta activa por producto. **Siguiente:** `recipeVersions` subcolección + migración.

---

## Kardex inteligente (trazabilidad)

No solo cantidad; cadena completa:

```
Latte #4521
  → Leche Alpina, lote A-522
      → comprada 12 mayo, proveedor X, factura F-889
```

Requiere: `lotCode` en movimientos (parcial), enlazar venta → movimientos salida → lote → compra.

---

## Auditoría total

Todo cambio queda registrado. Nunca borrar; versionar.

| Campo | Descripción |
|-------|-------------|
| `actor` | usuario o `ghost-ai` |
| `entity` | receta, precio, insumo… |
| `before` / `after` | diff JSON |
| `reason` | opcional |
| `branchId` | sucursal |

**Hoy:** `auditLogs` en operaciones críticas vía Functions. **Objetivo:** 100% escrituras + diff automático.

---

## Data Warehouse (analítica desacoplada)

```
Firestore (operativo, tiempo real)
        │
        ▼ eventos / ETL nocturno
BigQuery o agregados Firestore
        │
        ├── Dashboards (no bloquean POS)
        ├── IA proactiva (briefings)
        └── BI / export contador
```

**Por qué:** el ERP nunca se pone lento por reportes pesados.

**Fase 1:** agregados diarios en `organizations/{id}/analyticsDaily/{date}`  
**Fase 2:** export a BigQuery (plan Blaze)

---

## Interfaces (todas usan el mismo Business Engine)

```
                 GHOST ERP PLATFORM
                         │
                Business Engine (Dominio)
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Event Bus      Workflow Engine    Rules Engine
        │                │                │
        └────────────────┼────────────────┘
                         │
    Compras • Inventario • Producción • Costeo
      Ventas • Finanzas • CRM • Calidad • RRHH
                         │
                 IA Business Copilot
                         │
 Web App • App Móvil • POS • WhatsApp • API Pública
```

| Interfaz | Estado | Debe usar |
|----------|--------|-----------|
| Web (`apps/web`) | ✅ | `lib/*` → domain |
| Ghost chat | ✅ | Mismos `lib/*`, nunca Firestore directo |
| Cloud Functions | 🚧 Parcial | domain + event handlers |
| WhatsApp / API | ⏳ | Mismos servicios |

---

## Reglas para Cursor (modo autónomo)

```text
1. Piensa en CAPACIDADES, no en pantallas nuevas.
2. Toda lógica va en packages/domain; la IA y la UI solo orquestan.
3. Ghost nunca escribe directo a Firestore.
4. Preferir eventos + handlers sobre efectos colaterales dispersos.
5. Versionar en lugar de eliminar (recetas, precios, configuración).
6. Cada venta/compra debe poder reconstruirse históricamente.
7. Reglas de negocio repetidas → candidatas al Rules Engine.
8. Flujos multi-paso repetidos → candidatos al Workflow Engine.
9. No duplicar lógica entre Ghost y pantallas.
10. Antes de un módulo grande, preguntar: ¿qué evento dispara esto? ¿quién escucha?
```

---

## Roadmap de evolución (orden recomendado)

| # | Entrega | Desbloquea |
|---|---------|------------|
| 1 | ✅ Dominio puro + Ghost operativo | Base actual |
| 2 | 🚧 Compras inteligentes + proveedores | PR #85 |
| 3 | **Event bus + outbox** | Propagación costos, workflows |
| 4 | **Recetas versionadas** | Costo histórico en ventas |
| 5 | **Briefing IA proactivo** | Copiloto diario |
| 6 | **Rules engine v1** | Reglas configurables stock/precio |
| 7 | **Trazabilidad lote→venta** | Kardex inteligente |
| 8 | **Costeo FIFO/estándar** | Multi-motor |
| 9 | **Agregados analíticos / DWH** | BI sin lentitud |
| 10 | **Workflow engine + WhatsApp** | Automatización externa |

---

## Qué NO hacer

- Construir pantallas sin servicio de dominio detrás
- Poner reglas de negocio en componentes React
- Hacer que Ghost tenga lógica que la UI no tenga (o viceversa)
- Eliminar datos históricos (recetas, precios, movimientos)
- Consultas analíticas pesadas sobre colecciones operativas en tiempo real
- Tratar la IA como “solo un chat”

---

## Referencias técnicas actuales

| Documento | Contenido |
|-----------|-----------|
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Capas Clean Architecture |
| [DATABASE.md](../DATABASE.md) | Esquema Firestore |
| [DECISIONS.md](DECISIONS.md) | ADRs |
| [docs/INVENTORY.md](INVENTORY.md), [docs/POS.md](POS.md) | Operación |
| `.cursor/skills/ghost-erp-autonomous/SKILL.md` | Loop autónomo |

---

## Resumen en una frase

**Ghost no es un ERP con IA adjunta: es una plataforma donde el dominio del negocio de cafetería, los eventos, las reglas y el copiloto IA comparten el mismo núcleo — y cualquier interfaz futura hereda automáticamente esa inteligencia.**
