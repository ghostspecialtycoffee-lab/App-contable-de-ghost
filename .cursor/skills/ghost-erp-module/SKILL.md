# Ghost ERP — Implementar Módulo

Checklist **obligatorio**. No saltar pasos. No mezclar módulos en un PR.

## Antes de codear

1. Leer ARCHITECTURE.md + DATABASE.md (sección del módulo)
2. Verificar ROADMAP.md — ¿es el módulo correcto en orden?
3. Marcar tarea `in_progress` mentalmente en TASKS.md

## Pasos (orden fijo)

### 1. Dominio — `packages/domain/src/{modulo}/`

- [ ] Entidades + tipos input
- [ ] Servicios puros (validación, cálculos)
- [ ] Export en index.ts
- [ ] Tests `*.test.ts` (excluidos build tsconfig)

### 2. Infrastructure — `packages/infrastructure/src/`

- [ ] Agregar paths en `paths.ts`
- [ ] Mappers si lectura cliente necesita transformación

### 3. Functions — `apps/functions/src/{modulo}/`

Por operación de escritura:

- [ ] `onCall` con auth + `assertOrgPermission`
- [ ] Validación dominio
- [ ] Transacción si múltiples writes
- [ ] `writeAuditLog`
- [ ] Export en `apps/functions/src/index.ts`

### 4. Firestore

- [ ] Rules: read member, write false
- [ ] Índices en `firebase/firestore.indexes.json`

### 5. Web — `apps/web/src/`

- [ ] Rutas `(protected)/{modulo}/`
- [ ] Hook realtime si listado
- [ ] Callable en `lib/firebase/functions.ts`
- [ ] Nav en `app-shell.tsx` si módulo top-level

### 6. Documentación

- [ ] `docs/{MODULO}.md` (detalle operativo)
- [ ] DATABASE.md — nuevas colecciones
- [ ] TASKS.md — marcar completado
- [ ] CHANGELOG.md — entrada Added
- [ ] README.md — tabla estado si milestone

### 7. Verificación

```bash
pnpm build && pnpm test
```

## Anti-patterns

- ❌ Write Firestore desde React
- ❌ Lógica negocio en page.tsx
- ❌ Paths hardcoded fuera infrastructure
- ❌ Function sin audit log
- ❌ PR sin tests de validación

## Referencias

- CODING_STANDARDS.md
- ghost-erp-firebase, ghost-erp-security, ghost-erp-git
