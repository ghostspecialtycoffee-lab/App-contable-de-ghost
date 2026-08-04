import { describe, expect, it } from "vitest";

import {
  calculateWeightedAverageCost,
  normalizeSku,
  validateMovementQuantity,
  validateSku,
} from "./inventory.js";

describe("validateSku", () => {
  it("normaliza a mayúsculas", () => {
    const result = validateSku("abc-123");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("ABC-123");
    }
  });
});

describe("validateMovementQuantity", () => {
  it("convierte salidas positivas a negativas", () => {
    const result = validateMovementQuantity({ type: "exit", quantity: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(-5);
    }
  });

  it("permite ajustes con signo", () => {
    const result = validateMovementQuantity({ type: "adjustment", quantity: -2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(-2);
    }
  });
});

describe("calculateWeightedAverageCost", () => {
  it("calcula promedio ponderado en entradas", () => {
    const avg = calculateWeightedAverageCost(10, 1000, 10, 2000);
    expect(avg).toBe(1500);
  });
});

describe("normalizeSku", () => {
  it("recorta espacios", () => {
    expect(normalizeSku("  sku-1  ")).toBe("SKU-1");
  });
});
