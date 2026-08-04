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
  yieldQuantity: number;
  lines: RecipeLine[];
}

export interface RecipeLineInput {
  inventoryItemId: EntityId;
  itemName: string;
  quantity: number;
  unit: BaseUnit;
}
