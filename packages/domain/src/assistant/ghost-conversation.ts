import {
  createEmptyGhostChatSession,
  ghostChatGreeting,
  isGhostChatGlobalCommand,
  parseKitchenOrderStatus,
  parsePaymentMethod,
  type GhostChatSession,
} from "./ghost-chat.js";
import { buildGhostAgentFallbackAnswer } from "../ai/agent.js";
import type { PaymentMethod, SaleStatus } from "../pos/sale.js";
import {
  buildCashSummaryReply,
  buildFinancialOverviewReply,
  buildFixedExpensesReply,
  buildInventoryLowStockReply,
  buildKitchenStatusReply,
  buildPurchasesReportReply,
  buildPurchasesReviewReply,
  buildPurchaseSuggestionsReply,
  buildSalesReportReply,
  buildWorkShiftsReply,
  buildCostMatrixOverviewReply,
  buildRecipeCostPreviewReply,
  buildSingleProductCostReply,
  buildInventoryCatalogReply,
  buildMenuCatalogReply,
  buildTablesStatusReply,
  buildDailyBriefingReply,
  buildPlatformGuideReply,
} from "./brain-responses.js";
import {
  buildDailyOperationsBriefing,
  briefingInputFromGhostContext,
} from "./daily-briefing.js";
import {
  extractRecipePriceFromMessage,
  extractYieldQuantityFromMessage,
  isBuildRecipeCostMessage,
  isCostMatrixQueryMessage,
  isSaveRecipeCostMessage,
  parseIngredientLinesFromMessage,
} from "./cost-matrix-conversation.js";
import { buildBrainHelpMessage, classifyBrainQueryIntent } from "./ghost-brain.js";

export type GhostConversationIntent =
  | "org-status"
  | "brain-help"
  | "query-sales-report"
  | "query-purchases-review"
  | "query-purchases-report"
  | "query-purchase-suggestions"
  | "query-cash-summary"
  | "query-financial-overview"
  | "query-inventory-low-stock"
  | "query-fixed-expenses"
  | "query-work-shifts"
  | "query-kitchen-status"
  | "query-cost-matrix"
  | "build-recipe-cost"
  | "save-recipe-cost"
  | "create-inventory-item"
  | "create-purchase-invoice"
  | "create-menu-product"
  | "open-cash-session"
  | "close-cash-session"
  | "register-cash-outflow"
  | "register-cash-inflow"
  | "create-counter-sale"
  | "open-table"
  | "add-table-order"
  | "checkout-table"
  | "send-kitchen"
  | "update-kitchen-order"
  | "seed-ghost-menu"
  | "delete-menu-product"
  | "update-menu-product"
  | "register-inventory-movement"
  | "create-fixed-expense"
  | "cancel-table-session"
  | "create-dining-table"
  | "create-warehouse"
  | "query-menu-catalog"
  | "query-inventory-catalog"
  | "query-tables-status"
  | "query-daily-briefing"
  | "query-platform-guide"
  | "agent-query";

export interface GhostConversationInventoryItem {
  id: string;
  name: string;
  sku: string;
  baseUnit: string;
  minStock?: number;
}

export interface GhostConversationInventoryStockSnapshot {
  itemId: string;
  name: string;
  baseUnit: string;
  quantity: number;
  minStock: number;
}

export interface GhostConversationMovementSnapshot {
  itemId: string;
  type: string;
  quantity: number;
  occurredAt: string;
}

export interface GhostConversationPriceHistorySnapshot {
  inventoryItemId: string;
  supplierName: string;
  unitPriceNet: number;
  purchasedAt: string;
}

export interface GhostConversationFixedExpenseSnapshot {
  name: string;
  category: string;
  amount: number;
  frequency: string;
  monthlyEquivalent: number;
  dueDay?: number;
  isActive: boolean;
}

export interface GhostConversationWorkShiftSnapshot {
  staffName: string;
  role: "bar" | "cashier" | "kitchen" | "manager" | "other";
  shiftDate: string;
  startTime: string;
  endTime: string;
}

export interface GhostConversationProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  station: string;
  status?: string;
  saleTaxCategory?: string;
  recipeCost?: number;
}

export interface GhostConversationRecipeSnapshot {
  menuProductId: string;
  productName: string;
  yieldQuantity: number;
  recipeCost: number;
  lines: Array<{
    inventoryItemId: string;
    itemName: string;
    quantity: number;
    unit: string;
  }>;
}

export interface GhostConversationInventoryCostSnapshot {
  itemId: string;
  name: string;
  baseUnit: string;
  averageCost: number;
  purchaseUnit?: string;
  presentationQuantity?: number;
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

export interface GhostConversationTableSessionLine {
  name: string;
  quantity: number;
  lineTotal: number;
}

export interface GhostConversationTableSession {
  sessionId: string;
  tableId: string;
  tableNumber: number;
  guestToken: string;
  lines?: GhostConversationTableSessionLine[];
  total?: number;
}

export interface GhostConversationCashMovementSnapshot {
  type: string;
  amount: number;
  reason: string;
  occurredAt: string;
}

export interface GhostConversationCashSnapshot {
  sessionId: string;
  openingAmount: number;
  cashSalesTotal: number;
  expectedAmount: number;
  inflowsTotal: number;
  outflowsTotal: number;
  movements: GhostConversationCashMovementSnapshot[];
}

export interface GhostConversationSaleSnapshot {
  soldAt: string;
  soldOn: string;
  status: SaleStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  tableNumber?: number;
  lines: Array<{ name: string; quantity: number; lineTotal: number }>;
}

export interface GhostConversationPurchaseSnapshot {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: string;
}

export interface GhostConversationCostMatrixSettings {
  targetFoodCostPct: number;
  targetBeverageCostPct: number;
  reteIvaPct: number;
  reteFuenteServicesPct: number;
  reteFuenteGoodsPct: number;
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
  salesSnapshot: GhostConversationSaleSnapshot[];
  purchasesSnapshot: GhostConversationPurchaseSnapshot[];
  cashSnapshot?: GhostConversationCashSnapshot;
  inventoryStockSnapshot: GhostConversationInventoryStockSnapshot[];
  fixedExpensesSnapshot: GhostConversationFixedExpenseSnapshot[];
  workShiftsSnapshot: GhostConversationWorkShiftSnapshot[];
  recipesSnapshot: GhostConversationRecipeSnapshot[];
  inventoryCostSnapshot: GhostConversationInventoryCostSnapshot[];
  inventoryMovementsSnapshot?: GhostConversationMovementSnapshot[];
  purchasePriceHistorySnapshot?: GhostConversationPriceHistorySnapshot[];
  costMatrixSettings?: GhostConversationCostMatrixSettings;
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

type ExecutableGhostConversationIntent = Exclude<
  GhostConversationIntent,
  | "org-status"
  | "brain-help"
  | "query-sales-report"
  | "query-purchases-review"
  | "query-purchases-report"
  | "query-purchase-suggestions"
  | "query-cash-summary"
  | "query-financial-overview"
  | "query-inventory-low-stock"
  | "query-fixed-expenses"
  | "query-work-shifts"
  | "query-kitchen-status"
  | "query-cost-matrix"
  | "query-menu-catalog"
  | "query-inventory-catalog"
  | "query-tables-status"
  | "query-daily-briefing"
  | "agent-query"
>;

const INTENT_FLOW_KEY: Record<ExecutableGhostConversationIntent, string> = {
  "create-inventory-item": "admin/add-inventory-item",
  "create-purchase-invoice": "admin/purchase-invoice",
  "create-menu-product": "admin/add-menu-product",
  "open-cash-session": "cashier/open-cash",
  "close-cash-session": "cashier/close-cash",
  "register-cash-outflow": "cashier/cash-outflow",
  "register-cash-inflow": "cashier/cash-inflow",
  "create-counter-sale": "cashier/counter-sale",
  "open-table": "waiter/open-table",
  "add-table-order": "waiter/add-table-order",
  "checkout-table": "cashier/checkout-table",
  "send-kitchen": "waiter/send-kitchen",
  "update-kitchen-order": "cashier/update-kitchen-order",
  "seed-ghost-menu": "admin/seed-ghost-menu",
  "build-recipe-cost": "admin/build-recipe-cost",
  "save-recipe-cost": "admin/save-recipe-cost",
  "delete-menu-product": "admin/delete-menu-product",
  "update-menu-product": "admin/update-menu-product",
  "register-inventory-movement": "admin/inventory-movement",
  "create-fixed-expense": "admin/create-fixed-expense",
  "cancel-table-session": "waiter/cancel-table",
  "create-dining-table": "admin/create-dining-table",
  "create-warehouse": "admin/create-warehouse",
};

const REQUIRED_FIELDS: Record<string, string[]> = {
  "create-inventory-item": ["name"],
  "create-purchase-invoice": ["supplierName", "inventoryItemId", "quantity", "unitCost"],
  "create-menu-product": ["name", "price"],
  "open-cash-session": ["openingAmount"],
  "close-cash-session": ["sessionId", "countedAmount"],
  "register-cash-outflow": ["sessionId", "amount", "reason"],
  "register-cash-inflow": ["sessionId", "amount", "reason"],
  "create-counter-sale": ["productId"],
  "open-table": ["tableId"],
  "add-table-order": ["productId"],
  "checkout-table": ["sessionId", "documentType", "paymentMethod", "customerEmail"],
  "send-kitchen": ["sessionId"],
  "update-kitchen-order": ["orderId", "status"],
  "build-recipe-cost": ["productId"],
  "save-recipe-cost": ["productId", "recipeLines"],
  "delete-menu-product": ["productId"],
  "update-menu-product": ["productId"],
  "register-inventory-movement": ["inventoryItemId", "quantity", "movementType"],
  "create-fixed-expense": ["name", "amount"],
  "cancel-table-session": ["sessionId"],
  "create-dining-table": ["tableNumber"],
  "create-warehouse": ["name"],
};

const FIELD_PROMPTS: Record<string, string> = {
  name: "¿Cómo se llama?",
  supplierName: "¿De qué proveedor es?",
  inventoryItemId: "¿Qué insumo compraste?",
  quantity: "¿Cuántas unidades o gramos?",
  unitCost: "¿Cuál fue el costo unitario en COP?",
  price: "¿A qué precio lo vendes (COP)?",
  openingAmount: "¿Con cuánto efectivo abres caja?",
  countedAmount: "¿Cuánto efectivo contaste en caja al cerrar?",
  amount: "¿Cuál es el monto del movimiento en COP?",
  reason: "¿Cuál es el motivo? (ej. domicilios, propinas, compra menor)",
  productId: "¿Qué producto de la carta?",
  tableId: "¿Qué mesa?",
  sessionId: "¿En qué mesa va el pedido?",
  orderId: "¿Qué comanda actualizamos?",
  status: "¿La marco como preparando, lista o entregada?",
  documentType:
    "¿Lo emito como **factura de venta** o como **cuenta de cobro**?",
  customerEmail:
    "¿A qué correo envío el comprobante en PDF? Si no hace falta, di **no**.",
  recipeLines:
    "¿Qué ingredientes lleva? Ejemplo: «18g café caturra, 200ml leche entera, precio 12000».",
  movementType: "¿Es entrada, salida, merma o ajuste de inventario?",
  tableNumber: "¿Qué número de mesa?",
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

const WORD_QUANTITIES: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};

function extractQuantity(message: string): string | null {
  const stripped = message.replace(/mesa\s*#?\s*\d+/gi, " ");
  const digitMatch = stripped.match(/\b(\d+)\s*(?:x|unidades|uds)?\b/i);
  if (digitMatch?.[1]) {
    return digitMatch[1];
  }

  const normalized = normalizeText(stripped);
  for (const [word, quantity] of Object.entries(WORD_QUANTITIES)) {
    if (new RegExp(`\\b${word}\\b`).test(normalized)) {
      return String(quantity);
    }
  }

  return null;
}

function mentionsTable(message: string): boolean {
  return extractTableNumber(message) !== null || /mesa/i.test(message);
}

function isTableCheckoutMessage(normalized: string, message: string): boolean {
  if (!mentionsTable(message)) {
    return false;
  }

  if (/(proveedor|compra|registr|llego)/.test(normalized)) {
    return false;
  }

  return /(cuenta|cobrar|cerrar cuenta|la cuenta|pagar mesa|factura de venta|cuenta de cobro)/.test(
    normalized,
  );
}

function isTableOrderMessage(
  normalized: string,
  message: string,
  context: GhostConversationContext,
): boolean {
  if (!mentionsTable(message)) {
    return false;
  }

  if (isTableCheckoutMessage(normalized, message)) {
    return false;
  }

  const mentionedProduct = findByName(message, context.menuProducts);
  if (mentionedProduct) {
    return true;
  }

  return /(dame|pon|trae|anota|agrega|quiero|sirve|manda|para la mesa|en la mesa)/.test(
    normalized,
  );
}

function isExplicitOpenTable(normalized: string): boolean {
  return /(abrir mesa|abre la mesa|abre mesa)/.test(normalized);
}

function isPurchaseInvoiceMessage(
  normalized: string,
  message: string,
  context: GhostConversationContext,
): boolean {
  if (mentionsTable(message)) {
    return false;
  }

  if (isCustomerSaleMessage(normalized, message, context)) {
    return false;
  }

  if (
    /(proveedor|registr.*compra|compre|llego.*compra|factura de compra|compra de|compra a)/.test(
      normalized,
    )
  ) {
    return true;
  }

  const inventory = findByName(message, context.inventoryItems);
  const product = findByName(message, context.menuProducts);

  if (/factura/.test(normalized) && inventory && !product) {
    return true;
  }

  return false;
}

function isCustomerSaleMessage(
  normalized: string,
  message: string,
  context: GhostConversationContext,
): boolean {
  if (mentionsTable(message)) {
    return false;
  }

  if (isTableCheckoutMessage(normalized, message)) {
    return false;
  }

  if (/(proveedor|factura de compra|compra de|compra a|registr.*compra)/.test(normalized)) {
    return false;
  }

  const product = findByName(message, context.menuProducts);

  if (/(factura de venta|facturar|factura al|emite factura|cuenta de cobro)/.test(normalized)) {
    return true;
  }

  if (product && /factura/.test(normalized)) {
    return true;
  }

  if (
    product &&
    /(vend|cobra|cobro|mostrador|venta de|para llevar|dame|quiero|un |una |dos |tres )/.test(
      normalized,
    )
  ) {
    return true;
  }

  if (!product && /(vend|cobra|mostrador|venta de)/.test(normalized)) {
    return true;
  }

  return false;
}

function parseDocumentType(message: string): string | null {
  const normalized = normalizeText(message);
  if (/(factura de compra|compra a proveedor)/.test(normalized)) {
    return null;
  }
  if (/(cuenta de cobro|cuenta cobro)/.test(normalized)) {
    return "cuenta_cobro";
  }
  if (/(factura de venta|facturar|factura|comprobante)/.test(normalized)) {
    return "factura";
  }
  return null;
}

function extractCustomerName(message: string): string | null {
  const patterns = [
    /(?:cliente|a nombre de|para)\s+([A-Za-záéíóúÁÉÍÓÚñÑ][A-Za-záéíóúÁÉÍÓÚñÑ\s]{1,40})/i,
    /factura\s+(?:al|para el|para la)\s+cliente\s+([A-Za-záéíóúÁÉÍÓÚñÑ][A-Za-záéíóúÁÉÍÓÚñÑ\s]{1,40})/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    const name = match?.[1]?.trim();
    if (name && !/^(efectivo|tarjeta|transferencia|mesa|un|una|dos|tres|\d+)/i.test(name)) {
      return name;
    }
  }

  return null;
}

function extractEmail(message: string): string | null {
  const match = message.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return match?.[0] ?? null;
}

function resolveTableSession(
  message: string,
  context: GhostConversationContext,
): GhostConversationTableSession | null {
  const tableNumber = extractTableNumber(message);
  if (tableNumber) {
    return context.openTableSessions.find((entry) => entry.tableNumber === tableNumber) ?? null;
  }

  return context.openTableSessions[0] ?? null;
}

function resolveTableByMessage(
  message: string,
  context: GhostConversationContext,
): GhostConversationContext["tables"][number] | null {
  const tableNumber = extractTableNumber(message);
  if (tableNumber) {
    return context.tables.find((entry) => entry.number === tableNumber) ?? null;
  }

  return (
    findByName(
      message,
      context.tables.map((table) => ({ ...table, name: `mesa ${table.number}` })),
    ) ?? null
  );
}

function buildTableBillPreview(
  context: GhostConversationContext,
  sessionId: string,
): string | null {
  const session = context.openTableSessions.find((entry) => entry.sessionId === sessionId);
  if (!session?.lines?.length) {
    return null;
  }

  const lines = session.lines
    .map(
      (line) =>
        `· ${line.quantity} × ${line.name} — **$${line.lineTotal.toLocaleString("es-CO")}**`,
    )
    .join("\n");
  const total = session.total ?? session.lines.reduce((sum, line) => sum + line.lineTotal, 0);

  return (
    `Cuenta **mesa ${session.tableNumber}**:\n${lines}\n\n` +
    `**Total: $${total.toLocaleString("es-CO")}**`
  );
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
  const mentionedInventory = findByName(message, context.inventoryItems);

  const brainQuery = classifyBrainQueryIntent(message);
  if (brainQuery === "brain-help") {
    return "brain-help";
  }
  if (brainQuery === "query-sales-report") {
    return "query-sales-report";
  }
  if (brainQuery === "query-purchases-review") {
    return "query-purchases-review";
  }
  if (brainQuery === "query-purchases-report") {
    return "query-purchases-report";
  }
  if (brainQuery === "query-purchase-suggestions") {
    return "query-purchase-suggestions";
  }
  if (brainQuery === "query-cash-summary") {
    return "query-cash-summary";
  }
  if (brainQuery === "query-inventory-low-stock") {
    return "query-inventory-low-stock";
  }
  if (brainQuery === "query-fixed-expenses") {
    return "query-fixed-expenses";
  }
  if (brainQuery === "query-work-shifts") {
    return "query-work-shifts";
  }
  if (brainQuery === "query-kitchen-status") {
    return "query-kitchen-status";
  }
  if (brainQuery === "query-cost-matrix") {
    return "query-cost-matrix";
  }
  if (brainQuery === "query-menu-catalog") {
    return "query-menu-catalog";
  }
  if (brainQuery === "query-inventory-catalog") {
    return "query-inventory-catalog";
  }
  if (brainQuery === "query-tables-status") {
    return "query-tables-status";
  }
  if (brainQuery === "query-financial-overview") {
    return "query-financial-overview";
  }
  if (brainQuery === "query-daily-briefing") {
    return "query-daily-briefing";
  }
  if (brainQuery === "query-platform-guide") {
    return "query-platform-guide";
  }
  if (brainQuery === "org-status") {
    return "org-status";
  }

  if (/(cargar carta|carta ghost|seed|menu ghost|actualiza matriz de costos|refresca matriz de costos)/.test(normalized)) {
    return "seed-ghost-menu";
  }
  if (
    (/(elimina|borra|quita|remueve)/.test(normalized) &&
      (/(del menu|de la carta|del catalogo|producto)/.test(normalized) ||
        findByName(message, context.menuProducts))) ||
    /elimina\s+.+\s+del\s+menu/i.test(message)
  ) {
    return "delete-menu-product";
  }
  if (
    (/(cambia|actualiza|ajusta|pon)\s+(el\s+)?precio/.test(normalized) ||
      /(desactiva|activa|inactiva)\s+/.test(normalized)) &&
    findByName(message, context.menuProducts)
  ) {
    return "update-menu-product";
  }
  if (
    /(entrada de|ingreso de|salida de|egreso de|merma de|ajuste de|registra entrada|registra salida)/.test(
      normalized,
    ) &&
    findByName(message, context.inventoryItems)
  ) {
    return "register-inventory-movement";
  }
  if (/(nuevo gasto fijo|crear gasto fijo|registra gasto fijo|gasto recurrente)/.test(normalized)) {
    return "create-fixed-expense";
  }
  if (/(cancela|anula|cierra sin cobrar).{0,16}mesa/.test(normalized)) {
    return "cancel-table-session";
  }
  if (/(nueva mesa|crea mesa|agrega mesa|crear mesa)/.test(normalized)) {
    return "create-dining-table";
  }
  if (/(nueva bodega|crea bodega|agrega bodega|crear bodega)/.test(normalized)) {
    return "create-warehouse";
  }
  if (isSaveRecipeCostMessage(message, normalized)) {
    return "save-recipe-cost";
  }
  if (isBuildRecipeCostMessage(normalized) && findByName(message, context.menuProducts)) {
    return "build-recipe-cost";
  }
  if (isCostMatrixQueryMessage(normalized)) {
    return "query-cost-matrix";
  }
  if (/(abrir caja|abre caja|fondo inicial)/.test(normalized)) {
    return "open-cash-session";
  }
  if (/(cierra caja|cerrar caja|cierre de caja)/.test(normalized)) {
    return "close-cash-session";
  }
  if (
    context.cashSessionOpen &&
    /(salida de dinero|egreso de caja|gasto de caja|retiro de caja)/.test(normalized)
  ) {
    return "register-cash-outflow";
  }
  if (
    context.cashSessionOpen &&
    /(entrada de dinero|ingreso de caja|deposito en caja|entrada a caja)/.test(normalized)
  ) {
    return "register-cash-inflow";
  }
  if (isTableCheckoutMessage(normalized, message)) {
    return "checkout-table";
  }
  if (isTableOrderMessage(normalized, message, context)) {
    return "add-table-order";
  }
  if (isCustomerSaleMessage(normalized, message, context)) {
    return "create-counter-sale";
  }
  if (isPurchaseInvoiceMessage(normalized, message, context)) {
    return "create-purchase-invoice";
  }
  if (
    /(nuevo insumo|agregar insumo|crear insumo|anadir insumo)/.test(normalized) ||
    (/(agrega|crea|anota)\s+/i.test(message) &&
      mentionedInventory &&
      !findByName(message, context.menuProducts) &&
      !mentionsTable(message))
  ) {
    return "create-inventory-item";
  }
  if (/(nuevo producto|agregar.*catalogo|producto en menu)/.test(normalized)) {
    return "create-menu-product";
  }
  if (isExplicitOpenTable(normalized)) {
    return "open-table";
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
      (/(factura de compra|compra a)/i.test(message)
        ? message.match(/(?:compra a|factura de compra(?:\s+de)?)\s+([^,.\n]{2,40})/i)
        : null);
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

  if (intent === "close-cash-session") {
    const amount = extractNumber(message);
    if (amount !== null) {
      draft.countedAmount = String(amount);
    }
    if (context.cashSnapshot?.sessionId) {
      draft.sessionId = context.cashSnapshot.sessionId;
    }
    if (context.cashSnapshot?.expectedAmount !== undefined) {
      draft.expectedAmount = String(context.cashSnapshot.expectedAmount);
    }
  }

  if (intent === "register-cash-outflow") {
    const amount = extractNumber(message);
    if (amount !== null) {
      draft.amount = String(amount);
    }
    if (context.cashSnapshot?.sessionId) {
      draft.sessionId = context.cashSnapshot.sessionId;
    }
    const reasonMatch = message.match(/(?:por|para|motivo)\s+(.+)/i);
    if (reasonMatch?.[1]) {
      draft.reason = reasonMatch[1].trim();
    } else if (!draft.reason) {
      const cleaned = message
        .replace(/(salida de dinero|egreso de caja|gasto de caja|retiro de caja|pago en efectivo)/gi, "")
        .replace(/(?:\$|cop)?\s*[\d][\d.,]*/gi, "")
        .trim();
      if (cleaned.length >= 3) {
        draft.reason = cleaned;
      }
    }
    draft.movementType = draft.movementType || "outflow";
  }

  if (intent === "register-cash-inflow") {
    const amount = extractNumber(message);
    if (amount !== null) {
      draft.amount = String(amount);
    }
    if (context.cashSnapshot?.sessionId) {
      draft.sessionId = context.cashSnapshot.sessionId;
    }
    const reasonMatch = message.match(/(?:por|para|motivo)\s+(.+)/i);
    if (reasonMatch?.[1]) {
      draft.reason = reasonMatch[1].trim();
    } else if (!draft.reason) {
      const cleaned = message
        .replace(
          /(entrada de dinero|ingreso de caja|deposito en caja|entrada a caja|recibo en efectivo)/gi,
          "",
        )
        .replace(/(?:\$|cop)?\s*[\d][\d.,]*/gi, "")
        .trim();
      if (cleaned.length >= 3) {
        draft.reason = cleaned;
      }
    }
    draft.movementType = draft.movementType || "inflow";
  }

  if (intent === "create-counter-sale") {
    const product = findByName(message, context.menuProducts);
    if (product) {
      draft.productId = product.id;
      draft.productName = product.name;
    }

    const quantity = extractQuantity(message);
    if (quantity) {
      draft.quantity = quantity;
    }
    draft.quantity = draft.quantity || "1";

    const payment = parsePaymentMethod(message);
    if (payment) {
      draft.paymentMethod = payment;
    }
    draft.paymentMethod = draft.paymentMethod || "cash";

    const documentType = parseDocumentType(message);
    if (documentType) {
      draft.documentType = documentType;
    } else if (/(factur|comprobante|cuenta de cobro)/i.test(message)) {
      draft.documentType = "factura";
    }

    const customerName = extractCustomerName(message);
    if (customerName) {
      draft.customerName = customerName;
    }

    if (/(^|\s)(no|sin correo|no enviar)(\s|$)/i.test(normalized)) {
      draft.customerEmail = "skip";
    }

    const email = extractEmail(message);
    if (email) {
      draft.customerEmail = email;
    }
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
    const table = resolveTableByMessage(message, context);
    const session = resolveTableSession(message, context);
    if (session) {
      draft.sessionId = session.sessionId;
      draft.guestToken = session.guestToken;
      draft.tableNumber = String(session.tableNumber);
      draft.tableId = session.tableId;
    } else if (table) {
      draft.tableId = table.id;
      draft.tableNumber = String(table.number);
      draft.qrToken = table.qrToken;
    }

    const product = findByName(message, context.menuProducts);
    if (product) {
      draft.productId = product.id;
      draft.productName = product.name;
    }

    const quantity = extractQuantity(message);
    if (quantity) {
      draft.quantity = quantity;
    }
    draft.quantity = draft.quantity || "1";
  }

  if (intent === "checkout-table") {
    const session = resolveTableSession(message, context);
    if (session) {
      draft.sessionId = session.sessionId;
      draft.tableNumber = String(session.tableNumber);
      draft.guestToken = session.guestToken;
    }

    const documentType = parseDocumentType(message);
    if (documentType) {
      draft.documentType = documentType;
    }

    const payment = parsePaymentMethod(message);
    if (payment) {
      draft.paymentMethod = payment;
    }

    if (/(^|\s)(no|sin correo|no enviar)(\s|$)/i.test(normalized)) {
      draft.customerEmail = "skip";
    }

    const email = extractEmail(message);
    if (email) {
      draft.customerEmail = email;
    }
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

  if (intent === "build-recipe-cost" || intent === "save-recipe-cost") {
    const product = findByName(message, context.menuProducts);
    if (product) {
      draft.productId = product.id;
      draft.productName = product.name;
      draft.category = product.category;
    }

    const parsedLines = parseIngredientLinesFromMessage(message, context.inventoryItems);
    if (parsedLines.length > 0) {
      draft.recipeLines = JSON.stringify(
        parsedLines.map((line) => ({
          inventoryItemId: line.inventoryItemId,
          itemName: line.itemName,
          quantity: line.quantity,
          unit: line.unit,
        })),
      );
    } else if (intent === "save-recipe-cost" && draft.productId) {
      const existing = context.recipesSnapshot.find(
        (entry) => entry.menuProductId === draft.productId,
      );
      if (existing?.lines.length) {
        draft.recipeLines = JSON.stringify(existing.lines);
      }
    }

    const price = extractRecipePriceFromMessage(message);
    if (price !== null) {
      draft.price = String(price);
    }

    const yieldQuantity = extractYieldQuantityFromMessage(message);
    if (yieldQuantity !== null) {
      draft.yieldQuantity = String(yieldQuantity);
    }
  }

  if (intent === "delete-menu-product" || intent === "update-menu-product") {
    const cleanedQuery = message
      .replace(
        /(elimina|borra|quita|remueve|del menu|de la carta|del catalogo|cambia|actualiza|ajusta|precio|desactiva|activa|inactiva)/gi,
        " ",
      )
      .trim();
    const product =
      findByName(cleanedQuery, context.menuProducts) ??
      findByName(message, context.menuProducts);
    if (product) {
      draft.productId = product.id;
      draft.productName = product.name;
    }
    const price = extractNumber(message);
    if (price !== null) {
      draft.price = String(price);
    }
    if (/(desactiva|inactiva)/.test(normalized)) {
      draft.status = "inactive";
    } else if (/(activa)\s+/.test(normalized) && !/(desactiva)/.test(normalized)) {
      draft.status = "active";
    }
  }

  if (intent === "register-inventory-movement") {
    const item = findByName(message, context.inventoryItems);
    if (item) {
      draft.inventoryItemId = item.id;
      draft.itemName = item.name;
    }
    const quantityMatch = message.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gramos|ml|l|litros|unidades|u)?/i);
    if (quantityMatch?.[1] && !draft.quantity) {
      draft.quantity = quantityMatch[1].replace(",", ".");
    }
    if (/(entrada|ingreso)/.test(normalized)) {
      draft.movementType = "entry";
    } else if (/(salida|egreso)/.test(normalized)) {
      draft.movementType = "exit";
    } else if (/merma/.test(normalized)) {
      draft.movementType = "waste";
    } else if (/ajuste/.test(normalized)) {
      draft.movementType = "adjustment";
    }
  }

  if (intent === "create-fixed-expense") {
    const amount = extractNumber(message);
    if (amount !== null) {
      draft.amount = String(amount);
    }
    if (/mensual|mes/.test(normalized)) {
      draft.frequency = "monthly";
    } else if (/anual|ano|año/.test(normalized)) {
      draft.frequency = "annual";
    } else if (/semanal/.test(normalized)) {
      draft.frequency = "weekly";
    } else {
      draft.frequency = draft.frequency || "monthly";
    }
    if (/arriendo/.test(normalized)) {
      draft.category = "rent";
      draft.name = draft.name || "Arriendo";
    } else if (/nomina|sueldo|salario/.test(normalized)) {
      draft.category = "payroll";
      draft.name = draft.name || "Nómina";
    }
    if (!draft.name) {
      const cleaned = message
        .replace(/(nuevo gasto fijo|crear gasto fijo|registra gasto fijo|gasto recurrente)/gi, "")
        .replace(/(?:\$|cop)?\s*[\d][\d.,]*/gi, "")
        .replace(/\b(mensual|anual|semanal)\b/gi, "")
        .trim();
      if (cleaned.length >= 2) {
        draft.name = cleaned;
      }
    }
  }

  if (intent === "cancel-table-session") {
    const session = resolveTableSession(message, context);
    if (session) {
      draft.sessionId = session.sessionId;
      draft.tableNumber = String(session.tableNumber);
    }
    const table = resolveTableByMessage(message, context);
    if (table) {
      draft.tableId = table.id;
      draft.tableNumber = String(table.number);
    }
  }

  if (intent === "create-dining-table") {
    const tableNumber = extractTableNumber(message);
    if (tableNumber) {
      draft.tableNumber = String(tableNumber);
    }
    const labelMatch = message.match(/mesa\s*\d+\s+(.+)/i);
    if (labelMatch?.[1]) {
      draft.label = labelMatch[1].trim();
    }
  }

  if (intent === "create-warehouse") {
    const cleaned = message
      .replace(/(nueva bodega|crea bodega|agrega bodega|crear bodega)/gi, "")
      .trim();
    if (cleaned.length >= 2) {
      draft.name = cleaned;
    }
  }

  return draft;
}

function missingFields(intent: string, draft: Record<string, string>): string[] {
  if (intent === "add-table-order") {
    const missing: string[] = [];
    if (!String(draft.productId ?? "").trim()) {
      missing.push("productId");
    }
    if (!String(draft.sessionId ?? "").trim() && !String(draft.tableId ?? "").trim()) {
      missing.push("sessionId");
    }
    return missing;
  }

  if (intent === "checkout-table") {
    const missing: string[] = [];
    if (!String(draft.sessionId ?? "").trim()) {
      missing.push("sessionId");
    }
    if (!String(draft.documentType ?? "").trim()) {
      missing.push("documentType");
    }
    if (!String(draft.paymentMethod ?? "").trim()) {
      missing.push("paymentMethod");
    }
    if (!String(draft.customerEmail ?? "").trim()) {
      missing.push("customerEmail");
    }
    return missing;
  }

  if (intent === "update-menu-product") {
    const missing: string[] = [];
    if (!String(draft.productId ?? "").trim()) {
      missing.push("productId");
    }
    if (!String(draft.price ?? "").trim() && !String(draft.status ?? "").trim()) {
      missing.push("price");
    }
    return missing;
  }

  if (intent === "cancel-table-session") {
    const missing: string[] = [];
    if (!String(draft.sessionId ?? "").trim() && !String(draft.tableId ?? "").trim()) {
      missing.push("sessionId");
    }
    return missing;
  }

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
  if (field === "sessionId" && intent === "add-table-order") {
    return "No encontré esa mesa abierta. Dime «abre la mesa 1» o el número correcto.";
  }
  if (field === "sessionId" && intent === "checkout-table") {
    return "No hay cuenta abierta en esa mesa. ¿Seguro que tiene pedidos activos?";
  }
  if (field === "sessionId" && context.openTableSessions.length === 0) {
    return "No hay mesas abiertas. Dime «abre la mesa 3» (o el número que sea).";
  }
  if (intent === "checkout-table" && !context.cashSessionOpen) {
    return "Primero abre caja para cobrar la mesa. Por ejemplo: «abre caja con 200000».";
  }
  if (field === "tableId" && context.tables.length === 0) {
    return "No hay mesas configuradas en el sistema.";
  }
  if (intent === "open-cash-session" && context.cashSessionOpen) {
    return "La caja ya está abierta hoy. ¿Quieres registrar una venta o ver el estado?";
  }
  if (intent === "close-cash-session" && !context.cashSessionOpen) {
    return "No hay caja abierta para cerrar. Primero abre caja.";
  }
  if (intent === "register-cash-outflow" && !context.cashSessionOpen) {
    return "Abre caja antes de registrar salidas de dinero.";
  }
  if (intent === "register-cash-inflow" && !context.cashSessionOpen) {
    return "Abre caja antes de registrar entradas de dinero.";
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
  const lowStockCount = context.inventoryStockSnapshot.filter(
    (entry) => entry.minStock > 0 && entry.quantity < entry.minStock,
  ).length;

  return (
    `Así va **${context.organizationName ?? "tu operación"}**:\n` +
    `· **${context.inventoryCount}** insumos · **${context.invoiceCount}** facturas de compra` +
    (lowStockCount > 0 ? ` · **${lowStockCount}** bajo mínimo` : "") +
    `\n` +
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
    case "close-cash-session":
      return `Cierro caja. Efectivo contado: **$${Number(draft.countedAmount || 0).toLocaleString("es-CO")}**.`;
    case "register-cash-outflow":
      return `Registro salida de **$${Number(draft.amount || 0).toLocaleString("es-CO")}** — ${draft.reason ?? "egreso"}.`;
    case "register-cash-inflow":
      return `Registro entrada de **$${Number(draft.amount || 0).toLocaleString("es-CO")}** — ${draft.reason ?? "ingreso"}.`;
    case "create-counter-sale": {
      const documentLabel =
        draft.documentType === "cuenta_cobro" ? "Cuenta de cobro" : "Factura de venta";
      const customer = draft.customerName ? ` para **${draft.customerName}**` : "";
      if (draft.documentType) {
        return `Emito ${documentLabel} de **${draft.quantity ?? "1"} × ${draft.productName ?? "producto"}**${customer} y registro el cobro.`;
      }
      return `Registro la venta de **${draft.quantity ?? "1"} × ${draft.productName ?? "producto"}**${customer}.`;
    }
    case "open-table":
      return `Abro la **mesa ${draft.tableNumber}**.`;
    case "add-table-order":
      return `Anoto **${draft.quantity ?? "1"} × ${draft.productName ?? "pedido"}** en la **mesa ${draft.tableNumber ?? ""}** y mando comanda.`;
    case "checkout-table":
      return `Cierro la **mesa ${draft.tableNumber ?? ""}** y genero el comprobante.`;
    case "send-kitchen":
      return "Envío la comanda a barra/cocina.";
    case "update-kitchen-order":
      return `Actualizo la comanda a **${draft.status}**.`;
    case "seed-ghost-menu":
      return "Cargo la carta Ghost y las fichas SCA base.";
    case "build-recipe-cost":
      return `Genero la ficha de costos de **${draft.productName ?? "producto"}** desde inventario.`;
    case "save-recipe-cost":
      return `Guardo la ficha de **${draft.productName ?? "producto"}** y actualizo precio en carta y reportes.`;
    case "delete-menu-product":
      return `Elimino **${draft.productName ?? "producto"}** del menú y su ficha de costos.`;
    case "update-menu-product":
      if (draft.status === "inactive") {
        return `Desactivo **${draft.productName ?? "producto"}** en el menú.`;
      }
      if (draft.status === "active") {
        return `Activo **${draft.productName ?? "producto"}** en el menú.`;
      }
      return `Actualizo precio de **${draft.productName ?? "producto"}** a **$${Number(draft.price || 0).toLocaleString("es-CO")}**.`;
    case "register-inventory-movement":
      return `Registro ${draft.movementType === "entry" ? "entrada" : draft.movementType === "exit" ? "salida" : draft.movementType} de **${draft.quantity ?? "?"}** de **${draft.itemName ?? "insumo"}**.`;
    case "create-fixed-expense":
      return `Creo gasto fijo **${draft.name}** por **$${Number(draft.amount || 0).toLocaleString("es-CO")}**.`;
    case "cancel-table-session":
      return `Cancelo la sesión de la **mesa ${draft.tableNumber ?? ""}** sin cobrar.`;
    case "create-dining-table":
      return `Creo la **mesa ${draft.tableNumber ?? ""}**.`;
    case "create-warehouse":
      return `Creo la bodega **${draft.name}**.`;
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

function buildPendingReply(
  intent: GhostConversationIntent,
  draft: Record<string, string>,
  missingField: string,
  context: GhostConversationContext,
): string {
  const question = followUpForField(intent, missingField, context);

  if (intent === "checkout-table" && draft.sessionId) {
    const preview = buildTableBillPreview(context, draft.sessionId);
    if (preview) {
      return `${preview}\n\n${question}`;
    }
  }

  if (intent === "add-table-order") {
    return `Entendido. ${question}`;
  }

  if (intent === "create-purchase-invoice") {
    return `Entendido, vamos con esa compra. ${question}`;
  }

  if (intent === "create-counter-sale") {
    return `Te ayudo con la venta al cliente. ${question}`;
  }

  return `Perfecto. ${question}`;
}

export function createInitialConversationTurn(
  context: GhostConversationContext,
): GhostConversationResult {
  const briefing = buildDailyOperationsBriefing(
    briefingInputFromGhostContext(context, {
      inventoryMovementsSnapshot: context.inventoryMovementsSnapshot,
    }),
  );
  const greeting = ghostChatGreeting(context.organizationName);
  const messages =
    briefing.headlineCount > 0 ? [greeting, briefing.message] : [greeting];

  return {
    kind: "reply",
    session: createEmptyGhostChatSession(),
    messages,
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

    if (intent === "checkout-table" && !context.cashSessionOpen) {
      return {
        kind: "reply",
        session: sessionWithPending(session, intent, draft),
        messages: [followUpForField(intent, "paymentMethod", context)],
      };
    }

    const missing = missingFields(intent, draft);

    if (missing.length > 0) {
      return {
        kind: "reply",
        session: sessionWithPending(session, intent, draft),
        messages: [buildPendingReply(intent, draft, missing[0]!, context)],
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

  if (intent === "brain-help") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildBrainHelpMessage(context)],
    };
  }

  if (intent === "query-daily-briefing") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildDailyBriefingReply(context)],
    };
  }

  if (intent === "query-platform-guide") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildPlatformGuideReply(message)],
    };
  }

  if (intent === "query-sales-report") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildSalesReportReply(context)],
    };
  }

  if (intent === "query-purchases-review") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildPurchasesReviewReply(context)],
    };
  }

  if (intent === "query-purchases-report") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildPurchasesReportReply(context)],
    };
  }

  if (intent === "query-purchase-suggestions") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildPurchaseSuggestionsReply(context)],
    };
  }

  if (intent === "query-cash-summary") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildCashSummaryReply(context)],
    };
  }

  if (intent === "query-financial-overview") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildFinancialOverviewReply(context)],
    };
  }

  if (intent === "query-inventory-low-stock") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildInventoryLowStockReply(context)],
    };
  }

  if (intent === "query-fixed-expenses") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildFixedExpensesReply(context)],
    };
  }

  if (intent === "query-work-shifts") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildWorkShiftsReply(context)],
    };
  }

  if (intent === "query-kitchen-status") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildKitchenStatusReply(context)],
    };
  }

  if (intent === "query-cost-matrix") {
    const product = findByName(trimmed, context.menuProducts);
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [
        product
          ? buildSingleProductCostReply(context, product.id)
          : buildCostMatrixOverviewReply(context),
      ],
    };
  }

  if (intent === "query-menu-catalog") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildMenuCatalogReply(context)],
    };
  }

  if (intent === "query-inventory-catalog") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildInventoryCatalogReply(context)],
    };
  }

  if (intent === "query-tables-status") {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [buildTablesStatusReply(context)],
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
    const normalized = normalizeText(trimmed);

    if (/(ayuda|que puedes|que sabes|como funciona|ejemplos|palabras clave|comandos|cerebro)/.test(normalized)) {
      return {
        kind: "reply",
        session: clearPending(session),
        messages: [buildBrainHelpMessage(context)],
      };
    }

    return {
      kind: "agent",
      session: { ...clearPending(session), agentSessionId },
      messages: ["Un momento…"],
      message: trimmed,
    };
  }

  const draft = extractDraftForIntent(intent, trimmed, context, {});
  const missing = missingFields(intent, draft);

  if (intent === "close-cash-session" && !context.cashSessionOpen) {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [followUpForField(intent, "sessionId", context)],
    };
  }

  if (intent === "register-cash-outflow" && !context.cashSessionOpen) {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [followUpForField(intent, "sessionId", context)],
    };
  }

  if (intent === "register-cash-inflow" && !context.cashSessionOpen) {
    return {
      kind: "reply",
      session: clearPending(session),
      messages: [followUpForField(intent, "sessionId", context)],
    };
  }

  if (intent === "checkout-table" && !context.cashSessionOpen) {
    return {
      kind: "reply",
      session: sessionWithPending(session, intent, draft),
      messages: [followUpForField(intent, "paymentMethod", context)],
    };
  }

  if (missing.length > 0) {
    return {
      kind: "reply",
      session: sessionWithPending(session, intent, draft),
      messages: [buildPendingReply(intent, draft, missing[0]!, context)],
    };
  }

  if (intent === "save-recipe-cost" && draft.confirm !== "si") {
    const lines = JSON.parse(draft.recipeLines ?? "[]") as Array<{
      itemName: string;
      quantity: number;
      unit: string;
    }>;

    return {
      kind: "reply",
      session: sessionWithPending(session, intent, draft),
      messages: [
        buildRecipeCostPreviewReply(context, {
          productId: draft.productId ?? "",
          productName: draft.productName ?? "producto",
          price: draft.price,
          yieldQuantity: draft.yieldQuantity,
          lines,
        }),
        "¿Guardo la ficha y actualizo la plataforma? Responde **sí** para confirmar.",
      ],
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
