import { describe, expect, it } from "vitest";

import { buildBrainHelpMessage, classifyBrainQueryIntent, GHOST_BRAIN_SKILLS } from "./ghost-brain.js";
import { buildSalesReportReply } from "./brain-responses.js";
import type { GhostConversationContext } from "./ghost-conversation.js";

describe("ghost brain registry", () => {
  it("expone habilidades por dominio", () => {
    const domains = new Set(GHOST_BRAIN_SKILLS.map((skill) => skill.domain));
    expect(domains.has("ventas")).toBe(true);
    expect(domains.has("finanzas")).toBe(true);
    expect(domains.has("compras")).toBe(true);
  });

  it("clasifica consultas de ventas y ayuda", () => {
    expect(classifyBrainQueryIntent("ventas de hoy")).toBe("query-sales-report");
    expect(classifyBrainQueryIntent("ayuda")).toBe("brain-help");
    expect(classifyBrainQueryIntent("estado de caja")).toBe("query-cash-summary");
  });

  it("genera guía con ejemplos", () => {
    const help = buildBrainHelpMessage({
      cashSessionOpen: true,
      openTableSessions: [{ tableNumber: 1 }],
      kitchenOrders: [{}],
    });

    expect(help).toContain("cerebro operativo");
    expect(help).toContain("Ventas");
    expect(help).toContain("caja **abierta**");
  });
});

describe("brain sales response", () => {
  it("resume ventas del día", () => {
    const context: GhostConversationContext = {
      organizationName: "Ghost",
      inventoryItems: [],
      menuProducts: [],
      tables: [],
      kitchenOrders: [],
      openTableSessions: [],
      cashSessionOpen: true,
      invoiceCount: 0,
      inventoryCount: 0,
      ghostBeverageCount: 0,
      salesSnapshot: [
        {
          soldAt: new Date().toISOString(),
          soldOn: new Date().toISOString().slice(0, 10),
          status: "paid",
          subtotal: 20000,
          taxAmount: 3800,
          total: 23800,
          paymentMethod: "cash",
          lines: [{ name: "Latte", quantity: 2, lineTotal: 23800 }],
        },
      ],
      purchasesSnapshot: [],
    };

    const reply = buildSalesReportReply(context);
    expect(reply).toContain("Ventas de hoy");
    expect(reply).toContain("$23.800");
  });
});
