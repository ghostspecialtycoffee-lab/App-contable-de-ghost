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
import type { Sale } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useSales() {
  const membership = useActiveMembership();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setSales([]);
      setLoading(false);
      return;
    }

    const salesQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationSales(membership.organizationId),
      ),
      where("status", "==", "paid"),
      orderBy("createdAt", "desc"),
      limit(100),
    );

    const unsubscribe = onSnapshot(
      salesQuery,
      (snapshot) => {
        setSales(
          snapshot.docs.map((document) => {
            const data = document.data();
            return {
              id: document.id,
              organizationId: data.organizationId,
              branchId: data.branchId,
              saleNumber: data.saleNumber,
              status: data.status,
              lines: data.lines ?? [],
              subtotal: data.subtotal ?? 0,
              taxRate: data.taxRate ?? 0,
              taxAmount: data.taxAmount ?? 0,
              total: data.total ?? 0,
              paymentMethod: data.paymentMethod,
              cashierUserId: data.cashierUserId,
              customerName: data.customerName ?? "",
              notes: data.notes ?? "",
              createdAt: "",
              updatedAt: "",
              createdBy: data.createdBy ?? "",
              updatedBy: data.updatedBy ?? "",
            } satisfies Sale;
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

  return { sales, loading, error };
}
