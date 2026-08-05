"use client";

import Link from "next/link";
import { useMemo } from "react";

import { OperationalHint } from "@/components/operational-model-panel";
import { OperationalFlowSteps } from "@/components/operational-flow-steps";
import { PageHeader } from "@/components/page-header";
import { useSales } from "@/hooks/use-sales";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  buildSalesReport,
  filterSalesByPeriod,
  getReportPeriod,
  SALES_COUNTER_FLOW,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function VentasPage() {
  const { sales, loading, error } = useSales();
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
        tableNumber: sale.tableNumber,
        lines: sale.lines,
      })),
      todayPeriod.from,
      todayPeriod.to,
    );
    return buildSalesReport(todaySales);
  }, [sales, todayPeriod.from, todayPeriod.to]);

  const recentSales = useMemo(() => {
    return [...sales]
      .filter((sale) => sale.status === "paid")
      .sort(
        (left, right) =>
          new Date(right.soldAt ?? right.createdAt).getTime() -
          new Date(left.soldAt ?? left.createdAt).getTime(),
      )
      .slice(0, 6);
  }, [sales]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ventas"
        description="Cobra, revisa el día y abre comprobantes."
      />

      <OperationalHint context="sales" />

      <OperationalFlowSteps title="Flujo mostrador" steps={SALES_COUNTER_FLOW} compact />

      <section className="ghost-stat-grid sm:grid-cols-2 xl:grid-cols-4" aria-label="Hoy">
        <div className="ghost-stat">
          <p className="ghost-stat-label">Total hoy</p>
          <p className="ghost-stat-value">
            {loading ? "—" : formatMoney(todayReport.totalSales)}
          </p>
        </div>
        <div className="ghost-stat">
          <p className="ghost-stat-label">Mesas</p>
          <p className="ghost-stat-value">
            {loading ? "—" : formatMoney(todayReport.tableSalesTotal)}
          </p>
        </div>
        <div className="ghost-stat">
          <p className="ghost-stat-label">Mostrador</p>
          <p className="ghost-stat-value">
            {loading ? "—" : formatMoney(todayReport.counterSalesTotal)}
          </p>
        </div>
        <div className="ghost-stat">
          <p className="ghost-stat-label">Ticket</p>
          <p className="ghost-stat-value">
            {loading ? "—" : formatMoney(todayReport.averageTicket)}
          </p>
        </div>
      </section>

      <section className="ghost-action-grid" aria-label="Cobrar">
        <Link href="/pos">
          <Button fullWidth size="lg">
            Cobrar mostrador
          </Button>
        </Link>
        <Link href="/pos/tables">
          <Button fullWidth size="lg" variant="secondary">
            Abrir mesa
          </Button>
        </Link>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href="/kds">
          <Button size="sm" variant="secondary">
            Comandas
          </Button>
        </Link>
        <Link href="/billing">
          <Button size="sm" variant="secondary">
            Registros
          </Button>
        </Link>
      </div>

      <Card title="Últimos comprobantes">
        {loading ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
        ) : recentSales.length === 0 ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Sin ventas hoy. Usa mostrador o mesas.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--ghost-border)] text-sm">
            {recentSales.map((sale) => (
              <li key={sale.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-mono text-xs">{sale.saleNumber}</p>
                  <p className="truncate text-[var(--ghost-text-muted)]">
                    {formatDateTime(sale.soldAt ?? sale.createdAt)}
                    {sale.tableNumber !== undefined
                      ? ` · Mesa ${sale.tableNumber}`
                      : " · Mostrador"}
                  </p>
                </div>
                <p className="shrink-0 font-medium">
                  {formatMoney(sale.total)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Link href="/billing" className="mt-4 inline-block text-sm text-[var(--ghost-text-muted)] underline">
          Ver todos
        </Link>
      </Card>
    </div>
  );
}
