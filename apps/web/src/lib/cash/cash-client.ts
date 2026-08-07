import {
  validateCashMovementAmount,
  validateOpeningAmount,
  type CashMovementType,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

function requireUserId(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }
  return uid;
}

async function getActiveContext(): Promise<{
  organizationId: string;
  branchId: string;
  userId: string;
}> {
  const userId = requireUserId();
  const userRef = doc(getFirestoreDb(), firestorePaths.user(userId));
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("Perfil no encontrado.");
  }

  const membership = (userSnap.data().memberships ?? []).find(
    (entry: { isActive?: boolean }) => entry.isActive,
  );

  if (!membership?.organizationId) {
    throw new Error("No hay organización activa.");
  }

  const branchId = membership.branchIds?.[0];
  if (!branchId) {
    throw new Error("No hay sucursal activa.");
  }

  return {
    organizationId: membership.organizationId as string,
    branchId: branchId as string,
    userId,
  };
}

export async function getOpenCashSessionClient(): Promise<{
  sessionId: string;
  sessionDate: string;
  openingAmount: number;
  openedAt: string;
} | null> {
  const { organizationId, branchId } = await getActiveContext();
  const db = getFirestoreDb();
  const openQuery = query(
    collection(db, firestorePaths.organizationCashSessions(organizationId)),
    where("branchId", "==", branchId),
    where("status", "==", "open"),
    limit(1),
  );
  const snapshot = await getDocs(openQuery);

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0]!;
  const data = document.data();
  return {
    sessionId: document.id,
    sessionDate: String(data.sessionDate ?? ""),
    openingAmount: Number(data.openingAmount ?? 0),
    openedAt: String(data.openedAt ?? ""),
  };
}

export async function requireOpenCashSessionClient(): Promise<{
  sessionId: string;
  organizationId: string;
  branchId: string;
}> {
  const context = await getActiveContext();
  const session = await getOpenCashSessionClient();
  if (!session) {
    throw new Error("Debes abrir caja antes de vender. Ve a Caja y registra el fondo inicial.");
  }

  return {
    sessionId: session.sessionId,
    organizationId: context.organizationId,
    branchId: context.branchId,
  };
}

export async function openCashSessionClient(input: {
  openingAmount: number;
  openingNotes?: string;
}): Promise<{ sessionId: string }> {
  const validation = validateOpeningAmount(input.openingAmount);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const { organizationId, branchId, userId } = await getActiveContext();
  const existing = await getOpenCashSessionClient();
  if (existing) {
    throw new Error("Ya hay una caja abierta. Ciérrala antes de iniciar otra jornada.");
  }

  const openedAt = new Date().toISOString();
  const sessionDate = openedAt.slice(0, 10);
  const db = getFirestoreDb();
  const sessionRef = doc(
    collection(db, firestorePaths.organizationCashSessions(organizationId)),
  );
  const now = serverTimestamp();

  await setDoc(sessionRef, {
    organizationId,
    branchId,
    status: "open",
    sessionDate,
    openingAmount: Math.round(input.openingAmount),
    openedAt,
    openedBy: userId,
    openingNotes: input.openingNotes?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  return { sessionId: sessionRef.id };
}

export async function closeCashSessionClient(input: {
  sessionId: string;
  countedAmount: number;
  expectedAmount: number;
  closingNotes?: string;
}): Promise<void> {
  if (!Number.isFinite(input.countedAmount) || input.countedAmount < 0) {
    throw new Error("Ingresa el efectivo contado en caja.");
  }

  const { organizationId, userId } = await getActiveContext();
  const db = getFirestoreDb();
  const sessionRef = doc(
    db,
    firestorePaths.organizationCashSession(organizationId, input.sessionId),
  );
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    throw new Error("Sesión de caja no encontrada.");
  }

  const session = sessionSnap.data();
  if (session.status !== "open") {
    throw new Error("Esta caja ya está cerrada.");
  }

  const closedAt = new Date().toISOString();
  const expectedAmount = Math.round(input.expectedAmount);
  const countedAmount = Math.round(input.countedAmount);

  await setDoc(
    sessionRef,
    {
      status: "closed",
      closedAt,
      closedBy: userId,
      closingCountedAmount: countedAmount,
      closingExpectedAmount: expectedAmount,
      closingDifference: countedAmount - expectedAmount,
      closingNotes: input.closingNotes?.trim() ?? "",
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );
}

export async function registerCashMovementClient(input: {
  sessionId: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  reference?: string;
}): Promise<{ movementId: string }> {
  const amountValidation = validateCashMovementAmount(input.amount);
  if (!amountValidation.ok) {
    throw new Error(amountValidation.error);
  }

  const reason = input.reason.trim();
  if (reason.length < 2) {
    throw new Error("Describe el motivo del movimiento.");
  }

  const { organizationId, branchId, userId } = await getActiveContext();
  const db = getFirestoreDb();
  const sessionRef = doc(
    db,
    firestorePaths.organizationCashSession(organizationId, input.sessionId),
  );
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    throw new Error("Sesión de caja no encontrada.");
  }

  if (sessionSnap.data().status !== "open") {
    throw new Error("La caja está cerrada. Abre una nueva sesión para registrar movimientos.");
  }

  const occurredAt = new Date().toISOString();
  const movementRef = doc(
    collection(db, firestorePaths.organizationCashMovements(organizationId)),
  );
  const now = serverTimestamp();

  await setDoc(movementRef, {
    organizationId,
    branchId,
    cashSessionId: input.sessionId,
    type: input.type,
    amount: Math.round(input.amount),
    reason,
    reference: input.reference?.trim() ?? "",
    occurredAt,
    actorUserId: userId,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  return { movementId: movementRef.id };
}
