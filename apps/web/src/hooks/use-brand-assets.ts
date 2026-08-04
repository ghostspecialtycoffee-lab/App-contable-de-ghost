"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { useActiveMembership } from "@/providers/auth-provider";
import type { BrandAsset } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useBrandAssets() {
  const membership = useActiveMembership();
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setAssets([]);
      setLoading(false);
      return;
    }

    const assetsQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationBrandAssets(membership.organizationId),
      ),
    );

    const unsubscribe = onSnapshot(
      assetsQuery,
      (snapshot) => {
        const nextAssets = snapshot.docs
          .map((document) => {
            const data = document.data();
            return {
              id: document.id,
              organizationId: data.organizationId,
              name: data.name,
              type: data.type,
              mimeType: data.mimeType,
              dataUrl: data.dataUrl,
              status: data.status,
              isPrimary: data.isPrimary ?? false,
              createdAt: "",
              updatedAt: "",
              createdBy: data.createdBy ?? "",
              updatedBy: data.updatedBy ?? "",
            } satisfies BrandAsset;
          })
          .filter((asset) => asset.status === "active")
          .sort((left, right) => {
            if (left.isPrimary !== right.isPrimary) {
              return left.isPrimary ? -1 : 1;
            }
            return left.name.localeCompare(right.name);
          });

        setAssets(nextAssets);
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

  const primaryLogo = useMemo(
    () => assets.find((asset) => asset.isPrimary) ?? assets.find((a) => a.type === "logo"),
    [assets],
  );

  return { assets, primaryLogo, loading, error };
}
