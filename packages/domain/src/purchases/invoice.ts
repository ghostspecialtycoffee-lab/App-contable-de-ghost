import type { AuditMetadata, EntityId } from "@ghost/shared";

import type { CoTaxCategory } from "../fiscal/colombia-tax.js";
import type { BaseUnit } from "../inventory/units.js";

export type PurchaseInvoiceStatus = "draft" | "confirmed";

export interface PurchaseInvoiceLine {
  inventoryItemId?: EntityId;
  description: string;
  quantity: number;
  unit: BaseUnit;
  unitPriceNet: number;
  taxCategory: CoTaxCategory;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

export interface PurchaseInvoice extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  branchId: EntityId;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: PurchaseInvoiceStatus;
  /** Si al confirmar se generaron movimientos de inventario (false = solo registro histórico). */
  inventoryApplied?: boolean;
  lines: PurchaseInvoiceLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  warehouseId?: EntityId;
  attachmentDataUrl?: string;
  attachmentName?: string;
}

export interface PurchaseInvoiceLineInput {
  inventoryItemId?: EntityId;
  description: string;
  quantity: number;
  unit: BaseUnit;
  unitPriceNet: number;
  taxCategory: CoTaxCategory;
}
