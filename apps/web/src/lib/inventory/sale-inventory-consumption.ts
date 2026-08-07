import type { Recipe, SaleLotConsumption, SaleRecipeSnapshot } from "@ghost/domain";
import {
  allocateLotsFifo,
  calculateRecipeConsumption,
  mergeLotConsumptions,
  resolveEffectiveCostMethod,
  resolveMovementUnitCost,
  type InventoryCostMethod,
  type InventoryCostProfile,
  type BaseUnit,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";
import { listOpenLotsForItem } from "@/lib/inventory/inventory-lots-client";
import { registerInventoryMovementClient } from "@/lib/inventory/inventory-client";

interface ItemInventoryMeta {
  itemName: string;
  averageCost: number;
  standardCost?: number;
  costMethod?: InventoryCostMethod;
  baseUnit: string;
  purchaseUnit?: string;
  presentationQuantity?: number;
}

interface ProductIngredientNeed {
  productId: string;
  itemId: string;
  quantityInBase: number;
}

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

async function loadRecipesByProduct(organizationId: string): Promise<Map<string, Recipe>> {
  const db = getFirestoreDb();
  const recipesSnap = await getDocs(
    collection(db, firestorePaths.organizationRecipes(organizationId)),
  );
  const recipesByProduct = new Map<string, Recipe>();

  for (const document of recipesSnap.docs) {
    const data = document.data();
    recipesByProduct.set(data.menuProductId as string, {
      id: document.id,
      organizationId: data.organizationId,
      menuProductId: data.menuProductId,
      menuProductName: data.menuProductName,
      currentVersion: data.currentVersion ?? 1,
      recipeCost: data.recipeCost ?? 0,
      yieldQuantity: data.yieldQuantity ?? 1,
      lines: data.lines ?? [],
    });
  }

  return recipesByProduct;
}

function recipeFromSnapshot(snapshot: SaleRecipeSnapshot): Recipe {
  return {
    id: snapshot.recipeId,
    organizationId: "",
    menuProductId: snapshot.productId,
    menuProductName: "",
    currentVersion: snapshot.recipeVersion,
    recipeCost: snapshot.recipeCost,
    yieldQuantity: snapshot.yieldQuantity,
    lines: snapshot.lines,
  };
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
  organizationCostMethod: InventoryCostMethod;
  lines: Array<{ productId: string; quantity: number }>;
  recipeSnapshots?: SaleRecipeSnapshot[];
}): Promise<{
  lotConsumptions: SaleLotConsumption[];
  plannedExits: PlannedSaleInventoryExit[];
  ingredientCostByProduct: Record<string, number>;
}> {
  const snapshotsByProduct = new Map(
    (input.recipeSnapshots ?? []).map((snapshot) => [snapshot.productId, snapshot]),
  );
  const recipesByProduct =
    snapshotsByProduct.size > 0
      ? null
      : await loadRecipesByProduct(input.organizationId);

  const itemMeta = new Map<string, ItemInventoryMeta>();
  const consumptionByItem = new Map<string, number>();
  const productNeeds: ProductIngredientNeed[] = [];

  for (const saleLine of input.lines) {
    const snapshot = snapshotsByProduct.get(saleLine.productId);
    const recipe = snapshot
      ? recipeFromSnapshot(snapshot)
      : recipesByProduct?.get(saleLine.productId);

    if (!recipe || recipe.lines.length === 0) {
      continue;
    }

    const itemProfiles: Record<string, InventoryCostProfile> = {};
    for (const line of recipe.lines) {
      if (itemProfiles[line.inventoryItemId]) {
        continue;
      }
      const itemSnap = await getDoc(
        doc(
          getFirestoreDb(),
          firestorePaths.organizationInventoryItem(input.organizationId, line.inventoryItemId),
        ),
      );
      if (!itemSnap.exists()) {
        continue;
      }
      const data = itemSnap.data();
      const meta: ItemInventoryMeta = {
        itemName: String(data.name ?? line.itemName),
        averageCost: Number(data.averageCost ?? data.lastCost ?? 0),
        standardCost:
          data.standardCost != null ? Number(data.standardCost) : undefined,
        costMethod: data.costMethod as InventoryCostMethod | undefined,
        baseUnit: data.baseUnit,
        purchaseUnit: data.purchaseUnit,
        presentationQuantity: data.presentationQuantity,
      };
      itemMeta.set(line.inventoryItemId, meta);
      itemProfiles[line.inventoryItemId] = {
        baseUnit: meta.baseUnit as BaseUnit,
        averageCost: meta.averageCost,
        purchaseUnit: meta.purchaseUnit as BaseUnit | undefined,
        presentationQuantity: meta.presentationQuantity,
      };
    }

    const lines = calculateRecipeConsumption(recipe, saleLine.quantity, itemProfiles);
    for (const entry of lines) {
      consumptionByItem.set(
        entry.inventoryItemId,
        (consumptionByItem.get(entry.inventoryItemId) ?? 0) + entry.quantityInBase,
      );
      productNeeds.push({
        productId: saleLine.productId,
        itemId: entry.inventoryItemId,
        quantityInBase: entry.quantityInBase,
      });
    }
  }

  if (consumptionByItem.size === 0) {
    return { lotConsumptions: [], plannedExits: [], ingredientCostByProduct: {} };
  }

  const warehouseId = await getDefaultWarehouseId(input.organizationId);
  const rawConsumptions: SaleLotConsumption[] = [];
  const plannedExits: PlannedSaleInventoryExit[] = [];
  const itemExitCost = new Map<string, number>();

  for (const [itemId, quantityInBase] of consumptionByItem.entries()) {
    const meta = itemMeta.get(itemId);
    if (!meta) {
      continue;
    }

    const method = resolveEffectiveCostMethod({
      organizationMethod: input.organizationCostMethod,
      itemMethod: meta.costMethod,
    });

    const openLots = await listOpenLotsForItem({
      organizationId: input.organizationId,
      warehouseId,
      itemId,
    });
    const { allocations } = allocateLotsFifo(openLots, quantityInBase);

    let itemCost = 0;
    for (const allocation of allocations) {
      const unitCost = resolveMovementUnitCost({
        method,
        averageCost: meta.averageCost,
        standardCost: meta.standardCost,
        lotUnitCost: allocation.unitCost,
      });

      itemCost += Math.round(allocation.quantity * unitCost);

      rawConsumptions.push({
        inventoryItemId: itemId,
        itemName: meta.itemName,
        lotCode: allocation.lotCode,
        lotId: allocation.lotId,
        quantity: allocation.quantity,
        unitCost,
        sourceReference: allocation.sourceReference,
      });
      plannedExits.push({
        itemId,
        itemName: meta.itemName,
        lotCode: allocation.lotCode,
        lotId: allocation.lotId,
        quantity: allocation.quantity,
        unitCost,
        sourceReference: allocation.sourceReference,
      });
    }

    itemExitCost.set(itemId, itemCost);
  }

  const ingredientCostByProduct: Record<string, number> = {};
  for (const need of productNeeds) {
    const totalQty = consumptionByItem.get(need.itemId) ?? 0;
    const totalItemCost = itemExitCost.get(need.itemId) ?? 0;
    if (totalQty <= 0 || totalItemCost <= 0) {
      continue;
    }
    const share = Math.round((need.quantityInBase / totalQty) * totalItemCost);
    ingredientCostByProduct[need.productId] =
      (ingredientCostByProduct[need.productId] ?? 0) + share;
  }

  return {
    lotConsumptions: mergeLotConsumptions(rawConsumptions),
    plannedExits,
    ingredientCostByProduct,
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
  organizationCostMethod: InventoryCostMethod;
  lines: Array<{ productId: string; quantity: number }>;
  recipeSnapshots?: SaleRecipeSnapshot[];
}): Promise<{
  movements: number;
  lotConsumptions: SaleLotConsumption[];
  ingredientCostByProduct: Record<string, number>;
}> {
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
    ingredientCostByProduct: plan.ingredientCostByProduct,
  };
}
