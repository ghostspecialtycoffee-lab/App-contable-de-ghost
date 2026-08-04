"use client";

import Link from "next/link";
import { useState } from "react";

import { useMenuProducts } from "@/hooks/use-menu-products";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { createMenuProduct } from "@/lib/pos/pos";
import {
  KITCHEN_STATIONS,
  KITCHEN_STATION_LABELS,
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
  type KitchenStation,
  type MenuCategory,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

function formatMoney(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export default function PosMenuPage() {
  const { products, loading, error } = useMenuProducts();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<MenuCategory>("beverage");
  const [station, setStation] = useState<KitchenStation>("counter");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      await createMenuProduct({
        name: name.trim(),
        price: Number(price),
        category,
        station,
      });
      setName("");
      setPrice("");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/pos" className="underline">
            POS
          </Link>
        </p>
        <h1 className="text-2xl font-bold">Menú de venta</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Productos que aparecen en el POS. Asigna estación para comandas de barra o cocina.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card title="Nuevo producto">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Nombre</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="ghost-input"
                placeholder="Latte, Croissant..."
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Precio (COP)</span>
              <input
                required
                type="number"
                min="0"
                step="100"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="ghost-input"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Categoría</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as MenuCategory)}
                className="ghost-input"
              >
                {MENU_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {MENU_CATEGORY_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Estación / comanda</span>
              <select
                value={station}
                onChange={(event) => setStation(event.target.value as KitchenStation)}
                className="ghost-input"
              >
                {KITCHEN_STATIONS.map((item) => (
                  <option key={item} value={item}>
                    {KITCHEN_STATION_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            {submitError ? (
              <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
            ) : null}
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? "Guardando..." : "Agregar producto"}
            </Button>
          </form>
        </Card>

        <Card title="Catálogo POS">
          {loading ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">Cargando...</p>
          ) : error ? (
            <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">
              Crea el primer producto para empezar a vender.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--ghost-border)] text-[var(--ghost-text-muted)]">
                  <tr>
                    <th className="px-2 py-2 font-medium">Producto</th>
                    <th className="px-2 py-2 font-medium">Precio</th>
                    <th className="px-2 py-2 font-medium">Categoría</th>
                    <th className="px-2 py-2 font-medium">Estación</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-[var(--ghost-border)] last:border-0"
                    >
                      <td className="px-2 py-2">{product.name}</td>
                      <td className="px-2 py-2">{formatMoney(product.price)}</td>
                      <td className="px-2 py-2">
                        {MENU_CATEGORY_LABELS[product.category]}
                      </td>
                      <td className="px-2 py-2">
                        {KITCHEN_STATION_LABELS[product.station]}
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
