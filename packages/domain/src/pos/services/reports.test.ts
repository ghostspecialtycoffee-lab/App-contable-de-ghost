import { describe, expect, it } from "vitest";

import {
  buildSalesReport,
  filterSalesByPeriod,
  getReportPeriod,
} from "./reports.js";

const sampleSales = [
  {
    soldAt: "2026-08-04T10:00:00.000Z",
    soldOn: "2026-08-04",
    status: "paid" as const,
    subtotal: 10000,
    taxAmount: 1900,
    total: 11900,
    paymentMethod: "cash" as const,
    tableNumber: 3,
    lines: [{ name: "Latte", quantity: 1, lineTotal: 10000 }],
  },
  {
    soldAt: "2026-08-04T12:00:00.000Z",
    soldOn: "2026-08-04",
    status: "paid" as const,
    subtotal: 8000,
    taxAmount: 1520,
    total: 9520,
    paymentMethod: "card" as const,
    lines: [{ name: "Americano", quantity: 1, lineTotal: 8000 }],
  },
];

describe("buildSalesReport", () => {
  it("resume ventas, IVA y métodos de pago", () => {
    const report = buildSalesReport(sampleSales);

    expect(report.invoiceCount).toBe(2);
    expect(report.totalSales).toBe(21420);
    expect(report.taxAmount).toBe(3420);
    expect(report.byPaymentMethod.cash).toBe(11900);
    expect(report.byPaymentMethod.card).toBe(9520);
    expect(report.topProducts[0]?.name).toBe("Latte");
    expect(report.tableSalesCount).toBe(1);
    expect(report.tableSalesTotal).toBe(11900);
    expect(report.counterSalesCount).toBe(1);
    expect(report.counterSalesTotal).toBe(9520);
  });
});

describe("filterSalesByPeriod", () => {
  it("filtra por rango de fechas", () => {
    const filtered = filterSalesByPeriod(
      sampleSales,
      new Date("2026-08-04T00:00:00.000Z"),
      new Date("2026-08-04T23:59:59.999Z"),
    );

    expect(filtered).toHaveLength(2);
  });
});

describe("getReportPeriod", () => {
  it("expone etiquetas de periodo", () => {
    expect(getReportPeriod("today").label).toBe("Hoy");
    expect(getReportPeriod("week").label).toBe("Últimos 7 días");
    expect(getReportPeriod("month").label).toBe("Este mes");
  });
});
