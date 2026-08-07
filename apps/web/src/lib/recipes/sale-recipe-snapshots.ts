import type { Recipe, SaleRecipeSnapshot } from "@ghost/domain";
import { buildSaleRecipeSnapshot } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, getDocs } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";

export async function loadSaleRecipeSnapshots(
  organizationId: string,
  productIds: string[],
): Promise<SaleRecipeSnapshot[]> {
  const uniqueProductIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueProductIds.length === 0) {
    return [];
  }

  const db = getFirestoreDb();
  const recipesSnap = await getDocs(
    collection(db, firestorePaths.organizationRecipes(organizationId)),
  );

  const recipesByProduct = new Map<string, Recipe & { recipeCost?: number }>();

  for (const document of recipesSnap.docs) {
    const data = document.data();
    recipesByProduct.set(data.menuProductId as string, {
      id: document.id,
      organizationId: data.organizationId,
      menuProductId: data.menuProductId,
      menuProductName: data.menuProductName,
      currentVersion: data.currentVersion ?? 1,
      recipeCost: data.recipeCost ?? 0,
      yieldQuantity: data.yieldQuantity ?? 1,
      lines: data.lines ?? [],
      advancedSetupAnswers: data.advancedSetupAnswers ?? undefined,
    });
  }

  const snapshots: SaleRecipeSnapshot[] = [];

  for (const productId of uniqueProductIds) {
    const recipe = recipesByProduct.get(productId);
    if (!recipe || recipe.lines.length === 0) {
      continue;
    }
    snapshots.push(buildSaleRecipeSnapshot(recipe));
  }

  return snapshots;
}
