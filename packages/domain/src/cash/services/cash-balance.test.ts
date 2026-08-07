import { describe, expect, it } from "vitest";

import { calculateCashSessionBalance } from "./cash-balance.js";

describe("calculateCashSessionBalance", () => {
  it("calculates expected cash from opening, sales and movements", () => {
    const balance = calculateCashSessionBalance({
      openingAmount: 100_000,
      cashSalesTotal: 250_000,
      movements: [
        { type: "inflow", amount: 20_000 },
        { type: "outflow", amount: 15_000 },
        { type: "loan", amount: 30_000 },
        { type: "loan_repayment", amount: 10_000 },
      ],
    });

    expect(balance.expectedAmount).toBe(335_000);
    expect(balance.loansOutstanding).toBe(20_000);
  });
});
