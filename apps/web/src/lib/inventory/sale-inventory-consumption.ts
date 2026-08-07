import type { Recipe, SaleLotConsumption } from "@ghost/domain";
import {
  allocateLotsFifo,
  calculateRecipeConsumption,
  mergeLotConsumptions,
  type InventoryCostProfile,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";
import { listOpenLotsForItem } from "@/lib/inventory/inventory-lots-client";
import { registerInventoryMovementClient } from "@/lib/inventory/inventory-client";

async function getDefaultWarehouseId(organizationId: string): Promise<string> {
  const db = getFirestoreDb();
  const defaultQuery = query(
    collection(db, firestorePaths.organizationWarehouses(organizationId)),
    where("isDefault", "==", true),
    limit(1),
  );
  const defaultSnap = await getDocs(defaultQuery);
  if (!defaultSnap.empty) {
    return defaultSnap.docs[0]!.id;
  }

  const anySnap = await getDocs(
    query(collection(db, firestorePaths.organizationWarehouses(organizationId)), limit(1)),
  );
  if (anySnap.empty) {
    throw new Error("No hay bodega configurada.");
  }

  return anySnap.docs[0]!.id;
}

export interface PlannedSaleInventoryExit {
  itemId: string;
  itemName: string;
  lotCode: string;
  lotId?: string;
  quantity: number;
  unitCost: number;
  sourceReference?: string;
}

export async function planSaleInventoryConsumption(input: {
  organizationId: string;
  branchId: string;
  saleNumber: string;
  lines: Array<{ productId: string; quantity: number }>;
}): Promise<{
  lotConsumptions: SaleLotConsumption[];
  plannedExits: PlannedSaleInventoryExit[];
}> {
  const db = getFirestoreDb();
  const recipesSnap = await getDocs(
    collection(db, firestorePaths.organizationRecipes(input.organizationId)),
  );
  const recipesByProduct = new Map<string, Recipe>();

  for (const document of recipesSnap.docs) {
    const data = document.data();
    recipesByProduct.set(data.menuProductId as string, {
      id: document.id,
      organizationId: data.organizationId,
      menuProductId: data.menuProductId,
      menuProductName: data.menuProductName,
      yieldQuantity: data.yieldQuantity ?? 1,
      lines: data.lines ?? [],
    });
  }

  const consumptionByItem = new Map<
    string,
    { itemName: string; quantityInBase: number; baseUnit: string }
  >();

  for (const saleLine of input.lines) {
    const recipe = recipesByProduct.get(saleLine.productId);
    if (!recipe || recipe.lines.length === 0) {
      continue;
    }

    const itemProfiles: Record<string, InventoryCostProfile> = {};
    for (const line of recipe.lines) {
      if (itemProfiles[line.inventoryItemId]) {
        continue;
      }
      const itemSnap = await getDoc(
        doc(db, firestorePaths.organizationInventoryItem(input.organizationId, line.inventoryItemId)),
      );
      if (!itemSnap.exists()) {
        continue;
      }
      const data = itemSnap.data();
      itemProfiles[line.inventoryItemId] = {
        baseUnit: data.baseUnit,
        averageCost: Number(data.averageCost ?? data.lastCost ?? 0),
        purchaseUnit: data.purchaseUnit,
        presentationQuantity: data.presentationQuantity,
      };
    }

    const lines = calculateRecipeConsumption(recipe, saleLine.quantity, itemProfiles);
    for (const entry of lines) {
      const current = consumptionByItem.get(entry.inventoryItemId);
      if (current) {
        current.quantityInBase += entry.quantityInBase;
      } else {
        consumptionByItem.set(entry.inventoryItemId, {
          itemName: entry.itemName,
          quantityInBase: entry.quantityInBase,
          baseUnit: entry.baseUnit,
        });
      }
    }
  }

  if (consumptionByItem.size === 0) {
    return { lotConsumptions: [], plannedExits: [] };
  }

  const warehouseId = await getDefaultWarehouseId(input.organizationId);
  const rawConsumptions: SaleLotConsumption[] = [];
  const plannedExits: PlannedSaleInventoryExit[] = [];

  for (const [itemId, entry] of consumptionByItem.entries()) {
    const openLots = await listOpenLotsForItem({
      organizationId: input.organizationId,
      warehouseId,
      itemId,
    });
    const { allocations } = allocateLotsFifo(openLots, entry.quantityInBase);

    for (const allocation of allocations) {
      rawConsumptions.push({
        inventoryItemId: itemId,
        itemName: entry.itemName,
        lotCode: allocation.lotCode,
        lotId: allocation.lotId,
        quantity: allocation.quantity,
        unitCost: allocation.unitCost,
        sourceReference: allocation.sourceReference,
      });
      plannedExits.push({
        itemId,
        itemName: entry.itemName,
        lotCode: allocation.lotCode,
        lotId: allocation.lotId,
        quantity: allocation.quantity,
        unitCost: allocation.unitCost,
        sourceReference: allocation.sourceReference,
      });
    }
  }

  return {
    lotConsumptions: mergeLotConsumptions(rawConsumptions),
    plannedExits,
  };
}

export async function applySaleInventoryConsumption(input: {
  organizationId: string;
  branchId: string;
  saleNumber: string;
  plannedExits: PlannedSaleInventoryExit[];
}): Promise<number> {
  if (input.plannedExits.length === 0) {
    return 0;
  }

  const warehouseId = await getDefaultWarehouseId(input.organizationId);
  let movements = 0;

  for (const exit of input.plannedExits) {
    await registerInventoryMovementClient({
      branchId: input.branchId,
      warehouseId,
      itemId: exit.itemId,
      type: "exit",
      quantity: exit.quantity,
      unitCost: exit.unitCost,
      lotCode: exit.lotCode,
      reference: input.saleNumber,
      notes: `Venta ${input.saleNumber} · ${exit.itemName} · lote ${exit.lotCode}`,
    });
    movements += 1;
  }

  return movements;
}

export async function consumeInventoryForSale(input: {
  organizationId: string;
  branchId: string;
  saleNumber: string;
  lines: Array<{ productId: string; quantity: number }>;
}): Promise<{ movements: number; lotConsumptions: SaleLotConsumption[] }> {
  const plan = await planSaleInventoryConsumption(input);
  const movements = await applySaleInventoryConsumption({
    organizationId: input.organizationId,
    branchId: input.branchId,
    saleNumber: input.saleNumber,
    plannedExits: plan.plannedExits,
  });

  return {
    movements,
    lotConsumptions: plan.lotConsumptions,
  };
}
