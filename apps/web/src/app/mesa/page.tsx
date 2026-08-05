"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { GuestMenuCatalog } from "@/components/guest-menu-catalog";
import { GuestTableProcessLine, type GuestTableStepId } from "@/components/guest-table-process";
import { useGuestMenuProducts } from "@/hooks/use-guest-menu-products";
import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { formatMoney } from "@/lib/format";
import { getFirestoreDb } from "@/lib/firebase/client";
import {
  addTableSessionLines,
  openTableSession,
  requestTableBillGuest,
  requestWaiterGuest,
} from "@/lib/tables/table-sessions";
import { findDiningTableByTokenClient } from "@/lib/tables/tables";
import {
  activeSessionLines,
  calculateSaleTotals,
  inferMenuProductTaxCategory,
  sessionLinesToSaleInputs,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { Button, Card } from "@ghost/ui";

function GuestTableContent() {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("o") ?? "";
  const qrToken = searchParams.get("t") ?? "";

  const [table, setTable] = useState<{
    tableId: string;
    number: number;
    label: string;
    branchId: string;
  } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("open");
  const [waiterRequestedAt, setWaiterRequestedAt] = useState<string | null>(null);
  const [lines, setLines] = useState<Array<Record<string, unknown>>>([]);
  const { products, loading: productsLoading, error: productsError } = useGuestMenuProducts(
    organizationId || null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartQty, setCartQty] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId || !qrToken) {
      setError("Enlace de mesa no válido.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      try {
        const found = await findDiningTableByTokenClient({ organizationId, qrToken });
        if (!found || cancelled) {
          setError("Mesa no encontrada o inactiva.");
          setLoading(false);
          return;
        }

        setTable({
          tableId: found.tableId,
          number: found.number,
          label: found.label,
          branchId: found.branchId,
        });

        const opened = await openTableSession({
          organizationId,
          branchId: found.branchId,
          tableId: found.tableId,
          tableNumber: found.number,
          tableLabel: found.label,
          guestToken: qrToken,
        });

        if (!cancelled) {
          setSessionId(opened.sessionId);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(getFirestoreErrorMessage(cause));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [organizationId, qrToken]);

  useEffect(() => {
    if (!sessionId || !organizationId) {
      return;
    }

    const sessionRef = doc(
      getFirestoreDb(),
      firestorePaths.organizationTableSession(organizationId, sessionId),
    );

    return onSnapshot(sessionRef, (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }
      const data = snapshot.data();
      setSessionStatus(data.status);
      setWaiterRequestedAt((data.waiterRequestedAt as string | undefined) ?? null);
      setLines((data.lines as Array<Record<string, unknown>>) ?? []);
    });
  }, [organizationId, sessionId]);

  const totals = useMemo(() => {
    if (lines.length === 0) {
      return null;
    }
    return calculateSaleTotals(
      sessionLinesToSaleInputs(activeSessionLines(lines as never)),
    );
  }, [lines]);

  function handleQtyChange(productId: string, quantity: number) {
    setCartQty((current) => ({
      ...current,
      [productId]: quantity,
    }));
  }

  async function handleSubmitOrder() {
    if (!table || !sessionId) {
      return;
    }

    const orderLines = products
      .filter((product) => (cartQty[product.id] ?? 0) > 0)
      .map((product) => ({
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity: cartQty[product.id] ?? 1,
        station: product.station,
        saleTaxCategory:
          product.saleTaxCategory ??
          inferMenuProductTaxCategory({ name: product.name, category: product.category }),
        source: "customer" as const,
      }));

    if (orderLines.length === 0) {
      setError("Selecciona al menos un producto.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await addTableSessionLines({
        organizationId,
        sessionId,
        guestToken: qrToken,
        lines: orderLines,
      });
      setCartQty({});
      setMessage("Ítems agregados a tu cuenta. El staff enviará la comanda a cocina.");
    } catch (cause) {
      setError(getFirestoreErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestBill() {
    if (!sessionId) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await requestTableBillGuest({
        organizationId,
        sessionId,
        guestToken: qrToken,
      });
      setMessage("Cuenta solicitada. Un mesero te atenderá.");
    } catch (cause) {
      setError(getFirestoreErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestWaiter() {
    if (!sessionId) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await requestWaiterGuest({
        organizationId,
        sessionId,
        guestToken: qrToken,
      });
      setMessage("Mesero avisado. Te atenderemos en breve.");
    } catch (cause) {
      setError(getFirestoreErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || productsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando menú...</p>
      </div>
    );
  }

  if (error && !table) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
      </div>
    );
  }

  if (sessionStatus === "closed") {
    return (
      <div className="mx-auto max-w-lg space-y-3 p-6 text-center">
        <h1 className="text-xl font-semibold">Cuenta cerrada</h1>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          Gracias por tu visita. Esta mesa ya fue cobrada.
        </p>
      </div>
    );
  }

  const canOrder = sessionStatus === "open";
  const canRequestWaiter = sessionStatus === "open" || sessionStatus === "requested_bill";
  const guestStep: GuestTableStepId =
    sessionStatus === "requested_bill"
      ? "cuenta"
      : activeSessionLines(lines as never).length > 0
        ? "pedido"
        : "menu";

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-32">
      <div className="text-center">
        <p className="text-sm text-[var(--ghost-text-muted)]">Menú de mesa</p>
        <h1 className="text-2xl font-semibold">
          Mesa {table?.number}
          {table?.label ? ` · ${table.label}` : ""}
        </h1>
        {sessionStatus === "requested_bill" ? (
          <p className="mt-1 text-sm text-[var(--ghost-brand-500)]">Cuenta solicitada</p>
        ) : null}
        {waiterRequestedAt ? (
          <p className="mt-1 text-sm text-[var(--ghost-brand-500)]">
            Mesero avisado · espera un momento
          </p>
        ) : null}
        <div className="mt-3 flex justify-center">
          <GuestTableProcessLine currentStep={guestStep} />
        </div>
      </div>

      <Card title="Menú">
        {productsError ? (
          <p className="mb-3 text-sm text-[var(--ghost-danger)]">{productsError}</p>
        ) : null}
        {products.length === 0 && !productsLoading ? (
          <p className="mb-3 text-sm text-[var(--ghost-text-muted)]">
            El menú no está disponible en este momento. Pide ayuda a un mesero.
          </p>
        ) : null}
        <GuestMenuCatalog
          products={products}
          orderMode
          cartQty={cartQty}
          onQtyChange={handleQtyChange}
        />
      </Card>

      {lines.length > 0 ? (
        <Card title="Tu cuenta">
          <ul className="space-y-2 text-sm">
            {activeSessionLines(lines as never).map((line) => (
              <li key={line.id} className="flex justify-between gap-2">
                <span>
                  {line.quantity} x {line.name}
                </span>
                <span>{formatMoney(line.unitPrice * line.quantity)}</span>
              </li>
            ))}
          </ul>
          {totals ? (
            <p className="mt-3 text-base font-semibold">Total: {formatMoney(totals.total)}</p>
          ) : null}
        </Card>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-3xl space-y-2">
          <Button
            fullWidth
            variant="secondary"
            disabled={submitting || !canRequestWaiter}
            onClick={handleRequestWaiter}
          >
            {waiterRequestedAt ? "Volver a llamar al mesero" : "Llamar al mesero"}
          </Button>
          <Button fullWidth size="lg" disabled={submitting || !canOrder} onClick={handleSubmitOrder}>
            {submitting ? "Enviando..." : canOrder ? "Agregar a la cuenta" : "Cuenta solicitada"}
          </Button>
          <Button
            fullWidth
            variant="secondary"
            disabled={submitting || sessionStatus !== "open"}
            onClick={handleRequestBill}
          >
            Pedir la cuenta
          </Button>
          {message ? <p className="text-sm text-[var(--ghost-brand-500)]">{message}</p> : null}
          {error ? <p className="text-sm text-[var(--ghost-danger)]">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function GuestTablePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-sm text-[var(--ghost-text-muted)]">Cargando...</p>
        </div>
      }
    >
      <GuestTableContent />
    </Suspense>
  );
}
