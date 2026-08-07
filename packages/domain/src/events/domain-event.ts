import type { CreateAuditLogInput } from "../audit.js";
import type {
  DailyAnalyticsSnapshot,
  DomainEventEnvelope,
  DomainEventSideEffects,
  InventoryMovementRegisteredPayload,
  PublishDomainEventInput,
  PurchaseConfirmedPayload,
  SaleRecordedPayload,
} from "./types.js";

export function createDomainEvent(input: PublishDomainEventInput): DomainEventEnvelope {
  return {
    id: "",
    organizationId: input.organizationId,
    branchId: input.branchId,
    type: input.type,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    payload: input.payload,
    actorUserId: input.actorUserId,
    actorSource: input.actorSource ?? "user",
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    status: "pending",
  };
}

function emptyDailyAnalytics(date: string): DailyAnalyticsSnapshot {
  return {
    date,
    salesCount: 0,
    salesTotal: 0,
    purchasesCount: 0,
    purchasesTotal: 0,
    inventoryMovements: 0,
  };
}

export function applyDomainEventToDailyAnalytics(
  current: DailyAnalyticsSnapshot | null,
  event: DomainEventEnvelope,
): DailyAnalyticsSnapshot {
  const base = current ?? emptyDailyAnalytics(event.occurredAt.slice(0, 10));

  switch (event.type) {
    case "sale.recorded": {
      const payload = event.payload as unknown as SaleRecordedPayload;
      return {
        ...base,
        salesCount: base.salesCount + 1,
        salesTotal: base.salesTotal + (payload.total ?? 0),
      };
    }
    case "purchase.confirmed": {
      const payload = event.payload as unknown as PurchaseConfirmedPayload;
      return {
        ...base,
        purchasesCount: base.purchasesCount + 1,
        purchasesTotal: base.purchasesTotal + (payload.total ?? 0),
      };
    }
    case "inventory.movement.registered":
      return {
        ...base,
        inventoryMovements: base.inventoryMovements + 1,
      };
    default:
      return base;
  }
}

function buildAuditForEvent(event: DomainEventEnvelope): CreateAuditLogInput | undefined {
  const actorLabel = event.actorSource === "ghost-ai" ? "Ghost" : "Usuario";

  switch (event.type) {
    case "sale.recorded": {
      const payload = event.payload as unknown as SaleRecordedPayload;
      return {
        organizationId: event.organizationId,
        branchId: event.branchId,
        actorUserId: event.actorUserId,
        action: "create",
        entityType: "sale",
        entityId: event.aggregateId,
        summary: `${actorLabel} registró venta ${payload.saleNumber} por $${Math.round(payload.total).toLocaleString("es-CO")}`,
      };
    }
    case "purchase.confirmed": {
      const payload = event.payload as unknown as PurchaseConfirmedPayload;
      return {
        organizationId: event.organizationId,
        branchId: event.branchId,
        actorUserId: event.actorUserId,
        action: "approve",
        entityType: "purchaseInvoice",
        entityId: event.aggregateId,
        summary: `${actorLabel} confirmó compra ${payload.invoiceNumber} — ${payload.supplierName}`,
      };
    }
    case "inventory.movement.registered": {
      const payload = event.payload as unknown as InventoryMovementRegisteredPayload;
      return {
        organizationId: event.organizationId,
        branchId: event.branchId,
        actorUserId: event.actorUserId,
        action: "create",
        entityType: "inventoryMovement",
        entityId: event.aggregateId,
        summary: `${actorLabel} registró ${payload.movementType} de inventario (saldo ${payload.balanceAfter})`,
      };
    }
    default:
      return undefined;
  }
}

function buildAnalyticsDelta(event: DomainEventEnvelope): DomainEventSideEffects["analyticsDelta"] {
  const date = event.occurredAt.slice(0, 10);

  switch (event.type) {
    case "sale.recorded": {
      const payload = event.payload as unknown as SaleRecordedPayload;
      return {
        date,
        salesCount: 1,
        salesTotal: payload.total ?? 0,
      };
    }
    case "purchase.confirmed": {
      const payload = event.payload as unknown as PurchaseConfirmedPayload;
      return {
        date,
        purchasesCount: 1,
        purchasesTotal: payload.total ?? 0,
      };
    }
    case "inventory.movement.registered":
      return {
        date,
        inventoryMovements: 1,
      };
    default:
      return { date };
  }
}

export function resolveDomainEventSideEffects(event: DomainEventEnvelope): DomainEventSideEffects {
  return {
    audit: buildAuditForEvent(event),
    analyticsDelta: buildAnalyticsDelta(event),
  };
}

export function buildSaleRecordedEvent(input: {
  organizationId: string;
  branchId: string;
  actorUserId: string;
  actorSource?: PublishDomainEventInput["actorSource"];
  saleId: string;
  saleNumber: string;
  total: number;
  subtotal: number;
  taxAmount: number;
  paymentMethod: string;
  lineCount: number;
  soldOn: string;
  occurredAt?: string;
}): PublishDomainEventInput {
  return {
    organizationId: input.organizationId,
    branchId: input.branchId,
    type: "sale.recorded",
    aggregateType: "sale",
    aggregateId: input.saleId,
    actorUserId: input.actorUserId,
    actorSource: input.actorSource,
    occurredAt: input.occurredAt,
    payload: {
      saleId: input.saleId,
      saleNumber: input.saleNumber,
      total: input.total,
      subtotal: input.subtotal,
      taxAmount: input.taxAmount,
      paymentMethod: input.paymentMethod,
      lineCount: input.lineCount,
      soldOn: input.soldOn,
    } satisfies SaleRecordedPayload,
  };
}

export function buildPurchaseConfirmedEvent(input: {
  organizationId: string;
  branchId: string;
  actorUserId: string;
  actorSource?: PublishDomainEventInput["actorSource"];
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  total: number;
  subtotal: number;
  lineCount: number;
  inventoryApplied: boolean;
  movements: number;
  invoiceDate: string;
  occurredAt?: string;
}): PublishDomainEventInput {
  return {
    organizationId: input.organizationId,
    branchId: input.branchId,
    type: "purchase.confirmed",
    aggregateType: "purchaseInvoice",
    aggregateId: input.invoiceId,
    actorUserId: input.actorUserId,
    actorSource: input.actorSource,
    occurredAt: input.occurredAt,
    payload: {
      invoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
      supplierName: input.supplierName,
      total: input.total,
      subtotal: input.subtotal,
      lineCount: input.lineCount,
      inventoryApplied: input.inventoryApplied,
      movements: input.movements,
      invoiceDate: input.invoiceDate,
    } satisfies PurchaseConfirmedPayload,
  };
}

export function buildInventoryMovementRegisteredEvent(input: {
  organizationId: string;
  branchId: string;
  actorUserId: string;
  actorSource?: PublishDomainEventInput["actorSource"];
  movementId: string;
  itemId: string;
  warehouseId: string;
  movementType: string;
  quantity: number;
  balanceAfter: number;
  reference?: string;
  occurredAt?: string;
}): PublishDomainEventInput {
  return {
    organizationId: input.organizationId,
    branchId: input.branchId,
    type: "inventory.movement.registered",
    aggregateType: "inventoryMovement",
    aggregateId: input.movementId,
    actorUserId: input.actorUserId,
    actorSource: input.actorSource,
    occurredAt: input.occurredAt,
    payload: {
      movementId: input.movementId,
      itemId: input.itemId,
      warehouseId: input.warehouseId,
      movementType: input.movementType,
      quantity: input.quantity,
      balanceAfter: input.balanceAfter,
      reference: input.reference,
    } satisfies InventoryMovementRegisteredPayload,
  };
}
