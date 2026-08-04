"use client";

import Link from "next/link";
import { useState } from "react";

import { useWarehouses } from "@/hooks/use-warehouses";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { callCreateWarehouse } from "@/lib/firebase/functions";
import { useActiveMembership } from "@/providers/auth-provider";
import { Button, Card } from "@ghost/ui";

export default function WarehousesPage() {
  const membership = useActiveMembership();
  const { warehouses, loading, error } = useWarehouses();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const branchId = membership?.branchIds[0] ?? "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId) {
      setSubmitError("No hay sucursal activa.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      await callCreateWarehouse({
        branchId,
        name: name.trim(),
        code: code.trim(),
        isDefault: warehouses.length === 0,
      });
      setName("");
      setCode("");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/inventory" className="underline">
            Inventario
          </Link>
        </p>
        <h1 className="text-2xl font-bold">Bodegas</h1>
      </div>

      <Card title="Nueva bodega">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Nombre</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ghost-input"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Código</span>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="ghost-input uppercase"
            />
          </label>
          {submitError ? (
            <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
          ) : null}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? "Guardando..." : "Crear bodega"}
          </Button>
        </form>
      </Card>

      <Card title="Listado">
        {loading ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">Cargando...</p>
        ) : error ? (
          <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
        ) : warehouses.length === 0 ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Crea la primera bodega para registrar movimientos.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--ghost-border)]">
            {warehouses.map((warehouse) => (
              <li key={warehouse.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{warehouse.name}</p>
                  <p className="text-xs text-[var(--ghost-text-muted)]">
                    {warehouse.code}
                    {warehouse.isDefault ? " · Principal" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
