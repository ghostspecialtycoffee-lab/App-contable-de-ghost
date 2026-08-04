import { describe, expect, it } from "vitest";

import { convertToBaseUnit } from "./unit-conversion.js";

describe("convertToBaseUnit", () => {
  it("convierte kg a gramos para costeo", () => {
    expect(convertToBaseUnit(0.018, "kg", "g")).toBe(18);
  });

  it("convierte litros a mililitros", () => {
    expect(convertToBaseUnit(0.2, "l", "ml")).toBe(200);
  });

  it("usa presentación de compra bolsa/caja", () => {
    expect(
      convertToBaseUnit(2, "box", "unit", {
        presentationQuantity: 100,
        purchaseUnit: "box",
      }),
    ).toBe(200);
  });

  it("usa unidad de compra configurada en el ítem", () => {
    expect(
      convertToBaseUnit(3, "kg", "g", {
        purchaseUnit: "kg",
        presentationQuantity: 1000,
      }),
    ).toBe(3000);
  });
});
