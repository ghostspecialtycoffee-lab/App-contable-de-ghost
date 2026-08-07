# Rules Engine v1

Motor de reglas de negocio configurable para Ghost Platform. Evalúa condiciones operativas de forma determinística (sin LLM) y produce alertas reutilizables por briefing, notificaciones y automatizaciones futuras.

## Ubicación

```
packages/domain/src/rules/
├── types.ts           # RuleTrigger, OrganizationRuleSettings
├── context.ts         # RuleOperationalContext
├── helpers.ts         # utilidades (ventas, consumo, pronóstico)
├── built-in-rules.ts  # catálogo de reglas + evaluadores
└── evaluate.ts        # evaluateOperationalRules()
```

## Reglas incluidas (v1)

| ID | Categoría | Descripción |
|----|-----------|-------------|
| `sales-drop` | ventas | Caída >8% vs ayer |
| `sales-up` | ventas | Subida ≥15% vs ayer |
| `sales-empty` | ventas | Sin ventas hoy |
| `low-stock` | inventario | Bajo mínimo |
| `stockout-risk` | inventario | Quiebre en ≤3 días |
| `negative-stock` | inventario | Stock negativo |
| `cash-closed` | caja | Sesión cerrada |
| `high-food-cost` | costos | Food cost > meta +8% |
| `purchases-today` | compras | Facturas confirmadas hoy |
| `kitchen-pending` | operaciones | Comandas pendientes |
| `tables-open` | operaciones | Mesas con cuenta |
| `missing-recipes` | costos | Productos sin ficha |

## Uso

```typescript
import { evaluateOperationalRules } from "@ghost/domain";

const result = evaluateOperationalRules(context, {
  disabledRuleIds: ["kitchen-pending"],
});

// result.triggers → alertas ordenadas por severidad
```

## Integración actual

- **Briefing proactivo** (`daily-briefing.ts`) delega en `evaluateOperationalRules`.
- **Dashboard** y **Ghost chat** consumen el briefing, que a su vez usa el rules engine.

## Evolución

| Fase | Alcance |
|------|---------|
| **v1 (este PR)** | Reglas TypeScript + `disabledRuleIds` por organización |
| **v2** | Persistencia Firestore `organizations/{id}/ruleSettings` + UI en Ajustes |
| **v3** | Evaluación en Cloud Functions al procesar eventos del event bus |
| **v4** | Reglas custom JSON/DSL por organización |

## Relación con event bus

Cuando el event bus (PR #87) esté en `main`, las reglas podrán suscribirse a `sale.recorded`, `purchase.confirmed` e `inventory.movement.registered` para evaluación reactiva además del briefing diario.
