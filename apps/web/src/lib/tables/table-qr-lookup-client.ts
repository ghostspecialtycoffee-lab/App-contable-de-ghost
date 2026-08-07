import { firestorePaths } from "@ghost/infrastructure";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";

export type TableQrLookupRecord = {
  organizationId: string;
  tableId: string;
  qrToken: string;
  number: number;
  label: string;
  branchId: string;
  status: string;
};

export async function upsertTableQrLookupClient(record: TableQrLookupRecord): Promise<void> {
  const lookupRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationTableQrLookup(record.organizationId, record.qrToken),
  );

  await setDoc(
    lookupRef,
    {
      ...record,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function refreshTableQrLookupClient(input: {
  organizationId: string;
  tableId: string;
}): Promise<void> {
  const tableRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationDiningTable(input.organizationId, input.tableId),
  );
  const tableSnap = await getDoc(tableRef);

  if (!tableSnap.exists()) {
    return;
  }

  const data = tableSnap.data();
  const qrToken = data.qrToken as string | undefined;
  if (!qrToken) {
    return;
  }

  await upsertTableQrLookupClient({
    organizationId: input.organizationId,
    tableId: input.tableId,
    qrToken,
    number: data.number,
    label: data.label ?? "",
    branchId: data.branchId,
    status: data.status,
  });
}

export async function syncTableQrLookupsClient(
  tables: Array<{
    id: string;
    organizationId: string;
    qrToken: string;
    number: number;
    label?: string;
    branchId: string;
    status: string;
  }>,
): Promise<void> {
  await Promise.all(
    tables.map((table) =>
      upsertTableQrLookupClient({
        organizationId: table.organizationId,
        tableId: table.id,
        qrToken: table.qrToken,
        number: table.number,
        label: table.label ?? "",
        branchId: table.branchId,
        status: table.status,
      }),
    ),
  );
}

export async function findDiningTableByQrLookupClient(input: {
  organizationId: string;
  qrToken: string;
}): Promise<{
  tableId: string;
  number: number;
  label: string;
  branchId: string;
  status: string;
} | null> {
  const lookupRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationTableQrLookup(input.organizationId, input.qrToken),
  );
  const snapshot = await getDoc(lookupRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  if (data.status === "closed") {
    return null;
  }

  return {
    tableId: data.tableId,
    number: data.number,
    label: data.label ?? "",
    branchId: data.branchId,
    status: data.status,
  };
}
