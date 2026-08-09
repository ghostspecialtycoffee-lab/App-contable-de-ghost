import {
  resolveDigitalMenuSettings,
  validateDigitalMenuSettings,
  type OrganizationDigitalMenuSettings,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

function requireUserId(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }
  return uid;
}

export function parseDigitalMenuSettings(
  input?: Partial<OrganizationDigitalMenuSettings> | null,
): OrganizationDigitalMenuSettings {
  return resolveDigitalMenuSettings(input);
}

export async function saveDigitalMenuSettingsClient(input: {
  organizationId: string;
  organizationName: string;
  slug?: string;
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

  await setDoc(
    doc(db, firestorePaths.organizationPublicDigitalMenuConfig(input.organizationId)),
    {
      organizationId: input.organizationId,
      organizationName: input.organizationName.trim(),
      slug: input.slug?.trim() || null,
      logoDataUrl: input.logoDataUrl ?? null,
      logoMimeType: input.logoMimeType ?? null,
      ...settings,
      updatedAt: now,
      updatedBy: userId,
    },
    { merge: true },
  );
}

/** Republica logo y apariencia actual sin abrir el panel de menú digital. */
export async function syncPublicDigitalMenuClient(input: {
  organizationId: string;
  organizationName: string;
  slug?: string;
  logoDataUrl?: string;
  logoMimeType?: string;
}): Promise<void> {
  const db = getFirestoreDb();
  const orgSnap = await getDoc(doc(db, firestorePaths.organization(input.organizationId)));
  const settings = parseDigitalMenuSettings(orgSnap.data()?.digitalMenuSettings);

  await saveDigitalMenuSettingsClient({
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    slug: input.slug,
    settings,
    logoDataUrl: input.logoDataUrl,
    logoMimeType: input.logoMimeType,
  });
}

export async function resolveOrganizationIdFromSlugClient(
  slug: string,
): Promise<string | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const slugSnap = await getDoc(doc(getFirestoreDb(), "organizationSlugs", normalized));
  if (!slugSnap.exists()) {
    return null;
  }

  return (slugSnap.data().organizationId as string) ?? null;
}

export function buildGuestMenuUrl(input: {
  organizationId: string;
  slug?: string | null;
}): string {
  const query = input.slug
    ? `s=${encodeURIComponent(input.slug)}`
    : `o=${encodeURIComponent(input.organizationId)}`;

  if (typeof window !== "undefined") {
    return `${window.location.origin}/menu?${query}`;
  }
  return `/menu?${query}`;
}
