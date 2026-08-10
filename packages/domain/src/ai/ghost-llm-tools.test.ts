import { describe, expect, it } from "vitest";

import {
  isInterpretiveNaturalLanguage,
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

  it("mapea movimiento de inventario", () => {
    const action = mapGhostLlmToolCall("inventory_movement", {
      itemName: "Leche",
      quantity: 2,
      movementType: "merma",
    });

    expect(action?.tool).toBe("inventory_movement");
    expect(action?.args.movementType).toBe("waste");
  });

  it("mapea compra a proveedor", () => {
    const action = mapGhostLlmToolCall("register_purchase", {
      supplierName: "Distritcafé",
      itemName: "Café Caturra",
      quantity: 5,
      unitCost: 45000,
    });

    expect(action?.args.supplierName).toBe("Distritcafé");
    expect(action?.args.unitCost).toBe("45000");
  });

  it("rechaza herramientas desconocidas", () => {
    expect(mapGhostLlmToolCall("delete_database", {})).toBeNull();
  });
});

describe("isInterpretiveNaturalLanguage", () => {
  it("detecta órdenes coloquiales compuestas", () => {
    expect(isInterpretiveNaturalLanguage("necesito que subas el precio del latte")).toBe(true);
    expect(isInterpretiveNaturalLanguage("dame la cuenta de la mesa 1")).toBe(false);
    expect(isInterpretiveNaturalLanguage("hola")).toBe(false);
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
