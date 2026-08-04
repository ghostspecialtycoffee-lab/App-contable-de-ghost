import { err, ok, type Result } from "@ghost/shared";

import {
  extractTaxFromGrossPrice,
  summarizeTaxBreakdown,
  type CoTaxCategory,
} from "../../fiscal/colombia-tax.js";
import type { CreateSaleLineInput } from "../sale.js";

export interface SaleTotals {
  lines: Array<{
    productId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    station: string;
    saleTaxCategory: CoTaxCategory;
    lineNet: number;
    lineTax: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  taxBreakdown: Array<{
    category: CoTaxCategory;
    label: string;
    amount: number;
  }>;
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

/** El precio unitario ya incluye impuesto (precio final al cliente). */
export function calculateSaleTotals(lines: CreateSaleLineInput[]): SaleTotals {
  let subtotal = 0;
  let taxAmount = 0;
  let total = 0;
  const taxLines: Array<{ category: CoTaxCategory; amount: number }> = [];

  const normalizedLines = lines.map((line) => {
    const saleTaxCategory = line.saleTaxCategory ?? "IVA_19";
    const grossLineTotal = Math.round(line.unitPrice * line.quantity);
    const extracted = extractTaxFromGrossPrice(grossLineTotal, saleTaxCategory);

    subtotal += extracted.net;
    taxAmount += extracted.taxAmount;
    total += extracted.gross;
    taxLines.push({ category: saleTaxCategory, amount: extracted.taxAmount });

    return {
      productId: line.productId,
      name: line.name.trim(),
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      lineTotal: grossLineTotal,
      station: line.station,
      saleTaxCategory,
      lineNet: extracted.net,
      lineTax: extracted.taxAmount,
    };
  });

  return {
    lines: normalizedLines,
    subtotal,
    taxRate: subtotal > 0 ? taxAmount / subtotal : 0,
    taxAmount,
    total,
    taxBreakdown: summarizeTaxBreakdown(taxLines),
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
