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
      },
    ]);
    expect(result.ok).toBe(true);
  });
});

describe("calculateSaleTotals", () => {
  it("calcula subtotal, IVA y total", () => {
    const totals = calculateSaleTotals(
      [
        {
          productId: "p1",
          name: "Latte",
          unitPrice: 10000,
          quantity: 2,
          station: "counter",
        },
      ],
      0.19,
    );

    expect(totals.subtotal).toBe(20000);
    expect(totals.taxAmount).toBe(3800);
    expect(totals.total).toBe(23800);
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
      },
      {
        productId: "2",
        name: "Sandwich",
        unitPrice: 12000,
        quantity: 1,
        lineTotal: 12000,
        station: "kitchen",
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
