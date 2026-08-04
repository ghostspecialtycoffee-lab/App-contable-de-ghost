import type { RecipeLine } from "../recipe.js";

export function calculateRecipeCost(
  lines: RecipeLine[],
  unitCosts: Record<string, number>,
): number {
  return lines.reduce((total, line) => {
    const unitCost = unitCosts[line.inventoryItemId] ?? 0;
    return total + Math.round(line.quantity * unitCost);
  }, 0);
}
