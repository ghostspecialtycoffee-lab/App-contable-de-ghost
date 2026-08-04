import type { AuditMetadata, EntityId } from "@ghost/shared";

export type WarehouseStatus = "active" | "inactive";

export interface Warehouse extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  branchId: EntityId;
  name: string;
  code: string;
  status: WarehouseStatus;
  isDefault: boolean;
}

export interface CreateWarehouseInput {
  organizationId: EntityId;
  branchId: EntityId;
  name: string;
  code: string;
  isDefault?: boolean;
  actorUserId: EntityId;
}
