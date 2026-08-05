import type { CoTaxCategory } from "../../fiscal/colombia-tax.js";
import type { CreateSaleLineInput } from "../sale.js";
import type {
  TableSessionLine,
  TableSessionLineInput,
  TableSessionStatus,
} from "../table-session.js";

export function isTableSessionActive(status: TableSessionStatus): boolean {
  return status === "open" || status === "requested_bill";
}

export function buildTableSessionLine(
  input: TableSessionLineInput,
  lineId: string,
  addedAt = new Date().toISOString(),
): TableSessionLine {
  return {
    id: lineId,
    productId: input.productId,
    name: input.name.trim(),
    unitPrice: input.unitPrice,
    quantity: input.quantity,
    station: input.station,
    saleTaxCategory: input.saleTaxCategory,
    status: "pending",
    source: input.source,
    notes: input.notes?.trim() ?? "",
    addedAt,
  };
}

export function activeSessionLines(lines: TableSessionLine[]): TableSessionLine[] {
  return lines.filter((line) => line.status !== "cancelled");
}

export function pendingSessionLines(lines: TableSessionLine[]): TableSessionLine[] {
  return lines.filter((line) => line.status === "pending");
}

export function sessionLinesToSaleInputs(lines: TableSessionLine[]): CreateSaleLineInput[] {
  return activeSessionLines(lines).map((line) => ({
    productId: line.productId,
    name: line.name,
    unitPrice: line.unitPrice,
    quantity: line.quantity,
    station: line.station,
    saleTaxCategory: (line.saleTaxCategory ?? "IVA_19") as CoTaxCategory,
  }));
}

export function sessionSubtotal(lines: TableSessionLine[]): number {
  return activeSessionLines(lines).reduce(
    (sum, line) => sum + Math.round(line.unitPrice * line.quantity),
    0,
  );
}
