"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { useActiveMembership } from "@/providers/auth-provider";
import type { CashMovement, CashMovementType, CashSession } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useCashSession() {
  const membership = useActiveMembership();
  const branchId = membership?.branchIds?.[0] ?? null;
  const [session, setSession] = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId || !branchId) {
      setSession(null);
      setMovements([]);
      setLoading(false);
      return;
    }

    const db = getFirestoreDb();
    const sessionQuery = query(
      collection(db, firestorePaths.organizationCashSessions(membership.organizationId)),
      where("branchId", "==", branchId),
      where("status", "==", "open"),
      limit(1),
    );

    const unsubscribeSession = onSnapshot(
      sessionQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setSession(null);
          setMovements([]);
          setLoading(false);
          setError(null);
          return;
        }

        const document = snapshot.docs[0]!;
        const data = document.data();
        setSession({
          id: document.id,
          organizationId: data.organizationId,
          branchId: data.branchId,
          status: data.status,
          sessionDate: data.sessionDate,
          openingAmount: data.openingAmount ?? 0,
          openedAt: data.openedAt ?? "",
          openedBy: data.openedBy ?? "",
          closedAt: data.closedAt,
          closedBy: data.closedBy,
          closingCountedAmount: data.closingCountedAmount,
          closingExpectedAmount: data.closingExpectedAmount,
          closingDifference: data.closingDifference,
          openingNotes: data.openingNotes ?? "",
          closingNotes: data.closingNotes ?? "",
          createdAt: "",
          updatedAt: "",
          createdBy: data.createdBy ?? "",
          updatedBy: data.updatedBy ?? "",
        });
        setLoading(false);
        setError(null);
      },
      (cause) => {
        setError(getFirestoreErrorMessage(cause));
        setLoading(false);
      },
    );

    return unsubscribeSession;
  }, [membership?.organizationId, branchId]);

  useEffect(() => {
    if (!membership?.organizationId || !session?.id) {
      setMovements([]);
      return;
    }

    const db = getFirestoreDb();
    const movementsQuery = query(
      collection(db, firestorePaths.organizationCashMovements(membership.organizationId)),
      where("cashSessionId", "==", session.id),
    );

    const unsubscribeMovements = onSnapshot(
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
                occurredAt: data.occurredAt ?? "",
                actorUserId: data.actorUserId ?? "",
                createdAt: "",
                updatedAt: "",
                createdBy: data.createdBy ?? "",
                updatedBy: data.updatedBy ?? "",
              } satisfies CashMovement;
            })
            .sort(
              (left, right) =>
                new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
            ),
        );
      },
      (cause) => {
        setError(getFirestoreErrorMessage(cause));
      },
    );

    return unsubscribeMovements;
  }, [membership?.organizationId, session?.id]);

  return { session, movements, loading, error, branchId };
}

export function useCashSessionSales(cashSessionId: string | null) {
  const membership = useActiveMembership();
  const [cashSalesTotal, setCashSalesTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId || !cashSessionId) {
      setCashSalesTotal(0);
      setLoading(false);
      return;
    }

    const db = getFirestoreDb();
    const salesQuery = query(
      collection(db, firestorePaths.organizationSales(membership.organizationId)),
      where("cashSessionId", "==", cashSessionId),
      where("status", "==", "paid"),
    );

    const unsubscribe = onSnapshot(
      salesQuery,
      (snapshot) => {
        const total = snapshot.docs.reduce((sum, document) => {
          const data = document.data();
          if (data.paymentMethod !== "cash") {
            return sum;
          }
          return sum + Number(data.total ?? 0);
        }, 0);
        setCashSalesTotal(total);
        setLoading(false);
      },
      () => {
        setCashSalesTotal(0);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [membership?.organizationId, cashSessionId]);

  return { cashSalesTotal, loading };
}
