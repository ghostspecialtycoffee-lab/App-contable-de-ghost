import type { UserProfile } from "@ghost/domain";

import type { EntityId } from "@ghost/shared";

export interface FirestoreUserProfile {
  email: string;
  displayName: string;
  photoUrl?: string;
  phone?: string;
  status: UserProfile["status"];
  memberships: UserProfile["memberships"];
  lastLoginAt?: string;
  createdAt: unknown;
  updatedAt: unknown;
  createdBy: EntityId;
  updatedBy: EntityId;
}

export function mapUserProfile(
  id: EntityId,
  data: FirestoreUserProfile,
): UserProfile {
  return {
    id,
    email: data.email,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    phone: data.phone,
    status: data.status,
    memberships: data.memberships ?? [],
    lastLoginAt: data.lastLoginAt,
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
