"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { parseFirestoreDate } from "@/lib/format";
import { useActiveMembership } from "@/providers/auth-provider";
import type { FixedExpense } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useFixedExpenses() {
  const membership = useActiveMembership();
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const expensesQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationFixedExpenses(membership.organizationId),
      ),
      orderBy("name"),
    );

    const unsubscribe = onSnapshot(
      expensesQuery,
      (snapshot) => {
        setExpenses(
          snapshot.docs.map((document) => {
            const data = document.data();
            return {
              id: document.id,
              organizationId: data.organizationId,
              branchId: data.branchId,
              name: data.name,
              category: data.category,
              amount: data.amount ?? 0,
              frequency: data.frequency,
              monthlyEquivalent: data.monthlyEquivalent ?? 0,
              supplierName: data.supplierName,
              dueDay: data.dueDay ?? undefined,
              isActive: data.isActive ?? true,
              notes: data.notes,
              createdAt: parseFirestoreDate(data.createdAt),
              updatedAt: parseFirestoreDate(data.updatedAt),
              createdBy: data.createdBy ?? "",
              updatedBy: data.updatedBy ?? "",
            } satisfies FixedExpense;
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

  return { expenses, loading, error };
}
