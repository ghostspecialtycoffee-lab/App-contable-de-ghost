"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { GuestMenuCatalog } from "@/components/guest-menu-catalog";
import { useGuestMenuProducts } from "@/hooks/use-guest-menu-products";

function PublicMenuContent() {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("o") ?? "";
  const { products, loading, error } = useGuestMenuProducts(organizationId || null);

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-sm text-[var(--ghost-danger)]">Enlace de menú no válido.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando menú...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-12">
      <div className="text-center">
        <p className="text-sm text-[var(--ghost-text-muted)]">Menú digital</p>
        <h1 className="text-2xl font-semibold">Nuestro menú</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Consulta precios, fotos y descripciones por categoría.
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--ghost-danger)]">{error}</p> : null}

      <GuestMenuCatalog products={products} />
    </div>
  );
}

export default function PublicMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-sm text-[var(--ghost-text-muted)]">Cargando...</p>
        </div>
      }
    >
      <PublicMenuContent />
    </Suspense>
  );
}
