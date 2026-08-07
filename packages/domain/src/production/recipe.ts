import type { BaseUnit } from "../inventory/units.js";
import type { EntityId } from "@ghost/shared";

export interface RecipeLine {
  inventoryItemId: EntityId;
  itemName: string;
  quantity: number;
  unit: BaseUnit;
}

export interface Recipe {
  id: EntityId;
  organizationId: EntityId;
  menuProductId: EntityId;
  menuProductName: string;
  currentVersion?: number;
  recipeCost?: number;
  yieldQuantity: number;
  lines: RecipeLine[];
  /** Respuestas del cuestionario de bebidas no estándar SCA. */
  advancedSetupAnswers?: Record<string, string>;
}

export interface RecipeLineInput {
  inventoryItemId: EntityId;
  itemName: string;
  quantity: number;
  unit: BaseUnit;
}
