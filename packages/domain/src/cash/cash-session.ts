import type { AuditMetadata, EntityId } from "@ghost/shared";

export const CASH_SESSION_STATUSES = ["open", "closed"] as const;
export type CashSessionStatus = (typeof CASH_SESSION_STATUSES)[number];

export interface CashSession extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  branchId: EntityId;
  status: CashSessionStatus;
  /** Fecha operativa YYYY-MM-DD */
  sessionDate: string;
  openingAmount: number;
  openedAt: string;
  openedBy: EntityId;
  closedAt?: string;
  closedBy?: EntityId;
  closingCountedAmount?: number;
  closingExpectedAmount?: number;
  closingDifference?: number;
  openingNotes?: string;
  closingNotes?: string;
}

export interface OpenCashSessionInput {
  organizationId: EntityId;
  branchId: EntityId;
  openingAmount: number;
  openingNotes?: string;
  actorUserId: EntityId;
  openedAt?: string;
}

export interface CloseCashSessionInput {
  sessionId: EntityId;
  countedAmount: number;
  expectedAmount: number;
  closingNotes?: string;
  actorUserId: EntityId;
  closedAt?: string;
}
