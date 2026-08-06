import { describe, expect, it } from "vitest";

import { createEmptyGhostChatSession } from "./ghost-chat.js";
import {
  processConversationTurn,
  type GhostConversationContext,
} from "./ghost-conversation.js";

const baseContext: GhostConversationContext = {
  organizationName: "Ghost Lab",
  inventoryItems: [
    { id: "inv-1", name: "Café Caturra", sku: "CAFE-CAT", baseUnit: "g" },
  ],
  menuProducts: [
    {
      id: "prod-1",
      name: "Latte",
      price: 12000,
      category: "beverage",
      station: "bar",
    },
  ],
  tables: [{ id: "table-1", number: 3, label: "", status: "available", qrToken: "qr-1" }],
  kitchenOrders: [],
  openTableSessions: [],
  cashSessionOpen: false,
  invoiceCount: 2,
  inventoryCount: 1,
  ghostBeverageCount: 1,
};

describe("ghost-conversation", () => {
  it("responde estado operativo sin menú", () => {
    const result = processConversationTurn({
      message: "¿cómo va la operación?",
      session: createEmptyGhostChatSession(),
      context: baseContext,
    });

    expect(result.kind).toBe("reply");
    if (result.kind === "reply") {
      expect(result.messages[0]).toContain("Ghost Lab");
      expect(result.messages[0]).toContain("insumos");
    }
  });

  it("interpreta apertura de caja en una frase", () => {
    const result = processConversationTurn({
      message: "abre caja con 200000",
      session: createEmptyGhostChatSession(),
      context: baseContext,
    });

    expect(result.kind).toBe("execute");
    if (result.kind === "execute") {
      expect(result.intent).toBe("open-cash-session");
      expect(result.draft.openingAmount).toBe("200000");
    }
  });

  it("pide solo lo que falta en una compra parcial", () => {
    const result = processConversationTurn({
      message: "registra compra de café caturra",
      session: createEmptyGhostChatSession(),
      context: baseContext,
    });

    expect(result.kind).toBe("reply");
    if (result.kind === "reply") {
      expect(result.session.pendingIntent).toBe("create-purchase-invoice");
      expect(result.messages[0]).toMatch(/proveedor|costo|cantidad|unidades|gramos/i);
    }
  });

  it("completa compra en segundo mensaje", () => {
    const first = processConversationTurn({
      message: "registra compra de café caturra",
      session: createEmptyGhostChatSession(),
      context: baseContext,
    });

    expect(first.kind).toBe("reply");
    if (first.kind !== "reply") {
      return;
    }

    const second = processConversationTurn({
      message: "proveedor Distritcafé, 2 kg a 85000 el kilo",
      session: first.session,
      context: baseContext,
    });

    expect(second.kind).toBe("execute");
    if (second.kind === "execute") {
      expect(second.draft.supplierName).toContain("Distritcafé");
      expect(second.draft.inventoryItemId).toBe("inv-1");
    }
  });

  it("interpreta pedido de producto del menú como venta", () => {
    const result = processConversationTurn({
      message: "dame un latte en efectivo",
      session: createEmptyGhostChatSession(),
      context: baseContext,
    });

    expect(result.kind).toBe("execute");
    if (result.kind === "execute") {
      expect(result.intent).toBe("create-counter-sale");
      expect(result.draft.productId).toBe("prod-1");
    }
  });

  it("deriva preguntas abiertas al agente", () => {
    const result = processConversationTurn({
      message: "¿qué ratio de extracción recomiendas para espresso?",
      session: createEmptyGhostChatSession(),
      context: baseContext,
    });

    expect(result.kind).toBe("agent");
  });
});
