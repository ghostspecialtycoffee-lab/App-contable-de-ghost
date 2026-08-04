import { describe, expect, it } from "vitest";

import {
  buildSaleNumber,
  calculateSaleTotals,
  groupKitchenLines,
  validateSaleLines,
} from "./sale.js";

describe("validateSaleLines", () => {
  it("rechaza carrito vacío", () => {
    const result = validateSaleLines([]);
    expect(result.ok).toBe(false);
  });

  it("acepta líneas válidas", () => {
    const result = validateSaleLines([
      {
        productId: "p1",
        name: "Latte",
        unitPrice: 8000,
        quantity: 2,
        station: "bar",
        saleTaxCategory: "INC_8",
      },
    ]);
    expect(result.ok).toBe(true);
  });
});

describe("calculateSaleTotals", () => {
  it("extrae impuesto incluido en el precio (INC 8%)", () => {
    const totals = calculateSaleTotals([
      {
        productId: "p1",
        name: "Americano",
        unitPrice: 10000,
        quantity: 1,
        station: "bar",
        saleTaxCategory: "INC_8",
      },
    ]);

    expect(totals.total).toBe(10000);
    expect(totals.subtotal).toBe(9259);
    expect(totals.taxAmount).toBe(741);
    expect(totals.lines[0]?.lineTax).toBe(741);
  });

  it("suma varias líneas con impuesto incluido", () => {
    const totals = calculateSaleTotals([
      {
        productId: "p1",
        name: "Americano",
        unitPrice: 10000,
        quantity: 2,
        station: "bar",
        saleTaxCategory: "INC_8",
      },
    ]);

    expect(totals.total).toBe(20000);
    expect(totals.subtotal + totals.taxAmount).toBe(20000);
  });
});

describe("groupKitchenLines", () => {
  it("agrupa comandas por estación", () => {
    const groups = groupKitchenLines([
      {
        productId: "1",
        name: "Latte",
        unitPrice: 8000,
        quantity: 1,
        lineTotal: 8000,
        station: "bar",
        saleTaxCategory: "INC_8",
        lineNet: 7407,
        lineTax: 593,
      },
      {
        productId: "2",
        name: "Sandwich",
        unitPrice: 12000,
        quantity: 1,
        lineTotal: 12000,
        station: "kitchen",
        saleTaxCategory: "IVA_19",
        lineNet: 10084,
        lineTax: 1916,
      },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.station).toBe("bar");
    expect(groups[1]?.station).toBe("kitchen");
  });
});

describe("buildSaleNumber", () => {
  it("genera número legible", () => {
    expect(buildSaleNumber(new Date("2026-08-04T15:30:45.000Z"))).toBe(
      "V-20260804-153045",
    );
  });
});
