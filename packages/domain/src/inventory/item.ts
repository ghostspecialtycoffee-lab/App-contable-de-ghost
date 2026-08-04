import type { AuditMetadata, EntityId } from "@ghost/shared";

import type { BaseUnit, InventoryItemType } from "./units.js";

export type InventoryItemStatus = "active" | "inactive";

export interface InventoryItem extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  sku: string;
  name: string;
  type: InventoryItemType;
  baseUnit: BaseUnit;
  category?: string;
  status: InventoryItemStatus;
  minStock: number;
  maxStock?: number;
  averageCost: number;
  lastCost: number;
  trackLot: boolean;
}

export interface CreateInventoryItemInput {
  organizationId: EntityId;
  sku: string;
  name: string;
  type: InventoryItemType;
  baseUnit: BaseUnit;
  category?: string;
  minStock?: number;
  maxStock?: number;
  trackLot?: boolean;
  actorUserId: EntityId;
}

export interface UpdateInventoryItemInput {
  itemId: EntityId;
  organizationId: EntityId;
  name?: string;
  category?: string;
  minStock?: number;
  maxStock?: number;
  status?: InventoryItemStatus;
  actorUserId: EntityId;
}
