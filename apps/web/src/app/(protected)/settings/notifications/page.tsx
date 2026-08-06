"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import {
  DEFAULT_NOTIFICATION_EVENTS,
  loadNotificationPreferencesClient,
  NOTIFICATION_EVENT_LABELS,
  saveNotificationPreferencesClient,
  type NotificationEventType,
} from "@/lib/notifications/notifications-client";
import { useAuth } from "@/providers/auth-provider";
import { Button, Card } from "@ghost/ui";

export default function NotificationSettingsPage() {
  const { firebaseUser } = useAuth();
  const [email, setEmail] = useState("");
  const [events, setEvents] = useState(DEFAULT_NOTIFICATION_EVENTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadNotificationPreferencesClient()
      .then((preferences) => {
        if (!active) {
          return;
        }
        setEmail(preferences.email);
        setEvents({ ...DEFAULT_NOTIFICATION_EVENTS, ...preferences.events });
      })
      .catch((cause) => {
        if (active) {
          setError(getCallableErrorMessage(cause));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await saveNotificationPreferencesClient({ email, events });
      setMessage("Preferencias guardadas. Los correos se envían vía Resend cuando RESEND_API_KEY está configurada.");
    } catch (cause) {
      setError(getCallableErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  function toggleEvent(eventType: NotificationEventType) {
    setEvents((current) => ({ ...current, [eventType]: !current[eventType] }));
  }

  return (
    <div className="ghost-page-stack">
      <PageHeader
        title="Notificaciones por correo"
        description="Ghost avisa por email sobre caja, horarios, turnos e inventario."
      />

      <Card title="Destinatario">
        {loading ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">Cargando…</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSave}>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Correo de alertas</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={firebaseUser?.email ?? "correo@ghost.coffee"}
                className="ghost-input"
              />
            </label>

            <div className="space-y-2">
              <p className="text-sm font-medium">Eventos</p>
              {(Object.keys(NOTIFICATION_EVENT_LABELS) as NotificationEventType[]).map(
                (eventType) => (
                  <label
                    key={eventType}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ghost-border)] px-3 py-2 text-sm"
                  >
                    <span>{NOTIFICATION_EVENT_LABELS[eventType]}</span>
                    <input
                      type="checkbox"
                      checked={events[eventType] !== false}
                      onChange={() => toggleEvent(eventType)}
                    />
                  </label>
                ),
              )}
            </div>

            {error ? <p className="text-sm text-[var(--ghost-danger)]">{error}</p> : null}
            {message ? <p className="text-sm text-[var(--ghost-brand-500)]">{message}</p> : null}

            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar preferencias"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
