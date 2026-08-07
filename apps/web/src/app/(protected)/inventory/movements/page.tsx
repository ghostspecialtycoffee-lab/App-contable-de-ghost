"use client";

import Link from "next/link";

import { InventoryStockPanel } from "@/components/inventory-stock-panel";

export default function MovementsPage() {
  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/inventory" className="underline">
            Inventario
          </Link>
        </p>
        <h1 className="text-2xl font-bold">Existencias</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Consulta stock y agrega o quita unidades de bodega.
        </p>
      </div>

      <InventoryStockPanel />
    </div>
  );
}
