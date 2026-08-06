import type { SystemRole } from "@ghost/domain";

const ELEVATED_ROLES: SystemRole[] = [
  "owner",
  "admin",
  "manager",
  "accountant",
  "inventory",
  "viewer",
];

const SALES_STAFF_ROLES: SystemRole[] = ["cashier", "waiter"];

/** Rutas permitidas para personal solo de ventas (sin ERP completo). */
export const SALES_ONLY_ALLOWED_PREFIXES = [
  "/caja",
  "/login",
  "/register",
  "/onboarding",
] as const;

/** Mapeo de rutas ERP legacy → extensión de ventas. */
export const LEGACY_SALES_ROUTE_REDIRECTS: Record<string, string> = {
  "/dashboard": "/caja",
  "/ventas": "/caja",
  "/pos": "/caja/mostrador",
  "/pos/tables": "/caja/mesas",
  "/cash": "/caja/apertura",
  "/billing": "/caja/registros",
  "/kds": "/caja/comandas",
};

export function isSalesStaffRole(role: SystemRole): boolean {
  return SALES_STAFF_ROLES.includes(role);
}

export function isSalesOnlyUser(roles: SystemRole[]): boolean {
  if (roles.length === 0) {
    return false;
  }

  if (roles.some((role) => ELEVATED_ROLES.includes(role))) {
    return false;
  }

  return roles.some((role) => isSalesStaffRole(role));
}

export function getHomePath(roles: SystemRole[]): string {
  return isSalesOnlyUser(roles) ? "/caja" : "/dashboard";
}

export function resolveSalesOnlyRedirect(pathname: string): string | null {
  if (SALES_ONLY_ALLOWED_PREFIXES.some((prefix) => isPathMatch(pathname, prefix))) {
    return null;
  }

  for (const [legacyPath, cajaPath] of Object.entries(LEGACY_SALES_ROUTE_REDIRECTS)) {
    if (isPathMatch(pathname, legacyPath)) {
      if (pathname === legacyPath) {
        return cajaPath;
      }

      const suffix = pathname.slice(legacyPath.length);
      return `${cajaPath}${suffix}`;
    }
  }

  return "/caja";
}

function isPathMatch(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
