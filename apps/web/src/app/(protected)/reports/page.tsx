"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { useCashMovements } from "@/hooks/use-cash-movements";
import { useInventoryMovements } from "@/hooks/use-inventory-movements";
import { usePurchaseInvoices } from "@/hooks/use-purchase-invoices";
import { useSales } from "@/hooks/use-sales";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  CASH_MOVEMENT_TYPE_LABELS,
  INVENTORY_MOVEMENT_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  buildCashMovementsReport,
  buildFinancialSummary,
  buildInventoryAdjustmentsReport,
  buildPurchasesReport,
  buildSalesReport,
  filterByTimestampRange,
  filterPurchasesByPeriod,
  filterSalesByPeriod,
  getReportPeriod,
} from "@ghost/domain";
import { Card } from "@ghost/ui";

type ReportPreset = "today" | "week" | "month";

export default function ReportsPage() {
  const { sales, loading: salesLoading, error: salesError } = useSales();
  const { invoices, loading: purchasesLoading, error: purchasesError } = usePurchaseInvoices();
  const { movements: cashMovements, loading: cashLoading } = useCashMovements();
  const { movements: inventoryMovements, loading: inventoryLoading } = useInventoryMovements();
  const [preset, setPreset] = useState<ReportPreset>("today");

  const period = useMemo(() => getReportPeriod(preset), [preset]);

  const summary = useMemo(() => {
    const periodSales = filterSalesByPeriod(
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
      period.from,
      period.to,
    );

    const periodPurchases = filterPurchasesByPeriod(
      invoices.map((invoice) => ({
        invoiceDate: invoice.invoiceDate,
        status: invoice.status,
        supplierName: invoice.supplierName,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
      })),
      period.from,
      period.to,
    );

    const periodCash = filterByTimestampRange(cashMovements, period.from, period.to);
    const periodInventory = filterByTimestampRange(inventoryMovements, period.from, period.to);

    return buildFinancialSummary({
      periodLabel: period.label,
      sales: buildSalesReport(periodSales),
      purchases: buildPurchasesReport(periodPurchases),
      cash: buildCashMovementsReport(
        periodCash.map((movement) => ({ type: movement.type, amount: movement.amount })),
      ),
      inventory: buildInventoryAdjustmentsReport(
        periodInventory.map((movement) => ({
          type: movement.type,
          totalCost: movement.totalCost,
        })),
      ),
    });
  }, [sales, invoices, cashMovements, inventoryMovements, period]);

  const recentSales = useMemo(() => {
    return filterSalesByPeriod(
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
      period.from,
      period.to,
    ).slice(0, 8);
  }, [sales, period]);

  const recentPurchases = useMemo(() => {
    return filterPurchasesByPeriod(
      invoices.map((invoice) => ({
        invoiceDate: invoice.invoiceDate,
        status: invoice.status,
        supplierName: invoice.supplierName,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
      })),
      period.from,
      period.to,
    ).slice(0, 8);
  }, [invoices, period]);

  const periodCashRows = useMemo(
    () => filterByTimestampRange(cashMovements, period.from, period.to).slice(0, 8),
    [cashMovements, period],
  );

  const loading = salesLoading || purchasesLoading || cashLoading || inventoryLoading;
  const error = salesError || purchasesError;

  return (
    <div className="ghost-page-stack pb-4">
      <PageHeader
        title="Informes"
        description="Ventas, compras, caja, ajustes de bodega e historial del periodo."
      />

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
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando informes…</p>
      ) : error ? (
        <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
      ) : (
        <>
          <section className="ghost-stat-grid sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Ventas" value={formatMoney(summary.sales.totalSales)} hint={`${summary.sales.invoiceCount} comprobantes`} />
            <StatCard label="Compras" value={formatMoney(summary.purchases.totalPurchases)} hint={`${summary.purchases.invoiceCount} facturas`} />
            <StatCard label="Margen operativo" value={formatMoney(summary.operationalMargin)} hint="Ventas − compras" />
            <StatCard label="Ticket promedio" value={formatMoney(summary.sales.averageTicket)} hint={summary.periodLabel} />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Ventas por canal">
              <MetricRow label="Mesas" value={formatMoney(summary.sales.tableSalesTotal)} count={summary.sales.tableSalesCount} />
              <MetricRow label="Mostrador" value={formatMoney(summary.sales.counterSalesTotal)} count={summary.sales.counterSalesCount} />
              <div className="mt-3 border-t border-[var(--ghost-border)] pt-3">
                <p className="mb-2 text-xs uppercase text-[var(--ghost-text-muted)]">Medio de pago</p>
                {PAYMENT_METHODS.map((method) => (
                  <MetricRow
                    key={method}
                    label={PAYMENT_METHOD_LABELS[method]}
                    value={formatMoney(summary.sales.byPaymentMethod[method])}
                  />
                ))}
              </div>
            </Card>

            <Card title="Compras por día">
              {summary.purchases.byDay.length === 0 ? (
                <EmptyHint href="/purchases" label="Sin compras en el periodo" />
              ) : (
                <ul className="space-y-2 text-sm">
                  {summary.purchases.byDay.map((day) => (
                    <li key={day.date} className="flex justify-between gap-3">
                      <span>
                        {formatDate(day.date)}
                        <span className="ml-2 text-[var(--ghost-text-muted)]">
                          ({day.invoiceCount})
                        </span>
                      </span>
                      <span className="font-medium">{formatMoney(day.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {summary.purchases.topSuppliers.length > 0 ? (
                <div className="mt-4 border-t border-[var(--ghost-border)] pt-3">
                  <p className="mb-2 text-xs uppercase text-[var(--ghost-text-muted)]">Top proveedores</p>
                  <ul className="space-y-1 text-sm">
                    {summary.purchases.topSuppliers.slice(0, 5).map((supplier) => (
                      <li key={supplier.name} className="flex justify-between gap-3">
                        <span className="truncate">{supplier.name}</span>
                        <span className="shrink-0 font-medium">{formatMoney(supplier.total)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>

            <Card title="Productos más vendidos">
              {summary.sales.topProducts.length === 0 ? (
                <EmptyHint href="/pos" label="Sin ventas en el periodo" />
              ) : (
                <ul className="space-y-2 text-sm">
                  {summary.sales.topProducts.map((product, index) => (
                    <li key={product.name} className="flex items-center justify-between gap-3">
                      <span>
                        <span className="mr-2 text-[var(--ghost-text-muted)]">{index + 1}.</span>
                        {product.name}
                        <span className="ml-2 text-[var(--ghost-text-muted)]">x{product.quantity}</span>
                      </span>
                      <span className="font-medium">{formatMoney(product.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Caja y bodega">
              <div className="space-y-2 text-sm">
                <MetricRow label="Entradas caja" value={formatMoney(summary.cash.inflowsTotal)} />
                <MetricRow label="Salidas caja" value={formatMoney(summary.cash.outflowsTotal)} />
                <MetricRow label="Préstamos" value={formatMoney(summary.cash.loansTotal)} />
                <MetricRow label="Devoluciones préstamo" value={formatMoney(summary.cash.loanRepaymentsTotal)} />
              </div>
              <div className="mt-4 border-t border-[var(--ghost-border)] pt-3 space-y-2 text-sm">
                <MetricRow label="Entradas bodega" value={formatMoney(summary.inventory.entryTotal)} />
                <MetricRow label="Salidas bodega" value={formatMoney(summary.inventory.exitTotal)} />
                <MetricRow label="Merma" value={formatMoney(summary.inventory.wasteTotal)} count={summary.inventory.adjustmentCount} />
              </div>
              <Link href="/cash" className="mt-3 inline-block text-sm underline">
                Ver caja
              </Link>
            </Card>
          </div>

          <Card title={`Historial — ${period.label.toLowerCase()}`}>
            <div className="grid gap-6 lg:grid-cols-2">
              <HistoryBlock title="Últimas ventas">
                {recentSales.length === 0 ? (
                  <p className="text-sm text-[var(--ghost-text-muted)]">Sin ventas.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {recentSales.map((sale, index) => (
                      <li key={`${sale.soldAt}-${index}`} className="flex justify-between gap-3">
                        <span className="text-[var(--ghost-text-muted)]">
                          {formatDateTime(sale.soldAt)}
                          {sale.tableNumber !== undefined ? ` · Mesa ${sale.tableNumber}` : " · Mostrador"}
                        </span>
                        <span className="font-medium">{formatMoney(sale.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/billing" className="mt-2 inline-block text-sm underline">
                  Ver comprobantes
                </Link>
              </HistoryBlock>

              <HistoryBlock title="Últimas compras">
                {recentPurchases.length === 0 ? (
                  <p className="text-sm text-[var(--ghost-text-muted)]">Sin compras confirmadas.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {recentPurchases.map((invoice, index) => (
                      <li key={`${invoice.invoiceDate}-${invoice.supplierName}-${index}`} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">
                          {formatDate(invoice.invoiceDate)} · {invoice.supplierName}
                        </span>
                        <span className="shrink-0 font-medium">{formatMoney(invoice.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/purchases" className="mt-2 inline-block text-sm underline">
                  Ver facturas
                </Link>
              </HistoryBlock>

              <HistoryBlock title="Movimientos de caja">
                {periodCashRows.length === 0 ? (
                  <p className="text-sm text-[var(--ghost-text-muted)]">Sin movimientos.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {periodCashRows.map((movement) => (
                      <li key={movement.id} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">
                          {CASH_MOVEMENT_TYPE_LABELS[movement.type]} · {movement.reason}
                        </span>
                        <span className="shrink-0 font-medium">{formatMoney(movement.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </HistoryBlock>

              <HistoryBlock title="Ajustes de bodega">
                {filterByTimestampRange(inventoryMovements, period.from, period.to).length === 0 ? (
                  <p className="text-sm text-[var(--ghost-text-muted)]">Sin movimientos de inventario.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {filterByTimestampRange(inventoryMovements, period.from, period.to)
                      .slice(0, 8)
                      .map((movement) => (
                        <li key={movement.id} className="flex justify-between gap-3">
                          <span className="min-w-0 truncate">
                            {INVENTORY_MOVEMENT_LABELS[movement.type]}
                            {movement.notes ? ` · ${movement.notes}` : ""}
                          </span>
                          <span className="shrink-0 font-medium">
                            {formatMoney(movement.totalCost || 0)}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
                <Link href="/inventory/movements" className="mt-2 inline-block text-sm underline">
                  Registrar ajuste
                </Link>
              </HistoryBlock>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="ghost-stat">
      <p className="ghost-stat-label">{label}</p>
      <p className="ghost-stat-value">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">{hint}</p> : null}
    </div>
  );
}

function MetricRow({
  label,
  value,
  count,
}: {
  label: string;
  value: string;
  count?: number;
}) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span>
        {label}
        {count !== undefined ? (
          <span className="ml-2 text-[var(--ghost-text-muted)]">({count})</span>
        ) : null}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function HistoryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      {children}
    </div>
  );
}

function EmptyHint({ href, label }: { href: string; label: string }) {
  return (
    <p className="text-sm text-[var(--ghost-text-muted)]">
      {label}.{" "}
      <Link href={href} className="underline">
        Ir
      </Link>
    </p>
  );
}
