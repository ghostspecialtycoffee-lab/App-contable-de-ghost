import type { OrganizationCostMatrixSettings } from "@ghost/domain";
import { validateCostMatrixSettings } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

function requireUserId(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }
  return uid;
}

export async function updateOrganizationCostMatrixSettingsClient(input: {
  organizationId: string;
  costMatrixSettings: OrganizationCostMatrixSettings;
}): Promise<void> {
  const userId = requireUserId();
  const validation = validateCostMatrixSettings(input.costMatrixSettings);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const organizationRef = doc(
    getFirestoreDb(),
    firestorePaths.organization(input.organizationId),
  );

  await setDoc(
    organizationRef,
    {
      costMatrixSettings: validation.value,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );
}
