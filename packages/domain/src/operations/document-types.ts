/** Tipos documentales operativos — no mezclar compras con ventas. */

export const PURCHASE_DOCUMENT_DEDUP_KEYS = [
  "supplierName",
  "invoiceNumber",
  "invoiceDate",
] as const;

export const SALE_DOCUMENT_DEDUP_KEYS = ["saleNumber", "soldAt"] as const;

export interface OperationalDocumentType {
  id: "purchase_invoice" | "sale_receipt";
  label: string;
  shortLabel: string;
  route: string;
  dedupKeys: readonly string[];
  summary: string;
  examples: string[];
}

export const OPERATIONAL_DOCUMENT_TYPES: Record<
  OperationalDocumentType["id"],
  OperationalDocumentType
> = {
  purchase_invoice: {
    id: "purchase_invoice",
    label: "Factura de compra",
    shortLabel: "Compra",
    route: "/purchases",
    dedupKeys: PURCHASE_DOCUMENT_DEDUP_KEYS,
    summary: "Ghost compra a un proveedor. Registra gasto e inventario.",
    examples: ["Cuenta de cobro Black Coffee", "Factura Rapimerque", "Remisión empaque"],
  },
  sale_receipt: {
    id: "sale_receipt",
    label: "Comprobante de venta",
    shortLabel: "Venta",
    route: "/billing",
    dedupKeys: SALE_DOCUMENT_DEDUP_KEYS,
    summary: "Ghost cobra al cliente. Genera el comprobante en Registros.",
    examples: ["V-… mostrador", "M-… mesa"],
  },
};

export function buildPurchaseDocumentKey(input: {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
}): string {
  return [input.supplierName.trim(), input.invoiceNumber.trim(), input.invoiceDate]
    .join("|")
    .toLowerCase();
}

export function buildSaleDocumentKey(input: {
  saleNumber: string;
  soldAt: string;
}): string {
  return [input.saleNumber.trim(), input.soldAt.slice(0, 10)].join("|").toLowerCase();
}
