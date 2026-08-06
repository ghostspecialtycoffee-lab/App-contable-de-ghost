import { PAYMENT_METHOD_LABELS, type PaymentMethod, type SaleStatus } from "../pos/sale.js";
import {
  buildSalesReport,
  filterSalesByPeriod,
  getReportPeriod,
} from "../pos/services/reports.js";
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
