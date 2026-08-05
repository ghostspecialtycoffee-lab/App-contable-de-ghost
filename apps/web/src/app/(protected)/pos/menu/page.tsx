"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCostMatrixSettings } from "@/hooks/use-cost-matrix-settings";
import { useInventoryItems } from "@/hooks/use-inventory-items";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { buildInventoryCostProfiles } from "@/lib/costing/recipe-costing";
import { formatMoney } from "@/lib/format";
import { createMenuProduct, seedDefaultMenu, updateMenuProductImage } from "@/lib/pos/pos";
import { compressImageFile } from "@/lib/image/compress-image";
import { saveRecipe } from "@/lib/recipes/recipes";
import {
  BASE_UNITS,
  BASE_UNIT_LABELS,
  CO_TAX_CATEGORIES,
  CO_TAX_CATEGORY_LABELS,
  KITCHEN_STATIONS,
  KITCHEN_STATION_LABELS,
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
  calculateCostMatrix,
  calculateRecipeCost,
  getTargetCostPctForCategory,
  inferMenuProductTaxCategory,
  isCoffeeBeverageName,
  type BaseUnit,
  type CoTaxCategory,
  type KitchenStation,
  type MenuCategory,
  type RecipeLineInput,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

const emptyRecipeLine = (): RecipeLineInput => ({
  inventoryItemId: "",
  itemName: "",
  quantity: 0,
  unit: "g",
});

export default function PosMenuPage() {
  const { products, loading, error } = useMenuProducts();
  const costMatrixSettings = useCostMatrixSettings();
  const { items: inventoryItems } = useInventoryItems();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<MenuCategory>("beverage");
  const [station, setStation] = useState<KitchenStation>("counter");
  const [saleTaxCategory, setSaleTaxCategory] = useState<CoTaxCategory>("INC_8");
  const [recipeLines, setRecipeLines] = useState<RecipeLineInput[]>([emptyRecipeLine()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoPayload, setPhotoPayload] = useState<{
    dataUrl: string;
    mimeType: string;
  } | null>(null);

  const itemProfiles = useMemo(
    () => buildInventoryCostProfiles(inventoryItems),
    [inventoryItems],
  );

  const previewRecipeCost = useMemo(() => {
    const validLines = recipeLines.filter(
      (line) => line.inventoryItemId && line.quantity > 0,
    );
    return validLines.length > 0 ? calculateRecipeCost(validLines, itemProfiles) : 0;
  }, [recipeLines, itemProfiles]);

  const suggestedTaxCategory = useMemo(() => {
    const containsCoffeeIngredient = recipeLines.some((line) => {
      const item = inventoryItems.find((entry) => entry.id === line.inventoryItemId);
      return item ? isCoffeeBeverageName(item.name) : false;
    });

    return inferMenuProductTaxCategory({
      name,
      category,
      containsCoffeeIngredient,
    });
  }, [name, category, recipeLines, inventoryItems]);

  useEffect(() => {
    setSaleTaxCategory(suggestedTaxCategory);
  }, [suggestedTaxCategory]);

  const previewMatrix = useMemo(() => {
    const salePrice = Number(price) || 0;
    if (salePrice <= 0) {
      return null;
    }

    const targetCostPct = getTargetCostPctForCategory(category, costMatrixSettings);

    return calculateCostMatrix({
      unitCostNet: previewRecipeCost,
      quantity: 1,
      purchaseTaxCategory: "IVA_19",
      salePriceGross: salePrice,
      saleTaxCategory,
      recipeCost: previewRecipeCost,
      targetCostPct,
      matrixSettings: costMatrixSettings,
    });
  }, [price, category, saleTaxCategory, previewRecipeCost, costMatrixSettings]);

  function updateRecipeLine(index: number, patch: Partial<RecipeLineInput>) {
    setRecipeLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  }

  function linkInventoryToRecipe(index: number, itemId: string) {
    const item = inventoryItems.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    updateRecipeLine(index, {
      inventoryItemId: item.id,
      itemName: item.name,
      unit: item.baseUnit as BaseUnit,
      quantity: lineDefaultQuantity(item.baseUnit as BaseUnit),
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const result = await createMenuProduct({
        name: name.trim(),
        price: Number(price),
        category,
        station,
        saleTaxCategory,
      });

      const validLines = recipeLines.filter(
        (line) => line.inventoryItemId && line.quantity > 0,
      );

      if (validLines.length > 0) {
        await saveRecipe({
          menuProductId: result.productId,
          menuProductName: name.trim(),
          lines: validLines,
        });
      }

      if (photoPayload) {
        await updateMenuProductImage({
          productId: result.productId,
          imageDataUrl: photoPayload.dataUrl,
          imageMimeType: photoPayload.mimeType,
        });
      }

      setName("");
      setPrice("");
      setRecipeLines([emptyRecipeLine()]);
      setPhotoPreview(null);
      setPhotoPayload(null);
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--ghost-text-muted)]">
            <Link href="/pos" className="underline">
              Mostrador
            </Link>
          </p>
          <h1 className="text-2xl font-semibold">Catálogo</h1>
          <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
            Producto, receta, costos e IVA Colombia.{" "}
            <Link href="/costing" className="underline">
              Ver matriz de costeo
            </Link>
            {" · "}
            <Link href="/settings/costing" className="underline">
              Parámetros
            </Link>
          </p>
        </div>
        <Link
          href="/purchases"
          className="text-sm font-medium text-[var(--ghost-brand-500)] underline"
        >
          Facturas de compra
        </Link>
      </div>

      {products.length === 0 ? (
        <Card title="Catálogo base">
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Carga un set inicial de ítems para pruebas internas.
          </p>
          <Button className="mt-4" onClick={handleSeedMenu} disabled={seeding} fullWidth>
            {seeding ? "Cargando..." : "Cargar catálogo base"}
          </Button>
          {seedMessage ? (
            <p className="mt-2 text-sm text-[var(--ghost-brand-500)]">{seedMessage}</p>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div id="nuevo-producto" className="scroll-mt-24">
        <Card title="Agregar ítem con receta">
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
              <span className="text-sm font-medium">Precio venta (COP, con IVA)</span>
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
              <span className="text-sm font-medium">Impuesto venta (incluido en precio)</span>
              <select
                value={saleTaxCategory}
                onChange={(event) =>
                  setSaleTaxCategory(event.target.value as CoTaxCategory)
                }
                className="ghost-input"
              >
                {CO_TAX_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {CO_TAX_CATEGORY_LABELS[item]}
                  </option>
                ))}
              </select>
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

            <div className="rounded-lg border border-dashed border-[var(--ghost-border)] p-3">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) {
                    return;
                  }
                  try {
                    const compressed = await compressImageFile(file);
                    setPhotoPreview(compressed.dataUrl);
                    setPhotoPayload({
                      dataUrl: compressed.dataUrl,
                      mimeType: compressed.mimeType,
                    });
                  } catch (cause) {
                    setSubmitError(getCallableErrorMessage(cause));
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => photoInputRef.current?.click()}
              >
                Foto del producto
              </Button>
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Vista previa"
                  className="mt-2 h-24 w-full rounded-lg object-cover"
                />
              ) : null}
            </div>

            <div className="space-y-2 border-t border-[var(--ghost-border)] pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Receta (ingredientes)</span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRecipeLines((current) => [...current, emptyRecipeLine()])}
                >
                  + Ingrediente
                </Button>
              </div>
              {recipeLines.map((line, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-lg border border-[var(--ghost-border)] p-3"
                >
                  <select
                    value={line.inventoryItemId}
                    onChange={(event) => linkInventoryToRecipe(index, event.target.value)}
                    className="ghost-input"
                  >
                    <option value="">Seleccionar insumo</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · costo {formatMoney(item.averageCost || item.lastCost)}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={line.quantity || ""}
                      onChange={(event) =>
                        updateRecipeLine(index, { quantity: Number(event.target.value) })
                      }
                      className="ghost-input"
                      placeholder="Cantidad"
                    />
                    <select
                      value={line.unit}
                      onChange={(event) =>
                        updateRecipeLine(index, { unit: event.target.value as BaseUnit })
                      }
                      className="ghost-input"
                    >
                      {BASE_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {BASE_UNIT_LABELS[unit]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {previewMatrix ? (
              <div className="rounded-lg bg-[var(--ghost-surface-2)] p-3 text-sm">
                <p>Precio final: {formatMoney(Number(price) || 0)}</p>
                <p>Base gravable: {formatMoney(previewMatrix.salePriceNet)}</p>
                <p>
                  {CO_TAX_CATEGORY_LABELS[saleTaxCategory]} incluido:{" "}
                  {formatMoney(previewMatrix.sale.taxAmount)}
                </p>
                <p>Costo receta: {formatMoney(previewRecipeCost)}</p>
                <p>Food cost: {(previewMatrix.foodCostPct * 100).toFixed(1)}%</p>
                <p>Utilidad bruta: {formatMoney(previewMatrix.grossProfitAmount)}</p>
                <p>Margen neto: {(previewMatrix.grossMarginPct * 100).toFixed(1)}%</p>
                <p>Precio sugerido: {formatMoney(previewMatrix.suggestedSalePriceGross)}</p>
              </div>
            ) : null}

            {submitError ? (
              <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
            ) : null}
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar producto y receta"}
            </Button>
          </form>
        </Card>
        </div>

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
                    <th className="px-2 py-2 font-medium">Costo</th>
                    <th className="px-2 py-2 font-medium">IVA</th>
                    <th className="px-2 py-2 font-medium">Categoría</th>
                    <th className="px-2 py-2 font-medium">Ficha</th>
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
                        {product.recipeCost ? formatMoney(product.recipeCost) : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {CO_TAX_CATEGORY_LABELS[
                          (product.saleTaxCategory ?? "IVA_19") as CoTaxCategory
                        ]}
                      </td>
                      <td className="px-2 py-2">
                        {MENU_CATEGORY_LABELS[product.category]}
                      </td>
                      <td className="px-2 py-2">
                        <Link
                          href={`/costing?product=${product.id}`}
                          className="text-[var(--ghost-brand-500)] underline"
                        >
                          {product.recipeCost ? "Editar" : "Crear"}
                        </Link>
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

function lineDefaultQuantity(unit: BaseUnit): number {
  if (unit === "g" || unit === "ml") {
    return 100;
  }
  if (unit === "kg" || unit === "l") {
    return 0.1;
  }
  return 1;
}
