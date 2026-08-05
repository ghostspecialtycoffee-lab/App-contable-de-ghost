import type { InventoryCostProfile } from "../../inventory/unit-conversion.js";
import { convertToBaseUnit } from "../../inventory/unit-conversion.js";
import type { BaseUnit } from "../../inventory/units.js";
import type { Recipe, RecipeLine } from "../recipe.js";
import { calculateRecipeCost } from "./recipe-cost.js";

export const RECIPE_YIELD_PRESETS = [
  { value: 1, label: "Unidad", hint: "Se vende el lote completo (1:1)" },
  { value: 8, label: "8 porciones", hint: "Tarta mediana u octavo" },
  { value: 12, label: "12 porciones", hint: "Torta estándar" },
  { value: 16, label: "16 porciones", hint: "Torta grande" },
] as const;

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
  if (/brownie|galleta/.test(normalized)) {
    return 8;
  }
  if (/pan\b|enrollado/.test(normalized)) {
    return 10;
  }

  return 1;
}

export function isPortionBasedProduct(name: string, yieldQuantity = 1): boolean {
  return normalizeYieldQuantity(yieldQuantity) > 1 || suggestRecipeYield(name) > 1;
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
