import type { AuditMetadata, EntityId } from "@ghost/shared";

import type { UserMembership } from "./roles.js";

export type UserStatus = "active" | "invited" | "blocked";

export interface UserProfile extends AuditMetadata {
  id: EntityId;
  email: string;
  displayName: string;
  photoUrl?: string;
  phone?: string;
  status: UserStatus;
  memberships: UserMembership[];
  lastLoginAt?: string;
}

export interface InviteUserInput {
  email: string;
  displayName: string;
  organizationId: EntityId;
  branchIds: EntityId[];
  roles: UserMembership["roles"];
  invitedBy: EntityId;
}
