import {
  resolveDigitalMenuSettings,
  validateDigitalMenuSettings,
  type OrganizationDigitalMenuSettings,
  type PublicDigitalMenuConfig,
} from "@ghost/domain";
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

export async function saveDigitalMenuSettingsClient(input: {
  organizationId: string;
  organizationName: string;
  settings: OrganizationDigitalMenuSettings;
  logoDataUrl?: string;
  logoMimeType?: string;
}): Promise<void> {
  const userId = requireUserId();
  const validation = validateDigitalMenuSettings(input.settings);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const settings = validation.value;
  const db = getFirestoreDb();
  const now = serverTimestamp();

  await setDoc(
    doc(db, firestorePaths.organization(input.organizationId)),
    {
      digitalMenuSettings: settings,
      updatedAt: now,
      updatedBy: userId,
    },
    { merge: true },
  );

  const publicConfig: PublicDigitalMenuConfig = {
    organizationId: input.organizationId,
    organizationName: input.organizationName.trim(),
    logoDataUrl: input.logoDataUrl,
    logoMimeType: input.logoMimeType,
    ...settings,
  };

  await setDoc(
    doc(db, firestorePaths.organizationPublicDigitalMenuConfig(input.organizationId)),
    {
      ...publicConfig,
      updatedAt: now,
      updatedBy: userId,
    },
    { merge: true },
  );
}

export function parseDigitalMenuSettings(
  input?: Partial<OrganizationDigitalMenuSettings> | null,
): OrganizationDigitalMenuSettings {
  return resolveDigitalMenuSettings(input);
}
