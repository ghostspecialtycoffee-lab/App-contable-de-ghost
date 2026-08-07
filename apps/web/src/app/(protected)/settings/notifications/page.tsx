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
import { updateOrganizationEmailDeliveryClient } from "@/lib/organizations/organization-email-delivery-client";
import { useAuth } from "@/providers/auth-provider";
import { Button, Card } from "@ghost/ui";

export default function NotificationSettingsPage() {
  const { firebaseUser, organization, refreshOrganization } = useAuth();
  const [email, setEmail] = useState("");
  const [events, setEvents] = useState(DEFAULT_NOTIFICATION_EVENTS);
  const [publicKey, setPublicKey] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEmailDelivery, setSavingEmailDelivery] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [emailDeliveryMessage, setEmailDeliveryMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailDeliveryError, setEmailDeliveryError] = useState<string | null>(null);

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

  useEffect(() => {
    const delivery = organization?.emailDelivery;
    setPublicKey(delivery?.publicKey ?? "");
    setServiceId(delivery?.serviceId ?? "");
    setTemplateId(delivery?.templateId ?? "");
    setReplyToEmail(delivery?.replyToEmail ?? organization?.fiscalProfile?.email ?? "");
  }, [organization?.emailDelivery, organization?.fiscalProfile?.email]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await saveNotificationPreferencesClient({ email, events });
      setMessage("Preferencias guardadas.");
    } catch (cause) {
      setError(getCallableErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEmailDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization?.id) {
      return;
    }

    setSavingEmailDelivery(true);
    setEmailDeliveryError(null);
    setEmailDeliveryMessage(null);

    try {
      await updateOrganizationEmailDeliveryClient({
        organizationId: organization.id,
        emailDelivery: {
          provider: "emailjs",
          publicKey,
          serviceId,
          templateId,
          replyToEmail,
        },
      });
      await refreshOrganization();
      setEmailDeliveryMessage(
        "EmailJS configurado. Los comprobantes se enviarán automáticamente desde el chat y Registros.",
      );
    } catch (cause) {
      setEmailDeliveryError(getCallableErrorMessage(cause));
    } finally {
      setSavingEmailDelivery(false);
    }
  }

  function toggleEvent(eventType: NotificationEventType) {
    setEvents((current) => ({ ...current, [eventType]: !current[eventType] }));
  }

  return (
    <div className="ghost-page-stack">
      <PageHeader
        title="Notificaciones por correo"
        description="Envío automático de comprobantes y alertas operativas."
      />

      <Card title="Envío automático de comprobantes (gratis)">
        <div className="space-y-4 text-sm text-[var(--ghost-text-muted)]">
          <p>
            Usa{" "}
            <a
              href="https://www.emailjs.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--ghost-brand-500)] underline"
            >
              EmailJS
            </a>{" "}
            (plan gratis: 200 correos/mes). No requiere plan Blaze ni Cloud Functions.
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Crea cuenta en EmailJS y conecta tu Gmail u otro correo.</li>
            <li>
              Crea una plantilla con campos: <code>to_email</code>, <code>subject</code>,{" "}
              <code>message</code>, <code>message_html</code>, <code>from_name</code>.
            </li>
            <li>
              En la plantilla, pon <strong>To Email</strong> = <code>{"{{to_email}}"}</code> y el
              cuerpo = <code>{"{{{message_html}}}"}</code>.
            </li>
            <li>Copia Public Key, Service ID y Template ID aquí abajo.</li>
          </ol>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSaveEmailDelivery}>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Public Key</span>
            <input
              type="text"
              required
              value={publicKey}
              onChange={(event) => setPublicKey(event.target.value)}
              placeholder="xxxxxxxxxxxx"
              className="ghost-input"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Service ID</span>
            <input
              type="text"
              required
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              placeholder="service_xxxxx"
              className="ghost-input"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Template ID</span>
            <input
              type="text"
              required
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              placeholder="template_xxxxx"
              className="ghost-input"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Correo de respuesta (opcional)</span>
            <input
              type="email"
              value={replyToEmail}
              onChange={(event) => setReplyToEmail(event.target.value)}
              placeholder={organization?.fiscalProfile?.email ?? "facturacion@ghost.coffee"}
              className="ghost-input"
            />
          </label>

          {emailDeliveryError ? (
            <p className="text-sm text-[var(--ghost-danger)]">{emailDeliveryError}</p>
          ) : null}
          {emailDeliveryMessage ? (
            <p className="text-sm text-[var(--ghost-brand-500)]">{emailDeliveryMessage}</p>
          ) : null}

          <Button type="submit" disabled={savingEmailDelivery}>
            {savingEmailDelivery ? "Guardando…" : "Guardar envío automático"}
          </Button>
        </form>
      </Card>

      <Card title="Alertas operativas">
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
