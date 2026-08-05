"use client";

import Link from "next/link";
import { useState } from "react";

import { getCallableErrorMessage } from "@/lib/auth/errors";
import { runBootstrapPurchaseImport } from "@/lib/import/bootstrap-purchases-client";
import {
  getInitialDataWorkflowUrl,
  INITIAL_DATA_IMPORT_STEPS,
} from "@/lib/import/initial-data-import";
import { useActiveMembership } from "@/providers/auth-provider";
import { Button, Card } from "@ghost/ui";

interface InitialDataImportPanelProps {
  compact?: boolean;
  showGuiaLink?: boolean;
  /** Si true, muestra botón para cargar el manifiesto desde la app (sin GitHub Actions). */
  showInAppImport?: boolean;
  warehouseId?: string;
  hasExistingData?: boolean;
}

export function InitialDataImportPanel({
  compact = false,
  showGuiaLink = true,
  showInAppImport = true,
  warehouseId,
  hasExistingData = false,
}: InitialDataImportPanelProps) {
  const membership = useActiveMembership();
  const workflowUrl = getInitialDataWorkflowUrl();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const branchId = membership?.branchIds[0] ?? "";
  const canImportInApp =
    showInAppImport &&
    Boolean(membership?.organizationId && branchId) &&
    !hasExistingData;

  async function handleInAppImport() {
    if (!membership?.organizationId || !branchId) {
      return;
    }

    const confirmed = window.confirm(
      "¿Cargar las 41 facturas del manifiesto? Se crearán insumos, entradas de bodega, compras confirmadas y productos POS.",
    );
    if (!confirmed) {
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const result = await runBootstrapPurchaseImport({
        organizationId: membership.organizationId,
        branchId,
        warehouseId,
      });
      setImportResult(
        `Listo: ${result.invoices} facturas, ${result.inventoryItems} insumos, ${result.movements} movimientos de bodega y ${result.menuProducts} productos POS.`,
      );
    } catch (cause) {
      setImportError(getCallableErrorMessage(cause));
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card
      title="Carga inicial desde tus facturas"
      description={
        compact
          ? "Las facturas están preparadas en el sistema pero aún no en tu cuenta — hay que importarlas una vez."
          : "Tus facturas fotografiadas están en el manifiesto del proyecto. La app de Compras lee Firebase: hasta que importes, verás la lista vacía."
      }
    >
      {hasExistingData ? (
        <p className="text-sm text-[var(--ghost-brand-500)]">
          Ya hay datos cargados. Usa Compras e Inventario para revisarlos.
        </p>
      ) : (
        <>
          {canImportInApp ? (
            <div className="mb-4 rounded-xl border border-[var(--ghost-brand-500)] bg-[var(--ghost-surface-2)] p-4">
              <p className="text-sm font-medium">Opción rápida (desde la app)</p>
              <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
                Un clic carga facturas, insumos por clase, stock en bodega y productos de venta.
              </p>
              <Button
                className="mt-3"
                fullWidth
                disabled={importing}
                onClick={handleInAppImport}
              >
                {importing ? "Importando facturas..." : "Cargar facturas ahora"}
              </Button>
              {importResult ? (
                <p className="mt-2 text-sm text-[var(--ghost-brand-500)]">{importResult}</p>
              ) : null}
              {importError ? (
                <p className="mt-2 text-sm text-[var(--ghost-danger)]">{importError}</p>
              ) : null}
            </div>
          ) : null}

          <p className="text-sm font-medium">Opción alternativa (GitHub Actions)</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-[var(--ghost-text-muted)]">
            {INITIAL_DATA_IMPORT_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={workflowUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors",
            "bg-[var(--ghost-surface-2)] text-[var(--ghost-text)] border border-[var(--ghost-border)] hover:bg-[var(--ghost-surface-3)]",
            "w-full sm:w-auto",
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
          Si no ves facturas en Compras, es porque aún no se ejecutó ninguna importación en tu
          organización de Firebase.
        </p>
      ) : null}
    </Card>
  );
}
