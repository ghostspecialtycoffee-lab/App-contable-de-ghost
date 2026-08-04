export function formatMoney(
  value: number,
  currency: "COP" | "USD" = "COP",
): string {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("es-CO", {
    dateStyle: "medium",
  });
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function startOfDay(date = new Date()): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date = new Date()): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function parseFirestoreDate(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return new Date(value.seconds * 1000).toISOString();
  }

  return "";
}
