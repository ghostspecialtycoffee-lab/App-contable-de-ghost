# Ghost ERP

Sistema ERP y POS para cafeterías, restaurantes, panaderías y negocios gastronómicos.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend:** Next.js 15 (App Router), Tailwind CSS, modo claro/oscuro
- **Backend:** Firebase Auth, Firestore, Storage, Cloud Functions
- **Arquitectura:** Clean Architecture con paquetes `@ghost/domain`, `@ghost/shared`, `@ghost/ui`

## Estructura

```
apps/
  web/          # Aplicación web (POS + administración)
  functions/    # Cloud Functions (auth, auditoría)
packages/
  domain/       # Entidades y reglas de negocio
  shared/       # Tipos y utilidades compartidas
  ui/           # Componentes UI reutilizables
firebase/       # Reglas e índices Firestore/Storage
.cursor/skills/ # Skill maestra del Arquitecto Principal
```

## Requisitos

- Node.js 20+
- pnpm 10+
- Cuenta Firebase (opcional para desarrollo local con emuladores)

## Inicio rápido

```bash
pnpm install
pnpm dev
```

La app web corre en http://localhost:3000

## Variables de entorno

Copia `.env.example` a `apps/web/.env.local` y completa las credenciales Firebase:

```bash
cp .env.example apps/web/.env.local
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Desarrollo en todos los paquetes |
| `pnpm build` | Build de producción |
| `pnpm typecheck` | Verificación de tipos |
| `pnpm lint` | Lint del frontend |

## Módulos planificados

Core, Inventario, Costeo, POS, KDS, Caja, Facturación, OCR, RRHH, Chat, Reportes, Analítica, IA y Notificaciones.

## Licencia

Privado — Ghost Specialty Coffee Lab
