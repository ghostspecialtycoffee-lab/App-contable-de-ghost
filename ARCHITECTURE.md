# Arquitectura — Ghost ERP

> **Visión de producto:** [docs/PLATFORM_VISION.md](docs/PLATFORM_VISION.md) — plataforma AI-first, no ERP con módulos aislados.

## Principios

- **Plataforma AI-first** — Ghost orquesta capacidades de negocio; las pantallas son una interfaz
- **Clean Architecture** — dominio independiente de UI y Firebase
- **Modelo conectado** — Producto → Receta → Inventario → Compras (sin módulos aislados)
- **Eventos y versionado** — operaciones críticas emiten eventos; no eliminar, versionar (ADR-007)
- **SOLID, DRY, KISS, YAGNI** — sin abstracciones prematuras (Rules/Workflow en fases)
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

> En la visión de plataforma, esto son **capacidades** del Business Engine, no silos de pantallas. Ver [PLATFORM_VISION.md](docs/PLATFORM_VISION.md).

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

- [docs/PLATFORM_VISION.md](docs/PLATFORM_VISION.md) — visión AI-first, eventos, reglas, roadmap
- [DATABASE.md](DATABASE.md) — esquema Firestore
- [SECURITY.md](SECURITY.md) — reglas y auth
- [docs/BUSINESS_ENGINE.md](docs/BUSINESS_ENGINE.md) — motores de negocio, reglas IA, flujos canónicos
- [CODING_STANDARDS.md](CODING_STANDARDS.md) — convenciones de código
