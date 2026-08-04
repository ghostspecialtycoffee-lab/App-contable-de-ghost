import { err, ok, type Result } from "@ghost/shared";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyOrganizationName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function validateOrganizationSlug(slug: string): Result<string> {
  const normalized = slug.trim().toLowerCase();

  if (normalized.length < 3) {
    return err("El identificador debe tener al menos 3 caracteres.");
  }

  if (normalized.length > 48) {
    return err("El identificador no puede superar 48 caracteres.");
  }

  if (!SLUG_PATTERN.test(normalized)) {
    return err(
      "Usa solo letras minúsculas, números y guiones (ej: ghost-coffee).",
    );
  }

  return ok(normalized);
}

export function resolveOrganizationSlug(
  name: string,
  slug?: string,
): Result<string> {
  const candidate = slug?.trim() ? slug : slugifyOrganizationName(name);
  return validateOrganizationSlug(candidate);
}
