import { err, ok, type Result } from "@ghost/shared";

import type { RegisterInventoryMovementInput } from "../movement.js";

const SKU_PATTERN = /^[A-Z0-9-]{2,32}$/;

export function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase();
}

export function validateSku(sku: string): Result<string> {
  const normalized = normalizeSku(sku);

  if (!SKU_PATTERN.test(normalized)) {
    return err("El SKU debe tener 2-32 caracteres (A-Z, 0-9, guion).");
  }

  return ok(normalized);
}

export function validateMovementQuantity(
  input: Pick<RegisterInventoryMovementInput, "type" | "quantity">,
): Result<number> {
  if (!Number.isFinite(input.quantity) || input.quantity === 0) {
    return err("La cantidad debe ser un número distinto de cero.");
  }

  const exitTypes = new Set(["exit", "transfer_out", "waste"]);
  const entryTypes = new Set(["entry", "transfer_in"]);

  if (input.type === "adjustment") {
    return ok(input.quantity);
  }

  if (exitTypes.has(input.type) && input.quantity > 0) {
    return ok(-Math.abs(input.quantity));
  }

  if (entryTypes.has(input.type) && input.quantity < 0) {
    return ok(Math.abs(input.quantity));
  }

  return ok(input.quantity);
}

export function calculateWeightedAverageCost(
  currentQty: number,
  currentAvgCost: number,
  incomingQty: number,
  incomingUnitCost: number,
): number {
  if (incomingQty <= 0) {
    return currentAvgCost;
  }

  const totalQty = currentQty + incomingQty;

  if (totalQty <= 0) {
    return incomingUnitCost;
  }

  const currentValue = currentQty * currentAvgCost;
  const incomingValue = incomingQty * incomingUnitCost;

  return (currentValue + incomingValue) / totalQty;
}
