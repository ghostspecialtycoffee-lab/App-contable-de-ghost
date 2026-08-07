"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatMoney } from "@/lib/format";
import { normalizeCatalogName } from "@/lib/costing/ghost-menu-catalog";
import { normalizeMenuCategory } from "@/lib/pos/menu-queries";
import {
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
  MENU_CATEGORY_META,
  type MenuCategory,
  type MenuProduct,
} from "@ghost/domain";

interface GuestMenuCatalogProps {
  products: MenuProduct[];
  cartQty?: Record<string, number>;
  onQtyChange?: (productId: string, quantity: number) => void;
  orderMode?: boolean;
  showSearch?: boolean;
}

function categoryAnchorId(category: MenuCategory): string {
  return `menu-cat-${category}`;
}

export function GuestMenuCatalog({
  products,
  cartQty = {},
  onQtyChange,
  orderMode = false,
  showSearch = true,
}: GuestMenuCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<MenuCategory | null>(null);
  const sectionRefs = useRef<Partial<Record<MenuCategory, HTMLElement | null>>>({});

  const visibleProducts = useMemo(() => {
    const normalizedQuery = normalizeCatalogName(searchQuery);
    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) => {
      const category = normalizeMenuCategory(product.category);
      const haystack = normalizeCatalogName(
        [
          product.name,
          product.description ?? "",
          MENU_CATEGORY_LABELS[category],
          MENU_CATEGORY_META[category].tagline,
        ].join(" "),
      );
      return haystack.includes(normalizedQuery);
    });
  }, [products, searchQuery]);

  const productsByCategory = useMemo(() => {
    const grouped = new Map<MenuCategory, MenuProduct[]>();

    for (const category of MENU_CATEGORIES) {
      grouped.set(category, []);
    }

    for (const product of visibleProducts) {
      const category = normalizeMenuCategory(product.category);
      grouped.get(category)!.push(product);
    }

    return MENU_CATEGORIES.map((category) => ({
      category,
      label: MENU_CATEGORY_LABELS[category],
      meta: MENU_CATEGORY_META[category],
      products: grouped.get(category) ?? [],
    })).filter((section) => section.products.length > 0);
  }, [visibleProducts]);

  const scrollToCategory = useCallback((category: MenuCategory) => {
    const section = sectionRefs.current[category];
    if (!section) {
      return;
    }

    setActiveCategory(category);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (productsByCategory.length === 0) {
      setActiveCategory(null);
      return;
    }

    if (!activeCategory || !productsByCategory.some((section) => section.category === activeCategory)) {
      setActiveCategory(productsByCategory[0]?.category ?? null);
    }
  }, [activeCategory, productsByCategory]);

  useEffect(() => {
    if (productsByCategory.length === 0 || searchQuery.trim()) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        const topEntry = visible[0];
        if (!topEntry?.target.id) {
          return;
        }

        const category = topEntry.target.id.replace("menu-cat-", "") as MenuCategory;
        if (MENU_CATEGORIES.includes(category)) {
          setActiveCategory(category);
        }
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const section of productsByCategory) {
      const element = sectionRefs.current[section.category];
      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [productsByCategory, searchQuery]);

  if (products.length === 0) {
    return (
      <p className="text-sm text-[var(--ghost-text-muted)]">
        No hay productos disponibles en este momento.
      </p>
    );
  }

  return (
    <div className="ghost-menu">
      {showSearch ? (
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="ghost-menu-search"
          placeholder="Buscar bebida, postre, plato..."
          autoComplete="off"
        />
      ) : null}

      {productsByCategory.length > 1 && !searchQuery.trim() ? (
        <nav className="ghost-menu-nav" aria-label="Categorías del menú">
          {productsByCategory.map((section) => {
            const isActive = activeCategory === section.category;
            return (
              <button
                key={section.category}
                type="button"
                className={[
                  "ghost-menu-nav-chip",
                  isActive ? "ghost-menu-nav-chip-active" : "",
                ].join(" ")}
                aria-current={isActive ? "true" : undefined}
                onClick={() => scrollToCategory(section.category)}
              >
                <span aria-hidden="true" className="mr-1.5">
                  {section.meta.emoji}
                </span>
                {section.label}
              </button>
            );
          })}
        </nav>
      ) : null}

      {productsByCategory.length === 0 ? (
        <p className="text-sm text-[var(--ghost-text-muted)]">
          {searchQuery.trim()
            ? `Sin resultados para "${searchQuery.trim()}".`
            : "No hay productos en esta sección."}
        </p>
      ) : (
        productsByCategory.map((section) => (
          <section
            key={section.category}
            id={categoryAnchorId(section.category)}
            ref={(element) => {
              sectionRefs.current[section.category] = element;
            }}
            className="ghost-menu-section"
            aria-labelledby={`${categoryAnchorId(section.category)}-title`}
          >
            <header className="ghost-menu-section-header">
              <span className="ghost-menu-section-emoji" aria-hidden="true">
                {section.meta.emoji}
              </span>
              <div>
                <h2
                  id={`${categoryAnchorId(section.category)}-title`}
                  className="ghost-menu-section-title"
                >
                  {section.label}
                </h2>
                <p className="ghost-menu-section-tagline">{section.meta.tagline}</p>
                <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">
                  {section.products.length}{" "}
                  {section.products.length === 1 ? "opción" : "opciones"}
                </p>
              </div>
            </header>

            <div className="ghost-menu-grid">
              {section.products.map((product) => {
                const quantity = cartQty[product.id] ?? 0;

                return (
                  <article key={product.id} className="ghost-menu-card">
                    <div className="ghost-menu-card-media">
                      {product.imageDataUrl ? (
                        <img src={product.imageDataUrl} alt={product.name} loading="lazy" />
                      ) : (
                        <div className="ghost-menu-card-placeholder" aria-hidden="true">
                          {section.meta.emoji}
                        </div>
                      )}
                      <span className="ghost-menu-card-price">{formatMoney(product.price)}</span>
                    </div>

                    <div className="ghost-menu-card-body">
                      <h3 className="ghost-menu-card-title">{product.name}</h3>
                      {product.description ? (
                        <p className="ghost-menu-card-description">{product.description}</p>
                      ) : null}

                      {orderMode && onQtyChange ? (
                        <div className="ghost-menu-qty">
                          <button
                            type="button"
                            className="ghost-menu-qty-btn"
                            aria-label={`Menos ${product.name}`}
                            onClick={() =>
                              onQtyChange(product.id, Math.max(0, quantity - 1))
                            }
                          >
                            −
                          </button>
                          <span className="ghost-menu-qty-value">{quantity}</span>
                          <button
                            type="button"
                            className="ghost-menu-qty-btn"
                            aria-label={`Más ${product.name}`}
                            onClick={() => onQtyChange(product.id, quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
