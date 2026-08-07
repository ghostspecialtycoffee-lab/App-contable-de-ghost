"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { RecipeYieldField } from "@/components/recipe-yield-field";
import { ProductCostPanoramaPanel } from "@/components/product-cost-panorama-panel";
import { BeverageAdvancedSetupPanel } from "@/components/beverage-advanced-setup-panel";
import { useCostMatrixSettings } from "@/hooks/use-cost-matrix-settings";
import { useInventoryItems } from "@/hooks/use-inventory-items";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { useRecipes } from "@/hooks/use-recipes";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { formatMoney } from "@/lib/format";
import { buildInventoryCostProfiles, getResolvedUnitCost } from "@/lib/costing/recipe-costing";
import { seedCostMatrix } from "@/lib/costing/seed-cost-matrix";
import { updateMenuProduct } from "@/lib/pos/pos";
import { saveRecipe } from "@/lib/recipes/recipes";
import {
  BASE_UNITS,
  BASE_UNIT_LABELS,
  CO_TAX_CATEGORIES,
  CO_TAX_CATEGORY_LABELS,
  buildProductCostPanorama,
  calculateCostMatrix,
  calculatePastryPortionCost,
  calculateRecipeBatchCost,
  calculateRecipeCostBreakdown,
  calculateRecipeLineCost,
  getCostBasisNote,
  getTargetCostPctForCategory,
  inferMenuProductTaxCategory,
  isCoffeeBeverageName,
  PASTRY_DOMICILIO_ALLOCATION_COP,
  suggestRecipeYieldForProduct,
  type BaseUnit,
  type BeverageAdvancedSetupAnswers,
  type CoTaxCategory,
  type RecipeLineInput,
  getBeverageAdvancedSetupProgress,
  getBeverageAdvancedSetupSpec,
  needsBeverageAdvancedSetup,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

const emptyRecipeLine = (): RecipeLineInput => ({
  inventoryItemId: "",
  itemName: "",
  quantity: 0,
  unit: "g",
});

export default function CostingPage() {
  const searchParams = useSearchParams();
  const costMatrixSettings = useCostMatrixSettings();
  const { products } = useMenuProducts();
  const { recipes } = useRecipes();
  const { items: inventoryItems } = useInventoryItems();
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [saleTaxCategory, setSaleTaxCategory] = useState<CoTaxCategory>("IVA_19");
  const [recipeLines, setRecipeLines] = useState<RecipeLineInput[]>([emptyRecipeLine()]);
  const [yieldQuantity, setYieldQuantity] = useState(1);
  const [advancedSetupAnswers, setAdvancedSetupAnswers] = useState<BeverageAdvancedSetupAnswers>(
    {},
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [seedWarnings, setSeedWarnings] = useState<string[]>([]);

  const selectedProduct = products.find((product) => product.id === productId) ?? products[0];
  const selectedRecipe = selectedProduct
    ? recipes.find((recipe) => recipe.menuProductId === selectedProduct.id)
    : null;
  const advancedSetupSpec = selectedProduct
    ? getBeverageAdvancedSetupSpec(selectedProduct.name)
    : null;
  const advancedSetupProgress = selectedProduct
    ? getBeverageAdvancedSetupProgress(selectedProduct.name, advancedSetupAnswers)
    : null;

  useEffect(() => {
    const fromUrl = searchParams.get("product");
    if (fromUrl && products.some((product) => product.id === fromUrl)) {
      setProductId(fromUrl);
      return;
    }
    setProductId((current) => current || products[0]?.id || "");
  }, [searchParams, products]);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setPrice(String(selectedProduct.price));
    setSaleTaxCategory((selectedProduct.saleTaxCategory ?? "IVA_19") as CoTaxCategory);

    if (selectedRecipe && selectedRecipe.lines.length > 0) {
      setRecipeLines(
        selectedRecipe.lines.map((line) => ({
          inventoryItemId: line.inventoryItemId,
          itemName: line.itemName,
          quantity: line.quantity,
          unit: line.unit,
        })),
      );
      setYieldQuantity(selectedRecipe.yieldQuantity || 1);
      setAdvancedSetupAnswers(selectedRecipe.advancedSetupAnswers ?? {});
    } else {
      setRecipeLines([emptyRecipeLine()]);
      setYieldQuantity(
        suggestRecipeYieldForProduct(selectedProduct.name, selectedProduct.category),
      );
      setAdvancedSetupAnswers({});
    }

    setSubmitError(null);
    setSaveMessage(null);
  }, [selectedProduct?.id, selectedRecipe?.id]);

  const itemProfiles = useMemo(
    () => buildInventoryCostProfiles(inventoryItems),
    [inventoryItems],
  );

  const validRecipeLines = useMemo(
    () => recipeLines.filter((line) => line.inventoryItemId && line.quantity > 0),
    [recipeLines],
  );

  const recipeBreakdown = useMemo(
    () => calculateRecipeCostBreakdown(validRecipeLines, itemProfiles),
    [validRecipeLines, itemProfiles],
  );

  const previewBatchCost = useMemo(
    () => calculateRecipeBatchCost(validRecipeLines, itemProfiles),
    [validRecipeLines, itemProfiles],
  );

  const previewRecipeCost = useMemo(() => {
    if (!selectedProduct) {
      return 0;
    }
    return calculatePastryPortionCost({
      batchCostNet: previewBatchCost,
      yieldQuantity,
      category: selectedProduct.category,
    });
  }, [previewBatchCost, yieldQuantity, selectedProduct]);

  const suggestedTaxCategory = useMemo(() => {
    if (!selectedProduct) {
      return saleTaxCategory;
    }

    const containsCoffeeIngredient = recipeLines.some((line) => {
      const item = inventoryItems.find((entry) => entry.id === line.inventoryItemId);
      return item ? isCoffeeBeverageName(item.name) : false;
    });

    return inferMenuProductTaxCategory({
      name: selectedProduct.name,
      category: selectedProduct.category,
      containsCoffeeIngredient,
    });
  }, [selectedProduct, recipeLines, inventoryItems, saleTaxCategory]);

  const targetCostPct = selectedProduct
    ? getTargetCostPctForCategory(selectedProduct.category, costMatrixSettings)
    : costMatrixSettings.targetFoodCostPct;

  const costPanorama = useMemo(() => {
    if (!selectedProduct || previewBatchCost <= 0) {
      return null;
    }

    return buildProductCostPanorama({
      category: selectedProduct.category,
      batchCostNet: previewBatchCost,
      yieldQuantity,
      userSalePrice: Number(price) || 0,
      saleTaxCategory,
      matrixSettings: costMatrixSettings,
    });
  }, [
    selectedProduct,
    previewBatchCost,
    yieldQuantity,
    price,
    saleTaxCategory,
    costMatrixSettings,
  ]);

  const matrix = useMemo(() => {
    const salePrice = Number(price) || 0;
    if (!selectedProduct || salePrice <= 0) {
      return null;
    }

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
  }, [
    selectedProduct,
    price,
    saleTaxCategory,
    previewRecipeCost,
    targetCostPct,
    costMatrixSettings,
  ]);

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

    const suggested = suggestRecipeYieldForProduct(
      item.name,
      selectedProduct?.category,
    );
    if (suggested > 1) {
      setYieldQuantity((current) => (current <= 1 ? suggested : current));
    }
  }

  async function handleSeedCostMatrix() {
    setSeedMessage(null);
    setSeedWarnings([]);
    setSubmitError(null);
    setSeeding(true);

    try {
      const result = await seedCostMatrix();
      const parts = [
        result.productsCreated > 0
          ? `${result.productsCreated} productos nuevos`
          : null,
        result.recipesCreated > 0
          ? `${result.recipesCreated} fichas creadas`
          : null,
        result.recipesUpdated > 0
          ? `${result.recipesUpdated} fichas actualizadas`
          : null,
        result.recipesSkipped > 0
          ? `${result.recipesSkipped} sin cambios`
          : null,
      ].filter(Boolean);

      setSeedMessage(
        parts.length > 0
          ? `Listo: ${parts.join(" · ")}.`
          : "No hubo cambios: revisa el catálogo e inventario.",
      );
      setSeedWarnings(result.warnings);
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSeeding(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      return;
    }

    setSubmitError(null);
    setSaveMessage(null);
    setSubmitting(true);

    try {
      const salePrice = Number(price);
      if (!Number.isFinite(salePrice) || salePrice < 0) {
        throw new Error("Ingresa un precio de venta válido.");
      }

      const validLines = recipeLines.filter(
        (line) => line.inventoryItemId && line.quantity > 0,
      );

      if (validLines.length === 0) {
        throw new Error("Agrega al menos un ingrediente a la receta.");
      }

      await updateMenuProduct({
        productId: selectedProduct.id,
        price: salePrice,
        saleTaxCategory,
      });

      const result = await saveRecipe({
        menuProductId: selectedProduct.id,
        menuProductName: selectedProduct.name,
        yieldQuantity,
        category: selectedProduct.category,
        lines: validLines,
        advancedSetupAnswers: advancedSetupSpec ? advancedSetupAnswers : undefined,
      });

      const setupNote =
        advancedSetupSpec && advancedSetupProgress && !advancedSetupProgress.isComplete
          ? " Confirma las preguntas de barra para cerrar la ficha."
          : "";

      setSaveMessage(
        `Ficha guardada (receta v${result.recipeVersion}). Costo por porción: ${formatMoney(result.recipeCost)}` +
          (yieldQuantity > 1
            ? selectedProduct.category === "pastry"
              ? ` (factura ${formatMoney(previewBatchCost)} + ${formatMoney(PASTRY_DOMICILIO_ALLOCATION_COP)} domicilio ÷ ${yieldQuantity})`
              : ` (lote ${formatMoney(previewBatchCost)} ÷ ${yieldQuantity})`
            : "") +
          `.${setupNote}`,
      );
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  const productSummaries = useMemo(() => {
    return products.map((product) => {
      const recipe = recipes.find((entry) => entry.menuProductId === product.id);
      const setupProgress = needsBeverageAdvancedSetup(product.name)
        ? getBeverageAdvancedSetupProgress(product.name, recipe?.advancedSetupAnswers)
        : null;
      const batchCost =
        recipe && recipe.lines.length > 0
          ? calculateRecipeBatchCost(recipe.lines, itemProfiles)
          : 0;
      const cost =
        recipe && recipe.lines.length > 0
          ? calculatePastryPortionCost({
              batchCostNet: batchCost,
              yieldQuantity: recipe.yieldQuantity,
              category: product.category,
            })
          : product.recipeCost ?? 0;
      const foodCostPct =
        product.price > 0 && cost > 0 ? cost / product.price : null;

      return {
        product,
        hasRecipe: Boolean(recipe?.lines.length),
        foodCostPct,
        setupProgress,
      };
    });
  }, [products, recipes, itemProfiles]);

  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/pos/menu" className="underline">
            Catálogo
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Fichas de matriz de costos</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Crea o edita la receta, precio e impuestos de productos ya cargados en el catálogo.{" "}
          <Link href="/settings/costing" className="underline">
            Parámetros de matriz
          </Link>
        </p>
      </div>

      <Card title="Flujo recomendado">
        <ol className="space-y-2 text-sm text-[var(--ghost-text-muted)]">
          <li>
            1. Registrar{" "}
            <Link href="/inventory/items" className="underline">
              materias primas
            </Link>{" "}
            con unidad de costeo y presentación de compra
          </li>
          <li>
            2.{" "}
            <Link href="/purchases" className="font-medium text-[var(--ghost-brand-500)] underline">
              Registrar compras
            </Link>{" "}
            y confirmar (costo neto por unidad base)
          </li>
          <li>3. Armar receta del producto en cantidades de consumo</li>
          <li>4. Guardar ficha y revisar utilidad bruta / food cost</li>
        </ol>
        <div className="mt-4 space-y-2 border-t border-[var(--ghost-border)] pt-4">
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Carga la carta Ghost (25 bebidas) con base espresso: 18 g café Black Coffee
            (paq 5 lb · $145.000) + agua de red. Las fichas se cruzan con compras; productos
            Kiuegi y extras se irán completando al registrar facturas.
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={seeding || inventoryItems.length === 0}
            onClick={handleSeedCostMatrix}
          >
            {seeding ? "Generando carta..." : "Cargar carta Ghost y fichas base"}
          </Button>
          {seedMessage ? (
            <p className="text-sm text-[var(--ghost-brand-500)]">{seedMessage}</p>
          ) : null}
          {seedWarnings.length > 0 ? (
            <ul className="space-y-1 text-xs text-[var(--ghost-text-muted)]">
              {seedWarnings.map((warning) => (
                <li key={warning}>· {warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card title="Productos del catálogo">
          {products.length === 0 ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">
              No hay productos.{" "}
              <Link href="/pos/menu" className="underline">
                Crea el catálogo
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-1">
              {productSummaries.map(({ product, hasRecipe, foodCostPct, setupProgress }) => {
                const active = (productId || products[0]?.id) === product.id;
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => setProductId(product.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        active
                          ? "border-[var(--ghost-brand-500)] bg-[var(--ghost-surface-2)]"
                          : "border-[var(--ghost-border)] hover:bg-[var(--ghost-surface-2)]"
                      }`}
                    >
                      <p className="font-medium">{product.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--ghost-text-muted)]">
                        {formatMoney(product.price)}
                        {hasRecipe ? " · con receta" : " · sin receta"}
                        {foodCostPct !== null
                          ? ` · FC ${(foodCostPct * 100).toFixed(0)}%`
                          : ""}
                        {setupProgress && !setupProgress.isComplete
                          ? ` · confirmar barra ${setupProgress.answered}/${setupProgress.total}`
                          : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          {selectedProduct ? (
            <Card
              title={`Ficha: ${selectedProduct.name}${
                selectedRecipe?.currentVersion ? ` · v${selectedRecipe.currentVersion}` : ""
              }`}
            >
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Precio venta (COP, con impuesto)</span>
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
                    <span className="text-sm font-medium">Impuesto venta (incluido)</span>
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
                    {suggestedTaxCategory !== saleTaxCategory ? (
                      <button
                        type="button"
                        className="text-xs text-[var(--ghost-brand-500)] underline"
                        onClick={() => setSaleTaxCategory(suggestedTaxCategory)}
                      >
                        Sugerido: {CO_TAX_CATEGORY_LABELS[suggestedTaxCategory]}
                      </button>
                    ) : null}
                  </label>
                </div>

                <RecipeYieldField
                  productName={selectedProduct.name}
                  category={selectedProduct.category}
                  value={yieldQuantity}
                  onChange={setYieldQuantity}
                  ingredientNames={validRecipeLines.map((line) => line.itemName).filter(Boolean)}
                />

                {advancedSetupSpec ? (
                  <BeverageAdvancedSetupPanel
                    spec={advancedSetupSpec}
                    answers={advancedSetupAnswers}
                    onChange={setAdvancedSetupAnswers}
                    disabled={submitting}
                  />
                ) : null}

                <div className="space-y-2 border-t border-[var(--ghost-border)] pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Receta (lote completo)</span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setRecipeLines((current) => [...current, emptyRecipeLine()])
                      }
                    >
                      + Ingrediente
                    </Button>
                  </div>
                  {inventoryItems.length === 0 ? (
                    <p className="text-sm text-[var(--ghost-text-muted)]">
                      Carga insumos en{" "}
                      <Link href="/inventory" className="underline">
                        Inventario
                      </Link>{" "}
                      y facturas en{" "}
                      <Link href="/purchases" className="underline">
                        Compras
                      </Link>
                      .
                    </p>
                  ) : (
                    recipeLines.map((line, index) => (
                      <div
                        key={index}
                        className="space-y-2 rounded-lg border border-[var(--ghost-border)] p-3"
                      >
                        <select
                          value={line.inventoryItemId}
                          onChange={(event) =>
                            linkInventoryToRecipe(index, event.target.value)
                          }
                          className="ghost-input"
                        >
                          <option value="">Seleccionar insumo</option>
                          {inventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} · {formatMoney(getResolvedUnitCost(item))}/
                              {item.baseUnit}
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
                              updateRecipeLine(index, {
                                quantity: Number(event.target.value),
                              })
                            }
                            className="ghost-input"
                            placeholder="Cantidad"
                          />
                          <select
                            value={line.unit}
                            onChange={(event) =>
                              updateRecipeLine(index, {
                                unit: event.target.value as BaseUnit,
                              })
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
                        {line.inventoryItemId && line.quantity > 0 ? (
                          <div className="space-y-0.5">
                            <p className="text-xs text-[var(--ghost-text-muted)]">
                              {(() => {
                                const profile =
                                  itemProfiles[line.inventoryItemId] ?? {
                                    baseUnit: line.unit,
                                    averageCost: 0,
                                  };
                                const breakdown = calculateRecipeLineCost(line, profile);
                                return `${breakdown.quantityInBase.toLocaleString("es-CO")} ${breakdown.baseUnit} × ${formatMoney(breakdown.unitCostPerBase)} = ${formatMoney(breakdown.lineCost)}`;
                              })()}
                            </p>
                            {(() => {
                              const profile =
                                itemProfiles[line.inventoryItemId] ?? {
                                  baseUnit: line.unit,
                                  averageCost: 0,
                                };
                              const note = getCostBasisNote(profile);
                              return note ? (
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                  {note}
                                </p>
                              ) : null;
                            })()}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>

                <ProductCostPanoramaPanel panorama={costPanorama} />

                {matrix ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Metric
                      label="Food cost"
                      value={`${(matrix.foodCostPct * 100).toFixed(1)}%`}
                      hint={
                        selectedProduct?.category === "pastry"
                          ? `Meta ${(targetCostPct * 100).toFixed(0)}% · costo incluye ${formatMoney(PASTRY_DOMICILIO_ALLOCATION_COP)} domicilio`
                          : `Meta ${(targetCostPct * 100).toFixed(0)}%`
                      }
                    />
                    <Metric
                      label="Utilidad bruta"
                      value={formatMoney(matrix.grossProfitAmount)}
                      hint={`${(matrix.grossMarginPct * 100).toFixed(1)}% sobre neto`}
                    />
                    <Metric
                      label="Margen después imp. venta"
                      value={formatMoney(matrix.netProfitAfterSaleTax)}
                      hint="Referencia operativa"
                    />
                    <Metric label="Costo por porción (COGS)" value={formatMoney(previewRecipeCost)} />
                    {yieldQuantity > 1 ? (
                      <Metric
                        label="Costo lote completo"
                        value={formatMoney(previewBatchCost)}
                        hint={`÷ ${yieldQuantity} porciones`}
                      />
                    ) : null}
                    <Metric label="Precio neto venta" value={formatMoney(matrix.salePriceNet)} />
                    <Metric
                      label={CO_TAX_CATEGORY_LABELS[saleTaxCategory]}
                      value={formatMoney(matrix.sale.taxAmount)}
                    />
                    <Metric
                      label="Precio sugerido"
                      value={formatMoney(matrix.suggestedSalePriceGross)}
                      hint="Según meta de costo"
                    />
                    <Metric
                      label="ReteIVA ref."
                      value={formatMoney(matrix.reteIvaReference)}
                      hint={`${(costMatrixSettings.reteIvaPct * 100).toFixed(1)}% sobre IVA`}
                    />
                    <Metric
                      label="Retefuente ref."
                      value={formatMoney(matrix.reteFuenteReference)}
                      hint={`${(costMatrixSettings.reteFuenteGoodsPct * 100).toFixed(1)}% bienes`}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-[var(--ghost-text-muted)]">
                    Ingresa precio y receta para ver la matriz.
                  </p>
                )}

                {submitError ? (
                  <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
                ) : null}
                {saveMessage ? (
                  <p className="text-sm text-[var(--ghost-brand-500)]">{saveMessage}</p>
                ) : null}

                <Button type="submit" fullWidth disabled={submitting}>
                  {submitting ? "Guardando ficha..." : "Guardar ficha de costos"}
                </Button>
              </form>
            </Card>
          ) : (
            <Card title="Ficha de costos">
              <p className="text-sm text-[var(--ghost-text-muted)]">
                Selecciona un producto del catálogo para crear o editar su ficha.
              </p>
            </Card>
          )}

          <Card title="Parámetros de matriz">
            <ul className="space-y-2 text-sm text-[var(--ghost-text-muted)]">
              <li>
                Meta food cost: {(costMatrixSettings.targetFoodCostPct * 100).toFixed(0)}%
              </li>
              <li>
                Meta bebidas: {(costMatrixSettings.targetBeverageCostPct * 100).toFixed(0)}%
              </li>
              <li>
                ReteIVA: {(costMatrixSettings.reteIvaPct * 100).toFixed(1)}% · Retefuente bienes:{" "}
                {(costMatrixSettings.reteFuenteGoodsPct * 100).toFixed(1)}%
              </li>
            </ul>
            <Link href="/settings/costing" className="mt-3 inline-block text-sm underline">
              Editar parámetros
            </Link>
          </Card>
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

function lineDefaultQuantity(unit: BaseUnit): number {
  if (unit === "g" || unit === "ml") {
    return 100;
  }
  if (unit === "kg" || unit === "l") {
    return 0.1;
  }
  return 1;
}
