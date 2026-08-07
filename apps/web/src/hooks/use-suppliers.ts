"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { parseFirestoreDate } from "@/lib/format";
import { useActiveMembership } from "@/providers/auth-provider";
import type { Supplier } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useSuppliers() {
  const membership = useActiveMembership();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setSuppliers([]);
      setLoading(false);
      return;
    }

    const suppliersQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationSuppliers(membership.organizationId),
      ),
    );

    const unsubscribe = onSnapshot(
      suppliersQuery,
      (snapshot) => {
        setSuppliers(
          snapshot.docs
            .map((document) => {
              const data = document.data();
              return {
                id: document.id,
                organizationId: data.organizationId,
                name: data.name ?? "",
                nit: data.nit || undefined,
                contactName: data.contactName || undefined,
                phone: data.phone || undefined,
                email: data.email || undefined,
                paymentTermsDays: data.paymentTermsDays || undefined,
                notes: data.notes || undefined,
                isActive: data.isActive !== false,
                createdAt: parseFirestoreDate(data.createdAt),
                updatedAt: parseFirestoreDate(data.updatedAt),
                createdBy: data.createdBy ?? "",
                updatedBy: data.updatedBy ?? "",
              } satisfies Supplier;
            })
            .sort((left, right) => left.name.localeCompare(right.name, "es")),
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

  return { suppliers, loading, error };
}
