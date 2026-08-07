# Registro de decisiones técnicas

> Arquitectura general: [ARCHITECTURE.md](../ARCHITECTURE.md)  
> Visión de plataforma: [PLATFORM_VISION.md](PLATFORM_VISION.md)

## ADR-001: Monorepo pnpm + Turborepo

**Estado:** Aceptada  
**Contexto:** Múltiples apps (web, functions) y paquetes compartidos (domain, ui, infrastructure).  
**Decisión:** Monorepo con pnpm workspaces y Turborepo para builds incrementales.  
**Consecuencias:** Dependencias compartidas, CI más simple, imports `@ghost/*` tipados.

## ADR-002: Escrituras solo en servidor

**Estado:** Aceptada  
**Contexto:** ERP con auditoría, roles y datos financieros.  
**Decisión:** Firestore rules en modo lectura para el cliente; mutaciones vía Cloud Functions.  
**Consecuencias:** Mayor seguridad, latencia mínima extra en operaciones de escritura.

## ADR-003: Membresía por subcolección

**Estado:** Aceptada  
**Contexto:** Multi-tenant con reglas por organización.  
**Decisión:** `organizations/{orgId}/members/{userId}` como fuente de verdad para permisos; array `memberships` en `users` como cache de lectura.  
**Consecuencias:** Dos documentos sincronizados en transacciones; reglas O(1) con `exists()`.

## ADR-004: Paquete `@ghost/infrastructure`

**Estado:** Aceptada  
**Contexto:** Separar dominio puro de adaptadores Firestore.  
**Decisión:** Mappers y paths Firestore en infrastructure; domain sin dependencias Firebase.  
**Consecuencias:** Domain testeable sin emuladores; infrastructure crece por módulo.

## ADR-005: Balances de inventario desnormalizados

**Estado:** Aceptada  
**Contexto:** Consultar stock sumando movimientos es costoso en Firestore.  
**Decisión:** Documento `inventoryBalances/{warehouseId_itemId}` actualizado en transacción con cada movimiento.  
**Consecuencias:** Escritura adicional por movimiento; lectura de stock en O(1).

## ADR-006: Onboarding directo a Firestore (plan Spark)

**Estado:** Aceptada  
**Contexto:** Cloud Functions requiere plan Blaze; usuarios en Spark no pueden completar onboarding.  
**Decisión:** Onboarding con escritura directa a Firestore + reglas estrictas; fallback automático si Functions no está disponible.  
**Consecuencias:** Inventario sigue vía Functions (Blaze); onboarding funciona sin Blaze.

## ADR-007: Plataforma AI-first con eventos y reglas

**Estado:** Aceptada (dirección estratégica)  
**Contexto:** El producto aspira a ser referencia para cafeterías de especialidad, no un ERP genérico con pantallas. La IA debe orquestar el negocio; los módulos actuales son capacidades del dominio, no el centro del diseño.

**Decisión:**

1. **AI-first:** Ghost (copiloto) consume los mismos servicios de dominio que web/POS/API. La IA no es un chat sobre módulos aislados.
2. **Modelo conectado:** Producto → Receta → Ingredientes → Inventario → Compras → Proveedores. Nuevas features se diseñan sobre este grafo.
3. **Eventos:** Las operaciones críticas (venta, compra, movimiento, cambio receta/costo) evolucionarán hacia emisión de eventos de dominio + handlers (outbox), en lugar de efectos colaterales síncronos dispersos.
4. **Reglas y workflows:** Reglas de negocio repetidas migrarán a un Rules Engine configurable; flujos multi-paso a un Workflow Engine (patrón outbox existente en notificaciones).
5. **Versionado e inmutabilidad:** Recetas, precios y configuración se versionan; ventas referencian la versión vigente y el costo usado.
6. **Analítica desacoplada:** Reportes pesados y briefings IA proactivos consumirán agregados/DWH, no la base operativa en tiempo real.

**Consecuencias:**

- Documento maestro: [PLATFORM_VISION.md](PLATFORM_VISION.md)
- Implementación incremental (YAGNI): no construir Rules/Workflow/DWH completos de golpe
- El código actual en `packages/domain` es la base del Business Engine; las pantallas en `apps/web` son una interfaz
- Prioridad técnica inmediata post-compras: event bus + recetas versionadas + briefing IA

**Alternativas rechazadas:**

- Seguir solo con módulos/pantallas independientes y IA como addon
- Big-bang rewrite antes de consolidar dominio existente
