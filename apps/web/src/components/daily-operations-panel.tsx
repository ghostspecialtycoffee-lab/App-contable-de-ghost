"use client";

import Link from "next/link";
import { useState } from "react";

import { OperationalFlowSteps } from "@/components/operational-flow-steps";
import { useCashSession } from "@/hooks/use-cash-session";
import { useOrganizationSetupStatus } from "@/hooks/use-organization-setup-status";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { seedCostMatrix } from "@/lib/costing/seed-cost-matrix";
import { DAILY_OPERATION_FLOW, ORGANIZATION_SETUP_FLOW } from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export function DailyOperationsPanel() {
  const { session, loading: cashLoading } = useCashSession();
  const setup = useOrganizationSetupStatus();
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  async function handleSeedMenu() {
    setSeeding(true);
    setSeedMessage(null);
    setSeedError(null);

    try {
      const result = await seedCostMatrix();
      const parts = [
        result.productsCreated > 0 ? `${result.productsCreated} bebidas` : null,
        result.recipesCreated > 0 ? `${result.recipesCreated} fichas` : null,
        result.recipesUpdated > 0 ? `${result.recipesUpdated} actualizadas` : null,
      ].filter(Boolean);
      setSeedMessage(
        parts.length > 0
          ? `Carta Ghost cargada: ${parts.join(" · ")}.`
          : "Carta Ghost ya estaba cargada.",
      );
    } catch (cause) {
      setSeedError(getCallableErrorMessage(cause));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-4">
      {!setup.loading && !setup.isSetupComplete ? (
        <Card title="Configuración automática">
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Completa la carga inicial para ver compras, bodega y la carta Ghost (25 bebidas + fichas
            de costo base espresso).
          </p>
          <div className="mt-3">
            <OperationalFlowSteps
              title="Setup inicial"
              steps={ORGANIZATION_SETUP_FLOW}
              completedOrders={setup.setupCompletedSteps}
              compact
            />
          </div>
          {!setup.hasGhostMenu ? (
            <>
              <Button className="mt-4" fullWidth disabled={seeding} onClick={handleSeedMenu}>
                {seeding ? "Cargando carta Ghost…" : "Cargar carta Ghost automáticamente"}
              </Button>
              {seedMessage ? (
                <p className="mt-2 text-sm text-[var(--ghost-brand-500)]">{seedMessage}</p>
              ) : null}
              {seedError ? (
                <p className="mt-2 text-sm text-[var(--ghost-danger)]">{seedError}</p>
              ) : null}
            </>
          ) : null}
          <p className="mt-2 text-xs text-[var(--ghost-text-muted)]">
            {!setup.hasPurchases ? (
              <>
                Importa compras en{" "}
                <Link href="/purchases" className="underline">
                  Compras
                </Link>{" "}
                (botón &quot;Cargar facturas ahora&quot; o workflow GitHub).
              </>
            ) : !setup.hasGhostMenu ? (
              <>Faltan bebidas Ghost en catálogo — usa el botón de arriba o revisa Costeo.</>
            ) : (
              <>Revisa insumos en Inventario si falta stock.</>
            )}
          </p>
        </Card>
      ) : null}

      {!setup.loading && setup.isSetupComplete ? (
        <Card title="Sistema listo">
          <p className="text-sm text-[var(--ghost-brand-500)]">
            Carga inicial completa: {setup.invoiceCount} facturas, {setup.itemCount} insumos,{" "}
            {setup.ghostBeverageCount} bebidas Ghost.
          </p>
          <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
            Abre caja y empieza a cobrar en mostrador o mesas.
          </p>
        </Card>
      ) : null}

      <Card title="Flujo del día">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <StatusPill
            label="Datos"
            ok={setup.isSetupComplete}
            loading={setup.loading}
            okText="Listos"
            pendingText="Pendiente"
            href="/purchases"
          />
          <StatusPill
            label="Caja"
            ok={Boolean(session)}
            loading={cashLoading}
            okText="Abierta"
            pendingText="Sin abrir"
            href="/cash"
          />
          <StatusPill
            label="Carta"
            ok={setup.hasGhostMenu}
            loading={setup.loading}
            okText={`${setup.ghostBeverageCount} bebidas`}
            pendingText="Pendiente"
            href="/pos/menu"
          />
        </div>
        <OperationalFlowSteps title="Jornada" steps={DAILY_OPERATION_FLOW} compact />
        {!session && !cashLoading ? (
          <Link href="/cash" className="mt-4 inline-block">
            <Button fullWidth>Abrir caja para empezar</Button>
          </Link>
        ) : null}
      </Card>
    </div>
  );
}

function StatusPill({
  label,
  ok,
  loading,
  okText,
  pendingText,
  href,
}: {
  label: string;
  ok: boolean;
  loading: boolean;
  okText: string;
  pendingText: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 transition hover:bg-[var(--ghost-surface-2)]",
        ok ? "border-[var(--ghost-brand-500)]" : "border-[var(--ghost-border)]",
      ].join(" ")}
    >
      <span className="text-[var(--ghost-text-muted)]">{label}</span>
      <span className={ok ? "text-[var(--ghost-brand-500)]" : ""}>
        {loading ? "…" : ok ? okText : pendingText}
      </span>
    </Link>
  );
}
