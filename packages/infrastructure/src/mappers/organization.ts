import type { Branch, Organization } from "@ghost/domain";

import type { EntityId } from "@ghost/shared";

export interface FirestoreOrganization extends Omit<
  Organization,
  "id" | "createdAt" | "updatedAt"
> {
  createdAt: unknown;
  updatedAt: unknown;
}

export interface FirestoreBranch extends Omit<
  Branch,
  "id" | "createdAt" | "updatedAt"
> {
  createdAt: unknown;
  updatedAt: unknown;
}

export function mapOrganization(
  id: EntityId,
  data: FirestoreOrganization,
): Organization {
  return {
    id,
    name: data.name,
    slug: data.slug,
    status: data.status,
    settings: data.settings,
    fiscalProfile: data.fiscalProfile,
    costMatrixSettings: data.costMatrixSettings,
    costingSettings: data.costingSettings,
    workflowSettings: data.workflowSettings,
    emailDelivery: data.emailDelivery,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
  };
}

export function mapBranch(id: EntityId, data: FirestoreBranch): Branch {
  return {
    id,
    organizationId: data.organizationId,
    name: data.name,
    code: data.code,
    status: data.status,
    address: data.address,
    phone: data.phone,
    isDefault: data.isDefault,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
  };
}

function serializeTimestamp(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return (value.toDate() as Date).toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return new Date().toISOString();
}
