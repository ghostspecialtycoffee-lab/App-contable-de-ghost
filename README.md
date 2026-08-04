# Ghost ERP

Sistema ERP y POS para cafeterías, restaurantes, panaderías y negocios gastronómicos.

**Ghost Specialty Coffee Lab** — plataforma multi-tenant sobre Google Cloud / Firebase.

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Clean Architecture, paquetes, capas |
| [ROADMAP.md](ROADMAP.md) | Prioridades y módulos planificados |
| [TASKS.md](TASKS.md) | Tareas activas y backlog técnico |
| [DATABASE.md](DATABASE.md) | Esquema Firestore, índices, convenciones |
| [CODING_STANDARDS.md](CODING_STANDARDS.md) | Estándares de código y PR |
| [SECURITY.md](SECURITY.md) | Auth, roles, reglas, auditoría |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Flujo de contribución y branches |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios |
| [FIREBASE_SETUP.md](FIREBASE_SETUP.md) | **Configurar Google/Firebase (NO Code.gs)** |
| [docs/ACCESO.md](docs/ACCESO.md) | **URLs PC + celular + pruebas** |
| [docs/ACTIVAR.md](docs/ACTIVAR.md) | **⭐ Activar app en 2 pasos (sin terminal)** |
| [docs/DEPLOY_PASO_A_PASO.md](docs/DEPLOY_PASO_A_PASO.md) | Deploy a ghost-contable.web.app |

Documentación por módulo: [docs/](docs/) (AUTH, INVENTARIO, ADRs).

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend:** Next.js 15, Tailwind CSS, modo claro/oscuro
- **Backend:** Firebase Auth, Firestore, Storage, Cloud Functions
- **Paquetes:** `@ghost/domain`, `@ghost/infrastructure`, `@ghost/shared`, `@ghost/ui`

## Estructura

```
apps/web/           → UI (POS + administración)
apps/functions/     → Cloud Functions (escrituras servidor)
packages/domain/    → Entidades y reglas de negocio puras
packages/infrastructure/ → Paths y mappers Firestore
packages/shared/    → Tipos compartidos
packages/ui/        → Componentes reutilizables
firebase/           → Reglas e índices
.cursor/skills/     → Skills permanentes del agente
```

## Estado actual

| Módulo | Estado |
|--------|--------|
| Infraestructura / arquitectura | ✅ |
| Autenticación + multi-tenant | ✅ |
| Inventario (base) | ✅ |
| Compras / OCR | 🔜 Siguiente |

## Inicio rápido

```bash
pnpm install
cp .env.example apps/web/.env.local
pnpm dev                    # http://localhost:3000
pnpm build && pnpm test     # verificar antes de PR
```

### Emuladores Firebase

```bash
firebase emulators:start
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true pnpm dev
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Desarrollo |
| `pnpm build` | Build producción |
| `pnpm test` | Tests unitarios |
| `pnpm typecheck` | Verificación de tipos |
| `pnpm lint` | Lint frontend |

## Skills del agente

Skills en `.cursor/skills/` — cargar la skill específica del flujo, no repetir instrucciones manuales:

- `ghost-erp-master` — identidad arquitecto (solo decisiones grandes)
- `ghost-erp-autonomous` — modo CTO autónomo
- `ghost-erp-module` — implementar un módulo nuevo
- `ghost-erp-git` — branch, commit, push, PR
- `ghost-erp-firebase` — rules, functions, emuladores
- `ghost-erp-docs` — mantener documentación
- `ghost-erp-security` — checklist pre-PR

## Licencia

Privado — Ghost Specialty Coffee Lab
