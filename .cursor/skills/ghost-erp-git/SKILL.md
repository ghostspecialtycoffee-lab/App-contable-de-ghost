# Ghost ERP — Git y Pull Requests

Flujo fijo Cloud Agent. **No usar `gh` para crear PRs** — usar ManagePullRequest.

## Branch

```bash
git fetch origin main
git checkout -b cursor/{descripcion-kebab}-1740
```

- Prefijo obligatorio: `cursor/`
- Sufijo obligatorio: `-1740`
- Solo minúsculas

## Durante desarrollo

```bash
git add -A
git commit -m "feat: descripción clara en español"
```

Commit antes de testear. Push después de build verde.

## Push

```bash
git push -u origin cursor/{branch}-1740
```

Reintentar hasta 4 veces con backoff (4s, 8s, 16s, 32s) si falla red.

## Pull Request

```
action: create_pr
branch_name: cursor/{branch}-1740
base_branch: main
draft: true
title: feat: Descripción concisa
body: resumen + checklist + cómo probar
```

Actualizar PR (`update_pr`) si hay commits adicionales en la misma rama.

## Antes de commit

- [ ] `pnpm build` exitoso
- [ ] `pnpm test` exitoso
- [ ] Sin `.env` ni secretos
- [ ] CHANGELOG.md actualizado

## Mensajes commit

| Prefijo | Uso |
|---------|-----|
| feat | Nueva funcionalidad |
| fix | Corrección bug |
| docs | Solo documentación |
| refactor | Sin cambio comportamiento |
| test | Solo tests |
| chore | Tooling, deps |

## Referencias

- CONTRIBUTING.md
