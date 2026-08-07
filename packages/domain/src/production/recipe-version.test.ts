import { describe, expect, it } from "vitest";

import {
  buildRecipeContentSignature,
  buildSaleRecipeSnapshot,
  hasRecipeContentChanged,
  resolveNextRecipeVersion,
} from "./recipe-version.js";

describe("recipe-version", () => {
  it("detecta cambio de ingredientes", () => {
    const current = {
      yieldQuantity: 1,
      lines: [
        {
          inventoryItemId: "coffee",
          itemName: "Café",
          quantity: 18,
          unit: "g" as const,
        },
      ],
    };

    const changed = hasRecipeContentChanged(current, {
      yieldQuantity: 1,
      lines: [
        {
          inventoryItemId: "coffee",
          itemName: "Café",
          quantity: 20,
          unit: "g",
        },
      ],
    });

    expect(changed).toBe(true);
  });

  it("no versiona si el contenido es igual", () => {
    const recipe = {
      yieldQuantity: 1,
      lines: [
        {
          inventoryItemId: "milk",
          itemName: "Leche",
          quantity: 220,
          unit: "ml" as const,
        },
      ],
    };

    expect(hasRecipeContentChanged(recipe, recipe)).toBe(false);
    expect(buildRecipeContentSignature(recipe)).toBe(buildRecipeContentSignature(recipe));
  });

  it("resuelve versión inicial y siguiente", () => {
    expect(resolveNextRecipeVersion(undefined, true, true)).toBe(1);
    expect(resolveNextRecipeVersion(1, false, true)).toBe(2);
    expect(resolveNextRecipeVersion(3, false, true)).toBe(4);
    expect(resolveNextRecipeVersion(undefined, false, false)).toBe(1);
    expect(resolveNextRecipeVersion(2, false, false)).toBe(2);
    expect(resolveNextRecipeVersion(undefined, false, true)).toBe(1);
  });

  it("congela snapshot para venta", () => {
    const snapshot = buildSaleRecipeSnapshot({
      id: "recipe-1",
      organizationId: "org-1",
      menuProductId: "latte",
      menuProductName: "Latte",
      currentVersion: 2,
      recipeCost: 3200,
      yieldQuantity: 1,
      lines: [
        {
          inventoryItemId: "coffee",
          itemName: "Café",
          quantity: 18,
          unit: "g",
        },
      ],
    });

    expect(snapshot.recipeVersion).toBe(2);
    expect(snapshot.lines).toHaveLength(1);
    expect(snapshot.productId).toBe("latte");
  });
});
