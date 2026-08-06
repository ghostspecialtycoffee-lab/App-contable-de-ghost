import { BASE_UNIT_LABELS, type BaseUnit } from "./units.js";

const GRAMS_PER_UNIT: Partial<Record<BaseUnit, number>> = {
  g: 1,
  kg: 1000,
};

const ML_PER_UNIT: Partial<Record<BaseUnit, number>> = {
  ml: 1,
  l: 1000,
};

export interface InventoryCostProfile {
  baseUnit: BaseUnit;
  averageCost: number;
  purchaseUnit?: BaseUnit;
  presentationQuantity?: number;
}

export function normalizePresentationQuantity(
  value: number | undefined,
  fallback = 1,
): number {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) {
    return fallback;
  }
  return value as number;
}

/**
 * Cuántas unidades base hay en 1 unidad de compra.
 * Corrige defaults erróneos (ej. kg→g con cantidad 1 en lugar de 1000).
 */
export function resolvePresentationQuantity(
  purchaseUnit: BaseUnit,
  baseUnit: BaseUnit,
  presentationQuantity?: number,
): number {
  if (purchaseUnit === baseUnit) {
    return 1;
  }

  const stored = normalizePresentationQuantity(presentationQuantity);

  if (purchaseUnit === "kg" && baseUnit === "g") {
    return stored === 1 ? 1000 : stored;
  }
  if (purchaseUnit === "l" && baseUnit === "ml") {
    return stored === 1 ? 1000 : stored;
  }
  if (purchaseUnit === "g" && baseUnit === "kg") {
    return stored === 1 ? 0.001 : stored;
  }
  if (purchaseUnit === "ml" && baseUnit === "l") {
    return stored === 1 ? 0.001 : stored;
  }

  return stored;
}

function unitLabel(unit: BaseUnit): string {
  return BASE_UNIT_LABELS[unit].toLowerCase();
}

export function convertToBaseUnit(
  quantity: number,
  fromUnit: BaseUnit,
  baseUnit: BaseUnit,
  options?: {
    presentationQuantity?: number;
    purchaseUnit?: BaseUnit;
  },
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 0;
  }

  if (fromUnit === baseUnit) {
    return quantity;
  }

  const purchaseUnit = options?.purchaseUnit ?? fromUnit;
  const presentationQuantity = resolvePresentationQuantity(
    purchaseUnit,
    baseUnit,
    options?.presentationQuantity,
  );

  if (GRAMS_PER_UNIT[fromUnit] && GRAMS_PER_UNIT[baseUnit]) {
    return (quantity * GRAMS_PER_UNIT[fromUnit]!) / GRAMS_PER_UNIT[baseUnit]!;
  }

  if (ML_PER_UNIT[fromUnit] && ML_PER_UNIT[baseUnit]) {
    return (quantity * ML_PER_UNIT[fromUnit]!) / ML_PER_UNIT[baseUnit]!;
  }

  if (fromUnit === purchaseUnit) {
    return quantity * presentationQuantity;
  }

  if (
    (fromUnit === "unit" || fromUnit === "box" || fromUnit === "bag") &&
    (baseUnit === "g" || baseUnit === "ml" || baseUnit === "unit")
  ) {
    return quantity * presentationQuantity;
  }

  if (
    fromUnit === "unit" &&
    (baseUnit === "box" || baseUnit === "bag") &&
    presentationQuantity > 0
  ) {
    return quantity / presentationQuantity;
  }

  return quantity;
}

export function formatPresentationLabel(input: {
  presentationLabel?: string;
  purchaseUnit?: BaseUnit;
  presentationQuantity?: number;
  baseUnit?: BaseUnit;
}): string {
  if (input.presentationLabel?.trim()) {
    return input.presentationLabel.trim();
  }

  const purchaseUnit = input.purchaseUnit ?? input.baseUnit;
  const baseUnit = input.baseUnit ?? purchaseUnit;

  if (!purchaseUnit || !baseUnit) {
    return "";
  }

  const quantity = resolvePresentationQuantity(
    purchaseUnit,
    baseUnit,
    input.presentationQuantity,
  );

  const purchaseLabel = unitLabel(purchaseUnit);
  const baseLabel = unitLabel(baseUnit);

  if (purchaseUnit === baseUnit) {
    return `1 ${purchaseLabel}`;
  }

  const formattedQuantity = Number.isInteger(quantity)
    ? quantity.toLocaleString("es-CO")
    : quantity.toLocaleString("es-CO", { maximumFractionDigits: 4 });

  return `1 ${purchaseLabel} = ${formattedQuantity} ${baseLabel}`;
}
