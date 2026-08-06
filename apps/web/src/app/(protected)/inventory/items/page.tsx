"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { InitialDataImportPanel } from "@/components/initial-data-import-panel";
import { InventoryItemPresentationEditor } from "@/components/inventory-item-presentation-editor";
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
  resolveUnitCostPerBase,
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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

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

  const groupedItems = useMemo(() => {
    const groups = new Map<ProductCategory, typeof items>();

    for (const category of PRODUCT_CATEGORIES.filter((entry) => entry !== "operativo")) {
      groups.set(category, []);
    }

    for (const item of items) {
      const category = (item.category as ProductCategory) ?? "alimenticio";
      if (category === "operativo") {
        continue;
      }
      const bucket = groups.get(category) ?? groups.get("alimenticio")!;
      bucket.push(item);
    }

    return [...groups.entries()].filter(([, groupItems]) => groupItems.length > 0);
  }, [items]);

  return (
    <div className="ghost-page-stack pb-4">
      <PageHeader
        title="Insumos"
        backHref="/inventory"
        backLabel="Inventario"
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/purchases" className="ghost-pill-link">
          Compras
        </Link>
      </div>

      {!loading && items.length === 0 ? (
        <InitialDataImportPanel compact warehouseId={undefined} />
      ) : null}

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
              <span className="text-sm font-medium">
                Cuántos {baseUnit === "g" ? "gramos" : baseUnit === "ml" ? "ml" : BASE_UNIT_LABELS[baseUnit].toLowerCase()} trae 1 unidad de compra
              </span>
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
                Ej: bolsa café 2,5 kg → compra <strong>bag</strong>, cantidad <strong>2500</strong>, base g.
                Leche 1 L → compra <strong>unit</strong>, cantidad <strong>1000</strong>, base ml.
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
          <p className="mb-4 text-sm text-[var(--ghost-text-muted)]">
            Define aquí cada insumo con su presentación (g/ml por unidad). Las facturas de compra solo
            vinculan a estos ítems; no crean ni configuran el inventario.
          </p>
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
            <div className="space-y-6">
              {groupedItems.map(([groupCategory, groupItems]) => (
                <section key={groupCategory} className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    {PRODUCT_CATEGORY_LABELS[groupCategory]}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-[var(--ghost-border)] text-[var(--ghost-text-muted)]">
                        <tr>
                          <th className="px-2 py-2 font-medium">SKU</th>
                          <th className="px-2 py-2 font-medium">Nombre</th>
                          <th className="px-2 py-2 font-medium">Tipo</th>
                          <th className="px-2 py-2 font-medium">Costeo</th>
                          <th className="px-2 py-2 font-medium">Presentación</th>
                          <th className="px-2 py-2 font-medium">Costo / base</th>
                          <th className="px-2 py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {groupItems.map((item) => (
                          <Fragment key={item.id}>
                            <tr className="border-b border-[var(--ghost-border)] last:border-0">
                              <td className="px-2 py-2 font-mono text-xs">{item.sku}</td>
                              <td className="px-2 py-2">{item.name}</td>
                              <td className="px-2 py-2 text-xs text-[var(--ghost-text-muted)]">
                                {INVENTORY_ITEM_TYPE_LABELS[item.type]}
                              </td>
                              <td className="px-2 py-2">{item.baseUnit}</td>
                              <td className="px-2 py-2 text-xs text-[var(--ghost-text-muted)]">
                                {formatPresentationLabel({
                                  presentationLabel: item.presentationLabel,
                                  purchaseUnit: item.purchaseUnit,
                                  presentationQuantity: item.presentationQuantity,
                                  baseUnit: item.baseUnit,
                                }) || (
                                  <span className="text-[var(--ghost-danger)]">Sin definir</span>
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {(() => {
                                  const rawCost = item.averageCost || item.lastCost;
                                  const unitCost = resolveUnitCostPerBase({
                                    baseUnit: item.baseUnit,
                                    averageCost: rawCost,
                                    purchaseUnit: item.purchaseUnit,
                                    presentationQuantity: item.presentationQuantity,
                                  });
                                  const presentation = formatPresentationLabel({
                                    presentationLabel: item.presentationLabel,
                                    purchaseUnit: item.purchaseUnit,
                                    presentationQuantity: item.presentationQuantity,
                                    baseUnit: item.baseUnit,
                                  });
                                  return (
                                    <div className="space-y-0.5">
                                      <span>
                                        {formatMoney(unitCost)}/{item.baseUnit}
                                      </span>
                                      {rawCost > 0 && unitCost !== rawCost && presentation ? (
                                        <p className="text-[10px] text-[var(--ghost-text-muted)]">
                                          Compra: {formatMoney(rawCost)} ({presentation})
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-2 py-2 text-right">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={editingItemId === item.id ? "secondary" : "ghost"}
                                  onClick={() =>
                                    setEditingItemId((current) =>
                                      current === item.id ? null : item.id,
                                    )
                                  }
                                >
                                  {editingItemId === item.id ? "Cerrar" : "Editar"}
                                </Button>
                              </td>
                            </tr>
                            {editingItemId === item.id ? (
                              <tr key={`${item.id}-edit`} className="border-b border-[var(--ghost-border)]">
                                <td colSpan={7} className="px-2 py-3">
                                  <InventoryItemPresentationEditor
                                    item={item}
                                    onSaved={() => setEditingItemId(null)}
                                    onCancel={() => setEditingItemId(null)}
                                  />
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
