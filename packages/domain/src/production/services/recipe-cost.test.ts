import { describe, expect, it } from "vitest";

import { calculateRecipeCost, calculateRecipeLineCost } from "./recipe-cost.js";

describe("calculateRecipeCost", () => {
  it("convierte unidades antes de multiplicar por costo base", () => {
    const cost = calculateRecipeCost(
      [
        {
          inventoryItemId: "milk",
          itemName: "Leche",
          quantity: 200,
          unit: "ml",
        },
        {
          inventoryItemId: "coffee",
          itemName: "Café",
          quantity: 18,
          unit: "g",
        },
      ],
      {
        milk: { baseUnit: "ml", averageCost: 5 },
        coffee: { baseUnit: "g", averageCost: 80 },
      },
    );

    expect(cost).toBe(Math.round(200 * 5 + 18 * 80));
  });

  it("convierte kg de receta a gramos de costo", () => {
    const breakdown = calculateRecipeLineCost(
      {
        inventoryItemId: "coffee",
        itemName: "Café",
        quantity: 0.018,
        unit: "kg",
      },
      {
        baseUnit: "g",
        averageCost: 80,
      },
    );

    expect(breakdown.quantityInBase).toBe(18);
    expect(breakdown.lineCost).toBe(1440);
  });

  it("calcula costo de porción con bolsa de café a precio de compra", () => {
    const breakdown = calculateRecipeLineCost(
      {
        inventoryItemId: "coffee",
        itemName: "Café Caturra",
        quantity: 18,
        unit: "g",
      },
      {
        baseUnit: "g",
        averageCost: 145_000,
        purchaseUnit: "bag",
        presentationQuantity: 2500,
      },
    );

    expect(breakdown.unitCostPerBase).toBe(58);
    expect(breakdown.lineCost).toBe(1044);
  });

  it("infiere bolsa de café sin presentación configurada", () => {
    const breakdown = calculateRecipeLineCost(
      {
        inventoryItemId: "coffee",
        itemName: "Café Caturra",
        quantity: 18,
        unit: "g",
      },
      {
        baseUnit: "g",
        averageCost: 145_000,
        purchaseUnit: "bag",
      },
    );

    expect(breakdown.unitCostPerBase).toBe(58);
    expect(breakdown.lineCost).toBe(1044);
  });
});
