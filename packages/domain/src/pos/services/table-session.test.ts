import { describe, expect, it } from "vitest";

import { calculateSaleTotals } from "./sale.js";
import {
  buildTableSessionLine,
  pendingSessionLines,
  sessionLinesToSaleInputs,
  sessionSubtotal,
} from "./table-session.js";

describe("table session helpers", () => {
  it("calcula subtotal de líneas activas", () => {
    const lines = [
      buildTableSessionLine(
        {
          productId: "p1",
          name: "Americano",
          unitPrice: 10000,
          quantity: 2,
          station: "bar",
          saleTaxCategory: "INC_8",
          source: "customer",
        },
        "l1",
      ),
    ];

    expect(sessionSubtotal(lines)).toBe(20000);
    expect(pendingSessionLines(lines)).toHaveLength(1);

    const totals = calculateSaleTotals(sessionLinesToSaleInputs(lines));
    expect(totals.total).toBe(20000);
  });
});
