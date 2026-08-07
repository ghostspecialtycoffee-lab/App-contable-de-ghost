import type { InventoryCostProfile } from "../../inventory/unit-conversion.js";
import { convertToBaseUnit } from "../../inventory/unit-conversion.js";
import type { BaseUnit } from "../../inventory/units.js";
import type { Recipe, RecipeLine } from "../recipe.js";
import { calculateRecipeCost } from "./recipe-cost.js";

import type { MenuCategory } from "../../pos/menu-product.js";

export const RECIPE_YIELD_PRESETS = [
  { value: 1, label: "Unidad", hint: "Se vende el lote completo (1:1)" },
  { value: 6, label: "6 porciones", hint: "Porciones individuales" },
  { value: 8, label: "8 porciones", hint: "Brownies, galletas o croissants" },
  { value: 10, label: "10 porciones", hint: "Pan o enrollados" },
  { value: 12, label: "12 porciones", hint: "Torta estándar" },
  { value: 16, label: "16 porciones", hint: "Torta grande" },
] as const;

/** Porciones por defecto para repostería sin regla por nombre. */
export const DEFAULT_PASTRY_YIELD = 12;

export function normalizeYieldQuantity(value: number | undefined): number {
  const next = Number(value ?? 1);
  if (!Number.isFinite(next) || next <= 0) {
    return 1;
  }
  return Math.round(next * 1000) / 1000;
}

/** Sugiere porciones según nombre del producto o insumo (tortas → 12). */
export function suggestRecipeYield(name: string): number {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/torta|tarta|cheesecake|pastel/.test(normalized)) {
    return 12;
  }
  if (/brownie|galleta|croissant|muffin|donut|dona|alfajor/.test(normalized)) {
    return 8;
  }
  if (/pan\b|enrollado/.test(normalized)) {
    return 10;
  }

  return 1;
}

/** Sugiere porciones según nombre y categoría (repostería → 12 si no hay regla). */
export function suggestRecipeYieldForProduct(
  name: string,
  category?: MenuCategory,
): number {
  const fromName = suggestRecipeYield(name);
  if (fromName > 1) {
    return fromName;
  }

  if (category === "pastry") {
    return DEFAULT_PASTRY_YIELD;
  }

  return 1;
}

/**
 * Resuelve porciones para guardar en receta.
 * Respeta el valor guardado; si no hay, sugiere según producto.
 */
export function resolveRecipeYieldQuantity(input: {
  productName: string;
  category?: MenuCategory;
  savedYield?: number;
}): number {
  if (input.savedYield !== undefined && input.savedYield !== null) {
    const saved = normalizeYieldQuantity(input.savedYield);
    if (saved >= 1) {
      return saved;
    }
  }

  return suggestRecipeYieldForProduct(input.productName, input.category);
}

export function isPortionBasedProduct(
  name: string,
  yieldQuantity = 1,
  category?: MenuCategory,
): boolean {
  return (
    normalizeYieldQuantity(yieldQuantity) > 1 ||
    suggestRecipeYieldForProduct(name, category) > 1
  );
}

export function calculateRecipeBatchCost(
  lines: RecipeLine[],
  items: Record<string, InventoryCostProfile>,
): number {
  return calculateRecipeCost(lines, items);
}

/** Costo por porción/unidad vendida (lote ÷ rendimiento). */
export function calculateRecipeCostPerPortion(
  lines: RecipeLine[],
  items: Record<string, InventoryCostProfile>,
  yieldQuantity?: number,
): number {
  const batchCost = calculateRecipeBatchCost(lines, items);
  const yieldQty = normalizeYieldQuantity(yieldQuantity);
  return Math.round(batchCost / yieldQty);
}

export interface RecipeConsumptionLine {
  inventoryItemId: string;
  itemName: string;
  quantityInBase: number;
  baseUnit: BaseUnit;
}

/** Consumo de bodega al vender `saleQuantity` porciones/unidades del producto. */
export function calculateRecipeConsumption(
  recipe: Pick<Recipe, "lines" | "yieldQuantity">,
  saleQuantity: number,
  items: Record<string, InventoryCostProfile>,
): RecipeConsumptionLine[] {
  const yieldQty = normalizeYieldQuantity(recipe.yieldQuantity);
  const sold = Number(saleQuantity);
  if (!Number.isFinite(sold) || sold <= 0) {
    return [];
  }

  return recipe.lines
    .filter((line) => line.inventoryItemId && line.quantity > 0)
    .map((line) => {
      const profile = items[line.inventoryItemId] ?? {
        baseUnit: line.unit,
        averageCost: 0,
      };
      const batchQtyInBase = convertToBaseUnit(line.quantity, line.unit, profile.baseUnit, {
        presentationQuantity: profile.presentationQuantity,
        purchaseUnit: profile.purchaseUnit,
      });
      const quantityInBase = (batchQtyInBase / yieldQty) * sold;

      return {
        inventoryItemId: line.inventoryItemId,
        itemName: line.itemName,
        quantityInBase,
        baseUnit: profile.baseUnit,
      };
    })
    .filter((line) => line.quantityInBase > 0);
}
