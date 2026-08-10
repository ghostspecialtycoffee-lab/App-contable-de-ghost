import { describe, expect, it } from "vitest";

import {
  mapGhostLlmToolCall,
  summarizePlannedActions,
} from "./ghost-llm-tools.js";

describe("mapGhostLlmToolCall", () => {
  it("mapea actualización de precio", () => {
    const action = mapGhostLlmToolCall("update_product_price", {
      productName: "Latte",
      price: 13500,
      rationale: "Subir margen",
    });

    expect(action).toEqual({
      tool: "update_product_price",
      rationale: "Subir margen",
      args: { productName: "Latte", price: "13500" },
    });
  });

  it("mapea cobro de mesa con defaults", () => {
    const action = mapGhostLlmToolCall("checkout_table", {
      tableNumber: 2,
      paymentMethod: "tarjeta",
    });

    expect(action?.args).toMatchObject({
      tableNumber: "2",
      paymentMethod: "card",
      documentType: "factura",
      customerEmail: "skip",
    });
  });

  it("rechaza herramientas desconocidas", () => {
    expect(mapGhostLlmToolCall("delete_database", {})).toBeNull();
  });
});

describe("summarizePlannedActions", () => {
  it("resume acciones planificadas", () => {
    const summary = summarizePlannedActions([
      {
        tool: "update_product_price",
        args: { productName: "Latte", price: "14000" },
      },
    ]);

    expect(summary).toContain("Latte");
    expect(summary).toContain("14.000");
  });
});
