import {
  createDomainEvent,
  type DomainEventActorSource,
  type PublishDomainEventInput,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

function requireUserId(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }
  return uid;
}

export async function publishDomainEventClient(
  input: PublishDomainEventInput,
): Promise<{ eventId: string }> {
  const userId = requireUserId();
  const event = createDomainEvent({
    ...input,
    actorUserId: input.actorUserId || userId,
  });

  const eventRef = doc(
    collection(getFirestoreDb(), firestorePaths.organizationDomainEventOutbox(input.organizationId)),
  );

  await setDoc(eventRef, {
    organizationId: event.organizationId,
    branchId: event.branchId ?? "",
    type: event.type,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload,
    actorUserId: event.actorUserId,
    actorSource: event.actorSource,
    occurredAt: event.occurredAt,
    status: "pending",
    createdAt: serverTimestamp(),
    createdBy: userId,
  });

  return { eventId: eventRef.id };
}

export async function publishDomainEventSafe(
  input: PublishDomainEventInput & { actorSource?: DomainEventActorSource },
): Promise<void> {
  try {
    await publishDomainEventClient(input);
  } catch {
    // No bloquear operación principal si falla el bus de eventos.
  }
}
