# Ghost ERP — Mantener Documentación

Actualizar docs **en el mismo PR** que el código. No PRs solo-docs salvo correcciones.

## Mapa archivo → trigger

| Archivo | Actualizar cuando... |
|---------|---------------------|
| README.md | Milestone módulo, cambio stack, nuevos scripts |
| ARCHITECTURE.md | Nuevo paquete, capa, patrón transversal |
| ROADMAP.md | Módulo completado o repriorizado |
| TASKS.md | Cada tarea iniciada/completada |
| DATABASE.md | Nueva colección, índice, campo |
| CODING_STANDARDS.md | Nueva convención obligatoria |
| SECURITY.md | Cambio auth, rules, permisos |
| CONTRIBUTING.md | Cambio workflow git/PR |
| CHANGELOG.md | **Siempre** en cada PR con cambios |
| docs/{MOD}.md | Detalle operativo del módulo |
| docs/DECISIONS.md | Nueva ADR |

## Formato CHANGELOG

Sección `[Unreleased]` → mover a versión con fecha al release.

Categorías: Added, Changed, Fixed, Removed, Security

## Formato TASKS

```markdown
- [ ] Pendiente
- [x] Completado
```

## No duplicar

- Skills = checklists cortos
- Docs raíz = referencia canónica
- docs/ = detalle módulo + ADRs
- Si info existe en DATABASE.md, linkear — no copiar esquema completo

## Checklist PR docs

- [ ] CHANGELOG.md
- [ ] TASKS.md (marcar done)
- [ ] DATABASE.md si schema cambió
- [ ] docs/{mod}.md si módulo nuevo
- [ ] README tabla estado

## Referencias

- CONTRIBUTING.md
