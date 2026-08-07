"use client";

import Link from "next/link";
import { useMemo } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSection } from "@/components/page-section";
import { useSales } from "@/hooks/use-sales";
import { useActiveMembership } from "@/providers/auth-provider";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getSalesNavItems, SALES_EXTENSION_PATHS } from "@/lib/navigation/sales-extension";
import {
  buildSalesReport,
  filterSalesByPeriod,
  getReportPeriod,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function CajaHubPage() {
  const { sales, loading, error } = useSales();
  const membership = useActiveMembership();
  const todayPeriod = useMemo(() => getReportPeriod("today"), []);

  const roles = membership?.roles ?? [];
  const quickLinks = getSalesNavItems(roles).filter(
    (item) => item.href !== SALES_EXTENSION_PATHS.hub,
  );

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
    <div className="ghost-page-stack">
      <PageHeader
        title="Caja"
        description="Registro de ventas — mostrador, mesas y comprobantes."
      />

      <div className="ghost-sticky-actions">
        <div className="ghost-action-grid">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                fullWidth
                size="lg"
                variant={item.href === SALES_EXTENSION_PATHS.counter ? "primary" : "secondary"}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <PageSection title="Hoy">
        <section className="ghost-stat-grid sm:grid-cols-2 xl:grid-cols-4" aria-label="Hoy">
          <div className="ghost-stat">
            <p className="ghost-stat-label">Total</p>
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
      </PageSection>

      <Card title="Últimos comprobantes">
        {loading ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
        ) : recentSales.length === 0 ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">Sin ventas recientes.</p>
        ) : (
          <ul className="divide-y divide-[var(--ghost-border)] text-sm">
            {recentSales.map((sale) => (
              <li key={sale.id} className="ghost-list-row">
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
        <Link
          href={SALES_EXTENSION_PATHS.records}
          className="mt-3 inline-flex min-h-[2.5rem] items-center text-sm text-[var(--ghost-text-muted)] underline"
        >
          Ver todos los registros
        </Link>
      </Card>
    </div>
  );
}
