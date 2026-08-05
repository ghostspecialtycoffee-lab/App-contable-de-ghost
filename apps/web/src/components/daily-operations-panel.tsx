"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { OperationalFlowSteps } from "@/components/operational-flow-steps";
import { useCashSession } from "@/hooks/use-cash-session";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { isCatalogBeverage, normalizeCatalogName } from "@/lib/costing/ghost-menu-catalog";
import { seedCostMatrix } from "@/lib/costing/seed-cost-matrix";
import { DAILY_OPERATION_FLOW, ORGANIZATION_SETUP_FLOW } from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export function DailyOperationsPanel() {
  const { session, loading: cashLoading } = useCashSession();
  const { products, loading: productsLoading } = useMenuProducts();
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const hasGhostMenu = useMemo(
    () => products.some((product) => normalizeCatalogName(product.name) === "espresso"),
    [products],
  );

  const setupComplete = products.length > 0 && hasGhostMenu;

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
      {!setupComplete && !productsLoading ? (
        <Card title="Configuración automática">
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Carga las 25 bebidas del menú Ghost (foto Drive) con fichas de costo base espresso:
            18 g café Black Coffee + 40 ml agua.
          </p>
          <div className="mt-3">
            <OperationalFlowSteps title="Setup inicial" steps={ORGANIZATION_SETUP_FLOW} compact />
          </div>
          <Button className="mt-4" fullWidth disabled={seeding} onClick={handleSeedMenu}>
            {seeding ? "Cargando carta Ghost…" : "Cargar carta Ghost automáticamente"}
          </Button>
          {seedMessage ? (
            <p className="mt-2 text-sm text-[var(--ghost-brand-500)]">{seedMessage}</p>
          ) : null}
          {seedError ? (
            <p className="mt-2 text-sm text-[var(--ghost-danger)]">{seedError}</p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--ghost-text-muted)]">
            Si aún no importaste compras, hazlo primero en{" "}
            <Link href="/purchases" className="underline">
              Compras
            </Link>
            .
          </p>
        </Card>
      ) : null}

      <Card title="Flujo del día">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
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
            ok={hasGhostMenu}
            loading={productsLoading}
            okText={`${products.filter((p) => isCatalogBeverage(p.name)).length} bebidas`}
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
