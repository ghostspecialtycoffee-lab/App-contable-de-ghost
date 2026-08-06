import { describe, expect, it } from "vitest";

import {
  calculatePastryPortionCostFromInvoice,
  getCostMatrixSalePrice,
  getPastryEffectiveSalePrice,
  getPastryRecipeYield,
  PASTRY_DOMICILIO_ALLOCATION_COP,
} from "./pastry-costing.js";

describe("pastry-costing", () => {
  it("suma domicilio al precio de repostería para costeo", () => {
    expect(getPastryEffectiveSalePrice(8000)).toBe(8000 + PASTRY_DOMICILIO_ALLOCATION_COP);
    expect(getCostMatrixSalePrice({ category: "pastry", menuPrice: 8000 })).toBe(18000);
    expect(getCostMatrixSalePrice({ category: "beverage", menuPrice: 11500 })).toBe(11500);
  });

  it("divide torta completa en 12 porciones", () => {
    expect(getPastryRecipeYield("Torta zanahoria")).toBe(12);
    expect(calculatePastryPortionCostFromInvoice(63000)).toBe(5250);
  });
});
