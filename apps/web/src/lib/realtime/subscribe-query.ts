import {
  getDocs,
  onSnapshot,
  type DocumentData,
  type Query,
  type QuerySnapshot,
} from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";

import {
  combineUnsubscribers,
  REALTIME_SYNC_INTERVAL_MS,
  startRealtimePoll,
} from "./firestore-sync";

interface SubscribeQueryOptions<T> {
  query: Query<DocumentData>;
  mapSnapshot: (snapshot: QuerySnapshot<DocumentData>) => T;
  onData: (data: T) => void;
  onError: (message: string) => void;
  pollIntervalMs?: number;
}

export function subscribeQueryWithPoll<T>({
  query,
  mapSnapshot,
  onData,
  onError,
  pollIntervalMs = REALTIME_SYNC_INTERVAL_MS,
}: SubscribeQueryOptions<T>): () => void {
  let active = true;

  async function poll() {
    if (!active) {
      return;
    }

    try {
      const snapshot = await getDocs(query);
      if (!active) {
        return;
      }
      onData(mapSnapshot(snapshot));
    } catch (cause) {
      if (!active) {
        return;
      }
      onError(getFirestoreErrorMessage(cause));
    }
  }

  void poll();

  const unsubscribeSnapshot = onSnapshot(
    query,
    (snapshot) => {
      if (!active) {
        return;
      }
      onData(mapSnapshot(snapshot));
    },
    (cause) => {
      if (!active) {
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
