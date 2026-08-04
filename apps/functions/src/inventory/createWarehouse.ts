import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { writeAuditLog } from "../shared/audit.js";
import { getDb } from "../shared/db.js";
import {
  assertOrgPermission,
  getActiveOrganizationId,
} from "../shared/permissions.js";

interface CreateWarehouseRequest {
  branchId: string;
  name: string;
  code: string;
  isDefault?: boolean;
}

export const createWarehouse = onCall<
  CreateWarehouseRequest,
  Promise<{ warehouseId: string }>
>(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const userId = request.auth.uid;
  const organizationId = await getActiveOrganizationId(userId);
  const membership = await assertOrgPermission(organizationId, userId, {
    module: "inventory",
    action: "create",
  });

  const branchId = request.data.branchId;
  if (!branchId || !membership.branchIds.includes(branchId)) {
    throw new HttpsError("permission-denied", "Sucursal no autorizada.");
  }

  const name = request.data.name?.trim();
  const code = request.data.code?.trim().toUpperCase();

  if (!name || !code) {
    throw new HttpsError("invalid-argument", "Nombre y código son obligatorios.");
  }

  const db = getDb();
  const warehouseRef = db
    .collection("organizations")
    .doc(organizationId)
    .collection("warehouses")
    .doc();
  const now = FieldValue.serverTimestamp();

  await warehouseRef.set({
    organizationId,
    branchId,
    name,
    code,
    status: "active",
    isDefault: request.data.isDefault ?? false,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  await writeAuditLog({
    organizationId,
    actorUserId: userId,
    action: "create",
    entityType: "warehouse",
    entityId: warehouseRef.id,
    summary: `Bodega creada: ${code} · ${name}`,
  });

  return { warehouseId: warehouseRef.id };
});
