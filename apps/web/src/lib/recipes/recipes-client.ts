import type { BaseUnit, InventoryCostProfile, MenuCategory, RecipeLineInput } from "@ghost/domain";
import {
  buildRecipeContentSignature,
  buildRecipeVersionDocument,
  calculatePastryPortionCost,
  calculateRecipeBatchCost,
  hasRecipeContentChanged,
  resolveNextRecipeVersion,
  sanitizeBeverageAdvancedSetupAnswers,
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
  category?: MenuCategory;
  lines: RecipeLineInput[];
  advancedSetupAnswers?: Record<string, string>;
  changeNote?: string;
}): Promise<{ recipeId: string; recipeCost: number; recipeVersion: number }> {
  const userId = requireUserId();
  const organizationId = await getOrganizationIdFromProfile();
  const lines = input.lines.filter((line) => line.quantity > 0);

  if (lines.length === 0) {
    throw new Error("Agrega al menos un ingrediente a la receta.");
  }

  const db = getFirestoreDb();
  const productRef = doc(
    db,
    firestorePaths.organizationMenuProduct(organizationId, input.menuProductId),
  );
  const productSnap = await getDoc(productRef);
  const category =
    input.category ?? (productSnap.data()?.category as MenuCategory | undefined) ?? "other";
  const advancedSetupAnswers = sanitizeBeverageAdvancedSetupAnswers(
    input.menuProductName,
    input.advancedSetupAnswers ?? {},
  );

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

  const batchCost = calculateRecipeBatchCost(lines, itemProfiles);
  const recipeCost = calculatePastryPortionCost({
    batchCostNet: batchCost,
    yieldQuantity: input.yieldQuantity,
    category,
  });
  const normalizedLines = lines.map((line) => ({
    inventoryItemId: line.inventoryItemId,
    itemName: line.itemName.trim(),
    quantity: line.quantity,
    unit: line.unit as BaseUnit,
  }));

  const existingQuery = query(
    collection(db, firestorePaths.organizationRecipes(organizationId)),
    where("menuProductId", "==", input.menuProductId),
    limit(1),
  );
  const existingSnap = await getDocs(existingQuery);
  const existingDoc = existingSnap.empty ? null : existingSnap.docs[0]!;
  const existingData = existingDoc?.data();
  const recipeRef = existingDoc?.ref ?? doc(collection(db, firestorePaths.organizationRecipes(organizationId)));
  const isNewRecipe = !existingDoc;
  const contentChanged = hasRecipeContentChanged(
    existingData
      ? {
          yieldQuantity: existingData.yieldQuantity ?? 1,
          lines: existingData.lines ?? [],
          advancedSetupAnswers: existingData.advancedSetupAnswers ?? {},
        }
      : null,
    {
      yieldQuantity: input.yieldQuantity,
      lines,
      advancedSetupAnswers,
    },
  );

  const recipeVersion = resolveNextRecipeVersion(
    existingData?.currentVersion,
    isNewRecipe,
    contentChanged,
  );

  const now = serverTimestamp();
  const publishedAt = new Date().toISOString();

  if (contentChanged) {
    const versionRef = doc(
      db,
      firestorePaths.organizationRecipeVersion(organizationId, recipeRef.id, recipeVersion),
    );

    await setDoc(versionRef, {
      ...buildRecipeVersionDocument({
        recipeId: recipeRef.id,
        organizationId,
        menuProductId: input.menuProductId,
        menuProductName: input.menuProductName.trim(),
        version: recipeVersion,
        yieldQuantity: input.yieldQuantity ?? 1,
        lines: normalizedLines,
        recipeCost,
        advancedSetupAnswers:
          Object.keys(advancedSetupAnswers).length > 0 ? advancedSetupAnswers : undefined,
        changeNote: input.changeNote,
        publishedAt,
        publishedBy: userId,
      }),
      contentSignature: buildRecipeContentSignature({
        yieldQuantity: input.yieldQuantity,
        lines,
        advancedSetupAnswers,
      }),
      createdAt: now,
      createdBy: userId,
    });
  }

  await setDoc(recipeRef, {
    organizationId,
    menuProductId: input.menuProductId,
    menuProductName: input.menuProductName.trim(),
    currentVersion: recipeVersion,
    yieldQuantity: input.yieldQuantity ?? 1,
    lines: normalizedLines,
    ...(Object.keys(advancedSetupAnswers).length > 0 ? { advancedSetupAnswers } : {}),
    recipeCost,
    contentSignature: buildRecipeContentSignature({
      yieldQuantity: input.yieldQuantity,
      lines,
      advancedSetupAnswers,
    }),
    createdAt: existingData?.createdAt ?? now,
    updatedAt: now,
    createdBy: existingData?.createdBy ?? userId,
    updatedBy: userId,
  });

  await setDoc(
    productRef,
    {
      recipeCost,
      updatedAt: now,
      updatedBy: userId,
    },
    { merge: true },
  );

  return { recipeId: recipeRef.id, recipeCost, recipeVersion };
}
