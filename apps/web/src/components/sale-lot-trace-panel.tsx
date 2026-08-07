"use client";

import { LEGACY_LOT_CODE, type Sale } from "@ghost/domain";

import { formatMoney } from "@/lib/format";

interface SaleLotTracePanelProps {
  sale: Sale;
}

export function SaleLotTracePanel({ sale }: SaleLotTracePanelProps) {
  const consumptions = sale.lotConsumptions ?? [];

  if (consumptions.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-2)] p-3 text-sm text-[var(--ghost-text-muted)]">
        Sin trazabilidad de lotes registrada en esta venta (stock previo o sin receta).
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Trazabilidad lote → venta</p>
      <ul className="space-y-2">
        {consumptions.map((entry, index) => (
          <li
            key={`${entry.inventoryItemId}-${entry.lotCode}-${index}`}
            className="rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-2)] px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{entry.itemName}</span>
              <span className="font-mono text-xs text-[var(--ghost-text-muted)]">
                {entry.lotCode === LEGACY_LOT_CODE ? "Sin lote" : entry.lotCode}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">
              {entry.quantity.toLocaleString("es-CO")} uds
              {entry.unitCost > 0 ? ` · costo ${formatMoney(entry.unitCost)}/ud` : ""}
              {entry.sourceReference ? ` · compra ${entry.sourceReference}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
