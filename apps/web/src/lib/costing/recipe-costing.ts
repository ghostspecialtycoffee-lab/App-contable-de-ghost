import type { InventoryCostProfile, InventoryItem } from "@ghost/domain";

export function toInventoryCostProfile(item: InventoryItem): InventoryCostProfile {
  return {
    baseUnit: item.baseUnit,
    averageCost: item.averageCost || item.lastCost || 0,
    purchaseUnit: item.purchaseUnit,
    presentationQuantity: item.presentationQuantity,
  };
}

export function buildInventoryCostProfiles(
  items: InventoryItem[],
): Record<string, InventoryCostProfile> {
  const profiles: Record<string, InventoryCostProfile> = {};

  for (const item of items) {
    profiles[item.id] = toInventoryCostProfile(item);
  }

  return profiles;
}
