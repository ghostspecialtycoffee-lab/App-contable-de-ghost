# Estándares de código — Ghost ERP

## TypeScript

- `strict: true` en todos los paquetes
- Preferir `interface` para entidades, `type` para unions
- Usar `Result<T>` de `@ghost/shared` para validaciones dominio
- Imports ESM con extensión `.js` en paquetes compilados
- No usar `any` — usar `unknown` + narrowing

## Estructura de archivos

```
packages/domain/src/{modulo}/
  item.ts              # entidades
  services/validate.ts # lógica pura
  services/*.test.ts   # tests (excluidos del build)
  index.ts             # re-exports

apps/functions/src/{modulo}/
  createX.ts           # un callable por archivo
  shared/              # db, audit, permissions

apps/web/src/
  app/(protected)/{modulo}/page.tsx
  hooks/use-{modulo}.ts
  lib/firebase/functions.ts  # agregar callables aquí
```

## Naming

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Paquetes npm | `@ghost/{name}` | `@ghost/domain` |
| Branches | `cursor/{desc}-1740` | `cursor/inventory-base-1740` |
| Functions | camelCase verb | `createInventoryItem` |
| Firestore fields | camelCase | `averageCost` |
| React components | PascalCase | `AuthGuard` |
| Hooks | `use` prefix | `useInventoryItems` |

## Functions (Cloud)

Checklist obligatorio por callable:

1. Verificar `request.auth?.uid`
2. `getActiveOrganizationId()` o validar org explícita
3. `assertOrgPermission()` con módulo/acción correctos
4. Validar input (dominio primero)
5. Transacción/batch si > 1 write
6. `writeAuditLog()` en mutaciones
7. Errores con `HttpsError` y mensajes en español

## Frontend

- Páginas protegidas bajo `app/(protected)/`
- `"use client"` solo donde hay estado/eventos
- Errores Firebase → `getAuthErrorMessage` / `getCallableErrorMessage`
- CSS variables `--ghost-*` — no colores hardcoded
- Componentes UI desde `@ghost/ui` antes de crear nuevos

## Tests

- Vitest en `packages/domain`
- Excluir `*.test.ts` del `tsconfig` build
- Tests de validación y cálculos — no tests triviales
- Ejecutar `pnpm test` antes de PR

## Commits

Formato: `tipo: descripción imperativa en español`

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## PR

- Draft por defecto
- Body: resumen, checklist módulo, cómo probar
- `pnpm build && pnpm test` verdes
- Actualizar CHANGELOG.md y TASKS.md

## Anti-patrones (prohibido)

- Lógica de negocio en componentes React
- Writes Firestore desde cliente
- Duplicar paths Firestore fuera de infrastructure
- Funciones > 80 líneas sin extraer
- Dependencias circulares entre paquetes
- Crear componentes UI duplicados

## Referencias

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- Skill: `.cursor/skills/ghost-erp-module/SKILL.md`
