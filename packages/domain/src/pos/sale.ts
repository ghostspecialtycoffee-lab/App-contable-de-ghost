import type { AuditMetadata, EntityId } from "@ghost/shared";

export const PAYMENT_METHODS = ["cash", "card", "transfer", "other"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

export const SALE_STATUSES = ["paid", "cancelled"] as const;

export type SaleStatus = (typeof SALE_STATUSES)[number];

export interface SaleLineItem {
  productId: EntityId;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  station: string;
}

export interface Sale extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  branchId: EntityId;
  saleNumber: string;
  status: SaleStatus;
  lines: SaleLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashierUserId: EntityId;
  customerName?: string;
  notes?: string;
  soldAt?: string;
  soldOn?: string;
}

export interface CreateSaleLineInput {
  productId: EntityId;
  name: string;
  unitPrice: number;
  quantity: number;
  station: string;
}

export interface CreateSaleInput {
  organizationId: EntityId;
  branchId: EntityId;
  taxRate: number;
  paymentMethod: PaymentMethod;
  lines: CreateSaleLineInput[];
  cashierUserId: EntityId;
  customerName?: string;
  notes?: string;
}
