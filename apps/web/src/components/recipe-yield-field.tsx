"use client";

import {
  RECIPE_YIELD_PRESETS,
  normalizeYieldQuantity,
  suggestRecipeYield,
} from "@ghost/domain";

interface RecipeYieldFieldProps {
  productName: string;
  value: number;
  onChange: (value: number) => void;
  ingredientNames?: string[];
}

export function RecipeYieldField({
  productName,
  value,
  onChange,
  ingredientNames = [],
}: RecipeYieldFieldProps) {
  const normalized = normalizeYieldQuantity(value);
  const suggestion = suggestRecipeYield(
    ingredientNames.find((name) => suggestRecipeYield(name) > 1) ?? productName,
  );

  return (
    <div className="space-y-2 rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-2)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Rendimiento (porciones por lote)</span>
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
        Ej. torta entera en bodega = 1 unidad · se vende por porción → rendimiento 12. Cada venta
        descuenta 1/12 de la torta.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
          Modo porciones: el precio POS es por porción; la receta describe el lote completo (
          {normalized} porciones).
        </p>
      ) : null}
    </div>
  );
}
