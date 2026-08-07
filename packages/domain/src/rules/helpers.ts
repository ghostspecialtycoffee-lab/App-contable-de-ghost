import type { RuleMovementSnapshot, RuleOperationalContext } from "./context.js";

export function formatRuleMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

export function sumSalesTotal(
  sales: RuleOperationalContext["salesSnapshot"],
  soldOn: string,
): number {
  return sales
    .filter((sale) => sale.status === "paid" && sale.soldOn === soldOn)
    .reduce((sum, sale) => sum + sale.total, 0);
}

export function countSales(
  sales: RuleOperationalContext["salesSnapshot"],
  soldOn: string,
): number {
  return sales.filter((sale) => sale.status === "paid" && sale.soldOn === soldOn).length;
}

export function averageDailyConsumption(
  movements: RuleMovementSnapshot[],
  itemId: string,
  lookbackDays = 14,
): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  let total = 0;
  for (const movement of movements) {
    if (movement.itemId !== itemId) {
      continue;
    }
    if (movement.type !== "exit" && movement.type !== "waste") {
      continue;
    }
    const occurredAt = new Date(movement.occurredAt);
    if (Number.isNaN(occurredAt.getTime()) || occurredAt < cutoff) {
      continue;
    }
    total += Math.abs(movement.quantity);
  }

  return total > 0 ? total / lookbackDays : 0;
}

export function forecastDaysUntilStockout(
  quantity: number,
  dailyConsumption: number,
): number | null {
  if (dailyConsumption <= 0) {
    return null;
  }
  if (quantity <= 0) {
    return 0;
  }
  return Math.ceil(quantity / dailyConsumption);
}
