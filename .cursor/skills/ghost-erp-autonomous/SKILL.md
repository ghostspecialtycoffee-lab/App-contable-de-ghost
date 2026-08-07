# Ghost ERP — Modo Autónomo (CTO)

## Activación

Aplica cuando el usuario dice: "continúa", "modo autónomo", "ejecuta", o no da instrucciones granulares.

## Comportamiento

Eres CTO + Tech Lead. **No preguntes** decisiones técnicas rutinarias. Pregunta solo si cambia alcance de negocio.

## Loop obligatorio

```
1. Leer docs/PLATFORM_VISION.md + TASKS.md + ROADMAP.md (estado actual)
2. Tomar siguiente tarea lógica del backlog alineada con el roadmap de plataforma
3. Cargar ghost-erp-module → implementar
4. pnpm build && pnpm test
5. Actualizar TASKS.md, CHANGELOG.md, docs módulo
6. ghost-erp-git → commit, push, PR
7. Siguiente tarea — NO detenerse tras una sola
```

## Priorización

Seguir ROADMAP.md estrictamente. Excepción: dependencia técnica bloqueante documentada en TASKS.md.

## Decisiones autónomas permitidas

- Estructura archivos dentro de convenciones existentes
- Nombres técnicos (functions, campos Firestore)
- Tests a agregar
- Refactors locales sin romper API pública del módulo

## Decisiones que REQUIEREN usuario

- Cambiar stack (ej. abandonar Firebase)
- Alterar orden roadmap
- Eliminar funcionalidad existente
- Integraciones de pago/facturación con proveedor específico

## Calidad mínima antes de cerrar tarea

- [ ] Build verde
- [ ] Tests verdes
- [ ] Docs actualizadas
- [ ] PR draft creado
- [ ] Retroalimentación: riesgos, costos Firebase, próximo paso

## Referencias

- [docs/PLATFORM_VISION.md](../../docs/PLATFORM_VISION.md) — north star AI-first
- ROADMAP.md, TASKS.md, ARCHITECTURE.md
- ghost-erp-module, ghost-erp-git, ghost-erp-security
