import {
  buildSaleNumber,
  calculateSaleTotals,
  groupKitchenLines,
  inferMenuProductTaxCategory,
  validateSaleLines,
  type CoTaxCategory,
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
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";
import { normalizeCatalogName } from "@/lib/costing/ghost-menu-catalog";
import { planSaleInventoryConsumption, applySaleInventoryConsumption } from "@/lib/inventory/sale-inventory-consumption";
import { recordSaleAnalyticsSafe } from "@/lib/analytics/analytics-client";
import { requireOpenCashSessionClient } from "@/lib/cash/cash-client";
import { COLOMBIA_SODAS_CATALOG } from "./colombia-sodas-catalog";

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

  const branchId = membership.branchIds?.[0];
  if (!branchId) {
    throw new Error("No hay sucursal activa.");
  }

  return {
    organizationId: membership.organizationId as string,
    branchId: branchId as string,
  };
}

export async function createMenuProductClient(input: {
  name: string;
  price: number;
  category: MenuCategory;
  station: KitchenStation;
  description?: string;
  sortOrder?: number;
  saleTaxCategory?: CoTaxCategory;
  status?: "active" | "inactive";
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
    status: input.status ?? "active",
    sortOrder: input.sortOrder ?? 0,
    saleTaxCategory:
      input.saleTaxCategory ??
      inferMenuProductTaxCategory({ name, category: input.category }),
    recipeCost: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  return { productId: productRef.id };
}

export async function updateMenuProductClient(input: {
  productId: string;
  name?: string;
  description?: string;
  price?: number;
  saleTaxCategory?: CoTaxCategory;
  category?: MenuCategory;
  station?: KitchenStation;
  status?: "active" | "inactive";
}): Promise<void> {
  const userId = requireUserId();
  const { organizationId } = await getActiveContext();

  if (input.price !== undefined && input.price < 0) {
    throw new Error("El precio no puede ser negativo.");
  }

  if (input.name !== undefined && input.name.trim().length < 2) {
    throw new Error("El nombre es obligatorio.");
  }

  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  };

  if (input.name !== undefined) {
    patch.name = input.name.trim();
  }

  if (input.description !== undefined) {
    patch.description = input.description.trim();
  }

  if (input.price !== undefined) {
    patch.price = Math.round(input.price);
  }

  if (input.saleTaxCategory !== undefined) {
    patch.saleTaxCategory = input.saleTaxCategory;
  }

  if (input.category !== undefined) {
    patch.category = input.category;
  }

  if (input.station !== undefined) {
    patch.station = input.station;
  }

  if (input.status !== undefined) {
    patch.status = input.status;
  }

  const productRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationMenuProduct(organizationId, input.productId),
  );

  await setDoc(productRef, patch, { merge: true });
}

export async function toggleMenuProductStatusClient(input: {
  productId: string;
  status: "active" | "inactive";
}): Promise<void> {
  return updateMenuProductClient(input);
}

export async function deleteMenuProductClient(input: {
  productId: string;
}): Promise<void> {
  requireUserId();
  const { organizationId } = await getActiveContext();
  const db = getFirestoreDb();
  const productRef = doc(
    db,
    firestorePaths.organizationMenuProduct(organizationId, input.productId),
  );
  const productSnap = await getDoc(productRef);

  if (!productSnap.exists()) {
    throw new Error("Producto no encontrado.");
  }

  const recipesSnap = await getDocs(
    query(
      collection(db, firestorePaths.organizationRecipes(organizationId)),
      where("menuProductId", "==", input.productId),
    ),
  );

  const batch = writeBatch(db);
  for (const recipeDoc of recipesSnap.docs) {
    batch.delete(recipeDoc.ref);
  }
  batch.delete(productRef);
  await batch.commit();
}

export async function updateMenuProductImageClient(input: {
  productId: string;
  imageDataUrl: string;
  imageMimeType: string;
}): Promise<void> {
  const userId = requireUserId();
  const { organizationId } = await getActiveContext();

  if (input.imageDataUrl.length > 500_000) {
    throw new Error("La imagen es demasiado pesada. Máximo ~450 KB.");
  }

  const productRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationMenuProduct(organizationId, input.productId),
  );

  await setDoc(
    productRef,
    {
      imageDataUrl: input.imageDataUrl,
      imageMimeType: input.imageMimeType,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );
}

export async function createSaleClient(input: {
  lines: Array<{
    productId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    station: string;
    saleTaxCategory?: CoTaxCategory;
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
  const { organizationId, branchId } = await getActiveContext();
  const { sessionId: cashSessionId } = await requireOpenCashSessionClient();

  const linesResult = validateSaleLines(input.lines);
  if (!linesResult.ok) {
    throw new Error(linesResult.error);
  }

  const totals = calculateSaleTotals(linesResult.value);
  const saleNumber = buildSaleNumber();
  const soldAt = new Date().toISOString();
  const soldOn = soldAt.slice(0, 10);
  const inventoryPlan = await planSaleInventoryConsumption({
    organizationId,
    branchId,
    saleNumber,
    lines: totals.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
    })),
  }).catch(() => ({ lotConsumptions: [], plannedExits: [] }));
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
      cashSessionId,
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
      notes: input.notes?.trim() ?? "",
      soldAt,
      soldOn,
      lotConsumptions: inventoryPlan.lotConsumptions,
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

  await applySaleInventoryConsumption({
    organizationId,
    branchId,
    saleNumber,
    plannedExits: inventoryPlan.plannedExits,
  }).catch(() => {
    // Venta registrada; consumo de bodega opcional si falta stock o receta.
  });

  await recordSaleAnalyticsSafe({
    organizationId,
    soldOn,
    total: totals.total,
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
  saleTaxCategory?: CoTaxCategory;
}> = [
  {
    name: "Americano",
    price: 6000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
  },
  {
    name: "Latte",
    price: 8000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
  },
  {
    name: "Cappuccino",
    price: 8000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
  },
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

export async function seedColombianSodasClient(): Promise<{ created: number; skipped: number }> {
  const { organizationId } = await getActiveContext();
  const snapshot = await getDocs(
    collection(getFirestoreDb(), firestorePaths.organizationMenuProducts(organizationId)),
  );
  const existing = new Set(
    snapshot.docs.map((document) => normalizeCatalogName(document.data().name as string)),
  );

  let created = 0;
  let skipped = 0;
  let sortOrder = snapshot.size;

  for (const soda of COLOMBIA_SODAS_CATALOG) {
    if (existing.has(normalizeCatalogName(soda.name))) {
      skipped += 1;
      continue;
    }

    await createMenuProductClient({
      name: soda.name,
      price: soda.price,
      category: "beverage",
      station: "counter",
      description: `${soda.description} · ${soda.brand}`,
      saleTaxCategory: "IVA_19",
      status: "inactive",
      sortOrder,
    });
    sortOrder += 1;
    created += 1;
  }

  return { created, skipped };
}
