import { describe, expect, it } from "vitest";

import {
  convertToBaseUnit,
  formatPresentationLabel,
  resolvePresentationQuantity,
} from "./unit-conversion.js";

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

  it("corrige kg→g cuando la presentación quedó en 1 por defecto", () => {
    expect(
      convertToBaseUnit(1, "kg", "g", {
        purchaseUnit: "kg",
        presentationQuantity: 1,
      }),
    ).toBe(1000);
  });

  it("convierte unidad de empaque a gramos con presentación", () => {
    expect(
      convertToBaseUnit(1, "unit", "g", {
        purchaseUnit: "bag",
        presentationQuantity: 2268,
      }),
    ).toBe(2268);
  });

  it("convierte botella unit a mililitros", () => {
    expect(
      convertToBaseUnit(2, "unit", "ml", {
        purchaseUnit: "unit",
        presentationQuantity: 600,
      }),
    ).toBe(1200);
  });
});

describe("resolvePresentationQuantity", () => {
  it("infiere 1000 g por kg cuando falta configurar", () => {
    expect(resolvePresentationQuantity("kg", "g", 1)).toBe(1000);
    expect(resolvePresentationQuantity("kg", "g", 1000)).toBe(1000);
  });

  it("respeta bolsa de café en gramos", () => {
    expect(resolvePresentationQuantity("bag", "g", 2268)).toBe(2268);
  });
});

describe("formatPresentationLabel", () => {
  it("muestra conversión kg a gramos aunque cantidad guardada sea 1", () => {
    expect(
      formatPresentationLabel({
        purchaseUnit: "kg",
        baseUnit: "g",
        presentationQuantity: 1,
      }),
    ).toBe("1 kilogramos = 1.000 gramos");
  });

  it("muestra bolsa de café", () => {
    expect(
      formatPresentationLabel({
        purchaseUnit: "bag",
        baseUnit: "g",
        presentationQuantity: 2268,
      }),
    ).toBe("1 bolsa = 2.268 gramos");
  });

  it("muestra botella en ml", () => {
    expect(
      formatPresentationLabel({
        purchaseUnit: "unit",
        baseUnit: "ml",
        presentationQuantity: 600,
      }),
    ).toBe("1 unidad = 600 mililitros");
  });

  it("respeta etiqueta personalizada", () => {
    expect(
      formatPresentationLabel({
        presentationLabel: "Paq 5 lb Black Coffee",
        purchaseUnit: "bag",
        baseUnit: "g",
        presentationQuantity: 2268,
      }),
    ).toBe("Paq 5 lb Black Coffee");
  });
});
