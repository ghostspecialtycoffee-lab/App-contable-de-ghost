export interface NavItem {
  href: string;
  label: string;
  description?: string;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

/** Navegación agrupada: operación diaria arriba, contabilidad abajo. */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: "operacion",
    label: "Operación",
    items: [
      { href: "/dashboard", label: "Inicio", description: "Resumen del día" },
      { href: "/cash", label: "Caja", description: "Apertura y movimientos" },
      { href: "/ventas", label: "Ventas", description: "Cobros y accesos" },
      { href: "/caja", label: "Modo caja", description: "Solo registro de ventas" },
      { href: "/pos", label: "Mostrador", description: "Venta directa" },
      { href: "/pos/tables", label: "Mesas", description: "Cuenta y QR" },
      { href: "/kds", label: "Comandas", description: "Barra y cocina" },
      { href: "/billing", label: "Registros", description: "Comprobantes de venta" },
      { href: "/reports", label: "Informes", description: "Ventas, compras, gastos y caja" },
    ],
  },
  {
    id: "contabilidad",
    label: "Contabilidad",
    items: [
      { href: "/purchases", label: "Compras", description: "Facturas proveedor" },
      {
        href: "/inventory",
        label: "Inventario",
        description: "Existencias, entradas y salidas",
      },
      {
        href: "/inventory/movements",
        label: "Existencias",
        description: "Agregar o quitar unidades",
      },
      { href: "/costing", label: "Costeo", description: "Recetas y márgenes" },
      { href: "/expenses", label: "Gastos fijos", description: "Arriendo, nómina…" },
    ],
  },
  {
    id: "config",
    label: "Ajustes",
    items: [
      { href: "/pos/menu", label: "Catálogo", description: "Productos del menú" },
      { href: "/brand", label: "Identidad", description: "Logo y marca" },
      { href: "/settings/fiscal", label: "Facturación", description: "Datos fiscales" },
      { href: "/settings/costing", label: "Matriz costos", description: "Metas food cost" },
      { href: "/guia", label: "Guía operativa", description: "Documentos, flujos y reglas" },
    ],
  },
];

export const MOBILE_PRIMARY_TABS = [
  { href: "/dashboard", label: "Inicio", match: ["/dashboard"] },
  {
    href: "/ventas",
    label: "Ventas",
    match: ["/ventas", "/pos", "/billing", "/kds", "/cash", "/reports"],
  },
  { href: "/pos/tables", label: "Mesas", match: ["/pos/tables", "/mesa"] },
] as const;

export function isNavActive(pathname: string, href: string, extraMatches: string[] = []): boolean {
  if (pathname === href || pathname.startsWith(`${href}/`)) {
    return true;
  }

  return extraMatches.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function findActiveSection(pathname: string): string | null {
  for (const section of NAV_SECTIONS) {
    if (section.items.some((item) => isNavActive(pathname, item.href))) {
      return section.id;
    }
  }
  return null;
}
