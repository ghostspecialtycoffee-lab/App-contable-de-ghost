import { describe, expect, it } from "vitest";

import {
  applyDomainEventToDailyAnalytics,
  buildSaleRecordedEvent,
  createDomainEvent,
  resolveDomainEventSideEffects,
} from "./domain-event.js";

describe("domain events", () => {
  it("crea evento de venta", () => {
    const input = buildSaleRecordedEvent({
      organizationId: "org-1",
      branchId: "branch-1",
      actorUserId: "user-1",
      saleId: "sale-1",
      saleNumber: "V-001",
      total: 15_000,
      subtotal: 12_605,
      taxAmount: 2_395,
      paymentMethod: "cash",
      lineCount: 2,
      soldOn: "2026-08-07",
    });

    const event = createDomainEvent(input);
    expect(event.type).toBe("sale.recorded");
    expect(event.status).toBe("pending");
    expect(event.payload.saleNumber).toBe("V-001");
  });

  it("acumula analítica diaria de ventas", () => {
    const event = createDomainEvent(
      buildSaleRecordedEvent({
        organizationId: "org-1",
        branchId: "branch-1",
        actorUserId: "user-1",
        saleId: "sale-1",
        saleNumber: "V-001",
        total: 10_000,
        subtotal: 8_403,
        taxAmount: 1_597,
        paymentMethod: "cash",
        lineCount: 1,
        soldOn: "2026-08-07",
        occurredAt: "2026-08-07T15:00:00.000Z",
      }),
    );

    const next = applyDomainEventToDailyAnalytics(
      {
        date: "2026-08-07",
        salesCount: 2,
        salesTotal: 20_000,
        purchasesCount: 0,
        purchasesTotal: 0,
        inventoryMovements: 1,
      },
      event,
    );

    expect(next.salesCount).toBe(3);
    expect(next.salesTotal).toBe(30_000);
  });

  it("genera auditoría para compra confirmada", () => {
    const effects = resolveDomainEventSideEffects(
      createDomainEvent({
        organizationId: "org-1",
        branchId: "branch-1",
        type: "purchase.confirmed",
        aggregateType: "purchaseInvoice",
        aggregateId: "inv-1",
        actorUserId: "user-1",
        payload: {
          invoiceId: "inv-1",
          invoiceNumber: "F-100",
          supplierName: "Distritcafé",
          total: 145_000,
          subtotal: 121_849,
          lineCount: 1,
          inventoryApplied: true,
          movements: 1,
          invoiceDate: "2026-08-07",
        },
      }),
    );

    expect(effects.audit?.entityType).toBe("purchaseInvoice");
    expect(effects.audit?.summary).toContain("Distritcafé");
    expect(effects.analyticsDelta?.purchasesCount).toBe(1);
    expect(effects.analyticsDelta?.purchasesTotal).toBe(145_000);
  });
});
