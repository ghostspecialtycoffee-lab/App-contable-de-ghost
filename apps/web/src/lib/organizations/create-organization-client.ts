import {
  DEFAULT_ORGANIZATION_SETTINGS,
  resolveOrganizationSlug,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  branchName?: string;
}

export interface CreateOrganizationResult {
  organizationId: string;
  branchId: string;
  slug: string;
}

export async function createOrganizationClient(
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  const name = input.name.trim();
  const branchName = input.branchName?.trim() || "Sucursal principal";
  const slugResult = resolveOrganizationSlug(name, input.slug);

  if (!slugResult.ok) {
    throw new Error(slugResult.error);
  }

  const slug = slugResult.value;
  const db = getFirestoreDb();
  const slugRef = doc(db, "organizationSlugs", slug);
  const userRef = doc(db, firestorePaths.user(user.uid));
  const orgRef = doc(collection(db, firestorePaths.organizations()));
  const branchRef = doc(collection(db, firestorePaths.organizationBranches(orgRef.id)));
  const memberRef = doc(db, firestorePaths.organizationMember(orgRef.id, user.uid));
  const now = serverTimestamp();
  const settings = DEFAULT_ORGANIZATION_SETTINGS;
  const userEmail = user.email ?? "";
  const userName = user.displayName ?? userEmail.split("@")[0] ?? "Usuario";

  await runTransaction(db, async (transaction) => {
    const slugSnap = await transaction.get(slugRef);
    if (slugSnap.exists()) {
      throw new Error("Ese identificador ya está en uso. Elige otro.");
    }

    const userSnap = await transaction.get(userRef);
    const memberships = userSnap.exists()
      ? (userSnap.data().memberships ?? [])
      : [];

    if (memberships.length > 0) {
      throw new Error("Ya perteneces a una organización.");
    }

    transaction.set(slugRef, {
      organizationId: orgRef.id,
      createdBy: user.uid,
      createdAt: now,
    });

    transaction.set(orgRef, {
      name,
      slug,
      status: "trial",
      settings,
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
      updatedBy: user.uid,
    });

    transaction.set(branchRef, {
      organizationId: orgRef.id,
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
      createdBy: user.uid,
      updatedBy: user.uid,
    });

    transaction.set(memberRef, {
      userId: user.uid,
      organizationId: orgRef.id,
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
            organizationId: orgRef.id,
            branchIds: [branchRef.id],
            roles: ["owner"],
            isActive: true,
          },
        ],
        updatedAt: now,
        updatedBy: user.uid,
        ...(userSnap.exists()
          ? {}
          : {
              createdAt: now,
              createdBy: user.uid,
            }),
      },
      { merge: true },
    );
  });

  return {
    organizationId: orgRef.id,
    branchId: branchRef.id,
    slug,
  };
}
