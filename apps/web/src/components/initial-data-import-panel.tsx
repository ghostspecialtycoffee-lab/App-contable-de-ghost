"use client";

import Link from "next/link";

import {
  getInitialDataWorkflowUrl,
  INITIAL_DATA_IMPORT_STEPS,
} from "@/lib/import/initial-data-import";
import { Button, Card } from "@ghost/ui";

interface InitialDataImportPanelProps {
  compact?: boolean;
  showGuiaLink?: boolean;
}

export function InitialDataImportPanel({
  compact = false,
  showGuiaLink = true,
}: InitialDataImportPanelProps) {
  const workflowUrl = getInitialDataWorkflowUrl();

  return (
    <Card
      title="Carga inicial desde tus facturas"
      description={
        compact
          ? "41 facturas del manifiesto → bodega, insumos y catálogo POS."
          : "Sube el manifiesto de facturas a Firebase una sola vez. Organiza bodega (alimenticio/menaje), costos y productos de venta."
      }
    >
      <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--ghost-text-muted)]">
        {INITIAL_DATA_IMPORT_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={workflowUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors",
            "bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)] hover:bg-[var(--ghost-brand-600)]",
            compact ? "w-full sm:w-auto" : "w-full sm:w-auto",
          ].join(" ")}
        >
          Abrir workflow en GitHub
        </a>
        {showGuiaLink ? (
          <Link href="/guia#carga-inicial" className="w-full sm:w-auto">
            <Button variant="secondary" fullWidth className="sm:w-auto">
              Ver guía en la app
            </Button>
          </Link>
        ) : null}
      </div>

      {!compact ? (
        <p className="mt-3 text-xs text-[var(--ghost-text-muted)]">
          Requiere permisos en el repo y el secret configurado. La regla diaria (compras con fecha
          antigua sin bodega) no cambia; solo la primera carga usa modo bootstrap.
        </p>
      ) : null}
    </Card>
  );
}
