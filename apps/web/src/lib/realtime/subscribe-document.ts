import {
  getDoc,
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
} from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";

import {
  combineUnsubscribers,
  REALTIME_SYNC_INTERVAL_MS,
  startRealtimePoll,
} from "./firestore-sync";

interface SubscribeDocumentOptions<T> {
  reference: DocumentReference<DocumentData>;
  mapSnapshot: (snapshot: DocumentSnapshot<DocumentData>) => T;
  onData: (data: T) => void;
  onError?: (message: string) => void;
  pollIntervalMs?: number;
}

export function subscribeDocumentWithPoll<T>({
  reference,
  mapSnapshot,
  onData,
  onError,
  pollIntervalMs = REALTIME_SYNC_INTERVAL_MS,
}: SubscribeDocumentOptions<T>): () => void {
  let active = true;

  async function poll() {
    if (!active) {
      return;
    }

    try {
      const snapshot = await getDoc(reference);
      if (!active) {
        return;
      }
      onData(mapSnapshot(snapshot));
    } catch (cause) {
      if (!active || !onError) {
        return;
      }
      onError(getFirestoreErrorMessage(cause));
    }
  }

  void poll();

  const unsubscribeSnapshot = onSnapshot(
    reference,
    (snapshot) => {
      if (!active) {
        return;
      }
      onData(mapSnapshot(snapshot));
    },
    (cause) => {
      if (!active || !onError) {
        return;
      }
      onError(getFirestoreErrorMessage(cause));
    },
  );

  const stopPoll = startRealtimePoll(poll, pollIntervalMs);

  return combineUnsubscribers(() => {
    active = false;
  }, unsubscribeSnapshot, stopPoll);
}
