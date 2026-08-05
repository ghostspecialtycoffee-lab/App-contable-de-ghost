/** Flujos operativos — orden lógico de la app. */

export interface OperationalStep {
  order: number;
  label: string;
  description: string;
  href?: string;
}

/** Jornada diaria: caja → ventas → cierre. */
export const DAILY_OPERATION_FLOW: OperationalStep[] = [
  {
    order: 1,
    label: "Abrir caja",
    description: "Registra el fondo inicial en efectivo",
    href: "/cash",
  },
  {
    order: 2,
    label: "Cobrar",
    description: "Mostrador o mesas con caja abierta",
    href: "/pos",
  },
  {
    order: 3,
    label: "Movimientos",
    description: "Entradas, salidas y préstamos de caja",
    href: "/cash",
  },
  {
    order: 4,
    label: "Informes",
    description: "Ventas, ticket y productos top del día",
    href: "/reports",
  },
  {
    order: 5,
    label: "Cerrar caja",
    description: "Arqueo y cierre de jornada",
    href: "/cash",
  },
];

/** Configuración inicial automática (post-import). */
export const ORGANIZATION_SETUP_FLOW: OperationalStep[] = [
  {
    order: 1,
    label: "Importar compras",
    description: "Facturas, insumos y bodega desde manifiesto",
    href: "/purchases",
  },
  {
    order: 2,
    label: "Carta bebidas",
    description: "25 bebidas Ghost + fichas de costo base",
    href: "/costing",
  },
  {
    order: 3,
    label: "Catálogo POS",
    description: "Revisar precios y productos terminados",
    href: "/pos/menu",
  },
  {
    order: 4,
    label: "Abrir caja",
    description: "Iniciar operación diaria",
    href: "/cash",
  },
];

export const SALES_COUNTER_FLOW: OperationalStep[] = [
  {
    order: 1,
    label: "Abrir caja",
    description: "Fondo inicial del día",
    href: "/cash",
  },
  {
    order: 2,
    label: "Mostrador",
    description: "Arma el pedido en POS",
    href: "/pos",
  },
  {
    order: 3,
    label: "Cobro",
    description: "Registra pago y genera comprobante",
    href: "/pos",
  },
  {
    order: 4,
    label: "Comprobante",
    description: "Queda en Registros (V-…)",
    href: "/billing",
  },
];

export const SALES_TABLE_FLOW: OperationalStep[] = [
  {
    order: 1,
    label: "Abrir caja",
    description: "Fondo inicial del día",
    href: "/cash",
  },
  {
    order: 2,
    label: "Mesa",
    description: "Abre cuenta o QR",
    href: "/pos/tables",
  },
  {
    order: 3,
    label: "Pedido",
    description: "Cliente ordena desde la mesa",
    href: "/pos/tables",
  },
  {
    order: 4,
    label: "Comanda",
    description: "Barra/cocina prepara",
    href: "/kds",
  },
  {
    order: 5,
    label: "Cobro",
    description: "Cierra cuenta en mesa",
    href: "/pos/tables",
  },
  {
    order: 6,
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
    label: "Carta y costos",
    description: "Bebidas Ghost y fichas (automático tras import)",
    href: "/costing",
  },
  {
    order: 5,
    label: "Bodega",
    description: "Solo si fecha de factura ≥ hoy (Colombia)",
    href: "/inventory/movements",
  },
];

export const REPORTS_FLOW: OperationalStep[] = [
  {
    order: 1,
    label: "Panel financiero",
    description: "Ventas, compras, caja y bodega",
    href: "/reports",
  },
  {
    order: 2,
    label: "Productos top",
    description: "Ítems con más movimiento",
    href: "/reports",
  },
  {
    order: 3,
    label: "Compras",
    description: "Historial de facturas proveedor",
    href: "/purchases",
  },
  {
    order: 4,
    label: "Comprobantes",
    description: "Detalle de ventas",
    href: "/billing",
  },
  {
    order: 5,
    label: "Caja",
    description: "Movimientos y arqueo del día",
    href: "/cash",
  },
];

export const APP_NAV_ZONES = [
  {
    id: "operacion",
    label: "Operación",
    purpose: "Uso diario: caja, cobrar, mesas, comandas y registros.",
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
  | "daily"
  | "setup"
  | "reports"
  | "general";

export function stepsForContext(context: OperationalContext): OperationalStep[] {
  switch (context) {
    case "sales":
      return SALES_COUNTER_FLOW;
    case "purchases":
    case "inventory":
      return PURCHASE_INVENTORY_FLOW;
    case "billing":
      return REPORTS_FLOW;
    case "daily":
      return DAILY_OPERATION_FLOW;
    case "setup":
      return ORGANIZATION_SETUP_FLOW;
    case "reports":
      return REPORTS_FLOW;
    default:
      return DAILY_OPERATION_FLOW;
  }
}
