"use client";

import type { ProductCostPanorama } from "@ghost/domain";

import { formatMoney } from "@/lib/format";

export function ProductCostPanoramaPanel({
  panorama,
  title = "Panorama de costos",
}: {
  panorama: ProductCostPanorama | null;
  title?: string;
}) {
  if (!panorama || panorama.portionCost <= 0) {
    return (
      <p className="text-sm text-[var(--ghost-text-muted)]">
        Completa la receta y el costo de bodega para ver el panorama.
      </p>
    );
  }

  const targetPct = (panorama.targetFoodCostPct * 100).toFixed(0);

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{title}</p>

      {panorama.lotBreakdown ? (
        <div className="rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-muted)] p-3 text-sm">
          <p className="mb-2 font-medium">División del lote</p>
          <dl className="grid gap-1 sm:grid-cols-2">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--ghost-text-muted)]">Factura (torta completa)</dt>
              <dd>{formatMoney(panorama.lotBreakdown.batchCostNet)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--ghost-text-muted)]">+ Domicilio</dt>
              <dd>{formatMoney(panorama.lotBreakdown.domicilioAllocation)}</dd>
            </div>
            <div className="flex justify-between gap-2 font-medium">
              <dt>Total lote</dt>
              <dd>{formatMoney(panorama.lotBreakdown.totalLotCost)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--ghost-text-muted)]">÷ Porciones</dt>
              <dd>{panorama.lotBreakdown.yieldQuantity}</dd>
            </div>
            <div className="flex justify-between gap-2 font-medium sm:col-span-2">
              <dt>Costo por porción</dt>
              <dd>{formatMoney(panorama.lotBreakdown.portionCost)}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-sm text-[var(--ghost-text-muted)]">
          Costo por porción: <strong>{formatMoney(panorama.portionCost)}</strong>
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <ScenarioCard
          title="Tu precio establecido"
          subtitle="Cómo se comporta con lo que definiste"
          scenario={panorama.yourPrice}
          targetPct={targetPct}
          emptyLabel="Sin precio de venta en catálogo"
        />
        <ScenarioCard
          title="Precio sugerido"
          subtitle={`Para cumplir meta de food cost ${targetPct}%`}
          scenario={panorama.suggestedPrice}
          targetPct={targetPct}
          highlight
        />
      </div>
    </div>
  );
}

function ScenarioCard({
  title,
  subtitle,
  scenario,
  targetPct,
  emptyLabel,
  highlight = false,
}: {
  title: string;
  subtitle: string;
  scenario: ProductCostPanorama["yourPrice"] | ProductCostPanorama["suggestedPrice"];
  targetPct: string;
  emptyLabel?: string;
  highlight?: boolean;
}) {
  if (!scenario || scenario.salePriceGross <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--ghost-border)] p-3">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">{emptyLabel ?? subtitle}</p>
      </div>
    );
  }

  const foodCostPct = (scenario.foodCostPct * 100).toFixed(1);
  const marginPct = (scenario.grossMarginPct * 100).toFixed(1);
  const isHigh = scenario.status === "high";

  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight
          ? "border-[var(--ghost-brand-500)] bg-[var(--ghost-surface-muted)]"
          : "border-[var(--ghost-border)]"
      }`}
    >
      <p className="font-medium">{title}</p>
      <p className="text-xs text-[var(--ghost-text-muted)]">{subtitle}</p>
      <p className="mt-2 text-xl font-semibold">{formatMoney(scenario.salePriceGross)}</p>
      <ul className="mt-2 space-y-1 text-sm">
        <li className="flex justify-between gap-2">
          <span className="text-[var(--ghost-text-muted)]">Costo porción</span>
          <span>{formatMoney(scenario.recipeCost)}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-[var(--ghost-text-muted)]">Food cost</span>
          <span className={isHigh ? "text-[var(--ghost-danger)]" : undefined}>
            {foodCostPct}% {isHigh ? `(meta ${targetPct}%)` : ""}
          </span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-[var(--ghost-text-muted)]">Utilidad bruta</span>
          <span>
            {formatMoney(scenario.grossProfitAmount)} ({marginPct}%)
          </span>
        </li>
      </ul>
    </div>
  );
}
