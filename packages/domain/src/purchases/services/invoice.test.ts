import { describe, expect, it } from "vitest";

import {
  buildPurchaseInvoiceLines,
  isoDateInTimezone,
  purchaseInvoiceAffectsInventory,
  resolvePurchaseInventoryEntry,
  summarizePurchaseInvoice,
  unitCostWithTaxFromLine,
} from "./invoice.js";

describe("buildPurchaseInvoiceLines", () => {
  it("calcula subtotal, IVA y total por línea", () => {
    const lines = buildPurchaseInvoiceLines([
      {
        description: "Leche",
        quantity: 10,
        unit: "l",
        unitPriceNet: 4000,
        taxCategory: "IVA_19",
      },
    ]);

    expect(lines[0]?.lineSubtotal).toBe(40000);
    expect(lines[0]?.lineTax).toBe(7600);
    expect(lines[0]?.lineTotal).toBe(47600);
    expect(unitCostWithTaxFromLine(lines[0]!)).toBe(4760);
  });
});

describe("summarizePurchaseInvoice", () => {
  it("resume totales de factura", () => {
    const lines = buildPurchaseInvoiceLines([
      {
        description: "A",
        quantity: 1,
        unit: "unit",
        unitPriceNet: 10000,
        taxCategory: "IVA_19",
      },
      {
        description: "B",
        quantity: 2,
        unit: "kg",
        unitPriceNet: 5000,
        taxCategory: "IVA_5",
      },
    ]);
    const summary = summarizePurchaseInvoice(lines);
    expect(summary.subtotal).toBe(20000);
    expect(summary.total).toBe(summary.subtotal + summary.taxAmount);
  });
});

describe("resolvePurchaseInventoryEntry", () => {
  it("convierte compra en kg a costo neto por gramo", () => {
    const [line] = buildPurchaseInvoiceLines([
      {
        description: "Café verde",
        quantity: 2,
        unit: "kg",
        unitPriceNet: 80000,
        taxCategory: "IVA_19",
      },
    ]);

    const entry = resolvePurchaseInventoryEntry({
      line: line!,
      baseUnit: "g",
      purchaseUnit: "kg",
      presentationQuantity: 1000,
    });

    expect(entry.quantityInBase).toBe(2000);
    expect(entry.unitCostNetPerBase).toBe(80);
  });
});

describe("purchaseInvoiceAffectsInventory", () => {
  it("excluye facturas anteriores al día operativo", () => {
    expect(
      purchaseInvoiceAffectsInventory("2026-08-03", { todayIso: "2026-08-04" }),
    ).toBe(false);
  });

  it("incluye facturas de hoy y futuras", () => {
    expect(
      purchaseInvoiceAffectsInventory("2026-08-04", { todayIso: "2026-08-04" }),
    ).toBe(true);
    expect(
      purchaseInvoiceAffectsInventory("2026-08-10", { todayIso: "2026-08-04" }),
    ).toBe(true);
  });
});

describe("isoDateInTimezone", () => {
  it("devuelve formato YYYY-MM-DD", () => {
    expect(isoDateInTimezone("UTC", new Date("2026-08-04T15:00:00.000Z"))).toBe(
      "2026-08-04",
    );
  });
});
