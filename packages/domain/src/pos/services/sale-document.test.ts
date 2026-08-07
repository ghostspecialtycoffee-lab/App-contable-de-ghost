import { describe, expect, it } from "vitest";

import {
  buildSaleDocumentMailtoUrl,
  buildSaleDocumentPlainText,
  buildSaleDocumentWhatsAppUrl,
} from "./sale-document.js";

const sampleDocument = {
  documentType: "factura" as const,
  saleNumber: "V-001",
  soldAt: "6 ago 2026, 4:55 p. m.",
  organizationName: "Ghost Specialty Coffee",
  tableNumber: 1,
  customerName: "Juan",
  lines: [
    { name: "Dirty chai", quantity: 2, lineTotal: 24000 },
    { name: "Latte", quantity: 1, lineTotal: 9000 },
  ],
  subtotal: 33000,
  taxAmount: 6270,
  total: 39270,
  paymentMethod: "card" as const,
};

describe("buildSaleDocumentPlainText", () => {
  it("incluye totales y líneas", () => {
    const text = buildSaleDocumentPlainText(sampleDocument);

    expect(text).toContain("Ghost Specialty Coffee");
    expect(text).toContain("Factura de venta");
    expect(text).toContain("2 x Dirty chai");
    expect(text).toContain("Total: $39.270");
    expect(text).toContain("Tarjeta");
    expect(text).toContain("Mesa: 1");
    expect(text).toContain("Cliente: Juan");
  });
});

describe("buildSaleDocumentMailtoUrl", () => {
  it("genera mailto con destinatario y asunto", () => {
    const url = buildSaleDocumentMailtoUrl({
      to: "cliente@ejemplo.com",
      document: sampleDocument,
    });

    expect(url.startsWith("mailto:cliente@ejemplo.com?")).toBe(true);
    expect(url).toContain("subject=");
    expect(url).toContain("body=");
  });
});

describe("buildSaleDocumentWhatsAppUrl", () => {
  it("genera enlace de WhatsApp con texto", () => {
    const url = buildSaleDocumentWhatsAppUrl({ document: sampleDocument });

    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Dirty chai");
  });
});
