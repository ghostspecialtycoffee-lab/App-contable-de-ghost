# Briefing proactivo (Ghost)

El briefing del día resume novedades operativas sin que el usuario tenga que preguntar: ventas vs ayer, stock bajo, riesgo de quiebre, caja cerrada, food cost alto, comandas pendientes y más.

## Dónde aparece

1. **Dashboard (`/dashboard`)** — panel «Briefing del día» con alertas priorizadas.
2. **Chat Ghost** — al abrir una conversación nueva, si hay novedades Ghost las muestra después del saludo.
3. **Consulta explícita** — frases como «resumen del día», «novedades» o «briefing».

## Señales que analiza

| Categoría | Ejemplo |
|-----------|---------|
| Ventas | Caída >8% vs ayer, o buen ritmo +15% |
| Inventario | Bajo mínimo, stock negativo, quiebre en ~3 días (consumo 14 días) |
| Caja | Sesión cerrada al inicio del turno |
| Costos | Productos con food cost >8% sobre meta |
| Compras | Facturas confirmadas hoy |
| Operaciones | Comandas pendientes, mesas abiertas |
| Costeo | Productos activos sin receta |

## Arquitectura

```
Firestore snapshots → useDailyBriefing / useGhostChat
                   → buildDailyOperationsBriefing (domain)
                   → ProactiveBriefingPanel | Ghost greeting
```

- **Dominio:** `packages/domain/src/assistant/daily-briefing.ts`
- **Skill Ghost:** `query-daily-briefing` en `ghost-brain.ts`
- **UI:** `apps/web/src/components/proactive-briefing-panel.tsx`

El motor es determinístico (sin llamada a LLM) para respuesta instantánea y costo cero en plan Spark.

## Extensión futura

Cuando existan `purchase-intelligence` y el event bus (PRs #85–#87), el briefing puede suscribirse a eventos `inventory.movement.registered` y sugerencias de compra automáticas.
