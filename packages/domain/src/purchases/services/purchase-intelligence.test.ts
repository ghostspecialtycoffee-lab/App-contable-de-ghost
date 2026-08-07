import { describe, expect, it } from "vitest";

import {
  buildPurchaseSuggestions,
  calculateAverageDailyConsumption,
  compareSupplierPricesForItem,
  forecastPurchaseStockoutDays,
} from "./purchase-intelligence.js";

describe("purchase-intelligence", () => {
  const referenceDate = new Date("2026-08-07T12:00:00.000Z");

  it("calcula consumo diario promedio con salidas", () => {
    const daily = calculateAverageDailyConsumption(
      [
        {
          itemId: "milk",
          type: "exit",
          quantity: 84,
          occurredAt: "2026-08-06T10:00:00.000Z",
        },
        {
          itemId: "milk",
          type: "exit",
          quantity: 84,
          occurredAt: "2026-08-05T10:00:00.000Z",
        },
      ],
      "milk",
      { lookbackDays: 14, referenceDate },
    );

    expect(daily).toBe(12);
  });

  it("predice días hasta quiebre de stock", () => {
    expect(forecastPurchaseStockoutDays(18, 12)).toBe(2);
    expect(forecastPurchaseStockoutDays(18, 0)).toBeNull();
  });

  it("sugiere compra por pronóstico de quiebre", () => {
    const suggestions = buildPurchaseSuggestions({
      stock: [
        {
          itemId: "milk",
          name: "Leche",
          baseUnit: "ml",
          quantity: 18_000,
          minStock: 5_000,
        },
      ],
      movements: [
        {
          itemId: "milk",
          type: "exit",
          quantity: 84_000,
          occurredAt: "2026-08-06T10:00:00.000Z",
        },
      ],
      lookbackDays: 14,
      forecastHorizonDays: 7,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.daysUntilStockout).toBe(3);
    expect(suggestions[0]?.reason).toBe("forecast_stockout");
    expect(suggestions[0]?.dailyConsumption).toBe(6000);
  });

  it("sugiere compra cuando está bajo mínimo", () => {
    const suggestions = buildPurchaseSuggestions({
      stock: [
        {
          itemId: "coffee",
          name: "Café",
          baseUnit: "g",
          quantity: 200,
          minStock: 2_500,
        },
      ],
      movements: [],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.reason).toBe("below_minimum");
    expect(suggestions[0]?.suggestedQuantity).toBe(2_300);
  });

  it("compara precios por proveedor", () => {
    const comparison = compareSupplierPricesForItem(
      [
        {
          id: "1",
          organizationId: "org",
          inventoryItemId: "coffee",
          supplierName: "Proveedor A",
          unitPriceNet: 70_000,
          unit: "kg",
          quantity: 2.5,
          invoiceId: "inv-1",
          invoiceNumber: "F-1",
          purchasedAt: "2026-07-01",
        },
        {
          id: "2",
          organizationId: "org",
          inventoryItemId: "coffee",
          supplierName: "Proveedor A",
          unitPriceNet: 75_000,
          unit: "kg",
          quantity: 2.5,
          invoiceId: "inv-2",
          invoiceNumber: "F-2",
          purchasedAt: "2026-08-01",
        },
        {
          id: "3",
          organizationId: "org",
          inventoryItemId: "coffee",
          supplierName: "Proveedor B",
          unitPriceNet: 72_000,
          unit: "kg",
          quantity: 2.5,
          invoiceId: "inv-3",
          invoiceNumber: "F-3",
          purchasedAt: "2026-08-02",
        },
      ],
      "coffee",
    );

    expect(comparison[0]?.supplierName).toBe("Proveedor B");
    expect(comparison[0]?.lastUnitPrice).toBe(72_000);
    expect(comparison.find((entry) => entry.supplierName === "Proveedor A")?.priceChangePct).toBeCloseTo(
      7.1,
      0,
    );
  });
});
