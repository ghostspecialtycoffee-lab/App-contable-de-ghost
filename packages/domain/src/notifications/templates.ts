import type { NotificationEventType } from "./index.js";

export function buildNotificationEmail(input: {
  eventType: NotificationEventType;
  organizationName: string;
  details: Record<string, string | number>;
}): { subject: string; bodyText: string; bodyHtml: string } {
  const org = input.organizationName;
  const lines = Object.entries(input.details)
    .map(([key, value]) => `· ${key}: ${value}`)
    .join("\n");

  const subjects: Record<NotificationEventType, string> = {
    cash_session_opened: `[Ghost] Caja abierta — ${org}`,
    cash_session_closed: `[Ghost] Caja cerrada — ${org}`,
    business_hours_opening: `[Ghost] Apertura del local — ${org}`,
    business_hours_closing: `[Ghost] Cierre del local — ${org}`,
    shift_changed: `[Ghost] Cambio de turno — ${org}`,
    inventory_low_stock: `[Ghost] Insumo bajo mínimo — ${org}`,
    inventory_no_movement: `[Ghost] Sin movimiento de inventario — ${org}`,
    agent_insight: `[Ghost] Insight operativo — ${org}`,
  };

  const subject = subjects[input.eventType];
  const bodyText = `Ghost Specialty Coffee — ${org}\n\n${lines}\n\n— Ghost Contable`;
  const bodyHtml = `<p><strong>Ghost Specialty Coffee</strong> — ${org}</p><ul>${Object.entries(
    input.details,
  )
    .map(([key, value]) => `<li><strong>${key}</strong>: ${value}</li>`)
    .join("")}</ul><p>— Ghost Contable</p>`;

  return { subject, bodyText, bodyHtml };
}
