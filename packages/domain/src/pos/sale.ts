import type { AuditMetadata, EntityId } from "@ghost/shared";

import type { CoTaxCategory } from "../fiscal/colombia-tax.js";

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
  saleTaxCategory?: CoTaxCategory;
  lineNet?: number;
  lineTax?: number;
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
  taxBreakdown?: Array<{
    category: CoTaxCategory;
    label: string;
    amount: number;
  }>;
  paymentMethod: PaymentMethod;
  cashierUserId: EntityId;
  customerName?: string;
  notes?: string;
  soldAt?: string;
  soldOn?: string;
  /** Lotes de inventario consumidos al registrar la venta (trazabilidad compra → venta). */
  lotConsumptions?: Array<{
    inventoryItemId: EntityId;
    itemName: string;
    lotCode: string;
    lotId?: EntityId;
    quantity: number;
    unitCost: number;
    sourceReference?: string;
  }>;
  /** Recetas congeladas al momento de la venta (trazabilidad de costo). */
  recipeSnapshots?: Array<{
    productId: EntityId;
    recipeId: EntityId;
    recipeVersion: number;
    recipeCost: number;
    yieldQuantity: number;
    lines: Array<{
      inventoryItemId: EntityId;
      itemName: string;
      quantity: number;
      unit: string;
    }>;
  }>;
  tableId?: EntityId;
  tableNumber?: number;
  tableLabel?: string;
  tableSessionId?: EntityId;
}

export interface CreateSaleLineInput {
  productId: EntityId;
  name: string;
  unitPrice: number;
  quantity: number;
  station: string;
  saleTaxCategory?: CoTaxCategory;
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
