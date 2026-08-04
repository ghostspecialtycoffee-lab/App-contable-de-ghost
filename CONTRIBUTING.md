# Contribución — Ghost ERP

Repositorio privado — Ghost Specialty Coffee Lab. Flujo orientado a agentes Cloud y desarrolladores.

## Setup

```bash
git clone https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost.git
cd App-contable-de-ghost
pnpm install
cp .env.example apps/web/.env.local
pnpm build && pnpm test
```

## Branches

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Feature | `cursor/{descripcion}-1740` | `cursor/purchases-ocr-1740` |
| Base | `main` | producción |

**Siempre** crear branch desde `main` actualizado (o branch de módulo previo si hay dependencia).

```bash
git fetch origin main
git checkout -b cursor/mi-modulo-1740 origin/main
```

## Workflow

1. Leer [ROADMAP.md](ROADMAP.md) y [TASKS.md](TASKS.md)
2. Cargar skill `.cursor/skills/ghost-erp-module/SKILL.md`
3. Implementar módulo completo (dominio → functions → UI → docs)
4. `pnpm build && pnpm test`
5. Actualizar CHANGELOG.md, TASKS.md, README si aplica
6. Commit descriptivo
7. `git push -u origin cursor/{branch}-1740`
8. Crear PR draft → `main`

## Commits

- Español, imperativo, prefijo convencional
- Un commit lógico por unidad de trabajo
- No commitear `.env`, `node_modules`, `.next`

## Pull Requests

- Título: `feat: Descripción clara`
- Draft: sí (default agente)
- Incluir: resumen, cómo probar, checklist módulo
- CI local verde antes de push

## Documentación

Al cambiar arquitectura o esquema, actualizar:

| Cambio | Archivos |
|--------|----------|
| Nuevo módulo | ROADMAP, TASKS, CHANGELOG, docs/{mod}.md, DATABASE |
| Nueva ADR | docs/DECISIONS.md |
| Auth/security | SECURITY.md |
| API Functions | DATABASE.md + docs módulo |

Skill docs: `.cursor/skills/ghost-erp-docs/SKILL.md`

## Code Review

Verificar:

- [CODING_STANDARDS.md](CODING_STANDARDS.md)
- [SECURITY.md](SECURITY.md)
- Tests dominio para lógica nueva
- Sin dependencias circulares

## Contacto

Propietario: Ghost Specialty Coffee Lab — ghostspecialtycoffee@gmail.com
