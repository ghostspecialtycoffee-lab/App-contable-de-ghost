"use client";

import { Card } from "@ghost/ui";

import { useAuth, useActiveMembership } from "@/providers/auth-provider";

const dashboardCards = [
  {
    title: "Ventas del día",
    value: "—",
    hint: "Conecta POS para métricas en vivo",
  },
  {
    title: "Food Cost",
    value: "—",
    hint: "Se activará con inventario y recetas",
  },
  {
    title: "Inventario bajo",
    value: "—",
    hint: "Alertas automáticas pendientes de configuración",
  },
  {
    title: "Caja abierta",
    value: "—",
    hint: "Módulo de caja en roadmap inmediato",
  },
];

export default function DashboardPage() {
  const { organization } = useAuth();
  const membership = useActiveMembership();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-[var(--ghost-text-muted)]">
          {organization
            ? `Organización: ${organization.name} · Rol: ${membership?.roles.join(", ") ?? "—"}`
            : "Vista ejecutiva inicial."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((item) => (
          <Card key={item.title} title={item.title}>
            <p className="text-3xl font-semibold">{item.value}</p>
            <p className="mt-2 text-sm text-[var(--ghost-text-muted)]">
              {item.hint}
            </p>
          </Card>
        ))}
      </div>

      <Card
        title="Próximo módulo: Inventario"
        description="Siguiente prioridad según roadmap autónomo."
      >
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--ghost-text-muted)]">
          <li>Materias primas, unidades y bodegas por sucursal.</li>
          <li>Kardex auditado con entradas, salidas y ajustes.</li>
          <li>Alertas de inventario mínimo y costo promedio.</li>
        </ol>
      </Card>
    </div>
  );
}
