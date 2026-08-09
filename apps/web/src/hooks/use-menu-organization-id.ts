"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { resolveOrganizationIdFromSlugClient } from "@/lib/digital-menu/digital-menu-settings-client";

export function useMenuOrganizationId(): {
  organizationId: string | null;
  loading: boolean;
  error: string | null;
} {
  const searchParams = useSearchParams();
  const organizationIdParam = searchParams.get("o") ?? "";
  const slugParam = searchParams.get("s") ?? "";
  const [organizationId, setOrganizationId] = useState<string | null>(
    organizationIdParam || null,
  );
  const [loading, setLoading] = useState(Boolean(slugParam && !organizationIdParam));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organizationIdParam) {
      setOrganizationId(organizationIdParam);
      setLoading(false);
      setError(null);
      return;
    }

    if (!slugParam) {
      setOrganizationId(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    resolveOrganizationIdFromSlugClient(slugParam)
      .then((resolvedId) => {
        if (cancelled) {
          return;
        }
        if (!resolvedId) {
          setOrganizationId(null);
          setError("Menú no encontrado para ese enlace.");
        } else {
          setOrganizationId(resolvedId);
          setError(null);
        }
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }
        setOrganizationId(null);
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el menú.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationIdParam, slugParam]);

  return { organizationId, loading, error };
}
