import type { CostMatrixSettingsInput, CoTaxCategory } from "../fiscal/colombia-tax.js";
import { calculateCostMatrix } from "../fiscal/colombia-tax.js";
import { getTargetCostPctForCategory } from "../organization-cost-matrix.js";
import {
  calculatePastryPortionCost,
  isPastryCategory,
  PASTRY_DOMICILIO_ALLOCATION_COP,
} from "../operations/pastry-costing.js";
import type { MenuCategory } from "../pos/menu-product.js";
import { normalizeYieldQuantity } from "../production/services/recipe-yield.js";

export type CostScenarioStatus = "ok" | "high" | "missing";

export interface PastryLotBreakdown {
  batchCostNet: number;
  domicilioAllocation: number;
  totalLotCost: number;
  yieldQuantity: number;
  portionCost: number;
}

export interface CostScenarioSnapshot {
  salePriceGross: number;
  recipeCost: number;
  foodCostPct: number;
  grossMarginPct: number;
  grossProfitAmount: number;
  status: CostScenarioStatus;
}

export interface ProductCostPanorama {
  category: MenuCategory;
  targetFoodCostPct: number;
  portionCost: number;
  lotBreakdown: PastryLotBreakdown | null;
  yourPrice: CostScenarioSnapshot | null;
  suggestedPrice: CostScenarioSnapshot;
  suggestedSalePriceGross: number;
}

function buildScenarioSnapshot(input: {
  salePriceGross: number;
  recipeCost: number;
  saleTaxCategory: CoTaxCategory;
  targetFoodCostPct: number;
  matrixSettings?: CostMatrixSettingsInput;
}): CostScenarioSnapshot {
  const salePriceGross = Math.round(input.salePriceGross);
  const recipeCost = Math.round(input.recipeCost);

  if (salePriceGross <= 0 || recipeCost <= 0) {
    return {
      salePriceGross,
      recipeCost,
      foodCostPct: 0,
      grossMarginPct: 0,
      grossProfitAmount: 0,
      status: "missing",
    };
  }

  const matrix = calculateCostMatrix({
    unitCostNet: recipeCost,
    quantity: 1,
    purchaseTaxCategory: "IVA_19",
    salePriceGross,
    saleTaxCategory: input.saleTaxCategory,
    recipeCost,
    targetCostPct: input.targetFoodCostPct,
    matrixSettings: input.matrixSettings,
  });

  return {
    salePriceGross,
    recipeCost,
    foodCostPct: matrix.foodCostPct,
    grossMarginPct: matrix.grossMarginPct,
    grossProfitAmount: matrix.grossProfitAmount,
    status: matrix.foodCostPct > input.targetFoodCostPct ? "high" : "ok",
  };
}

export function buildPastryLotBreakdown(input: {
  batchCostNet: number;
  yieldQuantity?: number;
  category?: MenuCategory;
  domicilioAllocation?: number;
}): PastryLotBreakdown | null {
  const yieldQty = normalizeYieldQuantity(input.yieldQuantity);
  const batchCostNet = Math.round(input.batchCostNet);
  if (!isPastryCategory(input.category) || batchCostNet <= 0 || yieldQty <= 0) {
    return null;
  }

  const domicilioAllocation = Math.round(
    input.domicilioAllocation ?? PASTRY_DOMICILIO_ALLOCATION_COP,
  );
  const portionCost = calculatePastryPortionCost({
    batchCostNet,
    yieldQuantity: yieldQty,
    category: input.category,
    domicilioAllocation,
  });

  return {
    batchCostNet,
    domicilioAllocation,
    totalLotCost: batchCostNet + domicilioAllocation,
    yieldQuantity: yieldQty,
    portionCost,
  };
}

/** Dos panoramas: tu precio establecido vs precio sugerido según meta de costo. */
export function buildProductCostPanorama(input: {
  category: MenuCategory;
  batchCostNet: number;
  yieldQuantity?: number;
  userSalePrice: number;
  saleTaxCategory: CoTaxCategory;
  matrixSettings?: CostMatrixSettingsInput;
}): ProductCostPanorama {
  const yieldQty = normalizeYieldQuantity(input.yieldQuantity);
  const targetFoodCostPct = getTargetCostPctForCategory(
    input.category,
    input.matrixSettings,
  );
  const lotBreakdown = buildPastryLotBreakdown({
    batchCostNet: input.batchCostNet,
    yieldQuantity: yieldQty,
    category: input.category,
  });
  const portionCost =
    lotBreakdown?.portionCost ??
    calculatePastryPortionCost({
      batchCostNet: input.batchCostNet,
      yieldQuantity: yieldQty,
      category: input.category,
    });

  const suggestedMatrix = calculateCostMatrix({
    unitCostNet: portionCost,
    quantity: 1,
    purchaseTaxCategory: "IVA_19",
    salePriceGross: 0,
    saleTaxCategory: input.saleTaxCategory,
    recipeCost: portionCost,
    targetCostPct: targetFoodCostPct,
    matrixSettings: input.matrixSettings,
  });

  const suggestedSalePriceGross = suggestedMatrix.suggestedSalePriceGross;
  const userSalePrice = Math.round(input.userSalePrice);

  return {
    category: input.category,
    targetFoodCostPct,
    portionCost,
    lotBreakdown,
    yourPrice:
      userSalePrice > 0
        ? buildScenarioSnapshot({
            salePriceGross: userSalePrice,
            recipeCost: portionCost,
            saleTaxCategory: input.saleTaxCategory,
            targetFoodCostPct,
            matrixSettings: input.matrixSettings,
          })
        : null,
    suggestedPrice: buildScenarioSnapshot({
      salePriceGross: suggestedSalePriceGross,
      recipeCost: portionCost,
      saleTaxCategory: input.saleTaxCategory,
      targetFoodCostPct,
      matrixSettings: input.matrixSettings,
    }),
    suggestedSalePriceGross,
  };
}
