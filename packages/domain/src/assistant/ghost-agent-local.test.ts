import { describe, expect, it } from "vitest";

import { resolveLocalAgentMessage } from "./ghost-agent-local.js";
import type { GhostConversationContext } from "./ghost-conversation.js";

const baseContext: GhostConversationContext = {
  organizationName: "Ghost Lab",
  inventoryItems: [{ id: "inv-1", name: "Leche", sku: "LECHE", baseUnit: "ml" }],
  menuProducts: [
    { id: "prod-1", name: "Latte", price: 12000, category: "beverage", station: "bar" },
  ],
  tables: [],
  kitchenOrders: [],
  openTableSessions: [],
  cashSessionOpen: true,
  invoiceCount: 3,
  inventoryCount: 1,
  ghostBeverageCount: 1,
  salesSnapshot: [
    {
      soldAt: new Date().toISOString(),
      soldOn: new Date().toISOString().slice(0, 10),
      status: "paid",
      subtotal: 10000,
      taxAmount: 0,
      total: 10000,
      paymentMethod: "cash",
      lines: [{ name: "Latte", quantity: 1, lineTotal: 10000 }],
    },
  ],
  purchasesSnapshot: [],
  cashSnapshot: {
    sessionId: "cash-1",
    openingAmount: 100000,
    cashSalesTotal: 10000,
    expectedAmount: 110000,
    inflowsTotal: 0,
    outflowsTotal: 0,
    movements: [],
  },
  inventoryStockSnapshot: [],
  fixedExpensesSnapshot: [],
  workShiftsSnapshot: [],
  recipesSnapshot: [],
  inventoryCostSnapshot: [],
};

describe("resolveLocalAgentMessage", () => {
  it("responde análisis de ventas con datos locales", () => {
    const answer = resolveLocalAgentMessage("analiza las ventas de hoy", baseContext);
    expect(answer).toContain("Ventas de hoy");
  });

  it("responde preguntas de plataforma sin ir a la nube", () => {
    const answer = resolveLocalAgentMessage("¿cómo registro una venta?", baseContext);
    expect(answer).toBeTruthy();
    expect(answer).toMatch(/venta|mostrador/i);
  });

  it("responde consultas vagas con estado operativo local", () => {
    const answer = resolveLocalAgentMessage("cómo va todo", baseContext);
    expect(answer).toContain("Así va");
    expect(answer).toContain("Ghost Lab");
  });

  it("saluda con resumen operativo breve", () => {
    const answer = resolveLocalAgentMessage("hola qué tal", baseContext);
    expect(answer).toContain("Hola");
    expect(answer).toContain("Ghost Lab");
  });
});
