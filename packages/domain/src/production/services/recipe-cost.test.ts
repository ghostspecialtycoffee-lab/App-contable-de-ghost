import { describe, expect, it } from "vitest";

import { calculateRecipeCost } from "./recipe-cost.js";

describe("calculateRecipeCost", () => {
  it("suma costo de ingredientes por cantidad", () => {
    const cost = calculateRecipeCost(
      [
        {
          inventoryItemId: "milk",
          itemName: "Leche",
          quantity: 0.2,
          unit: "l",
        },
        {
          inventoryItemId: "coffee",
          itemName: "Café",
          quantity: 0.018,
          unit: "kg",
        },
      ],
      { milk: 5000, coffee: 80000 },
    );

    expect(cost).toBe(Math.round(0.2 * 5000 + 0.018 * 80000));
  });
});
