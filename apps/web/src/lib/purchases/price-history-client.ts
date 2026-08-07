import type { PurchasePriceHistoryInput } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

function requireUserId(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }
  return uid;
}

export async function recordPurchasePriceHistoryClient(
  organizationId: string,
  entries: PurchasePriceHistoryInput[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const userId = requireUserId();
  const db = getFirestoreDb();
  const now = serverTimestamp();

  for (const entry of entries) {
    const entryRef = doc(
      collection(db, firestorePaths.organizationPurchasePriceHistory(organizationId)),
    );

    await setDoc(entryRef, {
      organizationId,
      inventoryItemId: entry.inventoryItemId,
      supplierName: entry.supplierName,
      supplierId: entry.supplierId ?? "",
      unitPriceNet: entry.unitPriceNet,
      unit: entry.unit,
      quantity: entry.quantity,
      invoiceId: entry.invoiceId,
      invoiceNumber: entry.invoiceNumber,
      purchasedAt: entry.purchasedAt,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    });
  }
}
