"use client";

import Link from "next/link";
import { useState } from "react";

import { useMenuProducts } from "@/hooks/use-menu-products";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { formatMoney } from "@/lib/format";
import { createMenuProduct, seedDefaultMenu } from "@/lib/pos/pos";
import {
  KITCHEN_STATIONS,
  KITCHEN_STATION_LABELS,
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
  type KitchenStation,
  type MenuCategory,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function PosMenuPage() {
  const { products, loading, error } = useMenuProducts();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<MenuCategory>("beverage");
  const [station, setStation] = useState<KitchenStation>("counter");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

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

  async function handleSeedMenu() {
    setSeedMessage(null);
    setSubmitError(null);
    setSeeding(true);

    try {
      const result = await seedDefaultMenu();
      setSeedMessage(`${result.created} productos de ejemplo creados.`);
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSeeding(false);
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
        <h1 className="text-2xl font-bold">Productos</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Registra lo que vendes. En 1 minuto puedes cargar un menú de cafetería de ejemplo.
        </p>
      </div>

      {products.length === 0 ? (
        <Card title="Inicio rápido">
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Carga bebidas y comida típica de cafetería para empezar a vender de inmediato.
          </p>
          <Button
            className="mt-4"
            onClick={handleSeedMenu}
            disabled={seeding}
            fullWidth
          >
            {seeding ? "Creando menú..." : "Cargar menú de ejemplo"}
          </Button>
          {seedMessage ? (
            <p className="mt-2 text-sm text-[var(--ghost-brand-500)]">{seedMessage}</p>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card title="Agregar producto">
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
              <span className="text-sm font-medium">Comanda</span>
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
              {submitting ? "Guardando..." : "Guardar producto"}
            </Button>
          </form>
        </Card>

        <Card title="Catálogo">
          {loading ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">Cargando...</p>
          ) : error ? (
            <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">
              Agrega productos manualmente o usa el menú de ejemplo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--ghost-border)] text-[var(--ghost-text-muted)]">
                  <tr>
                    <th className="px-2 py-2 font-medium">Producto</th>
                    <th className="px-2 py-2 font-medium">Precio</th>
                    <th className="px-2 py-2 font-medium">Categoría</th>
                    <th className="px-2 py-2 font-medium">Comanda</th>
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
