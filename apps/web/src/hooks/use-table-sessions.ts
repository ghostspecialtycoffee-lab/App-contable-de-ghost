"use client";

import { useEffect, useState } from "react";
import { collection, doc, limit, query, where } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { parseFirestoreDate } from "@/lib/format";
import { getFirestoreDb } from "@/lib/firebase/client";
import { subscribeDocumentWithPoll } from "@/lib/realtime/subscribe-document";
import { subscribeQueryWithPoll } from "@/lib/realtime/subscribe-query";
import { useActiveMembership } from "@/providers/auth-provider";
import type { TableSession } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

function mapTableSession(documentId: string, data: Record<string, unknown>): TableSession {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    branchId: String(data.branchId ?? ""),
    tableId: String(data.tableId ?? ""),
    tableNumber: Number(data.tableNumber ?? 0),
    tableLabel: String(data.tableLabel ?? ""),
    guestToken: String(data.guestToken ?? ""),
    status: data.status as TableSession["status"],
    lines: (data.lines as TableSession["lines"]) ?? [],
    saleId: typeof data.saleId === "string" ? data.saleId : undefined,
    openedAt: String(data.openedAt ?? parseFirestoreDate(data.createdAt)),
    closedAt: typeof data.closedAt === "string" ? data.closedAt : undefined,
    cancelReason: String(data.cancelReason ?? ""),
    waiterRequestedAt:
      typeof data.waiterRequestedAt === "string" ? data.waiterRequestedAt : undefined,
  };
}

export function useTableSessions(options?: { openOnly?: boolean }) {
  const membership = useActiveMembership();
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const baseQuery = options?.openOnly
      ? query(
          collection(
            getFirestoreDb(),
            firestorePaths.organizationTableSessions(membership.organizationId),
          ),
          where("status", "in", ["open", "requested_bill"]),
          limit(100),
        )
      : query(
          collection(
            getFirestoreDb(),
            firestorePaths.organizationTableSessions(membership.organizationId),
          ),
          limit(100),
        );

    return subscribeQueryWithPoll({
      query: baseQuery,
      mapSnapshot: (snapshot) =>
        snapshot.docs
          .map((document) => mapTableSession(document.id, document.data()))
          .sort((left, right) => left.tableNumber - right.tableNumber),
      onData: (nextSessions) => {
        setSessions(nextSessions);
        setLoading(false);
        setError(null);
      },
      onError: (message) => {
        setError(message);
        setLoading(false);
      },
    });
  }, [membership?.organizationId, options?.openOnly]);

  return { sessions, loading, error };
}

export function useTableSession(sessionId: string | null) {
  const membership = useActiveMembership();
  const [session, setSession] = useState<TableSession | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId || !sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }

    const sessionDocRef = doc(
      getFirestoreDb(),
      firestorePaths.organizationTableSession(membership.organizationId, sessionId),
    );

    return subscribeDocumentWithPoll({
      reference: sessionDocRef,
      mapSnapshot: (document) =>
        document.exists() ? mapTableSession(document.id, document.data()) : null,
      onData: (nextSession) => {
        setSession(nextSession);
        setLoading(false);
        setError(null);
      },
      onError: (message) => {
        setError(message);
        setLoading(false);
      },
    });
  }, [membership?.organizationId, sessionId]);

  return { session, loading, error };
}
