"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";
import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { useActiveMembership } from "@/providers/auth-provider";
import type { InventoryItem } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useInventoryItems() {
  const membership = useActiveMembership();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const itemsQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationInventoryItems(membership.organizationId),
      ),
      orderBy("name"),
    );

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const nextItems = snapshot.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            organizationId: data.organizationId,
            sku: data.sku,
            name: data.name,
            type: data.type,
            baseUnit: data.baseUnit,
            category: data.category,
            status: data.status,
            minStock: data.minStock ?? 0,
            maxStock: data.maxStock ?? undefined,
            averageCost: data.averageCost ?? 0,
            lastCost: data.lastCost ?? 0,
            trackLot: data.trackLot ?? false,
            purchaseUnit: data.purchaseUnit,
            presentationQuantity: data.presentationQuantity ?? 1,
            presentationLabel: data.presentationLabel ?? "",
            createdAt: "",
            updatedAt: "",
            createdBy: data.createdBy ?? "",
            updatedBy: data.updatedBy ?? "",
          } satisfies InventoryItem;
        });

        setItems(nextItems);
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

  return { items, loading, error };
}
