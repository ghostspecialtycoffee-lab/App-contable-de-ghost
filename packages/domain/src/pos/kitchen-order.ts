import type { AuditMetadata, EntityId } from "@ghost/shared";

import type { KitchenStation } from "./menu-product.js";

export const KITCHEN_ORDER_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type KitchenOrderStatus = (typeof KITCHEN_ORDER_STATUSES)[number];

export const KITCHEN_ORDER_STATUS_LABELS: Record<KitchenOrderStatus, string> = {
  pending: "Pendiente",
  preparing: "Preparando",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export interface KitchenOrderLine {
  productId: EntityId;
  name: string;
  quantity: number;
  notes?: string;
}

export interface KitchenOrder extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  branchId: EntityId;
  saleId: EntityId;
  saleNumber: string;
  station: KitchenStation;
  status: KitchenOrderStatus;
  lines: KitchenOrderLine[];
  ticketNumber: number;
}
