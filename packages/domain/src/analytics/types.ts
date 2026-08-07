export interface DailyAnalyticsSnapshot {
  date: string;
  salesCount: number;
  salesTotal: number;
  purchasesCount: number;
  purchasesTotal: number;
  inventoryMovements: number;
}

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
