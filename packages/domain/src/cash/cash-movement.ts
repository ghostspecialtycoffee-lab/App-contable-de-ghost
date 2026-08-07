import type { AuditMetadata, EntityId } from "@ghost/shared";

export const CASH_MOVEMENT_TYPES = [
  "inflow",
  "outflow",
  "loan",
  "loan_repayment",
] as const;

export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[number];

export const CASH_MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  inflow: "Entrada",
  outflow: "Salida",
  loan: "Préstamo",
  loan_repayment: "Devolución préstamo",
};

export interface CashMovement extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  branchId: EntityId;
  cashSessionId: EntityId;
  type: CashMovementType;
  amount: number;
  reason: string;
  reference?: string;
  occurredAt: string;
  actorUserId: EntityId;
}

export interface RegisterCashMovementInput {
  organizationId: EntityId;
  branchId: EntityId;
  cashSessionId: EntityId;
  type: CashMovementType;
  amount: number;
  reason: string;
  reference?: string;
  actorUserId: EntityId;
  occurredAt?: string;
}
