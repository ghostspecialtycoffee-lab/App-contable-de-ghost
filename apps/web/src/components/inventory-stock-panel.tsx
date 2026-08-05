"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useInventoryBalances } from "@/hooks/use-inventory-balances";
import { useInventoryItems } from "@/hooks/use-inventory-items";
import { useInventoryMovements } from "@/hooks/use-inventory-movements";
import { useWarehouses } from "@/hooks/use-warehouses";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { formatDateTime } from "@/lib/format";
import { registerInventoryMovement } from "@/lib/inventory/inventory";
import { useActiveMembership } from "@/providers/auth-provider";
import {
  BASE_UNIT_LABELS,
  INVENTORY_MOVEMENT_LABELS,
  type BaseUnit,
  type InventoryMovementType,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

type AdjustmentMode = "entry" | "exit" | "waste";

const ADJUSTMENT_MODES: Array<{ value: AdjustmentMode; label: string; hint: string }> = [
  { value: "entry", label: "Agregar", hint: "Ingreso manual a bodega" },
  { value: "exit", label: "Quitar", hint: "Salida de insumo o producto" },
  { value: "waste", label: "Merma", hint: "Pérdida, vencimiento o rotura" },
];

function formatQuantity(value: number, unit: BaseUnit): string {
  const formatted = value.toLocaleString("es-CO", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
  return `${formatted} ${BASE_UNIT_LABELS[unit] ?? unit}`;
}

export function InventoryStockPanel() {
  const membership = useActiveMembership();
  const { items, loading: itemsLoading } = useInventoryItems();
  const { warehouses, loading: warehousesLoading } = useWarehouses();
  const { balances, loading: balancesLoading } = useInventoryBalances();
  const { movements, loading: movementsLoading } = useInventoryMovements(40);

  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [mode, setMode] = useState<AdjustmentMode>("entry");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const branchId = membership?.branchIds[0] ?? "";

  const defaultWarehouse = useMemo(
    () => warehouses.find((warehouse) => warehouse.isDefault) ?? warehouses[0],
    [warehouses],
  );

  const effectiveWarehouseId = warehouseId || defaultWarehouse?.id || "";

  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  const warehousesById = useMemo(
    () => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse])),
    [warehouses],
  );

  const balanceByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const balance of balances) {
      map.set(`${balance.warehouseId}_${balance.itemId}`, balance.quantity);
    }
    return map;
  }, [balances]);

  function getStock(warehouse: string, item: string): number {
    return balanceByKey.get(`${warehouse}_${item}`) ?? 0;
  }

  const selectedItem = itemId ? itemsById.get(itemId) : undefined;
  const selectedStock = selectedItem
    ? getStock(effectiveWarehouseId, selectedItem.id)
    : 0;

  const stockRows = useMemo(() => {
    return items
      .map((item) => {
        const warehouse = effectiveWarehouseId || defaultWarehouse?.id;
        if (!warehouse) {
          return null;
        }

        return {
          item,
          warehouseId: warehouse,
          quantity: getStock(warehouse, item.id),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((left, right) => {
        if (left.quantity !== right.quantity) {
          return right.quantity - left.quantity;
        }
        return left.item.name.localeCompare(right.item.name, "es");
      });
  }, [items, effectiveWarehouseId, defaultWarehouse?.id, balanceByKey]);

  function prefillAdjustment(nextItemId: string, nextMode: AdjustmentMode = "entry") {
    setItemId(nextItemId);
    setMode(nextMode);
    setResult(null);
    setSubmitError(null);
  }

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
      const response = await registerInventoryMovement({
        branchId,
        warehouseId: effectiveWarehouseId,
        itemId,
        type: mode,
        quantity: Number(quantity),
        unitCost: mode === "entry" && unitCost ? Number(unitCost) : undefined,
        notes: notes.trim() || undefined,
      });

      const item = itemsById.get(itemId);
      const unit = (item?.baseUnit ?? "unit") as BaseUnit;
      setResult(
        `${ADJUSTMENT_MODES.find((entry) => entry.value === mode)?.label ?? "Ajuste"} registrado. Stock: ${formatQuantity(response.balanceAfter, unit)}`,
      );
      setQuantity("1");
      setNotes("");
      if (mode !== "entry") {
        setUnitCost("");
      }
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  const loading = itemsLoading || warehousesLoading || balancesLoading;

  if (loading) {
    return <p className="text-sm text-[var(--ghost-text-muted)]">Cargando inventario...</p>;
  }

  if (items.length === 0 || warehouses.length === 0) {
    return (
      <Card title="Configura primero">
        <p className="text-sm text-[var(--ghost-text-muted)]">
          Necesitas al menos un ítem y una bodega para ajustar existencias.
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
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Ajustar existencias">
        <p className="mb-4 text-sm text-[var(--ghost-text-muted)]">
          Agrega o quita unidades manualmente. Las compras registradas también ingresan stock
          automáticamente.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Bodega</span>
            <select
              value={effectiveWarehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
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
            <span className="text-sm font-medium">Ítem</span>
            <select
              required
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
              className="ghost-input"
            >
              <option value="">Seleccionar...</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} — {item.name} (
                  {formatQuantity(
                    getStock(effectiveWarehouseId, item.id),
                    item.baseUnit as BaseUnit,
                  )}
                  )
                </option>
              ))}
            </select>
          </label>

          {selectedItem ? (
            <p className="rounded-lg bg-[var(--ghost-surface-2)] px-3 py-2 text-sm">
              Stock actual:{" "}
              <strong>
                {formatQuantity(selectedStock, selectedItem.baseUnit as BaseUnit)}
              </strong>
            </p>
          ) : null}

          <div className="space-y-2">
            <span className="text-sm font-medium">Acción</span>
            <div className="grid grid-cols-3 gap-2">
              {ADJUSTMENT_MODES.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => setMode(entry.value)}
                  className={`min-h-[48px] rounded-lg border px-2 py-2 text-sm font-medium transition ${
                    mode === entry.value
                      ? "border-[var(--ghost-brand-500)] bg-[var(--ghost-brand-500)]/10 text-[var(--ghost-brand-500)]"
                      : "border-[var(--ghost-border)] text-[var(--ghost-text-muted)]"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--ghost-text-muted)]">
              {ADJUSTMENT_MODES.find((entry) => entry.value === mode)?.hint}
            </p>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium">
              Cantidad
              {selectedItem ? ` (${selectedItem.baseUnit})` : ""}
            </span>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="ghost-input"
            />
          </label>

          {mode === "entry" ? (
            <label className="block space-y-1">
              <span className="text-sm font-medium">Costo unitario (opcional)</span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                className="ghost-input"
                placeholder="Actualiza costo promedio si lo conoces"
              />
            </label>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm font-medium">Motivo / notas</span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="ghost-input"
              placeholder="Conteo físico, regalo, consumo interno..."
            />
          </label>

          {submitError ? (
            <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
          ) : null}
          {result ? <p className="text-sm text-[var(--ghost-brand-500)]">{result}</p> : null}

          <Button type="submit" fullWidth disabled={submitting} size="lg">
            {submitting ? "Guardando..." : "Registrar ajuste"}
          </Button>
        </form>
      </Card>

      <Card title="Stock actual">
        <p className="mb-3 text-sm text-[var(--ghost-text-muted)]">
          Existencias en{" "}
          {warehousesById.get(effectiveWarehouseId)?.name ?? "la bodega seleccionada"}.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--ghost-border)] text-[var(--ghost-text-muted)]">
              <tr>
                <th className="px-2 py-2 font-medium">SKU</th>
                <th className="px-2 py-2 font-medium">Ítem</th>
                <th className="px-2 py-2 font-medium">Existencia</th>
                <th className="px-2 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.map(({ item, quantity: stockQuantity }) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--ghost-border)] last:border-0"
                >
                  <td className="px-2 py-2 font-mono text-xs">{item.sku}</td>
                  <td className="px-2 py-2">{item.name}</td>
                  <td className="px-2 py-2 font-medium">
                    {formatQuantity(stockQuantity, item.baseUnit as BaseUnit)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => prefillAdjustment(item.id, "entry")}
                        className="text-xs font-medium text-[var(--ghost-brand-500)] underline"
                      >
                        + Agregar
                      </button>
                      <button
                        type="button"
                        onClick={() => prefillAdjustment(item.id, "exit")}
                        className="text-xs font-medium text-[var(--ghost-danger)] underline"
                      >
                        − Quitar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Movimientos recientes">
        {movementsLoading ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">Cargando movimientos...</p>
        ) : movements.length === 0 ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Aún no hay movimientos registrados.
          </p>
        ) : (
          <div className="space-y-3">
            {movements.slice(0, 15).map((movement) => {
              const item = itemsById.get(movement.itemId);
              const warehouse = warehousesById.get(movement.warehouseId);
              const unit = (item?.baseUnit ?? "unit") as BaseUnit;
              const signed = movement.quantity;
              const signLabel = signed >= 0 ? "+" : "−";

              return (
                <div
                  key={movement.id}
                  className="flex flex-col gap-1 border-b border-[var(--ghost-border)] pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item?.name ?? movement.itemId}{" "}
                      <span
                        className={
                          signed >= 0
                            ? "text-[var(--ghost-brand-500)]"
                            : "text-[var(--ghost-danger)]"
                        }
                      >
                        {signLabel}
                        {Math.abs(signed).toLocaleString("es-CO", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        {BASE_UNIT_LABELS[unit] ?? unit}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--ghost-text-muted)]">
                      {INVENTORY_MOVEMENT_LABELS[movement.type as InventoryMovementType]} ·{" "}
                      {warehouse?.name ?? "Bodega"} · {formatDateTime(movement.occurredAt)}
                    </p>
                    {movement.notes ? (
                      <p className="text-xs text-[var(--ghost-text-muted)]">{movement.notes}</p>
                    ) : null}
                  </div>
                  <p className="text-xs text-[var(--ghost-text-muted)]">
                    Stock: {formatQuantity(movement.balanceAfter, unit)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
