import type { InventoryCostProfile } from "../../inventory/unit-conversion.js";
import {
  convertToBaseUnit,
  resolveUnitCostPerBase,
} from "../../inventory/unit-conversion.js";
import type { RecipeLine } from "../recipe.js";

export interface RecipeLineCostBreakdown {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unit: RecipeLine["unit"];
  quantityInBase: number;
  baseUnit: RecipeLine["unit"];
  unitCostPerBase: number;
  lineCost: number;
}

export function calculateRecipeLineCost(
  line: RecipeLine,
  item: InventoryCostProfile,
): RecipeLineCostBreakdown {
  const quantityInBase = convertToBaseUnit(line.quantity, line.unit, item.baseUnit, {
    presentationQuantity: item.presentationQuantity,
    purchaseUnit: item.purchaseUnit,
  });
  const unitCostPerBase = resolveUnitCostPerBase(item);
  const lineCost = Math.round(quantityInBase * unitCostPerBase);

  return {
    inventoryItemId: line.inventoryItemId,
    itemName: line.itemName,
    quantity: line.quantity,
    unit: line.unit,
    quantityInBase,
    baseUnit: item.baseUnit,
    unitCostPerBase,
    lineCost,
  };
}

export function calculateRecipeCostBreakdown(
  lines: RecipeLine[],
  items: Record<string, InventoryCostProfile>,
): RecipeLineCostBreakdown[] {
  return lines
    .filter((line) => line.inventoryItemId && line.quantity > 0)
    .map((line) => {
      const item = items[line.inventoryItemId] ?? {
        baseUnit: line.unit,
        averageCost: 0,
      };

      return calculateRecipeLineCost(line, item);
    });
}

export function calculateRecipeCost(
  lines: RecipeLine[],
  items: Record<string, InventoryCostProfile>,
): number {
  return calculateRecipeCostBreakdown(lines, items).reduce(
    (total, line) => total + line.lineCost,
    0,
  );
}
