"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getCallableErrorMessage } from "@/lib/auth/errors";
import { formatMoney } from "@/lib/format";
import { toggleMenuProductStatus, updateMenuProduct, deleteMenuProduct } from "@/lib/pos/pos";
import {
  CO_TAX_CATEGORY_LABELS,
  MENU_CATEGORY_LABELS,
  MENU_PRODUCT_STATUS_LABELS,
  type CoTaxCategory,
  type MenuProduct,
} from "@ghost/domain";
import { Button } from "@ghost/ui";

export function CatalogProductRow({ product }: { product: MenuProduct }) {
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description ?? "");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrice(String(product.price));
    setDescription(product.description ?? "");
  }, [product.price, product.description]);

  const isDirty =
    Number(price) !== product.price || description.trim() !== (product.description ?? "").trim();

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await updateMenuProduct({
        productId: product.id,
        price: Number(price),
        description: description.trim(),
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
      setError("Define un precio mayor a cero antes de activar el producto.");
      return;
    }

    setToggling(true);
    setError(null);

    try {
      if (isDirty) {
        await updateMenuProduct({
          productId: product.id,
          price: Number(price),
          description: description.trim(),
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

  async function handleDelete() {
    const confirmed = window.confirm(
      `¿Eliminar "${product.name}" del menú?\n\nSe borrará el producto y su ficha de costos. Las ventas anteriores no se modifican.`,
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteMenuProduct({ productId: product.id });
    } catch (cause) {
      setError(getCallableErrorMessage(cause));
    } finally {
      setDeleting(false);
    }
  }

  const taxCategory = (product.saleTaxCategory ?? "IVA_19") as CoTaxCategory;

  return (
    <tr
      className={[
        "border-b border-[var(--ghost-border)] last:border-0",
        product.status === "inactive" ? "opacity-70" : "",
      ].join(" ")}
    >
      <td className="px-2 py-2 align-top">
        <p className="font-medium">{product.name}</p>
        <p className="text-xs text-[var(--ghost-text-muted)]">
          {MENU_CATEGORY_LABELS[product.category]} · {CO_TAX_CATEGORY_LABELS[taxCategory]}
        </p>
      </td>
      <td className="px-2 py-2 align-top">
        <input
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setSaved(false);
          }}
          className="ghost-input min-w-[10rem]"
          placeholder="Ej. Lata 350 ml, porción..."
        />
      </td>
      <td className="px-2 py-2 align-top">
        <input
          type="number"
          min="0"
          step="100"
          value={price}
          onChange={(event) => {
            setPrice(event.target.value);
            setSaved(false);
          }}
          className="ghost-input w-28"
        />
        {product.recipeCost ? (
          <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">
            Costo {formatMoney(product.recipeCost)}
          </p>
        ) : null}
      </td>
      <td className="px-2 py-2 align-top">
        <span
          className={[
            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
            product.status === "active"
              ? "bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)]"
              : "bg-[var(--ghost-surface-2)] text-[var(--ghost-text-muted)]",
          ].join(" ")}
        >
          {MENU_PRODUCT_STATUS_LABELS[product.status]}
        </span>
      </td>
      <td className="px-2 py-2 align-top">
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="sm"
            variant={product.status === "active" ? "secondary" : "primary"}
            disabled={toggling || saving || deleting}
            onClick={handleToggleStatus}
          >
            {toggling
              ? "..."
              : product.status === "active"
                ? "Desactivar"
                : "Activar en menú"}
          </Button>
          {isDirty ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={saving || deleting}
              onClick={handleSave}
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          ) : saved ? (
            <span className="text-xs text-[var(--ghost-brand-500)]">Guardado</span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={deleting || saving || toggling}
            onClick={handleDelete}
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
          <Link
            href={`/costing?product=${product.id}`}
            className="text-xs text-[var(--ghost-brand-500)] underline"
          >
            {product.recipeCost ? "Editar ficha" : "Crear ficha"}
          </Link>
          {error ? <p className="text-xs text-[var(--ghost-danger)]">{error}</p> : null}
        </div>
      </td>
    </tr>
  );
}
