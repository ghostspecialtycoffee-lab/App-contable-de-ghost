import { describe, expect, it } from "vitest";

import {
  buildSaleCostSnapshot,
  sumLotConsumptionCost,
} from "./sale-cost-snapshot.js";

describe("buildSaleCostSnapshot", () => {
  it("calcula food cost desde recetas con promedio ponderado", () => {
    const snapshot = buildSaleCostSnapshot({
      method: "weighted_average",
      saleLines: [
        { productId: "latte", name: "Latte", quantity: 2, lineTotal: 23_000 },
      ],
      recipeSnapshots: [{ productId: "latte", recipeCost: 4_200 }],
    });

    expect(snapshot.totalIngredientCost).toBe(8_400);
    expect(snapshot.totalRevenue).toBe(23_000);
    expect(snapshot.foodCostPct).toBeCloseTo(8_400 / 23_000, 5);
    expect(snapshot.lines[0]?.unitCost).toBe(4_200);
    expect(snapshot.lines[0]?.method).toBe("weighted_average");
  });

  it("usa costo FIFO por producto cuando hay consumo por lote", () => {
    const snapshot = buildSaleCostSnapshot({
      method: "fifo",
      saleLines: [
        { productId: "latte", name: "Latte", quantity: 1, lineTotal: 11_500 },
      ],
      recipeSnapshots: [{ productId: "latte", recipeCost: 4_200 }],
      ingredientCostByProduct: { latte: 4_800 },
    });

    expect(snapshot.lines[0]?.unitCost).toBe(4_800);
    expect(snapshot.totalIngredientCost).toBe(4_800);
  });

  it("usa costo estándar de receta cuando el método es standard", () => {
    const snapshot = buildSaleCostSnapshot({
      method: "standard",
      saleLines: [
        { productId: "muffin", name: "Muffin", quantity: 3, lineTotal: 18_000 },
      ],
      recipeSnapshots: [{ productId: "muffin", recipeCost: 2_500 }],
    });

    expect(snapshot.totalIngredientCost).toBe(7_500);
    expect(snapshot.lines[0]?.method).toBe("standard");
  });
});

describe("sumLotConsumptionCost", () => {
  it("suma cantidad por costo unitario", () => {
    expect(
      sumLotConsumptionCost([
        { quantity: 100, unitCost: 50 },
        { quantity: 50, unitCost: 80 },
      ]),
    ).toBe(9_000);
  });
});
