import { validateSupplierInput, type SupplierInput } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

function requireUserId(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }
  return uid;
}

async function getActiveOrganizationId(): Promise<string> {
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

  return membership.organizationId as string;
}

export async function createSupplierClient(
  input: SupplierInput,
): Promise<{ supplierId: string }> {
  const userId = requireUserId();
  const organizationId = await getActiveOrganizationId();
  const validation = validateSupplierInput(input);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const supplier = validation.value;
  const supplierRef = doc(
    collection(getFirestoreDb(), firestorePaths.organizationSuppliers(organizationId)),
  );
  const now = serverTimestamp();

  await setDoc(supplierRef, {
    organizationId,
    name: supplier.name,
    nit: supplier.nit ?? "",
    contactName: supplier.contactName ?? "",
    phone: supplier.phone ?? "",
    email: supplier.email ?? "",
    paymentTermsDays: supplier.paymentTermsDays ?? 0,
    notes: supplier.notes ?? "",
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  return { supplierId: supplierRef.id };
}

export async function updateSupplierClient(input: {
  supplierId: string;
  patch: Partial<SupplierInput> & { isActive?: boolean };
}): Promise<void> {
  const userId = requireUserId();
  const organizationId = await getActiveOrganizationId();
  const supplierRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationSupplier(organizationId, input.supplierId),
  );

  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  };

  if (input.patch.name !== undefined) {
    const validation = validateSupplierInput({
      name: input.patch.name,
      nit: input.patch.nit,
      contactName: input.patch.contactName,
      phone: input.patch.phone,
      email: input.patch.email,
      paymentTermsDays: input.patch.paymentTermsDays,
      notes: input.patch.notes,
    });
    if (!validation.ok) {
      throw new Error(validation.error);
    }
    patch.name = validation.value.name;
    patch.nit = validation.value.nit ?? "";
    patch.contactName = validation.value.contactName ?? "";
    patch.phone = validation.value.phone ?? "";
    patch.email = validation.value.email ?? "";
    patch.paymentTermsDays = validation.value.paymentTermsDays ?? 0;
    patch.notes = validation.value.notes ?? "";
  }

  if (input.patch.isActive !== undefined) {
    patch.isActive = input.patch.isActive;
  }

  await updateDoc(supplierRef, patch);
}
