import { describe, expect, it } from "vitest";

import {
  calculateCostMatrix,
  extractTaxFromGrossPrice,
  inferMenuProductTaxCategory,
  isCoffeeBeverageName,
} from "./colombia-tax.js";

describe("calculateCostMatrix", () => {
  it("calcula food cost y precio sugerido", () => {
    const result = calculateCostMatrix({
      unitCostNet: 2000,
      quantity: 1,
      purchaseTaxCategory: "IVA_19",
      salePriceGross: 10000,
      saleTaxCategory: "INC_8",
      recipeCost: 2380,
      targetCostPct: 0.3,
    });

    expect(result.recipeCost).toBe(2380);
    expect(result.foodCostPct).toBeCloseTo(0.238, 3);
    expect(result.suggestedSalePriceGross).toBeGreaterThan(0);
    expect(result.grossMarginPct).toBeGreaterThan(0.7);
  });
});

describe("extractTaxFromGrossPrice", () => {
  it("extrae INC 8% de un americano a 10000", () => {
    const result = extractTaxFromGrossPrice(10000, "INC_8");

    expect(result.gross).toBe(10000);
    expect(result.net).toBe(9259);
    expect(result.taxAmount).toBe(741);
  });

  it("extrae IVA 19% incluido en precio final", () => {
    const result = extractTaxFromGrossPrice(11900, "IVA_19");

    expect(result.gross).toBe(11900);
    expect(result.net + result.taxAmount).toBe(11900);
  });
});

describe("inferMenuProductTaxCategory", () => {
  it("asigna INC 8% a bebidas con café", () => {
    expect(isCoffeeBeverageName("Americano")).toBe(true);
    expect(
      inferMenuProductTaxCategory({ name: "Americano", category: "beverage" }),
    ).toBe("INC_8");
  });

  it("asigna IVA 19% a otras bebidas", () => {
    expect(
      inferMenuProductTaxCategory({ name: "Jugo natural", category: "beverage" }),
    ).toBe("IVA_19");
  });
});
