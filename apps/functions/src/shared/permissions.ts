import { HttpsError } from "firebase-functions/v2/https";

import type { Permission, SystemRole } from "@ghost/domain";
import { DEFAULT_ROLE_DEFINITIONS, hasPermission } from "@ghost/domain";

import { getDb } from "./db.js";

export async function assertOrgPermission(
  organizationId: string,
  userId: string,
  permission: Permission,
) {
  const db = getDb();
  const memberRef = db
    .collection("organizations")
    .doc(organizationId)
    .collection("members")
    .doc(userId);
  const memberSnapshot = await memberRef.get();

  if (!memberSnapshot.exists || memberSnapshot.get("isActive") !== true) {
    throw new HttpsError("permission-denied", "No tienes acceso a esta organización.");
  }

  const roles = (memberSnapshot.get("roles") ?? []) as SystemRole[];

  if (!hasPermission(roles, permission)) {
    throw new HttpsError(
      "permission-denied",
      "No tienes permisos para esta operación.",
    );
  }

  return {
    roles,
    branchIds: (memberSnapshot.get("branchIds") ?? []) as string[],
  };
}

export async function getActiveOrganizationId(userId: string): Promise<string> {
  const db = getDb();
  const userSnapshot = await db.collection("users").doc(userId).get();

  if (!userSnapshot.exists) {
    throw new HttpsError("failed-precondition", "Perfil de usuario no encontrado.");
  }

  const memberships = userSnapshot.get("memberships") ?? [];
  const active = memberships.find(
    (membership: { isActive?: boolean; organizationId?: string }) =>
      membership.isActive && membership.organizationId,
  );

  if (!active?.organizationId) {
    throw new HttpsError(
      "failed-precondition",
      "Debes completar el onboarding antes de usar inventario.",
    );
  }

  return active.organizationId as string;
}
