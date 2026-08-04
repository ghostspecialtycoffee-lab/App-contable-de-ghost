import { describe, expect, it } from "vitest";

import type { FixedExpense } from "../fixed-expense.js";
import {
  calculateMonthlyEquivalent,
  summarizeFixedExpenses,
  validateFixedExpenseInput,
} from "./fixed-expense.js";

describe("calculateMonthlyEquivalent", () => {
  it("convierte gasto semanal a mensual", () => {
    expect(calculateMonthlyEquivalent(100_000, "weekly")).toBe(Math.round((100_000 * 52) / 12));
  });

  it("divide gasto anual entre 12", () => {
    expect(calculateMonthlyEquivalent(12_000_000, "annual")).toBe(1_000_000);
  });
});

describe("summarizeFixedExpenses", () => {
  it("resume solo gastos activos", () => {
    const expenses: FixedExpense[] = [
      {
        id: "1",
        organizationId: "org",
        name: "Arriendo",
        category: "rent",
        amount: 3_000_000,
        frequency: "monthly",
        monthlyEquivalent: 3_000_000,
        isActive: true,
        createdAt: "",
        updatedAt: "",
        createdBy: "",
        updatedBy: "",
      },
      {
        id: "2",
        organizationId: "org",
        name: "Inactivo",
        category: "other",
        amount: 1_000_000,
        frequency: "monthly",
        monthlyEquivalent: 1_000_000,
        isActive: false,
        createdAt: "",
        updatedAt: "",
        createdBy: "",
        updatedBy: "",
      },
    ];

    const summary = summarizeFixedExpenses(expenses);
    expect(summary.activeCount).toBe(1);
    expect(summary.monthlyTotal).toBe(3_000_000);
    expect(summary.byCategory.rent).toBe(3_000_000);
  });
});

describe("validateFixedExpenseInput", () => {
  it("rechaza montos inválidos", () => {
    const result = validateFixedExpenseInput({
      name: "Internet",
      category: "utilities",
      amount: 0,
      frequency: "monthly",
    });

    expect(result.ok).toBe(false);
  });
});
