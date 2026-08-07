import type { DomainEventEnvelope, WorkflowOutboxEntryInput } from "@ghost/domain";
import { evaluateWorkflowsForEvent, resolveWorkflowSettings } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, doc, getDocs, limit, query, serverTimestamp, where, writeBatch } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

export async function enqueueWorkflowOutboxEntriesClient(input: {
  organizationId: string;
  domainEventId: string;
  event: DomainEventEnvelope;
  organizationName: string;
  workflowSettings?: Parameters<typeof resolveWorkflowSettings>[0];
}): Promise<number> {
  const userId = getFirebaseAuth().currentUser?.uid ?? input.event.actorUserId;
  const entries = evaluateWorkflowsForEvent(input.event, {
    organizationName: input.organizationName,
    workflowSettings: resolveWorkflowSettings(input.workflowSettings),
  });

  if (entries.length === 0) {
    return 0;
  }

  const db = getFirestoreDb();
  const collectionPath = firestorePaths.organizationWorkflowOutbox(input.organizationId);
  const existing = await getDocs(
    query(
      collection(db, collectionPath),
      where("domainEventId", "==", input.domainEventId),
      limit(1),
    ),
  );
  if (!existing.empty) {
    return 0;
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();
  const collectionRef = collection(db, collectionPath);

  for (const entry of entries) {
    const ref = doc(collectionRef);
    batch.set(ref, buildWorkflowOutboxDocument({
      organizationId: input.organizationId,
      domainEventId: input.domainEventId,
      domainEventType: input.event.type,
      entry,
      createdBy: userId,
      now,
    }));
  }

  await batch.commit();
  return entries.length;
}

export async function enqueueWorkflowOutboxEntriesSafe(
  input: Parameters<typeof enqueueWorkflowOutboxEntriesClient>[0],
): Promise<void> {
  try {
    await enqueueWorkflowOutboxEntriesClient(input);
  } catch {
    // No bloquear operación principal.
  }
}

function buildWorkflowOutboxDocument(input: {
  organizationId: string;
  domainEventId: string;
  domainEventType: DomainEventEnvelope["type"];
  entry: WorkflowOutboxEntryInput;
  createdBy: string;
  now: ReturnType<typeof serverTimestamp>;
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
    createdBy: input.createdBy,
    processedAt: input.now,
  };
}
