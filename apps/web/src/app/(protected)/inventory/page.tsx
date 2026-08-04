import Link from "next/link";

import { Card } from "@ghost/ui";

const modules = [
  {
    href: "/inventory/items",
    title: "Ítems",
    description: "Materias primas, insumos, productos terminados y empaques.",
  },
  {
    href: "/inventory/movements",
    title: "Movimientos",
    description: "Entradas, salidas, ajustes y kardex auditado.",
    soon: true,
  },
  {
    href: "/inventory/warehouses",
    title: "Bodegas",
    description: "Bodegas por sucursal con stock desnormalizado.",
    soon: true,
  },
];

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventario</h1>
        <p className="mt-1 text-[var(--ghost-text-muted)]">
          Control de stock con kardex auditado, costo promedio ponderado y alertas
          de mínimos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((module) => (
          <Card key={module.href} title={module.title} description={module.description}>
            {module.soon ? (
              <p className="text-xs uppercase tracking-wide text-[var(--ghost-text-muted)]">
                Próximamente
              </p>
            ) : (
              <Link
                href={module.href}
                className="inline-flex text-sm font-medium text-[var(--ghost-brand-500)] underline"
              >
                Abrir módulo
              </Link>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
