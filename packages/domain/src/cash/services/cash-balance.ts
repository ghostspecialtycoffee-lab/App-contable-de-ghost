import type { CashMovementType } from "../cash-movement.js";

export interface CashMovementAmount {
  type: CashMovementType;
  amount: number;
}

export interface CashSessionBalanceInput {
  openingAmount: number;
  movements: CashMovementAmount[];
  cashSalesTotal: number;
}

export interface CashSessionBalance {
  expectedAmount: number;
  openingAmount: number;
  cashSalesTotal: number;
  inflowsTotal: number;
  outflowsTotal: number;
  loansTotal: number;
  loanRepaymentsTotal: number;
  loansOutstanding: number;
}

export function calculateCashSessionBalance(
  input: CashSessionBalanceInput,
): CashSessionBalance {
  let inflowsTotal = 0;
  let outflowsTotal = 0;
  let loansTotal = 0;
  let loanRepaymentsTotal = 0;

  for (const movement of input.movements) {
    const amount = Math.max(0, Math.round(movement.amount));
    if (amount <= 0) {
      continue;
    }

    switch (movement.type) {
      case "inflow":
        inflowsTotal += amount;
        break;
      case "outflow":
        outflowsTotal += amount;
        break;
      case "loan":
        loansTotal += amount;
        break;
      case "loan_repayment":
        loanRepaymentsTotal += amount;
        break;
    }
  }

  const openingAmount = Math.max(0, Math.round(input.openingAmount));
  const cashSalesTotal = Math.max(0, Math.round(input.cashSalesTotal));
  const expectedAmount =
    openingAmount +
    cashSalesTotal +
    inflowsTotal +
    loanRepaymentsTotal -
    outflowsTotal -
    loansTotal;

  return {
    expectedAmount,
    openingAmount,
    cashSalesTotal,
    inflowsTotal,
    outflowsTotal,
    loansTotal,
    loanRepaymentsTotal,
    loansOutstanding: loansTotal - loanRepaymentsTotal,
  };
}

export function validateCashMovementAmount(amount: number): { ok: true } | { ok: false; error: string } {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto mayor a cero." };
  }
  return { ok: true };
}

export function validateOpeningAmount(amount: number): { ok: true } | { ok: false; error: string } {
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "El fondo inicial no puede ser negativo." };
  }
  return { ok: true };
}
