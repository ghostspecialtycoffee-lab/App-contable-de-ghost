import {
  buildInventoryLotDocId,
  calculateWeightedAverageCost,
  LEGACY_LOT_CODE,
  validateMovementQuantity,
  validateSku,
  type InventoryMovementType,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";
import { recordInventoryMovementAnalyticsSafe } from "@/lib/analytics/analytics-client";

function requireUserId(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }
  return uid;
}

async function getOrganizationIdFromProfile(): Promise<string> {
  const uid = requireUserId();
  const userRef = doc(getFirestoreDb(), firestorePaths.user(uid));
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("Perfil no encontrado. Completa el onboarding.");
  }

  const membership = (userSnap.data().memberships ?? []).find(
    (entry: { isActive?: boolean }) => entry.isActive,
  );

  if (!membership?.organizationId) {
    throw new Error("No hay organización activa.");
  }

  return membership.organizationId as string;
}

export async function createInventoryItemClient(input: {
  sku: string;
  name: string;
  type: string;
  baseUnit: string;
  category?: string;
  minStock?: number;
  maxStock?: number;
  trackLot?: boolean;
  purchaseUnit?: string;
  presentationQuantity?: number;
  presentationLabel?: string;
}): Promise<{ itemId: string }> {
  const userId = requireUserId();
  const organizationId = await getOrganizationIdFromProfile();
  const skuResult = validateSku(input.sku);

  if (!skuResult.ok) {
    throw new Error(skuResult.error);
  }

  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error("El nombre es obligatorio.");
  }

  const db = getFirestoreDb();
  const duplicateQuery = query(
    collection(db, firestorePaths.organizationInventoryItems(organizationId)),
    where("sku", "==", skuResult.value),
    limit(1),
  );
  const duplicateSnap = await getDocs(duplicateQuery);

  if (!duplicateSnap.empty) {
    throw new Error("Ese SKU ya existe.");
  }

  const itemRef = doc(
    collection(db, firestorePaths.organizationInventoryItems(organizationId)),
  );
  const now = serverTimestamp();

  await setDoc(itemRef, {
    organizationId,
    sku: skuResult.value,
    name,
    type: input.type ?? "raw_material",
    baseUnit: input.baseUnit ?? "unit",
    category: input.category ?? "",
    status: "active",
    minStock: input.minStock ?? 0,
    maxStock: input.maxStock ?? null,
    averageCost: 0,
    lastCost: 0,
    trackLot: input.trackLot ?? false,
    purchaseUnit: input.purchaseUnit ?? input.baseUnit,
    presentationQuantity: input.presentationQuantity ?? 1,
    presentationLabel: input.presentationLabel?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  return { itemId: itemRef.id };
}

export async function updateInventoryItemClient(input: {
  itemId: string;
  purchaseUnit?: string;
  presentationQuantity?: number;
  presentationLabel?: string;
  name?: string;
  category?: string;
  minStock?: number;
  maxStock?: number;
  status?: string;
}): Promise<void> {
  const userId = requireUserId();
  const organizationId = await getOrganizationIdFromProfile();
  const itemRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationInventoryItem(organizationId, input.itemId),
  );
  const itemSnap = await getDoc(itemRef);

  if (!itemSnap.exists()) {
    throw new Error("Ítem no encontrado.");
  }

  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new Error("El nombre es obligatorio.");
    }
    patch.name = name;
  }

  if (input.category !== undefined) {
    patch.category = input.category;
  }

  if (input.minStock !== undefined) {
    patch.minStock = input.minStock;
  }

  if (input.maxStock !== undefined) {
    patch.maxStock = input.maxStock;
  }

  if (input.status !== undefined) {
    patch.status = input.status;
  }

  if (input.purchaseUnit !== undefined) {
    patch.purchaseUnit = input.purchaseUnit;
  }

  if (input.presentationQuantity !== undefined) {
    if (!Number.isFinite(input.presentationQuantity) || input.presentationQuantity <= 0) {
      throw new Error("La cantidad por unidad debe ser mayor que cero.");
    }
    patch.presentationQuantity = input.presentationQuantity;
  }

  if (input.presentationLabel !== undefined) {
    patch.presentationLabel = input.presentationLabel.trim();
  }

  await updateDoc(itemRef, patch);
}

export async function createWarehouseClient(input: {
  branchId: string;
  name: string;
  code: string;
  isDefault?: boolean;
}): Promise<{ warehouseId: string }> {
  const userId = requireUserId();
  const organizationId = await getOrganizationIdFromProfile();
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();

  if (!name || !code) {
    throw new Error("Nombre y código son obligatorios.");
  }

  const db = getFirestoreDb();
  const warehouseRef = doc(
    collection(db, firestorePaths.organizationWarehouses(organizationId)),
  );
  const now = serverTimestamp();

  await setDoc(warehouseRef, {
    organizationId,
    branchId: input.branchId,
    name,
    code,
    status: "active",
    isDefault: input.isDefault ?? false,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  return { warehouseId: warehouseRef.id };
}

export async function registerInventoryMovementClient(input: {
  branchId: string;
  warehouseId: string;
  itemId: string;
  type: string;
  quantity: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
  lotCode?: string;
}): Promise<{ movementId: string; balanceAfter: number }> {
  const userId = requireUserId();
  const organizationId = await getOrganizationIdFromProfile();

  const quantityResult = validateMovementQuantity({
    type: input.type as InventoryMovementType,
    quantity: Number(input.quantity),
  });

  if (!quantityResult.ok) {
    throw new Error(quantityResult.error);
  }

  const signedQuantity = quantityResult.value;
  const unitCost = Number(input.unitCost ?? 0);
  const db = getFirestoreDb();

  const itemRef = doc(
    db,
    firestorePaths.organizationInventoryItem(organizationId, input.itemId),
  );
  const warehouseRef = doc(
    db,
    firestorePaths.organizationWarehouse(organizationId, input.warehouseId),
  );
  const balanceRef = doc(
    db,
    firestorePaths.organizationInventoryBalance(
      organizationId,
      input.warehouseId,
      input.itemId,
    ),
  );
  const movementRef = doc(
    collection(db, firestorePaths.organizationInventoryMovements(organizationId)),
  );
  const lotCode = input.lotCode?.trim() || "";
  const trackLot = lotCode.length > 0 && lotCode !== LEGACY_LOT_CODE;
  const lotRef = trackLot
    ? doc(
        db,
        firestorePaths.organizationInventoryLot(
          organizationId,
          buildInventoryLotDocId(input.warehouseId, input.itemId, lotCode),
        ),
      )
    : null;

  const balanceAfter = await runTransaction(db, async (transaction) => {
    const itemSnap = await transaction.get(itemRef);
    const warehouseSnap = await transaction.get(warehouseRef);
    const balanceSnap = await transaction.get(balanceRef);
    const lotSnap = lotRef ? await transaction.get(lotRef) : null;

    if (!itemSnap.exists()) {
      throw new Error("Ítem no encontrado.");
    }

    if (!warehouseSnap.exists()) {
      throw new Error("Bodega no encontrada.");
    }

    if (warehouseSnap.data()?.branchId !== input.branchId) {
      throw new Error("La bodega no pertenece a la sucursal indicada.");
    }

    const currentQty = balanceSnap.exists()
      ? Number(balanceSnap.data()?.quantity ?? 0)
      : 0;
    const currentAvg = balanceSnap.exists()
      ? Number(balanceSnap.data()?.averageCost ?? 0)
      : Number(itemSnap.data()?.averageCost ?? 0);

    const nextBalance = currentQty + signedQuantity;

    if (nextBalance < 0) {
      throw new Error("Stock insuficiente para registrar la salida.");
    }

    const incomingQty = signedQuantity > 0 ? signedQuantity : 0;
    const averageCost = calculateWeightedAverageCost(
      currentQty,
      currentAvg,
      incomingQty,
      unitCost || Number(itemSnap.data()?.lastCost ?? 0),
    );
    const now = serverTimestamp();
    const totalCost = Math.abs(signedQuantity) * (unitCost || averageCost);

    if (trackLot && lotRef) {
      const absQuantity = Math.abs(signedQuantity);
      if (signedQuantity > 0) {
        const currentLotQty = lotSnap?.exists()
          ? Number(lotSnap.data()?.quantityRemaining ?? 0)
          : 0;
        transaction.set(
          lotRef,
          {
            organizationId,
            branchId: input.branchId,
            warehouseId: input.warehouseId,
            itemId: input.itemId,
            lotCode,
            quantityRemaining: currentLotQty + absQuantity,
            unitCost: unitCost || averageCost,
            sourceReference: input.reference ?? "",
            sourceMovementId: movementRef.id,
            receivedAt: lotSnap?.exists()
              ? lotSnap.data()?.receivedAt ?? new Date().toISOString()
              : new Date().toISOString(),
            updatedAt: now,
          },
          { merge: true },
        );
      } else {
        const currentLotQty = lotSnap?.exists()
          ? Number(lotSnap.data()?.quantityRemaining ?? 0)
          : 0;
        const nextLotQty = Math.max(0, currentLotQty - absQuantity);
        if (lotSnap?.exists()) {
          transaction.set(
            lotRef,
            {
              quantityRemaining: nextLotQty,
              updatedAt: now,
            },
            { merge: true },
          );
        }
      }
    }

    transaction.set(movementRef, {
      organizationId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      itemId: input.itemId,
      type: input.type,
      quantity: signedQuantity,
      unitCost: unitCost || averageCost,
      totalCost,
      balanceAfter: nextBalance,
      reference: input.reference ?? "",
      notes: input.notes ?? "",
      lotCode,
      actorUserId: userId,
      occurredAt: now,
    });

    transaction.set(
      balanceRef,
      {
        organizationId,
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        itemId: input.itemId,
        quantity: nextBalance,
        averageCost,
        updatedAt: now,
      },
      { merge: true },
    );

    transaction.set(
      itemRef,
      {
        averageCost,
        lastCost: unitCost || itemSnap.data()?.lastCost || 0,
        updatedAt: now,
        updatedBy: userId,
      },
      { merge: true },
    );

    return nextBalance;
  });

  await recordInventoryMovementAnalyticsSafe({
    organizationId,
    occurredAt: new Date().toISOString(),
  });

  return { movementId: movementRef.id, balanceAfter };
}
