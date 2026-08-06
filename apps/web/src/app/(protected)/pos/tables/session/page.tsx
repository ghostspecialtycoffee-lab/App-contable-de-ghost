"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { useDiningTables } from "@/hooks/use-dining-tables";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { useTableSessions } from "@/hooks/use-table-sessions";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { formatMoney } from "@/lib/format";
import { CashSessionGate } from "@/components/cash-session-gate";
import { TableServiceProcessLine, type TableServiceStepId } from "@/components/table-service-process";
import {
  activeSessionLines,
  calculateSaleTotals,
  inferMenuProductTaxCategory,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  sessionLinesToSaleInputs,
  TABLE_SESSION_LINE_STATUS_LABELS,
  TABLE_SESSION_STATUS_LABELS,
  type PaymentMethod,
} from "@ghost/domain";
import {
  addTableSessionLines,
  cancelTableSession,
  checkoutTableSession,
  clearWaiterAlert,
  openTableSession,
  sendTableSessionToKitchen,
} from "@/lib/tables/table-sessions";
import { useSalesPaths } from "@/hooks/use-sales-paths";
import { Button, Card } from "@ghost/ui";

function TableSessionContent() {
  const router = useRouter();
  const { path, inSalesExtension } = useSalesPaths();
  const searchParams = useSearchParams();
  const tableId = searchParams.get("id") ?? "";
  const { tables, loading: tablesLoading } = useDiningTables();
  const { products } = useMenuProducts();
  const { sessions, loading: sessionsLoading } = useTableSessions({ openOnly: true });
  const [opening, setOpening] = useState(false);
  const [accountOpenedNotice, setAccountOpenedNotice] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const table = tables.find((entry) => entry.id === tableId);
  const session = sessions.find((entry) => entry.tableId === tableId);

  useEffect(() => {
    if (!table || session || opening || sessionsLoading) {
      return;
    }

    setOpening(true);
    openTableSession({
      organizationId: table.organizationId,
      branchId: table.branchId,
      tableId: table.id,
      tableNumber: table.number,
      tableLabel: table.label,
      guestToken: table.qrToken,
    })
      .then(() => setAccountOpenedNotice(true))
      .catch((cause) => setSubmitError(getCallableErrorMessage(cause)))
      .finally(() => setOpening(false));
  }, [table, session, opening, sessionsLoading]);

  const totals = useMemo(() => {
    if (!session) {
      return null;
    }
    return calculateSaleTotals(sessionLinesToSaleInputs(activeSessionLines(session.lines)));
  }, [session]);

  const activeLines = useMemo(
    () => (session ? activeSessionLines(session.lines) : []),
    [session],
  );

  const pendingKitchenCount = useMemo(
    () => activeLines.filter((line) => line.status === "pending").length,
    [activeLines],
  );

  const canAddItems = session?.status === "open";

  const processStep = useMemo((): TableServiceStepId => {
    if (!session) {
      return "cuenta";
    }
    if (session.status === "requested_bill") {
      return "cobro";
    }
    if (pendingKitchenCount > 0) {
      return "comanda";
    }
    if (activeLines.length > 0) {
      return "pedido";
    }
    return "cuenta";
  }, [session, pendingKitchenCount, activeLines.length]);

  async function handleAddProduct(product: (typeof products)[number]) {
    if (!table || !session || !canAddItems) {
      return;
    }

    setSubmitError(null);
    setSuccess(null);

    try {
      await addTableSessionLines({
        organizationId: table.organizationId,
        sessionId: session.id,
        guestToken: table.qrToken,
        lines: [
          {
            productId: product.id,
            name: product.name,
            unitPrice: product.price,
            quantity: 1,
            station: product.station,
            saleTaxCategory:
              product.saleTaxCategory ??
              inferMenuProductTaxCategory({ name: product.name, category: product.category }),
            source: "staff",
          },
        ],
      });
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    }
  }

  async function handleSendKitchen() {
    if (!session) {
      return;
    }

    setWorking(true);
    setSubmitError(null);

    try {
      const result = await sendTableSessionToKitchen({ sessionId: session.id });
      setSuccess(`${result.kitchenOrderIds.length} comanda(s) enviadas.`);
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  async function handleCheckout() {
    if (!session) {
      return;
    }

    if (
      pendingKitchenCount > 0 &&
      !window.confirm(
        `Hay ${pendingKitchenCount} ítem(s) sin enviar a comanda. ¿Cobrar la cuenta igual?`,
      )
    ) {
      return;
    }

    setWorking(true);
    setSubmitError(null);

    try {
      const result = await checkoutTableSession({
        sessionId: session.id,
        paymentMethod,
      });
      setSuccess(`Cuenta cobrada · ${result.saleNumber} · ${formatMoney(result.total)}`);
      router.push(`${path("tables")}?paid=${encodeURIComponent(result.saleNumber)}`);
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  async function handleCancelSession() {
    if (!session) {
      return;
    }

    const hasItems = activeLines.length > 0;
    const message = hasItems
      ? "¿Cerrar la cuenta sin cobrar? La mesa quedará libre y el detalle se guarda en historial."
      : "¿Cerrar la cuenta vacía? La mesa quedará libre.";

    if (!window.confirm(message)) {
      return;
    }

    setWorking(true);
    setSubmitError(null);

    try {
      await cancelTableSession({ sessionId: session.id });
      router.push(path("tables"));
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  if (!tableId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--ghost-danger)]">Mesa no indicada.</p>
        <Link href={path("tables")} className="underline">
          Volver a mesas
        </Link>
      </div>
    );
  }

  if (tablesLoading) {
    return <p className="text-sm text-[var(--ghost-text-muted)]">Cargando mesa...</p>;
  }

  if (!table) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--ghost-danger)]">Mesa no encontrada.</p>
        <Link href={path("tables")} className="underline">
          Volver a mesas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href={path("counter")} className="underline">
            Mostrador
          </Link>
          {" · "}
          <Link href={path("tables")} className="underline">
            Mesas
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">
          Mesa {table.number}
          {table.label ? ` · ${table.label}` : ""}
        </h1>
        {!inSalesExtension ? (
          <div className="mt-2">
            <Link href="/pos/menu#nuevo-producto">
              <Button size="sm" variant="secondary">
                Crear producto
              </Button>
            </Link>
          </div>
        ) : null}
        {session ? (
          <p className="mt-1 text-sm text-[var(--ghost-brand-500)]">
            {TABLE_SESSION_STATUS_LABELS[session.status]}
          </p>
        ) : null}
        {session?.waiterRequestedAt ? (
          <div className="mt-3 rounded-xl border border-[var(--ghost-brand-500)] bg-[var(--ghost-surface-2)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--ghost-brand-500)]">
              El cliente pidió mesero
            </p>
            <Button
              size="sm"
              className="mt-2"
              disabled={working}
              onClick={async () => {
                setWorking(true);
                setSubmitError(null);
                try {
                  await clearWaiterAlert({ sessionId: session.id });
                  setSuccess("Alerta de mesero atendida.");
                } catch (cause) {
                  setSubmitError(getCallableErrorMessage(cause));
                } finally {
                  setWorking(false);
                }
              }}
            >
              Marcar atendido
            </Button>
          </div>
        ) : null}
        <div className="mt-3">
          <TableServiceProcessLine currentStep={processStep} compact />
        </div>
        {accountOpenedNotice && session ? (
          <p className="mt-2 text-sm text-[var(--ghost-brand-500)]">
            Cuenta abierta para Mesa {table.number}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card title="Agregar del catálogo">
          {!canAddItems && session ? (
            <p className="mb-3 text-sm text-[var(--ghost-brand-500)]">
              Cuenta solicitada — solo queda cobrar.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                disabled={!canAddItems}
                onClick={() => handleAddProduct(product)}
                className={[
                  "rounded-xl border border-[var(--ghost-border)] p-3 text-left",
                  canAddItems
                    ? "hover:border-[var(--ghost-brand-500)]"
                    : "cursor-not-allowed opacity-50",
                ].join(" ")}
              >
                {product.imageDataUrl ? (
                  <img
                    src={product.imageDataUrl}
                    alt={product.name}
                    className="mb-2 h-20 w-full rounded-lg object-cover"
                  />
                ) : null}
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-[var(--ghost-brand-500)]">{formatMoney(product.price)}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Cuenta de mesa">
          {!session ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">
              {opening ? "Abriendo cuenta..." : "Preparando cuenta..."}
            </p>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-2 text-sm">
                {activeLines.map((line) => (
                  <li
                    key={line.id}
                    className="flex justify-between gap-2 border-b border-[var(--ghost-border)] pb-2"
                  >
                    <span>
                      {line.quantity} x {line.name}
                      <span className="ml-1 text-xs text-[var(--ghost-text-muted)]">
                        ({TABLE_SESSION_LINE_STATUS_LABELS[line.status]})
                      </span>
                    </span>
                    <span>{formatMoney(line.unitPrice * line.quantity)}</span>
                  </li>
                ))}
              </ul>

              {activeLines.length === 0 ? (
                <p className="text-sm text-[var(--ghost-text-muted)]">
                  Sin ítems. El cliente puede pedir por QR o agrega del catálogo.
                </p>
              ) : null}

              {totals ? (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Base gravable</span>
                    <span>{formatMoney(totals.subtotal)}</span>
                  </div>
                  {totals.taxBreakdown.map((entry) => (
                    <div
                      key={entry.category}
                      className="flex justify-between text-[var(--ghost-text-muted)]"
                    >
                      <span>{entry.label}</span>
                      <span>{formatMoney(entry.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatMoney(totals.total)}</span>
                  </div>
                </div>
              ) : null}

              <Button
                fullWidth
                variant="secondary"
                disabled={working || pendingKitchenCount === 0}
                onClick={handleSendKitchen}
              >
                Enviar comanda (barra/cocina)
                {pendingKitchenCount > 0 ? ` · ${pendingKitchenCount}` : ""}
              </Button>

              <p className="text-xs text-[var(--ghost-text-muted)]">
                Los pedidos del QR quedan pendientes hasta enviar comanda.
              </p>

              <CashSessionGate>
                <>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Medio de pago</span>
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                      className="ghost-input"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {PAYMENT_METHOD_LABELS[method]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Button fullWidth disabled={working || activeLines.length === 0} onClick={handleCheckout}>
                    Cobrar cuenta
                  </Button>
                </>
              </CashSessionGate>

              <Button
                fullWidth
                variant="secondary"
                disabled={working}
                onClick={handleCancelSession}
              >
                Cerrar mesa
              </Button>
              <p className="text-xs text-[var(--ghost-text-muted)]">
                Libera la mesa sin venta. La cuenta queda en historial.
              </p>

              {submitError ? (
                <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
              ) : null}
              {success ? (
                <p className="text-sm text-[var(--ghost-brand-500)]">{success}</p>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function TableSessionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--ghost-text-muted)]">Cargando...</p>}>
      <TableSessionContent />
    </Suspense>
  );
}
