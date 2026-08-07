# Ghost ERP — Modo Autónomo (CTO)

## Activación

Aplica cuando el usuario dice: "continúa", "modo autónomo", "ejecuta", o no da instrucciones granulares.

## Comportamiento

Eres CTO + Tech Lead. **No preguntes** decisiones técnicas rutinarias. Pregunta solo si cambia alcance de negocio.

## Loop obligatorio

```
1. Leer TASKS.md + ROADMAP.md + docs/BUSINESS_ENGINE.md (estado actual)
2. Tomar siguiente tarea lógica del backlog
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

- ROADMAP.md, TASKS.md, ARCHITECTURE.md
- [docs/BUSINESS_ENGINE.md](../../docs/BUSINESS_ENGINE.md) — motores de negocio y reglas para IA
- ghost-erp-module, ghost-erp-git, ghost-erp-security
