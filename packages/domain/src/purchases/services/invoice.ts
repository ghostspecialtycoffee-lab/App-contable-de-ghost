import { calculateTaxLine, type CoTaxCategory } from "../../fiscal/colombia-tax.js";
import { convertToBaseUnit } from "../../inventory/unit-conversion.js";
import type { BaseUnit } from "../../inventory/units.js";
import type { PurchaseInvoiceLine, PurchaseInvoiceLineInput } from "../invoice.js";

export function buildPurchaseInvoiceLines(
  inputs: PurchaseInvoiceLineInput[],
): PurchaseInvoiceLine[] {
  return inputs.map((input) => {
    const subtotal = input.unitPriceNet * input.quantity;
    const tax = calculateTaxLine(subtotal, input.taxCategory);
    return {
      inventoryItemId: input.inventoryItemId,
      description: input.description.trim(),
      quantity: input.quantity,
      unit: input.unit,
      unitPriceNet: input.unitPriceNet,
      taxCategory: input.taxCategory,
      lineSubtotal: tax.subtotal,
      lineTax: tax.taxAmount,
      lineTotal: tax.total,
    };
  });
}

export function summarizePurchaseInvoice(lines: PurchaseInvoiceLine[]): {
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
  const taxAmount = lines.reduce((sum, line) => sum + line.lineTax, 0);
  return {
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  };
}

export function unitCostNetFromLine(line: PurchaseInvoiceLine): number {
  if (line.quantity <= 0) {
    return 0;
  }
  return Math.round(line.lineSubtotal / line.quantity);
}

export function unitCostWithTaxFromLine(line: PurchaseInvoiceLine): number {
  if (line.quantity <= 0) {
    return 0;
  }
  return Math.round(line.lineTotal / line.quantity);
}

export function defaultPurchaseTaxCategory(): CoTaxCategory {
  return "IVA_19";
}

export function resolvePurchaseInventoryEntry(input: {
  line: PurchaseInvoiceLine;
  baseUnit: BaseUnit;
  purchaseUnit?: BaseUnit;
  presentationQuantity?: number;
}): {
  quantityInBase: number;
  unitCostNetPerBase: number;
} {
  const quantityInBase = convertToBaseUnit(
    input.line.quantity,
    input.line.unit,
    input.baseUnit,
    {
      purchaseUnit: input.purchaseUnit,
      presentationQuantity: input.presentationQuantity,
    },
  );

  const unitCostNetPerBase =
    quantityInBase > 0
      ? Math.round(input.line.lineSubtotal / quantityInBase)
      : 0;

  return {
    quantityInBase,
    unitCostNetPerBase,
  };
}

/** Fecha ISO (YYYY-MM-DD) en zona horaria de operación. */
export function isoDateInTimezone(
  timeZone = "America/Bogota",
  referenceDate = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referenceDate);
}

/**
 * Solo las facturas con fecha >= hoy operativo entran a bodega al confirmar.
 * Las anteriores quedan como registro histórico sin movimientos de inventario.
 */
export function purchaseInvoiceAffectsInventory(
  invoiceDate: string,
  options?: { todayIso?: string; timeZone?: string; bootstrap?: boolean },
): boolean {
  if (options?.bootstrap) {
    return true;
  }
  const today =
    options?.todayIso ?? isoDateInTimezone(options?.timeZone ?? "America/Bogota");
  return invoiceDate >= today;
}
