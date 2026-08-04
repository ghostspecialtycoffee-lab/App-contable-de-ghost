import { describe, expect, it } from "vitest";

import { calculateCostMatrix } from "./colombia-tax.js";

describe("calculateCostMatrix", () => {
  it("calcula food cost y precio sugerido", () => {
    const result = calculateCostMatrix({
      unitCostNet: 2000,
      quantity: 1,
      purchaseTaxCategory: "IVA_19",
      salePriceGross: 10000,
      saleTaxCategory: "IVA_19",
      recipeCost: 2380,
      targetCostPct: 0.3,
    });

    expect(result.recipeCost).toBe(2380);
    expect(result.foodCostPct).toBeCloseTo(0.238, 3);
    expect(result.suggestedSalePriceGross).toBeGreaterThan(0);
    expect(result.grossMarginPct).toBeGreaterThan(0.7);
  });
});
