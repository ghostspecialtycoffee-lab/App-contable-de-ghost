import {
  buildSaleDocumentMailtoUrl,
  PAYMENT_METHOD_LABELS,
  type Sale,
  type SaleDocumentInput,
  type SaleDocumentType,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { doc, getDoc } from "firebase/firestore";

import { formatDateTime } from "@/lib/format";
import { getFirestoreDb } from "@/lib/firebase/client";
import { callSendSaleDocument } from "@/lib/firebase/functions";

export interface SendSaleDocumentResult {
  sent: boolean;
  method: "cloud" | "mailto";
  message?: string;
}

function isCallableUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return true;
  }

  const code = String(error.code).replace("functions/", "");
  return (
    code === "internal" ||
    code === "not-found" ||
    code === "unavailable" ||
    code === "deadline-exceeded" ||
    code === "permission-denied"
  );
}

function mapSaleDocument(sale: Sale, organizationName: string, documentType: SaleDocumentType): SaleDocumentInput {
  return {
    documentType,
    saleNumber: sale.saleNumber,
    soldAt: formatDateTime(sale.soldAt ?? sale.createdAt),
    organizationName,
    tableNumber: sale.tableNumber,
    customerName: sale.customerName || undefined,
    lines: sale.lines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      lineTotal: line.lineTotal,
    })),
    subtotal: sale.subtotal,
    taxAmount: sale.taxAmount,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
  };
}

function mapSaleFromFirestore(documentId: string, data: Record<string, unknown>): Sale {
  const soldAt =
    (typeof data.soldAt === "string" && data.soldAt) || String(data.createdAt ?? new Date().toISOString());

  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    branchId: String(data.branchId ?? ""),
    saleNumber: String(data.saleNumber ?? documentId),
    status: (data.status as Sale["status"]) ?? "paid",
    lines: (data.lines as Sale["lines"]) ?? [],
    subtotal: Number(data.subtotal ?? 0),
    taxRate: Number(data.taxRate ?? 0),
    taxAmount: Number(data.taxAmount ?? 0),
    total: Number(data.total ?? 0),
    taxBreakdown: (data.taxBreakdown as Sale["taxBreakdown"]) ?? undefined,
    paymentMethod: (data.paymentMethod as Sale["paymentMethod"]) ?? "cash",
    cashierUserId: String(data.cashierUserId ?? ""),
    customerName: String(data.customerName ?? ""),
    notes: String(data.notes ?? ""),
    soldAt,
    soldOn: (typeof data.soldOn === "string" && data.soldOn) || soldAt.slice(0, 10),
    tableId: typeof data.tableId === "string" ? data.tableId : undefined,
    tableNumber: typeof data.tableNumber === "number" ? data.tableNumber : undefined,
    tableLabel: typeof data.tableLabel === "string" ? data.tableLabel : undefined,
    tableSessionId: typeof data.tableSessionId === "string" ? data.tableSessionId : undefined,
    createdAt: soldAt,
    updatedAt: String(data.updatedAt ?? soldAt),
    createdBy: String(data.createdBy ?? ""),
    updatedBy: String(data.updatedBy ?? ""),
  };
}

async function loadSaleDocumentContext(
  organizationId: string,
  saleId: string,
  documentType: SaleDocumentType,
): Promise<{ document: SaleDocumentInput } | null> {
  const db = getFirestoreDb();
  const saleSnap = await getDoc(doc(db, firestorePaths.organizationSale(organizationId, saleId)));
  if (!saleSnap.exists()) {
    return null;
  }

  const orgSnap = await getDoc(doc(db, firestorePaths.organization(organizationId)));
  const organizationName = String(orgSnap.data()?.name ?? "Ghost Contable");
  const sale = mapSaleFromFirestore(saleSnap.id, saleSnap.data() as Record<string, unknown>);

  return {
    document: mapSaleDocument(sale, organizationName, documentType),
  };
}

export function openMailtoUrl(url: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function sendSaleDocumentViaMailto(input: {
  organizationId: string;
  saleId: string;
  email: string;
  documentType: SaleDocumentType;
}): Promise<SendSaleDocumentResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { sent: false, method: "mailto", message: "Correo no válido." };
  }

  const context = await loadSaleDocumentContext(
    input.organizationId,
    input.saleId,
    input.documentType,
  );
  if (!context) {
    return { sent: false, method: "mailto", message: "Venta no encontrada." };
  }

  const mailtoUrl = buildSaleDocumentMailtoUrl({
    to: email,
    document: context.document,
  });

  openMailtoUrl(mailtoUrl);

  return {
    sent: true,
    method: "mailto",
    message:
      "Abrí tu app de correo con el comprobante listo. Revisa el mensaje y pulsa enviar.",
  };
}

export async function sendSaleDocument(input: {
  organizationId: string;
  saleId: string;
  email: string;
  documentType: SaleDocumentType;
}): Promise<SendSaleDocumentResult> {
  try {
    const cloudResult = await callSendSaleDocument({
      saleId: input.saleId,
      email: input.email,
      documentType: input.documentType,
    });

    if (cloudResult.sent) {
      return { sent: true, method: "cloud", message: cloudResult.message };
    }
  } catch (error) {
    if (!isCallableUnavailable(error)) {
      throw error;
    }
  }

  return sendSaleDocumentViaMailto(input);
}

export function buildMailtoUrlForSale(input: {
  sale: Sale;
  organizationName: string;
  email: string;
  documentType: SaleDocumentType;
}): string {
  return buildSaleDocumentMailtoUrl({
    to: input.email,
    document: mapSaleDocument(input.sale, input.organizationName, input.documentType),
  });
}

export function getPaymentMethodLabel(method: Sale["paymentMethod"]): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}
