import type { AuditMetadata, EntityId } from "@ghost/shared";

export const DINING_TABLE_STATUSES = ["available", "occupied", "closed"] as const;

export type DiningTableStatus = (typeof DINING_TABLE_STATUSES)[number];

export const DINING_TABLE_STATUS_LABELS: Record<DiningTableStatus, string> = {
  available: "Disponible",
  occupied: "Ocupada",
  closed: "Inactiva",
};

export interface DiningTable extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  branchId: EntityId;
  number: number;
  label?: string;
  qrToken: string;
  status: DiningTableStatus;
  capacity?: number;
  sortOrder: number;
}

export interface CreateDiningTableInput {
  organizationId: EntityId;
  branchId: EntityId;
  number: number;
  label?: string;
  capacity?: number;
  sortOrder?: number;
  actorUserId: EntityId;
}
