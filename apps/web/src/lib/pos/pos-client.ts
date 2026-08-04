import {
  buildSaleNumber,
  calculateSaleTotals,
  groupKitchenLines,
  validateSaleLines,
  type KitchenOrderStatus,
  type KitchenStation,
  type MenuCategory,
  type PaymentMethod,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
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
  taxRate: number;
}> {
  const uid = requireUserId();
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

  const orgRef = doc(
    getFirestoreDb(),
    firestorePaths.organization(membership.organizationId),
  );
  const orgSnap = await getDoc(orgRef);
  const taxRate = orgSnap.exists()
    ? Number(orgSnap.data().settings?.taxRate ?? 0.19)
    : 0.19;

  const branchId = membership.branchIds?.[0];
  if (!branchId) {
    throw new Error("No hay sucursal activa.");
  }

  return {
    organizationId: membership.organizationId as string,
    branchId: branchId as string,
    taxRate,
  };
}

export async function createMenuProductClient(input: {
  name: string;
  price: number;
  category: MenuCategory;
  station: KitchenStation;
  description?: string;
  sortOrder?: number;
}): Promise<{ productId: string }> {
  const userId = requireUserId();
  const { organizationId } = await getActiveContext();
  const name = input.name.trim();

  if (name.length < 2) {
    throw new Error("El nombre es obligatorio.");
  }

  if (input.price < 0) {
    throw new Error("El precio no puede ser negativo.");
  }

  const db = getFirestoreDb();
  const productRef = doc(
    collection(db, firestorePaths.organizationMenuProducts(organizationId)),
  );
  const now = serverTimestamp();

  await setDoc(productRef, {
    organizationId,
    name,
    price: Math.round(input.price),
    category: input.category,
    station: input.station,
    description: input.description?.trim() ?? "",
    status: "active",
    sortOrder: input.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  return { productId: productRef.id };
}

export async function createSaleClient(input: {
  lines: Array<{
    productId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    station: string;
  }>;
  paymentMethod: PaymentMethod;
  customerName?: string;
  notes?: string;
}): Promise<{
  saleId: string;
  saleNumber: string;
  total: number;
  kitchenOrderIds: string[];
}> {
  const userId = requireUserId();
  const { organizationId, branchId, taxRate } = await getActiveContext();

  const linesResult = validateSaleLines(input.lines);
  if (!linesResult.ok) {
    throw new Error(linesResult.error);
  }

  const totals = calculateSaleTotals(linesResult.value, taxRate);
  const saleNumber = buildSaleNumber();
  const soldAt = new Date().toISOString();
  const soldOn = soldAt.slice(0, 10);
  const db = getFirestoreDb();
  const saleRef = doc(
    collection(db, firestorePaths.organizationSales(organizationId)),
  );
  const now = serverTimestamp();
  const kitchenGroups = groupKitchenLines(totals.lines);
  const kitchenOrderIds: string[] = [];

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
      paymentMethod: input.paymentMethod,
      cashierUserId: userId,
      customerName: input.customerName?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      soldAt,
      soldOn,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    });

    let ticketCounter = 1;
    for (const group of kitchenGroups) {
      const orderRef = doc(
        collection(db, firestorePaths.organizationKitchenOrders(organizationId)),
      );
      kitchenOrderIds.push(orderRef.id);

      transaction.set(orderRef, {
        organizationId,
        branchId,
        saleId: saleRef.id,
        saleNumber,
        station: group.station,
        status: "pending",
        ticketNumber: ticketCounter,
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
  });

  return {
    saleId: saleRef.id,
    saleNumber,
    total: totals.total,
    kitchenOrderIds,
  };
}

export async function updateKitchenOrderStatusClient(input: {
  orderId: string;
  status: KitchenOrderStatus;
}): Promise<void> {
  const userId = requireUserId();
  const { organizationId } = await getActiveContext();
  const orderRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationKitchenOrder(organizationId, input.orderId),
  );

  await setDoc(
    orderRef,
    {
      status: input.status,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );
}

const DEFAULT_MENU_TEMPLATES: Array<{
  name: string;
  price: number;
  category: MenuCategory;
  station: KitchenStation;
}> = [
  { name: "Americano", price: 6000, category: "beverage", station: "bar" },
  { name: "Latte", price: 8000, category: "beverage", station: "bar" },
  { name: "Cappuccino", price: 8000, category: "beverage", station: "bar" },
  { name: "Croissant", price: 5000, category: "pastry", station: "counter" },
  { name: "Sandwich", price: 12000, category: "food", station: "kitchen" },
];

export async function seedDefaultMenuClient(): Promise<{ created: number }> {
  let created = 0;

  for (const [index, template] of DEFAULT_MENU_TEMPLATES.entries()) {
    await createMenuProductClient({
      ...template,
      sortOrder: index,
    });
    created += 1;
  }

  return { created };
}
