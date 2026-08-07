import { describe, expect, it } from "vitest";

import type { DomainEventEnvelope } from "../events/types.js";
import { DEFAULT_ORGANIZATION_WORKFLOW_SETTINGS } from "../organization-workflow-settings.js";
import { evaluateWorkflowsForEvent, isWorkflowEnabled } from "./evaluate.js";

const baseEvent: DomainEventEnvelope = {
  id: "evt-1",
  organizationId: "org-1",
  type: "sale.recorded",
  aggregateType: "sale",
  aggregateId: "sale-1",
  payload: {
    saleId: "sale-1",
    saleNumber: "V-100",
    total: 250_000,
    subtotal: 210_000,
    taxAmount: 40_000,
    paymentMethod: "cash",
    lineCount: 2,
    soldOn: "2026-08-07",
  },
  actorUserId: "user-1",
  actorSource: "user",
  occurredAt: "2026-08-07T12:00:00.000Z",
  status: "pending",
};

describe("evaluateWorkflowsForEvent", () => {
  it("genera comprobante WhatsApp en cada venta", () => {
    const entries = evaluateWorkflowsForEvent(baseEvent, {
      organizationName: "Ghost Café",
      workflowSettings: DEFAULT_ORGANIZATION_WORKFLOW_SETTINGS,
    });

    expect(entries.some((entry) => entry.workflowId === "sale-receipt-whatsapp")).toBe(true);
    expect(entries.find((entry) => entry.workflowId === "sale-receipt-whatsapp")?.actionUrl).toContain(
      "wa.me",
    );
  });

  it("alerta venta alta solo si supera umbral y hay teléfono", () => {
    const entries = evaluateWorkflowsForEvent(baseEvent, {
      organizationName: "Ghost Café",
      workflowSettings: {
        ...DEFAULT_ORGANIZATION_WORKFLOW_SETTINGS,
        staffWhatsAppPhone: "573001234567",
        highValueSaleThresholdCop: 200_000,
      },
    });

    expect(entries.some((entry) => entry.workflowId === "sale-high-value-whatsapp")).toBe(true);
  });

  it("no alerta venta alta bajo el umbral", () => {
    const entries = evaluateWorkflowsForEvent(
      {
        ...baseEvent,
        payload: { ...baseEvent.payload, total: 50_000 },
      },
      {
        organizationName: "Ghost Café",
        workflowSettings: {
          ...DEFAULT_ORGANIZATION_WORKFLOW_SETTINGS,
          staffWhatsAppPhone: "573001234567",
        },
      },
    );

    expect(entries.some((entry) => entry.workflowId === "sale-high-value-whatsapp")).toBe(false);
  });

  it("respeta workflows deshabilitados", () => {
    expect(
      isWorkflowEnabled("sale-receipt-whatsapp", {
        enabledWorkflowIds: [],
        highValueSaleThresholdCop: 200_000,
      }),
    ).toBe(true);

    expect(
      isWorkflowEnabled("sale-receipt-whatsapp", {
        enabledWorkflowIds: ["sale-high-value-whatsapp"],
        highValueSaleThresholdCop: 200_000,
      }),
    ).toBe(false);
  });
});
