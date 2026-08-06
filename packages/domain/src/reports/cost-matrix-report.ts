import type { CostMatrixSettingsInput, CoTaxCategory } from "../fiscal/colombia-tax.js";
import { calculateCostMatrix } from "../fiscal/colombia-tax.js";
import type { InventoryCostProfile } from "../inventory/unit-conversion.js";
import { getTargetCostPctForCategory } from "../organization-cost-matrix.js";
import { getCostMatrixSalePrice, isPastryCategory } from "../operations/pastry-costing.js";
import type { MenuCategory } from "../pos/menu-product.js";
import type { RecipeLineInput } from "../production/recipe.js";
import {
  calculateRecipeCostPerPortion,
  suggestRecipeYield,
} from "../production/services/recipe-yield.js";

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
    const recipeCost =
      hasRecipe && recipe
        ? calculateRecipeCostPerPortion(
            recipe.lines,
            input.itemProfiles,
            yieldQuantity,
          )
        : product.recipeCost ?? 0;
    const effectiveSalePrice = getCostMatrixSalePrice({
      category: product.category,
      menuPrice: product.price,
    });

    const targetFoodCostPct = getTargetCostPctForCategory(
      product.category,
      input.matrixSettings,
    );

    if (!hasRecipe || recipeCost <= 0 || product.price <= 0) {
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
        hasRecipe,
        status: "missing",
      });
      continue;
    }

    const matrix = calculateCostMatrix({
      unitCostNet: recipeCost,
      quantity: 1,
      purchaseTaxCategory: "IVA_19",
      salePriceGross: effectiveSalePrice,
      saleTaxCategory: (product.saleTaxCategory ?? "IVA_19") as CoTaxCategory,
      recipeCost,
      targetCostPct: targetFoodCostPct,
      matrixSettings: input.matrixSettings,
    });

    const status: CostMatrixReportStatus =
      matrix.foodCostPct > targetFoodCostPct ? "high" : "ok";

    rows.push({
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      effectiveSalePrice,
      recipeCost,
      foodCostPct: matrix.foodCostPct,
      targetFoodCostPct,
      grossMarginPct: matrix.grossMarginPct,
      grossProfitAmount: matrix.grossProfitAmount,
      hasRecipe,
      status,
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
