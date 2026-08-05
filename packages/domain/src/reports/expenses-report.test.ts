import { describe, expect, it } from "vitest";

import type { FixedExpense } from "../expenses/fixed-expense.js";
import {
  buildYearExpensesReport,
  calculateFixedExpensesYearToDate,
  getYearToDatePeriod,
} from "./expenses-report.js";

describe("getYearToDatePeriod", () => {
  it("va del 1 de enero al día de referencia", () => {
    const period = getYearToDatePeriod(new Date("2026-08-05T15:00:00.000Z"));
    expect(period.label).toBe("Este año (2026)");
    expect(period.from.getMonth()).toBe(0);
    expect(period.from.getDate()).toBe(1);
  });
});

describe("calculateFixedExpensesYearToDate", () => {
  it("acumula equivalente mensual por meses transcurridos", () => {
    const expenses: FixedExpense[] = [
      {
        id: "1",
        organizationId: "org",
        name: "Arriendo",
        category: "rent",
        amount: 1_000_000,
        frequency: "monthly",
        monthlyEquivalent: 1_000_000,
        isActive: true,
        createdAt: "",
        updatedAt: "",
        createdBy: "",
        updatedBy: "",
      },
    ];

    const result = calculateFixedExpensesYearToDate(expenses, new Date("2026-03-15T12:00:00.000Z"));
    expect(result.monthsElapsed).toBe(3);
    expect(result.total).toBe(3_000_000);
    expect(result.byCategory.rent).toBe(3_000_000);
  });
});

describe("buildYearExpensesReport", () => {
  it("suma compras, gastos fijos y salidas de caja del año", () => {
    const report = buildYearExpensesReport({
      referenceDate: new Date("2026-08-05T12:00:00.000Z"),
      purchases: [
        {
          invoiceDate: "2026-02-10",
          status: "confirmed",
          supplierName: "Proveedor",
          subtotal: 100_000,
          taxAmount: 0,
          total: 100_000,
        },
        {
          invoiceDate: "2025-12-31",
          status: "confirmed",
          supplierName: "Viejo",
          subtotal: 50_000,
          taxAmount: 0,
          total: 50_000,
        },
      ],
      fixedExpenses: [
        {
          id: "1",
          organizationId: "org",
          name: "Nómina",
          category: "payroll",
          amount: 2_000_000,
          frequency: "monthly",
          monthlyEquivalent: 2_000_000,
          isActive: true,
          createdAt: "",
          updatedAt: "",
          createdBy: "",
          updatedBy: "",
        },
      ],
      cashMovements: [
        {
          type: "outflow",
          amount: 30_000,
          occurredAt: "2026-01-15T10:00:00.000Z",
        },
        {
          type: "loan",
          amount: 20_000,
          occurredAt: "2026-03-01T10:00:00.000Z",
        },
      ],
    });

    expect(report.purchasesTotal).toBe(100_000);
    expect(report.fixedExpensesTotal).toBe(16_000_000);
    expect(report.cashOutflowsTotal).toBe(50_000);
    expect(report.totalExpenses).toBe(16_150_000);
    expect(report.year).toBe(2026);
  });
});
