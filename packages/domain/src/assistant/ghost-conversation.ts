import {
  createEmptyGhostChatSession,
  ghostChatGreeting,
  isGhostChatGlobalCommand,
  parseKitchenOrderStatus,
  parsePaymentMethod,
  type GhostChatSession,
} from "./ghost-chat.js";

export type GhostConversationIntent =
  | "org-status"
  | "create-inventory-item"
  | "create-purchase-invoice"
  | "create-menu-product"
  | "open-cash-session"
  | "create-counter-sale"
  | "open-table"
  | "add-table-order"
  | "send-kitchen"
  | "update-kitchen-order"
  | "seed-ghost-menu"
  | "agent-query";

export interface GhostConversationInventoryItem {
  id: string;
  name: string;
  sku: string;
  baseUnit: string;
}

export interface GhostConversationProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  station: string;
}

export interface GhostConversationTable {
  id: string;
  number: number;
  label: string;
  status: string;
  qrToken: string;
}

export interface GhostConversationKitchenOrder {
  id: string;
  saleNumber: string;
  status: string;
  station: string;
  tableNumber?: number;
}

export interface GhostConversationTableSession {
  sessionId: string;
  tableId: string;
  tableNumber: number;
  guestToken: string;
}

export interface GhostConversationContext {
  organizationName?: string;
  inventoryItems: GhostConversationInventoryItem[];
  menuProducts: GhostConversationProduct[];
  tables: GhostConversationTable[];
  kitchenOrders: GhostConversationKitchenOrder[];
  openTableSessions: GhostConversationTableSession[];
  cashSessionOpen: boolean;
  invoiceCount: number;
  inventoryCount: number;
  ghostBeverageCount: number;
}

export interface GhostConversationHistoryMessage {
  speaker: "ghost" | "user";
  text: string;
}

export type GhostConversationResult =
  | {
      kind: "reply";
      session: GhostChatSession;
      messages: string[];
      suggestions?: string[];
    }
  | {
      kind: "execute";
      session: GhostChatSession;
      messages: string[];
      intent: GhostConversationIntent;
      draft: Record<string, string>;
    }
  | {
      kind: "agent";
      session: GhostChatSession;
      messages: string[];
      message: string;
    };

const INTENT_FLOW_KEY: Record<Exclude<GhostConversationIntent, "org-status" | "agent-query">, string> = {
  "create-inventory-item": "admin/add-inventory-item",
  "create-purchase-invoice": "admin/purchase-invoice",
  "create-menu-product": "admin/add-menu-product",
  "open-cash-session": "cashier/open-cash",
  "create-counter-sale": "cashier/counter-sale",
  "open-table": "waiter/open-table",
  "add-table-order": "waiter/add-table-order",
  "send-kitchen": "waiter/send-kitchen",
  "update-kitchen-order": "cashier/update-kitchen-order",
  "seed-ghost-menu": "admin/seed-ghost-menu",
};

const REQUIRED_FIELDS: Record<string, string[]> = {
  "create-inventory-item": ["name"],
  "create-purchase-invoice": ["supplierName", "inventoryItemId", "quantity", "unitCost"],
  "create-menu-product": ["name", "price"],
  "open-cash-session": ["openingAmount"],
  "create-counter-sale": ["productId"],
  "open-table": ["tableId"],
  "add-table-order": ["sessionId", "productId"],
  "send-kitchen": ["sessionId"],
  "update-kitchen-order": ["orderId", "status"],
};

const FIELD_PROMPTS: Record<string, string> = {
  name: "¿Cómo se llama?",
  supplierName: "¿De qué proveedor es?",
  inventoryItemId: "¿Qué insumo compraste?",
  quantity: "¿Cuántas unidades o gramos?",
  unitCost: "¿Cuál fue el costo unitario en COP?",
  price: "¿A qué precio lo vendes (COP)?",
  openingAmount: "¿Con cuánto efectivo abres caja?",
  productId: "¿Qué producto es?",
  tableId: "¿Qué mesa?",
  sessionId: "¿En qué mesa va el pedido?",
  orderId: "¿Qué comanda actualizamos?",
  status: "¿La marco como preparando, lista o entregada?",
};

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractNumber(value: string): number | null {
  const match = value.match(/(?:\$|cop)?\s*([\d][\d.,]*)/i);
  if (!match?.[1]) {
    return null;
  }
  const parsed = Number(match[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractTableNumber(value: string): number | null {
  const match = value.match(/mesa\s*#?\s*(\d+)/i);
  if (!match?.[1]) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function findByName<T extends { name: string }>(query: string, items: T[]): T | null {
  const normalized = normalizeText(query);
  if (!normalized) {
    return null;
  }

  const tokens = normalized.split(/\s+/).filter((token) => token.length > 2);
  let best: { item: T; score: number } | null = null;

  for (const item of items) {
    const name = normalizeText(item.name);
    if (normalized.includes(name) || name.includes(normalized)) {
      return item;
    }

    const overlap = tokens.filter((token) => name.includes(token)).length;
    const score = overlap / Math.max(tokens.length, 1);
    if (!best || score > best.score) {
      best = { item, score };
    }
  }

  return best && best.score >= 0.5 ? best.item : null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function slugSku(name: string): string {
  const base = normalizeText(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12);
  return (base || "insumo").toUpperCase();
}

function inferBaseUnit(name: string): string {
  const normalized = normalizeText(name);
  if (/(leche|agua|jarabe|syrup|crema|bebida|ml|litro)/.test(normalized)) {
    return "ml";
  }
  if (/(cafe|café|azucar|azúcar|harina|cacao|grano|kg|gramo)/.test(normalized)) {
    return "g";
  }
  return "unit";
}

function classifyIntent(message: string, context: GhostConversationContext): GhostConversationIntent {
  const normalized = normalizeText(message);
  const mentionedProduct = findByName(message, context.menuProducts);
  const mentionedInventory = findByName(message, context.inventoryItems);

  if (/(como vamos|estado|resumen|que tal|operacion|status)/.test(normalized)) {
    return "org-status";
  }
  if (/(cargar carta|carta ghost|seed|menu ghost)/.test(normalized)) {
    return "seed-ghost-menu";
  }
  if (/(abrir caja|abre caja|fondo inicial)/.test(normalized)) {
    return "open-cash-session";
  }
  if (/(factura|proveedor|registr.*compra|compre|llego.*compra)/.test(normalized)) {
    return "create-purchase-invoice";
  }
  if (
    /(nuevo insumo|agregar insumo|crear insumo|anadir insumo)/.test(normalized) ||
    (/(agrega|crea|anota)\s+/i.test(message) &&
      mentionedInventory &&
      !mentionedProduct &&
      !/mesa/.test(normalized))
  ) {
    return "create-inventory-item";
  }
  if (/(nuevo producto|agregar.*catalogo|producto en menu)/.test(normalized)) {
    return "create-menu-product";
  }
  if (
    /(vend|cobra|cobro|mostrador|venta de)/.test(normalized) ||
    (mentionedProduct &&
      /(quiero|dame|un |una |dos |tres |cobr|vend|para llevar)/.test(normalized))
  ) {
    return "create-counter-sale";
  }
  if (/(abrir mesa)/.test(normalized) || extractTableNumber(message)) {
    return "open-table";
  }
  if (/(pedido|anota|agrega).*(mesa)/.test(normalized)) {
    return "add-table-order";
  }
  if (/(enviar comanda|mandar comanda|a barra|a cocina)/.test(normalized)) {
    return "send-kitchen";
  }
  if (/(comanda lista|preparando|entregad|actualiza comanda)/.test(normalized)) {
    return "update-kitchen-order";
  }

  return "agent-query";
}

function extractDraftForIntent(
  intent: GhostConversationIntent,
  message: string,
  context: GhostConversationContext,
  current: Record<string, string>,
): Record<string, string> {
  const draft = { ...current };
  const normalized = normalizeText(message);

  if (intent === "create-inventory-item") {
    const item = findByName(message, context.inventoryItems);
    if (!draft.name && !item) {
      const cleaned = message
        .replace(/^(agrega|crea|nuevo)\s+(insumo\s+)?/i, "")
        .trim();
      if (cleaned.length >= 2) {
        draft.name = cleaned;
      }
    }
    if (draft.name) {
      draft.sku = draft.sku || slugSku(draft.name);
      draft.baseUnit = draft.baseUnit || inferBaseUnit(draft.name);
      draft.type = draft.type || "raw_material";
    }
  }

  if (intent === "create-purchase-invoice") {
    const proveedorExplicit = /proveedor/i.test(message);
    const supplierMatch =
      message.match(/proveedor\s+([^,.\n]{2,40})/i) ??
      message.match(/factura\s+(?:de|del)\s+([^,.\n]{2,40})/i);
    if (supplierMatch?.[1] && (!draft.supplierName || proveedorExplicit)) {
      draft.supplierName = supplierMatch[1].trim();
    }

    const item = findByName(message, context.inventoryItems);
    if (item) {
      draft.inventoryItemId = item.id;
      draft.itemName = item.name;
    }

    const quantityMatch = message.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gramos|litros|l|unidades|u|bolsas)?/i);
    if (quantityMatch?.[1] && !draft.quantity) {
      draft.quantity = quantityMatch[1].replace(",", ".");
    }

    const money = extractNumber(message);
    if (money !== null && !draft.unitCost) {
      draft.unitCost = String(money);
    }

    draft.invoiceNumber = draft.invoiceNumber || `AUTO-${Date.now().toString().slice(-8)}`;
    draft.invoiceDate = draft.invoiceDate || todayIso();
  }

  if (intent === "create-menu-product") {
    const product = findByName(message, context.menuProducts);
    if (!draft.name && !product) {
      const cleaned = message.replace(/^(agrega|crea|nuevo)\s+(producto\s+)?/i, "").trim();
      if (cleaned.length >= 2) {
        draft.name = cleaned;
      }
    }
    const price = extractNumber(message);
    if (price !== null) {
      draft.price = String(price);
    }
    draft.category = draft.category || "beverage";
    draft.station = draft.station || "bar";
  }

  if (intent === "open-cash-session") {
    const amount = extractNumber(message);
    if (amount !== null) {
      draft.openingAmount = String(amount);
    }
  }

  if (intent === "create-counter-sale") {
    const product = findByName(message, context.menuProducts);
    if (product) {
      draft.productId = product.id;
      draft.productName = product.name;
    }
    const qtyMatch = message.match(/(\d+)\s*(unidades|uds|x)?/i);
    if (qtyMatch?.[1]) {
      draft.quantity = qtyMatch[1];
    }
    draft.quantity = draft.quantity || "1";
    const payment = parsePaymentMethod(message);
    if (payment) {
      draft.paymentMethod = payment;
    }
    draft.paymentMethod = draft.paymentMethod || "cash";
  }

  if (intent === "open-table") {
    const tableNumber = extractTableNumber(message);
    const table =
      (tableNumber
        ? context.tables.find((entry) => entry.number === tableNumber)
        : null) ?? findByName(message, context.tables.map((t) => ({ ...t, name: `mesa ${t.number}` })));
    if (table) {
      draft.tableId = table.id;
      draft.tableNumber = String(table.number);
      draft.qrToken = table.qrToken;
    }
  }

  if (intent === "add-table-order") {
    const tableNumber = extractTableNumber(message);
    const session =
      (tableNumber
        ? context.openTableSessions.find((entry) => entry.tableNumber === tableNumber)
        : null) ?? context.openTableSessions[0];
    if (session) {
      draft.sessionId = session.sessionId;
      draft.guestToken = session.guestToken;
    }
    const product = findByName(message, context.menuProducts);
    if (product) {
      draft.productId = product.id;
      draft.productName = product.name;
    }
    draft.quantity = draft.quantity || "1";
  }

  if (intent === "send-kitchen") {
    const tableNumber = extractTableNumber(message);
    const session =
      (tableNumber
        ? context.openTableSessions.find((entry) => entry.tableNumber === tableNumber)
        : null) ?? context.openTableSessions[0];
    if (session) {
      draft.sessionId = session.sessionId;
    }
  }

  if (intent === "update-kitchen-order") {
    const order =
      findByName(message, context.kitchenOrders.map((o) => ({ ...o, name: o.saleNumber || o.id }))) ??
      context.kitchenOrders[0];
    if (order) {
      draft.orderId = order.id;
    }
    const status = parseKitchenOrderStatus(message);
    if (status) {
      draft.status = status;
    } else if (/lista|listo|ready/.test(normalized)) {
      draft.status = "ready";
    } else if (/preparando|preparing/.test(normalized)) {
      draft.status = "preparing";
    } else if (/entregad/.test(normalized)) {
      draft.status = "delivered";
    }
  }

  return draft;
}

function missingFields(intent: string, draft: Record<string, string>): string[] {
  const required = REQUIRED_FIELDS[intent] ?? [];
  return required.filter((field) => !String(draft[field] ?? "").trim());
}

function followUpForField(intent: string, field: string, context: GhostConversationContext): string {
  if (field === "inventoryItemId" && context.inventoryItems.length === 0) {
    return "No tienes insumos todavía. Dime el nombre del insumo y lo creamos primero, o importa compras.";
  }
  if (field === "productId" && context.menuProducts.length === 0) {
    return "Tu catálogo está vacío. Puedes decirme «carga la carta Ghost» o el nombre del producto a crear.";
  }
  if (field === "sessionId" && context.openTableSessions.length === 0) {
    return "No hay mesas abiertas. Dime «abre la mesa 3» (o el número que sea).";
  }
  if (field === "tableId" && context.tables.length === 0) {
    return "No hay mesas configuradas en el sistema.";
  }
  if (intent === "open-cash-session" && context.cashSessionOpen) {
    return "La caja ya está abierta hoy. ¿Quieres registrar una venta o ver el estado?";
  }
  if (intent === "create-counter-sale" && !context.cashSessionOpen) {
    return "Primero abre caja. Por ejemplo: «abre caja con 200000».";
  }

  return FIELD_PROMPTS[field] ?? "¿Me das un poco más de detalle?";
}

function buildOrgStatus(context: GhostConversationContext): string {
  const openTables =
    context.openTableSessions.length > 0
      ? context.openTableSessions.map((session) => `Mesa ${session.tableNumber}`).join(", ")
      : "ninguna";

  return (
    `Así va **${context.organizationName ?? "tu operación"}**:\n` +
    `· **${context.inventoryCount}** insumos · **${context.invoiceCount}** facturas de compra\n` +
    `· **${context.menuProducts.length}** productos en carta (${context.ghostBeverageCount} bebidas Ghost)\n` +
    `· Caja: **${context.cashSessionOpen ? "abierta" : "cerrada"}**\n` +
    `· Mesas abiertas: ${openTables}\n` +
    `· Comandas activas: **${context.kitchenOrders.length}**`
  );
}

function acknowledgeExecution(intent: GhostConversationIntent, draft: Record<string, string>): string {
  switch (intent) {
    case "create-inventory-item":
      return `Perfecto, creo el insumo **${draft.name}**.`;
    case "create-purchase-invoice":
      return `Registro la factura de **${draft.supplierName}**.`;
    case "create-menu-product":
      return `Agrego **${draft.name}** al catálogo.`;
    case "open-cash-session":
      return `Abro caja con **$${Number(draft.openingAmount || 0).toLocaleString("es-CO")}**.`;
    case "create-counter-sale":
      return `Registro la venta de **${draft.productName ?? "producto"}**.`;
    case "open-table":
      return `Abro la **mesa ${draft.tableNumber}**.`;
    case "add-table-order":
      return `Anoto **${draft.productName ?? "pedido"}** en la mesa.`;
    case "send-kitchen":
      return "Envío la comanda a barra/cocina.";
    case "update-kitchen-order":
      return `Actualizo la comanda a **${draft.status}**.`;
    case "seed-ghost-menu":
      return "Cargo la carta Ghost y las fichas SCA base.";
    default:
      return "Listo.";
  }
}

function sessionWithPending(
  session: GhostChatSession,
  intent: GhostConversationIntent,
  draft: Record<string, string>,
): GhostChatSession {
  return {
    ...session,
    pendingIntent: intent,
    draft,
    flowPath: ["conversation", intent],
    stepIndex: 0,
    role: null,
  };
}

function clearPending(session: GhostChatSession): GhostChatSession {
  return {
    ...createEmptyGhostChatSession(),
    agentSessionId: session.agentSessionId,
  };
}

export function buildConversationContextSummary(context: GhostConversationContext): string {
  const openTables = context.openTableSessions.map((s) => s.tableNumber).join(", ") || "ninguna";
  const topProducts = context.menuProducts
    .slice(0, 8)
    .map((product) => product.name)
    .join(", ");

  return [
    `Organización: ${context.organizationName ?? "Ghost"}`,
    `Insumos: ${context.inventoryCount}`,
    `Facturas compra: ${context.invoiceCount}`,
    `Productos carta: ${context.menuProducts.length}${topProducts ? ` (${topProducts})` : ""}`,
    `Caja: ${context.cashSessionOpen ? "abierta" : "cerrada"}`,
    `Mesas abiertas: ${openTables}`,
    `Comandas activas: ${context.kitchenOrders.length}`,
  ].join("\n");
}

export function createInitialConversationTurn(
  context: GhostConversationContext,
): GhostConversationResult {
  return {
    kind: "reply",
    session: createEmptyGhostChatSession(),
    messages: [ghostChatGreeting(context.organizationName)],
  };
}

export function processConversationTurn(input: {
  message: string;
  session: GhostChatSession;
  context: GhostConversationContext;
  history?: GhostConversationHistoryMessage[];
}): GhostConversationResult {
  const trimmed = input.message.trim();
  const session = input.session;
  const context = input.context;

  if (!trimmed) {
    return {
      kind: "reply",
      session,
      messages: ["Cuéntame qué necesitas y lo vemos."],
    };
  }

  if (isGhostChatGlobalCommand(trimmed)) {
    if (trimmed.toLowerCase() === "cancelar") {
      return {
        kind: "reply",
        session: clearPending(session),
        messages: ["De acuerdo, lo dejamos aquí. ¿En qué más te ayudo?"],
      };
    }

    return {
      kind: "reply",
      session: clearPending(session),
      messages: [ghostChatGreeting(context.organizationName)],
    };
  }

  if (session.pendingIntent) {
    const intent = session.pendingIntent as GhostConversationIntent;
    const draft = extractDraftForIntent(intent, trimmed, context, {
      ...session.draft,
      ...extractDraftForIntent(intent, trimmed, context, session.draft),
    });
    const missing = missingFields(intent, draft);

    if (missing.length > 0) {
      return {
        kind: "reply",
        session: sessionWithPending(session, intent, draft),
        messages: [followUpForField(intent, missing[0]!, context)],
      };
    }

    draft.confirm = "si";
    return {
      kind: "execute",
      session: clearPending(session),
      messages: [acknowledgeExecution(intent, draft)],
      intent,
      draft,
    };
  }

  const intent = classifyIntent(trimmed, context);

  if (intent === "org-status") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildOrgStatus(context)],
    };
  }

  if (intent === "seed-ghost-menu") {
    return {
      kind: "execute",
      session: clearPending(session),
      messages: [acknowledgeExecution(intent, {})],
      intent,
      draft: { confirm: "si" },
    };
  }

  if (intent === "agent-query") {
    const agentSessionId = session.agentSessionId ?? `chat-${Date.now()}`;
    return {
      kind: "agent",
      session: { ...clearPending(session), agentSessionId },
      messages: ["Dame un segundo, reviso tu operación y lo que sé del negocio…"],
      message: trimmed,
    };
  }

  const draft = extractDraftForIntent(intent, trimmed, context, {});
  const missing = missingFields(intent, draft);

  if (missing.length > 0) {
    const partialAck =
      intent === "create-purchase-invoice"
        ? "Entendido, vamos con esa compra."
        : intent === "create-counter-sale"
          ? "Te ayudo con la venta."
          : "Perfecto.";

    return {
      kind: "reply",
      session: sessionWithPending(session, intent, draft),
      messages: [`${partialAck} ${followUpForField(intent, missing[0]!, context)}`],
    };
  }

  draft.confirm = "si";
  return {
    kind: "execute",
    session: clearPending(session),
    messages: [acknowledgeExecution(intent, draft)],
    intent,
    draft,
  };
}

export function flowPathForIntent(intent: GhostConversationIntent): string[] {
  const key = INTENT_FLOW_KEY[intent as keyof typeof INTENT_FLOW_KEY];
  if (!key) {
    return ["conversation"];
  }
  return key.split("/");
}
