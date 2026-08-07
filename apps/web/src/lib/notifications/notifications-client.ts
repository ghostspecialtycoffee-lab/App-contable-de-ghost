import {
  DEFAULT_NOTIFICATION_EVENTS,
  mergeNotificationPreferences,
  NOTIFICATION_EVENT_LABELS,
  type NotificationEventType,
  type NotificationPreference,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

async function getContext(): Promise<{ organizationId: string; userId: string; email: string }> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }

  const userSnap = await getDoc(doc(getFirestoreDb(), firestorePaths.user(uid)));
  if (!userSnap.exists()) {
    throw new Error("Perfil no encontrado.");
  }

  const email = String(userSnap.data().email ?? "");
  const membership = (userSnap.data().memberships ?? []).find(
    (entry: { isActive?: boolean }) => entry.isActive,
  );
  if (!membership?.organizationId) {
    throw new Error("No hay organización activa.");
  }

  return {
    organizationId: membership.organizationId as string,
    userId: uid,
    email,
  };
}

export async function loadNotificationPreferencesClient(): Promise<NotificationPreference> {
  const { organizationId, userId, email } = await getContext();
  const prefRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationNotificationPreference(organizationId, userId),
  );
  const snap = await getDoc(prefRef);
  return mergeNotificationPreferences(
    snap.exists() ? (snap.data() as NotificationPreference) : undefined,
    email,
    organizationId,
    userId,
  );
}

export async function saveNotificationPreferencesClient(
  input: Pick<NotificationPreference, "email" | "events">,
): Promise<void> {
  const { organizationId, userId, email } = await getContext();
  const merged = mergeNotificationPreferences(
    { email: input.email, events: input.events },
    email,
    organizationId,
    userId,
  );

  await setDoc(
    doc(
      getFirestoreDb(),
      firestorePaths.organizationNotificationPreference(organizationId, userId),
    ),
    {
      ...merged,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export {
  DEFAULT_NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_LABELS,
  type NotificationEventType,
};
