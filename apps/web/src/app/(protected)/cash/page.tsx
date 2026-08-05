"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useCashSession, useCashSessionSales } from "@/hooks/use-cash-session";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import {
  closeCashSession,
  openCashSession,
  registerCashMovement,
} from "@/lib/cash/cash";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_TYPE_LABELS,
  calculateCashSessionBalance,
  type CashMovementType,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function CashPage() {
  const { session, movements, loading, error } = useCashSession();
  const { cashSalesTotal, loading: salesLoading } = useCashSessionSales(session?.id ?? null);

  const [openingAmount, setOpeningAmount] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [movementType, setMovementType] = useState<CashMovementType>("inflow");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementReference, setMovementReference] = useState("");
  const [countedAmount, setCountedAmount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const balance = useMemo(() => {
    if (!session) {
      return null;
    }

    return calculateCashSessionBalance({
      openingAmount: session.openingAmount,
      cashSalesTotal,
      movements: movements.map((movement) => ({
        type: movement.type,
        amount: movement.amount,
      })),
    });
  }, [session, cashSalesTotal, movements]);

  async function handleOpen(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitMessage(null);
    setSubmitting(true);

    try {
      await openCashSession({
        openingAmount: Number(openingAmount),
        openingNotes: openingNotes || undefined,
      });
      setOpeningAmount("");
      setOpeningNotes("");
      setSubmitMessage("Caja abierta. Ya puedes cobrar en mostrador y mesas.");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setSubmitError(null);
    setSubmitMessage(null);
    setSubmitting(true);

    try {
      await registerCashMovement({
        sessionId: session.id,
        type: movementType,
        amount: Number(movementAmount),
        reason: movementReason,
        reference: movementReference || undefined,
      });
      setMovementAmount("");
      setMovementReason("");
      setMovementReference("");
      setSubmitMessage(`${CASH_MOVEMENT_TYPE_LABELS[movementType]} registrada.`);
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !balance) {
      return;
    }

    setSubmitError(null);
    setSubmitMessage(null);
    setSubmitting(true);

    try {
      await closeCashSession({
        sessionId: session.id,
        countedAmount: Number(countedAmount),
        expectedAmount: balance.expectedAmount,
        closingNotes: closingNotes || undefined,
      });
      setCountedAmount("");
      setClosingNotes("");
      setSubmitMessage("Caja cerrada. Abre una nueva sesión mañana para iniciar desde cero.");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  const countedValue = Number(countedAmount) || 0;
  const closeDifference =
    balance && countedAmount ? countedValue - balance.expectedAmount : null;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/ventas" className="underline">
            Ventas
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Caja</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Abre el día con el fondo en efectivo, registra movimientos y cierra con arqueo.
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--ghost-danger)]">{error}</p> : null}
      {submitError ? <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p> : null}
      {submitMessage ? (
        <p className="text-sm text-[var(--ghost-brand-500)]">{submitMessage}</p>
      ) : null}

      {loading ? (
        <Card title="Caja">
          <p className="text-sm text-[var(--ghost-text-muted)]">Cargando…</p>
        </Card>
      ) : !session ? (
        <Card title="Apertura de caja">
          <form className="space-y-4" onSubmit={handleOpen}>
            <p className="text-sm text-[var(--ghost-text-muted)]">
              Registra cuánto efectivo hay en caja al iniciar la jornada. Sin esto no se puede
              cobrar en mostrador ni mesas.
            </p>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Fondo inicial (COP)</span>
              <input
                required
                type="number"
                min="0"
                step="1000"
                value={openingAmount}
                onChange={(event) => setOpeningAmount(event.target.value)}
                className="ghost-input"
                placeholder="Ej. 150000"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Notas (opcional)</span>
              <input
                type="text"
                value={openingNotes}
                onChange={(event) => setOpeningNotes(event.target.value)}
                className="ghost-input"
                placeholder="Ej. billetes de apertura"
              />
            </label>
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? "Abriendo caja…" : "Abrir caja"}
            </Button>
          </form>
        </Card>
      ) : (
        <>
          <section className="ghost-stat-grid sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Fondo inicial" value={formatMoney(session.openingAmount)} />
            <Stat
              label="Ventas efectivo"
              value={salesLoading ? "—" : formatMoney(balance?.cashSalesTotal ?? 0)}
            />
            <Stat
              label="Esperado en caja"
              value={balance ? formatMoney(balance.expectedAmount) : "—"}
            />
            <Stat
              label="Préstamos pendientes"
              value={balance ? formatMoney(balance.loansOutstanding) : "—"}
            />
          </section>

          <Card title={`Sesión abierta · ${session.sessionDate}`}>
            <p className="text-sm text-[var(--ghost-text-muted)]">
              Abierta {formatDateTime(session.openedAt)}
              {session.openingNotes ? ` · ${session.openingNotes}` : ""}
            </p>
            {balance ? (
              <ul className="mt-3 space-y-1 text-sm text-[var(--ghost-text-muted)]">
                <li>Entradas: {formatMoney(balance.inflowsTotal)}</li>
                <li>Salidas: {formatMoney(balance.outflowsTotal)}</li>
                <li>Préstamos: {formatMoney(balance.loansTotal)}</li>
                <li>Devoluciones préstamo: {formatMoney(balance.loanRepaymentsTotal)}</li>
              </ul>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/pos">
                <Button variant="secondary">Mostrador</Button>
              </Link>
              <Link href="/pos/tables">
                <Button variant="secondary">Mesas</Button>
              </Link>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Registrar movimiento">
              <form className="space-y-3" onSubmit={handleMovement}>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Tipo</span>
                  <select
                    value={movementType}
                    onChange={(event) =>
                      setMovementType(event.target.value as CashMovementType)
                    }
                    className="ghost-input"
                  >
                    {CASH_MOVEMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {CASH_MOVEMENT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Monto (COP)</span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="100"
                    value={movementAmount}
                    onChange={(event) => setMovementAmount(event.target.value)}
                    className="ghost-input"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Motivo</span>
                  <input
                    required
                    type="text"
                    value={movementReason}
                    onChange={(event) => setMovementReason(event.target.value)}
                    className="ghost-input"
                    placeholder="Ej. cambio de billetes, compra menor, préstamo a barista"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Referencia (opcional)</span>
                  <input
                    type="text"
                    value={movementReference}
                    onChange={(event) => setMovementReference(event.target.value)}
                    className="ghost-input"
                    placeholder="Nombre, factura, etc."
                  />
                </label>
                <Button type="submit" fullWidth disabled={submitting}>
                  {submitting ? "Guardando…" : "Registrar movimiento"}
                </Button>
              </form>
            </Card>

            <Card title="Movimientos del día">
              {movements.length === 0 ? (
                <p className="text-sm text-[var(--ghost-text-muted)]">
                  Aún no hay entradas, salidas ni préstamos registrados.
                </p>
              ) : (
                <ul className="space-y-2">
                  {movements.map((movement) => (
                    <li
                      key={movement.id}
                      className="rounded-lg border border-[var(--ghost-border)] px-3 py-2 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {CASH_MOVEMENT_TYPE_LABELS[movement.type]}
                          </p>
                          <p className="text-[var(--ghost-text-muted)]">{movement.reason}</p>
                          {movement.reference ? (
                            <p className="text-xs text-[var(--ghost-text-muted)]">
                              {movement.reference}
                            </p>
                          ) : null}
                        </div>
                        <p className="font-semibold">{formatMoney(movement.amount)}</p>
                      </div>
                      <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">
                        {formatDateTime(movement.occurredAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Cierre de caja">
            <form className="space-y-4" onSubmit={handleClose}>
              <p className="text-sm text-[var(--ghost-text-muted)]">
                Cuenta el efectivo físico en caja y compáralo con el saldo esperado del sistema.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--ghost-border)] p-3">
                  <p className="text-xs uppercase text-[var(--ghost-text-muted)]">Esperado</p>
                  <p className="mt-1 text-lg font-semibold">
                    {balance ? formatMoney(balance.expectedAmount) : "—"}
                  </p>
                </div>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Contado en caja (COP)</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1000"
                    value={countedAmount}
                    onChange={(event) => setCountedAmount(event.target.value)}
                    className="ghost-input"
                  />
                </label>
              </div>
              {closeDifference !== null ? (
                <p
                  className={`text-sm ${
                    closeDifference === 0
                      ? "text-[var(--ghost-brand-500)]"
                      : "text-[var(--ghost-danger)]"
                  }`}
                >
                  Diferencia: {formatMoney(closeDifference)}
                  {closeDifference === 0 ? " · cuadra" : closeDifference > 0 ? " · sobrante" : " · faltante"}
                </p>
              ) : null}
              <label className="block space-y-1">
                <span className="text-sm font-medium">Notas de cierre (opcional)</span>
                <input
                  type="text"
                  value={closingNotes}
                  onChange={(event) => setClosingNotes(event.target.value)}
                  className="ghost-input"
                />
              </label>
              <Button type="submit" variant="secondary" fullWidth disabled={submitting}>
                {submitting ? "Cerrando caja…" : "Cerrar caja"}
              </Button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ghost-stat">
      <p className="ghost-stat-label">{label}</p>
      <p className="ghost-stat-value">{value}</p>
    </div>
  );
}
