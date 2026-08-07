import type { EntityId, ISODateString } from "@ghost/shared";

import type { Recipe, RecipeLine, RecipeLineInput } from "./recipe.js";

export interface RecipeVersion {
  id: EntityId;
  recipeId: EntityId;
  organizationId: EntityId;
  menuProductId: EntityId;
  menuProductName: string;
  version: number;
  yieldQuantity: number;
  lines: RecipeLine[];
  recipeCost: number;
  advancedSetupAnswers?: Record<string, string>;
  changeNote?: string;
  publishedAt: ISODateString;
  publishedBy: EntityId;
}

export interface SaleRecipeSnapshot {
  productId: EntityId;
  recipeId: EntityId;
  recipeVersion: number;
  recipeCost: number;
  yieldQuantity: number;
  lines: RecipeLine[];
}

export interface RecipeContentInput {
  yieldQuantity?: number;
  lines: RecipeLineInput[];
  advancedSetupAnswers?: Record<string, string>;
}

function normalizeLines(lines: RecipeLineInput[] | RecipeLine[]): RecipeLine[] {
  return lines
    .filter((line) => line.quantity > 0 && line.inventoryItemId)
    .map((line) => ({
      inventoryItemId: line.inventoryItemId,
      itemName: line.itemName.trim(),
      quantity: line.quantity,
      unit: line.unit,
    }))
    .sort((left, right) => left.inventoryItemId.localeCompare(right.inventoryItemId));
}

export function buildRecipeContentSignature(input: RecipeContentInput): string {
  const payload = {
    yieldQuantity: input.yieldQuantity ?? 1,
    lines: normalizeLines(input.lines),
    advancedSetupAnswers: input.advancedSetupAnswers ?? {},
  };

  return JSON.stringify(payload);
}

export function hasRecipeContentChanged(
  current: RecipeContentInput | null | undefined,
  next: RecipeContentInput,
): boolean {
  if (!current) {
    return true;
  }

  return buildRecipeContentSignature(current) !== buildRecipeContentSignature(next);
}

export function resolveNextRecipeVersion(
  currentVersion: number | undefined,
  isNewRecipe: boolean,
  contentChanged: boolean,
): number {
  if (isNewRecipe) {
    return 1;
  }

  if (!contentChanged) {
    return currentVersion ?? 1;
  }

  return (currentVersion ?? 0) + 1;
}

export function buildSaleRecipeSnapshot(recipe: Recipe & { recipeCost?: number }): SaleRecipeSnapshot {
  return {
    productId: recipe.menuProductId,
    recipeId: recipe.id,
    recipeVersion: recipe.currentVersion ?? 1,
    recipeCost: recipe.recipeCost ?? 0,
    yieldQuantity: recipe.yieldQuantity,
    lines: recipe.lines.map((line) => ({ ...line })),
  };
}

export function buildRecipeVersionDocument(input: {
  recipeId: EntityId;
  organizationId: EntityId;
  menuProductId: EntityId;
  menuProductName: string;
  version: number;
  yieldQuantity: number;
  lines: RecipeLine[];
  recipeCost: number;
  advancedSetupAnswers?: Record<string, string>;
  changeNote?: string;
  publishedAt: ISODateString;
  publishedBy: EntityId;
}): Omit<RecipeVersion, "id"> & { version: number } {
  return {
    recipeId: input.recipeId,
    organizationId: input.organizationId,
    menuProductId: input.menuProductId,
    menuProductName: input.menuProductName,
    version: input.version,
    yieldQuantity: input.yieldQuantity,
    lines: input.lines,
    recipeCost: input.recipeCost,
    advancedSetupAnswers: input.advancedSetupAnswers,
    changeNote: input.changeNote,
    publishedAt: input.publishedAt,
    publishedBy: input.publishedBy,
  };
}
