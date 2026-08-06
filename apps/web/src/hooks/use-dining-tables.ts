"use client";

import { useEffect, useState } from "react";
import { collection, orderBy, query } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";
import { subscribeQueryWithPoll } from "@/lib/realtime/subscribe-query";
import { useActiveMembership } from "@/providers/auth-provider";
import type { DiningTable } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useDiningTables() {
  const membership = useActiveMembership();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setTables([]);
      setLoading(false);
      return;
    }

    const tablesQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationDiningTables(membership.organizationId),
      ),
      orderBy("number"),
    );

    return subscribeQueryWithPoll({
      query: tablesQuery,
      mapSnapshot: (snapshot) =>
        snapshot.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            organizationId: data.organizationId,
            branchId: data.branchId,
            number: data.number,
            label: data.label ?? "",
            qrToken: data.qrToken,
            status: data.status,
            capacity: data.capacity ?? 4,
            sortOrder: data.sortOrder ?? data.number,
            createdAt: "",
            updatedAt: "",
            createdBy: data.createdBy ?? "",
            updatedBy: data.updatedBy ?? "",
          } satisfies DiningTable;
        }),
      onData: (nextTables) => {
        setTables(nextTables);
        setLoading(false);
        setError(null);
      },
      onError: (message) => {
        setError(message);
        setLoading(false);
      },
    });
  }, [membership?.organizationId]);

  return { tables, loading, error };
}
