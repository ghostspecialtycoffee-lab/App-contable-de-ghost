import Link from "next/link";

import { InitialDataImportPanel } from "@/components/initial-data-import-panel";
import { InventoryStockPanel } from "@/components/inventory-stock-panel";
import { Card } from "@ghost/ui";

const modules = [
  {
    href: "/inventory/items",
    title: "Ítems",
    description: "Materias primas, insumos y productos.",
  },
  {
    href: "/inventory/warehouses",
    title: "Bodegas",
    description: "Bodegas por sucursal.",
  },
  {
    href: "/inventory/movements",
    title: "Existencias",
    description: "Stock actual, entradas y salidas manuales.",
  },
  {
    href: "/purchases",
    title: "Compras",
    description: "Facturas de compra con IVA e ingreso a inventario.",
  },
  {
    href: "/expenses",
    title: "Gastos fijos",
    description: "Arriendo, nómina y costos recurrentes.",
  },
  {
    href: "/costing",
    title: "Costeo",
    description: "Matriz de costos, márgenes e impuestos Colombia.",
  },
  {
    href: "/settings/costing",
    title: "Parámetros matriz",
    description: "Metas de food cost y retenciones de referencia.",
  },
];

export default function InventoryPage() {
  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold">Inventario</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Control de existencias por sucursal.
        </p>
      </div>

      <InitialDataImportPanel compact showInAppImport />

      <InventoryStockPanel />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Card key={module.href} title={module.title} description={module.description}>
            <Link
              href={module.href}
              className="inline-flex min-h-[48px] items-center text-sm font-medium text-[var(--ghost-brand-500)] underline"
            >
              Abrir
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
