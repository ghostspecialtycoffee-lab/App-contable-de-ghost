/** Eventos de notificación Ghost — correo y futuro push. */

export type NotificationChannel = "email" | "in_app";

export type NotificationEventType =
  | "cash_session_opened"
  | "cash_session_closed"
  | "business_hours_opening"
  | "business_hours_closing"
  | "shift_changed"
  | "inventory_low_stock"
  | "inventory_no_movement"
  | "agent_insight";

export interface NotificationPreference {
  organizationId: string;
  userId: string;
  email: string;
  channels: NotificationChannel[];
  events: Partial<Record<NotificationEventType, boolean>>;
  updatedAt?: string;
}

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventType, string> = {
  cash_session_opened: "Apertura de caja",
  cash_session_closed: "Cierre de caja",
  business_hours_opening: "Apertura del local (horario)",
  business_hours_closing: "Cierre del local (horario)",
  shift_changed: "Cambio de turno",
  inventory_low_stock: "Insumo bajo mínimo",
  inventory_no_movement: "Producto sin movimiento",
  agent_insight: "Insight del agente Ghost",
};

export const DEFAULT_NOTIFICATION_EVENTS: Record<NotificationEventType, boolean> = {
  cash_session_opened: true,
  cash_session_closed: true,
  business_hours_opening: true,
  business_hours_closing: true,
  shift_changed: true,
  inventory_low_stock: true,
  inventory_no_movement: true,
  agent_insight: false,
};

export type NotificationOutboxStatus = "pending" | "sent" | "failed" | "skipped";

export interface NotificationOutboxEntry {
  organizationId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  status: NotificationOutboxStatus;
  metadata?: Record<string, string | number | boolean>;
  errorMessage?: string;
  createdAt?: string;
  sentAt?: string;
}

export function mergeNotificationPreferences(
  input: Partial<NotificationPreference> | undefined,
  fallbackEmail: string,
  organizationId: string,
  userId: string,
): NotificationPreference {
  return {
    organizationId,
    userId,
    email: input?.email?.trim() || fallbackEmail,
    channels: input?.channels?.length ? input.channels : ["email"],
    events: {
      ...DEFAULT_NOTIFICATION_EVENTS,
      ...(input?.events ?? {}),
    },
  };
}

export function isNotificationEventEnabled(
  preferences: NotificationPreference,
  eventType: NotificationEventType,
): boolean {
  if (!preferences.channels.includes("email")) {
    return false;
  }
  if (!preferences.email.trim()) {
    return false;
  }
  return preferences.events[eventType] !== false;
}

export * from "./templates.js";
