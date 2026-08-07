import { describe, expect, it } from "vitest";

import { OPERATIONAL_RULES, listOperationalRuleDefinitions } from "./built-in-rules.js";
import { evaluateOperationalRules } from "./evaluate.js";
import type { RuleOperationalContext } from "./context.js";

const baseContext: RuleOperationalContext = {
  organizationName: "Ghost Lab",
  todayIso: "2026-08-07",
  yesterdayIso: "2026-08-06",
  salesSnapshot: [
    {
      soldAt: "2026-08-06T10:00:00.000Z",
      soldOn: "2026-08-06",
      status: "paid",
      subtotal: 100_000,
      taxAmount: 19_000,
      total: 119_000,
      paymentMethod: "cash",
      lines: [],
    },
    {
      soldAt: "2026-08-07T10:00:00.000Z",
      soldOn: "2026-08-07",
      status: "paid",
      subtotal: 80_000,
      taxAmount: 15_200,
      total: 95_200,
      paymentMethod: "cash",
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
  inventoryMovementsSnapshot: [],
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

describe("rules engine", () => {
  it("expone catálogo de reglas operativas", () => {
    const definitions = listOperationalRuleDefinitions();
    expect(definitions.length).toBe(OPERATIONAL_RULES.length);
    expect(definitions.some((rule) => rule.id === "sales-drop")).toBe(true);
    expect(definitions.some((rule) => rule.id === "cash-closed")).toBe(true);
  });

  it("evalúa reglas y dispara alertas conocidas", () => {
    const result = evaluateOperationalRules(baseContext);

    expect(result.evaluatedRuleCount).toBeGreaterThan(0);
    expect(result.triggers.some((trigger) => trigger.ruleId === "sales-drop")).toBe(true);
    expect(result.triggers.some((trigger) => trigger.ruleId === "cash-closed")).toBe(true);
    expect(result.triggers.some((trigger) => trigger.ruleId === "high-food-cost")).toBe(true);
  });

  it("respeta reglas deshabilitadas por organización", () => {
    const result = evaluateOperationalRules(baseContext, {
      disabledRuleIds: ["cash-closed", "sales-drop"],
    });

    expect(result.triggers.some((trigger) => trigger.ruleId === "cash-closed")).toBe(false);
    expect(result.triggers.some((trigger) => trigger.ruleId === "sales-drop")).toBe(false);
  });

  it("detecta riesgo de quiebre por consumo", () => {
    const result = evaluateOperationalRules({
      ...baseContext,
      salesSnapshot: [],
      cashSessionOpen: true,
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
      kitchenOrders: [],
      menuProducts: [],
    });

    expect(result.triggers.some((trigger) => trigger.id === "stockout-milk")).toBe(true);
  });
});
