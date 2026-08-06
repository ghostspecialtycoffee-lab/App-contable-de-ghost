import type { OrganizationFiscalProfile } from "@ghost/domain";
import { validateFiscalProfile } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

function stripUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedValues(item)) as T;
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, fieldValue]) => fieldValue !== undefined)
        .map(([key, fieldValue]) => [key, stripUndefinedValues(fieldValue)]),
    ) as T;
  }

  return value;
}

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

  await setDoc(
    organizationRef,
    stripUndefinedValues({
      fiscalProfile: validation.value,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    }),
    { merge: true },
  );
}
