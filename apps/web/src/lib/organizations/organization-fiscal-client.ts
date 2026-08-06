import type { OrganizationFiscalProfile } from "@ghost/domain";
import { serializeFiscalProfileForFirestore, validateFiscalProfile } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

function requireUserId(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }
  return uid;
}

export async function updateOrganizationFiscalProfileClient(input: {
  organizationId: string;
  fiscalProfile: OrganizationFiscalProfile;
}): Promise<void> {
  const userId = requireUserId();
  const validation = validateFiscalProfile(input.fiscalProfile);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const organizationRef = doc(
    getFirestoreDb(),
    firestorePaths.organization(input.organizationId),
  );

  const fiscalProfile = serializeFiscalProfileForFirestore(validation.value);

  await updateDoc(organizationRef, {
    fiscalProfile,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
}
