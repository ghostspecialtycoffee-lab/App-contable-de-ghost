"use client";

import Link from "next/link";
import { useMemo } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { useBrandAssets } from "@/hooks/use-brand-assets";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { useSales } from "@/hooks/use-sales";
import { formatMoney } from "@/lib/format";
import { useAuth, useActiveMembership } from "@/providers/auth-provider";
import {
  BRAND_ASSET_TYPE_LABELS,
  buildSalesReport,
  filterSalesByPeriod,
  getReportPeriod,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function DashboardPage() {
  const { organization } = useAuth();
  const membership = useActiveMembership();
  const { assets, primaryLogo, loading: brandLoading } = useBrandAssets();
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

  const previewAssets = assets.slice(0, 4);

  return (
    <div className="space-y-6 pb-4">
      <section className="overflow-hidden rounded-2xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)]">
        <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center justify-center border-b border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] p-8 lg:border-b-0 lg:border-r">
            <BrandLogo
              asset={primaryLogo}
              organizationName={organization?.name}
              size="xl"
            />
            <p className="mt-4 text-center text-sm font-medium">
              {organization?.name ?? "Organización"}
            </p>
            <p className="mt-1 text-center text-xs text-[var(--ghost-text-muted)]">
              {membership?.roles.join(", ") ?? "—"}
            </p>
            <Link href="/brand" className="mt-4">
              <Button size="sm" variant="secondary">
                Gestionar identidad
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ghost-text-muted)]">
                Registros hoy
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {salesLoading ? "—" : formatMoney(todayReport.totalSales)}
              </p>
              <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">
                {todayReport.invoiceCount} comprobante(s)
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ghost-text-muted)]">
                Promedio
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {salesLoading ? "—" : formatMoney(todayReport.averageTicket)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ghost-text-muted)]">
                Catálogo
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {productsLoading ? "—" : products.length}
              </p>
              <Link href="/pos/menu" className="mt-1 inline-block text-xs underline">
                Administrar
              </Link>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ghost-text-muted)]">
                Archivos visuales
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {brandLoading ? "—" : assets.length}
              </p>
              <Link href="/brand" className="mt-1 inline-block text-xs underline">
                Ver biblioteca
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Card title="Identidad visual">
        {brandLoading ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">Cargando...</p>
        ) : previewAssets.length === 0 ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--ghost-text-muted)]">
              Aún no hay logos ni piezas gráficas cargadas.
            </p>
            <Link href="/brand">
              <Button>Subir logo</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {previewAssets.map((asset) => (
              <Link
                key={asset.id}
                href="/brand"
                className="group overflow-hidden rounded-xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] transition hover:border-[var(--ghost-text-muted)]"
              >
                <div className="flex aspect-square items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.dataUrl}
                    alt={asset.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="border-t border-[var(--ghost-border)] px-3 py-2">
                  <p className="truncate text-sm font-medium">{asset.name}</p>
                  <p className="text-xs text-[var(--ghost-text-muted)]">
                    {BRAND_ASSET_TYPE_LABELS[asset.type]}
                    {asset.isPrimary ? " · Principal" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/pos">
          <Button fullWidth size="lg">
            Mostrador
          </Button>
        </Link>
        <Link href="/pos/menu">
          <Button fullWidth variant="secondary">
            Catálogo
          </Button>
        </Link>
        <Link href="/billing">
          <Button fullWidth variant="secondary">
            Registros
          </Button>
        </Link>
        <Link href="/brand">
          <Button fullWidth variant="secondary">
            Identidad
          </Button>
        </Link>
        <Link href="/inventory">
          <Button fullWidth variant="secondary">
            Inventario
          </Button>
        </Link>
        <Link href="/purchases">
          <Button fullWidth variant="secondary">
            Compras
          </Button>
        </Link>
        <Link href="/costing">
          <Button fullWidth variant="secondary">
            Costeo
          </Button>
        </Link>
      </div>
    </div>
  );
}
