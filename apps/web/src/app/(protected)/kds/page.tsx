"use client";

import Link from "next/link";
import { useState } from "react";

import { useKitchenOrders } from "@/hooks/use-kitchen-orders";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { updateKitchenOrderStatus } from "@/lib/pos/pos";
import {
  KITCHEN_ORDER_STATUS_LABELS,
  KITCHEN_STATION_LABELS,
  type KitchenOrderStatus,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function KdsPage() {
  const [stationFilter, setStationFilter] = useState<"all" | "bar" | "kitchen">(
    "all",
  );
  const { orders, loading, error } = useKitchenOrders(
    stationFilter === "all" ? undefined : { station: stationFilter },
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStatus(orderId: string, status: KitchenOrderStatus) {
    setActionError(null);
    setUpdatingId(orderId);

    try {
      await updateKitchenOrderStatus({ orderId, status });
    } catch (cause) {
      setActionError(getCallableErrorMessage(cause));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--ghost-text-muted)]">Operación en cocina y barra</p>
          <h1 className="text-2xl font-semibold">Comandas</h1>
        </div>
        <Link href="/pos">
          <Button variant="secondary" size="sm">
            Mostrador
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "bar", "kitchen"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStationFilter(filter)}
            className={[
              "rounded-full px-3 py-1 text-sm",
              stationFilter === filter
                ? "bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)]"
                : "bg-[var(--ghost-surface-2)]",
            ].join(" ")}
          >
            {filter === "all"
              ? "Todas"
              : KITCHEN_STATION_LABELS[filter]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando comandas...</p>
      ) : error ? (
        <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
      ) : orders.length === 0 ? (
        <Card title="Sin comandas activas">
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Las operaciones con ítems de barra o cocina aparecerán aquí.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              title={`${order.tableNumber ? `Mesa ${order.tableNumber} · ` : ""}Ticket #${order.ticketNumber}`}
              description={`${KITCHEN_STATION_LABELS[order.station]} · ${KITCHEN_ORDER_STATUS_LABELS[order.status]}${order.saleNumber ? ` · ${order.saleNumber}` : ""}`}
            >
              <ul className="space-y-2 text-sm">
                {order.lines.map((line, index) => (
                  <li key={`${order.id}-${index}`}>
                    <span className="font-medium">{line.quantity}x</span> {line.name}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {order.status === "pending" ? (
                  <Button
                    size="sm"
                    disabled={updatingId === order.id}
                    onClick={() => handleStatus(order.id, "preparing")}
                  >
                    Preparar
                  </Button>
                ) : null}
                {order.status === "preparing" ? (
                  <Button
                    size="sm"
                    disabled={updatingId === order.id}
                    onClick={() => handleStatus(order.id, "ready")}
                  >
                    Listo
                  </Button>
                ) : null}
                {order.status === "ready" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={updatingId === order.id}
                    onClick={() => handleStatus(order.id, "delivered")}
                  >
                    Entregado
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {actionError ? (
        <p className="text-sm text-[var(--ghost-danger)]">{actionError}</p>
      ) : null}
    </div>
  );
}
