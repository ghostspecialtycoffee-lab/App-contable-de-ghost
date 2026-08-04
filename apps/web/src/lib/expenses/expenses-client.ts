import {
  calculateMonthlyEquivalent,
  validateFixedExpenseInput,
  type FixedExpenseInput,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import {
  collection,
  doc,
  getDoc,
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

export async function createFixedExpenseClient(
  input: FixedExpenseInput,
): Promise<{ expenseId: string }> {
  const userId = requireUserId();
  const { organizationId, branchId } = await getActiveContext();
  const validation = validateFixedExpenseInput(input);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const expense = validation.value;
  const monthlyEquivalent = calculateMonthlyEquivalent(expense.amount, expense.frequency);
  const expenseRef = doc(
    collection(getFirestoreDb(), firestorePaths.organizationFixedExpenses(organizationId)),
  );
  const now = serverTimestamp();

  await setDoc(expenseRef, {
    organizationId,
    branchId: expense.branchId ?? branchId,
    name: expense.name,
    category: expense.category,
    amount: expense.amount,
    frequency: expense.frequency,
    monthlyEquivalent,
    supplierName: expense.supplierName ?? "",
    dueDay: expense.dueDay ?? null,
    notes: expense.notes ?? "",
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  return { expenseId: expenseRef.id };
}

export async function updateFixedExpenseClient(input: {
  expenseId: string;
  patch: Partial<FixedExpenseInput> & { isActive?: boolean };
}): Promise<void> {
  const userId = requireUserId();
  const { organizationId } = await getActiveContext();
  const expenseRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationFixedExpense(organizationId, input.expenseId),
  );
  const expenseSnap = await getDoc(expenseRef);

  if (!expenseSnap.exists()) {
    throw new Error("Gasto no encontrado.");
  }

  const current = expenseSnap.data();
  const merged: FixedExpenseInput = {
    name: input.patch.name ?? current.name,
    category: input.patch.category ?? current.category,
    amount: input.patch.amount ?? current.amount,
    frequency: input.patch.frequency ?? current.frequency,
    supplierName: input.patch.supplierName ?? current.supplierName,
    dueDay: input.patch.dueDay ?? current.dueDay ?? undefined,
    notes: input.patch.notes ?? current.notes,
    branchId: current.branchId,
  };

  const validation = validateFixedExpenseInput(merged);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const expense = validation.value;
  const monthlyEquivalent = calculateMonthlyEquivalent(expense.amount, expense.frequency);

  await setDoc(
    expenseRef,
    {
      name: expense.name,
      category: expense.category,
      amount: expense.amount,
      frequency: expense.frequency,
      monthlyEquivalent,
      supplierName: expense.supplierName ?? "",
      dueDay: expense.dueDay ?? null,
      notes: expense.notes ?? "",
      ...(input.patch.isActive !== undefined ? { isActive: input.patch.isActive } : {}),
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );
}
