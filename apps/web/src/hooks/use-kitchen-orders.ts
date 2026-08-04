"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { useActiveMembership } from "@/providers/auth-provider";
import type { KitchenOrder, KitchenOrderStatus } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

const ACTIVE_STATUSES: KitchenOrderStatus[] = [
  "pending",
  "preparing",
  "ready",
];

export function useKitchenOrders(options?: { station?: "bar" | "kitchen" }) {
  const membership = useActiveMembership();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const ordersQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationKitchenOrders(membership.organizationId),
      ),
      where("status", "in", ACTIVE_STATUSES),
      orderBy("createdAt", "desc"),
      limit(50),
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const nextOrders = snapshot.docs
          .map((document) => {
            const data = document.data();
            return {
              id: document.id,
              organizationId: data.organizationId,
              branchId: data.branchId,
              saleId: data.saleId,
              saleNumber: data.saleNumber,
              station: data.station,
              status: data.status,
              ticketNumber: data.ticketNumber ?? 0,
              lines: data.lines ?? [],
              createdAt: "",
              updatedAt: "",
              createdBy: data.createdBy ?? "",
              updatedBy: data.updatedBy ?? "",
            } satisfies KitchenOrder;
          })
          .filter((order) =>
            options?.station ? order.station === options.station : true,
          );

        setOrders(nextOrders);
        setLoading(false);
        setError(null);
      },
      (cause) => {
        setError(getFirestoreErrorMessage(cause));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [membership?.organizationId, options?.station]);

  return { orders, loading, error };
}
