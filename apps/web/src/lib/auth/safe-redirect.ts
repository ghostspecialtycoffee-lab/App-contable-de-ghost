const DEFAULT_PATH = "/dashboard";

/**
 * Evita open redirects: solo rutas relativas internas sin protocolo ni host.
 */
export function resolveSafeRedirectPath(raw: string | null | undefined): string {
  if (!raw) {
    return DEFAULT_PATH;
  }

  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_PATH;
  }

  if (value.includes("\\") || value.includes(":")) {
    return DEFAULT_PATH;
  }

  return value;
}
