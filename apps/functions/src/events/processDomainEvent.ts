import type { DomainEventEnvelope } from "@ghost/domain";
import { FieldValue } from "firebase-admin/firestore";

import { writeAuditLog } from "../shared/audit.js";
import { getDb } from "../shared/db.js";
import { resolveDomainEventSideEffects } from "@ghost/domain";
import { enqueueWorkflowOutboxEntries } from "../workflows/enqueue.js";

export async function processDomainEventOutboxEntry(
  organizationId: string,
  entryId: string,
  data: FirebaseFirestore.DocumentData,
): Promise<void> {
  const db = getDb();
  const entryRef = db
    .collection("organizations")
    .doc(organizationId)
    .collection("domainEventOutbox")
    .doc(entryId);

  const event: DomainEventEnvelope = {
    id: entryId,
    organizationId,
    branchId: data.branchId || undefined,
    type: data.type,
    aggregateType: data.aggregateType,
    aggregateId: data.aggregateId,
    payload: data.payload ?? {},
    actorUserId: data.actorUserId,
    actorSource: data.actorSource ?? "user",
    occurredAt: data.occurredAt ?? new Date().toISOString(),
    status: data.status ?? "pending",
  };

  if (event.status !== "pending") {
    return;
  }

  try {
    const effects = resolveDomainEventSideEffects(event);

    if (effects.audit) {
      const auditAction =
        effects.audit.action === "approve" || effects.audit.action === "update"
          ? "update"
          : effects.audit.action === "delete"
            ? "delete"
            : "create";

      await writeAuditLog({
        organizationId: effects.audit.organizationId,
        actorUserId: effects.audit.actorUserId,
        action: auditAction,
        entityType: effects.audit.entityType,
        entityId: effects.audit.entityId,
        summary: effects.audit.summary,
      });
    }

    if (effects.analyticsDelta) {
      const { date, ...delta } = effects.analyticsDelta;
      const analyticsRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("analyticsDaily")
        .doc(date);

      const patch: Record<string, unknown> = {
        organizationId,
        date,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (delta.salesCount) {
        patch.salesCount = FieldValue.increment(delta.salesCount);
      }
      if (delta.salesTotal) {
        patch.salesTotal = FieldValue.increment(delta.salesTotal);
      }
      if (delta.purchasesCount) {
        patch.purchasesCount = FieldValue.increment(delta.purchasesCount);
      }
      if (delta.purchasesTotal) {
        patch.purchasesTotal = FieldValue.increment(delta.purchasesTotal);
      }
      if (delta.inventoryMovements) {
        patch.inventoryMovements = FieldValue.increment(delta.inventoryMovements);
      }

      await analyticsRef.set(patch, { merge: true });
    }

    const orgSnap = await db.collection("organizations").doc(organizationId).get();
    await enqueueWorkflowOutboxEntries({
      organizationId,
      domainEventId: entryId,
      event,
      organizationName: String(orgSnap.data()?.name ?? "Organización"),
      workflowSettings: orgSnap.data()?.workflowSettings,
    });

    await entryRef.update({
      status: "processed",
      processedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    await entryRef.update({
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Error procesando evento",
      processedAt: FieldValue.serverTimestamp(),
    });
    throw error;
  }
}
