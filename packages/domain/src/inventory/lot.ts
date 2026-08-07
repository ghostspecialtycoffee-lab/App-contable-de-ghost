import type { EntityId, ISODateString } from "@ghost/shared";

/** Lote sin código explícito (stock histórico o ajustes sin lote). */
export const LEGACY_LOT_CODE = "SIN-LOTE";

export interface InventoryLot {
  id: EntityId;
  organizationId: EntityId;
  branchId: EntityId;
  warehouseId: EntityId;
  itemId: EntityId;
  lotCode: string;
  quantityRemaining: number;
  unitCost: number;
  sourceReference?: string;
  sourceMovementId?: EntityId;
  receivedAt: ISODateString;
}

export interface SaleLotConsumption {
  inventoryItemId: EntityId;
  itemName: string;
  lotCode: string;
  lotId?: EntityId;
  quantity: number;
  unitCost: number;
  sourceReference?: string;
}

export interface LotAllocation {
  lotId: string;
  lotCode: string;
  quantity: number;
  unitCost: number;
  sourceReference?: string;
  receivedAt: string;
}

export interface AllocatableLot {
  id: string;
  lotCode: string;
  quantityRemaining: number;
  unitCost: number;
  sourceReference?: string;
  receivedAt: string;
}
