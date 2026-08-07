import type { OrganizationEmailDeliveryConfig } from "@ghost/domain";
import { validateEmailDeliveryConfig } from "@ghost/domain";
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

export async function updateOrganizationEmailDeliveryClient(input: {
  organizationId: string;
  emailDelivery: Partial<OrganizationEmailDeliveryConfig>;
}): Promise<void> {
  const userId = requireUserId();
  const validation = validateEmailDeliveryConfig(input.emailDelivery);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  await updateDoc(doc(getFirestoreDb(), firestorePaths.organization(input.organizationId)), {
    emailDelivery: validation.value,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
}
