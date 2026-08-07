import {
  getBeverageAdvancedSetupProgress,
  getBeverageAdvancedSetupSpec,
  needsBeverageAdvancedSetup,
  type BeverageAdvancedSetupQuestion,
} from "@ghost/domain";
import {
  buildConversationContextSummary,
  createEmptyGhostChatSession,
  createInitialConversationTurn,
  flowPathForIntent,
  formatGhostChatMenu,
  ghostChatGreeting,
  GHOST_ASSISTANT_NAME,
  GHOST_ROLE_MENUS,
  GHOST_ROOT_MENU,
  parseKitchenOrderStatus,
  parsePaymentMethod,
  processConversationTurn,
  resolveMenuSelection,
  type GhostChatMessage,
  type GhostChatMenuOption,
  type GhostChatRole,
  type GhostChatSession,
  type GhostConversationCashSnapshot,
  type GhostConversationCostMatrixSettings,
  type GhostConversationFixedExpenseSnapshot,
  type GhostConversationInventoryCostSnapshot,
  type GhostConversationInventoryStockSnapshot,
  type GhostConversationPurchaseSnapshot,
  type GhostConversationRecipeSnapshot,
  type GhostConversationSaleSnapshot,
  type GhostConversationWorkShiftSnapshot,
  type GhostConversationContext,
  type GhostConversationHistoryMessage,
  type GhostConversationIntent,
} from "@ghost/domain";

export interface GhostChatInventoryItem {
  id: string;
  name: string;
  sku: string;
  baseUnit: string;
}

export interface GhostChatMenuProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  station: string;
  saleTaxCategory?: string;
  recipeCost?: number;
}

export interface GhostChatWarehouse {
  id: string;
  name: string;
}

export interface GhostChatTable {
  id: string;
  number: number;
  label: string;
  status: string;
  qrToken: string;
}

export interface GhostChatKitchenOrder {
  id: string;
  saleNumber: string;
  status: string;
  station: string;
  tableNumber?: number;
}

export interface GhostChatTableSession {
  sessionId: string;
  tableId: string;
  tableNumber: number;
  guestToken: string;
  lines?: Array<{ name: string; quantity: number; lineTotal: number }>;
  total?: number;
}

export interface GhostChatContext {
  organizationName?: string;
  inventoryItems: GhostChatInventoryItem[];
  menuProducts: GhostChatMenuProduct[];
  warehouses: GhostChatWarehouse[];
  tables: GhostChatTable[];
  kitchenOrders: GhostChatKitchenOrder[];
  openTableSessions: GhostChatTableSession[];
  cashSessionOpen: boolean;
  invoiceCount: number;
  inventoryCount: number;
  ghostBeverageCount: number;
  beverageSetupPending: Array<{ productId: string; name: string; progress: string }>;
  salesSnapshot: GhostConversationSaleSnapshot[];
  purchasesSnapshot: GhostConversationPurchaseSnapshot[];
  cashSnapshot?: GhostConversationCashSnapshot;
  inventoryStockSnapshot: GhostConversationInventoryStockSnapshot[];
  fixedExpensesSnapshot: GhostConversationFixedExpenseSnapshot[];
  workShiftsSnapshot: GhostConversationWorkShiftSnapshot[];
  recipesSnapshot: GhostConversationRecipeSnapshot[];
  inventoryCostSnapshot: GhostConversationInventoryCostSnapshot[];
  costMatrixSettings?: GhostConversationCostMatrixSettings;
}

export type GhostChatAction =
  | { type: "create-inventory-item"; payload: Record<string, string> }
  | { type: "create-purchase-invoice"; payload: Record<string, string> }
  | { type: "create-menu-product"; payload: Record<string, string> }
  | { type: "save-beverage-setup"; payload: { productId: string; productName: string; answers: Record<string, string> } }
  | { type: "seed-ghost-menu" }
  | { type: "open-cash-session"; payload: { openingAmount: number } }
  | { type: "close-cash-session"; payload: { sessionId: string; countedAmount: number; expectedAmount: number } }
  | { type: "register-cash-outflow"; payload: { sessionId: string; amount: number; reason: string; movementType: string } }
  | { type: "register-cash-inflow"; payload: { sessionId: string; amount: number; reason: string; movementType: string } }
  | { type: "build-recipe-cost"; payload: { productId: string; productName: string } }
  | { type: "save-recipe-cost"; payload: Record<string, string> }
  | { type: "create-counter-sale"; payload: Record<string, string> }
  | { type: "open-table"; payload: Record<string, string> }
  | { type: "add-table-order"; payload: Record<string, string> }
  | { type: "checkout-table"; payload: Record<string, string> }
  | { type: "send-kitchen"; payload: { sessionId: string } }
  | { type: "update-kitchen-order"; payload: { orderId: string; status: string } }
  | { type: "delete-menu-product"; payload: Record<string, string> }
  | { type: "update-menu-product"; payload: Record<string, string> }
  | { type: "register-inventory-movement"; payload: Record<string, string> }
  | { type: "create-fixed-expense"; payload: Record<string, string> }
  | { type: "cancel-table-session"; payload: Record<string, string> }
  | { type: "create-dining-table"; payload: Record<string, string> }
  | { type: "create-warehouse"; payload: Record<string, string> }
  | { type: "ghost-agent-query"; payload: { message: string; sessionId: string; contextSummary?: string; history?: GhostConversationHistoryMessage[] } };

export interface GhostChatTurnResult {
  session: GhostChatSession;
  ghostMessages: string[];
  quickReplies: string[];
  action?: GhostChatAction;
}

interface FlowStep {
  field: string;
  prompt: string | ((draft: Record<string, string>, context: GhostChatContext) => string);
  validate?: (value: string, context: GhostChatContext) => string | null;
  options?: (context: GhostChatContext) => GhostChatMenuOption[];
  skip?: (draft: Record<string, string>) => boolean;
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createGhostChatMessage(speaker: "ghost" | "user", text: string): GhostChatMessage {
  return {
    id: createMessageId(),
    speaker,
    text,
    createdAt: new Date().toISOString(),
  };
}

function roleMenu(role: GhostChatRole): GhostChatMenuOption[] {
  return GHOST_ROLE_MENUS[role];
}

function flowKey(path: string[]): string {
  return path.join("/");
}

function inventoryOptions(context: GhostChatContext): GhostChatMenuOption[] {
  return context.inventoryItems.map((item, index) => ({
    id: item.id,
    label: `${index + 1}. ${item.name}`,
    description: `SKU ${item.sku} · ${item.baseUnit}`,
  }));
}

function productOptions(context: GhostChatContext): GhostChatMenuOption[] {
  return context.menuProducts.map((product, index) => ({
    id: product.id,
    label: `${index + 1}. ${product.name}`,
    description: `$${product.price.toLocaleString("es-CO")}`,
  }));
}

function tableOptions(context: GhostChatContext): GhostChatMenuOption[] {
  return context.tables.map((table, index) => ({
    id: table.id,
    label: `${index + 1}. Mesa ${table.number}${table.label ? ` (${table.label})` : ""}`,
    description: table.status,
  }));
}

function kitchenOrderOptions(context: GhostChatContext): GhostChatMenuOption[] {
  return context.kitchenOrders.map((order, index) => ({
    id: order.id,
    label: `${index + 1}. ${order.saleNumber || order.id.slice(0, 6)}`,
    description: `${order.station} · ${order.status}${order.tableNumber ? ` · mesa ${order.tableNumber}` : ""}`,
  }));
}

function openSessionOptions(context: GhostChatContext): GhostChatMenuOption[] {
  return context.openTableSessions.map((session, index) => ({
    id: session.sessionId,
    label: `${index + 1}. Mesa ${session.tableNumber}`,
    description: session.sessionId.slice(0, 8),
  }));
}

function beveragePendingOptions(context: GhostChatContext): GhostChatMenuOption[] {
  return context.beverageSetupPending.map((entry, index) => ({
    id: entry.productId,
    label: `${index + 1}. ${entry.name}`,
    description: entry.progress,
  }));
}

const FLOW_STEPS: Record<string, FlowStep[]> = {
  "admin/add-inventory-item": [
    {
      field: "name",
      prompt: "¿Nombre del insumo? (ej. Cacao en polvo, Leche entera)",
    },
    {
      field: "sku",
      prompt: "¿SKU o código interno? (mínimo 3 caracteres)",
      validate: (value) => (value.trim().length >= 3 ? null : "El SKU debe tener al menos 3 caracteres."),
    },
    {
      field: "baseUnit",
      prompt:
        "¿Unidad base de costeo?\n1. **g** (gramos)\n2. **ml** (mililitros)\n3. **unit** (unidades)\n4. **kg**",
      validate: (value) =>
        ["g", "ml", "unit", "kg", "1", "2", "3", "4"].includes(value.trim().toLowerCase())
          ? null
          : "Elige g, ml, unit o kg.",
    },
    {
      field: "type",
      prompt:
        "¿Tipo de insumo?\n1. **Materia prima** (raw_material)\n2. **Producto terminado** (finished_product)",
      validate: (value) =>
        /^(1|materia|raw|raw_material)$/i.test(value) ||
        /^(2|terminado|finished|finished_product)$/i.test(value)
          ? null
          : "Elige materia prima (1) o producto terminado (2).",
    },
    {
      field: "confirm",
      prompt: (draft) =>
        `Confirma el insumo:\n` +
        `· Nombre: **${draft.name}**\n` +
        `· SKU: **${draft.sku}**\n` +
        `· Unidad: **${normalizeBaseUnit(draft.baseUnit ?? "")}**\n` +
        `· Tipo: **${normalizeItemType(draft.type ?? "")}**\n\n` +
        "¿Lo creo en inventario? (sí / no)",
      validate: (value) =>
        /^(si|sí|yes|s|ok|confirmar|1)$/i.test(value.trim()) ||
        /^(no|n|cancelar|2)$/i.test(value.trim())
          ? null
          : "Responde sí para crear o no para cancelar.",
    },
  ],
  "admin/purchase-invoice": [
    { field: "supplierName", prompt: "¿Nombre del proveedor?" },
    { field: "invoiceNumber", prompt: "¿Número de factura?" },
    {
      field: "invoiceDate",
      prompt: "¿Fecha de factura? (AAAA-MM-DD, ej. 2026-08-06)",
      validate: (value) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? null : "Usa formato AAAA-MM-DD.",
    },
    {
      field: "inventoryItemId",
      prompt: (draft, context) =>
        context.inventoryItems.length === 0
          ? "No hay insumos en inventario. Primero agrega insumos o importa compras."
          : `¿Qué insumo va en la factura?\n${formatGhostChatMenu(inventoryOptions(context))}`,
      options: inventoryOptions,
      validate: (value, context) =>
        resolveInventoryItem(value, context) ? null : "Elige un insumo de la lista.",
    },
    {
      field: "quantity",
      prompt: "¿Cantidad comprada? (número)",
      validate: (value) =>
        Number(value) > 0 ? null : "Ingresa una cantidad mayor a 0.",
    },
    {
      field: "unitCost",
      prompt: "¿Costo neto por unidad? (COP, sin IVA)",
      validate: (value) =>
        Number(value) >= 0 ? null : "Ingresa un costo válido.",
    },
    {
      field: "confirm",
      prompt: (draft, context) => {
        const item = resolveInventoryItem(draft.inventoryItemId ?? "", context);
        return (
          `Confirma la factura:\n` +
          `· Proveedor: **${draft.supplierName}**\n` +
          `· N.º: **${draft.invoiceNumber}**\n` +
          `· Fecha: **${draft.invoiceDate}**\n` +
          `· Insumo: **${item?.name ?? draft.inventoryItemId}**\n` +
          `· Cantidad: **${draft.quantity}**\n` +
          `· Costo unitario: **$${Number(draft.unitCost || 0).toLocaleString("es-CO")}**\n\n` +
          "¿La registro y confirmo? (sí / no)"
        );
      },
      validate: (value) =>
        /^(si|sí|yes|s|ok|confirmar|1)$/i.test(value.trim()) ||
        /^(no|n|cancelar|2)$/i.test(value.trim())
          ? null
          : "Responde sí o no.",
    },
  ],
  "admin/add-menu-product": [
    { field: "name", prompt: "¿Nombre del producto en el catálogo?" },
    {
      field: "price",
      prompt: "¿Precio de venta? (COP, con impuesto incluido)",
      validate: (value) => (Number(value) > 0 ? null : "Ingresa un precio mayor a 0."),
    },
    {
      field: "category",
      prompt:
        "¿Categoría?\n1. **Bebida** (beverage)\n2. **Repostería** (pastry)\n3. **Otro** (other)",
    },
    {
      field: "station",
      prompt: "¿Estación de preparación?\n1. **Barra** (bar)\n2. **Cocina** (kitchen)",
    },
    {
      field: "confirm",
      prompt: (draft) =>
        `Confirma el producto:\n` +
        `· **${draft.name}** · $${Number(draft.price || 0).toLocaleString("es-CO")}\n` +
        `· Categoría: **${normalizeCategory(draft.category ?? "")}**\n` +
        `· Estación: **${normalizeStation(draft.station ?? "")}**\n\n` +
        "¿Lo agrego al catálogo? (sí / no)",
    },
  ],
  "admin/confirm-beverage-setup": [
    {
      field: "productId",
      prompt: (draft, context) => {
        if (context.beverageSetupPending.length === 0) {
          return "Todas las bebidas avanzadas están confirmadas. Escribe **menu** para otra tarea.";
        }
        return `¿Qué bebida confirmamos?\n${formatGhostChatMenu(beveragePendingOptions(context))}`;
      },
      options: beveragePendingOptions,
      validate: (value, context) =>
        resolveProductById(value, context) || resolveProductByName(value, context)
          ? null
          : "Elige una bebida de la lista.",
    },
  ],
  "cashier/open-cash": [
    {
      field: "openingAmount",
      prompt: (draft, context) =>
        context.cashSessionOpen
          ? "Ya hay una caja abierta hoy. Escribe **menu** para otra tarea."
          : "¿Con cuánto efectivo abres la caja? (COP)",
      validate: (value, context) =>
        context.cashSessionOpen
          ? null
          : Number(value) >= 0
            ? null
            : "Ingresa un monto válido (0 o más).",
    },
    {
      field: "confirm",
      prompt: (draft) =>
        `¿Abro caja con **$${Number(draft.openingAmount || 0).toLocaleString("es-CO")}**? (sí / no)`,
    },
  ],
  "cashier/counter-sale": [
    {
      field: "productId",
      prompt: (draft, context) => {
        if (!context.cashSessionOpen) {
          return "Primero abre la caja. Elige **Abrir caja** en el menú de cajero.";
        }
        if (context.menuProducts.length === 0) {
          return "No hay productos en el catálogo. Carga la carta Ghost primero.";
        }
        return `¿Qué producto vendes?\n${formatGhostChatMenu(productOptions(context))}`;
      },
      options: productOptions,
      validate: (value, context) =>
        context.cashSessionOpen && resolveProductById(value, context)
          ? null
          : "Elige un producto de la lista.",
    },
    {
      field: "quantity",
      prompt: "¿Cuántas unidades?",
      validate: (value) => (Number(value) > 0 ? null : "Cantidad mayor a 0."),
    },
    {
      field: "paymentMethod",
      prompt:
        "¿Forma de pago?\n1. Efectivo\n2. Tarjeta\n3. Transferencia\n4. Otro",
      validate: (value) => (parsePaymentMethod(value) ? null : "Elige 1, 2, 3 o 4."),
    },
    {
      field: "confirm",
      prompt: (draft, context) => {
        const product = resolveProductById(draft.productId ?? "", context);
        const total =
          (product?.price ?? 0) * (Number(draft.quantity) || 1);
        return (
          `Confirma la venta:\n` +
          `· **${product?.name ?? "?"}** × ${draft.quantity}\n` +
          `· Total: **$${total.toLocaleString("es-CO")}**\n` +
          `· Pago: **${draft.paymentMethod}**\n\n` +
          "¿Registro la venta y comanda? (sí / no)"
        );
      },
    },
  ],
  "cashier/update-kitchen-order": [
    {
      field: "orderId",
      prompt: (draft, context) =>
        context.kitchenOrders.length === 0
          ? "No hay comandas activas. Escribe **menu** para volver."
          : `¿Qué comanda actualizamos?\n${formatGhostChatMenu(kitchenOrderOptions(context))}`,
      options: kitchenOrderOptions,
      validate: (value, context) =>
        resolveKitchenOrder(value, context) ? null : "Elige una comanda de la lista.",
    },
    {
      field: "status",
      prompt: "¿Nuevo estado?\n1. Preparando\n2. Lista\n3. Entregada",
      validate: (value) => (parseKitchenOrderStatus(value) ? null : "Elige 1, 2 o 3."),
    },
  ],
  "waiter/open-table": [
    {
      field: "tableId",
      prompt: (draft, context) =>
        context.tables.length === 0
          ? "No hay mesas configuradas. Configúralas en Mesas."
          : `¿Qué mesa abrimos?\n${formatGhostChatMenu(tableOptions(context))}`,
      options: tableOptions,
      validate: (value, context) =>
        resolveTable(value, context) ? null : "Elige una mesa de la lista.",
    },
  ],
  "waiter/add-table-order": [
    {
      field: "sessionId",
      prompt: (draft, context) =>
        context.openTableSessions.length === 0
          ? "No hay mesas abiertas. Abre una mesa primero."
          : `¿En qué mesa agregamos?\n${formatGhostChatMenu(openSessionOptions(context))}`,
      options: openSessionOptions,
      validate: (value, context) =>
        resolveOpenSession(value, context) ? null : "Elige una mesa abierta.",
    },
    {
      field: "productId",
      prompt: (draft, context) =>
        `¿Qué producto pedimos?\n${formatGhostChatMenu(productOptions(context))}`,
      options: productOptions,
      validate: (value, context) =>
        resolveProductById(value, context) ? null : "Elige un producto.",
    },
    {
      field: "quantity",
      prompt: "¿Cuántas unidades?",
      validate: (value) => (Number(value) > 0 ? null : "Cantidad mayor a 0."),
    },
    {
      field: "confirm",
      prompt: (draft, context) => {
        const product = resolveProductById(draft.productId ?? "", context);
        const session = resolveOpenSession(draft.sessionId ?? "", context);
        return (
          `Confirma pedido mesa **${session?.tableNumber ?? "?"}**:\n` +
          `· **${product?.name}** × ${draft.quantity}\n\n` +
          "¿Lo agrego y envío comanda? (sí / no)"
        );
      },
    },
  ],
  "waiter/send-kitchen": [
    {
      field: "sessionId",
      prompt: (draft, context) =>
        context.openTableSessions.length === 0
          ? "No hay mesas abiertas."
          : `¿Qué mesa enviamos a comanda?\n${formatGhostChatMenu(openSessionOptions(context))}`,
      options: openSessionOptions,
      validate: (value, context) =>
        resolveOpenSession(value, context) ? null : "Elige una mesa abierta.",
    },
  ],
};

function normalizeBaseUnit(value: string): string {
  const map: Record<string, string> = { "1": "g", "2": "ml", "3": "unit", "4": "kg" };
  return map[value.trim().toLowerCase()] ?? value.trim().toLowerCase();
}

function normalizeItemType(value: string): string {
  if (/^(1|materia|raw|raw_material)$/i.test(value)) {
    return "raw_material";
  }
  return "finished_product";
}

function normalizeCategory(value: string): string {
  if (/^1|bebida|beverage$/i.test(value)) {
    return "beverage";
  }
  if (/^2|reposter|pastry|pasteler/i.test(value)) {
    return "pastry";
  }
  return "other";
}

function normalizeStation(value: string): string {
  if (/^2|cocina|kitchen$/i.test(value)) {
    return "kitchen";
  }
  return "bar";
}

function resolveInventoryItem(value: string, context: GhostChatContext) {
  const selected = resolveMenuSelection(value, inventoryOptions(context));
  if (selected) {
    return context.inventoryItems.find((item) => item.id === selected.id) ?? null;
  }
  return (
    context.inventoryItems.find((item) => item.id === value) ??
    context.inventoryItems.find(
      (item) => item.name.toLowerCase() === value.trim().toLowerCase(),
    ) ??
    null
  );
}

function resolveProductById(value: string, context: GhostChatContext) {
  const selected = resolveMenuSelection(value, productOptions(context));
  const id = selected?.id ?? value.trim();
  return context.menuProducts.find((product) => product.id === id) ?? null;
}

function resolveProductByName(value: string, context: GhostChatContext) {
  const normalized = value.trim().toLowerCase();
  return (
    context.menuProducts.find(
      (product) => product.name.toLowerCase() === normalized,
    ) ?? null
  );
}

function resolveTable(value: string, context: GhostChatContext) {
  const selected = resolveMenuSelection(value, tableOptions(context));
  const id = selected?.id ?? value.trim();
  return context.tables.find((table) => table.id === id) ?? null;
}

function resolveOpenSession(value: string, context: GhostChatContext) {
  const selected = resolveMenuSelection(value, openSessionOptions(context));
  const id = selected?.id ?? value.trim();
  return context.openTableSessions.find((session) => session.sessionId === id) ?? null;
}

function resolveKitchenOrder(value: string, context: GhostChatContext) {
  const selected = resolveMenuSelection(value, kitchenOrderOptions(context));
  const id = selected?.id ?? value.trim();
  return context.kitchenOrders.find((order) => order.id === id) ?? null;
}

function getDynamicBeverageSteps(
  productName: string,
  draft: Record<string, string>,
): FlowStep[] {
  const spec = getBeverageAdvancedSetupSpec(productName);
  if (!spec) {
    return [];
  }

  const steps: FlowStep[] = [];
  for (const question of spec.questions) {
    if (!isBeverageQuestionVisible(question, draft)) {
      continue;
    }
    if (draft[question.id]?.trim()) {
      continue;
    }
    steps.push({
      field: question.id,
      prompt: formatBeverageQuestion(question),
      validate: (value) => validateBeverageAnswer(question, value),
    });
    break;
  }

  if (steps.length === 0) {
    steps.push({
      field: "confirm",
      prompt: () =>
        `Confirmación completa para **${spec.displayName}**.\n¿Guardo las respuestas en la ficha de costos? (sí / no)`,
    });
  }

  return steps;
}

function isBeverageQuestionVisible(
  question: BeverageAdvancedSetupQuestion,
  answers: Record<string, string>,
): boolean {
  if (question.id === "milkMl") {
    return answers.includesMilk === "yes";
  }
  if (question.id === "mixerOther") {
    return answers.mixerProduct === "other";
  }
  if (question.id === "brewMethodOther") {
    return answers.brewMethod === "other";
  }
  return true;
}

function formatBeverageQuestion(question: BeverageAdvancedSetupQuestion): string {
  let text = question.label;
  if (question.hint) {
    text += `\n_${question.hint}_`;
  }
  if (question.type === "select" && question.options) {
    text += `\n${question.options.map((option, index) => `${index + 1}. ${option.label}`).join("\n")}`;
  }
  if (question.type === "boolean") {
    text += "\n1. Sí\n2. No";
  }
  return text;
}

function validateBeverageAnswer(
  question: BeverageAdvancedSetupQuestion,
  value: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Necesito una respuesta.";
  }

  if (question.type === "select" && question.options) {
    const asNumber = Number(trimmed);
    if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= question.options.length) {
      return null;
    }
    const match = question.options.find(
      (option) =>
        option.label.toLowerCase() === trimmed.toLowerCase() ||
        option.value.toLowerCase() === trimmed.toLowerCase(),
    );
    return match ? null : "Elige una opción de la lista.";
  }

  if (question.type === "boolean") {
    return /^(1|si|sí|yes|s|2|no|n)$/i.test(trimmed) ? null : "Responde Sí o No.";
  }

  if (question.type === "number") {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? null : "Ingresa un número mayor a 0.";
  }

  return trimmed.length >= 2 ? null : "Escribe al menos 2 caracteres.";
}

function normalizeBeverageAnswer(
  question: BeverageAdvancedSetupQuestion,
  value: string,
): string {
  const trimmed = value.trim();
  if (question.type === "select" && question.options) {
    const asNumber = Number(trimmed);
    if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= question.options.length) {
      return question.options[asNumber - 1]!.value;
    }
    const match = question.options.find(
      (option) =>
        option.label.toLowerCase() === trimmed.toLowerCase() ||
        option.value.toLowerCase() === trimmed.toLowerCase(),
    );
    return match?.value ?? trimmed;
  }
  if (question.type === "boolean") {
    return /^(1|si|sí|yes|s)$/i.test(trimmed) ? "yes" : "no";
  }
  return trimmed;
}

function getFlowSteps(
  session: GhostChatSession,
  context: GhostChatContext,
): FlowStep[] {
  const key = flowKey(session.flowPath);
  if (key === "admin/confirm-beverage-setup" && session.draft.productId) {
    const product =
      context.menuProducts.find((entry) => entry.id === session.draft.productId) ??
      resolveProductByName(session.draft.productName ?? "", context);
    if (product && needsBeverageAdvancedSetup(product.name)) {
      const dynamic = getDynamicBeverageSteps(product.name, session.draft);
      if (dynamic.length > 0) {
        return dynamic;
      }
    }
  }
  return FLOW_STEPS[key] ?? [];
}

function activeStep(
  session: GhostChatSession,
  context: GhostChatContext,
): FlowStep | null {
  const steps = getFlowSteps(session, context);
  return steps[session.stepIndex] ?? null;
}

function buildOrgStatus(context: GhostChatContext): string {
  return (
    `**Estado de ${context.organizationName ?? "la operación"}**\n` +
    `· Facturas: **${context.invoiceCount}**\n` +
    `· Insumos: **${context.inventoryCount}**\n` +
    `· Bebidas Ghost en catálogo: **${context.ghostBeverageCount}**\n` +
    `· Caja: **${context.cashSessionOpen ? "abierta" : "cerrada"}**\n` +
    `· Mesas abiertas: **${context.openTableSessions.length}**\n` +
    `· Comandas activas: **${context.kitchenOrders.length}**\n` +
    (context.beverageSetupPending.length > 0
      ? `· Bebidas por confirmar: **${context.beverageSetupPending.map((entry) => entry.name).join(", ")}**`
      : "· Bebidas avanzadas: **todas confirmadas**")
  );
}

function startFlow(
  role: GhostChatRole,
  flowId: string,
  session: GhostChatSession,
  context: GhostChatContext,
): GhostChatTurnResult {
  if (flowId === "org-status") {
    return {
      session: createEmptyGhostChatSession(),
      ghostMessages: [buildOrgStatus(context)],
      quickReplies: ["menu"],
    };
  }

  if (flowId === "seed-ghost-menu") {
    return {
      session: createEmptyGhostChatSession(),
      ghostMessages: [
        "Voy a cargar la carta Ghost (25 bebidas) y las fichas SCA base cruzando con tu inventario…",
      ],
      quickReplies: [],
      action: { type: "seed-ghost-menu" },
    };
  }

  const nextSession: GhostChatSession = {
    flowPath: [role, flowId],
    stepIndex: 0,
    draft: {},
    role,
  };
  const step = activeStep(nextSession, context);
  const prompt =
    typeof step?.prompt === "function" ? step.prompt(nextSession.draft, context) : step?.prompt;

  return {
    session: nextSession,
    ghostMessages: prompt ? [prompt] : ["Continuemos."],
    quickReplies: step?.options?.(context).map((option) => option.label) ?? [],
  };
}

function handleRootInput(
  input: string,
  session: GhostChatSession,
  context: GhostChatContext,
): GhostChatTurnResult {
  const selection = resolveMenuSelection(input, GHOST_ROOT_MENU);
  if (selection?.id === "free-question") {
    return {
      session: {
        flowPath: ["agent", "free-question"],
        stepIndex: 0,
        draft: {},
        role: null,
      },
      ghostMessages: [
        "Modo **pregunta libre**. Pregúntame lo que necesites sobre café, costos, proveedores o operación.\n" +
          "Buscaré en la web cuando haga falta y guardaré el conocimiento para evolucionar.",
      ],
      quickReplies: [],
    };
  }

  if (!selection && input.includes("?") && input.trim().length >= 12) {
    return {
      session: createEmptyGhostChatSession(),
      ghostMessages: ["Consultando conocimiento y web…"],
      quickReplies: ["menu"],
      action: {
        type: "ghost-agent-query",
        payload: { message: input.trim(), sessionId: `chat-${Date.now()}` },
      },
    };
  }

  if (!selection) {
    return {
      session,
      ghostMessages: [
        "No reconocí esa opción. Elige un rol:\n" + formatGhostChatMenu(GHOST_ROOT_MENU),
      ],
      quickReplies: GHOST_ROOT_MENU.map((option) => option.label),
    };
  }

  const role = selection.id as GhostChatRole;
  const nextSession: GhostChatSession = {
    flowPath: ["role-menu"],
    stepIndex: 0,
    draft: {},
    role,
  };

  return {
    session: nextSession,
    ghostMessages: [
      `Perfecto, modo **${selection.label}**.\n¿Qué hacemos?\n` +
        formatGhostChatMenu(roleMenu(role)),
    ],
    quickReplies: roleMenu(role).map((option) => option.label),
  };
}

function handleRoleMenuInput(
  input: string,
  session: GhostChatSession,
  context: GhostChatContext,
): GhostChatTurnResult {
  if (!session.role) {
    return resetToRoot(context);
  }

  const options = roleMenu(session.role);
  const selection = resolveMenuSelection(input, options);
  if (!selection) {
    return {
      session,
      ghostMessages: [
        "Elige una tarea:\n" + formatGhostChatMenu(options),
      ],
      quickReplies: options.map((option) => option.label),
    };
  }

  return startFlow(session.role, selection.id, session, context);
}

function resetToRoot(context: GhostChatContext): GhostChatTurnResult {
  return {
    session: createEmptyGhostChatSession(),
    ghostMessages: [ghostChatGreeting(context.organizationName)],
    quickReplies: GHOST_ROOT_MENU.map((option) => option.label),
  };
}

function buildAction(
  session: GhostChatSession,
  context: GhostChatContext,
): GhostChatAction | undefined {
  const key = flowKey(session.flowPath);
  const draft = session.draft;

  if (/^(no|n|cancelar|2)$/i.test(draft.confirm ?? "")) {
    return undefined;
  }

  switch (key) {
    case "admin/add-inventory-item":
      return {
        type: "create-inventory-item",
        payload: {
          name: draft.name ?? "",
          sku: draft.sku ?? "",
          baseUnit: normalizeBaseUnit(draft.baseUnit ?? "unit"),
          type: normalizeItemType(draft.type ?? "raw_material"),
        },
      };
    case "admin/purchase-invoice": {
      const item = resolveInventoryItem(draft.inventoryItemId ?? "", context);
      return {
        type: "create-purchase-invoice",
        payload: {
          supplierName: draft.supplierName ?? "",
          invoiceNumber: draft.invoiceNumber ?? "",
          invoiceDate: draft.invoiceDate ?? "",
          inventoryItemId: item?.id ?? draft.inventoryItemId ?? "",
          itemName: item?.name ?? "",
          quantity: draft.quantity ?? "1",
          unitCost: draft.unitCost ?? "0",
        },
      };
    }
    case "admin/add-menu-product":
      return {
        type: "create-menu-product",
        payload: {
          name: draft.name ?? "",
          price: draft.price ?? "0",
          category: normalizeCategory(draft.category ?? "beverage"),
          station: normalizeStation(draft.station ?? "bar"),
        },
      };
    case "admin/confirm-beverage-setup": {
      const product =
        context.menuProducts.find((entry) => entry.id === draft.productId) ??
        resolveProductByName(draft.productName ?? "", context);
      return {
        type: "save-beverage-setup",
        payload: {
          productId: draft.productId ?? product?.id ?? "",
          productName: product?.name ?? draft.productName ?? "",
          answers: { ...draft },
        },
      };
    }
    case "cashier/open-cash":
      return {
        type: "open-cash-session",
        payload: { openingAmount: Number(draft.openingAmount ?? 0) },
      };
    case "cashier/close-cash":
      return {
        type: "close-cash-session",
        payload: {
          sessionId: draft.sessionId ?? "",
          countedAmount: Number(draft.countedAmount ?? 0),
          expectedAmount: Number(draft.expectedAmount ?? 0),
        },
      };
    case "cashier/cash-outflow":
      return {
        type: "register-cash-outflow",
        payload: {
          sessionId: draft.sessionId ?? "",
          amount: Number(draft.amount ?? 0),
          reason: draft.reason ?? "",
          movementType: draft.movementType ?? "outflow",
        },
      };
    case "cashier/cash-inflow":
      return {
        type: "register-cash-inflow",
        payload: {
          sessionId: draft.sessionId ?? "",
          amount: Number(draft.amount ?? 0),
          reason: draft.reason ?? "",
          movementType: draft.movementType ?? "inflow",
        },
      };
    case "cashier/counter-sale": {
      const product = resolveProductById(draft.productId ?? "", context);
      return {
        type: "create-counter-sale",
        payload: {
          productId: product?.id ?? draft.productId ?? "",
          productName: product?.name ?? draft.productName ?? "",
          unitPrice: String(product?.price ?? 0),
          quantity: draft.quantity ?? "1",
          paymentMethod: parsePaymentMethod(draft.paymentMethod ?? "") ?? "cash",
          station: product?.station ?? "bar",
          documentType: draft.documentType ?? "",
          customerName: draft.customerName ?? "",
          customerEmail: draft.customerEmail ?? "",
        },
      };
    }
    case "cashier/update-kitchen-order":
      return {
        type: "update-kitchen-order",
        payload: {
          orderId: draft.orderId ?? "",
          status: parseKitchenOrderStatus(draft.status ?? "") ?? "preparing",
        },
      };
    case "waiter/open-table": {
      const table = resolveTable(draft.tableId ?? "", context);
      return {
        type: "open-table",
        payload: {
          tableId: table?.id ?? draft.tableId ?? "",
          tableNumber: String(table?.number ?? ""),
          qrToken: table?.qrToken ?? "",
        },
      };
    }
    case "waiter/add-table-order": {
      const product = resolveProductById(draft.productId ?? "", context);
      const tableSession = resolveOpenSession(draft.sessionId ?? "", context);
      return {
        type: "add-table-order",
        payload: {
          sessionId: tableSession?.sessionId ?? draft.sessionId ?? "",
          guestToken: tableSession?.guestToken ?? draft.guestToken ?? "",
          tableId: draft.tableId ?? tableSession?.tableId ?? "",
          tableNumber: draft.tableNumber ?? String(tableSession?.tableNumber ?? ""),
          qrToken: draft.qrToken ?? "",
          productId: product?.id ?? "",
          productName: product?.name ?? draft.productName ?? "",
          unitPrice: String(product?.price ?? 0),
          quantity: draft.quantity ?? "1",
          station: product?.station ?? "bar",
        },
      };
    }
    case "cashier/checkout-table": {
      return {
        type: "checkout-table",
        payload: {
          sessionId: draft.sessionId ?? "",
          tableNumber: draft.tableNumber ?? "",
          paymentMethod: draft.paymentMethod ?? "cash",
          documentType: draft.documentType ?? "factura",
          customerEmail: draft.customerEmail ?? "skip",
        },
      };
    }
    case "waiter/send-kitchen":
      return {
        type: "send-kitchen",
        payload: { sessionId: draft.sessionId ?? "" },
      };
    case "admin/build-recipe-cost":
      return {
        type: "build-recipe-cost",
        payload: {
          productId: draft.productId ?? "",
          productName: draft.productName ?? "",
        },
      };
    case "admin/save-recipe-cost":
      return {
        type: "save-recipe-cost",
        payload: { ...draft },
      };
    case "admin/delete-menu-product":
      return {
        type: "delete-menu-product",
        payload: {
          productId: draft.productId ?? "",
          productName: draft.productName ?? "",
        },
      };
    case "admin/update-menu-product":
      return {
        type: "update-menu-product",
        payload: {
          productId: draft.productId ?? "",
          productName: draft.productName ?? "",
          price: draft.price ?? "",
          status: draft.status ?? "",
        },
      };
    case "admin/inventory-movement":
      return {
        type: "register-inventory-movement",
        payload: {
          inventoryItemId: draft.inventoryItemId ?? "",
          itemName: draft.itemName ?? "",
          quantity: draft.quantity ?? "1",
          movementType: draft.movementType ?? "entry",
        },
      };
    case "admin/create-fixed-expense":
      return {
        type: "create-fixed-expense",
        payload: {
          name: draft.name ?? "",
          amount: draft.amount ?? "0",
          frequency: draft.frequency ?? "monthly",
          category: draft.category ?? "other",
        },
      };
    case "waiter/cancel-table":
      return {
        type: "cancel-table-session",
        payload: {
          sessionId: draft.sessionId ?? "",
          tableId: draft.tableId ?? "",
          tableNumber: draft.tableNumber ?? "",
        },
      };
    case "admin/create-dining-table":
      return {
        type: "create-dining-table",
        payload: {
          tableNumber: draft.tableNumber ?? "",
          label: draft.label ?? "",
        },
      };
    case "admin/create-warehouse":
      return {
        type: "create-warehouse",
        payload: {
          name: draft.name ?? "",
        },
      };
    default:
      return undefined;
  }
}

export function processGhostChatTurn(
  input: string,
  session: GhostChatSession,
  context: GhostChatContext,
  history: GhostConversationHistoryMessage[] = [],
): GhostChatTurnResult {
  const result = processConversationTurn({
    message: input,
    session,
    context: context as GhostConversationContext,
    history,
  });

  if (result.kind === "reply") {
    return {
      session: result.session,
      ghostMessages: result.messages,
      quickReplies: [],
    };
  }

  if (result.kind === "agent") {
    return {
      session: result.session,
      ghostMessages: result.messages,
      quickReplies: [],
      action: {
        type: "ghost-agent-query",
        payload: {
          message: result.message,
          sessionId: result.session.agentSessionId ?? `chat-${Date.now()}`,
          contextSummary: buildConversationContextSummary(context as GhostConversationContext),
          history,
        },
      },
    };
  }

  if (result.intent === "seed-ghost-menu") {
    return {
      session: result.session,
      ghostMessages: result.messages,
      quickReplies: [],
      action: { type: "seed-ghost-menu" },
    };
  }

  const actionSession: GhostChatSession = {
    flowPath: flowPathForIntent(result.intent),
    stepIndex: 999,
    draft: result.draft,
    role: (flowPathForIntent(result.intent)[0] as GhostChatRole | undefined) ?? null,
    pendingIntent: null,
    agentSessionId: session.agentSessionId,
  };
  const action = buildAction(actionSession, context);

  return {
    session: result.session,
    ghostMessages: result.messages,
    quickReplies: [],
    action,
  };
}

export function createInitialGhostChatTurn(context: GhostChatContext): GhostChatTurnResult {
  const initial = createInitialConversationTurn(context as GhostConversationContext);
  if (initial.kind !== "reply") {
    return {
      session: createEmptyGhostChatSession(),
      ghostMessages: [ghostChatGreeting(context.organizationName)],
      quickReplies: [],
    };
  }

  return {
    session: initial.session,
    ghostMessages: initial.messages,
    quickReplies: [],
  };
}

export function formatGhostActionSuccess(action: GhostChatAction, result?: string): string {
  switch (action.type) {
    case "create-inventory-item":
      return `Insumo **${action.payload.name}** creado en inventario.`;
    case "create-purchase-invoice":
      return `Factura **${action.payload.invoiceNumber}** de ${action.payload.supplierName} registrada y confirmada.`;
    case "create-menu-product":
      return `Producto **${action.payload.name}** agregado al catálogo.`;
    case "save-beverage-setup":
      return result ?? "Respuestas de barra guardadas en la ficha de costos.";
    case "seed-ghost-menu":
      return result ?? "Carta Ghost y fichas SCA cargadas.";
    case "open-cash-session":
      return `Caja abierta con **$${action.payload.openingAmount.toLocaleString("es-CO")}**.`;
    case "close-cash-session":
      return result ?? "Caja cerrada correctamente.";
    case "register-cash-outflow":
      return result ?? `Salida de **$${action.payload.amount.toLocaleString("es-CO")}** registrada.`;
    case "register-cash-inflow":
      return result ?? `Entrada de **$${action.payload.amount.toLocaleString("es-CO")}** registrada.`;
    case "build-recipe-cost":
      return result ?? `Ficha de costos de **${action.payload.productName}** actualizada.`;
    case "save-recipe-cost":
      return result ?? `Ficha de **${action.payload.productName ?? "producto"}** guardada en la matriz de costos.`;
    case "create-counter-sale":
      return `Venta registrada: **${action.payload.productName}** × ${action.payload.quantity}. Comanda enviada.`;
    case "open-table":
      return `Mesa **${action.payload.tableNumber}** abierta.`;
    case "add-table-order":
      return `Pedido anotado: **${action.payload.productName}** × ${action.payload.quantity}. Comanda enviada.`;
    case "checkout-table":
      return result ?? "Mesa cobrada y comprobante generado.";
    case "send-kitchen":
      return "Comanda enviada a barra/cocina.";
    case "update-kitchen-order":
      return `Comanda actualizada a **${action.payload.status}**.`;
    case "delete-menu-product":
      return `Producto **${action.payload.productName}** eliminado del menú.`;
    case "update-menu-product":
      return result ?? `Producto **${action.payload.productName}** actualizado.`;
    case "register-inventory-movement":
      return result ?? `Movimiento de inventario registrado.`;
    case "create-fixed-expense":
      return `Gasto fijo **${action.payload.name}** creado.`;
    case "cancel-table-session":
      return `Mesa **${action.payload.tableNumber || "?"}** cancelada sin cobro.`;
    case "create-dining-table":
      return `Mesa **${action.payload.tableNumber}** creada.`;
    case "create-warehouse":
      return `Bodega **${action.payload.name}** creada.`;
    case "ghost-agent-query":
      return result ?? "Aquí está lo que encontré.";
    default:
      return "Listo.";
  }
}

export function formatGhostActionError(action: GhostChatAction, error: string): string {
  return `No pude completar la acción (${action.type}): ${error}\n\nEscribe **menu** para intentar otra tarea.`;
}

export { GHOST_ASSISTANT_NAME };
