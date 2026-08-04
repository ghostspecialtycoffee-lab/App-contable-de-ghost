import { FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { auth } from "firebase-functions/v1";

import { getDb } from "../shared/db.js";

export const onAuthUserCreate = auth.user().onCreate(async (user) => {
  logger.info("Usuario autenticado creado", {
    uid: user.uid,
    email: user.email,
  });

  const db = getDb();

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
