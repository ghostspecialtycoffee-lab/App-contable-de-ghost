import type { Result } from "@ghost/shared";
import { err, ok } from "@ghost/shared";

import {
  INVENTORY_COST_METHODS,
  resolveCostingSettings,
  type InventoryCostMethod,
  type OrganizationCostingSettings,
  type OrganizationCostingSettingsInput,
} from "./inventory/cost-method.js";

export type { OrganizationCostingSettings, OrganizationCostingSettingsInput };

export { resolveCostingSettings };

export function validateCostingSettings(
  input: OrganizationCostingSettingsInput,
): Result<OrganizationCostingSettings> {
  const method = input.defaultMethod;
  if (method != null && !INVENTORY_COST_METHODS.includes(method as InventoryCostMethod)) {
    return err("Método de costeo no válido.");
  }

  return ok(resolveCostingSettings(input));
}
