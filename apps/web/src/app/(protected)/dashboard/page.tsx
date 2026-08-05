"use client";

import Link from "next/link";
import { useMemo } from "react";

import { PageHeader } from "@/components/page-header";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { useSales } from "@/hooks/use-sales";
import { formatMoney } from "@/lib/format";
import {
  buildSalesReport,
  filterSalesByPeriod,
  getReportPeriod,
} from "@ghost/domain";

export default function DashboardPage() {
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
        tableNumber: sale.tableNumber,
        lines: sale.lines,
      })),
      todayPeriod.from,
      todayPeriod.to,
    );
    return buildSalesReport(todaySales);
  }, [sales, todayPeriod.from, todayPeriod.to]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inicio"
        description="Resumen de hoy y accesos directos."
      />

      <section className="ghost-stat-grid" aria-label="Resumen de hoy">
        <div className="ghost-stat">
          <p className="ghost-stat-label">Ventas hoy</p>
          <p className="ghost-stat-value">
            {salesLoading ? "—" : formatMoney(todayReport.totalSales)}
          </p>
          <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">
            {todayReport.invoiceCount} comprobante(s)
          </p>
        </div>
        <div className="ghost-stat">
          <p className="ghost-stat-label">Mesas</p>
          <p className="ghost-stat-value">
            {salesLoading ? "—" : formatMoney(todayReport.tableSalesTotal)}
          </p>
          <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">
            {todayReport.tableSalesCount} cuenta(s)
          </p>
        </div>
        <div className="ghost-stat">
          <p className="ghost-stat-label">Ticket promedio</p>
          <p className="ghost-stat-value">
            {salesLoading ? "—" : formatMoney(todayReport.averageTicket)}
          </p>
          <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">
            {productsLoading ? "—" : `${products.length} productos en catálogo`}
          </p>
        </div>
      </section>

      <section aria-label="Acciones principales">
        <p className="mb-3 text-sm font-medium">Operación</p>
        <div className="ghost-action-grid">
          <Link href="/ventas" className="ghost-action-tile ghost-action-tile-primary">
            <span className="text-base font-semibold">Centro de ventas</span>
            <span className="mt-0.5 text-sm text-[var(--ghost-text-muted)]">
              Cobrar, mesas y comprobantes
            </span>
          </Link>
          <Link href="/pos" className="ghost-action-tile">
            <span className="text-base font-semibold">Mostrador</span>
            <span className="mt-0.5 text-sm text-[var(--ghost-text-muted)]">
              Venta rápida
            </span>
          </Link>
          <Link href="/pos/tables" className="ghost-action-tile">
            <span className="text-base font-semibold">Mesas</span>
            <span className="mt-0.5 text-sm text-[var(--ghost-text-muted)]">
              Abrir cuenta o QR
            </span>
          </Link>
          <Link href="/billing" className="ghost-action-tile">
            <span className="text-base font-semibold">Registros</span>
            <span className="mt-0.5 text-sm text-[var(--ghost-text-muted)]">
              Informes y comprobantes
            </span>
          </Link>
        </div>
      </section>

      <section aria-label="Contabilidad">
        <p className="mb-3 text-sm font-medium">Contabilidad</p>
        <div className="ghost-link-grid">
          <Link href="/purchases" className="ghost-link-row">
            <span>Compras</span>
            <span className="text-[var(--ghost-text-muted)]">→</span>
          </Link>
          <Link href="/inventory" className="ghost-link-row">
            <span>Inventario</span>
            <span className="text-[var(--ghost-text-muted)]">→</span>
          </Link>
          <Link href="/costing" className="ghost-link-row">
            <span>Costeo</span>
            <span className="text-[var(--ghost-text-muted)]">→</span>
          </Link>
          <Link href="/expenses" className="ghost-link-row">
            <span>Gastos fijos</span>
            <span className="text-[var(--ghost-text-muted)]">→</span>
          </Link>
          <Link href="/pos/menu" className="ghost-link-row">
            <span>Catálogo</span>
            <span className="text-[var(--ghost-text-muted)]">→</span>
          </Link>
          <Link href="/settings/fiscal" className="ghost-link-row">
            <span>Facturación</span>
            <span className="text-[var(--ghost-text-muted)]">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
