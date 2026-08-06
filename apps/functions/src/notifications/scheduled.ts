import {
  minutesUntilTime,
  weekdayFromDate,
  type Weekday,
} from "@ghost/domain";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { enqueueOrganizationNotification, loadNotificationRecipientEmails } from "./enqueue.js";
import { getDb } from "../shared/db.js";

async function checkBusinessHoursReminders(): Promise<void> {
  const db = getDb();
  const orgsSnap = await db.collection("organizations").where("status", "==", "active").get();

  for (const orgDoc of orgsSnap.docs) {
    const organizationId = orgDoc.id;
    const organizationName = String(orgDoc.data().name ?? "Ghost");
    const operations = orgDoc.data().operationsProfile ?? {};
    const timezone = String(operations.timezone ?? orgDoc.data().settings?.timezone ?? "America/Bogota");
    const reminderMinutes = Number(operations.hoursReminderMinutes ?? 30);
    const weeklyHours = operations.weeklyHours ?? {};
    const now = new Date();
    const weekday = weekdayFromDate(now, timezone) as Weekday;
    const day = weeklyHours[weekday];

    if (!day?.isOpen) {
      continue;
    }

    const openDelta = minutesUntilTime(now, String(day.openTime ?? "07:00"), timezone);
    const closeDelta = minutesUntilTime(now, String(day.closeTime ?? "19:00"), timezone);

    if (openDelta !== null && openDelta > 0 && openDelta <= reminderMinutes) {
      const recipients = await loadNotificationRecipientEmails(
        organizationId,
        "business_hours_opening",
      );
      if (recipients.length > 0) {
        await enqueueOrganizationNotification({
          organizationId,
          eventType: "business_hours_opening",
          organizationName,
          recipientEmails: recipients,
          details: {
            Día: weekday,
            Apertura: String(day.openTime),
            "En minutos": openDelta,
          },
        });
      }
    }

    if (closeDelta !== null && closeDelta > 0 && closeDelta <= reminderMinutes) {
      const recipients = await loadNotificationRecipientEmails(
        organizationId,
        "business_hours_closing",
      );
      if (recipients.length > 0) {
        await enqueueOrganizationNotification({
          organizationId,
          eventType: "business_hours_closing",
          organizationName,
          recipientEmails: recipients,
          details: {
            Día: weekday,
            Cierre: String(day.closeTime),
            "En minutos": closeDelta,
          },
        });
      }
    }
  }
}

async function checkStaleInventory(): Promise<void> {
  const db = getDb();
  const orgsSnap = await db.collection("organizations").get();

  for (const orgDoc of orgsSnap.docs) {
    const organizationId = orgDoc.id;
    const organizationName = String(orgDoc.data().name ?? "Ghost");
    const staleDays = Number(orgDoc.data().operationsProfile?.staleInventoryDays ?? 14);
    const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;

    const itemsSnap = await db
      .collection("organizations")
      .doc(organizationId)
      .collection("inventoryItems")
      .where("status", "==", "active")
      .get();

    for (const itemDoc of itemsSnap.docs) {
      const item = itemDoc.data();
      const lastMovementAt = String(item.lastMovementAt ?? item.updatedAt ?? "");
      const lastMs = lastMovementAt ? Date.parse(lastMovementAt) : 0;
      if (!lastMs || lastMs >= cutoff) {
        continue;
      }

      const recipients = await loadNotificationRecipientEmails(
        organizationId,
        "inventory_no_movement",
      );
      if (recipients.length === 0) {
        continue;
      }

      await enqueueOrganizationNotification({
        organizationId,
        eventType: "inventory_no_movement",
        organizationName,
        recipientEmails: recipients,
        details: {
          Insumo: String(item.name ?? itemDoc.id),
          "Último movimiento": lastMovementAt.slice(0, 10) || "desconocido",
          "Umbral días": staleDays,
        },
      });
    }
  }
}

export const scheduledOperationsNotifications = onSchedule(
  {
    schedule: "every 30 minutes",
    timeZone: "America/Bogota",
  },
  async () => {
    try {
      await checkBusinessHoursReminders();
      await checkStaleInventory();
    } catch (cause) {
      logger.error("Error en notificaciones programadas", cause);
    }
  },
);
