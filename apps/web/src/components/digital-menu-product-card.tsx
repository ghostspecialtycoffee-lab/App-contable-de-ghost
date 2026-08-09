"use client";

import { useRef, useState } from "react";

import { getCallableErrorMessage } from "@/lib/auth/errors";
import { compressImageFile } from "@/lib/image/compress-image";
import { formatMoney } from "@/lib/format";
import {
  toggleMenuProductStatus,
  updateMenuProduct,
  updateMenuProductImage,
} from "@/lib/pos/pos";
import {
  BEVERAGE_GROUPS,
  BEVERAGE_GROUP_LABELS,
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
  MENU_PRODUCT_STATUS_LABELS,
  type BeverageGroup,
  type MenuCategory,
  type MenuProduct,
} from "@ghost/domain";
import { Button } from "@ghost/ui";

interface DigitalMenuProductCardProps {
  product: MenuProduct;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMove?: (direction: "up" | "down") => void;
}

export function DigitalMenuProductCard({
  product,
  canMoveUp = false,
  canMoveDown = false,
  onMove,
}: DigitalMenuProductCardProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState(String(product.price));
  const [category, setCategory] = useState<MenuCategory>(product.category);
  const [beverageGroup, setBeverageGroup] = useState<BeverageGroup | "">(
    product.beverageGroup ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [imagePreview, setImagePreview] = useState(product.imageDataUrl ?? null);

  const isDirty =
    name.trim() !== product.name ||
    description.trim() !== (product.description ?? "").trim() ||
    Number(price) !== product.price ||
    category !== product.category ||
    (beverageGroup || undefined) !== product.beverageGroup;

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await updateMenuProduct({
        productId: product.id,
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        beverageGroup: category === "beverage" && beverageGroup ? beverageGroup : null,
      });
      setSaved(true);
    } catch (cause) {
      setError(getCallableErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    const nextStatus = product.status === "active" ? "inactive" : "active";

    if (nextStatus === "active" && (Number(price) <= 0 || !price)) {
      setError("Define un precio mayor a cero antes de activar.");
      return;
    }

    setToggling(true);
    setError(null);

    try {
      if (isDirty) {
        await updateMenuProduct({
          productId: product.id,
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          category,
          beverageGroup: category === "beverage" && beverageGroup ? beverageGroup : null,
        });
      }

      await toggleMenuProductStatus({
        productId: product.id,
        status: nextStatus,
      });
    } catch (cause) {
      setError(getCallableErrorMessage(cause));
    } finally {
      setToggling(false);
    }
  }

  async function handlePhotoChange(file: File) {
    setUploadingPhoto(true);
    setError(null);

    try {
      const compressed = await compressImageFile(file);
      await updateMenuProductImage({
        productId: product.id,
        imageDataUrl: compressed.dataUrl,
        imageMimeType: compressed.mimeType,
      });
      setImagePreview(compressed.dataUrl);
    } catch (cause) {
      setError(getCallableErrorMessage(cause));
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <article
      className={[
        "overflow-hidden rounded-2xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)]",
        product.status === "inactive" ? "opacity-75" : "",
      ].join(" ")}
    >
      <div className="relative aspect-[4/3] bg-[var(--ghost-surface-2)]">
        {imagePreview ? (
          <img src={imagePreview} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-[var(--ghost-text-muted)]">
            📷
          </div>
        )}
        <span
          className={[
            "absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold",
            product.status === "active"
              ? "bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)]"
              : "bg-[var(--ghost-surface-0)] text-[var(--ghost-text-muted)]",
          ].join(" ")}
        >
          {MENU_PRODUCT_STATUS_LABELS[product.status]}
        </span>
        <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-sm font-semibold text-white">
          {formatMoney(Number(price) || 0)}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          className="ghost-input text-base font-semibold"
          placeholder="Nombre del producto"
        />

        <textarea
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setSaved(false);
          }}
          className="ghost-input min-h-[72px] resize-y text-sm"
          placeholder="Descripción para el cliente..."
          rows={3}
        />

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-[var(--ghost-text-muted)]">Precio COP</span>
            <input
              type="number"
              min="0"
              step="100"
              value={price}
              onChange={(event) => {
                setPrice(event.target.value);
                setSaved(false);
              }}
              className="ghost-input"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-[var(--ghost-text-muted)]">Categoría</span>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as MenuCategory);
                setSaved(false);
              }}
              className="ghost-input"
            >
              {MENU_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {MENU_CATEGORY_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {category === "beverage" ? (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--ghost-text-muted)]">
              Tipo de bebida
            </span>
            <select
              value={beverageGroup}
              onChange={(event) => {
                setBeverageGroup(event.target.value as BeverageGroup | "");
                setSaved(false);
              }}
              className="ghost-input"
            >
              <option value="">Sin subtipo</option>
              {BEVERAGE_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {BEVERAGE_GROUP_LABELS[group]}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <input
          ref={photoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              void handlePhotoChange(file);
            }
          }}
        />

        <div className="flex flex-wrap gap-2">
          {onMove ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!canMoveUp}
                onClick={() => onMove("up")}
                aria-label="Subir en el menú"
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!canMoveDown}
                onClick={() => onMove("down")}
                aria-label="Bajar en el menú"
              >
                ↓
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={uploadingPhoto}
            onClick={() => photoInputRef.current?.click()}
          >
            {uploadingPhoto ? "Subiendo..." : "Cambiar foto"}
          </Button>
          {isDirty ? (
            <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          ) : saved ? (
            <span className="self-center text-xs text-[var(--ghost-brand-500)]">Guardado</span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={product.status === "active" ? "secondary" : "primary"}
            disabled={toggling || saving}
            onClick={handleToggleStatus}
          >
            {toggling
              ? "..."
              : product.status === "active"
                ? "Ocultar del menú"
                : "Mostrar en menú"}
          </Button>
        </div>

        {error ? <p className="text-xs text-[var(--ghost-danger)]">{error}</p> : null}
      </div>
    </article>
  );
}
