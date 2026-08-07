"use client";

import Link from "next/link";
import { useState } from "react";

import { useSuppliers } from "@/hooks/use-suppliers";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { createSupplier, updateSupplier } from "@/lib/purchases/suppliers";
import { Button, Card } from "@ghost/ui";

export default function SuppliersPage() {
  const { suppliers, loading, error } = useSuppliers();
  const [name, setName] = useState("");
  const [nit, setNit] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      await createSupplier({
        name,
        nit: nit || undefined,
        contactName: contactName || undefined,
        phone: phone || undefined,
      });
      setName("");
      setNit("");
      setContactName("");
      setPhone("");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(supplierId: string, isActive: boolean) {
    setSubmitError(null);
    setWorkingId(supplierId);

    try {
      await updateSupplier({
        supplierId,
        patch: { isActive: !isActive },
      });
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/purchases" className="underline">
            Compras
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Proveedores</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Catálogo de proveedores para facturas, historial de precios y sugerencias de compra.
        </p>
      </div>

      <Card className="space-y-4 p-4">
        <h2 className="text-lg font-medium">Nuevo proveedor</h2>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">Nombre</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="ghost-input w-full"
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">NIT</span>
            <input
              value={nit}
              onChange={(event) => setNit(event.target.value)}
              className="ghost-input w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Contacto</span>
            <input
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className="ghost-input w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Teléfono</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="ghost-input w-full"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando…" : "Guardar proveedor"}
            </Button>
          </div>
        </form>
        {submitError ? <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p> : null}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-lg font-medium">Proveedores activos</h2>
        {loading ? <p className="text-sm text-[var(--ghost-text-muted)]">Cargando…</p> : null}
        {error ? <p className="text-sm text-[var(--ghost-danger)]">{error}</p> : null}
        {!loading && suppliers.length === 0 ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Aún no hay proveedores. También puedes seguir usando nombre libre en facturas.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--ghost-border)]">
            {suppliers.map((supplier) => (
              <li
                key={supplier.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">
                    {supplier.name}
                    {!supplier.isActive ? (
                      <span className="ml-2 text-xs text-[var(--ghost-text-muted)]">(inactivo)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--ghost-text-muted)]">
                    {[supplier.nit, supplier.contactName, supplier.phone].filter(Boolean).join(" · ") ||
                      "Sin datos adicionales"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={workingId === supplier.id}
                  onClick={() => toggleActive(supplier.id, supplier.isActive)}
                >
                  {supplier.isActive ? "Desactivar" : "Activar"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
