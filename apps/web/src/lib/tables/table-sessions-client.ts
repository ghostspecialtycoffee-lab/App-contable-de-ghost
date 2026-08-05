import {
  buildTableSessionLine,
  calculateSaleTotals,
  groupKitchenLines,
  pendingSessionLines,
  sessionLinesToSaleInputs,
  type CoTaxCategory,
  type PaymentMethod,
  type TableSessionLineInput,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

function createLineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

export async function findOpenTableSessionClient(input: {
  organizationId: string;
  tableId: string;
}): Promise<{ sessionId: string; data: Record<string, unknown> } | null> {
  const sessionsQuery = query(
    collection(getFirestoreDb(), firestorePaths.organizationTableSessions(input.organizationId)),
    where("tableId", "==", input.tableId),
    where("status", "in", ["open", "requested_bill"]),
    limit(1),
  );
  const snapshot = await getDocs(sessionsQuery);

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0]!;
  return { sessionId: document.id, data: document.data() };
}

export async function openTableSessionClient(input: {
  organizationId: string;
  branchId: string;
  tableId: string;
  tableNumber: number;
  tableLabel?: string;
  guestToken: string;
  actorUserId?: string;
}): Promise<{ sessionId: string }> {
  const existing = await findOpenTableSessionClient({
    organizationId: input.organizationId,
    tableId: input.tableId,
  });

  if (existing) {
    return { sessionId: existing.sessionId };
  }

  const db = getFirestoreDb();
  const sessionRef = doc(
    collection(db, firestorePaths.organizationTableSessions(input.organizationId)),
  );
  const now = serverTimestamp();
  const openedAt = new Date().toISOString();

  await setDoc(sessionRef, {
    organizationId: input.organizationId,
    branchId: input.branchId,
    tableId: input.tableId,
    tableNumber: input.tableNumber,
    tableLabel: input.tableLabel ?? "",
    guestToken: input.guestToken,
    status: "open",
    lines: [],
    openedAt,
    createdAt: now,
    updatedAt: now,
    createdBy: input.actorUserId ?? "guest",
    updatedBy: input.actorUserId ?? "guest",
  });

  const tableRef = doc(
    db,
    firestorePaths.organizationDiningTable(input.organizationId, input.tableId),
  );
  await setDoc(
    tableRef,
    {
      status: "occupied",
      updatedAt: now,
      updatedBy: input.actorUserId ?? "guest",
    },
    { merge: true },
  );

  return { sessionId: sessionRef.id };
}

export async function addTableSessionLinesClient(input: {
  organizationId: string;
  sessionId: string;
  guestToken: string;
  lines: TableSessionLineInput[];
  actorUserId?: string;
}): Promise<void> {
  if (input.lines.length === 0) {
    return;
  }

  let actorUserId = input.actorUserId;
  if (!actorUserId) {
    try {
      actorUserId = (await getStaffContext()).userId;
    } catch {
      actorUserId = "guest";
    }
  }

  const sessionRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationTableSession(input.organizationId, input.sessionId),
  );
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    throw new Error("Sesión de mesa no encontrada.");
  }

  const session = sessionSnap.data();
  if (session.status !== "open") {
    throw new Error("Esta mesa ya no acepta pedidos.");
  }

  if (session.guestToken !== input.guestToken) {
    throw new Error("Token de mesa no válido.");
  }

  const newLines = input.lines.map((line) =>
    buildTableSessionLine(line, createLineId()),
  );
  const existingLines = (session.lines ?? []) as Array<Record<string, unknown>>;

  await setDoc(
    sessionRef,
    {
      lines: [...existingLines, ...newLines],
      updatedAt: serverTimestamp(),
      updatedBy: actorUserId,
    },
    { merge: true },
  );
}

export async function sendTableSessionToKitchenClient(input: {
  sessionId: string;
}): Promise<{ kitchenOrderIds: string[] }> {
  const { userId, organizationId, branchId } = await getStaffContext();
  const db = getFirestoreDb();
  const sessionRef = doc(
    db,
    firestorePaths.organizationTableSession(organizationId, input.sessionId),
  );
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    throw new Error("Sesión no encontrada.");
  }

  const session = sessionSnap.data();
  const lines = (session.lines ?? []) as Array<{
    id: string;
    productId: string;
    name: string;
    quantity: number;
    station: string;
    status: string;
    notes?: string;
  }>;

  const pending = pendingSessionLines(lines as never);
  if (pending.length === 0) {
    throw new Error("No hay ítems pendientes para comanda.");
  }

  const kitchenGroups = groupKitchenLines(
    pending.map((line) => ({
      productId: line.productId,
      name: line.name,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      lineTotal: Math.round(line.unitPrice * line.quantity),
      station: line.station,
      saleTaxCategory: line.saleTaxCategory ?? "IVA_19",
      lineNet: 0,
      lineTax: 0,
    })),
  );

  const kitchenOrderIds: string[] = [];
  const now = serverTimestamp();
  const ticketPrefix = `M${session.tableNumber}-${Date.now().toString().slice(-4)}`;

  await runTransaction(db, async (transaction) => {
    let ticketCounter = 1;
    for (const group of kitchenGroups) {
      const orderRef = doc(
        collection(db, firestorePaths.organizationKitchenOrders(organizationId)),
      );
      kitchenOrderIds.push(orderRef.id);

      transaction.set(orderRef, {
        organizationId,
        branchId,
        tableSessionId: input.sessionId,
        tableNumber: session.tableNumber,
        tableLabel: session.tableLabel ?? "",
        station: group.station,
        status: "pending",
        ticketNumber: ticketCounter,
        saleNumber: ticketPrefix,
        lines: group.lines.map((line) => ({
          productId: line.productId,
          name: line.name,
          quantity: line.quantity,
          notes: "",
        })),
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });

      ticketCounter += 1;
    }

    const updatedLines = lines.map((line) =>
      line.status === "pending"
        ? { ...line, status: "sent" }
        : line,
    );

    transaction.update(sessionRef, {
      lines: updatedLines,
      updatedAt: now,
      updatedBy: userId,
    });
  });

  return { kitchenOrderIds };
}

export async function checkoutTableSessionClient(input: {
  sessionId: string;
  paymentMethod: PaymentMethod;
  customerName?: string;
}): Promise<{ saleId: string; saleNumber: string; total: number }> {
  const { userId, organizationId, branchId } = await getStaffContext();
  const db = getFirestoreDb();
  const sessionRef = doc(
    db,
    firestorePaths.organizationTableSession(organizationId, input.sessionId),
  );
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    throw new Error("Sesión no encontrada.");
  }

  const session = sessionSnap.data();
  if (session.status !== "open" && session.status !== "requested_bill") {
    throw new Error("Esta mesa ya fue cobrada.");
  }

  const lines = (session.lines ?? []) as Array<{
    productId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    station: string;
    status: string;
    saleTaxCategory?: CoTaxCategory;
  }>;

  const billableLines = lines.filter((line) => line.status !== "cancelled");
  if (billableLines.length === 0) {
    throw new Error("No hay ítems para cobrar.");
  }

  const totals = calculateSaleTotals(
    sessionLinesToSaleInputs(billableLines as never),
  );
  const saleNumber = `M${session.tableNumber}-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}`;
  const soldAt = new Date().toISOString();
  const soldOn = soldAt.slice(0, 10);
  const saleRef = doc(collection(db, firestorePaths.organizationSales(organizationId)));
  const now = serverTimestamp();

  await runTransaction(db, async (transaction) => {
    transaction.set(saleRef, {
      organizationId,
      branchId,
      saleNumber,
      status: "paid",
      lines: totals.lines,
      subtotal: totals.subtotal,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      total: totals.total,
      taxBreakdown: totals.taxBreakdown,
      paymentMethod: input.paymentMethod,
      cashierUserId: userId,
      customerName: input.customerName?.trim() ?? "",
      notes: `Mesa ${session.tableNumber}`,
      tableId: session.tableId,
      tableNumber: session.tableNumber,
      tableLabel: session.tableLabel ?? "",
      tableSessionId: input.sessionId,
      soldAt,
      soldOn,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    });

    transaction.update(sessionRef, {
      status: "closed",
      saleId: saleRef.id,
      closedAt: soldAt,
      updatedAt: now,
      updatedBy: userId,
    });

    transaction.set(
      doc(db, firestorePaths.organizationDiningTable(organizationId, session.tableId as string)),
      {
        status: "available",
        updatedAt: now,
        updatedBy: userId,
      },
      { merge: true },
    );
  });

  return {
    saleId: saleRef.id,
    saleNumber,
    total: totals.total,
  };
}

export async function cancelTableSessionClient(input: {
  sessionId: string;
  reason?: string;
}): Promise<void> {
  const { userId, organizationId } = await getStaffContext();
  const db = getFirestoreDb();
  const sessionRef = doc(
    db,
    firestorePaths.organizationTableSession(organizationId, input.sessionId),
  );
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    throw new Error("Sesión no encontrada.");
  }

  const session = sessionSnap.data();
  if (session.status !== "open" && session.status !== "requested_bill") {
    throw new Error("Esta cuenta ya está cerrada.");
  }

  const closedAt = new Date().toISOString();
  const now = serverTimestamp();
  const lines = (session.lines ?? []) as Array<{ status: string }>;
  const updatedLines = lines.map((line) =>
    line.status !== "cancelled" ? { ...line, status: "cancelled" } : line,
  );

  await runTransaction(db, async (transaction) => {
    transaction.update(sessionRef, {
      status: "cancelled",
      closedAt,
      cancelReason: input.reason?.trim() ?? "",
      lines: updatedLines,
      updatedAt: now,
      updatedBy: userId,
    });

    transaction.set(
      doc(db, firestorePaths.organizationDiningTable(organizationId, session.tableId as string)),
      {
        status: "available",
        updatedAt: now,
        updatedBy: userId,
      },
      { merge: true },
    );
  });
}

export async function requestWaiterGuestClient(input: {
  organizationId: string;
  sessionId: string;
  guestToken: string;
}): Promise<void> {
  const sessionRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationTableSession(input.organizationId, input.sessionId),
  );
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    throw new Error("Sesión de mesa no encontrada.");
  }

  const session = sessionSnap.data();
  if (session.guestToken !== input.guestToken) {
    throw new Error("Token de mesa no válido.");
  }

  if (session.status !== "open" && session.status !== "requested_bill") {
    throw new Error("Esta mesa ya no acepta solicitudes.");
  }

  await setDoc(
    sessionRef,
    {
      waiterRequestedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
      updatedBy: "guest",
    },
    { merge: true },
  );
}

export async function clearWaiterAlertClient(input: {
  sessionId: string;
}): Promise<void> {
  const { userId, organizationId } = await getStaffContext();
  const sessionRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationTableSession(organizationId, input.sessionId),
  );

  await setDoc(
    sessionRef,
    {
      waiterRequestedAt: null,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );
}

export async function requestTableBillGuestClient(input: {
  organizationId: string;
  sessionId: string;
  guestToken: string;
}): Promise<void> {
  const sessionRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationTableSession(input.organizationId, input.sessionId),
  );
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    throw new Error("Sesión de mesa no encontrada.");
  }

  const session = sessionSnap.data();
  if (session.guestToken !== input.guestToken) {
    throw new Error("Token de mesa no válido.");
  }

  if (session.status !== "open") {
    throw new Error("La cuenta ya fue solicitada o cerrada.");
  }

  await setDoc(
    sessionRef,
    {
      status: "requested_bill",
      updatedAt: serverTimestamp(),
      updatedBy: "guest",
    },
    { merge: true },
  );
}

export async function requestTableBillClient(input: {
  sessionId: string;
}): Promise<void> {
  const { userId, organizationId } = await getStaffContext();
  const sessionRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationTableSession(organizationId, input.sessionId),
  );

  await setDoc(
    sessionRef,
    {
      status: "requested_bill",
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );
}
