import { describe, expect, it } from "vitest";

import {
  calculateRecipeConsumption,
  calculateRecipeCostPerPortion,
  normalizeYieldQuantity,
  suggestRecipeYield,
} from "./recipe-yield.js";

describe("recipe-yield", () => {
  it("sugiere 12 porciones para tortas", () => {
    expect(suggestRecipeYield("Torta zanahoria")).toBe(12);
    expect(suggestRecipeYield("Tarta de queso")).toBe(12);
  });

  it("calcula costo por porción", () => {
    const cost = calculateRecipeCostPerPortion(
      [
        {
          inventoryItemId: "torta",
          itemName: "Torta zanahoria",
          quantity: 1,
          unit: "unit",
        },
      ],
      { torta: { baseUnit: "unit", averageCost: 48000 } },
      12,
    );

    expect(cost).toBe(4000);
  });

  it("calcula consumo de bodega por porción vendida", () => {
    const consumption = calculateRecipeConsumption(
      {
        yieldQuantity: 12,
        lines: [
          {
            inventoryItemId: "torta",
            itemName: "Torta zanahoria",
            quantity: 1,
            unit: "unit",
          },
        ],
      },
      2,
      { torta: { baseUnit: "unit", averageCost: 48000 } },
    );

    expect(consumption).toHaveLength(1);
    expect(consumption[0]?.quantityInBase).toBeCloseTo(2 / 12, 5);
  });

  it("normaliza rendimiento inválido a 1", () => {
    expect(normalizeYieldQuantity(0)).toBe(1);
    expect(normalizeYieldQuantity(-3)).toBe(1);
  });
});
