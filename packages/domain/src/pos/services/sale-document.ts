import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "../sale.js";

export type SaleDocumentType = "factura" | "cuenta_cobro";

export interface SaleDocumentLine {
  name: string;
  quantity: number;
  lineTotal: number;
}

export interface SaleDocumentInput {
  documentType: SaleDocumentType;
  saleNumber: string;
  soldAt: string;
  organizationName: string;
  tableNumber?: number;
  customerName?: string;
  lines: SaleDocumentLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
}

export function getSaleDocumentTitle(documentType: SaleDocumentType): string {
  return documentType === "cuenta_cobro" ? "Cuenta de cobro" : "Factura de venta";
}

function formatDocumentMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

export function buildSaleDocumentPlainText(input: SaleDocumentInput): string {
  const title = getSaleDocumentTitle(input.documentType);
  const paymentLabel = PAYMENT_METHOD_LABELS[input.paymentMethod] ?? input.paymentMethod;
  const lineRows = input.lines
    .map((line) => `${line.quantity} x ${line.name} — ${formatDocumentMoney(line.lineTotal)}`)
    .join("\n");

  const extraLines = [
    input.tableNumber ? `Mesa: ${input.tableNumber}` : "",
    input.customerName ? `Cliente: ${input.customerName}` : "",
  ].filter(Boolean);

  return [
    input.organizationName,
    title,
    `N.º ${input.saleNumber}`,
    input.soldAt,
    ...extraLines,
    "",
    lineRows,
    "",
    `Base gravable: ${formatDocumentMoney(input.subtotal)}`,
    `Impuestos: ${formatDocumentMoney(input.taxAmount)}`,
    `Total: ${formatDocumentMoney(input.total)}`,
    `Medio de pago: ${paymentLabel}`,
    "",
    "Generado por Ghost Contable",
  ]
    .filter((line, index, array) => line !== "" || (index > 0 && array[index - 1] !== ""))
    .join("\n")
    .trim();
}

export function buildSaleDocumentMailtoUrl(input: {
  to: string;
  document: SaleDocumentInput;
}): string {
  const title = getSaleDocumentTitle(input.document.documentType);
  const subject = `${title} ${input.document.saleNumber} — ${input.document.organizationName}`;
  const body = buildSaleDocumentPlainText(input.document);

  return `mailto:${input.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildSaleDocumentWhatsAppUrl(input: {
  document: SaleDocumentInput;
  phone?: string;
}): string {
  const text = buildSaleDocumentPlainText(input.document);
  const base = input.phone ? `https://wa.me/${input.phone.replace(/\D/g, "")}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
