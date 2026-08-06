"use client";

import { useEffect, useState } from "react";

import { getCallableErrorMessage } from "@/lib/auth/errors";
import { updateInventoryItem } from "@/lib/inventory/inventory";
import {
  BASE_UNITS,
  BASE_UNIT_LABELS,
  formatPresentationLabel,
  type BaseUnit,
  type InventoryItem,
} from "@ghost/domain";
import { Button } from "@ghost/ui";

interface InventoryItemPresentationEditorProps {
  item: InventoryItem;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function InventoryItemPresentationEditor({
  item,
  onSaved,
  onCancel,
}: InventoryItemPresentationEditorProps) {
  const [purchaseUnit, setPurchaseUnit] = useState<BaseUnit>(
    (item.purchaseUnit ?? item.baseUnit) as BaseUnit,
  );
  const [presentationQuantity, setPresentationQuantity] = useState(
    String(item.presentationQuantity ?? 1),
  );
  const [presentationLabel, setPresentationLabel] = useState(item.presentationLabel ?? "");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPurchaseUnit((item.purchaseUnit ?? item.baseUnit) as BaseUnit);
    setPresentationQuantity(String(item.presentationQuantity ?? 1));
    setPresentationLabel(item.presentationLabel ?? "");
    setSubmitError(null);
  }, [item]);

  const previewPresentation = formatPresentationLabel({
    presentationLabel,
    purchaseUnit,
    presentationQuantity: Number(presentationQuantity) || 1,
    baseUnit: item.baseUnit,
  });

  const baseUnitHint =
    item.baseUnit === "g"
      ? "gramos"
      : item.baseUnit === "ml"
        ? "mililitros"
        : item.baseUnit === "unit"
          ? "unidades"
          : BASE_UNIT_LABELS[item.baseUnit].toLowerCase();

  async function handleSave() {
    const quantity = Number(presentationQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setSubmitError("Indica cuántos gramos, ml o unidades trae cada presentación.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      await updateInventoryItem({
        itemId: item.id,
        purchaseUnit,
        presentationQuantity: quantity,
        presentationLabel: presentationLabel.trim(),
      });
      onSaved?.();
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-2)] p-3">
      <p className="text-sm font-medium">Presentación de compra — {item.name}</p>
      <p className="text-xs text-[var(--ghost-text-muted)]">
        El costeo usa esta conversión: 1 {purchaseUnit} = {presentationQuantity || "?"}{" "}
        {baseUnitHint} ({item.baseUnit}). Ej: bolsa de café 2,5 kg → unidad <em>bag</em>, cantidad{" "}
        2500, base g.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium">Unidad de compra</span>
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
          <span className="text-xs font-medium">
            Cuántos {baseUnitHint} trae 1 {BASE_UNIT_LABELS[purchaseUnit].toLowerCase()}
          </span>
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={presentationQuantity}
            onChange={(event) => setPresentationQuantity(event.target.value)}
            className="ghost-input"
          />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-medium">Etiqueta (opcional)</span>
          <input
            value={presentationLabel}
            onChange={(event) => setPresentationLabel(event.target.value)}
            className="ghost-input"
            placeholder="Bolsa 5 kg, Botella 600 ml"
          />
        </label>
      </div>

      {previewPresentation ? (
        <p className="text-xs text-[var(--ghost-brand-500)]">Vista: {previewPresentation}</p>
      ) : null}

      {submitError ? (
        <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={handleSave} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar presentación"}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
