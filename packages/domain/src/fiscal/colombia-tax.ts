import type { Result } from "@ghost/shared";
import { err, ok } from "@ghost/shared";

export const CO_TAX_CATEGORIES = [
  "IVA_19",
  "IVA_5",
  "IVA_0",
  "INC_8",
  "EXENTO",
  "EXCLUIDO",
] as const;

export type CoTaxCategory = (typeof CO_TAX_CATEGORIES)[number];

export const CO_TAX_CATEGORY_LABELS: Record<CoTaxCategory, string> = {
  IVA_19: "IVA 19%",
  IVA_5: "IVA 5%",
  IVA_0: "IVA 0%",
  INC_8: "INC 8% (café preparado)",
  EXENTO: "Exento",
  EXCLUIDO: "Excluido",
};

export const CO_TAX_RATES: Record<CoTaxCategory, number> = {
  IVA_19: 0.19,
  IVA_5: 0.05,
  IVA_0: 0,
  INC_8: 0.08,
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

/** Precio de venta en mostrador: impuesto incluido (precio final al cliente). */
export interface GrossPriceTaxBreakdown {
  net: number;
  taxAmount: number;
  gross: number;
  taxRate: number;
  category: CoTaxCategory;
}

export function extractTaxFromGrossPrice(
  grossAmount: number,
  category: CoTaxCategory,
): GrossPriceTaxBreakdown {
  const taxRate = CO_TAX_RATES[category];
  const gross = Math.round(grossAmount);

  if (gross <= 0 || taxRate <= 0) {
    return { net: gross, taxAmount: 0, gross, taxRate, category };
  }

  const net = Math.round(gross / (1 + taxRate));
  const taxAmount = gross - net;

  return { net, taxAmount, gross, taxRate, category };
}

const COFFEE_BEVERAGE_KEYWORDS = [
  "americano",
  "espresso",
  "expresso",
  "latte",
  "cappuccino",
  "capuchino",
  "mocha",
  "macchiato",
  "cortado",
  "flat white",
  "affogato",
  "cafe",
  "café",
  "cold brew",
  "pour over",
  "v60",
  "chemex",
  "ristretto",
  "lungo",
  "frappe",
  "frappé",
] as const;

export function isCoffeeBeverageName(name: string): boolean {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return COFFEE_BEVERAGE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function inferMenuProductTaxCategory(input: {
  name: string;
  category: "beverage" | "food" | "pastry" | "other";
  containsCoffeeIngredient?: boolean;
}): CoTaxCategory {
  if (
    input.category === "beverage" &&
    (isCoffeeBeverageName(input.name) || input.containsCoffeeIngredient)
  ) {
    return "INC_8";
  }

  return "IVA_19";
}

export interface TaxBreakdownLine {
  category: CoTaxCategory;
  label: string;
  amount: number;
}

export function summarizeTaxBreakdown(
  lines: Array<{ category: CoTaxCategory; amount: number }>,
): TaxBreakdownLine[] {
  const totals = new Map<CoTaxCategory, number>();

  for (const line of lines) {
    totals.set(line.category, (totals.get(line.category) ?? 0) + line.amount);
  }

  return [...totals.entries()]
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({
      category,
      label: CO_TAX_CATEGORY_LABELS[category],
      amount,
    }));
}
