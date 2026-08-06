"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { useDiningTables } from "@/hooks/use-dining-tables";
import { useTableSessions } from "@/hooks/use-table-sessions";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { buildTableQrUrl, createDiningTable, syncTableQrLookupsClient } from "@/lib/tables/tables";
import { cancelTableSession, clearWaiterAlert } from "@/lib/tables/table-sessions";
import { TableServiceProcessLine } from "@/components/table-service-process";
import { SalesAccessButtons } from "@/components/sales-access-buttons";
import { useSalesPaths } from "@/hooks/use-sales-paths";
import {
  activeSessionLines,
  DINING_TABLE_STATUS_LABELS,
  TABLE_SESSION_STATUS_LABELS,
} from "@ghost/domain";
import { formatDateTime } from "@/lib/format";
import { Button, Card } from "@ghost/ui";

function PosTablesContent() {
  const router = useRouter();
  const { path } = useSalesPaths();
  const searchParams = useSearchParams();
  const paidSaleNumber = searchParams.get("paid");
  const { tables, loading, error } = useDiningTables();
  const { sessions } = useTableSessions({ openOnly: true });
  const { sessions: allSessions } = useTableSessions();
  const [tableNumber, setTableNumber] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);
  const [clearingWaiterSessionId, setClearingWaiterSessionId] = useState<string | null>(null);
  const syncedLookupRef = useRef<string | null>(null);

  useEffect(() => {
    if (tables.length === 0 || loading) {
      return;
    }

    const signature = tables.map((table) => `${table.id}:${table.status}`).join("|");
    if (syncedLookupRef.current === signature) {
      return;
    }

    syncedLookupRef.current = signature;
    void syncTableQrLookupsClient(tables).catch(() => {
      syncedLookupRef.current = null;
    });
  }, [loading, tables]);

  const sessionByTableId = useMemo(() => {
    const map = new Map<string, (typeof sessions)[number]>();
    for (const session of sessions) {
      map.set(session.tableId, session);
    }
    return map;
  }, [sessions]);

  const recentHistory = useMemo(() => {
    return allSessions
      .filter((session) => session.status === "closed" || session.status === "cancelled")
      .sort(
        (left, right) =>
          new Date(right.closedAt ?? right.openedAt).getTime() -
          new Date(left.closedAt ?? left.openedAt).getTime(),
      )
      .slice(0, 8);
  }, [allSessions]);

  async function handleCloseSession(sessionId: string) {
    const message =
      "¿Cerrar la cuenta y liberar la mesa? Queda registrada en historial sin generar venta.";
    if (!window.confirm(message)) {
      return;
    }

    setClosingSessionId(sessionId);
    setSubmitError(null);

    try {
      await cancelTableSession({ sessionId });
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setClosingSessionId(null);
    }
  }

  async function handleClearWaiterAlert(sessionId: string) {
    setClearingWaiterSessionId(sessionId);
    setSubmitError(null);

    try {
      await clearWaiterAlert({ sessionId });
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setClearingWaiterSessionId(null);
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const result = await createDiningTable({
        number: Number(tableNumber),
        label: tableLabel.trim() || undefined,
      });
      setTableNumber("");
      setTableLabel("");
      router.push(`${path("tables")}/session?id=${result.tableId}`);
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--ghost-text-muted)]">
            <Link href={path("counter")} className="underline">
              Mostrador
            </Link>
          </p>
          <h1 className="text-2xl font-semibold">Mesas</h1>
          <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
            Mesa → Cuenta → Pedido (QR o staff) → Comanda → Cobro → Registros
          </p>
          <div className="mt-3">
            <TableServiceProcessLine currentStep="mesa" />
          </div>
        </div>
      </div>

      <SalesAccessButtons compact />

      {paidSaleNumber ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--ghost-brand-500)] bg-[var(--ghost-surface-1)] px-4 py-3 text-sm">
            Cuenta cobrada · comprobante{" "}
            <span className="font-mono font-medium">{paidSaleNumber}</span> registrado en{" "}
            <Link href={path("records")} className="underline">
              Registros
            </Link>
          </div>
          <TableServiceProcessLine currentStep="registro" compact />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Card title="Nueva mesa">
          <form className="space-y-3" onSubmit={handleCreate}>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Número</span>
              <input
                required
                type="number"
                min="1"
                value={tableNumber}
                onChange={(event) => setTableNumber(event.target.value)}
                className="ghost-input"
                placeholder="1, 2, 3..."
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Etiqueta (opcional)</span>
              <input
                value={tableLabel}
                onChange={(event) => setTableLabel(event.target.value)}
                className="ghost-input"
                placeholder="Terraza, Barra..."
              />
            </label>
            {submitError ? (
              <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
            ) : null}
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? "Creando..." : "Crear mesa y abrir cuenta"}
            </Button>
          </form>
        </Card>

        <Card title="Mesas">
          {loading ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">Cargando...</p>
          ) : error ? (
            <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
          ) : tables.length === 0 ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">
              Crea la primera mesa para generar códigos QR.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tables.map((table) => {
                const session = sessionByTableId.get(table.id);
                const qrUrl = buildTableQrUrl(table.organizationId, table.qrToken);
                return (
                  <div
                    key={table.id}
                    className="rounded-xl border border-[var(--ghost-border)] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-semibold">Mesa {table.number}</p>
                        {table.label ? (
                          <p className="text-sm text-[var(--ghost-text-muted)]">{table.label}</p>
                        ) : null}
                      </div>
                      <span className="text-xs uppercase text-[var(--ghost-text-muted)]">
                        {DINING_TABLE_STATUS_LABELS[table.status]}
                      </span>
                    </div>

                    {session ? (
                      <p className="mt-2 text-sm text-[var(--ghost-brand-500)]">
                        {TABLE_SESSION_STATUS_LABELS[session.status]} ·{" "}
                        {activeSessionLines(session.lines).length} ítem(s)
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--ghost-text-muted)]">Sin cuenta abierta</p>
                    )}

                    {session?.waiterRequestedAt ? (
                      <div className="mt-2 rounded-lg border border-[var(--ghost-brand-500)] bg-[var(--ghost-surface-2)] px-3 py-2 text-sm">
                        <p className="font-medium text-[var(--ghost-brand-500)]">Cliente pide mesero</p>
                        <Button
                          fullWidth
                          size="sm"
                          className="mt-2"
                          disabled={clearingWaiterSessionId === session.id}
                          onClick={() => handleClearWaiterAlert(session.id)}
                        >
                          {clearingWaiterSessionId === session.id ? "Marcando..." : "Atendido"}
                        </Button>
                      </div>
                    ) : null}

                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUrl)}`}
                      alt={`QR mesa ${table.number}`}
                      className="mx-auto my-3 rounded-lg border border-[var(--ghost-border)] bg-white p-2"
                    />

                    <p className="break-all text-[10px] text-[var(--ghost-text-muted)]">{qrUrl}</p>

                    <Link href={`${path("tables")}/session?id=${table.id}`} className="mt-3 block">
                      <Button fullWidth variant={session ? "primary" : "secondary"}>
                        {session ? "Ver cuenta" : "Abrir cuenta"}
                      </Button>
                    </Link>
                    {session ? (
                      <Button
                        fullWidth
                        variant="secondary"
                        className="mt-2"
                        disabled={closingSessionId === session.id}
                        onClick={() => handleCloseSession(session.id)}
                      >
                        {closingSessionId === session.id ? "Cerrando..." : "Cerrar mesa"}
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {recentHistory.length > 0 ? (
        <Card title="Historial reciente">
          <ul className="divide-y divide-[var(--ghost-border)] text-sm">
            {recentHistory.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium">
                    Mesa {session.tableNumber}
                    {session.tableLabel ? ` · ${session.tableLabel}` : ""}
                  </p>
                  <p className="text-[var(--ghost-text-muted)]">
                    {TABLE_SESSION_STATUS_LABELS[session.status]}
                    {" · "}
                    {formatDateTime(session.closedAt ?? session.openedAt)}
                  </p>
                </div>
                {session.saleId ? (
                  <Link href="/billing" className="text-xs underline">
                    Ver venta
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

export default function PosTablesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--ghost-text-muted)]">Cargando...</p>}>
      <PosTablesContent />
    </Suspense>
  );
}
