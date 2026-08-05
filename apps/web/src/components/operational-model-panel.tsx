import Link from "next/link";

import { DocumentTypesPanel } from "@/components/document-types-panel";
import { OperationalFlowSteps } from "@/components/operational-flow-steps";
import {
  APP_NAV_ZONES,
  PRODUCT_CATEGORY_RULES,
  PURCHASE_INVENTORY_FLOW,
  SALES_COUNTER_FLOW,
  SALES_TABLE_FLOW,
} from "@ghost/domain";

export function OperationalModelPanel({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="space-y-6">
        <DocumentTypesPanel />
        <OperationalFlowSteps title="Venta mostrador" steps={SALES_COUNTER_FLOW} compact />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section id="zonas" className="scroll-mt-20">
        <p className="ghost-section-label">Zonas de la app</p>
        <div className="ghost-zone-grid">
          {APP_NAV_ZONES.map((zone) => (
            <article key={zone.id} className="ghost-zone-card">
              <p className="font-medium">{zone.label}</p>
              <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">{zone.purpose}</p>
            </article>
          ))}
        </div>
      </section>

      <div id="documentos" className="scroll-mt-20">
        <DocumentTypesPanel />
      </div>

      <div id="ventas" className="scroll-mt-20 grid gap-6 lg:grid-cols-2">
        <OperationalFlowSteps title="Venta — mostrador" steps={SALES_COUNTER_FLOW} />
        <OperationalFlowSteps title="Venta — mesa" steps={SALES_TABLE_FLOW} />
      </div>

      <div id="compras" className="scroll-mt-20">
        <OperationalFlowSteps title="Compra e inventario" steps={PURCHASE_INVENTORY_FLOW} />
      </div>

      <section id="productos" className="scroll-mt-20">
        <p className="ghost-section-label">Clase de producto</p>
        <div className="ghost-zone-grid">
          {(["alimenticio", "menaje", "operativo"] as const).map((id) => {
            const rule = PRODUCT_CATEGORY_RULES[id];
            return (
              <article key={id} className="ghost-zone-card">
                <p className="font-medium">{rule.label}</p>
                <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">{rule.hint}</p>
                <p className="mt-2 text-xs text-[var(--ghost-text-muted)]">
                  Bodega: {rule.tracksInventory ? "sí" : "no"} · Food cost:{" "}
                  {rule.affectsFoodCost ? "sí" : "no"}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <p className="text-sm text-[var(--ghost-text-muted)]">
        Regla de fechas en compras: facturas con fecha anterior a hoy (Colombia) quedan
        como histórico sin mover bodega al confirmar.
      </p>
    </div>
  );
}

interface OperationalHintProps {
  context: "sales" | "purchases" | "inventory" | "billing";
}

export function OperationalHint({ context }: OperationalHintProps) {
  const hints: Record<OperationalHintProps["context"], { text: string; href: string }> = {
    sales: {
      text: "Cobro → comprobante V-… o M-… en Registros. No confundir con factura de compra.",
      href: "/guia#ventas",
    },
    purchases: {
      text: "Proveedor + N.º factura + fecha. Históricas no mueven bodega.",
      href: "/guia#compras",
    },
    inventory: {
      text: "Alimenticio entra al food cost; menaje es operación; operativo no tiene stock.",
      href: "/guia#productos",
    },
    billing: {
      text: "Solo comprobantes de venta. Las compras van en Compras, no aquí.",
      href: "/guia#documentos",
    },
  };

  const hint = hints[context];

  return (
    <aside className="ghost-hint">
      <p>{hint.text}</p>
      <Link href={hint.href} className="ghost-hint-link">
        Ver lógica →
      </Link>
    </aside>
  );
}
