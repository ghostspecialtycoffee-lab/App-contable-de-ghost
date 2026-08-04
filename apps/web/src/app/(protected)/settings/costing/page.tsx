"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getCallableErrorMessage } from "@/lib/auth/errors";
import { updateOrganizationCostMatrixSettings } from "@/lib/organizations/organization-cost-matrix";
import { useAuth } from "@/providers/auth-provider";
import {
  CO_COST_MATRIX_DEFAULTS,
  resolveCostMatrixSettings,
  type OrganizationCostMatrixSettings,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

function toPercentInput(value: number): string {
  return String(Math.round(value * 1000) / 10);
}

function fromPercentInput(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed / 100;
}

function emptySettings(): OrganizationCostMatrixSettings {
  return resolveCostMatrixSettings();
}

export default function CostMatrixSettingsPage() {
  const { organization, refreshOrganization } = useAuth();
  const [settings, setSettings] = useState<OrganizationCostMatrixSettings>(emptySettings);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setSettings(resolveCostMatrixSettings(organization?.costMatrixSettings));
  }, [organization?.costMatrixSettings]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization?.id) {
      return;
    }

    setSubmitError(null);
    setSaveMessage(null);
    setSubmitting(true);

    try {
      await updateOrganizationCostMatrixSettings({
        organizationId: organization.id,
        costMatrixSettings: settings,
      });
      await refreshOrganization();
      setSaveMessage("Parámetros guardados. Las fichas de costeo usarán estas metas.");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetDefaults() {
    setSettings(resolveCostMatrixSettings(CO_COST_MATRIX_DEFAULTS));
    setSaveMessage(null);
    setSubmitError(null);
  }

  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/costing" className="underline">
            Costeo
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Parámetros de matriz de costos</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Metas de food cost, bebidas y retenciones de referencia para Colombia. Se aplican en
          fichas de costeo y vista previa del catálogo.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card title="Metas y retenciones">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Meta food cost — alimentos (%)</span>
                <input
                  required
                  type="number"
                  min="5"
                  max="90"
                  step="0.1"
                  value={toPercentInput(settings.targetFoodCostPct)}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      targetFoodCostPct: fromPercentInput(event.target.value),
                    }))
                  }
                  className="ghost-input"
                />
                <span className="text-xs text-[var(--ghost-text-muted)]">
                  Porcentaje máximo de costo de receta sobre precio de venta (comida).
                </span>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Meta food cost — bebidas (%)</span>
                <input
                  required
                  type="number"
                  min="5"
                  max="90"
                  step="0.1"
                  value={toPercentInput(settings.targetBeverageCostPct)}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      targetBeverageCostPct: fromPercentInput(event.target.value),
                    }))
                  }
                  className="ghost-input"
                />
                <span className="text-xs text-[var(--ghost-text-muted)]">
                  Meta para categoría bebidas en el catálogo.
                </span>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">ReteIVA referencia (%)</span>
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={toPercentInput(settings.reteIvaPct)}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      reteIvaPct: fromPercentInput(event.target.value),
                    }))
                  }
                  className="ghost-input"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Retefuente bienes (%)</span>
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={toPercentInput(settings.reteFuenteGoodsPct)}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      reteFuenteGoodsPct: fromPercentInput(event.target.value),
                    }))
                  }
                  className="ghost-input"
                />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium">Retefuente servicios (%)</span>
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={toPercentInput(settings.reteFuenteServicesPct)}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      reteFuenteServicesPct: fromPercentInput(event.target.value),
                    }))
                  }
                  className="ghost-input"
                />
              </label>
            </div>

            {submitError ? (
              <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
            ) : null}
            {saveMessage ? (
              <p className="text-sm text-[var(--ghost-brand-500)]">{saveMessage}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando..." : "Guardar parámetros"}
              </Button>
              <Button type="button" variant="secondary" onClick={handleResetDefaults}>
                Restaurar valores Colombia
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Cómo se usan">
          <ul className="space-y-2 text-sm text-[var(--ghost-text-muted)]">
            <li>
              <strong className="text-[var(--ghost-text)]">Precio sugerido</strong> en cada ficha
              según costo de receta y meta de food cost.
            </li>
            <li>
              <strong className="text-[var(--ghost-text)]">Retenciones</strong> son referencia
              operativa en la matriz, no reemplazan contabilidad formal.
            </li>
            <li>
              Los costos de insumos vienen de{" "}
              <Link href="/purchases" className="underline">
                Compras
              </Link>{" "}
              confirmadas.
            </li>
          </ul>
          <Link href="/costing" className="mt-4 inline-block text-sm underline">
            Ir a fichas de costeo
          </Link>
        </Card>
      </div>
    </div>
  );
}
