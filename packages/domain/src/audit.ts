import type { EntityId, ISODateString } from "@ghost/shared";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "approve"
  | "reject"
  | "export";

export interface AuditLogEntry {
  id: EntityId;
  organizationId: EntityId;
  branchId?: EntityId;
  actorUserId: EntityId;
  action: AuditAction;
  entityType: string;
  entityId: EntityId;
  summary: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  ipAddress?: string;
  userAgent?: string;
  occurredAt: ISODateString;
}

export interface CreateAuditLogInput {
  organizationId: EntityId;
  branchId?: EntityId;
  actorUserId: EntityId;
  action: AuditAction;
  entityType: string;
  entityId: EntityId;
  summary: string;
  changes?: AuditLogEntry["changes"];
  ipAddress?: string;
  userAgent?: string;
}
