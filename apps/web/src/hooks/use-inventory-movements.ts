"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, query } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { useActiveMembership } from "@/providers/auth-provider";
import type { InventoryMovement, InventoryMovementType } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useInventoryMovements(limitCount = 300) {
  const membership = useActiveMembership();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setMovements([]);
      setLoading(false);
      return;
    }

    const movementsQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationInventoryMovements(membership.organizationId),
      ),
      limit(limitCount),
    );

    const unsubscribe = onSnapshot(
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
                warehouseId: data.warehouseId,
                itemId: data.itemId,
                type: data.type as InventoryMovementType,
                quantity: data.quantity ?? 0,
                unitCost: data.unitCost ?? 0,
                totalCost: data.totalCost ?? 0,
                balanceAfter: data.balanceAfter ?? 0,
                reference: data.reference ?? "",
                notes: data.notes ?? "",
                lotCode: data.lotCode ?? "",
                actorUserId: data.actorUserId ?? "",
                occurredAt: data.occurredAt ?? "",
              } satisfies InventoryMovement;
            })
            .sort(
              (left, right) =>
                new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
            ),
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

  return { movements, loading, error };
}
