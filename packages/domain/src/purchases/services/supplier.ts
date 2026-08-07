import type { Result } from "@ghost/shared";

import type { SupplierInput } from "../supplier.js";

export function validateSupplierInput(input: SupplierInput): Result<SupplierInput> {
  const name = input.name.trim();

  if (name.length < 2) {
    return { ok: false, error: "El nombre del proveedor debe tener al menos 2 caracteres." };
  }

  if (input.paymentTermsDays !== undefined && input.paymentTermsDays < 0) {
    return { ok: false, error: "Los días de pago no pueden ser negativos." };
  }

  return {
    ok: true,
    value: {
      ...input,
      name,
      nit: input.nit?.trim() || undefined,
      contactName: input.contactName?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    },
  };
}
