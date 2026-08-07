"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { WorkflowOutboxPanel } from "@/components/workflow-outbox-panel";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { updateOrganizationWorkflowSettings } from "@/lib/organizations/organization-workflow-settings";
import { useAuth } from "@/providers/auth-provider";
import {
  BUILT_IN_WORKFLOWS,
  resolveWorkflowSettings,
  type OrganizationWorkflowSettings,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function AutomationsSettingsPage() {
  const { organization, refreshOrganization } = useAuth();
  const [settings, setSettings] = useState<OrganizationWorkflowSettings>(
    resolveWorkflowSettings(),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSettings(resolveWorkflowSettings(organization?.workflowSettings));
  }, [organization?.workflowSettings]);

  function toggleWorkflow(workflowId: string) {
    setSettings((current) => {
      const enabled = new Set(current.enabledWorkflowIds);
      if (enabled.has(workflowId)) {
        enabled.delete(workflowId);
      } else {
        enabled.add(workflowId);
      }
      return { ...current, enabledWorkflowIds: [...enabled] };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization?.id) {
      return;
    }

    setSubmitError(null);
    setSaveMessage(null);
    setSubmitting(true);

    try {
      await updateOrganizationWorkflowSettings({
        organizationId: organization.id,
        workflowSettings: settings,
      });
      await refreshOrganization();
      setSaveMessage("Automatizaciones guardadas.");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ghost-page-stack">
      <PageHeader
        title="Automatizaciones"
        description="Workflows disparados por eventos de venta y compra, con enlaces WhatsApp listos para enviar."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card title="Workflows integrados">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <ul className="space-y-3">
              {BUILT_IN_WORKFLOWS.map((workflow) => (
                <li
                  key={workflow.id}
                  className="rounded-lg border border-[var(--ghost-border)] p-3"
                >
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={settings.enabledWorkflowIds.includes(workflow.id)}
                      onChange={() => toggleWorkflow(workflow.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium">{workflow.name}</span>
                      <span className="mt-1 block text-xs text-[var(--ghost-text-muted)]">
                        {workflow.description}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium">WhatsApp operativo (alertas)</span>
                <input
                  value={settings.staffWhatsAppPhone ?? ""}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      staffWhatsAppPhone: event.target.value,
                    }))
                  }
                  placeholder="573001234567"
                  className="ghost-input"
                />
                <span className="text-xs text-[var(--ghost-text-muted)]">
                  Solo dígitos con código país. Requerido para alertas de venta alta.
                </span>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Umbral venta alta (COP)</span>
                <input
                  type="number"
                  min="10000"
                  step="10000"
                  value={settings.highValueSaleThresholdCop}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      highValueSaleThresholdCop: Number(event.target.value),
                    }))
                  }
                  className="ghost-input"
                />
              </label>
            </div>

            {submitError ? (
              <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
            ) : null}
            {saveMessage ? (
              <p className="text-sm text-[var(--ghost-brand-500)]">{saveMessage}</p>
            ) : null}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando…" : "Guardar automatizaciones"}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <WorkflowOutboxPanel />
          <Card title="Cómo funciona">
            <ul className="space-y-2 text-sm text-[var(--ghost-text-muted)]">
              <li>
                Cada venta o compra publica un evento de dominio. Los workflows habilitados crean
                entradas en la bandeja WhatsApp.
              </li>
              <li>
                En plan Spark los enlaces se generan en el cliente; con Blaze también procesa
                Functions.
              </li>
              <li>
                La API oficial de WhatsApp Business se integrará en una fase posterior; hoy usamos
                enlaces <code>wa.me</code>.
              </li>
            </ul>
            <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
              Volver al inicio
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
