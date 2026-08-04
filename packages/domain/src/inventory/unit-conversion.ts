import type { BaseUnit } from "./units.js";

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

  const presentationQuantity = normalizePresentationQuantity(
    options?.presentationQuantity,
  );
  const purchaseUnit = options?.purchaseUnit;

  if (GRAMS_PER_UNIT[fromUnit] && GRAMS_PER_UNIT[baseUnit]) {
    return (quantity * GRAMS_PER_UNIT[fromUnit]!) / GRAMS_PER_UNIT[baseUnit]!;
  }

  if (ML_PER_UNIT[fromUnit] && ML_PER_UNIT[baseUnit]) {
    return (quantity * ML_PER_UNIT[fromUnit]!) / ML_PER_UNIT[baseUnit]!;
  }

  if (purchaseUnit && fromUnit === purchaseUnit) {
    return quantity * presentationQuantity;
  }

  if (
    (fromUnit === "box" || fromUnit === "bag") &&
    (baseUnit === "unit" || baseUnit === "g" || baseUnit === "ml")
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
  const quantity = normalizePresentationQuantity(input.presentationQuantity);

  if (!purchaseUnit) {
    return "";
  }

  if (purchaseUnit === input.baseUnit || quantity === 1) {
    return `1 ${purchaseUnit}`;
  }

  return `1 ${purchaseUnit} = ${quantity} ${input.baseUnit ?? purchaseUnit}`;
}
