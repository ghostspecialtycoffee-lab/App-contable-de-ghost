import type { AllocatableLot } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, getDocs, query, where } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";
import { parseFirestoreDate } from "@/lib/format";

export async function listOpenLotsForItem(input: {
  organizationId: string;
  warehouseId: string;
  itemId: string;
}): Promise<AllocatableLot[]> {
  const db = getFirestoreDb();
  const lotsQuery = query(
    collection(db, firestorePaths.organizationInventoryLots(input.organizationId)),
    where("warehouseId", "==", input.warehouseId),
    where("itemId", "==", input.itemId),
  );
  const snapshot = await getDocs(lotsQuery);

  return snapshot.docs
    .map((document) => {
      const data = document.data();
      return {
        id: document.id,
        lotCode: String(data.lotCode ?? ""),
        quantityRemaining: Number(data.quantityRemaining ?? 0),
        unitCost: Number(data.unitCost ?? 0),
        sourceReference:
          typeof data.sourceReference === "string" ? data.sourceReference : undefined,
        receivedAt:
          parseFirestoreDate(data.receivedAt) ||
          parseFirestoreDate(data.updatedAt) ||
          new Date().toISOString(),
      } satisfies AllocatableLot;
    })
    .filter((lot) => lot.quantityRemaining > 0 && lot.lotCode.length > 0);
}
