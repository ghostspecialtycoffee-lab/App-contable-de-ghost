import {
  calculateWeightedAverageCost,
  validateMovementQuantity,
  type InventoryMovementType,
} from "@ghost/domain";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { writeAuditLog } from "../shared/audit.js";
import { getDb } from "../shared/db.js";
import {
  assertOrgPermission,
  getActiveOrganizationId,
} from "../shared/permissions.js";

interface RegisterMovementRequest {
  branchId: string;
  warehouseId: string;
  itemId: string;
  type: string;
  quantity: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
  lotCode?: string;
}

export const registerInventoryMovement = onCall<
  RegisterMovementRequest,
  Promise<{ movementId: string; balanceAfter: number }>
>(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const userId = request.auth.uid;
  const organizationId = await getActiveOrganizationId(userId);
  const membership = await assertOrgPermission(organizationId, userId, {
    module: "inventory",
    action: "update",
  });

  const { branchId, warehouseId, itemId, type } = request.data;

  if (!branchId || !warehouseId || !itemId || !type) {
    throw new HttpsError("invalid-argument", "Datos incompletos.");
  }

  if (!membership.branchIds.includes(branchId)) {
    throw new HttpsError("permission-denied", "Sucursal no autorizada.");
  }

  const quantityResult = validateMovementQuantity({
    type: type as InventoryMovementType,
    quantity: Number(request.data.quantity),
  });

  if (!quantityResult.ok) {
    throw new HttpsError("invalid-argument", quantityResult.error);
  }

  const signedQuantity = quantityResult.value;
  const unitCost = Number(request.data.unitCost ?? 0);
  const db = getDb();

  const orgRef = db.collection("organizations").doc(organizationId);
  const itemRef = orgRef.collection("inventoryItems").doc(itemId);
  const warehouseRef = orgRef.collection("warehouses").doc(warehouseId);
  const balanceRef = orgRef
    .collection("inventoryBalances")
    .doc(`${warehouseId}_${itemId}`);
  const movementRef = orgRef.collection("inventoryMovements").doc();

  const result = await db.runTransaction(async (transaction) => {
    const [itemSnap, warehouseSnap, balanceSnap] = await Promise.all([
      transaction.get(itemRef),
      transaction.get(warehouseRef),
      transaction.get(balanceRef),
    ]);

    if (!itemSnap.exists) {
      throw new HttpsError("not-found", "Ítem no encontrado.");
    }

    if (!warehouseSnap.exists) {
      throw new HttpsError("not-found", "Bodega no encontrada.");
    }

    if (warehouseSnap.get("branchId") !== branchId) {
      throw new HttpsError(
        "failed-precondition",
        "La bodega no pertenece a la sucursal indicada.",
      );
    }

    const currentQty = balanceSnap.exists
      ? Number(balanceSnap.get("quantity") ?? 0)
      : 0;
    const currentAvg = balanceSnap.exists
      ? Number(balanceSnap.get("averageCost") ?? 0)
      : Number(itemSnap.get("averageCost") ?? 0);

    const balanceAfter = currentQty + signedQuantity;

    if (balanceAfter < 0) {
      throw new HttpsError(
        "failed-precondition",
        "Stock insuficiente para registrar la salida.",
      );
    }

    const incomingQty = signedQuantity > 0 ? signedQuantity : 0;
    const averageCost = calculateWeightedAverageCost(
      currentQty,
      currentAvg,
      incomingQty,
      unitCost || Number(itemSnap.get("lastCost") ?? 0),
    );

    const now = FieldValue.serverTimestamp();
    const totalCost = Math.abs(signedQuantity) * (unitCost || averageCost);

    transaction.set(movementRef, {
      organizationId,
      branchId,
      warehouseId,
      itemId,
      type,
      quantity: signedQuantity,
      unitCost: unitCost || averageCost,
      totalCost,
      balanceAfter,
      reference: request.data.reference ?? "",
      notes: request.data.notes ?? "",
      lotCode: request.data.lotCode ?? "",
      actorUserId: userId,
      occurredAt: now,
    });

    transaction.set(
      balanceRef,
      {
        organizationId,
        branchId,
        warehouseId,
        itemId,
        quantity: balanceAfter,
        averageCost,
        updatedAt: now,
      },
      { merge: true },
    );

    transaction.set(
      itemRef,
      {
        averageCost,
        lastCost: unitCost || itemSnap.get("lastCost") || 0,
        updatedAt: now,
        updatedBy: userId,
      },
      { merge: true },
    );

    return { balanceAfter };
  });

  await writeAuditLog({
    organizationId,
    actorUserId: userId,
    action: "update",
    entityType: "inventoryMovement",
    entityId: movementRef.id,
    summary: `Movimiento ${type}: ${signedQuantity} · ítem ${itemId}`,
  });

  return {
    movementId: movementRef.id,
    balanceAfter: result.balanceAfter,
  };
});
