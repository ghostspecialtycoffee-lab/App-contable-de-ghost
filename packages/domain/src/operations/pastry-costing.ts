import type { MenuCategory } from "../pos/menu-product.js";
import { suggestRecipeYield } from "../production/services/recipe-yield.js";

/** Asignación de domicilio incluida en el precio efectivo para costear repostería. */
export const PASTRY_DOMICILIO_ALLOCATION_COP = 10_000;

export function isPastryCategory(category: MenuCategory | undefined): boolean {
  return category === "pastry";
}

/** Precio de venta + domicilio para calcular food cost de repostería. */
export function getPastryEffectiveSalePrice(menuPrice: number): number {
  const price = Math.round(menuPrice);
  if (!Number.isFinite(price) || price <= 0) {
    return 0;
  }
  return price + PASTRY_DOMICILIO_ALLOCATION_COP;
}

/** Precio usado en la matriz de costos según categoría del producto. */
export function getCostMatrixSalePrice(input: {
  category: MenuCategory;
  menuPrice: number;
}): number {
  if (isPastryCategory(input.category)) {
    return getPastryEffectiveSalePrice(input.menuPrice);
  }
  return input.menuPrice;
}

/** Rendimiento por defecto para fichas de repostería (tortas → 12 porciones). */
export function getPastryRecipeYield(productName: string): number {
  return suggestRecipeYield(productName);
}

/** Costo por porción a partir del precio de factura de la torta completa. */
export function calculatePastryPortionCostFromInvoice(wholeCakeCostNet: number): number {
  const whole = Math.round(wholeCakeCostNet);
  if (!Number.isFinite(whole) || whole <= 0) {
    return 0;
  }
  return Math.round(whole / 12);
}
