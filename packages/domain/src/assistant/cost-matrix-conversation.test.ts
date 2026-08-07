import { describe, expect, it } from "vitest";

import {
  extractRecipePriceFromMessage,
  parseIngredientLinesFromMessage,
} from "./cost-matrix-conversation.js";

describe("cost-matrix-conversation", () => {
  const inventory = [
    { id: "inv-1", name: "Café Caturra", sku: "CAFE", baseUnit: "g" },
    { id: "inv-2", name: "Leche entera", sku: "LECHE", baseUnit: "ml" },
  ];

  it("extrae líneas de ingredientes", () => {
    const lines = parseIngredientLinesFromMessage(
      "ficha Latte: 18g café caturra, 200ml leche entera",
      inventory,
    );

    expect(lines).toHaveLength(2);
    expect(lines[0]?.itemName).toBe("Café Caturra");
    expect(lines[0]?.quantity).toBe(18);
    expect(lines[1]?.quantity).toBe(200);
  });

  it("extrae precio de venta", () => {
    expect(extractRecipePriceFromMessage("precio 12000")).toBe(12000);
    expect(extractRecipePriceFromMessage("vende a $11.500")).toBe(11500);
  });
});
