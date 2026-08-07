"use client";

import Link from "next/link";

import { useDailyAnalytics } from "@/hooks/use-daily-analytics";
import { formatMoney } from "@/lib/format";
import { Card } from "@ghost/ui";

function barHeight(value: number, max: number): string {
  if (max <= 0 || value <= 0) {
    return "4px";
  }
  return `${Math.max(8, Math.round((value / max) * 72))}px`;
}

export function AnalyticsInsightsPanel() {
  const { summary, loading, source } = useDailyAnalytics(7);

  if (loading) {
    return (
      <Card title="Analítica (7 días)">
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando tendencias…</p>
      </Card>
    );
  }

  if (!summary || summary.trend.length === 0) {
    return (
      <Card title="Analítica (7 días)">
        <p className="text-sm text-[var(--ghost-text-muted)]">
          Aún no hay datos suficientes. Registra ventas o compras para ver tendencias.
        </p>
      </Card>
    );
  }

  const maxValue = Math.max(
    ...summary.trend.flatMap((point) => [point.salesTotal, point.purchasesTotal]),
    1,
  );

  return (
    <Card title="Analítica (7 días)">
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-2)] p-3">
          <p className="text-xs text-[var(--ghost-text-muted)]">Ventas</p>
          <p className="text-lg font-semibold">{formatMoney(summary.totals.salesTotal)}</p>
          <p className="text-xs text-[var(--ghost-text-muted)]">
            {summary.totals.salesCount} comprobante(s)
          </p>
        </div>
        <div className="rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-2)] p-3">
          <p className="text-xs text-[var(--ghost-text-muted)]">Compras</p>
          <p className="text-lg font-semibold">{formatMoney(summary.totals.purchasesTotal)}</p>
          <p className="text-xs text-[var(--ghost-text-muted)]">
            {summary.totals.purchasesCount} factura(s)
          </p>
        </div>
        <div className="rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-2)] p-3">
          <p className="text-xs text-[var(--ghost-text-muted)]">Flujo neto</p>
          <p className="text-lg font-semibold">
            {formatMoney(summary.totals.salesTotal - summary.totals.purchasesTotal)}
          </p>
          <p className="text-xs text-[var(--ghost-text-muted)]">
            {source === "warehouse" ? "DWH en tiempo real" : "Calculado en cliente"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[320px] items-end gap-2">
          {summary.trend.map((point) => (
            <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-20 w-full items-end justify-center gap-1">
                <div
                  className="w-3 rounded-t bg-[var(--ghost-brand-500)]"
                  style={{ height: barHeight(point.salesTotal, maxValue) }}
                  title={`Ventas ${formatMoney(point.salesTotal)}`}
                />
                <div
                  className="w-3 rounded-t bg-[var(--ghost-text-muted)]"
                  style={{ height: barHeight(point.purchasesTotal, maxValue) }}
                  title={`Compras ${formatMoney(point.purchasesTotal)}`}
                />
              </div>
              <span className="text-[10px] text-[var(--ghost-text-muted)]">
                {point.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--ghost-text-muted)]">
        Barras: ventas (verde) vs compras (gris). Detalle en{" "}
        <Link href="/reports" className="underline">
          Informes
        </Link>
        .
      </p>
    </Card>
  );
}
