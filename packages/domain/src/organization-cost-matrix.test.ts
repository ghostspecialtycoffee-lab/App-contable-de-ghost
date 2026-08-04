import { describe, expect, it } from "vitest";

import {
  getTargetCostPctForCategory,
  resolveCostMatrixSettings,
  validateCostMatrixSettings,
} from "./organization-cost-matrix.js";

describe("resolveCostMatrixSettings", () => {
  it("usa valores por defecto cuando no hay configuración", () => {
    const settings = resolveCostMatrixSettings();

    expect(settings.targetFoodCostPct).toBe(0.3);
    expect(settings.targetBeverageCostPct).toBe(0.25);
  });

  it("mezcla parciales con defaults", () => {
    const settings = resolveCostMatrixSettings({ targetFoodCostPct: 0.35 });

    expect(settings.targetFoodCostPct).toBe(0.35);
    expect(settings.targetBeverageCostPct).toBe(0.25);
  });
});

describe("getTargetCostPctForCategory", () => {
  it("elige meta de bebidas para categoría beverage", () => {
    expect(
      getTargetCostPctForCategory("beverage", { targetBeverageCostPct: 0.22 }),
    ).toBe(0.22);
  });

  it("elige meta de alimentos para otras categorías", () => {
    expect(getTargetCostPctForCategory("food", { targetFoodCostPct: 0.32 })).toBe(0.32);
  });
});

describe("validateCostMatrixSettings", () => {
  it("acepta parámetros válidos", () => {
    const result = validateCostMatrixSettings({
      targetFoodCostPct: 0.3,
      targetBeverageCostPct: 0.25,
      reteIvaPct: 0.15,
      reteFuenteServicesPct: 0.04,
      reteFuenteGoodsPct: 0.025,
    });

    expect(result.ok).toBe(true);
  });

  it("rechaza food cost fuera de rango", () => {
    const result = validateCostMatrixSettings({ targetFoodCostPct: 0.95 });

    expect(result.ok).toBe(false);
  });
});
