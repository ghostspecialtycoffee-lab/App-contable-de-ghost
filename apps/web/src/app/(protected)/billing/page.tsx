"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { SaleReceipt } from "@/components/sale-receipt";
import { SalesAccessButtons } from "@/components/sales-access-buttons";
import { useSalesPaths } from "@/hooks/use-sales-paths";
import { useSales } from "@/hooks/use-sales";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  buildSalesReport,
  filterSalesByPeriod,
  getReportPeriod,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

type BillingTab = "invoices" | "reports";
type ReportPreset = "today" | "week" | "month";

export default function BillingPage() {
  const { organization } = useAuth();
  const { path, inSalesExtension } = useSalesPaths();
  const { sales, loading, error } = useSales();
  const [tab, setTab] = useState<BillingTab>("reports");
  const [preset, setPreset] = useState<ReportPreset>("today");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const period = useMemo(() => getReportPeriod(preset), [preset]);

  const salesForReport = useMemo(
    () =>
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
    [sales],
  );

  const periodSales = useMemo(
    () => filterSalesByPeriod(salesForReport, period.from, period.to),
    [period.from, period.to, salesForReport],
  );

  const report = useMemo(() => buildSalesReport(periodSales), [periodSales]);

  const invoicesInPeriod = useMemo(() => {
    return sales.filter((sale) => {
      const soldAt = sale.soldAt ?? sale.createdAt;
      const time = new Date(soldAt).getTime();
      return time >= period.from.getTime() && time <= period.to.getTime();
    });
  }, [period.from, period.to, sales]);

  const activeSale =
    sales.find((sale) => sale.id === selectedSaleId) ?? invoicesInPeriod[0];

  return (
    <div className="ghost-page-stack pb-4">
      <PageHeader
        title="Registros"
        description="Comprobantes de venta · informes completos en Informes"
      />

      <div className="ghost-sticky-actions">
        <div className="ghost-secondary-actions">
          <Link href={path("counter")}>
            <Button size="lg">Mostrador</Button>
          </Link>
          <Link href={path("tables")}>
            <Button size="lg" variant="secondary">
              Mesas
            </Button>
          </Link>
        </div>
      </div>

      {!inSalesExtension ? (
        <div className="ghost-secondary-actions">
          <Link href="/reports">
            <Button variant="secondary">Informes financieros</Button>
          </Link>
          <Link href="/settings/fiscal">
            <Button variant="secondary">Datos fiscales</Button>
          </Link>
        </div>
      ) : null}

      <SalesAccessButtons compact />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("reports")}
          className={[
            "rounded-lg px-4 py-2 text-sm font-medium",
            tab === "reports"
              ? "bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)]"
              : "bg-[var(--ghost-surface-2)]",
          ].join(" ")}
        >
          Informes
        </button>
        <button
          type="button"
          onClick={() => setTab("invoices")}
          className={[
            "rounded-lg px-4 py-2 text-sm font-medium",
            tab === "invoices"
              ? "bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)]"
              : "bg-[var(--ghost-surface-2)]",
          ].join(" ")}
        >
          Comprobantes
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["today", "week", "month"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPreset(item)}
            className={[
              "rounded-full px-3 py-1 text-sm",
              preset === item
                ? "bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)]"
                : "bg-[var(--ghost-surface-2)]",
            ].join(" ")}
          >
            {getReportPeriod(item).label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando registros...</p>
      ) : error ? (
        <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
      ) : tab === "reports" ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card title="Total registrado">
              <p className="text-2xl font-bold">{formatMoney(report.totalSales)}</p>
              <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
                {report.invoiceCount} comprobante(s)
              </p>
            </Card>
            <Card title="Promedio por registro">
              <p className="text-2xl font-bold">{formatMoney(report.averageTicket)}</p>
            </Card>
            <Card title="IVA del periodo">
              <p className="text-2xl font-bold">{formatMoney(report.taxAmount)}</p>
            </Card>
            <Card title="Subtotal neto">
              <p className="text-2xl font-bold">{formatMoney(report.subtotal)}</p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Por canal de venta">
              {report.invoiceCount === 0 ? (
                <p className="text-sm text-[var(--ghost-text-muted)]">
                  Sin registros en este periodo.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span>
                      Mesas
                      <span className="ml-2 text-[var(--ghost-text-muted)]">
                        ({report.tableSalesCount})
                      </span>
                    </span>
                    <span className="font-medium">
                      {formatMoney(report.tableSalesTotal)}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>
                      Mostrador
                      <span className="ml-2 text-[var(--ghost-text-muted)]">
                        ({report.counterSalesCount})
                      </span>
                    </span>
                    <span className="font-medium">
                      {formatMoney(report.counterSalesTotal)}
                    </span>
                  </li>
                </ul>
              )}
            </Card>

            <Card title="Por medio de pago">
              {report.invoiceCount === 0 ? (
                <p className="text-sm text-[var(--ghost-text-muted)]">
                  Sin registros en este periodo.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {PAYMENT_METHODS.map((method) => (
                    <li key={method} className="flex justify-between">
                      <span>{PAYMENT_METHOD_LABELS[method]}</span>
                      <span className="font-medium">
                        {formatMoney(report.byPaymentMethod[method])}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Ítems con más movimiento">
              {report.topProducts.length === 0 ? (
                <p className="text-sm text-[var(--ghost-text-muted)]">
                  Aún no hay datos para este periodo.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {report.topProducts.map((product) => (
                    <li
                      key={product.name}
                      className="flex items-center justify-between gap-3"
                    >
                      <span>
                        {product.name}
                        <span className="ml-2 text-[var(--ghost-text-muted)]">
                          x{product.quantity}
                        </span>
                      </span>
                      <span className="font-medium">
                        {formatMoney(product.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : invoicesInPeriod.length === 0 ? (
        <Card title="Sin comprobantes">
          <p className="text-sm text-[var(--ghost-text-muted)]">
            No hay comprobantes en {period.label.toLowerCase()}. Crea uno desde mostrador.
          </p>
          <Link href={path("counter")} className="mt-4 inline-block">
            <Button>Ir al mostrador</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card title={`Comprobantes — ${period.label}`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--ghost-border)] text-[var(--ghost-text-muted)]">
                  <tr>
                    <th className="px-2 py-2 font-medium">Número</th>
                    <th className="px-2 py-2 font-medium">Origen</th>
                    <th className="px-2 py-2 font-medium">Fecha</th>
                    <th className="px-2 py-2 font-medium">Total</th>
                    <th className="px-2 py-2 font-medium">Pago</th>
                    <th className="px-2 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {invoicesInPeriod.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-[var(--ghost-border)] last:border-0"
                    >
                      <td className="px-2 py-2 font-mono text-xs">{sale.saleNumber}</td>
                      <td className="px-2 py-2">
                        {sale.tableNumber !== undefined
                          ? `Mesa ${sale.tableNumber}`
                          : "Mostrador"}
                      </td>
                      <td className="px-2 py-2">
                        {formatDateTime(sale.soldAt ?? sale.createdAt)}
                      </td>
                      <td className="px-2 py-2">{formatMoney(sale.total)}</td>
                      <td className="px-2 py-2">
                        {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedSaleId(sale.id)}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {activeSale ? (
            <Card title="Detalle">
              <SaleReceipt sale={activeSale} />
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
