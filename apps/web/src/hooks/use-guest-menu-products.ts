"use client";

import { useEffect, useState } from "react";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { buildActiveMenuProductsQuery } from "@/lib/pos/menu-queries";
import { subscribeQueryWithPoll } from "@/lib/realtime/subscribe-query";
import { inferMenuProductTaxCategory, type MenuProduct } from "@ghost/domain";

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
    const productsQuery = buildActiveMenuProductsQuery(organizationId);

    return subscribeQueryWithPoll({
      query: productsQuery,
      mapSnapshot: (snapshot) =>
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
              saleTaxCategory:
                data.saleTaxCategory ??
                inferMenuProductTaxCategory({
                  name: data.name,
                  category: data.category,
                }),
              recipeCost: data.recipeCost ?? 0,
              imageDataUrl: data.imageDataUrl,
              imageMimeType: data.imageMimeType,
              createdAt: "",
              updatedAt: "",
              createdBy: "",
              updatedBy: "",
            } satisfies MenuProduct;
          })
          .sort((left, right) => left.sortOrder - right.sortOrder),
      onData: (nextProducts) => {
        setProducts(nextProducts);
        setLoading(false);
        setError(null);
      },
      onError: (message) => {
        setError(message);
        setLoading(false);
      },
    });
  }, [organizationId]);

  return { products, loading, error };
}
