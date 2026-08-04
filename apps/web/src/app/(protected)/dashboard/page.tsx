"use client";

import Link from "next/link";

import { useSales } from "@/hooks/use-sales";
import { useAuth, useActiveMembership } from "@/providers/auth-provider";
import { Button, Card } from "@ghost/ui";

function formatMoney(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export default function DashboardPage() {
  const { organization } = useAuth();
  const membership = useActiveMembership();
  const { sales, loading } = useSales();

  const today = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter((sale) => sale.saleNumber.includes(today.replace(/-/g, "")));
  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);

  const quickLinks = [
    { href: "/pos", label: "POS — Cobrar venta" },
    { href: "/pos/menu", label: "Menú de productos" },
    { href: "/kds", label: "Comandas KDS" },
    { href: "/billing", label: "Ventas y comprobantes" },
    { href: "/inventory", label: "Inventario" },
  ];

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-[var(--ghost-text-muted)]">
          {organization
            ? `Organización: ${organization.name} · Rol: ${membership?.roles.join(", ") ?? "—"}`
            : "Vista operativa."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Ventas del día">
          <p className="text-3xl font-semibold">
            {loading ? "—" : formatMoney(todayTotal)}
          </p>
          <p className="mt-2 text-sm text-[var(--ghost-text-muted)]">
            {loading ? "Calculando..." : `${todaySales.length} venta(s) hoy`}
          </p>
        </Card>
        <Card title="Módulos activos">
          <p className="text-3xl font-semibold">POS</p>
          <p className="mt-2 text-sm text-[var(--ghost-text-muted)]">
            Venta, comandas, comprobantes e inventario base
          </p>
        </Card>
        <Card title="Facturación FE">
          <p className="text-3xl font-semibold">Próximo</p>
          <p className="mt-2 text-sm text-[var(--ghost-text-muted)]">
            Comprobante básico listo; DIAN en fase posterior
          </p>
        </Card>
        <Card title="Caja">
          <p className="text-3xl font-semibold">Próximo</p>
          <p className="mt-2 text-sm text-[var(--ghost-text-muted)]">
            Apertura, cierre y arqueo en roadmap
          </p>
        </Card>
      </div>

      <Card title="Accesos rápidos">
        <div className="grid gap-2 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button variant="secondary" fullWidth>
                {link.label}
              </Button>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
