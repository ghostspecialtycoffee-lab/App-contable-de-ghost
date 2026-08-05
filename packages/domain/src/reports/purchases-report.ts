import type { PurchaseInvoice } from "../purchases/invoice.js";
import type { SalesReportPeriod } from "../pos/services/reports.js";

export interface PurchasesReport {
  invoiceCount: number;
  totalPurchases: number;
  subtotal: number;
  taxAmount: number;
  averageInvoice: number;
  byDay: Array<{
    date: string;
    invoiceCount: number;
    total: number;
  }>;
  topSuppliers: Array<{
    name: string;
    invoiceCount: number;
    total: number;
  }>;
}

export interface PurchaseForReport {
  invoiceDate: string;
  status: PurchaseInvoice["status"];
  supplierName: string;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function filterPurchasesByPeriod(
  invoices: PurchaseForReport[],
  from: Date,
  to: Date,
): PurchaseForReport[] {
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = to.toISOString().slice(0, 10);

  return invoices.filter((invoice) => {
    if (invoice.status !== "confirmed") {
      return false;
    }
    return invoice.invoiceDate >= fromIso && invoice.invoiceDate <= toIso;
  });
}

export function buildPurchasesReport(invoices: PurchaseForReport[]): PurchasesReport {
  const dayMap = new Map<string, { invoiceCount: number; total: number }>();
  const supplierMap = new Map<string, { invoiceCount: number; total: number }>();

  let subtotal = 0;
  let taxAmount = 0;
  let totalPurchases = 0;

  for (const invoice of invoices) {
    subtotal += invoice.subtotal;
    taxAmount += invoice.taxAmount;
    totalPurchases += invoice.total;

    const day = dayMap.get(invoice.invoiceDate) ?? { invoiceCount: 0, total: 0 };
    day.invoiceCount += 1;
    day.total += invoice.total;
    dayMap.set(invoice.invoiceDate, day);

    const supplier = supplierMap.get(invoice.supplierName) ?? { invoiceCount: 0, total: 0 };
    supplier.invoiceCount += 1;
    supplier.total += invoice.total;
    supplierMap.set(invoice.supplierName, supplier);
  }

  const invoiceCount = invoices.length;

  return {
    invoiceCount,
    totalPurchases,
    subtotal,
    taxAmount,
    averageInvoice: invoiceCount > 0 ? Math.round(totalPurchases / invoiceCount) : 0,
    byDay: [...dayMap.entries()]
      .map(([date, value]) => ({
        date,
        invoiceCount: value.invoiceCount,
        total: value.total,
      }))
      .sort((left, right) => right.date.localeCompare(left.date)),
    topSuppliers: [...supplierMap.entries()]
      .map(([name, value]) => ({
        name,
        invoiceCount: value.invoiceCount,
        total: value.total,
      }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 8),
  };
}

export type { SalesReportPeriod };
