# Arquitectura — Ghost ERP

## Principios

- **Clean Architecture** — dominio independiente de UI y Firebase
- **SOLID, DRY, KISS, YAGNI** — sin abstracciones prematuras
- **Escrituras en servidor** — cliente solo lectura en Firestore (ADR-002)
- **Multi-tenant** — todo dato bajo `organizations/{orgId}`

## Capas

```
┌─────────────────────────────────────────┐
│  apps/web          (Presentación)       │
│  Next.js, providers, hooks, páginas     │
├─────────────────────────────────────────┤
│  apps/functions    (Aplicación servidor)│
│  Callables, triggers, transacciones     │
├─────────────────────────────────────────┤
│  packages/infrastructure (Adaptadores)  │
│  firestorePaths, mappers                │
├─────────────────────────────────────────┤
│  packages/domain   (Dominio)            │
│  Entidades, validaciones, permisos      │
├─────────────────────────────────────────┤
│  packages/shared   (Kernel compartido)  │
│  Tipos, Result, catálogo de módulos     │
├─────────────────────────────────────────┤
│  packages/ui       (Design system)      │
│  Button, Card, tokens                   │
└─────────────────────────────────────────┘
```

## Flujo de dependencias

```
web → infrastructure, domain, shared, ui
functions → domain, shared
infrastructure → domain, shared
domain → shared
ui → (peer react)
```

**Prohibido:** domain → firebase, domain → react, dependencias circulares.

## Módulos de negocio

Catálogo en `@ghost/shared` (`GHOST_MODULES`): core, inventory, costing, pos, kds, cash, billing, ocr, hr, chat, reports, analytics, ai, notifications.

Cada módulo sigue la misma estructura:

1. `packages/domain/src/{modulo}/` — entidades + servicios puros
2. `apps/functions/src/{modulo}/` — callables con permisos + auditoría
3. `packages/infrastructure/src/` — paths + mappers
4. `apps/web/src/app/(protected)/{modulo}/` — UI
5. `firebase/firestore.rules` + índices
6. `docs/{MODULO}.md` + entrada en CHANGELOG

## Multi-tenant

| Concepto | Ubicación |
|----------|-----------|
| Organización | `organizations/{orgId}` |
| Membresía (permisos) | `organizations/{orgId}/members/{uid}` |
| Cache membresía | `users/{uid}.memberships[]` |
| Sucursal | `organizations/{orgId}/branches/{branchId}` |
| Auditoría | `organizations/{orgId}/auditLogs/{logId}` |

## Permisos

Matriz en `packages/domain/src/roles.ts`. Functions usan `assertOrgPermission()` — nunca confiar en el cliente.

## ADRs

Ver [docs/DECISIONS.md](docs/DECISIONS.md) para decisiones registradas (monorepo, escrituras servidor, membresías, infrastructure, balances inventario).

## Referencias

- [DATABASE.md](DATABASE.md) — esquema Firestore
- [SECURITY.md](SECURITY.md) — reglas y auth
- [CODING_STANDARDS.md](CODING_STANDARDS.md) — convenciones de código
