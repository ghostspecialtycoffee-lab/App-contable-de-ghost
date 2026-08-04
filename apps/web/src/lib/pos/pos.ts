import {
  createMenuProductClient,
  createSaleClient,
  updateKitchenOrderStatusClient,
} from "./pos-client";

export type { PaymentMethod } from "@ghost/domain";

export async function createMenuProduct(
  input: Parameters<typeof createMenuProductClient>[0],
) {
  return createMenuProductClient(input);
}

export async function createSale(input: Parameters<typeof createSaleClient>[0]) {
  return createSaleClient(input);
}

export async function updateKitchenOrderStatus(
  input: Parameters<typeof updateKitchenOrderStatusClient>[0],
) {
  return updateKitchenOrderStatusClient(input);
}
