import { describe, expect, it } from "vitest";

import {
  buildDailyOperationsBriefing,
  formatDailyBriefingMessage,
} from "./daily-briefing.js";

const baseInput = {
  organizationName: "Ghost Lab",
  todayIso: "2026-08-07",
  yesterdayIso: "2026-08-06",
  salesSnapshot: [
    {
      soldAt: "2026-08-06T10:00:00.000Z",
      soldOn: "2026-08-06",
      status: "paid" as const,
      subtotal: 100_000,
      taxAmount: 19_000,
      total: 119_000,
      paymentMethod: "cash" as const,
      lines: [],
    },
    {
      soldAt: "2026-08-07T10:00:00.000Z",
      soldOn: "2026-08-07",
      status: "paid" as const,
      subtotal: 80_000,
      taxAmount: 15_200,
      total: 95_200,
      paymentMethod: "cash" as const,
      lines: [],
    },
  ],
  purchasesSnapshot: [],
  inventoryStockSnapshot: [
    {
      itemId: "milk",
      name: "Leche",
      baseUnit: "ml",
      quantity: 18_000,
      minStock: 5_000,
    },
  ],
  inventoryMovementsSnapshot: [
    {
      itemId: "milk",
      type: "exit",
      quantity: 84_000,
      occurredAt: "2026-08-06T10:00:00.000Z",
    },
  ],
  cashSessionOpen: false,
  menuProducts: [
    {
      id: "latte",
      name: "Latte",
      price: 12_000,
      category: "beverage",
      station: "bar",
      recipeCost: 5_000,
    },
  ],
  recipesSnapshot: [],
  kitchenOrders: [{ id: "k1", saleNumber: "V-1", status: "pending", station: "bar" }],
  openTableSessions: [],
  costMatrixSettings: {
    targetFoodCostPct: 0.35,
    targetBeverageCostPct: 0.3,
    reteIvaPct: 0,
    reteFuenteServicesPct: 0,
    reteFuenteGoodsPct: 0,
  },
};

describe("daily-briefing", () => {
  it("genera novedades de ventas, inventario y caja", () => {
    const briefing = buildDailyOperationsBriefing(baseInput);

    expect(briefing.headlineCount).toBeGreaterThan(0);
    expect(briefing.items.some((item) => item.id === "sales-drop")).toBe(true);
    expect(briefing.items.some((item) => item.id === "cash-closed")).toBe(true);
    expect(briefing.items.some((item) => item.id === "food-cost-latte")).toBe(true);
    expect(briefing.message).toContain("Buenos días");
    expect(briefing.message).toContain("novedad");
  });

  it("formatea mensaje estable sin alertas", () => {
    const message = formatDailyBriefingMessage({
      organizationName: "Ghost",
      items: [],
      headlineCount: 0,
    });

    expect(message).toContain("estable");
  });

  it("detecta riesgo de quiebre por consumo", () => {
    const briefing = buildDailyOperationsBriefing({
      ...baseInput,
      salesSnapshot: [],
      inventoryStockSnapshot: [
        {
          itemId: "milk",
          name: "Leche",
          baseUnit: "ml",
          quantity: 12_000,
          minStock: 0,
        },
      ],
      inventoryMovementsSnapshot: [
        {
          itemId: "milk",
          type: "exit",
          quantity: 84_000,
          occurredAt: "2026-08-06T10:00:00.000Z",
        },
      ],
      cashSessionOpen: true,
      menuProducts: [],
      kitchenOrders: [],
    });

    expect(briefing.items.some((item) => item.id === "stockout-milk")).toBe(true);
  });
});
