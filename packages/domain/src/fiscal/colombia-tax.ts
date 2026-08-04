import type { Result } from "@ghost/shared";
import { err, ok } from "@ghost/shared";

export const CO_TAX_CATEGORIES = [
  "IVA_19",
  "IVA_5",
  "IVA_0",
  "EXENTO",
  "EXCLUIDO",
] as const;

export type CoTaxCategory = (typeof CO_TAX_CATEGORIES)[number];

export const CO_TAX_CATEGORY_LABELS: Record<CoTaxCategory, string> = {
  IVA_19: "IVA 19%",
  IVA_5: "IVA 5%",
  IVA_0: "IVA 0%",
  EXENTO: "Exento",
  EXCLUIDO: "Excluido",
};

export const CO_TAX_RATES: Record<CoTaxCategory, number> = {
  IVA_19: 0.19,
  IVA_5: 0.05,
  IVA_0: 0,
  EXENTO: 0,
  EXCLUIDO: 0,
};

/** Referencia operativa Colombia (no reemplaza contabilidad formal). */
export const CO_COST_MATRIX_DEFAULTS = {
  targetFoodCostPct: 0.3,
  targetBeverageCostPct: 0.25,
  reteIvaPct: 0.15,
  reteFuenteServicesPct: 0.04,
  reteFuenteGoodsPct: 0.025,
} as const;

export interface TaxLineBreakdown {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export function calculateTaxLine(
  subtotal: number,
  category: CoTaxCategory,
): TaxLineBreakdown {
  const taxRate = CO_TAX_RATES[category];
  const taxAmount = Math.round(subtotal * taxRate);
  return {
    subtotal: Math.round(subtotal),
    taxRate,
    taxAmount,
    total: Math.round(subtotal) + taxAmount,
  };
}

export interface CostMatrixInput {
  unitCostNet: number;
  quantity: number;
  purchaseTaxCategory: CoTaxCategory;
  salePriceGross: number;
  saleTaxCategory: CoTaxCategory;
  recipeCost?: number;
  targetCostPct?: number;
}

export interface CostMatrixResult {
  purchase: TaxLineBreakdown;
  unitCostWithTax: number;
  sale: TaxLineBreakdown;
  salePriceNet: number;
  recipeCost: number;
  foodCostPct: number;
  grossMarginPct: number;
  suggestedSalePriceGross: number;
  reteIvaReference: number;
  reteFuenteReference: number;
}

export function calculateCostMatrix(input: CostMatrixInput): CostMatrixResult {
  const purchaseSubtotal = input.unitCostNet * input.quantity;
  const purchase = calculateTaxLine(purchaseSubtotal, input.purchaseTaxCategory);
  const unitCostWithTax =
    input.quantity > 0 ? purchase.total / input.quantity : 0;

  const saleTaxRate = CO_TAX_RATES[input.saleTaxCategory];
  const salePriceNet =
    saleTaxRate > 0
      ? Math.round(input.salePriceGross / (1 + saleTaxRate))
      : input.salePriceGross;
  const sale = calculateTaxLine(salePriceNet, input.saleTaxCategory);

  const recipeCost = input.recipeCost ?? purchase.total;
  const foodCostPct =
    input.salePriceGross > 0 ? recipeCost / input.salePriceGross : 0;
  const grossMarginPct =
    input.salePriceGross > 0
      ? (input.salePriceGross - recipeCost) / input.salePriceGross
      : 0;

  const targetPct = input.targetCostPct ?? CO_COST_MATRIX_DEFAULTS.targetFoodCostPct;
  const suggestedNet =
    targetPct > 0 ? Math.round(recipeCost / targetPct / (1 + saleTaxRate)) : 0;
  const suggestedSalePriceGross = suggestedNet + Math.round(suggestedNet * saleTaxRate);

  return {
    purchase,
    unitCostWithTax,
    sale,
    salePriceNet,
    recipeCost,
    foodCostPct,
    grossMarginPct,
    suggestedSalePriceGross,
    reteIvaReference: Math.round(sale.taxAmount * CO_COST_MATRIX_DEFAULTS.reteIvaPct),
    reteFuenteReference: Math.round(
      salePriceNet * CO_COST_MATRIX_DEFAULTS.reteFuenteGoodsPct,
    ),
  };
}

export function validateTaxCategory(value: string): Result<CoTaxCategory> {
  if ((CO_TAX_CATEGORIES as readonly string[]).includes(value)) {
    return ok(value as CoTaxCategory);
  }
  return err("Categoría de impuesto no válida.");
}
