"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { useActiveMembership } from "@/providers/auth-provider";
import type { WorkShift, WorkShiftRole } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useWorkShifts() {
  const membership = useActiveMembership();
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setShifts([]);
      setLoading(false);
      return;
    }

    const shiftsQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationWorkShifts(membership.organizationId),
      ),
      orderBy("shiftDate", "desc"),
    );

    const unsubscribe = onSnapshot(
      shiftsQuery,
      (snapshot) => {
        setShifts(
          snapshot.docs.map((document) => {
            const data = document.data();
            return {
              id: document.id,
              organizationId: data.organizationId,
              branchId: data.branchId,
              staffName: data.staffName,
              role: data.role as WorkShiftRole,
              shiftDate: data.shiftDate,
              startTime: data.startTime,
              endTime: data.endTime,
              notes: data.notes,
            } satisfies WorkShift;
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

  return { shifts, loading, error };
}
