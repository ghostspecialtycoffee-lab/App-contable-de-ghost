import {
  evaluateWorkflowsForEvent,
  resolveWorkflowSettings,
  type DomainEventEnvelope,
  type WorkflowOutboxEntryInput,
} from "@ghost/domain";
import { FieldValue } from "firebase-admin/firestore";

import { getDb } from "../shared/db.js";

export async function enqueueWorkflowOutboxEntries(input: {
  organizationId: string;
  domainEventId: string;
  event: DomainEventEnvelope;
  organizationName: string;
  workflowSettings?: Parameters<typeof resolveWorkflowSettings>[0];
}): Promise<number> {
  const entries = evaluateWorkflowsForEvent(input.event, {
    organizationName: input.organizationName,
    workflowSettings: resolveWorkflowSettings(input.workflowSettings),
  });

  if (entries.length === 0) {
    return 0;
  }

  const db = getDb();
  const collectionRef = db
    .collection("organizations")
    .doc(input.organizationId)
    .collection("workflowOutbox");

  const existing = await collectionRef.where("domainEventId", "==", input.domainEventId).limit(1).get();
  if (!existing.empty) {
    return 0;
  }

  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  for (const entry of entries) {
    const ref = collectionRef.doc();
    batch.set(ref, buildWorkflowOutboxDocument({
      organizationId: input.organizationId,
      domainEventId: input.domainEventId,
      domainEventType: input.event.type,
      entry,
      now,
    }));
  }

  await batch.commit();
  return entries.length;
}

function buildWorkflowOutboxDocument(input: {
  organizationId: string;
  domainEventId: string;
  domainEventType: DomainEventEnvelope["type"];
  entry: WorkflowOutboxEntryInput;
  now: FirebaseFirestore.FieldValue;
}) {
  return {
    organizationId: input.organizationId,
    domainEventId: input.domainEventId,
    domainEventType: input.domainEventType,
    workflowId: input.entry.workflowId,
    channel: input.entry.channel,
    title: input.entry.title,
    message: input.entry.message,
    actionUrl: input.entry.actionUrl ?? "",
    recipientPhone: input.entry.recipientPhone ?? "",
    metadata: input.entry.metadata ?? {},
    status: "ready",
    createdAt: input.now,
    processedAt: input.now,
  };
}
