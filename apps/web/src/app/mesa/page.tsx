"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
} from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { formatMoney } from "@/lib/format";
import { getFirestoreDb } from "@/lib/firebase/client";
import { addTableSessionLines, openTableSession, requestTableBillGuest } from "@/lib/tables/table-sessions";
import { findDiningTableByTokenClient } from "@/lib/tables/tables";
import { GuestTableProcessLine, type GuestTableStepId } from "@/components/guest-table-process";
import {
  activeSessionLines,
  calculateSaleTotals,
  inferMenuProductTaxCategory,
  sessionLinesToSaleInputs,
  type MenuProduct,
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
  const [lines, setLines] = useState<Array<Record<string, unknown>>>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
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
      setLines((data.lines as Array<Record<string, unknown>>) ?? []);
    });
  }, [organizationId, sessionId]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    const productsQuery = query(
      collection(getFirestoreDb(), firestorePaths.organizationMenuProducts(organizationId)),
    );

    return onSnapshot(productsQuery, (snapshot) => {
      setProducts(
        snapshot.docs
          .map((document) => {
            const data = document.data();
            return {
              id: document.id,
              organizationId: data.organizationId,
              name: data.name,
              price: data.price ?? 0,
              category: data.category,
              station: data.station,
              status: data.status,
              sortOrder: data.sortOrder ?? 0,
              description: data.description ?? "",
              saleTaxCategory: data.saleTaxCategory,
              recipeCost: data.recipeCost ?? 0,
              imageDataUrl: data.imageDataUrl,
              imageMimeType: data.imageMimeType,
              createdAt: "",
              updatedAt: "",
              createdBy: "",
              updatedBy: "",
            } satisfies MenuProduct;
          })
          .filter((product) => product.status === "active")
          .sort((left, right) => left.sortOrder - right.sortOrder),
      );
    });
  }, [organizationId]);

  const totals = useMemo(() => {
    if (lines.length === 0) {
      return null;
    }
    return calculateSaleTotals(
      sessionLinesToSaleInputs(activeSessionLines(lines as never)),
    );
  }, [lines]);

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

  if (loading) {
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
  const guestStep: GuestTableStepId =
    sessionStatus === "requested_bill"
      ? "cuenta"
      : activeSessionLines(lines as never).length > 0
        ? "pedido"
        : "menu";

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
      <div className="text-center">
        <p className="text-sm text-[var(--ghost-text-muted)]">Menú de mesa</p>
        <h1 className="text-2xl font-semibold">
          Mesa {table?.number}
          {table?.label ? ` · ${table.label}` : ""}
        </h1>
        {sessionStatus === "requested_bill" ? (
          <p className="mt-1 text-sm text-[var(--ghost-brand-500)]">Cuenta solicitada</p>
        ) : null}
        <div className="mt-3 flex justify-center">
          <GuestTableProcessLine currentStep={guestStep} />
        </div>
      </div>

      <Card title="Menú">
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((product) => (
            <div key={product.id} className="rounded-xl border border-[var(--ghost-border)] p-3">
              {product.imageDataUrl ? (
                <img
                  src={product.imageDataUrl}
                  alt={product.name}
                  className="mb-2 h-28 w-full rounded-lg object-cover"
                />
              ) : null}
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-[var(--ghost-brand-500)]">{formatMoney(product.price)}</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="ghost-input h-8 w-8 px-0"
                  onClick={() =>
                    setCartQty((current) => ({
                      ...current,
                      [product.id]: Math.max(0, (current[product.id] ?? 0) - 1),
                    }))
                  }
                >
                  −
                </button>
                <span className="w-6 text-center text-sm">{cartQty[product.id] ?? 0}</span>
                <button
                  type="button"
                  className="ghost-input h-8 w-8 px-0"
                  onClick={() =>
                    setCartQty((current) => ({
                      ...current,
                      [product.id]: (current[product.id] ?? 0) + 1,
                    }))
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
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

      <div className="space-y-2">
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
