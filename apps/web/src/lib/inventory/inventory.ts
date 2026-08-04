import {
  callCreateInventoryItem,
  callCreateWarehouse,
  callRegisterInventoryMovement,
} from "@/lib/firebase/functions";
import { isFunctionsUnavailable } from "@/lib/firebase/is-functions-unavailable";
import type { BaseUnit, InventoryItemType } from "@ghost/domain";

import {
  createInventoryItemClient,
  createWarehouseClient,
  registerInventoryMovementClient,
} from "./inventory-client";

export interface CreateInventoryItemInput {
  sku: string;
  name: string;
  type: InventoryItemType;
  baseUnit: BaseUnit;
  category?: string;
  minStock?: number;
  maxStock?: number;
  trackLot?: boolean;
}

type CreateWarehouseInput = Parameters<typeof createWarehouseClient>[0];
type RegisterInventoryMovementInput = Parameters<
  typeof registerInventoryMovementClient
>[0];

function shouldUseClientFallback(): boolean {
  return process.env.NEXT_PUBLIC_INVENTORY_MODE === "client";
}

async function withInventoryFallback<T>(
  callable: () => Promise<T>,
  client: () => Promise<T>,
): Promise<T> {
  if (shouldUseClientFallback()) {
    return client();
  }

  try {
    return await callable();
  } catch (error) {
    if (
      process.env.NEXT_PUBLIC_INVENTORY_MODE === "callable" ||
      !isFunctionsUnavailable(error)
    ) {
      throw error;
    }

    return client();
  }
}

export async function createInventoryItem(
  input: CreateInventoryItemInput,
): Promise<{ itemId: string }> {
  return withInventoryFallback(
    () => callCreateInventoryItem(input),
    () => createInventoryItemClient(input),
  );
}

export async function createWarehouse(
  input: CreateWarehouseInput,
): Promise<{ warehouseId: string }> {
  return withInventoryFallback(
    () => callCreateWarehouse(input),
    () => createWarehouseClient(input),
  );
}

export async function registerInventoryMovement(
  input: RegisterInventoryMovementInput,
): Promise<{ movementId: string; balanceAfter: number }> {
  return withInventoryFallback(
    () => callRegisterInventoryMovement(input),
    () => registerInventoryMovementClient(input),
  );
}
