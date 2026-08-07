import type { AnalyticsDelta } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { doc, increment, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";

export async function applyAnalyticsDeltaClient(delta: AnalyticsDelta & {
  organizationId: string;
}): Promise<void> {
  const db = getFirestoreDb();
  const entryRef = doc(
    db,
    firestorePaths.organizationAnalyticsDailyEntry(delta.organizationId, delta.date),
  );

  const patch: Record<string, unknown> = {
    organizationId: delta.organizationId,
    date: delta.date,
    updatedAt: serverTimestamp(),
  };

  if (delta.salesCount) {
    patch.salesCount = increment(delta.salesCount);
  }
  if (delta.salesTotal) {
    patch.salesTotal = increment(delta.salesTotal);
  }
  if (delta.purchasesCount) {
    patch.purchasesCount = increment(delta.purchasesCount);
  }
  if (delta.purchasesTotal) {
    patch.purchasesTotal = increment(delta.purchasesTotal);
  }
  if (delta.inventoryMovements) {
    patch.inventoryMovements = increment(delta.inventoryMovements);
  }

  await setDoc(entryRef, patch, { merge: true });
}

export async function recordSaleAnalyticsSafe(input: {
  organizationId: string;
  soldOn: string;
  total: number;
}): Promise<void> {
  try {
    await applyAnalyticsDeltaClient({
      organizationId: input.organizationId,
      date: input.soldOn.slice(0, 10),
      salesCount: 1,
      salesTotal: input.total,
    });
  } catch {
    // No bloquear la venta si falla el DWH.
  }
}

export async function recordPurchaseAnalyticsSafe(input: {
  organizationId: string;
  invoiceDate: string;
  total: number;
}): Promise<void> {
  try {
    await applyAnalyticsDeltaClient({
      organizationId: input.organizationId,
      date: input.invoiceDate.slice(0, 10),
      purchasesCount: 1,
      purchasesTotal: input.total,
    });
  } catch {
    // No bloquear la compra si falla el DWH.
  }
}

export async function recordInventoryMovementAnalyticsSafe(input: {
  organizationId: string;
  occurredAt: string;
}): Promise<void> {
  try {
    await applyAnalyticsDeltaClient({
      organizationId: input.organizationId,
      date: input.occurredAt.slice(0, 10),
      inventoryMovements: 1,
    });
  } catch {
    // No bloquear el movimiento si falla el DWH.
  }
}
