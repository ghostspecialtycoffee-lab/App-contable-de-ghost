import type { AnalyticsPeriodSummary, AnalyticsTrendPoint, AnalyticsDelta, DailyAnalyticsSnapshot } from "./types.js";

export function emptyDailyAnalytics(date: string): DailyAnalyticsSnapshot {
  return {
    date,
    salesCount: 0,
    salesTotal: 0,
    purchasesCount: 0,
    purchasesTotal: 0,
    inventoryMovements: 0,
  };
}

export function applyAnalyticsDelta(
  current: DailyAnalyticsSnapshot | null,
  delta: AnalyticsDelta,
): DailyAnalyticsSnapshot {
  const base = current ?? emptyDailyAnalytics(delta.date);

  return {
    date: delta.date,
    salesCount: base.salesCount + (delta.salesCount ?? 0),
    salesTotal: base.salesTotal + (delta.salesTotal ?? 0),
    purchasesCount: base.purchasesCount + (delta.purchasesCount ?? 0),
    purchasesTotal: base.purchasesTotal + (delta.purchasesTotal ?? 0),
    inventoryMovements: base.inventoryMovements + (delta.inventoryMovements ?? 0),
  };
}

export function mergeDailyAnalyticsSnapshots(
  snapshots: DailyAnalyticsSnapshot[],
): DailyAnalyticsSnapshot[] {
  const merged = new Map<string, DailyAnalyticsSnapshot>();

  for (const snapshot of snapshots) {
    const current = merged.get(snapshot.date);
    merged.set(
      snapshot.date,
      current
        ? {
            date: snapshot.date,
            salesCount: current.salesCount + snapshot.salesCount,
            salesTotal: current.salesTotal + snapshot.salesTotal,
            purchasesCount: current.purchasesCount + snapshot.purchasesCount,
            purchasesTotal: current.purchasesTotal + snapshot.purchasesTotal,
            inventoryMovements:
              current.inventoryMovements + snapshot.inventoryMovements,
          }
        : { ...snapshot },
    );
  }

  return [...merged.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function rollupDailyAnalyticsFromSources(input: {
  sales: Array<{ soldOn: string; status: string; total: number }>;
  purchases: Array<{ invoiceDate: string; status: string; total: number }>;
  inventoryMovementDates?: string[];
}): DailyAnalyticsSnapshot[] {
  const byDate = new Map<string, DailyAnalyticsSnapshot>();

  for (const sale of input.sales) {
    if (sale.status !== "paid") {
      continue;
    }
    const date = sale.soldOn.slice(0, 10);
    const current = byDate.get(date) ?? emptyDailyAnalytics(date);
    byDate.set(date, {
      ...current,
      salesCount: current.salesCount + 1,
      salesTotal: current.salesTotal + sale.total,
    });
  }

  for (const purchase of input.purchases) {
    if (purchase.status !== "confirmed") {
      continue;
    }
    const date = purchase.invoiceDate.slice(0, 10);
    const current = byDate.get(date) ?? emptyDailyAnalytics(date);
    byDate.set(date, {
      ...current,
      purchasesCount: current.purchasesCount + 1,
      purchasesTotal: current.purchasesTotal + purchase.total,
    });
  }

  for (const occurredAt of input.inventoryMovementDates ?? []) {
    const date = occurredAt.slice(0, 10);
    const current = byDate.get(date) ?? emptyDailyAnalytics(date);
    byDate.set(date, {
      ...current,
      inventoryMovements: current.inventoryMovements + 1,
    });
  }

  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function buildAnalyticsPeriodSummary(input: {
  snapshots: DailyAnalyticsSnapshot[];
  from: string;
  to: string;
}): AnalyticsPeriodSummary {
  const filtered = input.snapshots.filter(
    (snapshot) => snapshot.date >= input.from && snapshot.date <= input.to,
  );

  const totals = filtered.reduce(
    (accumulator, snapshot) => ({
      date: input.to,
      salesCount: accumulator.salesCount + snapshot.salesCount,
      salesTotal: accumulator.salesTotal + snapshot.salesTotal,
      purchasesCount: accumulator.purchasesCount + snapshot.purchasesCount,
      purchasesTotal: accumulator.purchasesTotal + snapshot.purchasesTotal,
      inventoryMovements: accumulator.inventoryMovements + snapshot.inventoryMovements,
    }),
    emptyDailyAnalytics(input.to),
  );

  const trend: AnalyticsTrendPoint[] = filtered.map((snapshot) => ({
    ...snapshot,
    netOperationalFlow: snapshot.salesTotal - snapshot.purchasesTotal,
  }));

  return {
    from: input.from,
    to: input.to,
    days: filtered.length,
    totals,
    trend,
  };
}
