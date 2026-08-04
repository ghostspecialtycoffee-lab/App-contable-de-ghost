"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";
import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { useActiveMembership } from "@/providers/auth-provider";
import type { Warehouse } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useWarehouses() {
  const membership = useActiveMembership();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setWarehouses([]);
      setLoading(false);
      return;
    }

    const warehousesQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationWarehouses(membership.organizationId),
      ),
      orderBy("name"),
    );

    const unsubscribe = onSnapshot(
      warehousesQuery,
      (snapshot) => {
        setWarehouses(
          snapshot.docs.map((document) => {
            const data = document.data();
            return {
              id: document.id,
              organizationId: data.organizationId,
              branchId: data.branchId,
              name: data.name,
              code: data.code,
              status: data.status,
              isDefault: data.isDefault ?? false,
              createdAt: "",
              updatedAt: "",
              createdBy: data.createdBy ?? "",
              updatedBy: data.updatedBy ?? "",
            } satisfies Warehouse;
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

  return { warehouses, loading, error };
}
