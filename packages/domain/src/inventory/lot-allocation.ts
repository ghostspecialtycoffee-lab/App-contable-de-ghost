import { LEGACY_LOT_CODE, type AllocatableLot, type LotAllocation } from "./lot.js";

export function generatePurchaseLotCode(input: {
  invoiceNumber: string;
  itemId: string;
  lineIndex?: number;
}): string {
  const invoice = input.invoiceNumber
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 12)
    .toUpperCase();
  const itemSuffix = input.itemId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  const sequence =
    input.lineIndex != null && input.lineIndex >= 0 ? `-${input.lineIndex + 1}` : "";
  return `LOT-${invoice || "COMPRA"}-${itemSuffix}${sequence}`;
}

export function buildInventoryLotDocId(
  warehouseId: string,
  itemId: string,
  lotCode: string,
): string {
  const safeCode = lotCode.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  return `${warehouseId}_${itemId}_${safeCode}`;
}

export function allocateLotsFifo(
  lots: AllocatableLot[],
  quantityNeeded: number,
): { allocations: LotAllocation[]; remainingUnallocated: number } {
  if (quantityNeeded <= 0) {
    return { allocations: [], remainingUnallocated: 0 };
  }

  const openLots = lots
    .filter((lot) => lot.quantityRemaining > 0)
    .sort(
      (left, right) =>
        new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime(),
    );

  const allocations: LotAllocation[] = [];
  let remaining = quantityNeeded;

  for (const lot of openLots) {
    if (remaining <= 0) {
      break;
    }

    const take = Math.min(lot.quantityRemaining, remaining);
    if (take <= 0) {
      continue;
    }

    allocations.push({
      lotId: lot.id,
      lotCode: lot.lotCode,
      quantity: take,
      unitCost: lot.unitCost,
      sourceReference: lot.sourceReference,
      receivedAt: lot.receivedAt,
    });
    remaining -= take;
  }

  if (remaining > 0) {
    allocations.push({
      lotId: LEGACY_LOT_CODE,
      lotCode: LEGACY_LOT_CODE,
      quantity: remaining,
      unitCost: 0,
      receivedAt: new Date(0).toISOString(),
    });
    remaining = 0;
  }

  return { allocations, remainingUnallocated: remaining };
}

export function mergeLotConsumptions(
  consumptions: Array<{
    inventoryItemId: string;
    itemName: string;
    lotCode: string;
    lotId?: string;
    quantity: number;
    unitCost: number;
    sourceReference?: string;
  }>,
): Array<{
  inventoryItemId: string;
  itemName: string;
  lotCode: string;
  lotId?: string;
  quantity: number;
  unitCost: number;
  sourceReference?: string;
}> {
  const merged = new Map<
    string,
    {
      inventoryItemId: string;
      itemName: string;
      lotCode: string;
      lotId?: string;
      quantity: number;
      unitCost: number;
      sourceReference?: string;
    }
  >();

  for (const entry of consumptions) {
    const key = `${entry.inventoryItemId}::${entry.lotCode}`;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { ...entry });
      continue;
    }
    const totalQty = current.quantity + entry.quantity;
    const weightedCost =
      totalQty > 0
        ? (current.quantity * current.unitCost + entry.quantity * entry.unitCost) / totalQty
        : 0;
    merged.set(key, {
      ...current,
      quantity: totalQty,
      unitCost: Math.round(weightedCost),
    });
  }

  return [...merged.values()];
}
