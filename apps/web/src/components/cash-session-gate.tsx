"use client";

import Link from "next/link";

import { useCashSession } from "@/hooks/use-cash-session";
import { Button, Card } from "@ghost/ui";

export function CashSessionGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useCashSession();

  if (loading) {
    return (
      <Card title="Caja">
        <p className="text-sm text-[var(--ghost-text-muted)]">Verificando sesión de caja…</p>
      </Card>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  return (
    <Card title="Abre caja para empezar el día">
      <p className="text-sm text-[var(--ghost-text-muted)]">
        Antes de cobrar en mostrador o mesas, registra con cuánto efectivo inicias la jornada.
        También podrás anotar entradas, salidas y préstamos durante el día.
      </p>
      <Link href="/cash" className="mt-4 inline-block">
        <Button>Ir a Caja</Button>
      </Link>
    </Card>
  );
}
