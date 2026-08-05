"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { useActiveMembership } from "@/providers/auth-provider";
import type { InventoryBalance } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useInventoryBalances() {
  const membership = useActiveMembership();
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setBalances([]);
      setLoading(false);
      return;
    }

    const balancesRef = collection(
      getFirestoreDb(),
      firestorePaths.organizationInventoryBalances(membership.organizationId),
    );

    const unsubscribe = onSnapshot(
      balancesRef,
      (snapshot) => {
        setBalances(
          snapshot.docs.map((document) => {
            const data = document.data();
            return {
              id: document.id,
              organizationId: data.organizationId,
              branchId: data.branchId,
              warehouseId: data.warehouseId,
              itemId: data.itemId,
              quantity: data.quantity ?? 0,
              averageCost: data.averageCost ?? 0,
              updatedAt: data.updatedAt ?? "",
            } satisfies InventoryBalance;
          }),
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
  }, [membership?.organizationId]);

  return { balances, loading, error };
}
