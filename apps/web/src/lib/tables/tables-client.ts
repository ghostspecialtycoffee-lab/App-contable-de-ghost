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
import { openTableSessionClient } from "./table-sessions-client";
import {
  findDiningTableByQrLookupClient,
  refreshTableQrLookupClient,
  upsertTableQrLookupClient,
} from "./table-qr-lookup-client";

export { syncTableQrLookupsClient } from "./table-qr-lookup-client";

function createQrToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function getStaffContext(): Promise<{
  userId: string;
  organizationId: string;
  branchId: string;
}> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }

  const userRef = doc(getFirestoreDb(), firestorePaths.user(uid));
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
    userId: uid,
    organizationId: membership.organizationId as string,
    branchId: branchId as string,
  };
}

export async function createDiningTableClient(input: {
  number: number;
  label?: string;
  capacity?: number;
}): Promise<{ tableId: string; qrToken: string; sessionId: string }> {
  const { userId, organizationId, branchId } = await getStaffContext();
  const db = getFirestoreDb();
  const tableRef = doc(
    collection(db, firestorePaths.organizationDiningTables(organizationId)),
  );
  const qrToken = createQrToken();
  const now = serverTimestamp();

  await setDoc(tableRef, {
    organizationId,
    branchId,
    number: input.number,
    label: input.label?.trim() ?? "",
    qrToken,
    status: "occupied",
    capacity: input.capacity ?? 4,
    sortOrder: input.number,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  await upsertTableQrLookupClient({
    organizationId,
    tableId: tableRef.id,
    qrToken,
    number: input.number,
    label: input.label?.trim() ?? "",
    branchId,
    status: "occupied",
  });

  const session = await openTableSessionClient({
    organizationId,
    branchId,
    tableId: tableRef.id,
    tableNumber: input.number,
    tableLabel: input.label,
    guestToken: qrToken,
    actorUserId: userId,
  });

  return { tableId: tableRef.id, qrToken, sessionId: session.sessionId };
}

export async function updateDiningTableStatusClient(input: {
  tableId: string;
  status: "available" | "occupied" | "closed";
}): Promise<void> {
  const { userId, organizationId } = await getStaffContext();
  const tableRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationDiningTable(organizationId, input.tableId),
  );

  await setDoc(
    tableRef,
    {
      status: input.status,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );

  await refreshTableQrLookupClient({ organizationId, tableId: input.tableId });
}

export function buildTableQrUrl(organizationId: string, qrToken: string): string {
  const query = `o=${encodeURIComponent(organizationId)}&t=${encodeURIComponent(qrToken)}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/mesa?${query}`;
  }
  return `/mesa?${query}`;
}

export function buildGuestMenuUrl(organizationId: string): string {
  const query = `o=${encodeURIComponent(organizationId)}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/menu?${query}`;
  }
  return `/menu?${query}`;
}

export async function findDiningTableByTokenClient(input: {
  organizationId: string;
  qrToken: string;
}): Promise<{
  tableId: string;
  number: number;
  label: string;
  branchId: string;
  status: string;
} | null> {
  const fromLookup = await findDiningTableByQrLookupClient(input);
  if (fromLookup) {
    return fromLookup;
  }

  const db = getFirestoreDb();
  const tablesQuery = query(
    collection(db, firestorePaths.organizationDiningTables(input.organizationId)),
    where("qrToken", "==", input.qrToken),
    limit(5),
  );
  const snapshot = await getDocs(tablesQuery);
  const match = snapshot.docs.find((document) => document.data().status !== "closed");

  if (!match) {
    return null;
  }

  const data = match.data();
  const result = {
    tableId: match.id,
    number: data.number,
    label: data.label ?? "",
    branchId: data.branchId,
    status: data.status,
  };

  await upsertTableQrLookupClient({
    organizationId: input.organizationId,
    tableId: match.id,
    qrToken: input.qrToken,
    number: data.number,
    label: data.label ?? "",
    branchId: data.branchId,
    status: data.status,
  });

  return result;
}
