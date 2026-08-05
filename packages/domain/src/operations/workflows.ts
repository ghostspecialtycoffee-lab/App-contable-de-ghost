/** Flujos operativos — orden lógico de la app. */

export interface OperationalStep {
  order: number;
  label: string;
  description: string;
  href?: string;
}

export const SALES_COUNTER_FLOW: OperationalStep[] = [
  {
    order: 1,
    label: "Mostrador",
    description: "Arma el pedido en POS",
    href: "/pos",
  },
  {
    order: 2,
    label: "Cobro",
    description: "Registra pago y genera comprobante",
    href: "/pos",
  },
  {
    order: 3,
    label: "Comprobante",
    description: "Queda en Registros (V-…)",
    href: "/billing",
  },
];

export const SALES_TABLE_FLOW: OperationalStep[] = [
  {
    order: 1,
    label: "Mesa",
    description: "Abre cuenta o QR",
    href: "/pos/tables",
  },
  {
    order: 2,
    label: "Pedido",
    description: "Cliente ordena desde la mesa",
    href: "/pos/tables",
  },
  {
    order: 3,
    label: "Comanda",
    description: "Barra/cocina prepara",
    href: "/kds",
  },
  {
    order: 4,
    label: "Cobro",
    description: "Cierra cuenta en mesa",
    href: "/pos/tables",
  },
  {
    order: 5,
    label: "Comprobante",
    description: "Registros (M-…)",
    href: "/billing",
  },
];

export const PURCHASE_INVENTORY_FLOW: OperationalStep[] = [
  {
    order: 1,
    label: "Insumo",
    description: "Catálogo en inventario (clase alimenticio/menaje)",
    href: "/inventory/items",
  },
  {
    order: 2,
    label: "Factura",
    description: "Proveedor + N.º + fecha en Compras",
    href: "/purchases",
  },
  {
    order: 3,
    label: "Confirmar",
    description: "Pasa de borrador a confirmada",
    href: "/purchases",
  },
  {
    order: 4,
    label: "Bodega",
    description: "Solo si fecha de factura ≥ hoy (Colombia)",
    href: "/inventory/movements",
  },
];

export const APP_NAV_ZONES = [
  {
    id: "operacion",
    label: "Operación",
    purpose: "Uso diario: cobrar, mesas, comandas y registros.",
  },
  {
    id: "contabilidad",
    label: "Contabilidad",
    purpose: "Compras, bodega, costeo y gastos fijos.",
  },
  {
    id: "config",
    label: "Ajustes",
    purpose: "Catálogo, identidad, facturación y matriz de costos.",
  },
] as const;

export type AppNavZoneId = (typeof APP_NAV_ZONES)[number]["id"];

export type OperationalContext =
  | "sales"
  | "purchases"
  | "inventory"
  | "billing"
  | "general";

export function stepsForContext(context: OperationalContext): OperationalStep[] {
  switch (context) {
    case "sales":
      return SALES_COUNTER_FLOW;
    case "purchases":
    case "inventory":
      return PURCHASE_INVENTORY_FLOW;
    case "billing":
      return SALES_TABLE_FLOW.slice(3);
    default:
      return SALES_COUNTER_FLOW;
  }
}
