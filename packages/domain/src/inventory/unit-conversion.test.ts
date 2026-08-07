import { describe, expect, it } from "vitest";

import {
  convertToBaseUnit,
  formatPresentationLabel,
  getCostBasisNote,
  resolvePresentationQuantity,
  resolveUnitCostPerBase,
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

  it("interpreta 2.5 en bolsa como 2.5 kg en gramos", () => {
    expect(resolvePresentationQuantity("bag", "g", 2.5)).toBe(2500);
  });
});

describe("resolveUnitCostPerBase", () => {
  it("divide precio de bolsa entre gramos de presentación", () => {
    expect(
      resolveUnitCostPerBase({
        baseUnit: "g",
        averageCost: 145_000,
        purchaseUnit: "bag",
        presentationQuantity: 2500,
      }),
    ).toBe(58);
  });

  it("respeta costo ya expresado por gramo desde compras", () => {
    expect(
      resolveUnitCostPerBase({
        baseUnit: "g",
        averageCost: 58,
        purchaseUnit: "bag",
        presentationQuantity: 2500,
      }),
    ).toBe(58);
  });

  it("divide precio de botella entre mililitros", () => {
    expect(
      resolveUnitCostPerBase({
        baseUnit: "ml",
        averageCost: 5000,
        purchaseUnit: "unit",
        presentationQuantity: 1000,
      }),
    ).toBe(5);
  });

  it("deja costo por unidad cuando la presentación es 1", () => {
    expect(
      resolveUnitCostPerBase({
        baseUnit: "unit",
        averageCost: 48_000,
        purchaseUnit: "unit",
        presentationQuantity: 1,
      }),
    ).toBe(48_000);
  });

  it("divide precio de caja entre unidades", () => {
    expect(
      resolveUnitCostPerBase({
        baseUnit: "unit",
        averageCost: 50_000,
        purchaseUnit: "box",
        presentationQuantity: 100,
      }),
    ).toBe(500);
  });

  it("infiere bolsa 2.5 kg cuando la presentación es 2.5", () => {
    expect(
      resolveUnitCostPerBase({
        baseUnit: "g",
        averageCost: 145_000,
        purchaseUnit: "bag",
        presentationQuantity: 2.5,
      }),
    ).toBe(58);
  });

  it("infiere bolsa de café cuando falta presentación", () => {
    expect(
      resolveUnitCostPerBase({
        baseUnit: "g",
        averageCost: 145_000,
        purchaseUnit: "bag",
      }),
    ).toBe(58);
  });

  it("infiere bolsa de café aunque no haya unidad de compra", () => {
    expect(
      resolveUnitCostPerBase({
        baseUnit: "g",
        averageCost: 145_000,
      }),
    ).toBe(58);
  });
});

describe("getCostBasisNote", () => {
  it("explica costo estimado sin presentación", () => {
    const note = getCostBasisNote({
      baseUnit: "g",
      averageCost: 145_000,
      purchaseUnit: "bag",
    });
    expect(note).toContain("2.500");
    expect(note).toContain("Estimado");
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
