"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { useDiningTables } from "@/hooks/use-dining-tables";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { useTableSessions } from "@/hooks/use-table-sessions";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { formatMoney } from "@/lib/format";
import {
  activeSessionLines,
  calculateSaleTotals,
  inferMenuProductTaxCategory,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  sessionLinesToSaleInputs,
  type PaymentMethod,
} from "@ghost/domain";
import {
  addTableSessionLines,
  checkoutTableSession,
  openTableSession,
  sendTableSessionToKitchen,
} from "@/lib/tables/table-sessions";
import { Button, Card } from "@ghost/ui";

function TableSessionContent() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("id") ?? "";
  const { tables, loading: tablesLoading } = useDiningTables();
  const { products } = useMenuProducts();
  const { sessions, loading: sessionsLoading } = useTableSessions({ openOnly: true });
  const [opening, setOpening] = useState(false);
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
      .catch((cause) => setSubmitError(getCallableErrorMessage(cause)))
      .finally(() => setOpening(false));
  }, [table, session, opening, sessionsLoading]);

  const totals = useMemo(() => {
    if (!session) {
      return null;
    }
    return calculateSaleTotals(sessionLinesToSaleInputs(activeSessionLines(session.lines)));
  }, [session]);

  async function handleAddProduct(product: (typeof products)[number]) {
    if (!table || !session) {
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

    setWorking(true);
    setSubmitError(null);

    try {
      const result = await checkoutTableSession({
        sessionId: session.id,
        paymentMethod,
      });
      setSuccess(`Cobro registrado · ${result.saleNumber} · ${formatMoney(result.total)}`);
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
        <Link href="/pos/tables" className="underline">
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
        <Link href="/pos/tables" className="underline">
          Volver a mesas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/pos/tables" className="underline">
            Mesas
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">
          Mesa {table.number}
          {table.label ? ` · ${table.label}` : ""}
        </h1>
        {session?.status === "requested_bill" ? (
          <p className="mt-1 text-sm text-[var(--ghost-brand-500)]">Cliente pidió la cuenta</p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card title="Agregar del catálogo">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleAddProduct(product)}
                className="rounded-xl border border-[var(--ghost-border)] p-3 text-left hover:border-[var(--ghost-brand-500)]"
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
              {opening ? "Abriendo mesa..." : "Preparando sesión..."}
            </p>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-2 text-sm">
                {activeSessionLines(session.lines).map((line) => (
                  <li
                    key={line.id}
                    className="flex justify-between gap-2 border-b border-[var(--ghost-border)] pb-2"
                  >
                    <span>
                      {line.quantity} x {line.name}
                      <span className="ml-1 text-xs text-[var(--ghost-text-muted)]">
                        ({line.status === "sent" ? "comanda" : "pendiente"})
                      </span>
                    </span>
                    <span>{formatMoney(line.unitPrice * line.quantity)}</span>
                  </li>
                ))}
              </ul>

              {totals ? (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Base</span>
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

              <Button fullWidth variant="secondary" disabled={working} onClick={handleSendKitchen}>
                Enviar comanda (barra/cocina)
              </Button>

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

              <Button fullWidth disabled={working} onClick={handleCheckout}>
                Cobrar mesa
              </Button>

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
