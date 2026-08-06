"use client";

import { GhostChatPanel } from "@/components/ghost-chat-panel";
import { PageHeader } from "@/components/page-header";
import { Card } from "@ghost/ui";

export default function GhostChatPage() {
  return (
    <div className="ghost-page-stack">
      <PageHeader
        title="Ghost"
        description="Asistente conversacional: lee el contexto de tu operación y ejecuta compras, ventas, inventario y costos sin menús rígidos."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <GhostChatPanel />

        <Card title="Ejemplos naturales">
          <ul className="space-y-2 text-sm text-[var(--ghost-text-muted)]">
            <li>«¿Cómo va la operación hoy?»</li>
            <li>«Registra factura de Distritcafé por 2 kg de café a 85000»</li>
            <li>«Abre caja con 200000»</li>
            <li>«Vende un latte en efectivo»</li>
            <li>«Abre la mesa 3»</li>
          </ul>
          <div className="mt-4 space-y-2 border-t border-[var(--ghost-border)] pt-4 text-sm text-[var(--ghost-text-muted)]">
            <p className="font-medium text-[var(--ghost-text)]">Comandos</p>
            <p>
              <strong className="text-[var(--ghost-text)]">cancelar</strong> — salir del tema actual
            </p>
            <p>
              <strong className="text-[var(--ghost-text)]">menu</strong> — reiniciar conversación
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
