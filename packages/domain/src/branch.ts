import type { AuditMetadata, EntityId } from "@ghost/shared";

export type BranchStatus = "active" | "inactive";

export interface BranchAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
}

export interface Branch extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  code: string;
  status: BranchStatus;
  address: BranchAddress;
  phone?: string;
  isDefault: boolean;
}

export interface CreateBranchInput {
  organizationId: EntityId;
  name: string;
  code: string;
  address: BranchAddress;
  phone?: string;
  isDefault?: boolean;
  actorUserId: EntityId;
}
