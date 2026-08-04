export type EntityId = string;

export type ISODateString = string;

export type CurrencyCode = "COP" | "USD" | "EUR" | "MXN";

export interface Timestamps {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface AuditMetadata extends Timestamps {
  createdBy: EntityId;
  updatedBy: EntityId;
}

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export const GHOST_MODULES = [
  "core",
  "inventory",
  "costing",
  "pos",
  "kds",
  "cash",
  "billing",
  "ocr",
  "hr",
  "chat",
  "reports",
  "analytics",
  "ai",
  "notifications",
] as const;

export type GhostModule = (typeof GHOST_MODULES)[number];
