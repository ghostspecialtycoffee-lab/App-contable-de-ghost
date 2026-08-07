import type { InventoryCostMethod } from "../cost-method.js";

export interface SaleCostSnapshotLine {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  unitCost: number;
  lineCost: number;
  method: InventoryCostMethod;
}

export interface SaleCostSnapshot {
  method: InventoryCostMethod;
  totalIngredientCost: number;
  totalRevenue: number;
  foodCostPct: number;
  lines: SaleCostSnapshotLine[];
}

export interface BuildSaleCostSnapshotInput {
  method: InventoryCostMethod;
  saleLines: Array<{
    productId: string;
    name: string;
    quantity: number;
    lineTotal: number;
  }>;
  recipeSnapshots?: Array<{
    productId: string;
    recipeCost: number;
  }>;
  lotConsumptions?: Array<{
    inventoryItemId: string;
    quantity: number;
    unitCost: number;
  }>;
  ingredientCostByProduct?: Record<string, number>;
}

export function buildSaleCostSnapshot(input: BuildSaleCostSnapshotInput): SaleCostSnapshot {
  const recipeCostByProduct = new Map(
    (input.recipeSnapshots ?? []).map((snapshot) => [snapshot.productId, snapshot.recipeCost]),
  );

  const lines: SaleCostSnapshotLine[] = input.saleLines.map((line) => {
    const fifoIngredientCost = input.ingredientCostByProduct?.[line.productId];
    const recipeUnitCost = recipeCostByProduct.get(line.productId) ?? 0;

    let unitCost = 0;
    if (input.method === "fifo" && fifoIngredientCost != null && line.quantity > 0) {
      unitCost = Math.round(fifoIngredientCost / line.quantity);
    } else if (recipeUnitCost > 0) {
      unitCost = recipeUnitCost;
    } else if (fifoIngredientCost != null && line.quantity > 0) {
      unitCost = Math.round(fifoIngredientCost / line.quantity);
    }

    const lineCost = Math.round(unitCost * line.quantity);

    return {
      productId: line.productId,
      productName: line.name,
      quantity: line.quantity,
      revenue: line.lineTotal,
      unitCost,
      lineCost,
      method: input.method,
    };
  });

  const totalIngredientCost = lines.reduce((sum, line) => sum + line.lineCost, 0);
  const totalRevenue = input.saleLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const foodCostPct = totalRevenue > 0 ? totalIngredientCost / totalRevenue : 0;

  return {
    method: input.method,
    totalIngredientCost,
    totalRevenue,
    foodCostPct,
    lines,
  };
}

export function sumLotConsumptionCost(
  lotConsumptions: Array<{ quantity: number; unitCost: number }>,
): number {
  return lotConsumptions.reduce(
    (sum, entry) => sum + Math.round(entry.quantity * entry.unitCost),
    0,
  );
}
