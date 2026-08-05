import {
  buildPurchaseInvoiceLines,
  purchaseInvoiceAffectsInventory,
  resolvePurchaseInventoryEntry,
  summarizePurchaseInvoice,
  type PurchaseInvoiceLine,
  type PurchaseInvoiceLineInput,
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

import { registerInventoryMovementClient } from "@/lib/inventory/inventory-client";
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

export async function createPurchaseInvoiceClient(input: {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  warehouseId: string;
  lines: PurchaseInvoiceLineInput[];
  attachmentDataUrl?: string;
  attachmentName?: string;
}): Promise<{ invoiceId: string }> {
  const userId = requireUserId();
  const { organizationId, branchId } = await getActiveContext();
  const supplierName = input.supplierName.trim();
  const invoiceNumber = input.invoiceNumber.trim();

  if (!supplierName || !invoiceNumber) {
    throw new Error("Proveedor y número de factura son obligatorios.");
  }

  if (input.lines.length === 0) {
    throw new Error("Agrega al menos una línea a la factura.");
  }

  const lines = buildPurchaseInvoiceLines(input.lines);
  const summary = summarizePurchaseInvoice(lines);
  const db = getFirestoreDb();
  const invoiceRef = doc(
    collection(db, firestorePaths.organizationPurchaseInvoices(organizationId)),
  );
  const now = serverTimestamp();

  await setDoc(invoiceRef, {
    organizationId,
    branchId,
    supplierName,
    invoiceNumber,
    invoiceDate: input.invoiceDate,
    status: "draft",
    lines,
    subtotal: summary.subtotal,
    taxAmount: summary.taxAmount,
    total: summary.total,
    warehouseId: input.warehouseId,
    attachmentDataUrl: input.attachmentDataUrl ?? "",
    attachmentName: input.attachmentName ?? "",
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  return { invoiceId: invoiceRef.id };
}

export async function updatePurchaseInvoiceClient(input: {
  invoiceId: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  warehouseId: string;
  lines: PurchaseInvoiceLineInput[];
  attachmentDataUrl?: string;
  attachmentName?: string;
}): Promise<void> {
  const userId = requireUserId();
  const { organizationId } = await getActiveContext();
  const supplierName = input.supplierName.trim();
  const invoiceNumber = input.invoiceNumber.trim();

  if (!supplierName || !invoiceNumber) {
    throw new Error("Proveedor y número de factura son obligatorios.");
  }

  const filteredLines = input.lines.filter((line) => line.description.trim());
  if (filteredLines.length === 0) {
    throw new Error("Agrega al menos un producto a la factura.");
  }

  const db = getFirestoreDb();
  const invoiceRef = doc(
    db,
    firestorePaths.organizationPurchaseInvoice(organizationId, input.invoiceId),
  );
  const invoiceSnap = await getDoc(invoiceRef);

  if (!invoiceSnap.exists()) {
    throw new Error("Factura no encontrada.");
  }

  if (invoiceSnap.data().status !== "draft") {
    throw new Error("Solo puedes editar facturas en borrador.");
  }

  const lines = buildPurchaseInvoiceLines(filteredLines);
  const summary = summarizePurchaseInvoice(lines);

  await setDoc(
    invoiceRef,
    {
      supplierName,
      invoiceNumber,
      invoiceDate: input.invoiceDate,
      warehouseId: input.warehouseId,
      lines,
      subtotal: summary.subtotal,
      taxAmount: summary.taxAmount,
      total: summary.total,
      attachmentDataUrl: input.attachmentDataUrl ?? "",
      attachmentName: input.attachmentName ?? "",
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );
}

export async function confirmPurchaseInvoiceClient(input: {
  invoiceId: string;
  bootstrapInventory?: boolean;
}): Promise<{ movements: number; inventoryApplied: boolean }> {
  const userId = requireUserId();
  const { organizationId } = await getActiveContext();
  const db = getFirestoreDb();
  const invoiceRef = doc(
    db,
    firestorePaths.organizationPurchaseInvoice(organizationId, input.invoiceId),
  );
  const invoiceSnap = await getDoc(invoiceRef);

  if (!invoiceSnap.exists()) {
    throw new Error("Factura no encontrada.");
  }

  const invoice = invoiceSnap.data();
  if (invoice.status !== "draft") {
    throw new Error("Esta factura ya fue confirmada.");
  }

  const warehouseId = invoice.warehouseId as string;
  const branchId = invoice.branchId as string;
  const invoiceDate = invoice.invoiceDate as string;
  const lines = (invoice.lines ?? []) as PurchaseInvoiceLine[];
  const inventoryApplied = purchaseInvoiceAffectsInventory(invoiceDate, {
    bootstrap: input.bootstrapInventory,
  });

  if (inventoryApplied && !warehouseId) {
    throw new Error("Selecciona una bodega antes de confirmar.");
  }

  await runTransaction(db, async (transaction) => {
    transaction.update(invoiceRef, {
      status: "confirmed",
      inventoryApplied,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
  });

  if (!inventoryApplied) {
    return { movements: 0, inventoryApplied: false };
  }

  let movements = 0;
  for (const line of lines) {
    if (!line.inventoryItemId || line.quantity <= 0) {
      continue;
    }

    const itemRef = doc(
      db,
      firestorePaths.organizationInventoryItem(organizationId, line.inventoryItemId),
    );
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
      continue;
    }

    const itemData = itemSnap.data();
    const entry = resolvePurchaseInventoryEntry({
      line,
      baseUnit: itemData.baseUnit,
      purchaseUnit: itemData.purchaseUnit,
      presentationQuantity: itemData.presentationQuantity,
    });

    if (entry.quantityInBase <= 0) {
      continue;
    }

    await registerInventoryMovementClient({
      branchId,
      warehouseId,
      itemId: line.inventoryItemId,
      type: "entry",
      quantity: entry.quantityInBase,
      unitCost: entry.unitCostNetPerBase,
      reference: invoice.invoiceNumber as string,
      notes: line.description,
    });
    movements += 1;
  }

  return { movements, inventoryApplied: true };
}
