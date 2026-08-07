import { describe, expect, it } from "vitest";

import {
  applyAnalyticsDelta,
  buildAnalyticsPeriodSummary,
  mergeDailyAnalyticsSnapshots,
  rollupDailyAnalyticsFromSources,
} from "./rollup.js";

describe("analytics rollup", () => {
  it("aplica deltas incrementales por día", () => {
    const day = applyAnalyticsDelta(null, {
      date: "2026-08-07",
      salesCount: 2,
      salesTotal: 50_000,
    });

    const updated = applyAnalyticsDelta(day, {
      date: "2026-08-07",
      purchasesCount: 1,
      purchasesTotal: 120_000,
    });

    expect(updated.salesCount).toBe(2);
    expect(updated.purchasesTotal).toBe(120_000);
  });

  it("reconstruye series diarias desde ventas y compras", () => {
    const snapshots = rollupDailyAnalyticsFromSources({
      sales: [
        { soldOn: "2026-08-07", status: "paid", total: 30_000 },
        { soldOn: "2026-08-07", status: "paid", total: 20_000 },
      ],
      purchases: [{ invoiceDate: "2026-08-07", status: "confirmed", total: 100_000 }],
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.salesCount).toBe(2);
    expect(snapshots[0]?.salesTotal).toBe(50_000);
    expect(snapshots[0]?.purchasesTotal).toBe(100_000);
  });

  it("resume un periodo con flujo neto", () => {
    const summary = buildAnalyticsPeriodSummary({
      from: "2026-08-01",
      to: "2026-08-03",
      snapshots: mergeDailyAnalyticsSnapshots([
        {
          date: "2026-08-01",
          salesCount: 1,
          salesTotal: 80_000,
          purchasesCount: 0,
          purchasesTotal: 0,
          inventoryMovements: 0,
        },
        {
          date: "2026-08-02",
          salesCount: 0,
          salesTotal: 0,
          purchasesCount: 1,
          purchasesTotal: 40_000,
          inventoryMovements: 2,
        },
      ]),
    });

    expect(summary.totals.salesTotal).toBe(80_000);
    expect(summary.totals.purchasesTotal).toBe(40_000);
    expect(summary.trend[0]?.netOperationalFlow).toBe(80_000);
    expect(summary.trend[1]?.netOperationalFlow).toBe(-40_000);
  });
});
