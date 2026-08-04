import { FieldValue } from "firebase-admin/firestore";

import { getDb } from "./db.js";

interface WriteAuditLogInput {
  organizationId: string;
  actorUserId: string;
  action: "create" | "update" | "delete";
  entityType: string;
  entityId: string;
  summary: string;
}

export async function writeAuditLog(input: WriteAuditLogInput) {
  const db = getDb();
  const logRef = db
    .collection("organizations")
    .doc(input.organizationId)
    .collection("auditLogs")
    .doc();

  await logRef.set({
    id: logRef.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    occurredAt: FieldValue.serverTimestamp(),
  });
}
