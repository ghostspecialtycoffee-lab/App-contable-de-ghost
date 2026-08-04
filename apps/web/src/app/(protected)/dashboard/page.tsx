"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useMenuProducts } from "@/hooks/use-menu-products";
import { useSales } from "@/hooks/use-sales";
import { formatMoney } from "@/lib/format";
import { useAuth, useActiveMembership } from "@/providers/auth-provider";
import {
  buildSalesReport,
  filterSalesByPeriod,
  getReportPeriod,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function DashboardPage() {
  const { organization } = useAuth();
  const membership = useActiveMembership();
  const { products, loading: productsLoading } = useMenuProducts();
  const { sales, loading: salesLoading } = useSales();

  const todayPeriod = useMemo(() => getReportPeriod("today"), []);
  const todayReport = useMemo(() => {
    const todaySales = filterSalesByPeriod(
      sales.map((sale) => ({
        soldAt: sale.soldAt ?? sale.createdAt,
        soldOn: sale.soldOn ?? (sale.soldAt ?? sale.createdAt).slice(0, 10),
        status: sale.status,
        subtotal: sale.subtotal,
        taxAmount: sale.taxAmount,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        lines: sale.lines,
      })),
      todayPeriod.from,
      todayPeriod.to,
    );
    return buildSalesReport(todaySales);
  }, [sales, todayPeriod.from, todayPeriod.to]);

  const setupSteps = [
    {
      done: products.length > 0,
      title: "1. Crear productos",
      href: "/pos/menu",
      label: products.length > 0 ? "Editar menú" : "Cargar menú",
    },
    {
      done: todayReport.invoiceCount > 0,
      title: "2. Registrar venta",
      href: "/pos",
      label: "Abrir POS",
    },
    {
      done: todayReport.invoiceCount > 0,
      title: "3. Ver informes",
      href: "/billing",
      label: "Ver facturación",
    },
  ];

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold">Inicio</h1>
        <p className="mt-1 text-[var(--ghost-text-muted)]">
          {organization
            ? `${organization.name} · ${membership?.roles.join(", ") ?? "—"}`
            : "Panel operativo"}
        </p>
      </div>

      {!productsLoading && products.length === 0 ? (
        <Card
          title="Configura tu negocio en 3 pasos"
          description="Empieza rápido: productos, venta e informes."
        >
          <ol className="space-y-3">
            {setupSteps.map((step) => (
              <li
                key={step.title}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ghost-border)] p-3"
              >
                <span className="text-sm font-medium">{step.title}</span>
                <Link href={step.href}>
                  <Button size="sm" variant={step.done ? "secondary" : "primary"}>
                    {step.label}
                  </Button>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Ventas de hoy">
          <p className="text-3xl font-semibold">
            {salesLoading ? "—" : formatMoney(todayReport.totalSales)}
          </p>
          <p className="mt-2 text-sm text-[var(--ghost-text-muted)]">
            {salesLoading
              ? "Calculando..."
              : `${todayReport.invoiceCount} venta(s) · IVA ${formatMoney(todayReport.taxAmount)}`}
          </p>
        </Card>
        <Card title="Ticket promedio">
          <p className="text-3xl font-semibold">
            {salesLoading ? "—" : formatMoney(todayReport.averageTicket)}
          </p>
        </Card>
        <Card title="Productos activos">
          <p className="text-3xl font-semibold">
            {productsLoading ? "—" : products.length}
          </p>
          <Link href="/pos/menu" className="mt-2 inline-block text-sm underline">
            Gestionar menú
          </Link>
        </Card>
        <Card title="Top del día">
          <p className="text-lg font-semibold">
            {todayReport.topProducts[0]?.name ?? "—"}
          </p>
          <p className="mt-2 text-sm text-[var(--ghost-text-muted)]">
            {todayReport.topProducts[0]
              ? `${todayReport.topProducts[0].quantity} unidades`
              : "Sin ventas aún"}
          </p>
        </Card>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/pos">
          <Button fullWidth size="lg">
            Cobrar venta
          </Button>
        </Link>
        <Link href="/pos/menu">
          <Button fullWidth variant="secondary">
            Productos
          </Button>
        </Link>
        <Link href="/billing">
          <Button fullWidth variant="secondary">
            Informes
          </Button>
        </Link>
        <Link href="/inventory">
          <Button fullWidth variant="secondary">
            Inventario
          </Button>
        </Link>
      </div>
    </div>
  );
}
