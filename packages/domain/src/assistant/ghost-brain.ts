export interface GhostBrainContext {
  cashSessionOpen?: boolean;
  openTableSessions?: Array<{ tableNumber: number }>;
  kitchenOrders?: Array<unknown>;
  invoiceCount?: number;
}
export type GhostBrainDomain =
  | "operaciones"
  | "ventas"
  | "compras"
  | "finanzas"
  | "logistica"
  | "administracion";

export type GhostBrainSkillKind = "query" | "execute" | "guide";

export interface GhostBrainSkill {
  id: string;
  domain: GhostBrainDomain;
  kind: GhostBrainSkillKind;
  title: string;
  description: string;
  keywords: RegExp;
  examples: string[];
}

export const GHOST_BRAIN_SKILLS: GhostBrainSkill[] = [
  {
    id: "brain-help",
    domain: "administracion",
    kind: "guide",
    title: "Guía del cerebro Ghost",
    description: "Muestra palabras clave y ejemplos por área.",
    keywords: /(ayuda|que puedes|que sabes|como funciona|ejemplos|palabras clave|comandos|capacidades|cerebro|menu)/,
    examples: ["ayuda", "qué puedes hacer", "palabras clave"],
  },
  {
    id: "org-status",
    domain: "operaciones",
    kind: "query",
    title: "Estado operativo",
    description: "Resumen de caja, mesas, comandas e inventario.",
    keywords: /(como vamos|como va|que tal la operacion|estado general|resumen operativo|status)/,
    examples: ["¿cómo vamos?", "estado de la operación"],
  },
  {
    id: "query-sales-report",
    domain: "ventas",
    kind: "query",
    title: "Informe de ventas",
    description: "Ventas del día, ticket promedio y medios de pago.",
    keywords:
      /(ventas del dia|ventas de hoy|informe de ventas|resumen de ventas|cuanto vendimos|ticket promedio|ventas del turno)/,
    examples: ["ventas de hoy", "¿cuánto vendimos?", "informe de ventas"],
  },
  {
    id: "query-purchases-review",
    domain: "compras",
    kind: "query",
    title: "Revisión de compras",
    description: "Últimas facturas de proveedor y totales.",
    keywords:
      /(revisar compras|facturas de compra|compras del proveedor|ultimas compras|pedidos proveedor|compras de hoy)/,
    examples: ["revisar compras", "últimas facturas de compra"],
  },
  {
    id: "query-cash-summary",
    domain: "finanzas",
    kind: "query",
    title: "Resumen de caja",
    description: "Fondo, ventas en efectivo, entradas y salidas.",
    keywords:
      /(estado de caja|resumen de caja|movimientos de caja|salidas de dinero|cuanto hay en caja|arqueo de caja)/,
    examples: ["estado de caja", "salidas de dinero hoy"],
  },
  {
    id: "open-cash-session",
    domain: "finanzas",
    kind: "execute",
    title: "Abrir caja",
    description: "Apertura con fondo inicial.",
    keywords: /(abrir caja|abre caja|fondo inicial)/,
    examples: ["abre caja con 200000"],
  },
  {
    id: "close-cash-session",
    domain: "finanzas",
    kind: "execute",
    title: "Cerrar caja",
    description: "Cierre con arqueo de efectivo contado.",
    keywords: /(cierra caja|cerrar caja|cierre de caja)/,
    examples: ["cierra caja con 850000"],
  },
  {
    id: "register-cash-outflow",
    domain: "finanzas",
    kind: "execute",
    title: "Salida de dinero",
    description: "Registra egreso o gasto de caja.",
    keywords: /(salida de dinero|egreso de caja|gasto de caja|retiro de caja|pago en efectivo)/,
    examples: ["salida de dinero 50000 por domicilios"],
  },
  {
    id: "create-counter-sale",
    domain: "ventas",
    kind: "execute",
    title: "Venta mostrador / factura",
    description: "Cobra al cliente y emite comprobante.",
    keywords: /(factura|cuenta de cobro|mostrador|vende|cobra)/,
    examples: ["factura 2 dirty chai en efectivo"],
  },
  {
    id: "add-table-order",
    domain: "operaciones",
    kind: "execute",
    title: "Pedido en mesa",
    description: "Anota productos y manda comanda.",
    keywords: /(mesa \d+|para la mesa)/,
    examples: ["para la mesa 1 dame 2 dirty chai"],
  },
  {
    id: "checkout-table",
    domain: "ventas",
    kind: "execute",
    title: "Cobrar mesa",
    description: "Cierra cuenta y emite comprobante.",
    keywords: /(cuenta de la mesa|cobrar mesa|cerrar cuenta)/,
    examples: ["dame la cuenta de la mesa 1"],
  },
  {
    id: "create-purchase-invoice",
    domain: "compras",
    kind: "execute",
    title: "Compra a proveedor",
    description: "Registra factura de compra.",
    keywords: /(factura de compra|compra a|proveedor)/,
    examples: ["registra compra del proveedor Distritcafé"],
  },
  {
    id: "create-inventory-item",
    domain: "logistica",
    kind: "execute",
    title: "Nuevo insumo",
    description: "Crea materia prima en inventario.",
    keywords: /(nuevo insumo|agregar insumo|crear insumo)/,
    examples: ["nuevo insumo leche entera"],
  },
];

const DOMAIN_LABELS: Record<GhostBrainDomain, string> = {
  operaciones: "Operaciones",
  ventas: "Ventas",
  compras: "Compras",
  finanzas: "Finanzas y caja",
  logistica: "Logística e inventario",
  administracion: "Administración",
};

export function classifyBrainQueryIntent(message: string): string | null {
  const normalized = message
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  const queryIds = new Set([
    "brain-help",
    "query-sales-report",
    "query-purchases-review",
    "query-cash-summary",
    "org-status",
  ]);

  for (const skill of GHOST_BRAIN_SKILLS) {
    if (!queryIds.has(skill.id)) {
      continue;
    }
    if (!skill.keywords.test(normalized)) {
      continue;
    }

    if (skill.id === "org-status" && /(caja|financ|ventas del)/.test(normalized)) {
      continue;
    }

    return skill.id;
  }

  if (/(panel financiero|resumen financiero|vision financiera)/.test(normalized)) {
    return "query-financial-overview";
  }

  return null;
}

export function buildBrainHelpMessage(context?: GhostBrainContext): string {
  const grouped = new Map<GhostBrainDomain, GhostBrainSkill[]>();

  for (const skill of GHOST_BRAIN_SKILLS) {
    if (skill.id === "brain-help") {
      continue;
    }
    const current = grouped.get(skill.domain) ?? [];
    current.push(skill);
    grouped.set(skill.domain, current);
  }

  const sections = [...grouped.entries()].map(([domain, skills]) => {
    const lines = skills.map((skill) => {
      const example = skill.examples[0] ? ` — _«${skill.examples[0]}»_` : "";
      return `· **${skill.title}**: ${skill.description}${example}`;
    });
    return `**${DOMAIN_LABELS[domain]}**\n${lines.join("\n")}`;
  });

  const statusLine = context
    ? `\n\nAhora mismo: caja **${context.cashSessionOpen ? "abierta" : "cerrada"}**, ` +
      `**${context.openTableSessions?.length ?? 0}** mesas abiertas, ` +
      `**${context.kitchenOrders?.length ?? 0}** comandas activas.`
    : "";

  return (
    "Soy el **cerebro operativo de Ghost**. Entiendo frases naturales y conecto funciones por palabras clave:\n\n" +
    sections.join("\n\n") +
    statusLine +
    "\n\nEscríbeme como a un compañero de turno. Si no entiendo algo, te haré una pregunta corta."
  );
}

export function listBrainSkillsByDomain(domain: GhostBrainDomain): GhostBrainSkill[] {
  return GHOST_BRAIN_SKILLS.filter((skill) => skill.domain === domain);
}
