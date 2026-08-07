import { buildNotificationEmail, type NotificationEventType } from "@ghost/domain";
import { FieldValue } from "firebase-admin/firestore";

import { getDb } from "../shared/db.js";

export async function enqueueOrganizationNotification(input: {
  organizationId: string;
  eventType: NotificationEventType;
  organizationName: string;
  recipientEmails: string[];
  details: Record<string, string | number>;
}): Promise<number> {
  const uniqueRecipients = [...new Set(input.recipientEmails.map((email) => email.trim()).filter(Boolean))];
  if (uniqueRecipients.length === 0) {
    return 0;
  }

  const emailContent = buildNotificationEmail({
    eventType: input.eventType,
    organizationName: input.organizationName,
    details: input.details,
  });

  const db = getDb();
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  for (const recipientEmail of uniqueRecipients) {
    const ref = db
      .collection("organizations")
      .doc(input.organizationId)
      .collection("notificationOutbox")
      .doc();

    batch.set(ref, {
      organizationId: input.organizationId,
      eventType: input.eventType,
      channel: "email",
      recipientEmail,
      subject: emailContent.subject,
      bodyText: emailContent.bodyText,
      bodyHtml: emailContent.bodyHtml,
      status: "pending",
      metadata: input.details,
      createdAt: now,
    });
  }

  await batch.commit();
  return uniqueRecipients.length;
}

export async function loadNotificationRecipientEmails(
  organizationId: string,
  eventType: NotificationEventType,
): Promise<string[]> {
  const db = getDb();
  const preferencesSnap = await db
    .collection("organizations")
    .doc(organizationId)
    .collection("notificationPreferences")
    .get();

  const emails: string[] = [];

  for (const document of preferencesSnap.docs) {
    const data = document.data();
    const channels = (data.channels as string[] | undefined) ?? ["email"];
    const events = (data.events as Record<string, boolean> | undefined) ?? {};
    const email = String(data.email ?? "").trim();

    if (!email || !channels.includes("email")) {
      continue;
    }
    if (events[eventType] === false) {
      continue;
    }
    emails.push(email);
  }

  if (emails.length > 0) {
    return emails;
  }

  const orgSnap = await db.collection("organizations").doc(organizationId).get();
  const fiscalEmail = String(orgSnap.data()?.fiscalProfile?.email ?? "").trim();
  if (fiscalEmail) {
    return [fiscalEmail];
  }

  const membersSnap = await db
    .collection("organizations")
    .doc(organizationId)
    .collection("members")
    .limit(5)
    .get();

  for (const member of membersSnap.docs) {
    const userId = member.id;
    const userSnap = await db.collection("users").doc(userId).get();
    const userEmail = String(userSnap.data()?.email ?? "").trim();
    if (userEmail) {
      emails.push(userEmail);
    }
  }

  return [...new Set(emails)];
}
