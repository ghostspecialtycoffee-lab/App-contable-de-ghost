import type { SystemRole } from "@ghost/domain";

import { isNavActive } from "@/lib/navigation/app-navigation";

export interface SalesNavItem {
  href: string;
  label: string;
  description?: string;
  roles?: SystemRole[];
}

export const SALES_EXTENSION_PATHS = {
  hub: "/caja",
  cash: "/caja/apertura",
  counter: "/caja/mostrador",
  tables: "/caja/mesas",
  records: "/caja/registros",
  kds: "/caja/comandas",
} as const;

export const ERP_SALES_PATHS = {
  hub: "/ventas",
  cash: "/cash",
  counter: "/pos",
  tables: "/pos/tables",
  records: "/billing",
  kds: "/kds",
} as const;

export type SalesPathKey = keyof typeof SALES_EXTENSION_PATHS;

const ALL_SALES_NAV_ITEMS: SalesNavItem[] = [
  {
    href: SALES_EXTENSION_PATHS.hub,
    label: "Inicio",
    description: "Resumen del turno",
  },
  {
    href: SALES_EXTENSION_PATHS.cash,
    label: "Apertura",
    description: "Abrir o cerrar caja",
    roles: ["cashier"],
  },
  {
    href: SALES_EXTENSION_PATHS.counter,
    label: "Mostrador",
    description: "Cobro directo",
    roles: ["cashier"],
  },
  {
    href: SALES_EXTENSION_PATHS.tables,
    label: "Mesas",
    description: "Cuentas y QR",
  },
  {
    href: SALES_EXTENSION_PATHS.records,
    label: "Registros",
    description: "Comprobantes de venta",
    roles: ["cashier"],
  },
  {
    href: SALES_EXTENSION_PATHS.kds,
    label: "Comandas",
    description: "Barra y cocina",
    roles: ["waiter"],
  },
];

export const SALES_MOBILE_PRIMARY_TABS = [
  {
    href: SALES_EXTENSION_PATHS.hub,
    label: "Inicio",
    match: [SALES_EXTENSION_PATHS.hub],
  },
  {
    href: SALES_EXTENSION_PATHS.counter,
    label: "Mostrador",
    match: [SALES_EXTENSION_PATHS.counter],
    roles: ["cashier"] as SystemRole[],
  },
  {
    href: SALES_EXTENSION_PATHS.tables,
    label: "Mesas",
    match: [SALES_EXTENSION_PATHS.tables, "/mesa"],
  },
] as const;

export function getSalesPaths(useExtension: boolean) {
  return useExtension ? SALES_EXTENSION_PATHS : ERP_SALES_PATHS;
}

export function getSalesNavItems(roles: SystemRole[]): SalesNavItem[] {
  const isCashier = roles.includes("cashier");
  const isWaiter = roles.includes("waiter");
  const unrestricted = !isCashier && !isWaiter;

  return ALL_SALES_NAV_ITEMS.filter((item) => {
    if (!item.roles || unrestricted) {
      return true;
    }

    return item.roles.some((role) => roles.includes(role));
  });
}

export function getSalesMobileTabs(roles: SystemRole[]) {
  const isCashier = roles.includes("cashier");
  const isWaiter = roles.includes("waiter");
  const unrestricted = !isCashier && !isWaiter;

  return SALES_MOBILE_PRIMARY_TABS.filter((tab) => {
    if (!("roles" in tab) || !tab.roles || unrestricted) {
      return true;
    }

    return tab.roles.some((role) => roles.includes(role));
  });
}

export function isSalesExtensionPath(pathname: string): boolean {
  return pathname === SALES_EXTENSION_PATHS.hub || pathname.startsWith(`${SALES_EXTENSION_PATHS.hub}/`);
}

export function isSalesNavActive(pathname: string, href: string, extraMatches: string[] = []): boolean {
  return isNavActive(pathname, href, extraMatches);
}
