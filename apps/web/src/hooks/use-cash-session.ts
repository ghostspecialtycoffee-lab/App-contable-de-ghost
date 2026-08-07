"use client";

import { useEffect, useState } from "react";
import { collection, limit, query, where } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";
import { subscribeQueryWithPoll } from "@/lib/realtime/subscribe-query";
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

    return subscribeQueryWithPoll({
      query: sessionQuery,
      mapSnapshot: (snapshot) => {
        if (snapshot.empty) {
          return null;
        }

        const document = snapshot.docs[0]!;
        const data = document.data();
        return {
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
        } satisfies CashSession;
      },
      onData: (nextSession) => {
        setSession(nextSession);
        if (!nextSession) {
          setMovements([]);
        }
        setLoading(false);
        setError(null);
      },
      onError: (message) => {
        setError(message);
        setLoading(false);
      },
    });
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

    return subscribeQueryWithPoll({
      query: movementsQuery,
      mapSnapshot: (snapshot) =>
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
      onData: setMovements,
      onError: setError,
    });
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

    return subscribeQueryWithPoll({
      query: salesQuery,
      mapSnapshot: (snapshot) =>
        snapshot.docs.reduce((sum, document) => {
          const data = document.data();
          if (data.paymentMethod !== "cash") {
            return sum;
          }
          return sum + Number(data.total ?? 0);
        }, 0),
      onData: (total) => {
        setCashSalesTotal(total);
        setLoading(false);
      },
      onError: () => {
        setCashSalesTotal(0);
        setLoading(false);
      },
    });
  }, [membership?.organizationId, cashSessionId]);

  return { cashSalesTotal, loading };
}
