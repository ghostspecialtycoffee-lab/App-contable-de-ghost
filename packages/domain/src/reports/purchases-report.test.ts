import { describe, expect, it } from "vitest";

import { buildPurchasesReport, filterPurchasesByPeriod } from "./purchases-report.js";
import { getReportPeriod } from "../pos/services/reports.js";

describe("buildPurchasesReport", () => {
  it("aggregates confirmed purchases by day and supplier", () => {
    const period = getReportPeriod("month");
    const filtered = filterPurchasesByPeriod(
      [
        {
          invoiceDate: "2026-08-01",
          status: "confirmed",
          supplierName: "Black Coffee",
          subtotal: 145000,
          taxAmount: 0,
          total: 145000,
        },
        {
          invoiceDate: "2026-08-01",
          status: "confirmed",
          supplierName: "Rapimerque",
          subtotal: 50000,
          taxAmount: 9500,
          total: 59500,
        },
        {
          invoiceDate: "2026-08-02",
          status: "draft",
          supplierName: "Draft",
          subtotal: 1000,
          taxAmount: 0,
          total: 1000,
        },
      ],
      period.from,
      period.to,
    );

    const report = buildPurchasesReport(filtered);
    expect(report.invoiceCount).toBe(2);
    expect(report.totalPurchases).toBe(204500);
    expect(report.byDay[0]?.date).toBe("2026-08-01");
    expect(report.topSuppliers[0]?.name).toBe("Black Coffee");
  });
});
