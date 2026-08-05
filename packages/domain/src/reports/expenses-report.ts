import type { FixedExpense, FixedExpenseCategory } from "../expenses/fixed-expense.js";
import { summarizeFixedExpenses } from "../expenses/services/fixed-expense.js";
import type { SalesReportPeriod } from "../pos/services/reports.js";
import { buildPurchasesReport, filterPurchasesByPeriod, type PurchaseForReport } from "./purchases-report.js";
import { buildCashMovementsReport, filterByTimestampRange } from "./financial-summary.js";

export interface YearExpensesReport {
  year: number;
  periodLabel: string;
  monthsElapsed: number;
  purchasesTotal: number;
  purchaseCount: number;
  fixedExpensesTotal: number;
  fixedExpenseCount: number;
  cashOutflowsTotal: number;
  cashMovementCount: number;
  totalExpenses: number;
  fixedByCategory: Record<FixedExpenseCategory, number>;
}

export function getYearToDatePeriod(referenceDate = new Date()): SalesReportPeriod {
  const year = referenceDate.getFullYear();
  const from = startOfDay(new Date(year, 0, 1));
  const to = endOfDay(referenceDate);

  return {
    from,
    to,
    label: `Este año (${year})`,
  };
}

export function getMonthsElapsedInYear(referenceDate = new Date()): number {
  return referenceDate.getMonth() + 1;
}

export function calculateFixedExpensesYearToDate(expenses: FixedExpense[], referenceDate = new Date()): {
  total: number;
  activeCount: number;
  byCategory: Record<FixedExpenseCategory, number>;
  monthsElapsed: number;
} {
  const summary = summarizeFixedExpenses(expenses);
  const monthsElapsed = getMonthsElapsedInYear(referenceDate);
  const byCategory = {
    rent: 0,
    payroll: 0,
    utilities: 0,
    services: 0,
    insurance: 0,
    marketing: 0,
    other: 0,
  } satisfies Record<FixedExpenseCategory, number>;

  for (const category of Object.keys(byCategory) as FixedExpenseCategory[]) {
    byCategory[category] = summary.byCategory[category] * monthsElapsed;
  }

  return {
    total: summary.monthlyTotal * monthsElapsed,
    activeCount: summary.activeCount,
    byCategory,
    monthsElapsed,
  };
}

export function buildYearExpensesReport(input: {
  year?: number;
  referenceDate?: Date;
  purchases: PurchaseForReport[];
  fixedExpenses: FixedExpense[];
  cashMovements: Array<{ type: "inflow" | "outflow" | "loan" | "loan_repayment"; amount: number; occurredAt: string }>;
}): YearExpensesReport {
  const referenceDate = input.referenceDate ?? new Date();
  const period = getYearToDatePeriod(referenceDate);
  const year = input.year ?? referenceDate.getFullYear();

  const periodPurchases = filterPurchasesByPeriod(input.purchases, period.from, period.to);
  const purchases = buildPurchasesReport(periodPurchases);

  const fixed = calculateFixedExpensesYearToDate(input.fixedExpenses, referenceDate);

  const periodCash = filterByTimestampRange(input.cashMovements, period.from, period.to);
  const cash = buildCashMovementsReport(
    periodCash.map((movement) => ({ type: movement.type, amount: movement.amount })),
  );
  const cashOutflowsTotal = cash.outflowsTotal + cash.loansTotal;

  const totalExpenses = purchases.totalPurchases + fixed.total + cashOutflowsTotal;

  return {
    year,
    periodLabel: period.label,
    monthsElapsed: fixed.monthsElapsed,
    purchasesTotal: purchases.totalPurchases,
    purchaseCount: purchases.invoiceCount,
    fixedExpensesTotal: fixed.total,
    fixedExpenseCount: fixed.activeCount,
    cashOutflowsTotal,
    cashMovementCount: cash.movementCount,
    totalExpenses,
    fixedByCategory: fixed.byCategory,
  };
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}
