"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import type { MenuProduct } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useGuestMenuProducts(organizationId: string | null) {
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(Boolean(organizationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const productsQuery = query(
      collection(getFirestoreDb(), firestorePaths.organizationMenuProducts(organizationId)),
    );

    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        setProducts(
          snapshot.docs
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
                saleTaxCategory: data.saleTaxCategory,
                recipeCost: data.recipeCost ?? 0,
                imageDataUrl: data.imageDataUrl,
                imageMimeType: data.imageMimeType,
                createdAt: "",
                updatedAt: "",
                createdBy: "",
                updatedBy: "",
              } satisfies MenuProduct;
            })
            .filter((product) => product.status === "active")
            .sort((left, right) => left.sortOrder - right.sortOrder),
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
  }, [organizationId]);

  return { products, loading, error };
}
