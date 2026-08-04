import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { beforeUserCreated } from "firebase-functions/v2/identity";

initializeApp();

const db = getFirestore();

export const onAuthUserCreate = beforeUserCreated(async (event) => {
  const user = event.data;
  if (!user) {
    return;
  }

  logger.info("Usuario autenticado creado", { uid: user.uid, email: user.email });

  await db.collection("users").doc(user.uid).set(
    {
      email: user.email ?? "",
      displayName: user.displayName ?? user.email ?? "Usuario",
      status: "active",
      memberships: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
      updatedBy: user.uid,
    },
    { merge: true },
  );
});

export const onAuditLogCreate = onDocumentCreated(
  "organizations/{organizationId}/auditLogs/{logId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    logger.info("Bitácora registrada", {
      organizationId: event.params.organizationId,
      logId: event.params.logId,
      action: snapshot.get("action"),
    });
  },
);
