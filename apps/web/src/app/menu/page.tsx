"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { GuestMenuCatalog } from "@/components/guest-menu-catalog";
import { useGuestMenuProducts } from "@/hooks/use-guest-menu-products";
import { MENU_CATEGORIES, MENU_CATEGORY_LABELS, MENU_CATEGORY_META } from "@ghost/domain";

function PublicMenuContent() {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("o") ?? "";
  const { products, loading, error } = useGuestMenuProducts(organizationId || null);

  const categoryCount = MENU_CATEGORIES.filter((category) =>
    products.some((product) => product.category === category),
  ).length;

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
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-16">
      <div className="ghost-menu-hero">
        <div className="ghost-menu-hero-content space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ghost-text-muted)]">
            Menú digital
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Nuestro menú</h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-[var(--ghost-text-muted)]">
            Explora bebidas, comida y repostería organizados por categoría. Toca una sección para
            ir directo a lo que buscas.
          </p>
          {categoryCount > 0 ? (
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {MENU_CATEGORIES.filter((category) =>
                products.some((product) => product.category === category),
              ).map((category) => (
                <span
                  key={category}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] px-3 py-1 text-xs font-medium"
                >
                  <span aria-hidden="true">{MENU_CATEGORY_META[category].emoji}</span>
                  {MENU_CATEGORY_LABELS[category]}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-[var(--ghost-danger)]">
          {error}
          <span className="mt-1 block text-xs text-[var(--ghost-text-muted)]">
            Si eres staff, inicia sesión. Si eres cliente, pide al equipo que active productos en el
            catálogo.
          </span>
        </p>
      ) : null}

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
