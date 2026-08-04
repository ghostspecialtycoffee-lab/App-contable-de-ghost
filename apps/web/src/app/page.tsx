import Link from "next/link";

import { Button, Card } from "@ghost/ui";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-2xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ghost-text-muted)]">
          Uso interno
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Ghost Contable</h1>
        <p className="mt-3 text-[var(--ghost-text-muted)]">
          Registros de mostrador, comprobantes, comandas e inventario. Acceso
          restringido al equipo autorizado.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login">
            <Button size="lg">Entrar</Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary" size="lg">
              Solicitar acceso
            </Button>
          </Link>
        </div>
      </section>

      <Card title="Módulos disponibles">
        <ul className="space-y-2 text-sm text-[var(--ghost-text-muted)]">
          <li>Mostrador — registro de operaciones</li>
          <li>Comprobantes y reportes</li>
          <li>Comandas — barra y cocina</li>
          <li>Inventario — ítems, bodegas y movimientos</li>
        </ul>
      </Card>
    </div>
  );
}
