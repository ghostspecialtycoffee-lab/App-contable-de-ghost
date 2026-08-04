import type { EntityId, ISODateString } from "@ghost/shared";

import type { SystemRole } from "./roles.js";

export interface OrganizationMember {
  id: EntityId;
  organizationId: EntityId;
  userId: EntityId;
  roles: SystemRole[];
  branchIds: EntityId[];
  isActive: boolean;
  joinedAt: ISODateString;
}

export interface CreateOrganizationMemberInput {
  organizationId: EntityId;
  userId: EntityId;
  roles: SystemRole[];
  branchIds: EntityId[];
}
