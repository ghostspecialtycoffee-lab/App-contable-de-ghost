import type { PaymentMethod } from "../pos/sale.js";
import { PAYMENT_METHOD_LABELS } from "../pos/sale.js";
import type { PurchaseConfirmedPayload, SaleRecordedPayload } from "../events/types.js";

export function normalizeWhatsAppPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function buildWhatsAppActionUrl(input: { phone?: string; message: string }): string {
  const base = input.phone
    ? `https://wa.me/${normalizeWhatsAppPhone(input.phone)}`
    : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(input.message)}`;
}

function formatCop(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

export function buildSaleReceiptWhatsAppMessage(input: {
  organizationName: string;
  payload: SaleRecordedPayload;
  paymentMethod?: PaymentMethod | string;
  customerName?: string;
  tableNumber?: number;
}): string {
  const paymentLabel =
    input.paymentMethod && input.paymentMethod in PAYMENT_METHOD_LABELS
      ? PAYMENT_METHOD_LABELS[input.paymentMethod as PaymentMethod]
      : input.paymentMethod;

  const extra = [
    input.tableNumber ? `Mesa: ${input.tableNumber}` : "",
    input.customerName ? `Cliente: ${input.customerName}` : "",
  ].filter(Boolean);

  return [
    input.organizationName,
    `Comprobante ${input.payload.saleNumber}`,
    input.payload.soldOn,
    ...extra,
    "",
    `Total: ${formatCop(input.payload.total)}`,
    `Base: ${formatCop(input.payload.subtotal)} · Impuestos: ${formatCop(input.payload.taxAmount)}`,
    paymentLabel ? `Pago: ${paymentLabel}` : "",
    `${input.payload.lineCount} ítem(s)`,
    "",
    "— Ghost Contable",
  ]
    .filter((line, index, array) => line !== "" || (index > 0 && array[index - 1] !== ""))
    .join("\n")
    .trim();
}

export function buildHighValueSaleWhatsAppMessage(input: {
  organizationName: string;
  payload: SaleRecordedPayload;
  thresholdCop: number;
}): string {
  return [
    `⚠️ Venta alta — ${input.organizationName}`,
    `Comprobante ${input.payload.saleNumber}`,
    `Total: ${formatCop(input.payload.total)} (umbral ${formatCop(input.thresholdCop)})`,
    `${input.payload.lineCount} ítem(s) · ${input.payload.soldOn}`,
    "",
    "Revisa caja y comprobante en Ghost.",
  ].join("\n");
}

export function buildPurchaseConfirmedWhatsAppMessage(input: {
  organizationName: string;
  payload: PurchaseConfirmedPayload;
}): string {
  return [
    input.organizationName,
    `Compra confirmada ${input.payload.invoiceNumber}`,
    `Proveedor: ${input.payload.supplierName}`,
    `Total: ${formatCop(input.payload.total)}`,
    `${input.payload.lineCount} línea(s) · ${input.payload.invoiceDate}`,
    input.payload.inventoryApplied
      ? `Bodega actualizada (${input.payload.movements} mov.)`
      : "Sin movimiento de bodega",
    "",
    "— Ghost Contable",
  ].join("\n");
}
