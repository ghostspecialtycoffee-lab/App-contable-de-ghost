import type { EntityId, ISODateString } from "@ghost/shared";

import type { CoTaxCategory } from "../fiscal/colombia-tax.js";
import type { KitchenStation } from "./menu-product.js";

export const TABLE_SESSION_STATUSES = [
  "open",
  "requested_bill",
  "closed",
  "cancelled",
] as const;

export type TableSessionStatus = (typeof TABLE_SESSION_STATUSES)[number];

export const TABLE_SESSION_LINE_STATUSES = ["pending", "sent", "cancelled"] as const;

export type TableSessionLineStatus = (typeof TABLE_SESSION_LINE_STATUSES)[number];

export const TABLE_SESSION_STATUS_LABELS: Record<TableSessionStatus, string> = {
  open: "Cuenta abierta",
  requested_bill: "Cuenta solicitada",
  closed: "Cuenta cerrada",
  cancelled: "Cuenta cancelada",
};

export const TABLE_SESSION_LINE_STATUS_LABELS: Record<TableSessionLineStatus, string> = {
  pending: "Pendiente de comanda",
  sent: "En comanda",
  cancelled: "Cancelado",
};

export type TableSessionLineSource = "staff" | "customer";

export interface TableSessionLine {
  id: EntityId;
  productId: EntityId;
  name: string;
  unitPrice: number;
  quantity: number;
  station: KitchenStation | string;
  saleTaxCategory?: CoTaxCategory;
  status: TableSessionLineStatus;
  source: TableSessionLineSource;
  notes?: string;
  addedAt: ISODateString;
}

export interface TableSession {
  id: EntityId;
  organizationId: EntityId;
  branchId: EntityId;
  tableId: EntityId;
  tableNumber: number;
  tableLabel?: string;
  guestToken: string;
  status: TableSessionStatus;
  lines: TableSessionLine[];
  saleId?: EntityId;
  openedAt: ISODateString;
  closedAt?: ISODateString;
  cancelReason?: string;
}

export interface TableSessionLineInput {
  productId: EntityId;
  name: string;
  unitPrice: number;
  quantity: number;
  station: KitchenStation | string;
  saleTaxCategory?: CoTaxCategory;
  source: TableSessionLineSource;
  notes?: string;
}
