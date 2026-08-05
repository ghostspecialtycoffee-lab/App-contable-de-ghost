"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, query } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { parseFirestoreDate } from "@/lib/format";
import { useActiveMembership } from "@/providers/auth-provider";
import type { CashMovement, CashMovementType } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useCashMovements(limitCount = 300) {
  const membership = useActiveMembership();
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setMovements([]);
      setLoading(false);
      return;
    }

    const movementsQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationCashMovements(membership.organizationId),
      ),
      limit(limitCount),
    );

    const unsubscribe = onSnapshot(
      movementsQuery,
      (snapshot) => {
        setMovements(
          snapshot.docs
            .map((document) => {
              const data = document.data();
              return {
                id: document.id,
                organizationId: data.organizationId,
                branchId: data.branchId,
                cashSessionId: data.cashSessionId,
                type: data.type as CashMovementType,
                amount: data.amount ?? 0,
                reason: data.reason ?? "",
                reference: data.reference ?? "",
                occurredAt: parseFirestoreDate(data.occurredAt),
                actorUserId: data.actorUserId ?? "",
                createdAt: "",
                updatedAt: "",
                createdBy: data.createdBy ?? "",
                updatedBy: data.updatedBy ?? "",
              } satisfies CashMovement;
            })
            .sort(
              (left, right) =>
                new Date(right.occurredAt || 0).getTime() -
                new Date(left.occurredAt || 0).getTime(),
            ),
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
  }, [membership?.organizationId, limitCount]);

  return { movements, loading, error };
}
