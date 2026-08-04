"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useInventoryItems } from "@/hooks/use-inventory-items";
import { useWarehouses } from "@/hooks/use-warehouses";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { callRegisterInventoryMovement } from "@/lib/firebase/functions";
import { useActiveMembership } from "@/providers/auth-provider";
import { INVENTORY_MOVEMENT_LABELS, INVENTORY_MOVEMENT_TYPES } from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function MovementsPage() {
  const membership = useActiveMembership();
  const { items, loading: itemsLoading } = useInventoryItems();
  const { warehouses, loading: warehousesLoading } = useWarehouses();

  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState<string>("entry");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const branchId = membership?.branchIds[0] ?? "";

  const defaultWarehouse = useMemo(
    () => warehouses.find((w) => w.isDefault) ?? warehouses[0],
    [warehouses],
  );

  const effectiveWarehouseId = warehouseId || defaultWarehouse?.id || "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!branchId || !effectiveWarehouseId || !itemId) {
      setSubmitError("Selecciona ítem y bodega.");
      return;
    }

    setSubmitError(null);
    setResult(null);
    setSubmitting(true);

    try {
      const response = await callRegisterInventoryMovement({
        branchId,
        warehouseId: effectiveWarehouseId,
        itemId,
        type,
        quantity: Number(quantity),
        unitCost: unitCost ? Number(unitCost) : undefined,
        notes: notes.trim() || undefined,
      });
      setResult(`Movimiento registrado. Stock: ${response.balanceAfter}`);
      setQuantity("1");
      setNotes("");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  const loading = itemsLoading || warehousesLoading;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/inventory" className="underline">
            Inventario
          </Link>
        </p>
        <h1 className="text-2xl font-bold">Movimientos</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Entradas, salidas y ajustes desde el celular.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando datos...</p>
      ) : items.length === 0 || warehouses.length === 0 ? (
        <Card title="Configura primero">
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Necesitas al menos un ítem y una bodega.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href="/inventory/items">
              <Button variant="secondary" fullWidth>
                Crear ítem
              </Button>
            </Link>
            <Link href="/inventory/warehouses">
              <Button variant="secondary" fullWidth>
                Crear bodega
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card title="Registrar movimiento">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Ítem</span>
              <select
                required
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="ghost-input"
              >
                <option value="">Seleccionar...</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} — {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Bodega</span>
              <select
                value={effectiveWarehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="ghost-input"
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Tipo</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="ghost-input"
              >
                {INVENTORY_MOVEMENT_TYPES.map((movementType) => (
                  <option key={movementType} value={movementType}>
                    {INVENTORY_MOVEMENT_LABELS[movementType]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Cantidad</span>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="ghost-input"
              />
            </label>
            {type === "entry" ? (
              <label className="block space-y-1">
                <span className="text-sm font-medium">Costo unitario (opcional)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="ghost-input"
                />
              </label>
            ) : null}
            <label className="block space-y-1">
              <span className="text-sm font-medium">Notas</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="ghost-input"
              />
            </label>
            {submitError ? (
              <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
            ) : null}
            {result ? (
              <p className="text-sm text-[var(--ghost-brand-500)]">{result}</p>
            ) : null}
            <Button type="submit" fullWidth disabled={submitting} size="lg">
              {submitting ? "Registrando..." : "Registrar"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
