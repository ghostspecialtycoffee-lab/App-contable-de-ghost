"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, query } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { useActiveMembership } from "@/providers/auth-provider";
import { inferMenuProductTaxCategory, type MenuProduct } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useMenuProducts() {
  const membership = useActiveMembership();
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const productsQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationMenuProducts(membership.organizationId),
      ),
      limit(200),
    );

    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        const nextProducts = snapshot.docs
          .map((document) => {
            const data = document.data();
            return {
              id: document.id,
              organizationId: data.organizationId,
              name: data.name,
              price: data.price ?? 0,
              category: data.category,
              station: data.station,
              status: data.status,
              sortOrder: data.sortOrder ?? 0,
              description: data.description ?? "",
              saleTaxCategory: data.saleTaxCategory ?? inferMenuProductTaxCategory({
                name: data.name,
                category: data.category,
              }),
              recipeCost: data.recipeCost ?? 0,
              createdAt: "",
              updatedAt: "",
              createdBy: data.createdBy ?? "",
              updatedBy: data.updatedBy ?? "",
            } satisfies MenuProduct;
          })
          .filter((product) => product.status === "active")
          .sort((left, right) => left.sortOrder - right.sortOrder);

        setProducts(nextProducts);
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

  return { products, loading, error };
}
