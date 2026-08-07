import Link from "next/link";

import { Button, Card } from "@ghost/ui";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="ghost-hero">
        <p className="ghost-hero-eyebrow">Ghost Specialty Coffee</p>
        <h1 className="relative mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Ghost Contable
        </h1>
        <p className="relative mt-3 max-w-lg text-[var(--ghost-text-muted)]">
          Registros de mostrador, mesas con QR, comprobantes y comandas. Herramienta
          interna para el equipo autorizado.
        </p>
        <div className="relative mt-8 flex flex-wrap gap-3">
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
        <ul className="space-y-2.5 text-sm text-[var(--ghost-text-muted)]">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ghost-accent-500)]" />
            Mesas — QR, cuenta y cobro
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ghost-accent-500)]" />
            Mostrador — cobro directo
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ghost-accent-500)]" />
            Registros — comprobantes y reportes
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ghost-accent-500)]" />
            Comandas — barra y cocina
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ghost-accent-500)]" />
            Inventario — ítems, bodegas y movimientos
          </li>
        </ul>
      </Card>
    </div>
  );
}
