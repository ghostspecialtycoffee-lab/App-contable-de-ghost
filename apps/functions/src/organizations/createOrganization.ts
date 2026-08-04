import {
  DEFAULT_ORGANIZATION_SETTINGS,
  resolveOrganizationSlug,
} from "@ghost/domain";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import { writeAuditLog } from "../shared/audit.js";
import { getDb } from "../shared/db.js";

interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  branchName?: string;
}

interface CreateOrganizationResponse {
  organizationId: string;
  branchId: string;
  slug: string;
}

export const createOrganization = onCall<
  CreateOrganizationRequest,
  Promise<CreateOrganizationResponse>
>(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const userId = request.auth.uid;
  const name = request.data.name?.trim();
  const branchName = request.data.branchName?.trim() || "Sucursal principal";

  if (!name || name.length < 2) {
    throw new HttpsError(
      "invalid-argument",
      "El nombre de la organización es obligatorio.",
    );
  }

  const slugResult = resolveOrganizationSlug(name, request.data.slug);
  if (!slugResult.ok) {
    throw new HttpsError("invalid-argument", slugResult.error);
  }

  const slug = slugResult.value;
  const db = getDb();

  const slugSnapshot = await db
    .collection("organizations")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (!slugSnapshot.empty) {
    throw new HttpsError(
      "already-exists",
      "Ese identificador ya está en uso. Elige otro.",
    );
  }

  const userRef = db.collection("users").doc(userId);
  const userSnapshot = await userRef.get();
  const userEmail = request.auth.token.email ?? "";
  const userName =
    request.auth.token.name ?? userEmail.split("@")[0] ?? "Usuario";

  if (userSnapshot.exists) {
    const memberships = userSnapshot.get("memberships") ?? [];
    if (memberships.length > 0) {
      throw new HttpsError(
        "failed-precondition",
        "Ya perteneces a una organización.",
      );
    }
  }

  const organizationRef = db.collection("organizations").doc();
  const branchRef = organizationRef.collection("branches").doc();
  const memberRef = organizationRef.collection("members").doc(userId);
  const now = FieldValue.serverTimestamp();

  const settings = DEFAULT_ORGANIZATION_SETTINGS;

  await db.runTransaction(async (transaction) => {
    transaction.set(organizationRef, {
      name,
      slug,
      status: "trial",
      settings,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    });

    transaction.set(branchRef, {
      organizationId: organizationRef.id,
      name: branchName,
      code: "MAIN",
      status: "active",
      address: {
        line1: "Por configurar",
        city: "Por configurar",
        country: settings.fiscalCountry,
      },
      phone: "",
      isDefault: true,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    });

    transaction.set(memberRef, {
      userId,
      organizationId: organizationRef.id,
      roles: ["owner"],
      branchIds: [branchRef.id],
      isActive: true,
      joinedAt: now,
    });

    transaction.set(
      userRef,
      {
        email: userEmail,
        displayName: userName,
        status: "active",
        memberships: [
          {
            organizationId: organizationRef.id,
            branchIds: [branchRef.id],
            roles: ["owner"],
            isActive: true,
          },
        ],
        updatedAt: now,
        updatedBy: userId,
        ...(userSnapshot.exists
          ? {}
          : {
              createdAt: now,
              createdBy: userId,
            }),
      },
      { merge: true },
    );
  });

  await writeAuditLog({
    organizationId: organizationRef.id,
    actorUserId: userId,
    action: "create",
    entityType: "organization",
    entityId: organizationRef.id,
    summary: `Organización creada: ${name}`,
  });

  logger.info("Organización creada", {
    organizationId: organizationRef.id,
    userId,
    slug,
  });

  return {
    organizationId: organizationRef.id,
    branchId: branchRef.id,
    slug,
  };
});
