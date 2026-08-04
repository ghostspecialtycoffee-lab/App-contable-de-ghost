"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { useActiveMembership } from "@/providers/auth-provider";
import type { Recipe } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useRecipes() {
  const membership = useActiveMembership();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    const recipesQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationRecipes(membership.organizationId),
      ),
    );

    const unsubscribe = onSnapshot(
      recipesQuery,
      (snapshot) => {
        setRecipes(
          snapshot.docs.map((document) => {
            const data = document.data();
            return {
              id: document.id,
              organizationId: data.organizationId,
              menuProductId: data.menuProductId,
              menuProductName: data.menuProductName,
              yieldQuantity: data.yieldQuantity ?? 1,
              lines: data.lines ?? [],
            } satisfies Recipe;
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

  return { recipes, loading, error };
}

export function useRecipeForProduct(menuProductId: string | null) {
  const { recipes, loading, error } = useRecipes();
  const recipe = menuProductId
    ? recipes.find((entry) => entry.menuProductId === menuProductId) ?? null
    : null;

  return { recipe, loading, error };
}
