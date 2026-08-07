# Ghost — Experto en plataforma + búsqueda web

## Cuándo usar

- El usuario pregunta **cómo funciona** Ghost ERP (no solo código)
- Modo chat `/chat` o Ghost flotante necesita contexto de producto
- Onboarding de operadores o nuevos desarrolladores en el agente

## Orden de respuesta (memoria activa)

```
1. PLATFORM_KNOWLEDGE_ENTRIES  →  packages/domain/src/ai/platform-knowledge.ts
2. agentKnowledge (Firestore por org)  →  organizations/{id}/agentKnowledge
3. Búsqueda web (externo)  →  Tavily / DuckDuckGo vía ghostAgent
4. Fallback operativo  →  ghost-brain / buildBrainHelpMessage
```

## Cómo consultar memoria en código

```typescript
import { findBestPlatformKnowledge } from "@ghost/domain";

const match = findBestPlatformKnowledge("¿cómo registro una venta?");
// match.entry.answer → guía con rutas y docs
```

## Preguntas que DEBE saber responder sin web

| Tema | Ruta / doc |
|------|------------|
| Registrar venta | `/pos`, `/cash`, `createSaleClient` |
| Costeo multi-motor | `/settings/costing`, `docs/COST_METHODS.md` |
| Workflows WhatsApp | `/settings/automations`, `docs/WORKFLOWS.md` |
| Event bus | `docs/EVENTS.md` |
| Briefing + reglas | `docs/PROACTIVE_BRIEFING.md`, `docs/RULES_ENGINE.md` |
| Trazabilidad lotes | `docs/LOT_TRACEABILITY.md` |
| Analytics DWH | `docs/DWH_FOUNDATION.md` |
| Visión plataforma | `docs/PLATFORM_VISION.md` |

## Búsqueda web — cuándo SÍ

- Normativa fiscal Colombia actualizada
- Estándares SCA / café de especialidad (si no está en catálogo)
- Precios de mercado, competencia, tendencias
- Cualquier tema **fuera** del dominio Ghost

## Búsqueda web — cuándo NO

- Flujos internos (ventas, inventario, compras)
- Configuración de la app
- Interpretar datos ya en Firestore del tenant

## Variables de entorno (Functions)

| Variable | Uso |
|----------|-----|
| `TAVILY_API_KEY` | Búsqueda web ampliada (recomendado producción) |
| Sin Tavily | DuckDuckGo Instant Answer (limitado) |

## Ghost chat operativo vs chat libre

| Canal | Archivo | Web |
|-------|---------|-----|
| Botón flotante | `ghost-conversation.ts` + `query-platform-guide` | No |
| `/chat` | `ghostAgent` callable | Sí (opcional) |

## Mantenimiento

Al entregar feature nueva en plataforma:

1. Añadir entrada en `platform-knowledge.ts` (questions + answer + tags)
2. Test en `platform-knowledge.test.ts`
3. Una línea en `docs/PLATFORM_VISION.md` roadmap si aplica

## Ejemplos de prueba

```bash
pnpm --filter @ghost/domain test platform-knowledge
pnpm --filter @ghost/domain test workflows/evaluate
pnpm --filter @ghost/domain test sale-cost-snapshot
```

## Referencias

- [docs/GHOST_PLATFORM_EXPERT.md](../../docs/GHOST_PLATFORM_EXPERT.md)
- [docs/GHOST_NOTIFICATIONS_AGENT.md](../../docs/GHOST_NOTIFICATIONS_AGENT.md)
- ghost-erp-autonomous, ghost-erp-module
