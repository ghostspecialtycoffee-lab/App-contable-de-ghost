"use client";

import Link from "next/link";
import { useState } from "react";

import { useOrganizationSetupStatus } from "@/hooks/use-organization-setup-status";
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
}

export function InitialDataImportPanel({
  compact = false,
  showGuiaLink = true,
  showInAppImport = true,
  warehouseId,
}: InitialDataImportPanelProps) {
  const membership = useActiveMembership();
  const setup = useOrganizationSetupStatus();
  const workflowUrl = getInitialDataWorkflowUrl();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const branchId = membership?.branchIds[0] ?? "";
  const canImportInApp =
    showInAppImport && Boolean(membership?.organizationId && branchId) && !setup.isSetupComplete;

  async function handleInAppImport() {
    if (!membership?.organizationId || !branchId) {
      return;
    }

    const confirmed = window.confirm(
      "¿Importar las facturas del manifiesto?\n\n" +
        "1. Crea primero tus insumos en Inventario → Insumos (nombre, g/ml por unidad).\n" +
        "2. Las líneas de factura solo entran a bodega si el nombre coincide con un insumo existente.\n" +
        "3. Se cargará la carta Ghost si ya tienes café y leche en bodega.",
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
        `Listo: ${result.invoices} facturas importadas` +
          (result.movements > 0 ? `, ${result.movements} entradas a bodega` : "") +
          (result.unlinkedLines > 0
            ? ` · ${result.unlinkedLines} líneas sin insumo vinculado (créalos en Inventario y reimporta o registra compras manualmente)`
            : "") +
          (result.ghostMenuProducts > 0 || result.ghostRecipesCreated > 0
            ? ` · carta Ghost (${result.ghostMenuProducts} bebidas, ${result.ghostRecipesCreated} fichas)`
            : result.ghostRecipesUpdated > 0
              ? ` · ${result.ghostRecipesUpdated} fichas actualizadas`
              : "") +
          ".",
      );
    } catch (cause) {
      setImportError(getCallableErrorMessage(cause));
    } finally {
      setImporting(false);
    }
  }

  if (setup.loading) {
    return (
      <Card title="Carga inicial">
        <p className="text-sm text-[var(--ghost-text-muted)]">Verificando datos…</p>
      </Card>
    );
  }

  if (setup.isSetupComplete) {
    return (
      <Card title="Datos iniciales listos">
        <p className="text-sm text-[var(--ghost-brand-500)]">
          Tu cuenta ya tiene la carga inicial: {setup.invoiceCount} facturas, {setup.itemCount}{" "}
          insumos y {setup.ghostBeverageCount} bebidas Ghost en catálogo.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/purchases">
            <Button variant="secondary" fullWidth className="sm:w-auto">
              Ver compras
            </Button>
          </Link>
          <Link href="/inventory/movements">
            <Button variant="secondary" fullWidth className="sm:w-auto">
              Ver existencias
            </Button>
          </Link>
          <Link href="/costing">
            <Button variant="secondary" fullWidth className="sm:w-auto">
              Ver costeo
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Carga inicial"
      description={
        compact
          ? "Primero define insumos en Inventario; luego importa facturas para contabilidad y bodega."
          : "Las facturas son registro contable. Los insumos (g/ml por unidad) se crean manualmente en Inventario → Insumos."
      }
    >
      {!setup.hasPurchases || !setup.hasInventory || !setup.hasGhostMenu ? (
        <ul className="mb-4 space-y-1 text-sm text-[var(--ghost-text-muted)]">
          <li className={setup.hasPurchases ? "text-[var(--ghost-brand-500)]" : ""}>
            {setup.hasPurchases ? "✓" : "○"} Compras ({setup.invoiceCount} facturas)
          </li>
          <li className={setup.hasInventory ? "text-[var(--ghost-brand-500)]" : ""}>
            {setup.hasInventory ? "✓" : "○"} Insumos ({setup.itemCount})
          </li>
          <li className={setup.hasGhostMenu ? "text-[var(--ghost-brand-500)]" : ""}>
            {setup.hasGhostMenu ? "✓" : "○"} Carta Ghost ({setup.ghostBeverageCount} bebidas)
          </li>
        </ul>
      ) : null}

      {canImportInApp ? (
        <div className="mb-4 rounded-xl border border-[var(--ghost-brand-500)] bg-[var(--ghost-surface-2)] p-4">
          <p className="text-sm font-medium">Opción rápida (desde la app)</p>
          <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
            Importa facturas históricas. Solo mueve bodega si ya creaste el insumo con el mismo nombre en
            Inventario.
          </p>
          <Button className="mt-3" fullWidth disabled={importing} onClick={handleInAppImport}>
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
          Si ya ejecutaste el workflow en GitHub y sigues viendo listas vacías, recarga la página o
          usa &quot;Cargar facturas ahora&quot; arriba (importa en tu organización activa).
        </p>
      ) : null}
    </Card>
  );
}
