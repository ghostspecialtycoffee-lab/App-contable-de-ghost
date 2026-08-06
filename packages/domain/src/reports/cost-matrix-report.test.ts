import { describe, expect, it } from "vitest";

import { buildCostMatrixReport } from "./cost-matrix-report.js";
import type { InventoryCostProfile } from "../inventory/unit-conversion.js";

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
    expect(report.rows[0]?.recipeCost).toBeGreaterThan(0);
    expect(report.rows[0]?.hasRecipe).toBe(true);
    expect(report.averageFoodCostPct).toBeGreaterThan(0);
  });
});
