/** Intervalo estándar de refresco operativo (Firestore + respaldo por polling). */
export const REALTIME_SYNC_INTERVAL_MS = 3000;

export function startRealtimePoll(
  poll: () => void | Promise<void>,
  intervalMs: number = REALTIME_SYNC_INTERVAL_MS,
): () => void {
  const timer = setInterval(() => {
    void Promise.resolve(poll()).catch(() => undefined);
  }, intervalMs);

  return () => clearInterval(timer);
}

export function combineUnsubscribers(...cleanups: Array<(() => void) | undefined>): () => void {
  return () => {
    for (const cleanup of cleanups) {
      cleanup?.();
    }
  };
}
