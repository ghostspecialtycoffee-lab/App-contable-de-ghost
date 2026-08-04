"use client";

import { useEffect, useState } from "react";
import { collection, doc, limit, onSnapshot, query, where } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { parseFirestoreDate } from "@/lib/format";
import { useActiveMembership } from "@/providers/auth-provider";
import type { TableSession } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

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

    const unsubscribe = onSnapshot(
      baseQuery,
      (snapshot) => {
        setSessions(
          snapshot.docs
            .map((document) => {
              const data = document.data();
              return {
                id: document.id,
                organizationId: data.organizationId,
                branchId: data.branchId,
                tableId: data.tableId,
                tableNumber: data.tableNumber,
                tableLabel: data.tableLabel ?? "",
                guestToken: data.guestToken,
                status: data.status,
                lines: data.lines ?? [],
                saleId: data.saleId,
                openedAt: data.openedAt ?? parseFirestoreDate(data.createdAt),
                closedAt: data.closedAt,
              } satisfies TableSession;
            })
            .sort((left, right) => left.tableNumber - right.tableNumber),
        );
        setLoading(false);
        setError(null);
      },
      (cause) => {
        setError(getFirestoreErrorMessage(cause));
        setLoading(false);
      },
    );

    return unsubscribe;
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

    const unsubscribe = onSnapshot(
      sessionDocRef,
      (document) => {
        if (!document.exists()) {
          setSession(null);
          setLoading(false);
          return;
        }

        const data = document.data();
        setSession({
          id: document.id,
          organizationId: data.organizationId,
          branchId: data.branchId,
          tableId: data.tableId,
          tableNumber: data.tableNumber,
          tableLabel: data.tableLabel ?? "",
          guestToken: data.guestToken,
          status: data.status,
          lines: data.lines ?? [],
          saleId: data.saleId,
          openedAt: data.openedAt ?? "",
          closedAt: data.closedAt,
        });
        setLoading(false);
        setError(null);
      },
      (cause) => {
        setError(getFirestoreErrorMessage(cause));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [membership?.organizationId, sessionId]);

  return { session, loading, error };
}
