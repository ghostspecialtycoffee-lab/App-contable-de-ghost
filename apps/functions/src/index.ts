import { initializeApp } from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

initializeApp();

export { onAuthUserCreate } from "./auth/onUserCreated.js";
export { ghostAgent } from "./ai/ghostAgent.js";
export { createInventoryItem } from "./inventory/createItem.js";
export { createWarehouse } from "./inventory/createWarehouse.js";
export { registerInventoryMovement } from "./inventory/registerMovement.js";
export { createOrganization } from "./organizations/createOrganization.js";
export {
  onNotificationOutboxCreate,
  onCashSessionWritten,
  onInventoryBalanceWritten,
  onWorkShiftWritten,
} from "./notifications/triggers.js";
export { scheduledOperationsNotifications } from "./notifications/scheduled.js";

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
