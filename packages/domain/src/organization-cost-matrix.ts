import type { Result } from "@ghost/shared";
import { err, ok } from "@ghost/shared";

import { CO_COST_MATRIX_DEFAULTS } from "./fiscal/colombia-tax.js";
import type { MenuCategory } from "./pos/menu-product.js";

export interface OrganizationCostMatrixSettings {
  targetFoodCostPct: number;
  targetBeverageCostPct: number;
  reteIvaPct: number;
  reteFuenteServicesPct: number;
  reteFuenteGoodsPct: number;
}

export type OrganizationCostMatrixSettingsInput = Partial<OrganizationCostMatrixSettings>;

export function resolveCostMatrixSettings(
  input?: OrganizationCostMatrixSettingsInput | null,
): OrganizationCostMatrixSettings {
  return {
    targetFoodCostPct:
      input?.targetFoodCostPct ?? CO_COST_MATRIX_DEFAULTS.targetFoodCostPct,
    targetBeverageCostPct:
      input?.targetBeverageCostPct ?? CO_COST_MATRIX_DEFAULTS.targetBeverageCostPct,
    reteIvaPct: input?.reteIvaPct ?? CO_COST_MATRIX_DEFAULTS.reteIvaPct,
    reteFuenteServicesPct:
      input?.reteFuenteServicesPct ?? CO_COST_MATRIX_DEFAULTS.reteFuenteServicesPct,
    reteFuenteGoodsPct:
      input?.reteFuenteGoodsPct ?? CO_COST_MATRIX_DEFAULTS.reteFuenteGoodsPct,
  };
}

export function getTargetCostPctForCategory(
  category: MenuCategory | undefined,
  settings?: OrganizationCostMatrixSettingsInput | null,
): number {
  const resolved = resolveCostMatrixSettings(settings);
  return category === "beverage"
    ? resolved.targetBeverageCostPct
    : resolved.targetFoodCostPct;
}

function isValidPct(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

export function validateCostMatrixSettings(
  input: OrganizationCostMatrixSettingsInput,
): Result<OrganizationCostMatrixSettings> {
  const resolved = resolveCostMatrixSettings(input);

  if (!isValidPct(resolved.targetFoodCostPct, 0.05, 0.9)) {
    return err("La meta de food cost debe estar entre 5% y 90%.");
  }

  if (!isValidPct(resolved.targetBeverageCostPct, 0.05, 0.9)) {
    return err("La meta de bebidas debe estar entre 5% y 90%.");
  }

  if (!isValidPct(resolved.reteIvaPct, 0, 1)) {
    return err("ReteIVA debe estar entre 0% y 100%.");
  }

  if (!isValidPct(resolved.reteFuenteServicesPct, 0, 1)) {
    return err("Retefuente servicios debe estar entre 0% y 100%.");
  }

  if (!isValidPct(resolved.reteFuenteGoodsPct, 0, 1)) {
    return err("Retefuente bienes debe estar entre 0% y 100%.");
  }

  return ok(resolved);
}
