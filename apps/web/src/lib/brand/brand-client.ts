import {
  validateBrandAssetName,
  type BrandAssetType,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

async function getOrganizationId(): Promise<string> {
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

  if (!membership?.organizationId) {
    throw new Error("No hay organización activa.");
  }

  return membership.organizationId as string;
}

export async function uploadBrandAssetClient(input: {
  name: string;
  type: BrandAssetType;
  dataUrl: string;
  mimeType: string;
  isPrimary?: boolean;
}): Promise<{ assetId: string }> {
  const userId = getFirebaseAuth().currentUser?.uid;
  if (!userId) {
    throw new Error("Debes iniciar sesión.");
  }

  const nameError = validateBrandAssetName(input.name);
  if (nameError) {
    throw new Error(nameError);
  }

  const organizationId = await getOrganizationId();
  const db = getFirestoreDb();
  const assetRef = doc(
    collection(db, firestorePaths.organizationBrandAssets(organizationId)),
  );
  const now = serverTimestamp();
  const shouldBePrimary = input.isPrimary ?? input.type === "logo";

  let primaryRefs: Array<ReturnType<typeof doc>> = [];
  if (shouldBePrimary) {
    const assetsSnap = await getDocs(
      collection(db, firestorePaths.organizationBrandAssets(organizationId)),
    );
    primaryRefs = assetsSnap.docs
      .filter((document) => document.data().isPrimary === true)
      .map((document) => document.ref);
  }

  await runTransaction(db, async (transaction) => {
    for (const ref of primaryRefs) {
      transaction.update(ref, {
        isPrimary: false,
        updatedAt: now,
        updatedBy: userId,
      });
    }

    transaction.set(assetRef, {
      organizationId,
      name: input.name.trim(),
      type: input.type,
      mimeType: input.mimeType,
      dataUrl: input.dataUrl,
      status: "active",
      isPrimary: shouldBePrimary,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    });
  });

  return { assetId: assetRef.id };
}

export async function setPrimaryBrandAssetClient(assetId: string): Promise<void> {
  const userId = getFirebaseAuth().currentUser?.uid;
  if (!userId) {
    throw new Error("Debes iniciar sesión.");
  }

  const organizationId = await getOrganizationId();
  const db = getFirestoreDb();
  const assetsSnap = await getDocs(
    collection(db, firestorePaths.organizationBrandAssets(organizationId)),
  );
  const now = serverTimestamp();

  await runTransaction(db, async (transaction) => {
    for (const document of assetsSnap.docs) {
      transaction.update(document.ref, {
        isPrimary: document.id === assetId,
        updatedAt: now,
        updatedBy: userId,
      });
    }
  });
}

export async function archiveBrandAssetClient(assetId: string): Promise<void> {
  const userId = getFirebaseAuth().currentUser?.uid;
  if (!userId) {
    throw new Error("Debes iniciar sesión.");
  }

  const organizationId = await getOrganizationId();
  const assetRef = doc(
    getFirestoreDb(),
    firestorePaths.organizationBrandAsset(organizationId, assetId),
  );

  await setDoc(
    assetRef,
    {
      status: "archived",
      isPrimary: false,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );
}
