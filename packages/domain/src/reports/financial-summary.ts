import type { CashMovementType } from "../cash/cash-movement.js";
import type { InventoryMovementType } from "../inventory/movement.js";
import type { PurchasesReport } from "./purchases-report.js";
import type { SalesReport } from "../pos/services/reports.js";

export interface CashMovementsReport {
  inflowsTotal: number;
  outflowsTotal: number;
  loansTotal: number;
  loanRepaymentsTotal: number;
  movementCount: number;
}

export interface InventoryAdjustmentsReport {
  entryTotal: number;
  exitTotal: number;
  adjustmentCount: number;
  wasteTotal: number;
}

export interface FinancialSummary {
  periodLabel: string;
  sales: SalesReport;
  purchases: PurchasesReport;
  cash: CashMovementsReport;
  inventory: InventoryAdjustmentsReport;
  /** Ventas − compras confirmadas (referencia operativa, no utilidad contable). */
  operationalMargin: number;
}

export function buildCashMovementsReport(
  movements: Array<{ type: CashMovementType; amount: number }>,
): CashMovementsReport {
  let inflowsTotal = 0;
  let outflowsTotal = 0;
  let loansTotal = 0;
  let loanRepaymentsTotal = 0;

  for (const movement of movements) {
    const amount = Math.max(0, Math.round(movement.amount));
    switch (movement.type) {
      case "inflow":
        inflowsTotal += amount;
        break;
      case "outflow":
        outflowsTotal += amount;
        break;
      case "loan":
        loansTotal += amount;
        break;
      case "loan_repayment":
        loanRepaymentsTotal += amount;
        break;
    }
  }

  return {
    inflowsTotal,
    outflowsTotal,
    loansTotal,
    loanRepaymentsTotal,
    movementCount: movements.length,
  };
}

export function buildInventoryAdjustmentsReport(
  movements: Array<{ type: InventoryMovementType; totalCost: number }>,
): InventoryAdjustmentsReport {
  let entryTotal = 0;
  let exitTotal = 0;
  let wasteTotal = 0;
  let adjustmentCount = 0;

  for (const movement of movements) {
    adjustmentCount += 1;
    const cost = Math.max(0, Math.round(movement.totalCost));
    if (movement.type === "entry" || movement.type === "transfer_in") {
      entryTotal += cost;
    } else if (
      movement.type === "exit" ||
      movement.type === "waste" ||
      movement.type === "transfer_out"
    ) {
      exitTotal += cost;
      if (movement.type === "waste") {
        wasteTotal += cost;
      }
    }
  }

  return {
    entryTotal,
    exitTotal,
    adjustmentCount,
    wasteTotal,
  };
}

export function buildFinancialSummary(input: {
  periodLabel: string;
  sales: SalesReport;
  purchases: PurchasesReport;
  cash: CashMovementsReport;
  inventory: InventoryAdjustmentsReport;
}): FinancialSummary {
  return {
    periodLabel: input.periodLabel,
    sales: input.sales,
    purchases: input.purchases,
    cash: input.cash,
    inventory: input.inventory,
    operationalMargin: input.sales.totalSales - input.purchases.totalPurchases,
  };
}

export function filterByIsoDateRange<T extends { dateIso: string }>(
  rows: T[],
  from: Date,
  to: Date,
): T[] {
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = to.toISOString().slice(0, 10);
  return rows.filter((row) => row.dateIso >= fromIso && row.dateIso <= toIso);
}

export function filterByTimestampRange<T extends { occurredAt: string }>(
  rows: T[],
  from: Date,
  to: Date,
): T[] {
  const fromTime = from.getTime();
  const toTime = to.getTime();
  return rows.filter((row) => {
    const time = new Date(row.occurredAt).getTime();
    return time >= fromTime && time <= toTime;
  });
}
