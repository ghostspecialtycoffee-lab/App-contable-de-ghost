"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { DigitalMenuProductCard } from "@/components/digital-menu-product-card";
import { useBrandAssets } from "@/hooks/use-brand-assets";
import { useDigitalMenuSettings, usePublicDigitalMenu } from "@/hooks/use-digital-menu-settings";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { saveDigitalMenuSettingsClient } from "@/lib/digital-menu/digital-menu-settings-client";
import { compressImageFile } from "@/lib/image/compress-image";
import { createMenuProduct } from "@/lib/pos/pos";
import { buildGuestMenuUrl } from "@/lib/tables/tables";
import { useAuth } from "@/providers/auth-provider";
import {
  BEVERAGE_GROUPS,
  BEVERAGE_GROUP_LABELS,
  DIGITAL_MENU_ACCENT_STYLES,
  DIGITAL_MENU_ACCENT_STYLE_LABELS,
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
  type BeverageGroup,
  type DigitalMenuAccentStyle,
  type MenuCategory,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

type CategoryFilter = MenuCategory | "all";

export default function DigitalMenuDashboardPage() {
  const { organization } = useAuth();
  const membershipOrgId = organization?.id ?? null;
  const { settings, loading: settingsLoading } = useDigitalMenuSettings(membershipOrgId);
  const { products, loading: productsLoading, error: productsError } = useMenuProducts({
    includeInactive: true,
  });
  const { primaryLogo } = useBrandAssets();
  const { config: publicConfig } = usePublicDigitalMenu(membershipOrgId);

  const [heroTitle, setHeroTitle] = useState(settings.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle);
  const [footerNote, setFooterNote] = useState(settings.footerNote);
  const [accentStyle, setAccentStyle] = useState<DigitalMenuAccentStyle>(settings.accentStyle);
  const [showSearch, setShowSearch] = useState(settings.showSearch);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [savingVisual, setSavingVisual] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [visualSaved, setVisualSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState<MenuCategory>("beverage");
  const [newBeverageGroup, setNewBeverageGroup] = useState<BeverageGroup | "">("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const newPhotoRef = useRef<HTMLInputElement>(null);
  const [newPhoto, setNewPhoto] = useState<{ dataUrl: string; mimeType: string } | null>(null);

  useEffect(() => {
    setHeroTitle(settings.heroTitle);
    setHeroSubtitle(settings.heroSubtitle);
    setFooterNote(settings.footerNote);
    setAccentStyle(settings.accentStyle);
    setShowSearch(settings.showSearch);
  }, [settings]);

  const guestMenuUrl = membershipOrgId
    ? buildGuestMenuUrl(membershipOrgId, organization?.slug)
    : null;

  useEffect(() => {
    if (!membershipOrgId || !organization?.name || settingsLoading || publicConfig) {
      return;
    }

    void saveDigitalMenuSettingsClient({
      organizationId: membershipOrgId,
      organizationName: organization.name,
      slug: organization.slug,
      settings,
      logoDataUrl: primaryLogo?.dataUrl,
      logoMimeType: primaryLogo?.mimeType,
    }).catch(() => undefined);
  }, [
    membershipOrgId,
    organization?.name,
    organization?.slug,
    settingsLoading,
    publicConfig,
    settings,
    primaryLogo?.dataUrl,
    primaryLogo?.mimeType,
  ]);

  const activeCount = products.filter((product) => product.status === "active").length;

  const filteredProducts = useMemo(() => {
    const sorted = [...products].sort((left, right) => left.sortOrder - right.sortOrder);
    if (categoryFilter === "all") {
      return sorted;
    }
    return sorted.filter((product) => product.category === categoryFilter);
  }, [products, categoryFilter]);

  const visualDirty =
    heroTitle.trim() !== settings.heroTitle ||
    heroSubtitle.trim() !== settings.heroSubtitle ||
    footerNote.trim() !== settings.footerNote ||
    accentStyle !== settings.accentStyle ||
    showSearch !== settings.showSearch;

  async function handleSaveVisual() {
    if (!membershipOrgId || !organization?.name) {
      return;
    }

    setSavingVisual(true);
    setVisualError(null);
    setVisualSaved(false);

    try {
      await saveDigitalMenuSettingsClient({
        organizationId: membershipOrgId,
        organizationName: organization.name,
        slug: organization.slug,
        settings: {
          heroTitle: heroTitle.trim(),
          heroSubtitle: heroSubtitle.trim(),
          footerNote: footerNote.trim(),
          accentStyle,
          showSearch,
        },
        logoDataUrl: primaryLogo?.dataUrl,
        logoMimeType: primaryLogo?.mimeType,
      });
      setVisualSaved(true);
    } catch (cause) {
      setVisualError(getCallableErrorMessage(cause));
    } finally {
      setSavingVisual(false);
    }
  }

  async function handleCreateProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      const nextSortOrder =
        products.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 10;

      const result = await createMenuProduct({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        price: Number(newPrice),
        category: newCategory,
        station: newCategory === "beverage" ? "bar" : "kitchen",
        status: "inactive",
        sortOrder: nextSortOrder,
        beverageGroup:
          newCategory === "beverage" && newBeverageGroup ? newBeverageGroup : undefined,
      });

      if (newPhoto) {
        const { updateMenuProductImage } = await import("@/lib/pos/pos");
        await updateMenuProductImage({
          productId: result.productId,
          imageDataUrl: newPhoto.dataUrl,
          imageMimeType: newPhoto.mimeType,
        });
      }

      setNewName("");
      setNewDescription("");
      setNewPrice("");
      setNewBeverageGroup("");
      setNewPhoto(null);
    } catch (cause) {
      setCreateError(getCallableErrorMessage(cause));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--ghost-text-muted)]">Solo visualización para clientes</p>
          <h1 className="text-2xl font-semibold">Menú digital</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ghost-text-muted)]">
            Configura lo que ven tus clientes al escanear el QR: fotos, descripciones, precios y
            categorías. El enlace público es independiente del panel administrativo.
          </p>
        </div>
        <Link href="/pos/menu" className="text-sm font-medium text-[var(--ghost-brand-500)] underline">
          Catálogo avanzado (recetas y costos)
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          {guestMenuUrl ? (
            <Card title="Enlace y QR para clientes">
              <p className="text-sm text-[var(--ghost-text-muted)]">
                Imprime este QR en mesas o mostrador. Los clientes solo ven el menú — no pueden
                pedir desde aquí.
              </p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=12&data=${encodeURIComponent(guestMenuUrl)}`}
                alt="QR menú digital"
                className="mx-auto my-4 rounded-xl border border-[var(--ghost-border)] bg-white p-3 shadow-sm"
                width={200}
                height={200}
              />
              <p className="break-all rounded-lg bg-[var(--ghost-surface-2)] p-2 text-[11px] text-[var(--ghost-text-muted)]">
                {guestMenuUrl}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
              href={
                organization?.slug
                  ? `/menu?s=${encodeURIComponent(organization.slug)}`
                  : `/menu?o=${encodeURIComponent(membershipOrgId!)}`
              }
              target="_blank"
            >
                  <Button variant="secondary" type="button">
                    Vista previa
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard?.writeText(guestMenuUrl);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? "Copiado" : "Copiar enlace"}
                </Button>
              </div>
              <p className="mt-3 text-xs text-[var(--ghost-text-muted)]">
                {activeCount} producto(s) visible(s) en el menú público
              </p>
            </Card>
          ) : null}

          <Card title="Apariencia del menú público">
            {settingsLoading ? (
              <p className="text-sm text-[var(--ghost-text-muted)]">Cargando...</p>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSaveVisual();
                }}
              >
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Título principal</span>
                  <input
                    value={heroTitle}
                    onChange={(event) => {
                      setHeroTitle(event.target.value);
                      setVisualSaved(false);
                    }}
                    className="ghost-input"
                    maxLength={80}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Subtítulo</span>
                  <textarea
                    value={heroSubtitle}
                    onChange={(event) => {
                      setHeroSubtitle(event.target.value);
                      setVisualSaved(false);
                    }}
                    className="ghost-input min-h-[80px] resize-y"
                    maxLength={240}
                    rows={3}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Nota al pie</span>
                  <input
                    value={footerNote}
                    onChange={(event) => {
                      setFooterNote(event.target.value);
                      setVisualSaved(false);
                    }}
                    className="ghost-input"
                    maxLength={160}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Estilo visual</span>
                  <select
                    value={accentStyle}
                    onChange={(event) => {
                      setAccentStyle(event.target.value as DigitalMenuAccentStyle);
                      setVisualSaved(false);
                    }}
                    className="ghost-input"
                  >
                    {DIGITAL_MENU_ACCENT_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {DIGITAL_MENU_ACCENT_STYLE_LABELS[style]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showSearch}
                    onChange={(event) => {
                      setShowSearch(event.target.checked);
                      setVisualSaved(false);
                    }}
                  />
                  Mostrar buscador en menú público
                </label>
                {primaryLogo ? (
                  <p className="text-xs text-[var(--ghost-text-muted)]">
                    Logo: se usa el de{" "}
                    <Link href="/brand" className="underline">
                      Identidad de marca
                    </Link>
                    .
                  </p>
                ) : (
                  <p className="text-xs text-[var(--ghost-text-muted)]">
                    <Link href="/brand" className="underline">
                      Sube un logo
                    </Link>{" "}
                    para mostrarlo en el menú público.
                  </p>
                )}
                {visualError ? (
                  <p className="text-sm text-[var(--ghost-danger)]">{visualError}</p>
                ) : null}
                <Button type="submit" fullWidth disabled={savingVisual || !visualDirty}>
                  {savingVisual ? "Publicando..." : visualSaved ? "Publicado" : "Publicar cambios"}
                </Button>
              </form>
            )}
          </Card>

          <Card title="Nuevo producto">
            <form className="space-y-3" onSubmit={handleCreateProduct}>
              <input
                required
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className="ghost-input"
                placeholder="Nombre"
              />
              <textarea
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                className="ghost-input min-h-[64px] resize-y"
                placeholder="Descripción para el cliente"
                rows={2}
              />
              <input
                required
                type="number"
                min="0"
                step="100"
                value={newPrice}
                onChange={(event) => setNewPrice(event.target.value)}
                className="ghost-input"
                placeholder="Precio COP"
              />
              <select
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value as MenuCategory)}
                className="ghost-input"
              >
                {MENU_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {MENU_CATEGORY_LABELS[item]}
                  </option>
                ))}
              </select>
              {newCategory === "beverage" ? (
                <select
                  value={newBeverageGroup}
                  onChange={(event) =>
                    setNewBeverageGroup(event.target.value as BeverageGroup | "")
                  }
                  className="ghost-input"
                >
                  <option value="">Tipo de bebida (opcional)</option>
                  {BEVERAGE_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {BEVERAGE_GROUP_LABELS[group]}
                    </option>
                  ))}
                </select>
              ) : null}
              <input
                ref={newPhotoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) {
                    return;
                  }
                  const compressed = await compressImageFile(file);
                  setNewPhoto({ dataUrl: compressed.dataUrl, mimeType: compressed.mimeType });
                }}
              />
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => newPhotoRef.current?.click()}
              >
                {newPhoto ? "Foto lista" : "Agregar foto"}
              </Button>
              {createError ? (
                <p className="text-sm text-[var(--ghost-danger)]">{createError}</p>
              ) : null}
              <Button type="submit" fullWidth disabled={creating}>
                {creating ? "Creando..." : "Crear (inactivo hasta activar)"}
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={[
                "rounded-full px-4 py-2 text-sm font-medium transition",
                categoryFilter === "all"
                  ? "bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)]"
                  : "border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)]",
              ].join(" ")}
              onClick={() => setCategoryFilter("all")}
            >
              Todos ({products.length})
            </button>
            {MENU_CATEGORIES.map((category) => {
              const count = products.filter((product) => product.category === category).length;
              if (count === 0) {
                return null;
              }
              return (
                <button
                  key={category}
                  type="button"
                  className={[
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    categoryFilter === category
                      ? "bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)]"
                      : "border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)]",
                  ].join(" ")}
                  onClick={() => setCategoryFilter(category)}
                >
                  {MENU_CATEGORY_LABELS[category]} ({count})
                </button>
              );
            })}
          </div>

          {productsLoading ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">Cargando productos...</p>
          ) : productsError ? (
            <p className="text-sm text-[var(--ghost-danger)]">{productsError}</p>
          ) : filteredProducts.length === 0 ? (
            <Card title="Sin productos">
              <p className="text-sm text-[var(--ghost-text-muted)]">
                Crea tu primer producto o importa desde el catálogo avanzado.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredProducts.map((product, index) => (
                <DigitalMenuProductCard
                  key={product.id}
                  product={product}
                  canMoveUp={index > 0}
                  canMoveDown={index < filteredProducts.length - 1}
                  onMove={(direction) => {
                    const swapIndex = direction === "up" ? index - 1 : index + 1;
                    if (swapIndex < 0 || swapIndex >= filteredProducts.length) {
                      return;
                    }

                    const reordered = [...filteredProducts];
                    const current = reordered[index];
                    const neighbor = reordered[swapIndex];
                    if (!current || !neighbor) {
                      return;
                    }

                    reordered[index] = neighbor;
                    reordered[swapIndex] = current;

                    void (async () => {
                      const { updateMenuProduct } = await import("@/lib/pos/pos");
                      await Promise.all(
                        reordered.map((item, itemIndex) =>
                          updateMenuProduct({
                            productId: item.id,
                            sortOrder: (itemIndex + 1) * 10,
                          }),
                        ),
                      );
                    })();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
