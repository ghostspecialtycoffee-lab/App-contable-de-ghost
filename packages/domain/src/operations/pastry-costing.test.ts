import { describe, expect, it } from "vitest";

import {
  calculatePastryPortionCost,
  calculatePastryPortionCostFromInvoice,
  getCostMatrixSalePrice,
  PASTRY_DOMICILIO_ALLOCATION_COP,
} from "./pastry-costing.js";

describe("pastry-costing", () => {
  it("costo por porción = (factura + domicilio) ÷ porciones", () => {
    expect(calculatePastryPortionCostFromInvoice(63000)).toBe(6083);
    expect(
      calculatePastryPortionCost({
        batchCostNet: 63000,
        yieldQuantity: 12,
        category: "pastry",
      }),
    ).toBe(6083);
  });

  it("usa precio de venta manual sin sumar domicilio", () => {
    expect(getCostMatrixSalePrice({ category: "pastry", menuPrice: 8000 })).toBe(8000);
    expect(getCostMatrixSalePrice({ category: "beverage", menuPrice: 11500 })).toBe(11500);
  });

  it("no aplica domicilio a otras categorías", () => {
    expect(
      calculatePastryPortionCost({
        batchCostNet: 63000,
        yieldQuantity: 12,
        category: "food",
      }),
    ).toBe(5250);
  });

  it("expone constante de domicilio", () => {
    expect(PASTRY_DOMICILIO_ALLOCATION_COP).toBe(10_000);
  });
});
