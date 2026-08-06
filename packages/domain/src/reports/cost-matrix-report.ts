import type { CostMatrixSettingsInput, CoTaxCategory } from "../fiscal/colombia-tax.js";
import type { InventoryCostProfile } from "../inventory/unit-conversion.js";
import { getTargetCostPctForCategory } from "../organization-cost-matrix.js";
import {
  calculatePastryPortionCost,
  getCostMatrixSalePrice,
  isPastryCategory,
} from "../operations/pastry-costing.js";
import type { MenuCategory } from "../pos/menu-product.js";
import type { RecipeLineInput } from "../production/recipe.js";
import {
  calculateRecipeBatchCost,
  suggestRecipeYield,
} from "../production/services/recipe-yield.js";
import { buildPastryLotBreakdown, buildProductCostPanorama } from "./product-cost-panorama.js";

export type CostMatrixReportStatus = "ok" | "high" | "missing";

export interface CostMatrixReportRow {
  productId: string;
  name: string;
  category: MenuCategory;
  price: number;
  effectiveSalePrice: number;
  recipeCost: number;
  foodCostPct: number;
  targetFoodCostPct: number;
  grossMarginPct: number;
  grossProfitAmount: number;
  suggestedSalePriceGross: number;
  suggestedFoodCostPct: number;
  yieldQuantity: number;
  batchCostNet: number;
  domicilioAllocation: number;
  totalLotCost: number;
  hasRecipe: boolean;
  status: CostMatrixReportStatus;
}

export interface CostMatrixReport {
  rows: CostMatrixReportRow[];
  averageFoodCostPct: number;
  averageGrossMarginPct: number;
  productsWithRecipe: number;
  productsMissingRecipe: number;
  productsAboveTarget: number;
}

export function buildCostMatrixReport(input: {
  products: Array<{
    id: string;
    name: string;
    price: number;
    category: MenuCategory;
    saleTaxCategory?: CoTaxCategory;
    recipeCost?: number;
  }>;
  recipes: Array<{
    menuProductId: string;
    yieldQuantity: number;
    lines: RecipeLineInput[];
  }>;
  itemProfiles: Record<string, InventoryCostProfile>;
  matrixSettings?: CostMatrixSettingsInput;
  categoryFilter?: MenuCategory;
}): CostMatrixReport {
  const rows: CostMatrixReportRow[] = [];

  for (const product of input.products) {
    if (input.categoryFilter && product.category !== input.categoryFilter) {
      continue;
    }

    const recipe = input.recipes.find((entry) => entry.menuProductId === product.id);
    const hasRecipe = Boolean(recipe?.lines.length);
    const yieldQuantity =
      recipe?.yieldQuantity && recipe.yieldQuantity > 0
        ? recipe.yieldQuantity
        : isPastryCategory(product.category)
          ? suggestRecipeYield(product.name)
          : 1;
    const baseBatchCost =
      hasRecipe && recipe
        ? calculateRecipeBatchCost(recipe.lines, input.itemProfiles)
        : 0;
    const recipeCost =
      hasRecipe && recipe
        ? calculatePastryPortionCost({
            batchCostNet: baseBatchCost,
            yieldQuantity,
            category: product.category,
          })
        : product.recipeCost ?? 0;
    const effectiveSalePrice = getCostMatrixSalePrice({
      category: product.category,
      menuPrice: product.price,
    });
    const lotBreakdown = buildPastryLotBreakdown({
      batchCostNet: baseBatchCost,
      yieldQuantity,
      category: product.category,
    });

    const targetFoodCostPct = getTargetCostPctForCategory(
      product.category,
      input.matrixSettings,
    );

    if (!hasRecipe || recipeCost <= 0) {
      rows.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        effectiveSalePrice,
        recipeCost,
        foodCostPct: 0,
        targetFoodCostPct,
        grossMarginPct: 0,
        grossProfitAmount: 0,
        suggestedSalePriceGross: 0,
        suggestedFoodCostPct: 0,
        yieldQuantity,
        batchCostNet: baseBatchCost,
        domicilioAllocation: lotBreakdown?.domicilioAllocation ?? 0,
        totalLotCost: lotBreakdown?.totalLotCost ?? baseBatchCost,
        hasRecipe,
        status: "missing",
      });
      continue;
    }

    const panorama = buildProductCostPanorama({
      category: product.category,
      batchCostNet: baseBatchCost,
      yieldQuantity,
      userSalePrice: product.price,
      saleTaxCategory: (product.saleTaxCategory ?? "IVA_19") as CoTaxCategory,
      matrixSettings: input.matrixSettings,
    });

    const yourPrice = panorama.yourPrice;
    const status: CostMatrixReportStatus =
      product.price > 0 && yourPrice
        ? yourPrice.status === "missing"
          ? "missing"
          : yourPrice.status
        : "missing";

    rows.push({
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      effectiveSalePrice,
      recipeCost: panorama.portionCost,
      foodCostPct: yourPrice?.foodCostPct ?? 0,
      targetFoodCostPct,
      grossMarginPct: yourPrice?.grossMarginPct ?? 0,
      grossProfitAmount: yourPrice?.grossProfitAmount ?? 0,
      suggestedSalePriceGross: panorama.suggestedSalePriceGross,
      suggestedFoodCostPct: panorama.suggestedPrice.foodCostPct,
      yieldQuantity,
      batchCostNet: panorama.lotBreakdown?.batchCostNet ?? baseBatchCost,
      domicilioAllocation: panorama.lotBreakdown?.domicilioAllocation ?? 0,
      totalLotCost: panorama.lotBreakdown?.totalLotCost ?? baseBatchCost,
      hasRecipe,
      status: product.price > 0 ? status : "missing",
    });
  }

  rows.sort((left, right) => right.foodCostPct - left.foodCostPct);

  const withCost = rows.filter((row) => row.hasRecipe && row.recipeCost > 0);
  const averageFoodCostPct =
    withCost.length > 0
      ? withCost.reduce((sum, row) => sum + row.foodCostPct, 0) / withCost.length
      : 0;
  const averageGrossMarginPct =
    withCost.length > 0
      ? withCost.reduce((sum, row) => sum + row.grossMarginPct, 0) / withCost.length
      : 0;

  return {
    rows,
    averageFoodCostPct,
    averageGrossMarginPct,
    productsWithRecipe: withCost.length,
    productsMissingRecipe: rows.length - withCost.length,
    productsAboveTarget: withCost.filter((row) => row.status === "high").length,
  };
}
