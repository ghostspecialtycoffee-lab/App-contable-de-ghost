import { validateSku } from "@ghost/domain";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { writeAuditLog } from "../shared/audit.js";
import { getDb } from "../shared/db.js";
import {
  assertOrgPermission,
  getActiveOrganizationId,
} from "../shared/permissions.js";

interface CreateInventoryItemRequest {
  sku: string;
  name: string;
  type: string;
  baseUnit: string;
  category?: string;
  minStock?: number;
  maxStock?: number;
  trackLot?: boolean;
}

export const createInventoryItem = onCall<
  CreateInventoryItemRequest,
  Promise<{ itemId: string }>
>(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const userId = request.auth.uid;
  const organizationId = await getActiveOrganizationId(userId);

  await assertOrgPermission(organizationId, userId, {
    module: "inventory",
    action: "create",
  });

  const skuResult = validateSku(request.data.sku ?? "");
  if (!skuResult.ok) {
    throw new HttpsError("invalid-argument", skuResult.error);
  }

  const name = request.data.name?.trim();
  if (!name || name.length < 2) {
    throw new HttpsError("invalid-argument", "El nombre es obligatorio.");
  }

  const db = getDb();
  const duplicate = await db
    .collection("organizations")
    .doc(organizationId)
    .collection("inventoryItems")
    .where("sku", "==", skuResult.value)
    .limit(1)
    .get();

  if (!duplicate.empty) {
    throw new HttpsError("already-exists", "Ese SKU ya existe.");
  }

  const itemRef = db
    .collection("organizations")
    .doc(organizationId)
    .collection("inventoryItems")
    .doc();
  const now = FieldValue.serverTimestamp();

  await itemRef.set({
    organizationId,
    sku: skuResult.value,
    name,
    type: request.data.type ?? "raw_material",
    baseUnit: request.data.baseUnit ?? "unit",
    category: request.data.category ?? "",
    status: "active",
    minStock: request.data.minStock ?? 0,
    maxStock: request.data.maxStock ?? null,
    averageCost: 0,
    lastCost: 0,
    trackLot: request.data.trackLot ?? false,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  await writeAuditLog({
    organizationId,
    actorUserId: userId,
    action: "create",
    entityType: "inventoryItem",
    entityId: itemRef.id,
    summary: `Ítem creado: ${skuResult.value} · ${name}`,
  });

  return { itemId: itemRef.id };
});
