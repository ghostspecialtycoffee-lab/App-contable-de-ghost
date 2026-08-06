"use client";

import {
  DEFAULT_PASTRY_YIELD,
  isPastryCategory,
  RECIPE_YIELD_PRESETS,
  normalizeYieldQuantity,
  suggestRecipeYieldForProduct,
  type MenuCategory,
} from "@ghost/domain";

interface RecipeYieldFieldProps {
  productName: string;
  category?: MenuCategory;
  value: number;
  onChange: (value: number) => void;
  ingredientNames?: string[];
}

export function RecipeYieldField({
  productName,
  category,
  value,
  onChange,
  ingredientNames = [],
}: RecipeYieldFieldProps) {
  const normalized = normalizeYieldQuantity(value);
  const suggestion = suggestRecipeYieldForProduct(
    ingredientNames.find((name) => suggestRecipeYieldForProduct(name, category) > 1) ??
      productName,
    category,
  );
  const isPastry = isPastryCategory(category);

  return (
    <div className="space-y-2 rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-2)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {isPastry ? "Porciones por lote (repostería)" : "Rendimiento del lote"}
        </span>
        {suggestion > 1 && normalized !== suggestion ? (
          <button
            type="button"
            className="text-xs font-medium text-[var(--ghost-brand-500)] underline"
            onClick={() => onChange(suggestion)}
          >
            Usar sugerido: {suggestion}
          </button>
        ) : null}
      </div>
      <p className="text-xs text-[var(--ghost-text-muted)]">
        {isPastry ? (
          <>
            1 unidad en bodega = lote completo (ej. torta entera). Se vende por porción →
            rendimiento típico {DEFAULT_PASTRY_YIELD}. Costo por porción = (factura + domicilio) ÷
            porciones.
          </>
        ) : (
          <>
            Para bebidas y platos unitarios deja 1. Si el lote rinde varias porciones, indica cuántas
            vendes por cada lote preparado.
          </>
        )}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {RECIPE_YIELD_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={`min-h-[48px] rounded-lg border px-2 py-2 text-left text-xs transition ${
              normalized === preset.value
                ? "border-[var(--ghost-brand-500)] bg-[var(--ghost-brand-500)]/10 text-[var(--ghost-brand-500)]"
                : "border-[var(--ghost-border)] text-[var(--ghost-text-muted)]"
            }`}
          >
            <span className="block font-semibold">{preset.label}</span>
            <span className="mt-0.5 block opacity-80">{preset.hint}</span>
          </button>
        ))}
      </div>
      <label className="block space-y-1">
        <span className="text-xs text-[var(--ghost-text-muted)]">Personalizado</span>
        <input
          type="number"
          min="1"
          step="1"
          value={normalized}
          onChange={(event) => onChange(Number(event.target.value))}
          className="ghost-input"
        />
      </label>
      {normalized > 1 ? (
        <p className="text-xs text-[var(--ghost-brand-500)]">
          Modo porciones: el precio POS es por porción; cada venta descuenta 1/{normalized} del lote.
        </p>
      ) : isPastry ? (
        <p className="text-xs text-[var(--ghost-text-muted)]">
          Con rendimiento 1 el costo es por unidad completa (sin dividir lote).
        </p>
      ) : null}
    </div>
  );
}
