import type { WorkflowDefinition } from "./types.js";

export const BUILT_IN_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: "sale-receipt-whatsapp",
    name: "Comprobante WhatsApp tras venta",
    description:
      "Prepara un enlace de WhatsApp con el resumen del comprobante después de cada venta.",
    trigger: "sale.recorded",
    channel: "whatsapp",
    enabledByDefault: true,
  },
  {
    id: "sale-high-value-whatsapp",
    name: "Alerta venta alta por WhatsApp",
    description:
      "Envía alerta al teléfono operativo cuando una venta supera el umbral configurado.",
    trigger: "sale.recorded",
    channel: "whatsapp",
    enabledByDefault: true,
  },
  {
    id: "purchase-confirmed-whatsapp",
    name: "Resumen de compra por WhatsApp",
    description: "Prepara mensaje WhatsApp al confirmar una factura de compra.",
    trigger: "purchase.confirmed",
    channel: "whatsapp",
    enabledByDefault: false,
  },
];

export const BUILT_IN_WORKFLOW_IDS = BUILT_IN_WORKFLOWS.map((workflow) => workflow.id);
