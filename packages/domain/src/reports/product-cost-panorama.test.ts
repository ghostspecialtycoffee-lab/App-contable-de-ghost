import { describe, expect, it } from "vitest";

import { buildProductCostPanorama } from "./product-cost-panorama.js";

describe("buildProductCostPanorama", () => {
  it("muestra división de torta y dos precios (tuyo vs sugerido)", () => {
    const panorama = buildProductCostPanorama({
      category: "pastry",
      batchCostNet: 63000,
      yieldQuantity: 12,
      userSalePrice: 8000,
      saleTaxCategory: "IVA_19",
      matrixSettings: { targetFoodCostPct: 0.3 },
    });

    expect(panorama.lotBreakdown).toEqual({
      batchCostNet: 63000,
      domicilioAllocation: 10000,
      totalLotCost: 73000,
      yieldQuantity: 12,
      portionCost: 6083,
    });
    expect(panorama.yourPrice?.salePriceGross).toBe(8000);
    expect(panorama.yourPrice?.recipeCost).toBe(6083);
    expect(panorama.yourPrice?.foodCostPct).toBeCloseTo(6083 / 8000, 4);
    expect(panorama.suggestedSalePriceGross).toBeGreaterThan(8000);
    expect(panorama.suggestedPrice.foodCostPct).toBeCloseTo(0.3, 2);
  });

  it("sin precio del usuario solo devuelve panorama sugerido", () => {
    const panorama = buildProductCostPanorama({
      category: "pastry",
      batchCostNet: 63000,
      yieldQuantity: 12,
      userSalePrice: 0,
      saleTaxCategory: "IVA_19",
    });

    expect(panorama.yourPrice).toBeNull();
    expect(panorama.suggestedSalePriceGross).toBeGreaterThan(0);
  });
});
