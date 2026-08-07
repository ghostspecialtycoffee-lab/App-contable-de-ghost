import type { DailyAnalyticsSnapshot } from "../events/types.js";

export type AnalyticsDelta = Partial<
  Pick<
    DailyAnalyticsSnapshot,
    "salesCount" | "salesTotal" | "purchasesCount" | "purchasesTotal" | "inventoryMovements"
  >
> & {
  date: string;
};

export interface AnalyticsTrendPoint extends DailyAnalyticsSnapshot {
  netOperationalFlow: number;
}

export interface AnalyticsPeriodSummary {
  from: string;
  to: string;
  days: number;
  totals: DailyAnalyticsSnapshot;
  trend: AnalyticsTrendPoint[];
}
