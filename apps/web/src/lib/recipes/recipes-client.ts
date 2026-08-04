import type { BaseUnit, InventoryCostProfile, RecipeLineInput } from "@ghost/domain";
import {
  calculateRecipeCost,
  type InventoryItem,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

function requireUserId(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }
  return uid;
}

async function getOrganizationIdFromProfile(): Promise<string> {
  const uid = requireUserId();
  const userRef = doc(getFirestoreDb(), firestorePaths.user(uid));
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("Perfil no encontrado. Completa el onboarding.");
  }

  const membership = (userSnap.data().memberships ?? []).find(
    (entry: { isActive?: boolean }) => entry.isActive,
  );

  if (!membership?.organizationId) {
    throw new Error("No hay organización activa.");
  }

  return membership.organizationId as string;
}

export async function saveRecipeClient(input: {
  menuProductId: string;
  menuProductName: string;
  yieldQuantity?: number;
  lines: RecipeLineInput[];
}): Promise<{ recipeId: string; recipeCost: number }> {
  const userId = requireUserId();
  const organizationId = await getOrganizationIdFromProfile();
  const lines = input.lines.filter((line) => line.quantity > 0);

  if (lines.length === 0) {
    throw new Error("Agrega al menos un ingrediente a la receta.");
  }

  const db = getFirestoreDb();
  const itemProfiles: Record<string, InventoryCostProfile> = {};

  for (const line of lines) {
    const itemRef = doc(
      db,
      firestorePaths.organizationInventoryItem(organizationId, line.inventoryItemId),
    );
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) {
      itemProfiles[line.inventoryItemId] = {
        baseUnit: line.unit as BaseUnit,
        averageCost: 0,
      };
      continue;
    }

    const data = itemSnap.data() as InventoryItem;
    itemProfiles[line.inventoryItemId] = {
      baseUnit: data.baseUnit,
      averageCost: Number(data.averageCost ?? data.lastCost ?? 0),
      purchaseUnit: data.purchaseUnit,
      presentationQuantity: data.presentationQuantity,
    };
  }

  const recipeCost = calculateRecipeCost(lines, itemProfiles);
  const existingQuery = query(
    collection(db, firestorePaths.organizationRecipes(organizationId)),
    where("menuProductId", "==", input.menuProductId),
    limit(1),
  );
  const existingSnap = await getDocs(existingQuery);
  const recipeRef = existingSnap.empty
    ? doc(collection(db, firestorePaths.organizationRecipes(organizationId)))
    : existingSnap.docs[0]!.ref;
  const now = serverTimestamp();

  await setDoc(recipeRef, {
    organizationId,
    menuProductId: input.menuProductId,
    menuProductName: input.menuProductName.trim(),
    yieldQuantity: input.yieldQuantity ?? 1,
    lines: lines.map((line) => ({
      inventoryItemId: line.inventoryItemId,
      itemName: line.itemName.trim(),
      quantity: line.quantity,
      unit: line.unit as BaseUnit,
    })),
    recipeCost,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  const productRef = doc(
    db,
    firestorePaths.organizationMenuProduct(organizationId, input.menuProductId),
  );
  await setDoc(
    productRef,
    {
      recipeCost,
      updatedAt: now,
      updatedBy: userId,
    },
    { merge: true },
  );

  return { recipeId: recipeRef.id, recipeCost };
}
