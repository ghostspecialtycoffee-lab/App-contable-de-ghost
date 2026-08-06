import { describe, expect, it } from "vitest";

import { buildCostMatrixReport } from "./cost-matrix-report.js";
import type { InventoryCostProfile } from "../inventory/unit-conversion.js";
import { PASTRY_DOMICILIO_ALLOCATION_COP } from "../operations/pastry-costing.js";

describe("buildCostMatrixReport", () => {
  it("calcula food cost y margen por producto", () => {
    const report = buildCostMatrixReport({
      products: [
        {
          id: "latte",
          name: "Latte",
          price: 11500,
          category: "beverage",
          saleTaxCategory: "INC_8",
          recipeCost: 2500,
        },
      ],
      recipes: [
        {
          menuProductId: "latte",
          yieldQuantity: 1,
          lines: [
            {
              inventoryItemId: "coffee",
              itemName: "Café",
              quantity: 18,
              unit: "g",
            },
          ],
        },
      ],
      itemProfiles: {
        coffee: {
          baseUnit: "g",
          averageCost: 100,
        } satisfies InventoryCostProfile,
      },
      matrixSettings: { targetBeverageCostPct: 0.25 },
    });

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]?.name).toBe("Latte");
    expect(report.rows[0]?.price).toBe(11500);
    expect(report.rows[0]?.effectiveSalePrice).toBe(11500);
    expect(report.rows[0]?.recipeCost).toBeGreaterThan(0);
    expect(report.rows[0]?.hasRecipe).toBe(true);
    expect(report.averageFoodCostPct).toBeGreaterThan(0);
  });

  it("costea repostería por porción con domicilio en el precio efectivo", () => {
    const report = buildCostMatrixReport({
      products: [
        {
          id: "torta",
          name: "Torta zanahoria",
          price: 8000,
          category: "pastry",
          saleTaxCategory: "IVA_19",
        },
      ],
      recipes: [
        {
          menuProductId: "torta",
          yieldQuantity: 12,
          lines: [
            {
              inventoryItemId: "torta-item",
              itemName: "Torta zanahoria",
              quantity: 1,
              unit: "unit",
            },
          ],
        },
      ],
      itemProfiles: {
        "torta-item": {
          baseUnit: "unit",
          averageCost: 63000,
        } satisfies InventoryCostProfile,
      },
      categoryFilter: "pastry",
    });

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]?.recipeCost).toBe(5250);
    expect(report.rows[0]?.effectiveSalePrice).toBe(8000 + PASTRY_DOMICILIO_ALLOCATION_COP);
    expect(report.rows[0]?.foodCostPct).toBeCloseTo(5250 / (8000 + PASTRY_DOMICILIO_ALLOCATION_COP), 4);
  });
});
