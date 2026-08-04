"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useInventoryItems } from "@/hooks/use-inventory-items";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { useRecipes } from "@/hooks/use-recipes";
import {
  CO_COST_MATRIX_DEFAULTS,
  CO_TAX_CATEGORIES,
  CO_TAX_CATEGORY_LABELS,
  calculateCostMatrix,
  calculateRecipeCost,
  type CoTaxCategory,
} from "@ghost/domain";
import { Card } from "@ghost/ui";
import { formatMoney } from "@/lib/format";

export default function CostingPage() {
  const { products } = useMenuProducts();
  const { recipes } = useRecipes();
  const { items: inventoryItems } = useInventoryItems();
  const [productId, setProductId] = useState("");

  const selectedProduct = products.find((product) => product.id === productId) ?? products[0];
  const selectedRecipe = selectedProduct
    ? recipes.find((recipe) => recipe.menuProductId === selectedProduct.id)
    : null;

  const unitCosts = useMemo(() => {
    const costs: Record<string, number> = {};
    for (const item of inventoryItems) {
      costs[item.id] = item.averageCost || item.lastCost || 0;
    }
    return costs;
  }, [inventoryItems]);

  const recipeCost = selectedRecipe
    ? calculateRecipeCost(selectedRecipe.lines, unitCosts)
    : selectedProduct?.recipeCost ?? 0;

  const targetCostPct =
    selectedProduct?.category === "beverage"
      ? CO_COST_MATRIX_DEFAULTS.targetBeverageCostPct
      : CO_COST_MATRIX_DEFAULTS.targetFoodCostPct;

  const matrix = selectedProduct
    ? calculateCostMatrix({
        unitCostNet: recipeCost,
        quantity: 1,
        purchaseTaxCategory: "IVA_19",
        salePriceGross: selectedProduct.price,
        saleTaxCategory: (selectedProduct.saleTaxCategory ?? "IVA_19") as CoTaxCategory,
        recipeCost,
        targetCostPct,
      })
    : null;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/pos/menu" className="underline">
            Catálogo
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Costeo e impuestos</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Matriz de costos con IVA Colombia, margen y referencias de retención.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card title="Producto">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Seleccionar ítem del catálogo</span>
            <select
              value={productId || products[0]?.id || ""}
              onChange={(event) => setProductId(event.target.value)}
              className="ghost-input"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          {selectedProduct ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--ghost-text-muted)]">Precio venta</dt>
                <dd>{formatMoney(selectedProduct.price)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--ghost-text-muted)]">IVA venta</dt>
                <dd>
                  {CO_TAX_CATEGORY_LABELS[
                    (selectedProduct.saleTaxCategory ?? "IVA_19") as CoTaxCategory
                  ]}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--ghost-text-muted)]">Costo receta</dt>
                <dd>{formatMoney(recipeCost)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[var(--ghost-text-muted)]">
              Crea productos en el catálogo para ver costeo.
            </p>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Matriz Colombia (referencia operativa)">
            {matrix ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Metric
                  label="Food cost"
                  value={`${(matrix.foodCostPct * 100).toFixed(1)}%`}
                  hint={`Meta ${(targetCostPct * 100).toFixed(0)}%`}
                />
                <Metric
                  label="Margen bruto"
                  value={`${(matrix.grossMarginPct * 100).toFixed(1)}%`}
                />
                <Metric label="Precio neto venta" value={formatMoney(matrix.salePriceNet)} />
                <Metric label="IVA venta" value={formatMoney(matrix.sale.taxAmount)} />
                <Metric
                  label="Precio sugerido"
                  value={formatMoney(matrix.suggestedSalePriceGross)}
                  hint="Según meta de costo"
                />
                <Metric
                  label="ReteIVA ref."
                  value={formatMoney(matrix.reteIvaReference)}
                  hint={`${CO_COST_MATRIX_DEFAULTS.reteIvaPct * 100}% sobre IVA`}
                />
                <Metric
                  label="Retefuente ref."
                  value={formatMoney(matrix.reteFuenteReference)}
                  hint={`${CO_COST_MATRIX_DEFAULTS.reteFuenteGoodsPct * 100}% bienes`}
                />
              </div>
            ) : (
              <p className="text-sm text-[var(--ghost-text-muted)]">Sin datos de costeo.</p>
            )}
          </Card>

          <Card title="Parámetros base Colombia">
            <ul className="space-y-2 text-sm text-[var(--ghost-text-muted)]">
              <li>Meta food cost: {(CO_COST_MATRIX_DEFAULTS.targetFoodCostPct * 100).toFixed(0)}%</li>
              <li>
                Meta bebidas: {(CO_COST_MATRIX_DEFAULTS.targetBeverageCostPct * 100).toFixed(0)}%
              </li>
              <li>
                Categorías IVA:{" "}
                {CO_TAX_CATEGORIES.map((category) => CO_TAX_CATEGORY_LABELS[category]).join(" · ")}
              </li>
            </ul>
          </Card>

          {selectedRecipe ? (
            <Card title="Receta">
              <ul className="space-y-1 text-sm">
                {selectedRecipe.lines.map((line, index) => (
                  <li key={index} className="flex justify-between gap-2">
                    <span>
                      {line.itemName} · {line.quantity} {line.unit}
                    </span>
                    <span>
                      {formatMoney(
                        Math.round(line.quantity * (unitCosts[line.inventoryItemId] ?? 0)),
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : selectedProduct ? (
            <Card title="Receta">
              <p className="text-sm text-[var(--ghost-text-muted)]">
                Este producto no tiene receta. Agrégala al crear el ítem en{" "}
                <Link href="/pos/menu" className="underline">
                  Catálogo
                </Link>
                .
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--ghost-border)] p-3">
      <p className="text-xs uppercase text-[var(--ghost-text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">{hint}</p> : null}
    </div>
  );
}
