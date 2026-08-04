import { err, ok, type Result } from "@ghost/shared";

import type { CreateSaleLineInput } from "../sale.js";

export interface SaleTotals {
  lines: Array<{
    productId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    station: string;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export function validateSaleLines(
  lines: CreateSaleLineInput[],
): Result<CreateSaleLineInput[]> {
  if (lines.length === 0) {
    return err("Agrega al menos un producto.");
  }

  for (const line of lines) {
    if (!line.name.trim()) {
      return err("Hay un producto sin nombre.");
    }

    if (line.quantity <= 0) {
      return err("La cantidad debe ser mayor a cero.");
    }

    if (line.unitPrice < 0) {
      return err("El precio no puede ser negativo.");
    }
  }

  return ok(lines);
}

export function calculateSaleTotals(
  lines: CreateSaleLineInput[],
  taxRate: number,
): SaleTotals {
  const normalizedLines = lines.map((line) => {
    const lineTotal = Math.round(line.unitPrice * line.quantity);
    return {
      productId: line.productId,
      name: line.name.trim(),
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      lineTotal,
      station: line.station,
    };
  });

  const subtotal = normalizedLines.reduce(
    (accumulator, line) => accumulator + line.lineTotal,
    0,
  );
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;

  return {
    lines: normalizedLines,
    subtotal,
    taxRate,
    taxAmount,
    total,
  };
}

export function buildSaleNumber(now = new Date()): string {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, "");
  return `V-${datePart}-${timePart}`;
}

export function groupKitchenLines(
  lines: SaleTotals["lines"],
): Array<{ station: "bar" | "kitchen"; lines: SaleTotals["lines"] }> {
  const barLines = lines.filter((line) => line.station === "bar");
  const kitchenLines = lines.filter((line) => line.station === "kitchen");

  const groups: Array<{ station: "bar" | "kitchen"; lines: SaleTotals["lines"] }> =
    [];

  if (barLines.length > 0) {
    groups.push({ station: "bar", lines: barLines });
  }

  if (kitchenLines.length > 0) {
    groups.push({ station: "kitchen", lines: kitchenLines });
  }

  return groups;
}
