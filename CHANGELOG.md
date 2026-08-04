# Changelog — Ghost ERP

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [Unreleased]

### Added
- App web optimizada para celular: bottom nav, PWA manifest, inputs táctiles 48px
- Páginas `/inventory/warehouses` y `/inventory/movements` funcionales
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) — guía completa Google/Firebase (sin Code.gs)
- Iconos PWA en `apps/web/public/icons/`
- Documentación raíz: ARCHITECTURE, ROADMAP, TASKS, DATABASE, CODING_STANDARDS, SECURITY, CONTRIBUTING
- Skills permanentes del agente en `.cursor/skills/`

## [0.3.0] — 2026-08-04

### Added
- Módulo inventario base: ítems, bodegas, movimientos, kardex
- Cloud Functions: `createInventoryItem`, `createWarehouse`, `registerInventoryMovement`
- Costo promedio ponderado y balances desnormalizados (ADR-005)
- UI `/inventory` y `/inventory/items`
- Tests unitarios inventario (10 total dominio)
- docs/INVENTORY.md

## [0.2.0] — 2026-08-04

### Added
- Autenticación Firebase: login, registro, AuthGuard
- Onboarding multi-tenant: `createOrganization` callable
- Paquete `@ghost/infrastructure` (paths, mappers)
- AuthProvider con perfil Firestore realtime
- docs/AUTH.md, docs/DECISIONS.md (ADR 001-004)

## [0.1.0] — 2026-08-04

### Added
- Monorepo pnpm + Turborepo
- Paquetes `@ghost/domain`, `@ghost/shared`, `@ghost/ui`
- App Next.js 15 con modo claro/oscuro
- Cloud Functions skeleton + reglas Firestore/Storage
- Skill maestra `.cursor/skills/ghost-erp-master/SKILL.md`

[Unreleased]: https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost/releases/tag/v0.1.0
