import type { OrganizationWorkflowSettings } from "@ghost/domain";
import { validateWorkflowSettings } from "@ghost/domain";
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

export async function updateOrganizationWorkflowSettingsClient(input: {
  organizationId: string;
  workflowSettings: OrganizationWorkflowSettings;
}): Promise<void> {
  const userId = requireUserId();
  const validation = validateWorkflowSettings(input.workflowSettings);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  await setDoc(
    doc(getFirestoreDb(), firestorePaths.organization(input.organizationId)),
    {
      workflowSettings: validation.value,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );
}
