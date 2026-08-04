import {
  GHOST_MODULES,
  type EntityId,
  type GhostModule,
} from "@ghost/shared";

export const SYSTEM_ROLES = [
  "owner",
  "admin",
  "manager",
  "cashier",
  "waiter",
  "kitchen",
  "bar",
  "inventory",
  "accountant",
  "viewer",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "approve"
  | "export";

export interface Permission {
  module: GhostModule;
  action: PermissionAction;
  resource?: string;
}

export interface RoleDefinition {
  id: SystemRole;
  label: string;
  description: string;
  permissions: Permission[];
  isSystem: true;
}

const fullAccess = (module: GhostModule): Permission[] => [
  { module, action: "create" },
  { module, action: "read" },
  { module, action: "update" },
  { module, action: "delete" },
  { module, action: "approve" },
  { module, action: "export" },
];

export const DEFAULT_ROLE_DEFINITIONS: Record<SystemRole, RoleDefinition> = {
  owner: {
    id: "owner",
    label: "Propietario",
    description: "Acceso total al tenant y configuración crítica.",
    permissions: GHOST_MODULES.flatMap((module) => fullAccess(module)),
    isSystem: true,
  },
  admin: {
    id: "admin",
    label: "Administrador",
    description: "Gestión operativa completa excepto eliminación del tenant.",
    permissions: GHOST_MODULES.flatMap((module) => fullAccess(module)),
    isSystem: true,
  },
  manager: {
    id: "manager",
    label: "Gerente",
    description: "Operaciones diarias, reportes y aprobaciones.",
    permissions: [
      ...fullAccess("pos"),
      ...fullAccess("kds"),
      ...fullAccess("cash"),
      ...fullAccess("inventory"),
      ...fullAccess("costing"),
      ...fullAccess("reports"),
      ...fullAccess("analytics"),
      { module: "hr", action: "read" },
      { module: "billing", action: "read" },
    ],
    isSystem: true,
  },
  cashier: {
    id: "cashier",
    label: "Cajero",
    description: "POS, caja y cobros.",
    permissions: [
      { module: "pos", action: "create" },
      { module: "pos", action: "read" },
      { module: "pos", action: "update" },
      { module: "cash", action: "create" },
      { module: "cash", action: "read" },
      { module: "cash", action: "update" },
    ],
    isSystem: true,
  },
  waiter: {
    id: "waiter",
    label: "Mesero",
    description: "Comandas, mesas y entregas.",
    permissions: [
      { module: "pos", action: "create" },
      { module: "pos", action: "read" },
      { module: "pos", action: "update" },
      { module: "kds", action: "read" },
    ],
    isSystem: true,
  },
  kitchen: {
    id: "kitchen",
    label: "Cocina",
    description: "Pantalla KDS de cocina.",
    permissions: [
      { module: "kds", action: "read" },
      { module: "kds", action: "update" },
    ],
    isSystem: true,
  },
  bar: {
    id: "bar",
    label: "Barra",
    description: "Pantalla KDS de barra.",
    permissions: [
      { module: "kds", action: "read" },
      { module: "kds", action: "update" },
    ],
    isSystem: true,
  },
  inventory: {
    id: "inventory",
    label: "Inventario",
    description: "Entradas, salidas, kardex y ajustes.",
    permissions: fullAccess("inventory"),
    isSystem: true,
  },
  accountant: {
    id: "accountant",
    label: "Contador",
    description: "Facturación, costos y reportes financieros.",
    permissions: [
      ...fullAccess("billing"),
      ...fullAccess("costing"),
      ...fullAccess("reports"),
      { module: "inventory", action: "read" },
      { module: "cash", action: "read" },
    ],
    isSystem: true,
  },
  viewer: {
    id: "viewer",
    label: "Solo lectura",
    description: "Consulta de dashboards y reportes.",
    permissions: GHOST_MODULES.map((module) => ({
      module,
      action: "read" as const,
    })),
    isSystem: true,
  },
};

export function hasPermission(
  roles: SystemRole[],
  permission: Permission,
): boolean {
  return roles.some((role) =>
    DEFAULT_ROLE_DEFINITIONS[role].permissions.some(
      (candidate) =>
        candidate.module === permission.module &&
        candidate.action === permission.action &&
        (candidate.resource === undefined ||
          candidate.resource === permission.resource),
    ),
  );
}

export interface UserMembership {
  organizationId: EntityId;
  branchIds: EntityId[];
  roles: SystemRole[];
  isActive: boolean;
}
