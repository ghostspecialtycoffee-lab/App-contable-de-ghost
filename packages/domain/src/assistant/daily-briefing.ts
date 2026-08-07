import type { GhostConversationContext } from "./ghost-conversation.js";

export type BriefingSeverity = "info" | "warning" | "critical";

export type BriefingCategory =
  | "sales"
  | "inventory"
  | "costs"
  | "cash"
  | "operations"
  | "purchases";

export interface BriefingItem {
  id: string;
  severity: BriefingSeverity;
  category: BriefingCategory;
  message: string;
  suggestion?: string;
}

export interface DailyBriefingMovementSnapshot {
  itemId: string;
  type: string;
  quantity: number;
  occurredAt: string;
}

export interface DailyBriefingInput {
  organizationName?: string;
  todayIso: string;
  yesterdayIso: string;
  salesSnapshot: GhostConversationContext["salesSnapshot"];
  purchasesSnapshot: GhostConversationContext["purchasesSnapshot"];
  inventoryStockSnapshot: GhostConversationContext["inventoryStockSnapshot"];
  inventoryMovementsSnapshot?: DailyBriefingMovementSnapshot[];
  cashSessionOpen: boolean;
  cashSnapshot?: GhostConversationContext["cashSnapshot"];
  menuProducts: GhostConversationContext["menuProducts"];
  recipesSnapshot: GhostConversationContext["recipesSnapshot"];
  kitchenOrders: GhostConversationContext["kitchenOrders"];
  openTableSessions: GhostConversationContext["openTableSessions"];
  costMatrixSettings?: GhostConversationContext["costMatrixSettings"];
}

export interface DailyOperationsBriefing {
  items: BriefingItem[];
  headlineCount: number;
  message: string;
}

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function sumSalesTotal(
  sales: DailyBriefingInput["salesSnapshot"],
  soldOn: string,
): number {
  return sales
    .filter((sale) => sale.status === "paid" && sale.soldOn === soldOn)
    .reduce((sum, sale) => sum + sale.total, 0);
}

function countSales(sales: DailyBriefingInput["salesSnapshot"], soldOn: string): number {
  return sales.filter((sale) => sale.status === "paid" && sale.soldOn === soldOn).length;
}

function averageDailyConsumption(
  movements: DailyBriefingMovementSnapshot[],
  itemId: string,
  lookbackDays = 14,
): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  let total = 0;
  for (const movement of movements) {
    if (movement.itemId !== itemId) {
      continue;
    }
    if (movement.type !== "exit" && movement.type !== "waste") {
      continue;
    }
    const occurredAt = new Date(movement.occurredAt);
    if (Number.isNaN(occurredAt.getTime()) || occurredAt < cutoff) {
      continue;
    }
    total += Math.abs(movement.quantity);
  }

  return total > 0 ? total / lookbackDays : 0;
}

function forecastDaysUntilStockout(quantity: number, dailyConsumption: number): number | null {
  if (dailyConsumption <= 0) {
    return null;
  }
  if (quantity <= 0) {
    return 0;
  }
  return Math.ceil(quantity / dailyConsumption);
}

export function buildDailyOperationsBriefing(input: DailyBriefingInput): DailyOperationsBriefing {
  const items: BriefingItem[] = [];
  const movements = input.inventoryMovementsSnapshot ?? [];

  const todayTotal = sumSalesTotal(input.salesSnapshot, input.todayIso);
  const yesterdayTotal = sumSalesTotal(input.salesSnapshot, input.yesterdayIso);
  const todayCount = countSales(input.salesSnapshot, input.todayIso);

  if (yesterdayTotal > 0) {
    const changePct = Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 1000) / 10;
    if (changePct <= -8) {
      items.push({
        id: "sales-drop",
        severity: "warning",
        category: "sales",
        message: `Las ventas de hoy van **${changePct}%** por debajo de ayer (${formatMoney(todayTotal)} vs ${formatMoney(yesterdayTotal)}).`,
        suggestion: "Revisa productos estrella y promociones del turno.",
      });
    } else if (changePct >= 15) {
      items.push({
        id: "sales-up",
        severity: "info",
        category: "sales",
        message: `Buen ritmo: ventas **+${changePct}%** vs ayer (${formatMoney(todayTotal)}).`,
      });
    }
  } else if (todayCount === 0) {
    items.push({
      id: "sales-empty",
      severity: "info",
      category: "sales",
      message: "Aún no hay ventas registradas hoy.",
      suggestion: "Abre caja y registra el primer cobro cuando arranque el servicio.",
    });
  }

  const lowStock = input.inventoryStockSnapshot.filter(
    (entry) => entry.minStock > 0 && entry.quantity < entry.minStock,
  );
  for (const entry of lowStock.slice(0, 3)) {
    items.push({
      id: `low-stock-${entry.itemId}`,
      severity: "warning",
      category: "inventory",
      message: `**${entry.name}** bajo mínimo (${entry.quantity} ${entry.baseUnit} · mín. ${entry.minStock}).`,
      suggestion: "Registra una compra o revisa consumo en recetas.",
    });
  }

  for (const entry of input.inventoryStockSnapshot) {
    const daily = averageDailyConsumption(movements, entry.itemId);
    const daysLeft = forecastDaysUntilStockout(entry.quantity, daily);
    if (daysLeft !== null && daysLeft > 0 && daysLeft <= 3) {
      items.push({
        id: `stockout-${entry.itemId}`,
        severity: daysLeft <= 1 ? "critical" : "warning",
        category: "inventory",
        message: `Riesgo de quedarte sin **${entry.name}** en ~**${daysLeft} día(s)**.`,
        suggestion: "Pide reposición al proveedor habitual.",
      });
    }
  }

  const negativeStock = input.inventoryStockSnapshot.filter((entry) => entry.quantity < 0);
  if (negativeStock.length > 0) {
    items.push({
      id: "negative-stock",
      severity: "critical",
      category: "inventory",
      message: `Hay **${negativeStock.length}** insumo(s) con inventario negativo.`,
      suggestion: "Ajusta stock o registra la compra faltante.",
    });
  }

  if (!input.cashSessionOpen) {
    items.push({
      id: "cash-closed",
      severity: "warning",
      category: "cash",
      message: "La caja está **cerrada**.",
      suggestion: "Di «abre caja con [monto]» para iniciar el turno.",
    });
  }

  const beverageTarget = input.costMatrixSettings?.targetBeverageCostPct ?? 0.3;
  const foodTarget = input.costMatrixSettings?.targetFoodCostPct ?? 0.35;

  const highCostProducts = input.menuProducts
    .filter((product) => product.status !== "inactive" && product.price > 0 && (product.recipeCost ?? 0) > 0)
    .map((product) => {
      const target = product.category === "beverage" ? beverageTarget : foodTarget;
      const foodCostPct = (product.recipeCost ?? 0) / product.price;
      return { product, foodCostPct, target };
    })
    .filter((entry) => entry.foodCostPct > entry.target * 1.08)
    .sort((left, right) => right.foodCostPct - left.foodCostPct);

  for (const entry of highCostProducts.slice(0, 3)) {
    items.push({
      id: `food-cost-${entry.product.id}`,
      severity: "warning",
      category: "costs",
      message:
        `**${entry.product.name}** tiene food cost **${(entry.foodCostPct * 100).toFixed(1)}%** ` +
        `(meta ${(entry.target * 100).toFixed(0)}%).`,
      suggestion: "Revisa receta, precio de venta o costo de insumos.",
    });
  }

  const purchasesToday = input.purchasesSnapshot.filter(
    (purchase) => purchase.status === "confirmed" && purchase.invoiceDate === input.todayIso,
  );
  if (purchasesToday.length > 0) {
    const total = purchasesToday.reduce((sum, purchase) => sum + purchase.total, 0);
    items.push({
      id: "purchases-today",
      severity: "info",
      category: "purchases",
      message: `Se confirmaron **${purchasesToday.length}** compra(s) hoy por **${formatMoney(total)}**.`,
    });
  }

  const pendingKitchen = input.kitchenOrders.filter((order) => order.status === "pending").length;
  if (pendingKitchen > 0) {
    items.push({
      id: "kitchen-pending",
      severity: pendingKitchen >= 5 ? "warning" : "info",
      category: "operations",
      message: `Hay **${pendingKitchen}** comanda(s) pendientes en cocina/barra.`,
    });
  }

  if (input.openTableSessions.length > 0) {
    items.push({
      id: "tables-open",
      severity: "info",
      category: "operations",
      message: `**${input.openTableSessions.length}** mesa(s) con cuenta abierta.`,
    });
  }

  const missingRecipes = input.menuProducts.filter(
    (product) =>
      product.status !== "inactive" &&
      !input.recipesSnapshot.some((recipe) => recipe.menuProductId === product.id),
  );
  if (missingRecipes.length > 0) {
    items.push({
      id: "missing-recipes",
      severity: "info",
      category: "costs",
      message: `**${missingRecipes.length}** producto(s) activo(s) sin receta de costeo.`,
      suggestion: "Completa fichas en Costeo para ver márgenes reales.",
    });
  }

  const deduped = dedupeBriefingItems(items);
  const headlineCount = deduped.length;

  return {
    items: deduped,
    headlineCount,
    message: formatDailyBriefingMessage({
      organizationName: input.organizationName,
      items: deduped,
      headlineCount,
    }),
  };
}

function dedupeBriefingItems(items: BriefingItem[]): BriefingItem[] {
  const seen = new Set<string>();
  const result: BriefingItem[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    result.push(item);
  }

  const severityRank: Record<BriefingSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return result.sort(
    (left, right) => severityRank[left.severity] - severityRank[right.severity],
  );
}

export function formatDailyBriefingMessage(input: {
  organizationName?: string;
  items: BriefingItem[];
  headlineCount: number;
}): string {
  if (input.items.length === 0) {
    const place = input.organizationName?.trim() ? ` en **${input.organizationName.trim()}**` : "";
    return (
      `**Buenos días**${place}.\n` +
      "Todo se ve estable: sin alertas de inventario, caja o márgenes por ahora.\n\n" +
      "Pregúntame lo que necesites o di «resumen del día» cuando quieras actualizar."
    );
  }

  const lines = input.items
    .slice(0, 8)
    .map((item) => {
      const prefix =
        item.severity === "critical" ? "🔴" : item.severity === "warning" ? "🟠" : "•";
      const suggestion = item.suggestion ? ` _(${item.suggestion})_` : "";
      return `${prefix} ${item.message}${suggestion}`;
    })
    .join("\n");

  const place = input.organizationName?.trim() ? ` en **${input.organizationName.trim()}**` : "";

  return (
    `**Buenos días**${place}. Encontré **${input.headlineCount}** novedad(es):\n\n` +
    `${lines}\n\n` +
    "Puedo ayudarte a actuar: compras, ajustes de precio, caja o inventario."
  );
}

export function briefingInputFromGhostContext(
  context: GhostConversationContext,
  options?: {
    todayIso?: string;
    yesterdayIso?: string;
    inventoryMovementsSnapshot?: DailyBriefingMovementSnapshot[];
  },
): DailyBriefingInput {
  const today = options?.todayIso ?? new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(`${today}T12:00:00.000Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = options?.yesterdayIso ?? yesterdayDate.toISOString().slice(0, 10);

  return {
    organizationName: context.organizationName,
    todayIso: today,
    yesterdayIso: yesterday,
    salesSnapshot: context.salesSnapshot,
    purchasesSnapshot: context.purchasesSnapshot,
    inventoryStockSnapshot: context.inventoryStockSnapshot,
    inventoryMovementsSnapshot: options?.inventoryMovementsSnapshot,
    cashSessionOpen: context.cashSessionOpen,
    cashSnapshot: context.cashSnapshot,
    menuProducts: context.menuProducts,
    recipesSnapshot: context.recipesSnapshot,
    kitchenOrders: context.kitchenOrders,
    openTableSessions: context.openTableSessions,
    costMatrixSettings: context.costMatrixSettings,
  };
}
