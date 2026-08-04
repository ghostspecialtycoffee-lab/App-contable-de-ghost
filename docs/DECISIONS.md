# Registro de decisiones técnicas

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
