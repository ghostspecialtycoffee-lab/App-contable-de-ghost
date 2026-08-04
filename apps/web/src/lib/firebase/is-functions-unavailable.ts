export function isFunctionsUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  const code =
    typeof error.code === "string"
      ? error.code.replace("functions/", "")
      : "";

  return code === "internal" || code === "not-found" || code === "unavailable";
}
