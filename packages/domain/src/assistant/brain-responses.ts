import type { InventoryMovementType } from "../inventory/movement.js";
import type { BaseUnit } from "../inventory/units.js";
import type { InventoryCostProfile } from "../inventory/unit-conversion.js";
import type { MenuCategory } from "../pos/menu-product.js";
import { buildCostMatrixReport } from "../reports/cost-matrix-report.js";
import { buildProductCostPanorama } from "../reports/product-cost-panorama.js";
import { calculateRecipeBatchCost } from "../production/services/recipe-yield.js";
import { suggestRecipeYield } from "../production/services/recipe-yield.js";
import { PAYMENT_METHOD_LABELS, type PaymentMethod, type SaleStatus } from "../pos/sale.js";
import {
  buildSalesReport,
  filterSalesByPeriod,
  getReportPeriod,
} from "../pos/services/reports.js";
import { FIXED_EXPENSE_CATEGORY_LABELS, type FixedExpenseCategory } from "../expenses/fixed-expense.js";
import { summarizeFixedExpenses } from "../expenses/services/fixed-expense.js";
import { KITCHEN_ORDER_STATUS_LABELS, type KitchenOrderStatus } from "../pos/kitchen-order.js";
import { KITCHEN_STATION_LABELS, MENU_CATEGORY_LABELS, MENU_PRODUCT_STATUS_LABELS, type KitchenStation } from "../pos/menu-product.js";
import { WORK_SHIFT_ROLE_LABELS } from "../operations/shifts.js";
import type { PurchaseInvoice } from "../purchases/invoice.js";
import {
  buildPurchasesReport,
  filterPurchasesByPeriod,
} from "../reports/purchases-report.js";
import {
  buildPurchaseSuggestions,
  compareSupplierPricesForItem,
} from "../purchases/services/purchase-intelligence.js";
import type { GhostConversationContext } from "./ghost-conversation.js";

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function paymentLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

export function buildSalesReportReply(context: GhostConversationContext): string {
  const period = getReportPeriod("today");
  const sales = filterSalesByPeriod(context.salesSnapshot, period.from, period.to);
  const report = buildSalesReport(sales);

  if (report.invoiceCount === 0) {
    return (
      "**Ventas de hoy**\n" +
      "Aún no hay ventas registradas en el día.\n\n" +
      "Puedes decir: «factura 2 dirty chai en efectivo» o «dame la cuenta de la mesa 1»."
    );
  }

  const paymentLines = (Object.keys(report.byPaymentMethod) as PaymentMethod[])
    .filter((method) => report.byPaymentMethod[method] > 0)
    .map((method) => `· ${paymentLabel(method)}: **${formatMoney(report.byPaymentMethod[method])}**`)
    .join("\n");

  const topProducts = report.topProducts
    .slice(0, 5)
    .map(
      (product) =>
        `· ${product.name} — ${product.quantity} uds — **${formatMoney(product.revenue)}**`,
    )
    .join("\n");

  return (
    `**Ventas de hoy** (${period.label})\n` +
    `· Comprobantes: **${report.invoiceCount}**\n` +
    `· Total vendido: **${formatMoney(report.totalSales)}**\n` +
    `· Ticket promedio: **${formatMoney(report.averageTicket)}**\n` +
    `· Base gravable: ${formatMoney(report.subtotal)} · Impuestos: ${formatMoney(report.taxAmount)}\n` +
    `· Mostrador: **${formatMoney(report.counterSalesTotal)}** (${report.counterSalesCount}) · ` +
    `Mesas: **${formatMoney(report.tableSalesTotal)}** (${report.tableSalesCount})\n\n` +
    `**Por medio de pago**\n${paymentLines || "· Sin desglose"}\n\n` +
    `**Productos destacados**\n${topProducts || "· Sin detalle"}`
  );
}

export function buildPurchasesReviewReply(context: GhostConversationContext): string {
  const purchases = context.purchasesSnapshot.slice(0, 8);

  if (purchases.length === 0) {
    return (
      "**Compras a proveedor**\n" +
      "No hay facturas de compra registradas.\n\n" +
      "Ejemplo: «registra compra de café del proveedor Distritcafé»."
    );
  }

  const lines = purchases
    .map(
      (purchase) =>
        `· **${purchase.supplierName}** — ${purchase.invoiceNumber} — ` +
        `${purchase.invoiceDate} — **${formatMoney(purchase.total)}** (${purchase.status})`,
    )
    .join("\n");

  const total = purchases.reduce((sum, purchase) => sum + purchase.total, 0);

  return (
    `**Últimas compras** (hasta ${purchases.length})\n${lines}\n\n` +
    `Total listado: **${formatMoney(total)}** · Facturas en sistema: **${context.invoiceCount}**`
  );
}

export function buildCashSummaryReply(context: GhostConversationContext): string {
  const cash = context.cashSnapshot;

  if (!context.cashSessionOpen || !cash?.sessionId) {
    return (
      "**Caja**\n" +
      "La caja está **cerrada**.\n\n" +
      "Para abrir: «abre caja con 200000». Para registrar salidas después de abrir: «salida de dinero 50000 por domicilios»."
    );
  }

  const movements = cash.movements
    .slice(0, 6)
    .map(
      (movement) =>
        `· ${movement.type} — **${formatMoney(movement.amount)}** — ${movement.reason}`,
    )
    .join("\n");

  return (
    "**Resumen de caja**\n" +
    `· Fondo inicial: **${formatMoney(cash.openingAmount ?? 0)}**\n` +
    `· Ventas en efectivo: **${formatMoney(cash.cashSalesTotal ?? 0)}**\n` +
    `· Entradas: **${formatMoney(cash.inflowsTotal ?? 0)}** · Salidas: **${formatMoney(cash.outflowsTotal ?? 0)}**\n` +
    `· Efectivo esperado: **${formatMoney(cash.expectedAmount ?? 0)}**\n\n` +
    `**Movimientos recientes**\n${movements || "· Sin movimientos manuales"}\n\n` +
    "Para registrar egreso: «salida de dinero 30000 por propinas». Para cerrar: «cierra caja con [efectivo contado]»."
  );
}

export function buildFinancialOverviewReply(context: GhostConversationContext): string {
  const sales = buildSalesReportReply(context);
  const cash = buildCashSummaryReply(context);
  const purchases = buildPurchasesReviewReply(context);

  return `**Panel financiero rápido**\n\n${sales}\n\n---\n\n${cash}\n\n---\n\n${purchases}`;
}

export function buildInventoryLowStockReply(context: GhostConversationContext): string {
  const lowStock = context.inventoryStockSnapshot.filter(
    (entry) => entry.minStock > 0 && entry.quantity < entry.minStock,
  );

  if (lowStock.length === 0) {
    return (
      "**Inventario**\n" +
      "No hay insumos bajo el mínimo configurado.\n\n" +
      "Configura `minStock` en cada insumo o pregunta «sugerencias de compra» para pronóstico de quiebre."
    );
  }

  const lines = lowStock
    .slice(0, 10)
    .map(
      (entry) =>
        `· **${entry.name}** — ${formatQuantity(entry.quantity, entry.baseUnit)} ` +
        `(mín. ${formatQuantity(entry.minStock, entry.baseUnit)})`,
    )
    .join("\n");

  return (
    `**Insumos bajo mínimo** (${lowStock.length})\n${lines}\n\n` +
    "Revisa **Inventario → Stock** o pregunta «sugerencias de compra» para ver cuándo se agotan."
  );
}

export function buildPurchaseSuggestionsReply(context: GhostConversationContext): string {
  const suggestions = buildPurchaseSuggestions({
    stock: context.inventoryStockSnapshot.map((entry) => ({
      itemId: entry.itemId,
      name: entry.name,
      baseUnit: entry.baseUnit as BaseUnit,
      quantity: entry.quantity,
      minStock: entry.minStock,
    })),
    movements: (context.inventoryMovementsSnapshot ?? []).map((movement) => ({
      itemId: movement.itemId,
      type: movement.type as InventoryMovementType,
      quantity: movement.quantity,
      occurredAt: movement.occurredAt,
    })),
    priceHistory: (context.purchasePriceHistorySnapshot ?? []).map((entry, index) => ({
      id: `history-${index}`,
      organizationId: "",
      inventoryItemId: entry.inventoryItemId,
      supplierName: entry.supplierName,
      unitPriceNet: entry.unitPriceNet,
      unit: "unit" as BaseUnit,
      quantity: 1,
      invoiceId: "",
      invoiceNumber: "",
      purchasedAt: entry.purchasedAt,
    })),
  });

  if (suggestions.length === 0) {
    return (
      "**Compras inteligentes**\n" +
      "No hay alertas de reposición por ahora.\n\n" +
      "Configura `minStock` en inventario y registra ventas para que calcule consumo diario."
    );
  }

  const lines = suggestions.slice(0, 8).map((entry) => {
    const daysLabel =
      entry.daysUntilStockout === null
        ? "sin consumo reciente"
        : entry.daysUntilStockout === 0
          ? "ya bajo mínimo"
          : `~${entry.daysUntilStockout} día(s)`;
    const supplier = entry.preferredSupplierName
      ? ` · proveedor: **${entry.preferredSupplierName}**`
      : "";
    const qty = formatQuantity(entry.suggestedQuantity, entry.baseUnit);

    return (
      `· **${entry.name}** — queda ${formatQuantity(entry.currentQuantity, entry.baseUnit)} ` +
      `(${daysLabel}) → comprar **${qty}**${supplier}`
    );
  });

  const milkSuggestion = suggestions.find((entry) => /leche/i.test(entry.name));
  const priceTip =
    milkSuggestion &&
    compareSupplierPricesForItem(
      (context.purchasePriceHistorySnapshot ?? []).map((entry, index) => ({
        id: `history-${index}`,
        organizationId: "",
        inventoryItemId: entry.inventoryItemId,
        supplierName: entry.supplierName,
        unitPriceNet: entry.unitPriceNet,
        unit: "ml" as BaseUnit,
        quantity: 1,
        invoiceId: "",
        invoiceNumber: "",
        purchasedAt: entry.purchasedAt,
      })),
      milkSuggestion.itemId,
    );

  const supplierTip =
    priceTip && priceTip.length > 1
      ? `\n\n**Precios leche:** ${priceTip
          .slice(0, 3)
          .map(
            (entry) =>
              `${entry.supplierName} ${formatMoney(entry.lastUnitPrice)}` +
              (entry.priceChangePct ? ` (${entry.priceChangePct > 0 ? "+" : ""}${entry.priceChangePct}%)` : ""),
          )
          .join(" · ")}`
      : "";

  return (
    `**Sugerencias de compra** (${suggestions.length})\n${lines.join("\n")}` +
    supplierTip +
    "\n\nRegistra la compra: «registra compra de [insumo] del proveedor [nombre]»."
  );
}

export function buildFixedExpensesReply(context: GhostConversationContext): string {
  const expenses = context.fixedExpensesSnapshot.filter((entry) => entry.isActive);

  if (expenses.length === 0) {
    return (
      "**Gastos fijos**\n" +
      "No hay gastos fijos activos registrados.\n\n" +
      "Agrégalos en **Gastos fijos** o dime si quieres ayuda con el panel financiero."
    );
  }

  const summary = summarizeFixedExpenses(
    expenses.map((entry, index) => ({
      id: `expense-${index}`,
      organizationId: "",
      name: entry.name,
      category: entry.category as FixedExpenseCategory,
      amount: entry.amount,
      frequency: entry.frequency as "weekly" | "biweekly" | "monthly" | "annual",
      monthlyEquivalent: entry.monthlyEquivalent,
      dueDay: entry.dueDay,
      isActive: entry.isActive,
      createdAt: "",
      updatedAt: "",
      createdBy: "",
      updatedBy: "",
    })),
  );

  const categoryLines = (Object.keys(summary.byCategory) as Array<keyof typeof summary.byCategory>)
    .filter((category) => summary.byCategory[category] > 0)
    .map(
      (category) =>
        `· ${FIXED_EXPENSE_CATEGORY_LABELS[category]}: **${formatMoney(summary.byCategory[category])}**/mes`,
    )
    .join("\n");

  const topExpenses = expenses
    .slice()
    .sort((left, right) => right.monthlyEquivalent - left.monthlyEquivalent)
    .slice(0, 6)
    .map(
      (entry) =>
        `· **${entry.name}** — ${formatMoney(entry.monthlyEquivalent)}/mes` +
        (entry.dueDay ? ` (día ${entry.dueDay})` : ""),
    )
    .join("\n");

  return (
    `**Gastos fijos** (${summary.activeCount} activos)\n` +
    `· Total mensual: **${formatMoney(summary.monthlyTotal)}**\n` +
    `· Proyección anual: **${formatMoney(summary.annualProjection)}**\n\n` +
    `**Por categoría**\n${categoryLines || "· Sin desglose"}\n\n` +
    `**Principales**\n${topExpenses}`
  );
}

export function buildWorkShiftsReply(context: GhostConversationContext): string {
  const today = new Date().toISOString().slice(0, 10);
  const shifts = context.workShiftsSnapshot.filter((entry) => entry.shiftDate === today);

  if (shifts.length === 0) {
    return (
      `**Turnos de hoy** (${today})\n` +
      "No hay turnos programados para hoy.\n\n" +
      "Configúralos en **Ajustes → Operaciones**."
    );
  }

  const lines = shifts
    .slice()
    .sort((left, right) => left.startTime.localeCompare(right.startTime))
    .map(
      (entry) =>
        `· **${entry.staffName}** — ${WORK_SHIFT_ROLE_LABELS[entry.role]} — ` +
        `${entry.startTime}–${entry.endTime}`,
    )
    .join("\n");

  return `**Turnos de hoy** (${today})\n${lines}`;
}

export function buildKitchenStatusReply(context: GhostConversationContext): string {
  const orders = context.kitchenOrders.filter((order) => order.status !== "delivered" && order.status !== "cancelled");

  if (orders.length === 0) {
    return (
      "**Comandas**\n" +
      "No hay pedidos activos en barra ni cocina.\n\n" +
      "Cuando anotes en mesa, pregunta «estado de comandas» para ver la cola."
    );
  }

  const grouped = new Map<string, number>();
  for (const order of orders) {
    grouped.set(order.status, (grouped.get(order.status) ?? 0) + 1);
  }

  const summaryLines = [...grouped.entries()]
    .map(
      ([status, count]) =>
        `· ${KITCHEN_ORDER_STATUS_LABELS[status as KitchenOrderStatus] ?? status}: **${count}**`,
    )
    .join("\n");

  const detailLines = orders
    .slice(0, 8)
    .map((order) => {
      const table = order.tableNumber ? ` · mesa ${order.tableNumber}` : "";
      const station = KITCHEN_STATION_LABELS[order.station as KitchenStation] ?? order.station;
      const status = KITCHEN_ORDER_STATUS_LABELS[order.status as KitchenOrderStatus] ?? order.status;
      return `· **${order.saleNumber || "Pedido"}** — ${station}${table} — ${status}`;
    })
    .join("\n");

  return (
    `**Comandas activas** (${orders.length})\n${summaryLines}\n\n` +
    `**Detalle**\n${detailLines}`
  );
}

export function buildPurchasesReportReply(context: GhostConversationContext): string {
  const period = getReportPeriod("month");
  const purchases = filterPurchasesByPeriod(
    context.purchasesSnapshot.map((purchase) => ({
      ...purchase,
      status: purchase.status as PurchaseInvoice["status"],
    })),
    period.from,
    period.to,
  );
  const report = buildPurchasesReport(purchases);

  if (report.invoiceCount === 0) {
    return (
      `**Compras del mes** (${period.label})\n` +
      "No hay facturas de compra confirmadas en el período.\n\n" +
      "Ejemplo: «registra compra de café del proveedor Distritcafé»."
    );
  }

  const supplierLines = report.topSuppliers
    .slice(0, 5)
    .map(
      (supplier) =>
        `· **${supplier.name}** — ${supplier.invoiceCount} facturas — **${formatMoney(supplier.total)}**`,
    )
    .join("\n");

  return (
    `**Compras del mes** (${period.label})\n` +
    `· Facturas: **${report.invoiceCount}**\n` +
    `· Total comprado: **${formatMoney(report.totalPurchases)}**\n` +
    `· Promedio por factura: **${formatMoney(report.averageInvoice)}**\n` +
    `· Base: ${formatMoney(report.subtotal)} · Impuestos: ${formatMoney(report.taxAmount)}\n\n` +
    `**Proveedores principales**\n${supplierLines || "· Sin detalle"}`
  );
}

function formatQuantity(value: number, unit: string): string {
  const formatted = value.toLocaleString("es-CO", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
  return `${formatted} ${unit}`;
}

function buildItemProfiles(context: GhostConversationContext): Record<string, InventoryCostProfile> {
  const profiles: Record<string, InventoryCostProfile> = {};
  for (const item of context.inventoryCostSnapshot) {
    profiles[item.itemId] = {
      baseUnit: item.baseUnit as InventoryCostProfile["baseUnit"],
      averageCost: item.averageCost,
      purchaseUnit: item.purchaseUnit as InventoryCostProfile["purchaseUnit"],
      presentationQuantity: item.presentationQuantity,
    };
  }
  return profiles;
}

function findProductInMessage(
  message: string,
  context: GhostConversationContext,
): GhostConversationContext["menuProducts"][number] | null {
  const normalized = message
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  let best: { product: GhostConversationContext["menuProducts"][number]; score: number } | null =
    null;

  for (const product of context.menuProducts) {
    const name = product.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
    if (normalized.includes(name) || name.includes(normalized)) {
      return product;
    }

    const tokens = name.split(/\s+/).filter((token) => token.length > 2);
    const overlap = tokens.filter((token) => normalized.includes(token)).length;
    const score = overlap / Math.max(tokens.length, 1);
    if (!best || score > best.score) {
      best = { product, score };
    }
  }

  return best && best.score >= 0.5 ? best.product : null;
}

export function buildCostMatrixOverviewReply(
  context: GhostConversationContext,
  productFilter?: string,
): string {
  const itemProfiles = buildItemProfiles(context);
  const products = context.menuProducts.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    category: product.category as MenuCategory,
    saleTaxCategory: (product.saleTaxCategory ?? "IVA_19") as CoTaxCategory,
    recipeCost: product.recipeCost,
  }));
  const reportRecipes = context.recipesSnapshot.map((recipe) => ({
    menuProductId: recipe.menuProductId,
    yieldQuantity: recipe.yieldQuantity,
    lines: recipe.lines.map((line) => ({
      ...line,
      unit: line.unit as BaseUnit,
    })),
  }));

  if (productFilter) {
    const product = context.menuProducts.find(
      (entry) => entry.name.toLowerCase() === productFilter.toLowerCase(),
    ) ?? findProductInMessage(productFilter, context);

    if (!product) {
      return `No encontré el producto **${productFilter}** en la carta.`;
    }

    return buildSingleProductCostReply(context, product.id, itemProfiles);
  }

  const beverageReport = buildCostMatrixReport({
    products,
    recipes: reportRecipes,
    itemProfiles,
    matrixSettings: context.costMatrixSettings,
    categoryFilter: "beverage",
  });
  const pastryReport = buildCostMatrixReport({
    products,
    recipes: reportRecipes,
    itemProfiles,
    matrixSettings: context.costMatrixSettings,
    categoryFilter: "pastry",
  });

  const beverageLines = beverageReport.rows
    .slice(0, 6)
    .map(
      (row) =>
        `· **${row.name}** — venta ${formatMoney(row.price)} · costo ${formatMoney(row.recipeCost)} · ` +
        `food cost **${(row.foodCostPct * 100).toFixed(1)}%** (${row.status === "high" ? "alto" : row.status === "missing" ? "sin ficha" : "ok"})`,
    )
    .join("\n");

  const pastryLines = pastryReport.rows
    .slice(0, 4)
    .map(
      (row) =>
        `· **${row.name}** — venta ${formatMoney(row.price)} · costo ${formatMoney(row.recipeCost)} · ` +
        `food cost **${(row.foodCostPct * 100).toFixed(1)}%**`,
    )
    .join("\n");

  return (
    "**Matriz de costos**\n\n" +
    `**Bebidas** — food cost prom. **${(beverageReport.averageFoodCostPct * 100).toFixed(1)}%** · ` +
    `${beverageReport.productsAboveTarget} sobre meta · ${beverageReport.productsMissingRecipe} sin ficha\n` +
    `${beverageLines || "· Sin productos"}\n\n` +
    `**Repostería** — food cost prom. **${(pastryReport.averageFoodCostPct * 100).toFixed(1)}%**\n` +
    `${pastryLines || "· Sin productos"}\n\n` +
    "Para actualizar una ficha: «genera ficha de costos de Latte» o «ficha Dirty Chai: 18g café, 200ml leche, precio 9000»."
  );
}

export function buildSingleProductCostReply(
  context: GhostConversationContext,
  productId: string,
  itemProfiles?: Record<string, InventoryCostProfile>,
): string {
  const profiles = itemProfiles ?? buildItemProfiles(context);
  const product = context.menuProducts.find((entry) => entry.id === productId);
  if (!product) {
    return "No encontré ese producto en la carta.";
  }

  const recipe = context.recipesSnapshot.find((entry) => entry.menuProductId === productId);
  if (!recipe || recipe.lines.length === 0) {
    return (
      `**${product.name}**\n` +
      `Precio de venta: **${formatMoney(product.price)}**\n` +
      "Aún no tiene ficha de costos.\n\n" +
      `Di: «genera ficha de costos de ${product.name}» para armarla desde inventario.`
    );
  }

  const batchCost = calculateRecipeBatchCost(
    recipe.lines.map((line) => ({
      ...line,
      unit: line.unit as BaseUnit,
    })),
    profiles,
  );
  const panorama = buildProductCostPanorama({
    category: product.category as MenuCategory,
    batchCostNet: batchCost,
    yieldQuantity: recipe.yieldQuantity,
    userSalePrice: product.price,
    saleTaxCategory: (product.saleTaxCategory ?? "IVA_19") as CoTaxCategory,
    matrixSettings: context.costMatrixSettings,
  });

  const ingredientLines = recipe.lines
    .map((line) => `· ${formatQuantity(line.quantity, line.unit)} ${line.itemName}`)
    .join("\n");

  const yourPrice = panorama.yourPrice;
  const statusLabel =
    yourPrice?.status === "high"
      ? "sobre meta"
      : yourPrice?.status === "missing"
        ? "incompleto"
        : "dentro de meta";

  return (
    `**Ficha — ${product.name}**\n` +
    `**Ingredientes**\n${ingredientLines}\n\n` +
    `· Costo por porción: **${formatMoney(panorama.portionCost)}**\n` +
    `· Precio actual: **${formatMoney(product.price)}**\n` +
    `· Food cost: **${((yourPrice?.foodCostPct ?? 0) * 100).toFixed(1)}%** (${statusLabel})\n` +
    `· Margen bruto: **${((yourPrice?.grossMarginPct ?? 0) * 100).toFixed(1)}%**\n` +
    `· Precio sugerido: **${formatMoney(panorama.suggestedSalePriceGross)}**\n\n` +
    "Para guardar cambios: «ficha [producto]: [cantidad][unidad] [insumo], precio [monto]»."
  );
}

export function buildRecipeCostPreviewReply(
  context: GhostConversationContext,
  draft: {
    productId: string;
    productName: string;
    price?: string;
    yieldQuantity?: string;
    lines: Array<{ itemName: string; quantity: number; unit: string }>;
  },
): string {
  const product = context.menuProducts.find((entry) => entry.id === draft.productId);
  if (!product) {
    return "No encontré el producto en la carta.";
  }

  const itemProfiles = buildItemProfiles(context);
  const recipeLines = draft.lines.map((line) => {
    const inventory = context.inventoryItems.find((item) => item.name === line.itemName);
    return {
      inventoryItemId: inventory?.id ?? "",
      itemName: line.itemName,
      quantity: line.quantity,
      unit: line.unit as "g" | "ml" | "kg" | "l" | "unit",
    };
  });

  const batchCost = calculateRecipeBatchCost(recipeLines, itemProfiles);
  const yieldQty = Number(draft.yieldQuantity || suggestRecipeYield(product.name));
  const salePrice = Number(draft.price ?? product.price);
  const panorama = buildProductCostPanorama({
    category: product.category as MenuCategory,
    batchCostNet: batchCost,
    yieldQuantity: yieldQty,
    userSalePrice: salePrice,
    saleTaxCategory: (product.saleTaxCategory ?? "IVA_19") as CoTaxCategory,
    matrixSettings: context.costMatrixSettings,
  });

  const ingredientLines = draft.lines
    .map((line) => `· ${formatQuantity(line.quantity, line.unit)} ${line.itemName}`)
    .join("\n");

  return (
    `**Vista previa — ${draft.productName}**\n` +
    `${ingredientLines}\n\n` +
    `· Costo por porción: **${formatMoney(panorama.portionCost)}**\n` +
    `· Precio de venta: **${formatMoney(salePrice)}**\n` +
    `· Food cost estimado: **${((panorama.yourPrice?.foodCostPct ?? 0) * 100).toFixed(1)}%**\n` +
    `· Precio sugerido: **${formatMoney(panorama.suggestedSalePriceGross)}**\n\n` +
    "Si está bien, confirma con **sí** o ajusta cantidades/precio."
  );
}

export function buildMenuCatalogReply(context: GhostConversationContext): string {
  if (context.menuProducts.length === 0) {
    return "**Catálogo vacío.** Di «carga la carta Ghost» o «nuevo producto [nombre] a [precio]».";
  }

  const lines = context.menuProducts
    .slice(0, 20)
    .map((product) => {
      const status =
        product.status === "inactive"
          ? ` · ${MENU_PRODUCT_STATUS_LABELS.inactive}`
          : "";
      const category = MENU_CATEGORY_LABELS[product.category as keyof typeof MENU_CATEGORY_LABELS] ?? product.category;
      return `· **${product.name}** — ${formatMoney(product.price)} · ${category}${status}`;
    })
    .join("\n");

  const more =
    context.menuProducts.length > 20
      ? `\n\n…y **${context.menuProducts.length - 20}** productos más.`
      : "";

  return (
    `**Catálogo** (${context.menuProducts.length} productos)\n${lines}${more}\n\n` +
    "Para cambiar precio: «cambia precio del Latte a 9000». Para eliminar: «elimina [producto] del menú»."
  );
}

export function buildInventoryCatalogReply(context: GhostConversationContext): string {
  if (context.inventoryItems.length === 0) {
    return "**Inventario vacío.** Di «nuevo insumo [nombre]» o importa compras.";
  }

  const stockByItem = new Map(
    context.inventoryStockSnapshot.map((entry) => [entry.itemId, entry]),
  );

  const lines = context.inventoryItems
    .slice(0, 20)
    .map((item) => {
      const stock = stockByItem.get(item.id);
      const qty = stock
        ? `${stock.quantity.toLocaleString("es-CO")} ${stock.baseUnit}`
        : "sin stock";
      return `· **${item.name}** — ${qty} · SKU ${item.sku}`;
    })
    .join("\n");

  const more =
    context.inventoryItems.length > 20
      ? `\n\n…y **${context.inventoryItems.length - 20}** insumos más.`
      : "";

  return (
    `**Inventario** (${context.inventoryItems.length} insumos)\n${lines}${more}\n\n` +
    "Para movimiento: «entrada de 500g café» o «salida de 200ml leche»."
  );
}

export function buildTablesStatusReply(context: GhostConversationContext): string {
  if (context.tables.length === 0) {
    return "**No hay mesas configuradas.** Di «crea mesa 1» para agregar una.";
  }

  const openSessionTables = new Set(
    context.openTableSessions.map((session) => session.tableNumber),
  );

  const lines = context.tables
    .slice(0, 15)
    .map((table) => {
      const isOpen = openSessionTables.has(table.number);
      const session = context.openTableSessions.find((entry) => entry.tableNumber === table.number);
      const total = session?.total
        ? ` · cuenta ${formatMoney(session.total)}`
        : isOpen
          ? " · abierta"
          : "";
      return `· **Mesa ${table.number}**${table.label ? ` (${table.label})` : ""} — ${table.status}${total}`;
    })
    .join("\n");

  return (
    `**Mesas** (${context.tables.length} configuradas · ${context.openTableSessions.length} abiertas)\n${lines}\n\n` +
    "Para abrir: «abre la mesa 3». Para cobrar: «cuenta de la mesa 3». Para cancelar: «cancela mesa 3»."
  );
}
