import {
  DEFAULT_OPERATIONS_PROFILE,
  type OrganizationOperationsProfile,
  type WorkShiftInput,
  type WorkShiftRole,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

async function getContext(): Promise<{
  organizationId: string;
  branchId: string;
  userId: string;
}> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }

  const userSnap = await getDoc(doc(getFirestoreDb(), firestorePaths.user(uid)));
  if (!userSnap.exists()) {
    throw new Error("Perfil no encontrado.");
  }

  const membership = (userSnap.data().memberships ?? []).find(
    (entry: { isActive?: boolean }) => entry.isActive,
  );
  if (!membership?.organizationId || !membership.branchIds?.[0]) {
    throw new Error("No hay organización activa.");
  }

  return {
    organizationId: membership.organizationId as string,
    branchId: membership.branchIds[0] as string,
    userId: uid,
  };
}

export async function loadOperationsProfileClient(): Promise<OrganizationOperationsProfile> {
  const { organizationId } = await getContext();
  const orgSnap = await getDoc(
    doc(getFirestoreDb(), firestorePaths.organization(organizationId)),
  );
  const profile = orgSnap.data()?.operationsProfile as OrganizationOperationsProfile | undefined;
  return {
    ...DEFAULT_OPERATIONS_PROFILE,
    ...(profile ?? {}),
    weeklyHours: {
      ...DEFAULT_OPERATIONS_PROFILE.weeklyHours,
      ...(profile?.weeklyHours ?? {}),
    },
  };
}

export async function saveOperationsProfileClient(
  profile: OrganizationOperationsProfile,
): Promise<void> {
  const { organizationId, userId } = await getContext();
  await setDoc(
    doc(getFirestoreDb(), firestorePaths.organization(organizationId)),
    {
      operationsProfile: profile,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );
}

export async function listWorkShiftsClient(): Promise<
  Array<WorkShiftInput & { id: string }>
> {
  const { organizationId } = await getContext();
  const snapshot = await getDocs(
    query(
      collection(getFirestoreDb(), firestorePaths.organizationWorkShifts(organizationId)),
      orderBy("shiftDate", "desc"),
    ),
  );

  return snapshot.docs.map((document) => ({
    id: document.id,
    staffName: String(document.data().staffName ?? ""),
    role: document.data().role as WorkShiftRole,
    shiftDate: String(document.data().shiftDate ?? ""),
    startTime: String(document.data().startTime ?? ""),
    endTime: String(document.data().endTime ?? ""),
    notes: String(document.data().notes ?? ""),
  }));
}

export async function saveWorkShiftClient(input: WorkShiftInput): Promise<{ shiftId: string }> {
  const { organizationId, branchId, userId } = await getContext();
  const shiftRef = doc(
    collection(getFirestoreDb(), firestorePaths.organizationWorkShifts(organizationId)),
  );
  const now = serverTimestamp();

  await setDoc(shiftRef, {
    organizationId,
    branchId,
    staffName: input.staffName.trim(),
    role: input.role,
    shiftDate: input.shiftDate,
    startTime: input.startTime,
    endTime: input.endTime,
    notes: input.notes?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  return { shiftId: shiftRef.id };
}
