"use client";

import { GhostChatPanel } from "@/components/ghost-chat-panel";
import { PageHeader } from "@/components/page-header";
import { Card } from "@ghost/ui";

export default function GhostChatPage() {
  return (
    <div className="ghost-page-stack">
      <PageHeader
        title="Ghost"
        description="Chatea conmigo para configurar insumos, facturas, recetas SCA, ventas y comandas. Uso las mismas preguntas estándar de la ficha de costos."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <GhostChatPanel />

        <Card title="Comandos rápidos">
          <ul className="space-y-2 text-sm text-[var(--ghost-text-muted)]">
            <li>
              <strong className="text-[var(--ghost-text)]">menu</strong> — volver al inicio
            </li>
            <li>
              <strong className="text-[var(--ghost-text)]">ayuda</strong> — ver roles disponibles
            </li>
            <li>
              <strong className="text-[var(--ghost-text)]">cancelar</strong> — salir del flujo actual
            </li>
          </ul>
          <div className="mt-4 space-y-2 border-t border-[var(--ghost-border)] pt-4 text-sm text-[var(--ghost-text-muted)]">
            <p className="font-medium text-[var(--ghost-text)]">Roles</p>
            <p>· Financiero — insumos, facturas, catálogo, bebidas SCA</p>
            <p>· Mesero — mesas, pedidos y comandas</p>
            <p>· Cajero — caja, ventas y estado de comandas</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
