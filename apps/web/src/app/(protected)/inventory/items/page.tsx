"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { OperationalHint } from "@/components/operational-model-panel";
import { PageHeader } from "@/components/page-header";
import { useInventoryItems } from "@/hooks/use-inventory-items";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { formatMoney } from "@/lib/format";
import { createInventoryItem } from "@/lib/inventory/inventory";
import {
  BASE_UNITS,
  BASE_UNIT_LABELS,
  INVENTORY_ITEM_TYPES,
  INVENTORY_ITEM_TYPE_LABELS,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  formatPresentationLabel,
  type BaseUnit,
  type InventoryItemType,
  type ProductCategory,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

function suggestPresentation(baseUnit: BaseUnit): {
  purchaseUnit: BaseUnit;
  presentationQuantity: number;
} {
  if (baseUnit === "g") {
    return { purchaseUnit: "kg", presentationQuantity: 1000 };
  }
  if (baseUnit === "ml") {
    return { purchaseUnit: "l", presentationQuantity: 1000 };
  }
  return { purchaseUnit: baseUnit, presentationQuantity: 1 };
}

export default function InventoryItemsPage() {
  const { items, loading, error } = useInventoryItems();
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<InventoryItemType>("raw_material");
  const [category, setCategory] = useState<ProductCategory>("alimenticio");
  const [baseUnit, setBaseUnit] = useState<BaseUnit>("g");
  const [purchaseUnit, setPurchaseUnit] = useState<BaseUnit>("kg");
  const [presentationQuantity, setPresentationQuantity] = useState("1000");
  const [presentationLabel, setPresentationLabel] = useState("");
  const [minStock, setMinStock] = useState("0");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const suggestion = suggestPresentation(baseUnit);
    setPurchaseUnit(suggestion.purchaseUnit);
    setPresentationQuantity(String(suggestion.presentationQuantity));
  }, [baseUnit]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      await createInventoryItem({
        sku,
        name,
        type,
        category,
        baseUnit,
        purchaseUnit,
        presentationQuantity: Number(presentationQuantity) || 1,
        presentationLabel,
        minStock: Number(minStock),
      });
      setSku("");
      setName("");
      setPresentationLabel("");
      setMinStock("0");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  const previewPresentation = formatPresentationLabel({
    presentationLabel,
    purchaseUnit,
    presentationQuantity: Number(presentationQuantity) || 1,
    baseUnit,
  });

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title="Insumos"
        description="Catálogo de bodega: alimenticio entra al food cost; menaje no. El costo promedio se guarda por unidad base."
        backHref="/inventory"
        backLabel="Inventario"
      />

      <OperationalHint context="inventory" />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/purchases" className="ghost-pill-link">
          Compras →
        </Link>
        <Link href="/guia#productos" className="ghost-pill-link">
          Clases de producto
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card title="Nuevo ítem">
          <form className="space-y-3" onSubmit={handleCreate}>
            <label className="block space-y-1">
              <span className="text-sm font-medium">SKU</span>
              <input
                required
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                className="ghost-input"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Nombre</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="ghost-input"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Tipo</span>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as InventoryItemType)
                }
                className="ghost-input"
              >
                {INVENTORY_ITEM_TYPES.map((itemType) => (
                  <option key={itemType} value={itemType}>
                    {INVENTORY_ITEM_TYPE_LABELS[itemType]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Clase</span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ProductCategory)
                }
                className="ghost-input"
              >
                {PRODUCT_CATEGORIES.filter((entry) => entry !== "operativo").map(
                  (entry) => (
                    <option key={entry} value={entry}>
                      {PRODUCT_CATEGORY_LABELS[entry]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Unidad de costeo (base)</span>
              <select
                value={baseUnit}
                onChange={(event) => setBaseUnit(event.target.value as BaseUnit)}
                className="ghost-input"
              >
                {BASE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {BASE_UNIT_LABELS[unit]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Unidad de compra</span>
              <select
                value={purchaseUnit}
                onChange={(event) => setPurchaseUnit(event.target.value as BaseUnit)}
                className="ghost-input"
              >
                {BASE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {BASE_UNIT_LABELS[unit]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Cantidad base por compra</span>
              <input
                required
                type="number"
                min="0.001"
                step="0.001"
                value={presentationQuantity}
                onChange={(event) => setPresentationQuantity(event.target.value)}
                className="ghost-input"
              />
              <span className="text-xs text-[var(--ghost-text-muted)]">
                Ej: 1 kg = 1000 g → unidad compra kg, cantidad 1000, base g
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Presentación (opcional)</span>
              <input
                value={presentationLabel}
                onChange={(event) => setPresentationLabel(event.target.value)}
                className="ghost-input"
                placeholder="Saco 1 kg, Caja x100"
              />
            </label>
            {previewPresentation ? (
              <p className="rounded-lg bg-[var(--ghost-surface-2)] p-2 text-xs text-[var(--ghost-text-muted)]">
                Presentación: {previewPresentation}
              </p>
            ) : null}
            <label className="block space-y-1">
              <span className="text-sm font-medium">Stock mínimo (unidad base)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={minStock}
                onChange={(event) => setMinStock(event.target.value)}
                className="ghost-input"
              />
            </label>
            {submitError ? (
              <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
            ) : null}
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? "Guardando..." : "Crear ítem"}
            </Button>
          </form>
        </Card>

        <Card title="Catálogo de insumos">
          {loading ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">Cargando ítems...</p>
          ) : error ? (
            <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">
              Crea materias primas aquí y luego regístralas en compras para obtener costos
              reales.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--ghost-border)] text-[var(--ghost-text-muted)]">
                  <tr>
                    <th className="px-2 py-2 font-medium">SKU</th>
                    <th className="px-2 py-2 font-medium">Nombre</th>
                    <th className="px-2 py-2 font-medium">Clase</th>
                    <th className="px-2 py-2 font-medium">Costeo</th>
                    <th className="px-2 py-2 font-medium">Presentación</th>
                    <th className="px-2 py-2 font-medium">Costo / base</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[var(--ghost-border)] last:border-0"
                    >
                      <td className="px-2 py-2 font-mono text-xs">{item.sku}</td>
                      <td className="px-2 py-2">{item.name}</td>
                      <td className="px-2 py-2 text-xs text-[var(--ghost-text-muted)]">
                        {item.category
                          ? PRODUCT_CATEGORY_LABELS[
                              item.category as ProductCategory
                            ] ?? item.category
                          : "—"}
                      </td>
                      <td className="px-2 py-2">{item.baseUnit}</td>
                      <td className="px-2 py-2 text-xs text-[var(--ghost-text-muted)]">
                        {formatPresentationLabel({
                          presentationLabel: item.presentationLabel,
                          purchaseUnit: item.purchaseUnit,
                          presentationQuantity: item.presentationQuantity,
                          baseUnit: item.baseUnit,
                        })}
                      </td>
                      <td className="px-2 py-2">
                        {formatMoney(item.averageCost || item.lastCost)}/{item.baseUnit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
