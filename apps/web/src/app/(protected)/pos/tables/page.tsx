"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { useDiningTables } from "@/hooks/use-dining-tables";
import { useTableSessions } from "@/hooks/use-table-sessions";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { buildTableQrUrl, createDiningTable } from "@/lib/tables/tables";
import { DINING_TABLE_STATUS_LABELS } from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

function PosTablesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paidSaleNumber = searchParams.get("paid");
  const { tables, loading, error } = useDiningTables();
  const { sessions } = useTableSessions({ openOnly: true });
  const [tableNumber, setTableNumber] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sessionByTableId = useMemo(() => {
    const map = new Map<string, (typeof sessions)[number]>();
    for (const session of sessions) {
      map.set(session.tableId, session);
    }
    return map;
  }, [sessions]);

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
      router.push(`/pos/tables/session?id=${result.tableId}`);
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
            <Link href="/pos" className="underline">
              Mostrador
            </Link>
          </p>
          <h1 className="text-2xl font-semibold">Mesas</h1>
          <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
            Al crear la mesa se abre la cuenta. El cliente escanea el QR o el staff agrega ítems
            manualmente. Al cobrar se cierra y aparece en el informe de ventas.
          </p>
        </div>
      </div>

      {paidSaleNumber ? (
        <div className="rounded-xl border border-[var(--ghost-brand-500)] bg-[var(--ghost-surface-1)] px-4 py-3 text-sm">
          Cuenta cobrada · comprobante{" "}
          <span className="font-mono font-medium">{paidSaleNumber}</span> registrado en ventas del
          día.{" "}
          <Link href="/billing" className="underline">
            Ver informe
          </Link>
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

        <Card title="Mesas activas">
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
                        Pedido abierto · {session.lines.length} ítems
                        {session.status === "requested_bill" ? " · Cuenta pedida" : ""}
                      </p>
                    ) : null}

                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUrl)}`}
                      alt={`QR mesa ${table.number}`}
                      className="mx-auto my-3 rounded-lg border border-[var(--ghost-border)] bg-white p-2"
                    />

                    <p className="break-all text-[10px] text-[var(--ghost-text-muted)]">{qrUrl}</p>

                    <Link href={`/pos/tables/session?id=${table.id}`} className="mt-3 block">
                      <Button fullWidth variant={session ? "primary" : "secondary"}>
                        {session ? "Ver cuenta" : "Gestionar mesa"}
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
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
