import { initializeApp } from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

initializeApp();

export { onAuthUserCreate } from "./auth/onUserCreated.js";
export { createOrganization } from "./organizations/createOrganization.js";

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
