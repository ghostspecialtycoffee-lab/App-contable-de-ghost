import { PAYMENT_METHOD_LABELS } from "@ghost/domain";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { deliverEmail } from "../notifications/deliverEmail.js";
import { getDb } from "../shared/db.js";
import {
  assertOrgPermission,
  getActiveOrganizationId,
} from "../shared/permissions.js";

interface SendSaleDocumentRequest {
  saleId: string;
  email: string;
  documentType: "factura" | "cuenta_cobro";
}

interface SendSaleDocumentResponse {
  sent: boolean;
  message?: string;
}

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function buildSaleDocumentHtml(input: {
  documentTitle: string;
  saleNumber: string;
  soldAt: string;
  tableNumber?: number;
  customerName?: string;
  lines: Array<{ name: string; quantity: number; lineTotal: number }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  organizationName: string;
}): string {
  const lineRows = input.lines
    .map(
      (line) =>
        `<tr><td>${line.quantity} × ${line.name}</td><td style="text-align:right">${formatMoney(line.lineTotal)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;color:#111;max-width:640px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;margin-bottom:4px">${input.organizationName}</h1>
  <h2 style="font-size:16px;font-weight:600;margin-top:0">${input.documentTitle}</h2>
  <p style="font-size:13px;color:#444">N.º ${input.saleNumber}<br>${input.soldAt}</p>
  ${input.tableNumber ? `<p style="font-size:13px">Mesa ${input.tableNumber}</p>` : ""}
  ${input.customerName ? `<p style="font-size:13px">Cliente: ${input.customerName}</p>` : ""}
  <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
    <tbody>${lineRows}</tbody>
  </table>
  <p style="font-size:14px">Base gravable: ${formatMoney(input.subtotal)}</p>
  <p style="font-size:14px">Impuestos: ${formatMoney(input.taxAmount)}</p>
  <p style="font-size:16px;font-weight:700">Total: ${formatMoney(input.total)}</p>
  <p style="font-size:13px;color:#444">Medio de pago: ${input.paymentMethod}</p>
  <p style="font-size:12px;color:#666;margin-top:24px">Generado por Ghost Contable</p>
</body>
</html>`;
}

export const sendSaleDocument = onCall<
  SendSaleDocumentRequest,
  Promise<SendSaleDocumentResponse>
>(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const userId = request.auth.uid;
  const organizationId = await getActiveOrganizationId(userId);
  await assertOrgPermission(organizationId, userId, {
    module: "pos",
    action: "read",
  });

  const saleId = request.data.saleId?.trim();
  const email = request.data.email?.trim().toLowerCase();
  const documentType = request.data.documentType === "cuenta_cobro" ? "cuenta_cobro" : "factura";

  if (!saleId) {
    throw new HttpsError("invalid-argument", "Falta el ID de la venta.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Correo no válido.");
  }

  const db = getDb();
  const saleSnap = await db
    .collection("organizations")
    .doc(organizationId)
    .collection("sales")
    .doc(saleId)
    .get();

  if (!saleSnap.exists) {
    throw new HttpsError("not-found", "Venta no encontrada.");
  }

  const sale = saleSnap.data()!;
  const orgSnap = await db.collection("organizations").doc(organizationId).get();
  const organizationName = String(orgSnap.data()?.name ?? "Ghost Contable");
  const documentTitle =
    documentType === "cuenta_cobro" ? "Cuenta de cobro" : "Factura de venta";
  const lines = ((sale.lines ?? []) as Array<Record<string, unknown>>).map((line) => ({
    name: String(line.name ?? ""),
    quantity: Number(line.quantity ?? 0),
    lineTotal: Number(line.lineTotal ?? 0),
  }));

  const paymentMethod =
    PAYMENT_METHOD_LABELS[sale.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ??
    String(sale.paymentMethod ?? "Otro");

  const html = buildSaleDocumentHtml({
    documentTitle,
    saleNumber: String(sale.saleNumber ?? saleId),
    soldAt: String(sale.soldAt ?? sale.createdAt ?? new Date().toISOString()),
    tableNumber: typeof sale.tableNumber === "number" ? sale.tableNumber : undefined,
    customerName: String(sale.customerName ?? ""),
    lines,
    subtotal: Number(sale.subtotal ?? 0),
    taxAmount: Number(sale.taxAmount ?? 0),
    total: Number(sale.total ?? 0),
    paymentMethod,
    organizationName,
  });

  const text =
    `${documentTitle} ${String(sale.saleNumber ?? saleId)}\n` +
    `Total: ${formatMoney(Number(sale.total ?? 0))}\n` +
    `Medio de pago: ${paymentMethod}`;

  const delivery = await deliverEmail({
    to: email,
    subject: `${documentTitle} ${String(sale.saleNumber ?? saleId)} — ${organizationName}`,
    text,
    html,
  });

  if (!delivery.ok) {
    return {
      sent: false,
      message: delivery.errorMessage ?? "No se pudo enviar el correo.",
    };
  }

  return {
    sent: true,
    message:
      delivery.provider === "log_only"
        ? "Correo registrado en bitácora (RESEND_API_KEY no configurada)."
        : undefined,
  };
});
