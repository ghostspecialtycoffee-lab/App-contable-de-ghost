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

export function buildSaleDocumentSubject(input: SaleDocumentInput): string {
  const title = getSaleDocumentTitle(input.documentType);
  return `${title} ${input.saleNumber} — ${input.organizationName}`;
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

export function buildSaleDocumentHtml(input: SaleDocumentInput): string {
  const title = getSaleDocumentTitle(input.documentType);
  const paymentLabel = PAYMENT_METHOD_LABELS[input.paymentMethod] ?? input.paymentMethod;
  const lineRows = input.lines
    .map(
      (line) =>
        `<tr><td>${line.quantity} × ${line.name}</td><td style="text-align:right">${formatDocumentMoney(line.lineTotal)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;color:#111;max-width:640px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;margin-bottom:4px">${input.organizationName}</h1>
  <h2 style="font-size:16px;font-weight:600;margin-top:0">${title}</h2>
  <p style="font-size:13px;color:#444">N.º ${input.saleNumber}<br>${input.soldAt}</p>
  ${input.tableNumber ? `<p style="font-size:13px">Mesa ${input.tableNumber}</p>` : ""}
  ${input.customerName ? `<p style="font-size:13px">Cliente: ${input.customerName}</p>` : ""}
  <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
    <tbody>${lineRows}</tbody>
  </table>
  <p style="font-size:14px">Base gravable: ${formatDocumentMoney(input.subtotal)}</p>
  <p style="font-size:14px">Impuestos: ${formatDocumentMoney(input.taxAmount)}</p>
  <p style="font-size:16px;font-weight:700">Total: ${formatDocumentMoney(input.total)}</p>
  <p style="font-size:13px;color:#444">Medio de pago: ${paymentLabel}</p>
  <p style="font-size:12px;color:#666;margin-top:24px">Generado por Ghost Contable</p>
</body>
</html>`;
}

export function buildSaleDocumentMailtoUrl(input: {
  to: string;
  document: SaleDocumentInput;
}): string {
  const subject = buildSaleDocumentSubject(input.document);
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
