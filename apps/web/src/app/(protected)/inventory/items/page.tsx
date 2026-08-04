"use client";

import Link from "next/link";
import { useState } from "react";

import { useInventoryItems } from "@/hooks/use-inventory-items";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { callCreateInventoryItem } from "@/lib/firebase/functions";
import {
  BASE_UNITS,
  BASE_UNIT_LABELS,
  INVENTORY_ITEM_TYPES,
  INVENTORY_ITEM_TYPE_LABELS,
  type BaseUnit,
  type InventoryItemType,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function InventoryItemsPage() {
  const { items, loading, error } = useInventoryItems();
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<InventoryItemType>("raw_material");
  const [baseUnit, setBaseUnit] = useState<BaseUnit>("kg");
  const [minStock, setMinStock] = useState("0");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      await callCreateInventoryItem({
        sku,
        name,
        type,
        baseUnit,
        minStock: Number(minStock),
      });
      setSku("");
      setName("");
      setMinStock("0");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--ghost-text-muted)]">
            <Link href="/inventory" className="underline">
              Inventario
            </Link>
          </p>
          <h1 className="text-2xl font-bold">Ítems</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card title="Nuevo ítem" description="Materias primas, insumos y productos.">
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
              <span className="text-sm font-medium">Unidad base</span>
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
              <span className="text-sm font-medium">Stock mínimo</span>
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

        <Card title="Catálogo" description="Listado en tiempo real desde Firestore.">
          {loading ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">Cargando ítems...</p>
          ) : error ? (
            <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">
              Aún no hay ítems. Crea el primero con el formulario.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--ghost-border)] text-[var(--ghost-text-muted)]">
                  <tr>
                    <th className="px-2 py-2 font-medium">SKU</th>
                    <th className="px-2 py-2 font-medium">Nombre</th>
                    <th className="px-2 py-2 font-medium">Tipo</th>
                    <th className="px-2 py-2 font-medium">Unidad</th>
                    <th className="px-2 py-2 font-medium">Costo prom.</th>
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
                      <td className="px-2 py-2">
                        {INVENTORY_ITEM_TYPE_LABELS[item.type]}
                      </td>
                      <td className="px-2 py-2">{item.baseUnit}</td>
                      <td className="px-2 py-2">
                        {item.averageCost.toLocaleString("es-CO", {
                          style: "currency",
                          currency: "COP",
                          maximumFractionDigits: 0,
                        })}
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
