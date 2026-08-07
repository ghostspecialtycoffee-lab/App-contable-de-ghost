import type { AuditMetadata, EntityId } from "@ghost/shared";

import type { InventoryCostMethod } from "./cost-method.js";
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
  /** Costo estándar presupuestado (método standard). */
  standardCost?: number;
  /** Override del método de costeo de la organización. */
  costMethod?: InventoryCostMethod;
  trackLot: boolean;
  /** Unidad en la que se compra normalmente (ej. kg, caja). */
  purchaseUnit?: BaseUnit;
  /** Cuántas unidades base hay en 1 unidad de compra (ej. 1 kg = 1000 g). */
  presentationQuantity?: number;
  /** Etiqueta operativa: "Saco 70 kg", "Caja x100". */
  presentationLabel?: string;
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
  purchaseUnit?: BaseUnit;
  presentationQuantity?: number;
  presentationLabel?: string;
  standardCost?: number;
  costMethod?: InventoryCostMethod;
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
  purchaseUnit?: BaseUnit;
  presentationQuantity?: number;
  presentationLabel?: string;
  standardCost?: number;
  costMethod?: InventoryCostMethod;
  actorUserId: EntityId;
}
