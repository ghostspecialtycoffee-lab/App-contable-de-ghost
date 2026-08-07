# Ghost — Memoria activa del experto en plataforma

Este documento define cómo Ghost (chat, agente y Cursor) debe responder sobre la plataforma.

## Capas de memoria

| Prioridad | Fuente | Alcance |
|-----------|--------|---------|
| 1 | `packages/domain/src/ai/platform-knowledge.ts` | Catálogo canónico (código, versionado) |
| 2 | `organizations/{id}/agentKnowledge` | Aprendizaje por org (chat libre) |
| 3 | Búsqueda web (`TAVILY_API_KEY` o DuckDuckGo) | Temas externos |
| 4 | Fallback `ghost-brain` | Operación día a día |

## Subsistemas entregados (v1)

- **Ventas:** POS, mesas, `recipeSnapshots`, `lotConsumptions`, `costSnapshot`
- **Costeo:** promedio / FIFO / estándar (`docs/COST_METHODS.md`)
- **Workflows:** WhatsApp `wa.me` (`docs/WORKFLOWS.md`)
- **Eventos:** `domainEventOutbox` (`docs/EVENTS.md`)
- **IA:** briefing proactivo + rules engine (12 reglas)
- **Inventario:** lotes FIFO, trazabilidad compra→venta
- **Analytics:** `analyticsDaily` + panel dashboard
- **Compras:** proveedores, historial precios, sugerencias

## Rutas clave

| Acción | Ruta |
|--------|------|
| Inicio / briefing | `/dashboard` |
| Ventas | `/ventas`, `/pos` |
| Caja | `/cash` |
| Compras | `/purchases` |
| Costeo fichas | `/costing` |
| Método costeo | `/settings/costing` |
| Automatizaciones | `/settings/automations` |
| Chat web + búsqueda | `/chat` |

## Reglas para el agente

1. **Nunca inventar** rutas o colecciones — verificar en `DATABASE.md` o `paths.ts`
2. **Mismo dominio** para UI y Ghost — `packages/domain` es la verdad
3. **Citar docs** cuando expliques arquitectura (`docs/*.md`)
4. **Web solo externo** — normativa, mercado, SCA fuera del catálogo
5. **Spark vs Blaze** — en Spark el cliente escribe analytics/workflows; Functions en Blaze

## Ejecutar ejemplos (desarrollo)

```bash
# Memoria plataforma
pnpm --filter @ghost/domain test platform-knowledge

# Workflows WhatsApp
pnpm --filter @ghost/domain test workflows/evaluate

# Costeo en venta
pnpm --filter @ghost/domain test sale-cost-snapshot

# Briefing + reglas
pnpm --filter @ghost/domain test daily-briefing evaluate

# Suite completa
pnpm test
```

## Seed opcional en Firestore

`data/initial-load/agent-knowledge-platform.json` — copiar entradas a `agentKnowledge` por org si se desea memoria duplicada en cloud.

## Skill Cursor

`.cursor/skills/ghost-platform-expert/SKILL.md` — cargar cuando el usuario pregunte cómo opera la plataforma.
