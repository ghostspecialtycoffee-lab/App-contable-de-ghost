export const INVENTORY_COST_METHODS = [
  "weighted_average",
  "fifo",
  "standard",
] as const;

export type InventoryCostMethod = (typeof INVENTORY_COST_METHODS)[number];

export const INVENTORY_COST_METHOD_LABELS: Record<InventoryCostMethod, string> = {
  weighted_average: "Promedio ponderado",
  fifo: "FIFO (por lote)",
  standard: "Costo estándar",
};

export interface OrganizationCostingSettings {
  defaultMethod: InventoryCostMethod;
}

export type OrganizationCostingSettingsInput = Partial<OrganizationCostingSettings>;

export const DEFAULT_ORGANIZATION_COSTING_SETTINGS: OrganizationCostingSettings = {
  defaultMethod: "weighted_average",
};

export function resolveCostingSettings(
  input?: OrganizationCostingSettingsInput | null,
): OrganizationCostingSettings {
  const method = input?.defaultMethod ?? DEFAULT_ORGANIZATION_COSTING_SETTINGS.defaultMethod;
  return {
    defaultMethod: INVENTORY_COST_METHODS.includes(method as InventoryCostMethod)
      ? (method as InventoryCostMethod)
      : DEFAULT_ORGANIZATION_COSTING_SETTINGS.defaultMethod,
  };
}

export function resolveEffectiveCostMethod(input: {
  organizationMethod: InventoryCostMethod;
  itemMethod?: InventoryCostMethod | null;
}): InventoryCostMethod {
  if (input.itemMethod && INVENTORY_COST_METHODS.includes(input.itemMethod)) {
    return input.itemMethod;
  }
  return input.organizationMethod;
}

export function resolveMovementUnitCost(input: {
  method: InventoryCostMethod;
  averageCost: number;
  standardCost?: number;
  lotUnitCost?: number;
}): number {
  switch (input.method) {
    case "fifo": {
      if (input.lotUnitCost != null && input.lotUnitCost > 0) {
        return input.lotUnitCost;
      }
      return input.averageCost;
    }
    case "standard": {
      if (input.standardCost != null && input.standardCost > 0) {
        return input.standardCost;
      }
      return input.averageCost;
    }
    case "weighted_average":
    default:
      return input.averageCost;
  }
}
