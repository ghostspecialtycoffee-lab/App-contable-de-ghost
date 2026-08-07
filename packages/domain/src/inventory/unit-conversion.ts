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
    if (stored === 1) {
      return 1000;
    }
    // Usuario escribió 2.5 pensando en kg, no en 2.5 gramos
    if (stored > 0 && stored < 100) {
      return Math.round(stored * 1000);
    }
    return stored;
  }
  if (purchaseUnit === "l" && baseUnit === "ml") {
    if (stored === 1) {
      return 1000;
    }
    if (stored > 0 && stored < 100) {
      return Math.round(stored * 1000);
    }
    return stored;
  }
  if (purchaseUnit === "g" && baseUnit === "kg") {
    return stored === 1 ? 0.001 : stored;
  }
  if (purchaseUnit === "ml" && baseUnit === "l") {
    return stored === 1 ? 0.001 : stored;
  }

  if (
    (purchaseUnit === "bag" || purchaseUnit === "box" || purchaseUnit === "unit") &&
    (baseUnit === "g" || baseUnit === "ml")
  ) {
    if (stored >= 100) {
      return stored;
    }
    // Bolsa "2.5" sin unidad → interpretar como 2.5 kg / 2.5 L (no confundir con 1 unidad)
    if (stored > 1 && stored < 100) {
      return Math.round(stored * 1000);
    }
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

/**
 * Costo por unidad base (g, ml, unit) a partir del promedio del ítem.
 * Si el inventario guardó el precio de la presentación de compra (ej. bolsa $145.000
 * de 2.500 g), lo divide entre la cantidad en unidad base.
 */
export function resolveUnitCostPerBase(profile: InventoryCostProfile): number {
  const { averageCost, baseUnit, purchaseUnit, presentationQuantity } = profile;
  if (!Number.isFinite(averageCost) || averageCost <= 0) {
    return 0;
  }

  const effectivePurchaseUnit = purchaseUnit ?? baseUnit;
  const quantityInBase = resolvePresentationQuantity(
    effectivePurchaseUnit,
    baseUnit,
    presentationQuantity,
  );

  const isWeightOrVolume = baseUnit === "g" || baseUnit === "ml";
  const purchaseIsPackage =
    effectivePurchaseUnit === "bag" ||
    effectivePurchaseUnit === "box" ||
    effectivePurchaseUnit !== baseUnit;

  let divisor = quantityInBase;

  if (divisor <= 1 && isWeightOrVolume && averageCost >= 10_000) {
    const inferred = inferDefaultPackageQuantity(profile);
    if (inferred > 1) {
      divisor = inferred;
    }
  }

  if (divisor <= 1) {
    return averageCost;
  }

  const looksLikePurchasePrice =
    averageCost >= divisor && (isWeightOrVolume || averageCost >= 1000);

  if (looksLikePurchasePrice && (isWeightOrVolume || purchaseIsPackage)) {
    return Math.round(averageCost / divisor);
  }

  return averageCost;
}

/** Gramos/ml típicos cuando falta configurar presentación (ej. bolsa café 2.5 kg). */
function inferDefaultPackageQuantity(profile: InventoryCostProfile): number {
  const { averageCost, baseUnit } = profile;

  if (baseUnit === "g" && averageCost >= 100_000 && averageCost <= 200_000) {
    return 2500;
  }

  if (baseUnit === "ml" && averageCost >= 3000 && averageCost <= 15_000) {
    return 1000;
  }

  return 0;
}

export function getCostBasisNote(profile: InventoryCostProfile): string | null {
  const unitCost = resolveUnitCostPerBase(profile);
  const raw = profile.averageCost;
  if (raw <= 0 || unitCost <= 0) {
    return null;
  }

  const qtyInBase = resolvePresentationQuantity(
    profile.purchaseUnit ?? profile.baseUnit,
    profile.baseUnit,
    profile.presentationQuantity,
  );

  const inferred =
    qtyInBase <= 1 && (profile.baseUnit === "g" || profile.baseUnit === "ml")
      ? inferDefaultPackageQuantity(profile)
      : 0;
  const divisor = qtyInBase > 1 ? qtyInBase : inferred;

  if (unitCost !== raw && divisor > 1) {
    if (inferred > 1) {
      return `Estimado: compra $${raw.toLocaleString("es-CO")} ÷ ${inferred.toLocaleString("es-CO")} ${profile.baseUnit} (configura presentación en Inventario)`;
    }
    return `Compra $${raw.toLocaleString("es-CO")} ÷ ${divisor.toLocaleString("es-CO")} ${profile.baseUnit}`;
  }

  if (
    qtyInBase <= 1 &&
    raw >= 10_000 &&
    (profile.baseUnit === "g" || profile.baseUnit === "ml") &&
    unitCost === raw
  ) {
    return "Configura presentación en Inventario (ej. bolsa = 2500 g)";
  }

  return null;
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
