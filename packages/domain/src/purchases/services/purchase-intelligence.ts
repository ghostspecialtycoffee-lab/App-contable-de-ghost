import type { BaseUnit } from "../../inventory/units.js";
import type { InventoryMovementType } from "../../inventory/movement.js";
import type { PurchasePriceHistoryEntry } from "../price-history.js";

export interface ConsumptionMovementSnapshot {
  itemId: string;
  type: InventoryMovementType;
  quantity: number;
  occurredAt: string;
}

export interface StockSnapshot {
  itemId: string;
  name: string;
  baseUnit: BaseUnit;
  quantity: number;
  minStock: number;
}

export type PurchaseSuggestionReason = "below_minimum" | "forecast_stockout" | "both";

export interface PurchaseSuggestion {
  itemId: string;
  name: string;
  baseUnit: BaseUnit;
  currentQuantity: number;
  minStock: number;
  dailyConsumption: number;
  daysUntilStockout: number | null;
  suggestedQuantity: number;
  reason: PurchaseSuggestionReason;
  preferredSupplierName?: string;
  lastUnitCost?: number;
}

export interface SupplierPriceComparison {
  supplierName: string;
  lastUnitPrice: number;
  lastPurchaseDate: string;
  purchaseCount: number;
  priceChangePct?: number;
}

const DEFAULT_LOOKBACK_DAYS = 14;
const FORECAST_HORIZON_DAYS = 7;

export function calculateAverageDailyConsumption(
  movements: ConsumptionMovementSnapshot[],
  itemId: string,
  options?: { lookbackDays?: number; referenceDate?: Date },
): number {
  const lookbackDays = options?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const referenceDate = options?.referenceDate ?? new Date();
  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  let totalExit = 0;
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
    totalExit += movement.quantity;
  }

  if (totalExit <= 0) {
    return 0;
  }

  return totalExit / lookbackDays;
}

export function forecastDaysUntilStockout(
  currentQuantity: number,
  dailyConsumption: number,
  threshold = 0,
): number | null {
  if (dailyConsumption <= 0) {
    return null;
  }

  const target = Math.max(threshold, 0);
  if (currentQuantity <= target) {
    return 0;
  }

  return Math.ceil((currentQuantity - target) / dailyConsumption);
}

function resolvePreferredSupplier(
  priceHistory: PurchasePriceHistoryEntry[],
  itemId: string,
): { supplierName?: string; lastUnitCost?: number } {
  const entries = priceHistory
    .filter((entry) => entry.inventoryItemId === itemId)
    .sort((left, right) => right.purchasedAt.localeCompare(left.purchasedAt));

  const latest = entries[0];
  if (!latest) {
    return {};
  }

  return {
    supplierName: latest.supplierName,
    lastUnitCost: latest.unitPriceNet,
  };
}

export function buildPurchaseSuggestions(input: {
  stock: StockSnapshot[];
  movements: ConsumptionMovementSnapshot[];
  priceHistory?: PurchasePriceHistoryEntry[];
  lookbackDays?: number;
  forecastHorizonDays?: number;
}): PurchaseSuggestion[] {
  const lookbackDays = input.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const forecastHorizonDays = input.forecastHorizonDays ?? FORECAST_HORIZON_DAYS;
  const priceHistory = input.priceHistory ?? [];
  const suggestions: PurchaseSuggestion[] = [];

  for (const item of input.stock) {
    const dailyConsumption = calculateAverageDailyConsumption(input.movements, item.itemId, {
      lookbackDays,
    });
    const belowMinimum = item.minStock > 0 && item.quantity < item.minStock;
    const daysUntilStockout = forecastDaysUntilStockout(item.quantity, dailyConsumption);
    const forecastRisk =
      dailyConsumption > 0 &&
      daysUntilStockout !== null &&
      daysUntilStockout <= forecastHorizonDays;

    if (!belowMinimum && !forecastRisk) {
      continue;
    }

    let suggestedQuantity = 0;
    if (belowMinimum) {
      suggestedQuantity = Math.max(item.minStock - item.quantity, 0);
    }
    if (forecastRisk && dailyConsumption > 0) {
      const forecastNeed = Math.ceil(dailyConsumption * forecastHorizonDays);
      suggestedQuantity = Math.max(suggestedQuantity, forecastNeed);
    }
    if (suggestedQuantity <= 0 && belowMinimum) {
      suggestedQuantity = item.minStock;
    }

    const { supplierName, lastUnitCost } = resolvePreferredSupplier(priceHistory, item.itemId);

    suggestions.push({
      itemId: item.itemId,
      name: item.name,
      baseUnit: item.baseUnit,
      currentQuantity: item.quantity,
      minStock: item.minStock,
      dailyConsumption: Math.round(dailyConsumption * 100) / 100,
      daysUntilStockout,
      suggestedQuantity: Math.round(suggestedQuantity * 100) / 100,
      reason: belowMinimum && forecastRisk ? "both" : belowMinimum ? "below_minimum" : "forecast_stockout",
      preferredSupplierName: supplierName,
      lastUnitCost,
    });
  }

  return suggestions.sort((left, right) => {
    const leftDays = left.daysUntilStockout ?? Number.POSITIVE_INFINITY;
    const rightDays = right.daysUntilStockout ?? Number.POSITIVE_INFINITY;
    if (leftDays !== rightDays) {
      return leftDays - rightDays;
    }
    return left.name.localeCompare(right.name, "es");
  });
}

export function compareSupplierPricesForItem(
  priceHistory: PurchasePriceHistoryEntry[],
  itemId: string,
): SupplierPriceComparison[] {
  const bySupplier = new Map<
    string,
    { lastUnitPrice: number; lastPurchaseDate: string; purchaseCount: number; prices: number[] }
  >();

  for (const entry of priceHistory) {
    if (entry.inventoryItemId !== itemId) {
      continue;
    }

    const current = bySupplier.get(entry.supplierName) ?? {
      lastUnitPrice: entry.unitPriceNet,
      lastPurchaseDate: entry.purchasedAt,
      purchaseCount: 0,
      prices: [],
    };

    current.purchaseCount += 1;
    current.prices.push(entry.unitPriceNet);

    if (entry.purchasedAt >= current.lastPurchaseDate) {
      current.lastPurchaseDate = entry.purchasedAt;
      current.lastUnitPrice = entry.unitPriceNet;
    }

    bySupplier.set(entry.supplierName, current);
  }

  return [...bySupplier.entries()]
    .map(([supplierName, data]) => {
      const sortedPrices = data.prices.sort((left, right) => left - right);
      const previousPrice = sortedPrices.length > 1 ? sortedPrices[sortedPrices.length - 2] : undefined;
      const priceChangePct =
        previousPrice && previousPrice > 0
          ? Math.round(((data.lastUnitPrice - previousPrice) / previousPrice) * 1000) / 10
          : undefined;

      return {
        supplierName,
        lastUnitPrice: data.lastUnitPrice,
        lastPurchaseDate: data.lastPurchaseDate,
        purchaseCount: data.purchaseCount,
        priceChangePct,
      };
    })
    .sort((left, right) => left.lastUnitPrice - right.lastUnitPrice);
}
