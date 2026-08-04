import type { Result } from "@ghost/shared";
import { err, ok } from "@ghost/shared";

import type {
  FixedExpense,
  FixedExpenseCategory,
  FixedExpenseFrequency,
  FixedExpenseInput,
} from "../fixed-expense.js";

export function calculateMonthlyEquivalent(
  amount: number,
  frequency: FixedExpenseFrequency,
): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  switch (frequency) {
    case "weekly":
      return Math.round((amount * 52) / 12);
    case "biweekly":
      return Math.round((amount * 26) / 12);
    case "monthly":
      return Math.round(amount);
    case "annual":
      return Math.round(amount / 12);
    default:
      return Math.round(amount);
  }
}

export function validateFixedExpenseInput(input: FixedExpenseInput): Result<FixedExpenseInput> {
  const name = input.name.trim();

  if (name.length < 2) {
    return err("El nombre del gasto es obligatorio.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return err("El monto debe ser mayor a cero.");
  }

  if (
    input.dueDay !== undefined &&
    (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 31)
  ) {
    return err("El día de pago debe estar entre 1 y 31.");
  }

  return ok({
    ...input,
    name,
    supplierName: input.supplierName?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    amount: Math.round(input.amount),
  });
}

export function summarizeFixedExpenses(expenses: FixedExpense[]): {
  activeCount: number;
  monthlyTotal: number;
  annualProjection: number;
  byCategory: Record<FixedExpenseCategory, number>;
} {
  const byCategory = {
    rent: 0,
    payroll: 0,
    utilities: 0,
    services: 0,
    insurance: 0,
    marketing: 0,
    other: 0,
  } satisfies Record<FixedExpenseCategory, number>;

  let monthlyTotal = 0;
  let activeCount = 0;

  for (const expense of expenses) {
    if (!expense.isActive) {
      continue;
    }

    activeCount += 1;
    monthlyTotal += expense.monthlyEquivalent;
    byCategory[expense.category] += expense.monthlyEquivalent;
  }

  return {
    activeCount,
    monthlyTotal,
    annualProjection: monthlyTotal * 12,
    byCategory,
  };
}
