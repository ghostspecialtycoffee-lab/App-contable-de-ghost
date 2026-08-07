"use client";

import Link from "next/link";

import { useWorkflowOutbox } from "@/hooks/use-workflow-outbox";
import { Button, Card } from "@ghost/ui";

export function WorkflowOutboxPanel() {
  const { entries, loading, error } = useWorkflowOutbox(6);
  const readyEntries = entries.filter((entry) => entry.status === "ready" && entry.actionUrl);

  if (loading) {
    return (
      <Card title="Automatizaciones WhatsApp">
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Automatizaciones WhatsApp">
        <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
      </Card>
    );
  }

  if (readyEntries.length === 0) {
    return (
      <Card title="Automatizaciones WhatsApp">
        <p className="text-sm text-[var(--ghost-text-muted)]">
          Sin mensajes pendientes. Las ventas y compras pueden generar enlaces automáticos según tu
          configuración.
        </p>
        <Link href="/settings/automations" className="mt-3 inline-block text-sm underline">
          Configurar automatizaciones
        </Link>
      </Card>
    );
  }

  return (
    <Card title="Automatizaciones WhatsApp">
      <ul className="space-y-3">
        {readyEntries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-lg border border-[var(--ghost-border)] p-3 text-sm"
          >
            <p className="font-medium">{entry.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-[var(--ghost-text-muted)]">
              {entry.message}
            </p>
            <a href={entry.actionUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
              <Button size="sm" variant="secondary">
                Abrir WhatsApp
              </Button>
            </a>
          </li>
        ))}
      </ul>
      <Link href="/settings/automations" className="mt-3 inline-block text-sm underline">
        Ver configuración
      </Link>
    </Card>
  );
}
