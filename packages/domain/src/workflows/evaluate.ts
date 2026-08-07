import type { DomainEventEnvelope } from "../events/types.js";
import type {
  PurchaseConfirmedPayload,
  SaleRecordedPayload,
} from "../events/types.js";

import { BUILT_IN_WORKFLOWS } from "./built-in-workflows.js";
import {
  buildHighValueSaleWhatsAppMessage,
  buildPurchaseConfirmedWhatsAppMessage,
  buildSaleReceiptWhatsAppMessage,
  buildWhatsAppActionUrl,
} from "./whatsapp.js";
import type {
  OrganizationWorkflowSettings,
  WorkflowEvaluationContext,
  WorkflowOutboxEntryInput,
} from "./types.js";

export function isWorkflowEnabled(
  workflowId: string,
  settings: OrganizationWorkflowSettings,
): boolean {
  if (settings.enabledWorkflowIds.length === 0) {
    const definition = BUILT_IN_WORKFLOWS.find((workflow) => workflow.id === workflowId);
    return definition?.enabledByDefault ?? false;
  }
  return settings.enabledWorkflowIds.includes(workflowId);
}

export function evaluateWorkflowsForEvent(
  event: DomainEventEnvelope,
  context: WorkflowEvaluationContext,
): WorkflowOutboxEntryInput[] {
  const entries: WorkflowOutboxEntryInput[] = [];
  const { organizationName, workflowSettings } = context;

  for (const workflow of BUILT_IN_WORKFLOWS) {
    if (workflow.trigger !== event.type) {
      continue;
    }
    if (!isWorkflowEnabled(workflow.id, workflowSettings)) {
      continue;
    }

    if (workflow.id === "sale-receipt-whatsapp" && event.type === "sale.recorded") {
      const payload = event.payload as unknown as SaleRecordedPayload;
      const message = buildSaleReceiptWhatsAppMessage({
        organizationName,
        payload,
      });
      entries.push({
        workflowId: workflow.id,
        channel: "whatsapp",
        title: `WhatsApp comprobante ${payload.saleNumber}`,
        message,
        actionUrl: buildWhatsAppActionUrl({ message }),
        metadata: {
          saleNumber: payload.saleNumber,
          total: payload.total,
        },
      });
      continue;
    }

    if (workflow.id === "sale-high-value-whatsapp" && event.type === "sale.recorded") {
      const payload = event.payload as unknown as SaleRecordedPayload;
      const threshold = workflowSettings.highValueSaleThresholdCop;
      if (payload.total < threshold) {
        continue;
      }
      const staffPhone = workflowSettings.staffWhatsAppPhone?.trim();
      if (!staffPhone) {
        continue;
      }
      const message = buildHighValueSaleWhatsAppMessage({
        organizationName,
        payload,
        thresholdCop: threshold,
      });
      entries.push({
        workflowId: workflow.id,
        channel: "whatsapp",
        title: `Alerta venta alta ${payload.saleNumber}`,
        message,
        recipientPhone: staffPhone,
        actionUrl: buildWhatsAppActionUrl({ phone: staffPhone, message }),
        metadata: {
          saleNumber: payload.saleNumber,
          total: payload.total,
          threshold,
        },
      });
      continue;
    }

    if (workflow.id === "purchase-confirmed-whatsapp" && event.type === "purchase.confirmed") {
      const payload = event.payload as unknown as PurchaseConfirmedPayload;
      const message = buildPurchaseConfirmedWhatsAppMessage({
        organizationName,
        payload,
      });
      entries.push({
        workflowId: workflow.id,
        channel: "whatsapp",
        title: `WhatsApp compra ${payload.invoiceNumber}`,
        message,
        actionUrl: buildWhatsAppActionUrl({ message }),
        metadata: {
          invoiceNumber: payload.invoiceNumber,
          supplierName: payload.supplierName,
          total: payload.total,
        },
      });
    }
  }

  return entries;
}
