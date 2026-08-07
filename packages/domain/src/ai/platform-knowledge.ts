import type { AgentKnowledgeSource } from "./agent.js";
import { scoreKnowledgeMatch } from "./agent.js";

function normalizeForPlatformMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scorePlatformMatch(question: string, candidate: string): number {
  const normalizedQuestion = normalizeForPlatformMatch(question);
  const normalizedCandidate = normalizeForPlatformMatch(candidate);

  if (!normalizedQuestion || !normalizedCandidate) {
    return 0;
  }

  if (normalizedQuestion === normalizedCandidate) {
    return 1;
  }
  if (
    normalizedCandidate.includes(normalizedQuestion) ||
    normalizedQuestion.includes(normalizedCandidate)
  ) {
    return 0.88;
  }

  const questionTokens = new Set(normalizedQuestion.split(" ").filter(Boolean));
  const candidateTokens = normalizedCandidate.split(" ").filter(Boolean);
  if (candidateTokens.length === 0) {
    return 0;
  }

  const overlap = candidateTokens.filter((token) => questionTokens.has(token)).length;
  return overlap / Math.max(questionTokens.size, candidateTokens.length);
}

export interface PlatformKnowledgeEntry {
  id: string;
  /** Frases o palabras clave que disparan esta entrada (para matching). */
  questions: string[];
  answer: string;
  sources?: AgentKnowledgeSource[];
  tags?: string[];
}

/**
 * Memoria canónica de la plataforma Ghost ERP.
 * Se consulta antes de agentKnowledge por organización y antes de búsqueda web.
 */
export const PLATFORM_KNOWLEDGE_ENTRIES: PlatformKnowledgeEntry[] = [
  {
    id: "platform-overview",
    questions: [
      "que es ghost erp",
      "que es la plataforma",
      "como funciona ghost",
      "vision plataforma",
    ],
    tags: ["arquitectura"],
    answer: [
      "Ghost no es un ERP con chat adjunto: es una **plataforma operativa AI-first** para cafeterías.",
      "",
      "El núcleo es el **dominio** (`packages/domain`): ventas, inventario, compras, costeo, reglas, eventos y analítica.",
      "La IA (Ghost) y las pantallas web consumen **los mismos servicios** — nunca duplicar lógica en React.",
      "",
      "Documento maestro: `docs/PLATFORM_VISION.md`.",
    ].join("\n"),
    sources: [{ title: "PLATFORM_VISION", url: "docs/PLATFORM_VISION.md" }],
  },
  {
    id: "register-sale",
    questions: [
      "como registro una venta",
      "vender mostrador",
      "cobrar mesa",
      "crear venta pos",
    ],
    tags: ["ventas", "pos"],
    answer: [
      "**Mostrador:** `/pos` o `/caja/mostrador` — abre caja primero (`/cash`), agrega productos, elige pago.",
      "**Mesas:** `/pos/tables` — abre sesión de mesa, agrega líneas, cierra cuenta y cobra.",
      "",
      "Al vender, Ghost automáticamente:",
      "· Congela receta (`recipeSnapshots`) y lotes consumidos (`lotConsumptions`)",
      "· Calcula `costSnapshot` según método de costeo",
      "· Publica evento `sale.recorded` → analytics, auditoría y workflows WhatsApp",
      "",
      "Código: `apps/web/src/lib/pos/pos-client.ts` → `createSaleClient`.",
    ].join("\n"),
  },
  {
    id: "cost-methods",
    questions: [
      "metodo de costeo",
      "fifo inventario",
      "costo estandar",
      "promedio ponderado",
      "food cost venta",
    ],
    tags: ["costeo", "inventario"],
    answer: [
      "Métodos en **Ajustes → Parámetros de costeo** (`/settings/costing`):",
      "",
      "| Método | Uso |",
      "|--------|-----|",
      "| **Promedio ponderado** | Default — `averageCost` del ítem |",
      "| **FIFO** | Costo del lote más antiguo (perecederos) |",
      "| **Estándar** | `standardCost` del ítem en inventario |",
      "",
      "Cada venta guarda `costSnapshot` inmutable (food cost %).",
      "Docs: `docs/COST_METHODS.md`.",
    ].join("\n"),
  },
  {
    id: "workflows-whatsapp",
    questions: [
      "automatizacion whatsapp",
      "workflow venta",
      "enviar comprobante whatsapp",
      "alerta venta alta",
    ],
    tags: ["workflows", "whatsapp"],
    answer: [
      "Workflows en **Ajustes → Automatizaciones** (`/settings/automations`):",
      "",
      "1. **Comprobante WhatsApp** — tras cada venta, enlace `wa.me` con resumen",
      "2. **Alerta venta alta** — si total ≥ umbral, mensaje al teléfono operativo",
      "3. **Resumen compra** — opcional al confirmar factura",
      "",
      "Bandeja en dashboard → panel **Automatizaciones WhatsApp** → botón Abrir WhatsApp.",
      "v1 usa enlaces `wa.me` (sin API Business). Colección: `workflowOutbox`.",
      "Docs: `docs/WORKFLOWS.md`.",
    ].join("\n"),
  },
  {
    id: "event-bus",
    questions: [
      "event bus",
      "eventos dominio",
      "sale.recorded",
      "domain event outbox",
    ],
    tags: ["eventos"],
    answer: [
      "Eventos v1: `sale.recorded`, `purchase.confirmed`, `inventory.movement.registered`.",
      "",
      "Flujo: operación → `publishDomainEventSafe()` → `domainEventOutbox` →",
      "Functions (Blaze) procesan auditoría + `analyticsDaily` + workflows.",
      "",
      "En plan **Spark** el cliente escribe analytics y workflows directamente.",
      "Side effects en dominio: `resolveDomainEventSideEffects`.",
      "Docs: `docs/EVENTS.md`.",
    ].join("\n"),
  },
  {
    id: "briefing-rules",
    questions: [
      "briefing del dia",
      "briefing proactivo",
      "reglas operativas",
      "rules engine",
      "stock bajo alerta",
    ],
    tags: ["ia", "reglas"],
    answer: [
      "**Briefing proactivo:** panel en `/dashboard` (`ProactiveBriefingPanel`) — ventas vs ayer, stock bajo, quiebre, caja, food cost.",
      "",
      "**Rules engine:** 12 reglas en `packages/domain/src/rules/` — evalúan contexto operativo.",
      "El briefing usa `evaluateOperationalRules`.",
      "",
      "Docs: `docs/PROACTIVE_BRIEFING.md`, `docs/RULES_ENGINE.md`.",
    ].join("\n"),
  },
  {
    id: "lot-traceability",
    questions: [
      "trazabilidad lote",
      "fifo lotes",
      "lote a venta",
      "de donde salio el insumo",
    ],
    tags: ["inventario"],
    answer: [
      "Trazabilidad **lote → venta** con FIFO:",
      "· Lotes en compras (`inventoryLots`)",
      "· Consumo FIFO al vender (`lotConsumptions` en la venta)",
      "· Panel en comprobante (`SaleLotTracePanel`)",
      "",
      "Docs: `docs/LOT_TRACEABILITY.md`.",
    ].join("\n"),
  },
  {
    id: "analytics-dwh",
    questions: [
      "analytics daily",
      "dwh",
      "panel analitica",
      "metricas dashboard",
    ],
    tags: ["analitica"],
    answer: [
      "Agregados diarios en `analyticsDaily/{YYYY-MM-DD}` — ventas, compras, movimientos.",
      "Panel **Analytics** en dashboard (`AnalyticsInsightsPanel`).",
      "Rollup en dominio: `packages/domain/src/analytics/rollup.ts`.",
      "Docs: `docs/DWH_FOUNDATION.md`.",
    ].join("\n"),
  },
  {
    id: "purchases-intelligence",
    questions: [
      "compras inteligentes",
      "sugerencias compra",
      "proveedores",
      "historial precios",
    ],
    tags: ["compras"],
    answer: [
      "**Compras:** `/purchases` — facturas, proveedores (`/purchases/suppliers`), historial de precios.",
      "Motor: `purchase-intelligence.ts` — alertas bajo mínimo y pronóstico de quiebre.",
      "Al confirmar compra: lotes, movimiento bodega, evento `purchase.confirmed`.",
    ].join("\n"),
  },
  {
    id: "web-search-agent",
    questions: [
      "busqueda web",
      "buscar en internet",
      "tavily",
      "informacion externa",
    ],
    tags: ["agente", "web"],
    answer: [
      "Ghost puede buscar en la web cuando no hay respuesta en memoria interna:",
      "",
      "1. Memoria plataforma (este catálogo)",
      "2. `agentKnowledge` de la organización",
      "3. **Búsqueda web** (Tavily si `TAVILY_API_KEY`, si no DuckDuckGo)",
      "",
      "Chat libre: `/chat` → callable `ghostAgent` con `allowWebSearch: true`.",
      "Siempre citar fuentes y marcar incertidumbre.",
      "Docs: `docs/GHOST_NOTIFICATIONS_AGENT.md`.",
    ].join("\n"),
  },
  {
    id: "spark-blaze",
    questions: [
      "plan spark",
      "plan blaze",
      "firebase functions limitado",
      "produccion ghost",
    ],
    tags: ["infra"],
    answer: [
      "**Producción:** https://ghost-contable.web.app",
      "",
      "Plan **Spark**: Functions limitadas — onboarding y escrituras vía cliente Firestore;",
      "analytics y workflows se escriben desde el cliente.",
      "",
      "Plan **Blaze**: triggers procesan `domainEventOutbox` en servidor.",
      "Inventario pesado sigue vía Functions cuando estén desplegadas.",
    ].join("\n"),
  },
  {
    id: "ghost-chat-brain",
    questions: [
      "como hablo con ghost",
      "comandos ghost",
      "ghost chat operativo",
      "que puede hacer ghost",
    ],
    tags: ["ia", "chat"],
    answer: [
      "Ghost operativo (menú conversacional): botón flotante en la app.",
      "Usa `ghost-brain.ts` + `ghost-chat-actions.ts` — mismas funciones que la UI.",
      "",
      "Ejemplos naturales:",
      "· «Registra compra de leche 10 litros»",
      "· «Abre caja con 100 mil»",
      "· «¿Cómo va el día?» → briefing",
      "",
      "Chat libre con web: `/chat`.",
    ].join("\n"),
  },
];

export interface PlatformKnowledgeMatch {
  entry: PlatformKnowledgeEntry;
  score: number;
}

export function findBestPlatformKnowledge(
  question: string,
  minScore = 0.55,
): PlatformKnowledgeMatch | null {
  let best: PlatformKnowledgeMatch | null = null;

  for (const entry of PLATFORM_KNOWLEDGE_ENTRIES) {
    for (const candidate of entry.questions) {
      const score = scorePlatformMatch(question, candidate);
      if (!best || score > best.score) {
        best = { entry, score };
      }
    }
    const tagScore = Math.max(
      ...(entry.tags ?? []).map((tag) => scorePlatformMatch(question, tag)),
      0,
    );
    if (tagScore > 0 && (!best || tagScore > best.score)) {
      best = { entry, score: tagScore };
    }
  }

  if (!best || best.score < minScore) {
    return null;
  }

  return best;
}

export function listPlatformKnowledgeByTag(tag: string): PlatformKnowledgeEntry[] {
  return PLATFORM_KNOWLEDGE_ENTRIES.filter((entry) => entry.tags?.includes(tag));
}
