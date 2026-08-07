import type { EntityId, ISODateString } from "@ghost/shared";

import type { BaseUnit } from "../inventory/units.js";

export interface PurchasePriceHistoryEntry {
  id: EntityId;
  organizationId: EntityId;
  inventoryItemId: EntityId;
  supplierName: string;
  supplierId?: EntityId;
  unitPriceNet: number;
  unit: BaseUnit;
  quantity: number;
  invoiceId: EntityId;
  invoiceNumber: string;
  purchasedAt: ISODateString;
}

export interface PurchasePriceHistoryInput {
  inventoryItemId: EntityId;
  supplierName: string;
  supplierId?: EntityId;
  unitPriceNet: number;
  unit: BaseUnit;
  quantity: number;
  invoiceId: EntityId;
  invoiceNumber: string;
  purchasedAt: ISODateString;
}
