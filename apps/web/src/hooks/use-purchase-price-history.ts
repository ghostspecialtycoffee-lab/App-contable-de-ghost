"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, query } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { useActiveMembership } from "@/providers/auth-provider";
import type { BaseUnit, PurchasePriceHistoryEntry } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function usePurchasePriceHistory(limitCount = 300) {
  const membership = useActiveMembership();
  const [entries, setEntries] = useState<PurchasePriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const historyQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationPurchasePriceHistory(membership.organizationId),
      ),
      limit(limitCount),
    );

    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        setEntries(
          snapshot.docs
            .map((document) => {
              const data = document.data();
              return {
                id: document.id,
                organizationId: data.organizationId,
                inventoryItemId: data.inventoryItemId,
                supplierName: data.supplierName ?? "",
                supplierId: data.supplierId || undefined,
                unitPriceNet: data.unitPriceNet ?? 0,
                unit: data.unit as BaseUnit,
                quantity: data.quantity ?? 0,
                invoiceId: data.invoiceId ?? "",
                invoiceNumber: data.invoiceNumber ?? "",
                purchasedAt: data.purchasedAt ?? "",
              } satisfies PurchasePriceHistoryEntry;
            })
            .sort((left, right) => right.purchasedAt.localeCompare(left.purchasedAt)),
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

  return { entries, loading, error };
}
