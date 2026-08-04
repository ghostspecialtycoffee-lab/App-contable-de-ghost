# Ghost ERP

Sistema ERP y POS para cafeterías, restaurantes, panaderías y negocios gastronómicos.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend:** Next.js 15 (App Router), Tailwind CSS, modo claro/oscuro
- **Backend:** Firebase Auth, Firestore, Storage, Cloud Functions
- **Arquitectura:** Clean Architecture con paquetes `@ghost/domain`, `@ghost/infrastructure`, `@ghost/shared`, `@ghost/ui`

## Estructura

```
apps/
  web/              # Aplicación web (POS + administración)
  functions/        # Cloud Functions (auth, onboarding, auditoría)
packages/
  domain/           # Entidades y reglas de negocio
  infrastructure/   # Adaptadores Firestore (paths, mappers)
  shared/           # Tipos y utilidades compartidas
  ui/               # Componentes UI reutilizables
firebase/           # Reglas e índices Firestore/Storage
docs/               # Documentación técnica
.cursor/skills/     # Skill maestra del Arquitecto Principal
```

## Estado actual

| Módulo | Estado |
|--------|--------|
| Infraestructura / arquitectura | ✅ Base monorepo |
| Autenticación | ✅ Login, registro, sesión, guards |
| Base de datos / multi-tenant | ✅ Onboarding organización + sucursal |
| Inventario | 🔜 Siguiente |

## Requisitos

- Node.js 20+
- pnpm 10+
- Cuenta Firebase (opcional con emuladores locales)

## Inicio rápido

```bash
pnpm install
cp .env.example apps/web/.env.local
pnpm dev
```

La app web corre en http://localhost:3000

### Emuladores Firebase (recomendado en desarrollo)

```bash
firebase emulators:start
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true pnpm dev
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Desarrollo en todos los paquetes |
| `pnpm build` | Build de producción |
| `pnpm test` | Tests unitarios |
| `pnpm typecheck` | Verificación de tipos |
| `pnpm lint` | Lint del frontend |

## Documentación

- [Autenticación y multi-tenant](docs/AUTH.md)
- [Decisiones técnicas (ADR)](docs/DECISIONS.md)

## Roadmap

Inventario → Compras → Producción → Costeo → POS → Comandas → Caja → Facturación → Contabilidad → Reportes → CRM → RRHH → IA → Integraciones.

## Licencia

Privado — Ghost Specialty Coffee Lab
