import { PAYMENT_METHOD_LABELS, type PaymentMethod, type SaleStatus } from "../pos/sale.js";
import {
  buildSalesReport,
  filterSalesByPeriod,
  getReportPeriod,
} from "../pos/services/reports.js";
import { FIXED_EXPENSE_CATEGORY_LABELS, type FixedExpenseCategory } from "../expenses/fixed-expense.js";
import { summarizeFixedExpenses } from "../expenses/services/fixed-expense.js";
import { KITCHEN_ORDER_STATUS_LABELS, type KitchenOrderStatus } from "../pos/kitchen-order.js";
import { KITCHEN_STATION_LABELS, type KitchenStation } from "../pos/menu-product.js";
import { WORK_SHIFT_ROLE_LABELS } from "../operations/shifts.js";
import type { PurchaseInvoice } from "../purchases/invoice.js";
import {
  buildPurchasesReport,
  filterPurchasesByPeriod,
} from "../reports/purchases-report.js";
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
      "Configura `minStock` en cada insumo o pregunta «revisar compras» para ver facturas recientes."
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
    "Revisa **Inventario → Stock** o registra una compra: «registra compra de [insumo] del proveedor [nombre]»."
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
