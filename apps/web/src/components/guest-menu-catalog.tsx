"use client";

import { useMemo } from "react";

import { formatMoney } from "@/lib/format";
import {
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
  type MenuCategory,
  type MenuProduct,
} from "@ghost/domain";

interface GuestMenuCatalogProps {
  products: MenuProduct[];
  cartQty?: Record<string, number>;
  onQtyChange?: (productId: string, quantity: number) => void;
  orderMode?: boolean;
}

export function GuestMenuCatalog({
  products,
  cartQty = {},
  onQtyChange,
  orderMode = false,
}: GuestMenuCatalogProps) {
  const productsByCategory = useMemo(() => {
    const grouped = new Map<MenuCategory, MenuProduct[]>();

    for (const category of MENU_CATEGORIES) {
      grouped.set(category, []);
    }

    for (const product of products) {
      const bucket = grouped.get(product.category) ?? grouped.get("other")!;
      bucket.push(product);
    }

    return MENU_CATEGORIES.map((category) => ({
      category,
      label: MENU_CATEGORY_LABELS[category],
      products: grouped.get(category) ?? [],
    })).filter((section) => section.products.length > 0);
  }, [products]);

  if (products.length === 0) {
    return (
      <p className="text-sm text-[var(--ghost-text-muted)]">
        No hay productos disponibles en este momento.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {productsByCategory.map((section) => (
        <section key={section.category} className="space-y-3">
          <h2 className="text-lg font-semibold">{section.label}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.products.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)]"
              >
                {product.imageDataUrl ? (
                  <img
                    src={product.imageDataUrl}
                    alt={product.name}
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-[var(--ghost-surface-2)] text-sm text-[var(--ghost-text-muted)]">
                    Sin foto
                  </div>
                )}
                <div className="space-y-1 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug">{product.name}</p>
                    <p className="shrink-0 text-sm font-semibold text-[var(--ghost-brand-500)]">
                      {formatMoney(product.price)}
                    </p>
                  </div>
                  {product.description ? (
                    <p className="text-sm leading-relaxed text-[var(--ghost-text-muted)]">
                      {product.description}
                    </p>
                  ) : null}
                  {orderMode && onQtyChange ? (
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        className="ghost-input h-9 w-9 px-0"
                        aria-label={`Menos ${product.name}`}
                        onClick={() =>
                          onQtyChange(product.id, Math.max(0, (cartQty[product.id] ?? 0) - 1))
                        }
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {cartQty[product.id] ?? 0}
                      </span>
                      <button
                        type="button"
                        className="ghost-input h-9 w-9 px-0"
                        aria-label={`Más ${product.name}`}
                        onClick={() =>
                          onQtyChange(product.id, (cartQty[product.id] ?? 0) + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
