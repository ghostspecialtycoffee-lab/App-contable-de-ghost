import type { MenuCategory } from "../pos/menu-product.js";
import {
  normalizeYieldQuantity,
  suggestRecipeYield,
} from "../production/services/recipe-yield.js";

/** Domicilio fijo sumado al costo del lote de repostería (torta completa). */
export const PASTRY_DOMICILIO_ALLOCATION_COP = 10_000;

export function isPastryCategory(category: MenuCategory | undefined): boolean {
  return category === "pastry";
}

/** Precio de venta en matriz (repostería: el que defines tú, sin ajustes). */
export function getCostMatrixSalePrice(input: {
  category: MenuCategory;
  menuPrice: number;
}): number {
  return Math.round(input.menuPrice);
}

/** Rendimiento por defecto para fichas de repostería (tortas → 12 porciones). */
export function getPastryRecipeYield(productName: string): number {
  return suggestRecipeYield(productName);
}

/**
 * Costo por porción de repostería:
 * (costo factura del lote + domicilio) ÷ porciones.
 * Ej: torta $63.000 + $10.000 domicilio ÷ 12 = $6.083/porción.
 */
export function calculatePastryPortionCost(input: {
  batchCostNet: number;
  yieldQuantity?: number;
  category?: MenuCategory;
  domicilioAllocation?: number;
}): number {
  const yieldQty = normalizeYieldQuantity(input.yieldQuantity);
  const batch = Math.round(input.batchCostNet);
  if (!Number.isFinite(batch) || batch <= 0 || yieldQty <= 0) {
    return 0;
  }

  if (!isPastryCategory(input.category)) {
    return Math.round(batch / yieldQty);
  }

  const domicilio = Math.round(input.domicilioAllocation ?? PASTRY_DOMICILIO_ALLOCATION_COP);
  return Math.round((batch + domicilio) / yieldQty);
}

/** Atajo: costo factura torta completa + domicilio ÷ 12. */
export function calculatePastryPortionCostFromInvoice(
  wholeCakeCostNet: number,
  yieldQuantity = 12,
  domicilioAllocation = PASTRY_DOMICILIO_ALLOCATION_COP,
): number {
  return calculatePastryPortionCost({
    batchCostNet: wholeCakeCostNet,
    yieldQuantity,
    category: "pastry",
    domicilioAllocation,
  });
}
