import type { EntityId, ISODateString } from "@ghost/shared";

export const INVENTORY_MOVEMENT_TYPES = [
  "entry",
  "exit",
  "adjustment",
  "transfer_out",
  "transfer_in",
  "waste",
] as const;

export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export const INVENTORY_MOVEMENT_LABELS: Record<InventoryMovementType, string> = {
  entry: "Entrada",
  exit: "Salida",
  adjustment: "Ajuste",
  transfer_out: "Transferencia salida",
  transfer_in: "Transferencia entrada",
  waste: "Merma",
};

export interface InventoryMovement {
  id: EntityId;
  organizationId: EntityId;
  branchId: EntityId;
  warehouseId: EntityId;
  itemId: EntityId;
  type: InventoryMovementType;
  quantity: number;
  unitCost: number;
  totalCost: number;
  balanceAfter: number;
  reference?: string;
  notes?: string;
  lotCode?: string;
  actorUserId: EntityId;
  occurredAt: ISODateString;
}

export interface RegisterInventoryMovementInput {
  organizationId: EntityId;
  branchId: EntityId;
  warehouseId: EntityId;
  itemId: EntityId;
  type: InventoryMovementType;
  quantity: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
  lotCode?: string;
  actorUserId: EntityId;
}

export interface InventoryBalance {
  id: EntityId;
  organizationId: EntityId;
  branchId: EntityId;
  warehouseId: EntityId;
  itemId: EntityId;
  quantity: number;
  averageCost: number;
  updatedAt: ISODateString;
}
