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
    keywords: /(ayuda|que puedes|que sabes|como funciona|ejemplos|palabras clave|comandos|capacidades|cerebro)/,
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
    id: "query-daily-briefing",
    domain: "operaciones",
    kind: "query",
    title: "Briefing del día",
    description: "Novedades de ventas, inventario, caja y márgenes.",
    keywords:
      /(resumen del dia|novedades|briefing|buenos dias|como amanec|que paso hoy|alertas del dia|que hay de nuevo)/,
    examples: ["resumen del día", "¿qué novedades hay?", "briefing"],
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
    id: "query-purchases-report",
    domain: "compras",
    kind: "query",
    title: "Informe de compras",
    description: "Totales del mes, proveedores principales y promedio.",
    keywords:
      /(informe de compras|compras del mes|resumen de compras|cuanto compramos|gasto en proveedores)/,
    examples: ["informe de compras del mes", "¿cuánto compramos este mes?"],
  },
  {
    id: "query-inventory-low-stock",
    domain: "logistica",
    kind: "query",
    title: "Inventario bajo mínimo",
    description: "Insumos por debajo del stock mínimo configurado.",
    keywords:
      /(inventario bajo|stock bajo|insumos?.{0,12}bajos?|falta inventario|que se acaba|bajo minimo|reposicion)/,
    examples: ["¿qué insumos están bajos?", "inventario bajo mínimo"],
  },
  {
    id: "query-fixed-expenses",
    domain: "finanzas",
    kind: "query",
    title: "Gastos fijos",
    description: "Resumen mensual de arriendo, nómina y costos recurrentes.",
    keywords:
      /(gastos fijos|costos fijos|gastos recurrentes|arriendo|nomina mensual|egresos fijos)/,
    examples: ["gastos fijos del mes", "resumen de costos fijos"],
  },
  {
    id: "query-work-shifts",
    domain: "operaciones",
    kind: "query",
    title: "Turnos del día",
    description: "Personal programado por rol y horario.",
    keywords: /(turnos de hoy|quien trabaja|personal del dia|horarios del turno|turno de barra|caja hoy)/,
    examples: ["turnos de hoy", "¿quién trabaja hoy?"],
  },
  {
    id: "query-kitchen-status",
    domain: "operaciones",
    kind: "query",
    title: "Estado de comandas",
    description: "Pedidos pendientes, en preparación y listos.",
    keywords:
      /(estado de comandas|comandas activas|que hay en cocina|que hay en barra|pedidos pendientes|cola de cocina)/,
    examples: ["estado de comandas", "¿qué hay en cocina?"],
  },
  {
    id: "query-cost-matrix",
    domain: "logistica",
    kind: "query",
    title: "Matriz de costos",
    description: "Food cost, márgenes y fichas por producto.",
    keywords:
      /(matriz de costos|ficha de costos|food cost|costo de preparacion|margen del|margen de|cuanto cuesta hacer)/,
    examples: ["matriz de costos", "food cost del latte"],
  },
  {
    id: "build-recipe-cost",
    domain: "logistica",
    kind: "execute",
    title: "Generar ficha de costos",
    description: "Arma receta desde inventario y catálogo Ghost.",
    keywords: /(genera ficha|actualiza ficha|crea ficha|arma ficha|ficha de costos)/,
    examples: ["genera ficha de costos de Dirty Chai"],
  },
  {
    id: "save-recipe-cost",
    domain: "logistica",
    kind: "execute",
    title: "Guardar ficha de costos",
    description: "Actualiza ingredientes, rendimiento y precio de venta.",
    keywords: /(guarda ficha|ficha.*precio|ingredientes.*precio)/,
    examples: ["ficha Latte: 18g café, 200ml leche, precio 12000"],
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
    id: "register-cash-inflow",
    domain: "finanzas",
    kind: "execute",
    title: "Entrada de dinero",
    description: "Registra ingreso o depósito en caja.",
    keywords: /(entrada de dinero|ingreso de caja|deposito en caja|entrada a caja|recibo en efectivo)/,
    examples: ["entrada de dinero 100000 por cambio"],
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
  {
    id: "create-menu-product",
    domain: "ventas",
    kind: "execute",
    title: "Nuevo producto en carta",
    description: "Agrega bebida o plato al menú.",
    keywords: /(nuevo producto|agregar.*catalogo|producto en menu)/,
    examples: ["nuevo producto cold brew a 12000"],
  },
  {
    id: "open-table",
    domain: "operaciones",
    kind: "execute",
    title: "Abrir mesa",
    description: "Inicia sesión de servicio en una mesa.",
    keywords: /(abrir mesa|abre la mesa|abre mesa)/,
    examples: ["abre la mesa 3"],
  },
  {
    id: "send-kitchen",
    domain: "operaciones",
    kind: "execute",
    title: "Enviar comanda",
    description: "Manda pedidos pendientes a barra o cocina.",
    keywords: /(enviar comanda|mandar comanda|a barra|a cocina)/,
    examples: ["manda comanda de la mesa 2"],
  },
  {
    id: "update-kitchen-order",
    domain: "operaciones",
    kind: "execute",
    title: "Actualizar comanda",
    description: "Marca pedido como preparando, listo o entregado.",
    keywords: /(comanda lista|preparando|entregad|actualiza comanda)/,
    examples: ["marca comanda como lista"],
  },
  {
    id: "seed-ghost-menu",
    domain: "administracion",
    kind: "execute",
    title: "Cargar carta Ghost",
    description: "Importa bebidas y fichas SCA de referencia.",
    keywords: /(cargar carta|carta ghost|seed|menu ghost|actualiza matriz de costos|refresca matriz)/,
    examples: ["carga la carta Ghost"],
  },
  {
    id: "query-menu-catalog",
    domain: "ventas",
    kind: "query",
    title: "Catálogo de productos",
    description: "Lista bebidas, repostería y platos con precios.",
    keywords:
      /(que hay en (el )?menu|lista (de )?productos|catalogo de productos|productos en carta|que vendemos)/,
    examples: ["¿qué hay en el menú?", "lista de productos"],
  },
  {
    id: "query-inventory-catalog",
    domain: "logistica",
    kind: "query",
    title: "Catálogo de inventario",
    description: "Lista insumos, stock y unidades.",
    keywords:
      /(que insumos|lista (de )?inventario|catalogo de insumos|que tenemos en bodega|insumos disponibles)/,
    examples: ["¿qué insumos tenemos?", "lista de inventario"],
  },
  {
    id: "query-tables-status",
    domain: "operaciones",
    kind: "query",
    title: "Estado de mesas",
    description: "Mesas libres, ocupadas y cuentas abiertas.",
    keywords: /(estado de mesas|mesas libres|mesas ocupadas|que mesas|cuantas mesas)/,
    examples: ["estado de mesas", "¿qué mesas están abiertas?"],
  },
  {
    id: "delete-menu-product",
    domain: "ventas",
    kind: "execute",
    title: "Eliminar producto del menú",
    description: "Borra un producto y su ficha de costos.",
    keywords: /(elimina|borra|quita|remueve).{0,24}(del menu|de la carta|del catalogo|producto)/,
    examples: ["elimina torta de zanahoria del menú"],
  },
  {
    id: "update-menu-product",
    domain: "ventas",
    kind: "execute",
    title: "Actualizar producto del menú",
    description: "Cambia precio, descripción o activa/desactiva en carta.",
    keywords:
      /(cambia|actualiza|ajusta|pon).{0,16}(precio|activa|desactiva|inactiva)|desactiva.{0,20}(menu|carta)|activa.{0,20}(menu|carta)/,
    examples: ["cambia precio del Latte a 9000", "desactiva torta de zanahoria"],
  },
  {
    id: "register-inventory-movement",
    domain: "logistica",
    kind: "execute",
    title: "Movimiento de inventario",
    description: "Entrada, salida, merma o ajuste de stock.",
    keywords:
      /(entrada de|ingreso de|salida de|egreso de|merma de|ajuste de|registra entrada|registra salida)/,
    examples: ["entrada de 500g café caturra", "salida de 200ml leche"],
  },
  {
    id: "create-fixed-expense",
    domain: "finanzas",
    kind: "execute",
    title: "Nuevo gasto fijo",
    description: "Registra arriendo, nómina u otro costo recurrente.",
    keywords: /(nuevo gasto fijo|crear gasto fijo|registra gasto fijo|gasto recurrente)/,
    examples: ["nuevo gasto fijo arriendo 2500000 mensual"],
  },
  {
    id: "cancel-table-session",
    domain: "operaciones",
    kind: "execute",
    title: "Cancelar mesa",
    description: "Cierra sesión de mesa sin cobrar.",
    keywords: /(cancela|anula|cierra sin cobrar).{0,16}mesa/,
    examples: ["cancela la mesa 3"],
  },
  {
    id: "create-dining-table",
    domain: "operaciones",
    kind: "execute",
    title: "Crear mesa",
    description: "Agrega una mesa nueva al salón.",
    keywords: /(nueva mesa|crea mesa|agrega mesa|crear mesa)/,
    examples: ["crea mesa 5"],
  },
  {
    id: "create-warehouse",
    domain: "logistica",
    kind: "execute",
    title: "Crear bodega",
    description: "Agrega bodega o almacén.",
    keywords: /(nueva bodega|crea bodega|agrega bodega|crear bodega)/,
    examples: ["crea bodega principal"],
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
    "query-purchases-report",
    "query-cash-summary",
    "query-inventory-low-stock",
    "query-fixed-expenses",
    "query-work-shifts",
    "query-kitchen-status",
    "query-cost-matrix",
    "query-menu-catalog",
    "query-inventory-catalog",
    "query-tables-status",
    "query-daily-briefing",
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
    "Soy el **cerebro operativo de Ghost**. Tengo acceso a **todas las funciones de la app** — lo que puedes hacer en pantalla, yo lo hago con una orden:\n\n" +
    sections.join("\n\n") +
    statusLine +
    "\n\nEscríbeme como a un compañero de turno. Si falta un dato, te pregunto una cosa corta."
  );
}

export function listBrainSkillsByDomain(domain: GhostBrainDomain): GhostBrainSkill[] {
  return GHOST_BRAIN_SKILLS.filter((skill) => skill.domain === domain);
}
