import type { EntityId, ISODateString } from "@ghost/shared";

import type { CreateAuditLogInput } from "../audit.js";

export type DomainEventType =
  | "sale.recorded"
  | "purchase.confirmed"
  | "inventory.movement.registered";

export type DomainEventStatus = "pending" | "processed" | "failed";

export type DomainEventActorSource = "user" | "ghost-ai" | "system";

export interface DomainEventEnvelope<TPayload = Record<string, unknown>> {
  id: EntityId;
  organizationId: EntityId;
  branchId?: EntityId;
  type: DomainEventType;
  aggregateType: string;
  aggregateId: EntityId;
  payload: TPayload;
  actorUserId: EntityId;
  actorSource: DomainEventActorSource;
  occurredAt: ISODateString;
  status: DomainEventStatus;
  processedAt?: ISODateString;
  errorMessage?: string;
}

export interface SaleRecordedPayload {
  saleId: string;
  saleNumber: string;
  total: number;
  subtotal: number;
  taxAmount: number;
  paymentMethod: string;
  lineCount: number;
  soldOn: string;
}

export interface PurchaseConfirmedPayload {
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  total: number;
  subtotal: number;
  lineCount: number;
  inventoryApplied: boolean;
  movements: number;
  invoiceDate: string;
}

export interface InventoryMovementRegisteredPayload {
  movementId: string;
  itemId: string;
  warehouseId: string;
  movementType: string;
  quantity: number;
  balanceAfter: number;
  reference?: string;
}

export interface PublishDomainEventInput {
  organizationId: EntityId;
  branchId?: EntityId;
  type: DomainEventType;
  aggregateType: string;
  aggregateId: EntityId;
  payload: Record<string, unknown>;
  actorUserId: EntityId;
  actorSource?: DomainEventActorSource;
  occurredAt?: ISODateString;
}

export interface DailyAnalyticsSnapshot {
  date: string;
  salesCount: number;
  salesTotal: number;
  purchasesCount: number;
  purchasesTotal: number;
  inventoryMovements: number;
}

export interface DomainEventSideEffects {
  audit?: CreateAuditLogInput;
  analyticsDelta?: Partial<DailyAnalyticsSnapshot> & { date: string };
}

export const DOMAIN_EVENT_LABELS: Record<DomainEventType, string> = {
  "sale.recorded": "Venta registrada",
  "purchase.confirmed": "Compra confirmada",
  "inventory.movement.registered": "Movimiento de inventario",
};
