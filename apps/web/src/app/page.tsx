import Link from "next/link";

import { Button, Card } from "@ghost/ui";
import { GHOST_MODULES } from "@ghost/shared";

const moduleLabels: Record<(typeof GHOST_MODULES)[number], string> = {
  core: "Núcleo",
  inventory: "Inventario",
  costing: "Costeo",
  pos: "POS",
  kds: "Comandas KDS",
  cash: "Caja",
  billing: "Facturación",
  ocr: "OCR",
  hr: "Recursos Humanos",
  chat: "Chat interno",
  reports: "Reportes",
  analytics: "Analítica",
  ai: "Asesor IA",
  notifications: "Notificaciones",
};

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--ghost-accent-500)]">
          Ghost ERP
        </p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          Plataforma empresarial para operar cafeterías, restaurantes y
          franquicias
        </h1>
        <p className="mt-4 max-w-2xl text-[var(--ghost-text-muted)]">
          Fundación técnica con Clean Architecture, Firebase y módulos
          desacoplados listos para escalar inventario, POS, costeo, OCR y
          analítica.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard">
            <Button size="lg">Ir al dashboard</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GHOST_MODULES.map((module) => (
          <Card
            key={module}
            title={moduleLabels[module]}
            description={`Módulo ${module} preparado para evolución incremental.`}
          >
            <p className="text-xs uppercase tracking-wide text-[var(--ghost-text-muted)]">
              Estado: fundación
            </p>
          </Card>
        ))}
      </section>
    </div>
  );
}
