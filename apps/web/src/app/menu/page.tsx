"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { CafeMenuShowcase } from "@/components/cafe-menu-showcase";
import { GuestMenuCatalog } from "@/components/guest-menu-catalog";
import { usePublicDigitalMenu } from "@/hooks/use-digital-menu-settings";
import { useGuestMenuProducts } from "@/hooks/use-guest-menu-products";
import { useMenuOrganizationId } from "@/hooks/use-menu-organization-id";
import { MENU_CATEGORIES, MENU_CATEGORY_LABELS, MENU_CATEGORY_META } from "@ghost/domain";

function PublicMenuContent() {
  const searchParams = useSearchParams();
  const { organizationId, loading: orgLoading, error: orgError } = useMenuOrganizationId();
  const { products, loading: productsLoading, error: productsError } = useGuestMenuProducts(
    organizationId,
  );
  const { config, loading: configLoading, error: configError } = usePublicDigitalMenu(
    organizationId,
  );

  const loading = orgLoading || productsLoading || configLoading;
  const accentStyle = config?.accentStyle ?? "warm";
  const hasOrgParam = Boolean(searchParams.get("o") || searchParams.get("s"));

  const categoryCount = MENU_CATEGORIES.filter((category) =>
    products.some((product) => product.category === category),
  ).length;

  if (!hasOrgParam) {
    return <CafeMenuShowcase />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando menú...</p>
      </div>
    );
  }

  if (orgError || !organizationId) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-sm text-[var(--ghost-danger)]">
          {orgError ?? "Menú no disponible."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={[
        "ghost-menu-public mx-auto max-w-3xl space-y-6 p-4 pb-20",
        `ghost-menu-theme-${accentStyle}`,
      ].join(" ")}
    >
      <div className="ghost-menu-hero">
        <div className="ghost-menu-hero-content space-y-4">
          {config?.logoDataUrl ? (
            <img
              src={config.logoDataUrl}
              alt={config.organizationName}
              className="mx-auto h-16 w-auto max-w-[200px] object-contain"
            />
          ) : null}
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ghost-text-muted)]">
            {config?.organizationName ?? "Menú digital"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {config?.heroTitle ?? "Nuestro menú"}
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-[var(--ghost-text-muted)]">
            {config?.heroSubtitle ??
              "Explora bebidas, comida y repostería organizados por categoría."}
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

      {productsError || configError ? (
        <p className="text-sm text-[var(--ghost-danger)]">
          {productsError ?? configError}
          <span className="mt-1 block text-xs text-[var(--ghost-text-muted)]">
            Si eres staff, inicia sesión. Si eres cliente, pide al equipo que active productos en el
            menú digital.
          </span>
        </p>
      ) : null}

      <GuestMenuCatalog products={products} showSearch={config?.showSearch ?? true} />

      {config?.footerNote ? (
        <footer className="border-t border-[var(--ghost-border)] pt-6 text-center text-xs text-[var(--ghost-text-muted)]">
          {config.footerNote}
        </footer>
      ) : null}
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
