import * as logger from "firebase-functions/logger";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";

import { deliverEmail } from "./deliverEmail.js";
import {
  enqueueOrganizationNotification,
  loadNotificationRecipientEmails,
} from "./enqueue.js";
import { getDb } from "../shared/db.js";

export const onNotificationOutboxCreate = onDocumentCreated(
  "organizations/{organizationId}/notificationOutbox/{entryId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const data = snapshot.data();
    const recipientEmail = String(data.recipientEmail ?? "").trim();
    if (!recipientEmail) {
      await snapshot.ref.update({ status: "skipped", errorMessage: "Sin destinatario" });
      return;
    }

    const result = await deliverEmail({
      to: recipientEmail,
      subject: String(data.subject ?? "Ghost Contable"),
      text: String(data.bodyText ?? ""),
      html: typeof data.bodyHtml === "string" ? data.bodyHtml : undefined,
    });

    await snapshot.ref.update({
      status: result.ok ? "sent" : "failed",
      sentAt: result.ok ? new Date().toISOString() : null,
      errorMessage: result.errorMessage ?? null,
      provider: result.provider,
    });
  },
);

export const onCashSessionWritten = onDocumentWritten(
  "organizations/{organizationId}/cashSessions/{sessionId}",
  async (event) => {
    const after = event.data?.after;
    const before = event.data?.before;
    if (!after?.exists) {
      return;
    }

    const organizationId = event.params.organizationId;
    const data = after.data();
    if (!data) {
      return;
    }

    const orgSnap = await getDb().collection("organizations").doc(organizationId).get();
    const organizationName = String(orgSnap.data()?.name ?? "Ghost");

    const wasOpen = before?.exists && before.data()?.status === "open";
    const isOpen = data.status === "open";
    const isClosed = data.status === "closed";
    const justOpened = isOpen && (!before?.exists || before.data()?.status !== "open");
    const justClosed = isClosed && wasOpen;

    if (!justOpened && !justClosed) {
      return;
    }

    const eventType = justOpened ? "cash_session_opened" : "cash_session_closed";
    const recipients = await loadNotificationRecipientEmails(organizationId, eventType);
    if (recipients.length === 0) {
      logger.info("Sin destinatarios para notificación de caja", { organizationId, eventType });
      return;
    }

    const details: Record<string, string | number> = {
      Fecha: String(data.sessionDate ?? ""),
      "Fondo inicial": `$${Number(data.openingAmount ?? 0).toLocaleString("es-CO")}`,
    };

    if (justClosed) {
      details["Efectivo contado"] = `$${Number(data.closingCountedAmount ?? 0).toLocaleString("es-CO")}`;
      details["Efectivo esperado"] = `$${Number(data.closingExpectedAmount ?? 0).toLocaleString("es-CO")}`;
      details.Diferencia = `$${Number(data.closingDifference ?? 0).toLocaleString("es-CO")}`;
    }

    await enqueueOrganizationNotification({
      organizationId,
      eventType,
      organizationName,
      recipientEmails: recipients,
      details,
    });
  },
);

export const onInventoryBalanceWritten = onDocumentWritten(
  "organizations/{organizationId}/inventoryBalances/{balanceId}",
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) {
      return;
    }

    const organizationId = event.params.organizationId;
    const balance = after.data();
    if (!balance) {
      return;
    }

    const itemId = String(balance.inventoryItemId ?? "");
    const quantity = Number(balance.quantity ?? 0);
    if (!itemId) {
      return;
    }

    const db = getDb();
    const itemSnap = await db
      .collection("organizations")
      .doc(organizationId)
      .collection("inventoryItems")
      .doc(itemId)
      .get();

    if (!itemSnap.exists) {
      return;
    }

    const item = itemSnap.data()!;
    const minStock = Number(item.minStock ?? 0);
    if (minStock <= 0 || quantity > minStock) {
      return;
    }

    const beforeQty = Number(event.data?.before?.data()?.quantity ?? quantity + 1);
    if (beforeQty <= minStock) {
      return;
    }

    const orgSnap = await db.collection("organizations").doc(organizationId).get();
    const organizationName = String(orgSnap.data()?.name ?? "Ghost");
    const recipients = await loadNotificationRecipientEmails(organizationId, "inventory_low_stock");
    if (recipients.length === 0) {
      return;
    }

    await enqueueOrganizationNotification({
      organizationId,
      eventType: "inventory_low_stock",
      organizationName,
      recipientEmails: recipients,
      details: {
        Insumo: String(item.name ?? itemId),
        Existencia: quantity,
        Mínimo: minStock,
        Bodega: String(balance.warehouseId ?? ""),
      },
    });
  },
);

export const onWorkShiftWritten = onDocumentWritten(
  "organizations/{organizationId}/workShifts/{shiftId}",
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) {
      return;
    }

    const before = event.data?.before;
    const organizationId = event.params.organizationId;
    const shift = after.data();
    if (!shift) {
      return;
    }

    const isCreate = !before?.exists;
    const changed =
      isCreate ||
      before?.data()?.staffName !== shift.staffName ||
      before?.data()?.role !== shift.role ||
      before?.data()?.startTime !== shift.startTime ||
      before?.data()?.endTime !== shift.endTime;

    if (!changed) {
      return;
    }

    const orgSnap = await getDb().collection("organizations").doc(organizationId).get();
    const organizationName = String(orgSnap.data()?.name ?? "Ghost");
    const recipients = await loadNotificationRecipientEmails(organizationId, "shift_changed");
    if (recipients.length === 0) {
      return;
    }

    await enqueueOrganizationNotification({
      organizationId,
      eventType: "shift_changed",
      organizationName,
      recipientEmails: recipients,
      details: {
        Personal: String(shift.staffName ?? ""),
        Rol: String(shift.role ?? ""),
        Fecha: String(shift.shiftDate ?? ""),
        Horario: `${String(shift.startTime ?? "")} – ${String(shift.endTime ?? "")}`,
        Acción: isCreate ? "Nuevo turno" : "Turno actualizado",
      },
    });
  },
);
