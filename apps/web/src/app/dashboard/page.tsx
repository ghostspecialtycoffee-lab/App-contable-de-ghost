import { Card } from "@ghost/ui";

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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-[var(--ghost-text-muted)]">
          Vista ejecutiva inicial. Los indicadores se poblarán conforme se
          activen módulos operativos.
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
        title="Próximos pasos recomendados"
        description="Secuencia sugerida para activar valor operativo rápido."
      >
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--ghost-text-muted)]">
          <li>Configurar Firebase Auth y tenant (organización + sucursal).</li>
          <li>Implementar inventario base con kardex auditado.</li>
          <li>Activar POS táctil y caja con arqueos.</li>
          <li>Integrar OCR de facturas para compras automáticas.</li>
        </ol>
      </Card>
    </div>
  );
}
