import type { PaymentMethod, Sale } from "../sale.js";
import { PAYMENT_METHODS } from "../sale.js";

export interface SalesReportPeriod {
  from: Date;
  to: Date;
  label: string;
}

export interface SalesReport {
  invoiceCount: number;
  totalSales: number;
  subtotal: number;
  taxAmount: number;
  averageTicket: number;
  tableSalesCount: number;
  tableSalesTotal: number;
  counterSalesCount: number;
  counterSalesTotal: number;
  byPaymentMethod: Record<PaymentMethod, number>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface SaleForReport {
  soldAt: string;
  soldOn: string;
  status: Sale["status"];
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  tableNumber?: number;
  lines: Array<{
    name: string;
    quantity: number;
    lineTotal: number;
  }>;
}

function emptyPaymentTotals(): Record<PaymentMethod, number> {
  return PAYMENT_METHODS.reduce(
    (accumulator, method) => {
      accumulator[method] = 0;
      return accumulator;
    },
    {} as Record<PaymentMethod, number>,
  );
}

export function filterSalesByPeriod(
  sales: SaleForReport[],
  from: Date,
  to: Date,
): SaleForReport[] {
  const fromTime = from.getTime();
  const toTime = to.getTime();

  return sales.filter((sale) => {
    if (sale.status !== "paid") {
      return false;
    }

    const soldAt = sale.soldAt || `${sale.soldOn}T12:00:00.000Z`;
    const time = new Date(soldAt).getTime();
    return time >= fromTime && time <= toTime;
  });
}

export function buildSalesReport(sales: SaleForReport[]): SalesReport {
  const byPaymentMethod = emptyPaymentTotals();
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  let subtotal = 0;
  let taxAmount = 0;
  let totalSales = 0;
  let tableSalesCount = 0;
  let tableSalesTotal = 0;
  let counterSalesCount = 0;
  let counterSalesTotal = 0;

  for (const sale of sales) {
    subtotal += sale.subtotal;
    taxAmount += sale.taxAmount;
    totalSales += sale.total;
    byPaymentMethod[sale.paymentMethod] =
      (byPaymentMethod[sale.paymentMethod] ?? 0) + sale.total;

    if (sale.tableNumber !== undefined) {
      tableSalesCount += 1;
      tableSalesTotal += sale.total;
    } else {
      counterSalesCount += 1;
      counterSalesTotal += sale.total;
    }

    for (const line of sale.lines) {
      const current = productMap.get(line.name) ?? {
        name: line.name,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += line.quantity;
      current.revenue += line.lineTotal;
      productMap.set(line.name, current);
    }
  }

  const invoiceCount = sales.length;
  const topProducts = [...productMap.values()]
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 10);

  return {
    invoiceCount,
    totalSales,
    subtotal,
    taxAmount,
    averageTicket: invoiceCount > 0 ? Math.round(totalSales / invoiceCount) : 0,
    tableSalesCount,
    tableSalesTotal,
    counterSalesCount,
    counterSalesTotal,
    byPaymentMethod,
    topProducts,
  };
}

export function getReportPeriod(preset: "today" | "week" | "month" | "year"): SalesReportPeriod {
  const now = new Date();

  if (preset === "today") {
    return {
      from: startOfDay(now),
      to: endOfDay(now),
      label: "Hoy",
    };
  }

  if (preset === "week") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return {
      from,
      to: endOfDay(now),
      label: "Últimos 7 días",
    };
  }

  if (preset === "year") {
    const from = startOfDay(new Date(now.getFullYear(), 0, 1));
    return {
      from,
      to: endOfDay(now),
      label: `Este año (${now.getFullYear()})`,
    };
  }

  const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  return {
    from,
    to: endOfDay(now),
    label: "Este mes",
  };
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}
